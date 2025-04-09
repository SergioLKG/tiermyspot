import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {
  getFullPlaylistData,
  getGroupTierlist,
  getUserPlaylist,
  getUserByEmail,
} from "@/lib/db";
import { getDbConnection } from "@/lib/db";
import { tierlists, users, groupTierlists } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { getOrCreateGroupTierlist } from "@/lib/db";
import { safeSerialize } from "@/lib/utils";

// Modificar la función updateGroupTierlist para ignorar usuarios demo
export async function updateGroupTierlist(userPlaylistId: number) {
  const db = getDbConnection();

  // Obtener todas las tierlists para esta userPlaylist
  const tierlistsResult = await db
    .select()
    .from(tierlists)
    .where(
      sql`${tierlists.userPlaylistId} = ${userPlaylistId} AND ${tierlists.isHidden} = false`
    )
    .execute();

  if (tierlistsResult.length === 0) {
    return null;
  }

  // Calcular los ratings agregados
  const aggregatedRatings = {};
  const uniqueUserIds = new Set();

  // Obtener información de usuarios para identificar usuarios demo
  const userIds = tierlistsResult.map((tierlist) => tierlist.userId);
  const usersInfo = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`${users.id} IN (${userIds.join(",")})`)
    .execute();

  // Crear un mapa para identificar rápidamente usuarios demo
  const demoUsers = new Set();
  usersInfo.forEach((user) => {
    if (user.email === "demo@tiermyspot.com") {
      demoUsers.add(user.id);
    }
  });

  tierlistsResult.forEach((tierlist) => {
    // Ignorar usuarios demo
    if (demoUsers.has(tierlist.userId)) {
      return;
    }

    uniqueUserIds.add(tierlist.userId);

    // Procesar los ratings de esta tierlist
    let ratings = tierlist.ratings || {};

    // Asegurarnos de que ratings es un objeto y no un string
    if (typeof ratings === "string") {
      try {
        ratings = JSON.parse(ratings);
      } catch (e) {
        console.error("Error parsing ratings:", e);
        ratings = {};
      }
    }

    Object.entries(ratings).forEach(([artistId, tierId]) => {
      if (!aggregatedRatings[artistId]) {
        aggregatedRatings[artistId] = {
          S: 0,
          A: 0,
          B: 0,
          C: 0,
          D: 0,
          F: 0,
          totalScore: 0,
          userCount: 0,
          averageScore: 0,
          tier: null,
        };
      }

      // Incrementar el contador para este tier
      aggregatedRatings[artistId][tierId]++;

      // Actualizar estadísticas
      aggregatedRatings[artistId].userCount++;

      // Convertir tierId a valor numérico
      let score = 0;
      switch (tierId) {
        case "S":
          score = 5;
          break;
        case "A":
          score = 4;
          break;
        case "B":
          score = 3;
          break;
        case "C":
          score = 2;
          break;
        case "D":
          score = 1;
          break;
        case "F":
          score = 0;
          break;
      }

      aggregatedRatings[artistId].totalScore += score;
    });
  });

  // Calcular promedios y asignar tiers
  Object.values(aggregatedRatings).forEach((artistRating: any) => {
    if (artistRating.userCount > 0) {
      artistRating.averageScore =
        artistRating.totalScore / artistRating.userCount;

      // Asignar tier basado en promedio
      if (artistRating.averageScore >= 4.5) artistRating.tier = "S";
      else if (artistRating.averageScore >= 3.5) artistRating.tier = "A";
      else if (artistRating.averageScore >= 2.5) artistRating.tier = "B";
      else if (artistRating.averageScore >= 1.5) artistRating.tier = "C";
      else if (artistRating.averageScore >= 0.5) artistRating.tier = "D";
      else artistRating.tier = "F";
    }
  });

  // Obtener o crear la tierlist grupal
  const groupTierlist = await getOrCreateGroupTierlist(userPlaylistId);

  // Actualizar la tierlist grupal
  const result = await db
    .update(groupTierlists)
    .set({
      aggregatedRatings,
      userCount: uniqueUserIds.size,
      updatedAt: new Date(),
    })
    .where(sql`${groupTierlists.id} = ${groupTierlist.id}`)
    .returning();

  return safeSerialize(result[0]);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playlistIdStr = searchParams.get("playlistId");
    const privateName = searchParams.get("privateName") || undefined;

    if (!playlistIdStr) {
      return NextResponse.json(
        { error: "ID de playlist no proporcionado" },
        { status: 400 }
      );
    }

    // Convertir el playlistId a número
    const playlistId = Number.parseInt(playlistIdStr, 10);

    if (isNaN(playlistId)) {
      return NextResponse.json(
        { error: "ID de playlist inválido" },
        { status: 400 }
      );
    }

    // Obtener datos completos de la playlist
    const playlistData = await getFullPlaylistData(playlistId);

    if (!playlistData) {
      return NextResponse.json(
        { error: "Playlist no encontrada" },
        { status: 404 }
      );
    }

    // Obtener la userPlaylist correspondiente
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Convertir privateName a string o undefined para evitar problemas de tipo
    const privateNameStr = privateName ? String(privateName) : undefined;

    const userPlaylist = await getUserPlaylist(
      user.id,
      playlistId,
      privateNameStr
    );

    if (!userPlaylist) {
      return NextResponse.json(
        { error: "UserPlaylist no encontrada" },
        { status: 404 }
      );
    }

    // Obtener la tierlist grupal
    let groupTierlist = await getGroupTierlist(userPlaylist.id);

    // Si no existe, crearla
    if (!groupTierlist) {
      await updateGroupTierlist(userPlaylist.id);
      groupTierlist = await getGroupTierlist(userPlaylist.id);
    }

    return NextResponse.json({
      playlist: playlistData,
      groupTierlist,
    });
  } catch (error) {
    console.error("Error al obtener tierlist grupal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
