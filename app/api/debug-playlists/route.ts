import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getUserByEmail, debugUserPlaylists } from "@/lib/db"

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

    // Obtener información de depuración
    const debugInfo = await debugUserPlaylists(user.id)

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error("Error en debug-playlists:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}