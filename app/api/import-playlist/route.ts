import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { processPlaylistData } from "@/lib/spotify-api"
import {
  getOrCreatePlaylist,
  getOrCreateArtist,
  getOrCreateUserPlaylist,
  getUserByEmail,
  getPlaylistBySpotifyId,
  getOrCreateTierlist,
  unhideUserTierlists,
} from "@/lib/db"

// Función para renovar el token de acceso
async function refreshAccessToken(refreshToken: any) {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      accessToken: refreshedTokens.access_token,
      refreshToken: refreshedTokens.refresh_token ?? refreshToken,
    }
  } catch (error) {
    console.error("Error refreshing access token", error)
    throw new Error("Failed to refresh access token")
  }
}

// Corregir la función POST para que funcione con la nueva estructura
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { playlistId, isPrivate, privateName } = await request.json()

    if (!playlistId) {
      return NextResponse.json({ error: "ID de playlist no proporcionado" }, { status: 400 })
    }

    // Obtener usuario
    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar primero si la playlist ya existe en la base de datos
    // para evitar procesamiento innecesario
    let existingPlaylist = null
    try {
      existingPlaylist = await getPlaylistBySpotifyId(playlistId)
    } catch (dbError) {
      console.error("Error al verificar playlist en base de datos:", dbError)
      // Continuar con la importación aunque haya un error en la verificación
    }

    // Si la playlist ya existe, usarla directamente
    if (existingPlaylist) {
      console.log("Playlist encontrada en la base de datos, usando datos existentes")

      // Crear o actualizar la relación usuario-playlist
      const userPlaylist = await getOrCreateUserPlaylist({
        userId: user.id,
        playlistId: existingPlaylist.id,
        isPrivate: isPrivate || false,
        privateName: isPrivate ? privateName : undefined,
      })

      // Si la playlist estaba oculta, mostrarla
      await unhideUserTierlists(user.id, existingPlaylist.id)

      // Crear tierlist para el usuario si no existe
      const tierlist = await getOrCreateTierlist({
        userId: user.id,
        userPlaylistId: userPlaylist.id,
        isHidden: false, // Asegurarse de que no esté oculta
      })

      return NextResponse.json({
        success: true,
        playlistId: existingPlaylist.id,
        spotifyId: existingPlaylist.spotifyId,
        name: existingPlaylist.name,
        image: existingPlaylist.image,
        tierlistId: tierlist.id,
        userPlaylistId: userPlaylist.id,
        isPrivate: isPrivate || false,
        privateName: privateName,
        isNew: false,
      })
    }

    // Intentar procesar la playlist con el token actual
    let accessToken = session.accessToken
    let playlistData

    try {
      // Obtener datos de Spotify
      console.log("Obteniendo datos de playlist desde Spotify")
      playlistData = await processPlaylistData(playlistId, accessToken)
    } catch (error: any) {
      // Si el token ha expirado, intentar renovarlo
      if (
        error.message &&
        (error.message.includes("access token expired") ||
          error.message.includes("The access token expired") ||
          error.message.includes("invalid_token"))
      ) {
        console.log("Token expirado, intentando renovar...")

        if (!session.refreshToken) {
          return NextResponse.json(
            {
              error:
                "El token de acceso ha expirado y no se puede renovar automáticamente. Por favor, inicie sesión de nuevo.",
            },
            { status: 401 },
          )
        }

        try {
          // Renovar el token
          const tokens = await refreshAccessToken(session.refreshToken)
          accessToken = tokens.accessToken

          // Intentar de nuevo con el nuevo token
          console.log("Token renovado, intentando de nuevo...")
          playlistData = await processPlaylistData(playlistId, accessToken)
        } catch (refreshError) {
          console.error("Error al renovar el token:", refreshError)
          return NextResponse.json(
            {
              error: "No se pudo renovar el token de acceso. Por favor, inicie sesión de nuevo.",
            },
            { status: 401 },
          )
        }
      } else {
        // Si es otro tipo de error, propagarlo
        throw error
      }
    }

    // Extraer los IDs de Spotify de los artistas
    const artistSpotifyIds = playlistData.artists.map((artist) => artist.spotifyId)

    // Crear o actualizar playlist con los IDs de artistas
    const playlist = await getOrCreatePlaylist({
      spotifyId: playlistData.id,
      name: playlistData.name,
      description: playlistData.description,
      image: playlistData.image,
      artistIds: artistSpotifyIds,
    })

    // Crear o actualizar la relación usuario-playlist
    const userPlaylist = await getOrCreateUserPlaylist({
      userId: user.id,
      playlistId: playlist.id,
      isPrivate: isPrivate || false,
      privateName: isPrivate ? privateName : undefined,
    })

    // Guardar artistas en la base de datos
    // Procesar en lotes para evitar timeouts
    const batchSize = 10 // Procesar 10 artistas a la vez
    for (let i = 0; i < playlistData.artists.length; i += batchSize) {
      const batch = playlistData.artists.slice(i, i + batchSize)

      // Procesar cada lote de artistas en paralelo
      await Promise.all(
        batch.map(async (artistData: any) => {
          await getOrCreateArtist({
            spotifyId: artistData.id,
            name: artistData.name,
            image: artistData.image,
          })
        }),
      )
    }

    // Crear tierlist para el usuario
    const tierlist = await getOrCreateTierlist({
      userId: user.id,
      userPlaylistId: userPlaylist.id,
      isHidden: false, // Asegurarse de que no esté oculta
    })

    return NextResponse.json({
      success: true,
      playlistId: playlist.id,
      spotifyId: playlist.spotifyId,
      name: playlist.name,
      image: playlist.image,
      tierlistId: tierlist.id,
      userPlaylistId: userPlaylist.id,
      isPrivate: isPrivate || false,
      privateName: privateName,
      isNew: true,
    })
  } catch (error: any) {
    console.error("Error al importar playlist:", error)
    return NextResponse.json({ error: error.message || "Error desconocido al importar la playlist" }, { status: 500 })
  }
}