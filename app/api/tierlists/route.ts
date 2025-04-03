import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getUserByEmail, getUserPlaylist, getTierlist, getOrCreateTierlist } from "@/lib/db"

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

    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Convertir privateName a string o undefined para evitar problemas de tipo
    const privateNameStr = privateName ? String(privateName) : undefined

    // Obtener la relación usuario-playlist
    const userPlaylist = await getUserPlaylist(user.id, playlistId, privateNameStr)

    if (!userPlaylist) {
      return NextResponse.json({ error: "Relación usuario-playlist no encontrada" }, { status: 404 })
    }

    // Obtener la tierlist del usuario
    const tierlist = await getTierlist(user.id, userPlaylist.id)

    if (!tierlist) {
      // Si no existe, crear una nueva tierlist vacía
      const newTierlist = await getOrCreateTierlist({
        userId: user.id,
        userPlaylistId: userPlaylist.id,
        isHidden: false,
      })
      return NextResponse.json(newTierlist || { ratings: {} })
    }

    return NextResponse.json(tierlist)
  } catch (error) {
    console.error("Error al obtener tierlist:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}