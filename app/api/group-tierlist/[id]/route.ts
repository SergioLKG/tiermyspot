import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getFullPlaylistData,
  getPlaylistRankings,
  getUserByEmail,
  getUserPlaylist,
} from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: playlistId } = await params;

    if (!playlistId) {
      return NextResponse.json(
        { error: "ID de playlist no proporcionado" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const privateName = searchParams.get("privateName") || undefined;

    const playlistIdNum = Number.parseInt(playlistId);
    if (isNaN(playlistIdNum)) {
      return NextResponse.json(
        { error: "ID de playlist inválido" },
        { status: 400 }
      );
    }

    const playlistData = await getFullPlaylistData(playlistIdNum);
    if (!playlistData) {
      return NextResponse.json(
        { error: "Playlist no encontrada" },
        { status: 404 }
      );
    }

    const currentUser = await getUserByEmail(session.user.email);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const userPlaylist = await getUserPlaylist(
      currentUser.id,
      playlistIdNum,
      privateName
    );

    if (!userPlaylist) {
      return NextResponse.json(
        { error: "Relación usuario-playlist no encontrada" },
        { status: 404 }
      );
    }

    const rankings = await getPlaylistRankings(userPlaylist.id);

    const groupRankings = calculateGroupRankings(
      rankings,
      playlistData.artists
    );

    const usersData: any = {};
    rankings.forEach((ranking) => {
      if (ranking.userId && !usersData[ranking.userId]) {
        usersData[ranking.userId] = {
          name: ranking.userName,
          image: ranking.userImage,
        };
      }
    });

    return NextResponse.json({
      playlist: playlistData,
      groupRankings,
      currentUserId: currentUser?.id,
      users: usersData,
    });
  } catch (error: any) {
    console.error("Error al obtener tierlist grupal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Función para calcular rankings grupales
function calculateGroupRankings(rankings: any, artists: any) {
  const artistScores: any = {};
  const userVotes: any = {};

  // Inicializar scores para todos los artistas
  artists.forEach((artist: any) => {
    artistScores[artist.id] = {
      totalScore: 0,
      userCount: 0,
      averageScore: 0,
      tier: null,
    };
    userVotes[artist.id] = [];
  });

  // Procesar todos los rankings
  rankings.forEach((ranking: any) => {
    const { userId, userName, userImage, artistId, tierId } = ranking;

    // Convertir tierId a valor numérico (S=5, A=4, B=3, C=2, D=1, F=0)
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

    if (artistScores[artistId]) {
      artistScores[artistId].totalScore += score;
      artistScores[artistId].userCount++;

      // Guardar voto individual
      userVotes[artistId].push({
        userId,
        userName,
        userImage,
        tier: tierId,
      });
    }
  });

  // Calcular promedios y asignar tiers
  Object.keys(artistScores).forEach((artistId) => {
    const score = artistScores[artistId];

    if (score.userCount > 0) {
      score.averageScore = score.totalScore / score.userCount;

      // Asignar tier basado en promedio
      if (score.averageScore >= 4.5) score.tier = "S";
      else if (score.averageScore >= 3.5) score.tier = "A";
      else if (score.averageScore >= 2.5) score.tier = "B";
      else if (score.averageScore >= 1.5) score.tier = "C";
      else if (score.averageScore >= 0.5) score.tier = "D";
      else score.tier = "F";
    }
  });

  return {
    scores: artistScores,
    votes: userVotes,
  };
}
