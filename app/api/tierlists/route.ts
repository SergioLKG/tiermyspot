import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getUserByEmail, getTierlist, updateTierlistRating, getUserPlaylist } from "@/lib/db"

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
      return NextResponse.json({ ratings: {} })
    }

    return NextResponse.json(tierlist)
  } catch (error) {
    console.error("Error al obtener tierlist:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { playlistId, artistId, tierId, privateName } = await request.json()

    if (!playlistId || !artistId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
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

    // Actualizar el rating en la tierlist
    await updateTierlistRating(user.id, userPlaylist.id, Number.parseInt(artistId), tierId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al guardar tierlist:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}