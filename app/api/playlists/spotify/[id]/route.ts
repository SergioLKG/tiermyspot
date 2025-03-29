import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getFullPlaylistDataBySpotifyId } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const spotifyId = params.id

    if (!spotifyId) {
      return NextResponse.json({ error: "ID de Spotify no proporcionado" }, { status: 400 })
    }

    // Implementar un timeout para la consulta a la base de datos
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("La consulta a la base de datos ha excedido el tiempo máximo"))
      }, 5000) // 5 segundos de timeout
    })

    // Obtener datos completos de la playlist por su ID de Spotify
    const dataPromise = getFullPlaylistDataBySpotifyId(spotifyId)

    // Usar Promise.race para implementar el timeout
    const playlistData = await Promise.race([dataPromise, timeoutPromise])

    if (!playlistData) {
      return NextResponse.json({ error: "Playlist no encontrada" }, { status: 404 })
    }

    return NextResponse.json(playlistData)
  } catch (error: any) {
    console.error("Error al obtener datos de playlist por Spotify ID:", error)

    // Mejorar el manejo de errores
    if (error.message && error.message.includes("tiempo máximo")) {
      return NextResponse.json(
        { error: "Tiempo de espera excedido al buscar la playlist. Continuando con la importación..." },
        { status: 408 },
      )
    }

    return NextResponse.json({ error: error.message || "Error desconocido" }, { status: 500 })
  }
}