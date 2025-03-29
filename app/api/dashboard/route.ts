import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getUserByEmail, getUserPlaylists, hideUserPlaylist, getTierlists } from "@/lib/db"

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

    // Obtener SOLO las playlists que el usuario ha importado explícitamente
    // y que no están ocultas
    const playlists = await getUserPlaylists(user.id, false)

    // Obtener todas las tierlists del usuario para identificar las privadas
    const tierlists = await getTierlists(user.id)

    // Mapear las playlists con información adicional de las tierlists
    const enhancedPlaylists = playlists.map((playlist: any) => {
      // Buscar tierlists asociadas a esta playlist
      const playlistTierlists = tierlists.filter((t: any) => t.playlistId === playlist.id)

      // Verificar si hay alguna tierlist privada
      const privateTierlists = playlistTierlists.filter((t: any) => t.isPrivate)

      return {
        ...playlist,
        tierlists: playlistTierlists.map((t: any) => ({
          id: t.id,
          isPrivate: t.isPrivate,
          privateName: t.privateName,
        })),
      }
    })

    // Separar playlists públicas y privadas
    // Una playlist es "pública" si no tiene tierlists privadas asociadas
    // Una playlist es "privada" si tiene al menos una tierlist privada
    const publicPlaylists = enhancedPlaylists.filter(
      (playlist: any) => !playlist.tierlists.some((t: any) => t.isPrivate),
    )

    const privatePlaylists = enhancedPlaylists
      .filter((playlist: any) => playlist.tierlists.some((t: any) => t.isPrivate))
      .flatMap((playlist: any) => {
        // Para cada playlist con tierlists privadas, crear una entrada por cada tierlist privada
        const privateTierlists = playlist.tierlists.filter((t: any) => t.isPrivate)

        return privateTierlists.map((tierlist: any) => ({
          ...playlist,
          isPrivate: true,
          privatePlaylistName: tierlist.privateName,
          tierlistId: tierlist.id,
        }))
      })

    return NextResponse.json({ publicPlaylists, privatePlaylists })
  } catch (error) {
    console.error("Error al obtener playlists del dashboard:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { playlistId, action } = await request.json()

    if (!playlistId || !action) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (action === "hide") {
      await hideUserPlaylist(user.id, Number.parseInt(playlistId))
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error al actualizar playlist del dashboard:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}