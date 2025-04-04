import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getFullPlaylistData,
  getPlaylistRankings,
  getUserByEmail,
} from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const playlistId = params.id;

    if (!playlistId) {
      return NextResponse.json(
        { error: "ID de playlist no proporcionado" },
        { status: 400 }
      );
    }

    // Obtener datos completos de la playlist
    const playlistData = await getFullPlaylistData(Number.parseInt(playlistId));

    if (!playlistData) {
      return NextResponse.json(
        { error: "Playlist no encontrada" },
        { status: 404 }
      );
    }

    // Obtener todos los rankings para esta playlist
    const rankings = await getPlaylistRankings(Number.parseInt(playlistId));

    // Obtener el usuario actual
    const currentUser = await getUserByEmail(session.user.email);

    // Calcular rankings grupales
    const groupRankings = calculateGroupRankings(
      rankings,
      playlistData.artists
    );

    return NextResponse.json({
      playlist: playlistData,
      groupRankings,
      currentUserId: currentUser?.id,
    });
  } catch (error) {
    console.error("Error al obtener tierlist grupal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Función para calcular rankings grupales
function calculateGroupRankings(rankings, artists) {
  const artistScores = {};
  const userVotes = {};

  // Inicializar scores para todos los artistas
  artists.forEach((artist) => {
    artistScores[artist.id] = {
      totalScore: 0,
      userCount: 0,
      averageScore: 0,
      tier: null,
    };
    userVotes[artist.id] = [];
  });

  // Procesar todos los rankings
  rankings.forEach((ranking) => {
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
