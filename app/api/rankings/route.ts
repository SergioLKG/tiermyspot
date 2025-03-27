import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getUserByEmail, setUserRanking, deleteUserRanking, getUserRankings, getPlaylistRankings } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const playlistId = searchParams.get("playlistId")
    const type = searchParams.get("type") || "user"

    if (!playlistId) {
      return NextResponse.json({ error: "ID de playlist no proporcionado" }, { status: 400 })
    }

    if (type === "user") {
      const user = await getUserByEmail(session.user.email)

      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
      }

      const rankings = await getUserRankings(user.id, Number.parseInt(playlistId))

      const formattedRankings = rankings.reduce((acc, ranking) => {
        acc[ranking.artistId] = ranking.tierId
        return acc
      }, {})

      return NextResponse.json(formattedRankings)
    } else if (type === "group") {
      const rankings = await getPlaylistRankings(Number.parseInt(playlistId))

      return NextResponse.json(rankings)
    }

    return NextResponse.json({ error: "Tipo de ranking no válido" }, { status: 400 })
  } catch (error) {
    console.error("Error al obtener rankings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { playlistId, artistId, tierId } = await request.json()

    if (!playlistId || !artistId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (tierId) {
      await setUserRanking(user.id, Number.parseInt(playlistId), Number.parseInt(artistId), tierId)
    } else {
      await deleteUserRanking(user.id, Number.parseInt(playlistId), Number.parseInt(artistId))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al guardar ranking:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

