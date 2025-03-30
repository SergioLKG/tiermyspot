import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getUserByEmail, getUserPlaylists, hideUserPlaylist } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Obtener SOLO las playlists que el usuario ha importado explícitamente
    // y que no están ocultas
    const playlists = await getUserPlaylists(user.id, false)

    // Separar playlists públicas y privadas
    // Una playlist es "pública" si no tiene isPrivate = true
    // Una playlist es "privada" si tiene isPrivate = true
    const publicPlaylists = playlists.filter((playlist: any) => !playlist.isPrivate)
    const privatePlaylists = playlists.filter((playlist: any) => playlist.isPrivate)

    return NextResponse.json({ publicPlaylists, privatePlaylists })
  } catch (error) {
    console.error("Error al obtener playlists del dashboard:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Corregir la función POST para manejar correctamente la acción de ocultar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { playlistId, action } = await request.json()

    if (!playlistId || !action) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (action === "hide") {
      const result = await hideUserPlaylist(user.id, Number.parseInt(playlistId))
      return NextResponse.json({ success: !!result })
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error al actualizar playlist del dashboard:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}