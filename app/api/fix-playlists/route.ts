import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { fixUserPlaylistsArrays } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Ejecutar la función de corrección
    const result = await fixUserPlaylistsArrays()

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error en fix-playlists:", error)
    return NextResponse.json({ error: error.message, success: false }, { status: 500 })
  }
}