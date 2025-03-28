import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getFullPlaylistDataBySpotifyId } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const spotifyId = params.id;

    if (!spotifyId) {
      return NextResponse.json(
        { error: "ID de Spotify no proporcionado" },
        { status: 400 }
      );
    }

    // Obtener datos completos de la playlist por su ID de Spotify
    const playlistData = await getFullPlaylistDataBySpotifyId(spotifyId);

    if (!playlistData) {
      return NextResponse.json(
        { error: "Playlist no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(playlistData);
  } catch (error) {
    console.error("Error al obtener datos de playlist por Spotify ID:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
