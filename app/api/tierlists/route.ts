import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserByEmail } from "@/lib/db/user"
import { getUserPlaylist } from "@/lib/db/user-playlist"
import { getTierlist, getOrCreateTierlist } from "@/lib/db/tierlist"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const playlistId = searchParams.get("playlistId")
    const privateName = searchParams.get("privateName") || undefined

    if (!playlistId) {
      return NextResponse.json({ error: "ID de playlist no proporcionado" }, { status: 400 })
    }

    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Obtener la relación usuario-playlist
    const userPlaylist = await getUserPlaylist(user.id, Number.parseInt(playlistId), privateName)

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