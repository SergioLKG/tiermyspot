import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getPlaylistUserCount } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id: id } = await params

    if (!id) {
      return NextResponse.json({ error: "ID de playlist no proporcionado" }, { status: 400 })
    }

    const userCount = await getPlaylistUserCount(Number.parseInt(id))

    return NextResponse.json({ userCount })
  } catch (error: any) {
    console.error("Error al obtener estadísticas de playlist:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}