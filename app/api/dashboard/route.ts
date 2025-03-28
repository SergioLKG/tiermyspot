import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getUserByEmail, getUserPlaylists, hideUserPlaylist } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const playlists = await getUserPlaylists(user.id);

    // Separar playlists públicas y privadas
    const publicPlaylists = playlists.filter(
      (playlist) => !playlist.isPrivate && !playlist.isHidden
    );

    const privatePlaylists = playlists.filter(
      (playlist) => playlist.isPrivate && !playlist.isHidden
    );

    return NextResponse.json({ publicPlaylists, privatePlaylists });
  } catch (error) {
    console.error("Error al obtener playlists del dashboard:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { playlistId, action } = await request.json();

    if (!playlistId || !action) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (action === "hide") {
      await hideUserPlaylist(user.id, Number.parseInt(playlistId));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error al actualizar playlist del dashboard:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
