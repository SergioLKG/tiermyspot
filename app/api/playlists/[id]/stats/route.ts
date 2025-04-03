import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getPlaylistUserCount } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "ID de playlist no proporcionado" }, { status: 400 })
    }

    const userCount = await getPlaylistUserCount(Number.parseInt(id))

    return NextResponse.json({ userCount })
  } catch (error) {
    console.error("Error al obtener estadísticas de playlist:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}