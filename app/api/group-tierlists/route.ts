import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getFullPlaylistData, getGroupTierlist, updateGroupTierlist, getUserPlaylist, getUserByEmail } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const playlistIdStr = searchParams.get("playlistId")
    const privateName = searchParams.get("privateName") || undefined

    if (!playlistIdStr) {
      return NextResponse.json({ error: "ID de playlist no proporcionado" }, { status: 400 })
    }

    // Convertir el playlistId a número
    const playlistId = Number.parseInt(playlistIdStr, 10)

    if (isNaN(playlistId)) {
      return NextResponse.json({ error: "ID de playlist inválido" }, { status: 400 })
    }

    // Obtener datos completos de la playlist
    const playlistData = await getFullPlaylistData(playlistId)

    if (!playlistData) {
      return NextResponse.json({ error: "Playlist no encontrada" }, { status: 404 })
    }

    // Obtener la userPlaylist correspondiente
    const user = await getUserByEmail(session.user.email)
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Convertir privateName a string o undefined para evitar problemas de tipo
    const privateNameStr = privateName ? String(privateName) : undefined

    const userPlaylist = await getUserPlaylist(user.id, playlistId, privateNameStr)

    if (!userPlaylist) {
      return NextResponse.json({ error: "UserPlaylist no encontrada" }, { status: 404 })
    }

    // Obtener la tierlist grupal
    let groupTierlist = await getGroupTierlist(userPlaylist.id)

    // Si no existe, crearla
    if (!groupTierlist) {
      await updateGroupTierlist(userPlaylist.id)
      groupTierlist = await getGroupTierlist(userPlaylist.id)
    }

    return NextResponse.json({
      playlist: playlistData,
      groupTierlist,
    })
  } catch (error) {
    console.error("Error al obtener tierlist grupal:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}