import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPlaylistBySpotifyId } from "@/lib/db";

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

    let timeoutId: NodeJS.Timeout;
    timeoutId = setTimeout(() => {
      new AbortController().abort();
    }, 500);

    // Verificar si la playlist existe en la base de datos (consulta ligera)
    const playlist = await getPlaylistBySpotifyId(spotifyId);

    clearTimeout(timeoutId);

    return NextResponse.json({
      exists: !!playlist,
      id: playlist?.id || null,
    });
  } catch (error) {
    console.error("Error al verificar existencia de playlist:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // Close the database connection if necessary
  }
}
