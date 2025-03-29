import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { processPlaylistData } from "@/lib/spotify-api"
import {
  getOrCreatePlaylist,
  getOrCreateArtist,
  getOrCreateTrack,
  addUserToPlaylist,
  getUserByEmail,
  getOrCreateTierlist,
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { playlistId, isPrivate, privatePlaylistName } = await request.json()

    if (!playlistId) {
      return NextResponse.json({ error: "ID de playlist no proporcionado" }, { status: 400 })
    }

    // Obtener usuario
    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
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

    // Crear o actualizar playlist base (siempre pública)
    const playlist = await getOrCreatePlaylist({
      spotifyId: playlistData.id,
      name: playlistData.name,
      description: playlistData.description,
      image: playlistData.image,
    })

    // Asociar usuario con playlist
    await addUserToPlaylist(user.id, playlist.id)

    // Guardar artistas y pistas si es necesario
    for (const artistData of playlistData.artists) {
      const artist = await getOrCreateArtist({
        spotifyId: artistData.id,
        name: artistData.name,
        image: artistData.image,
      })

      // Guardar pistas del artista
      for (const trackData of artistData.tracks) {
        await getOrCreateTrack({
          spotifyId: trackData.id,
          name: trackData.name,
          previewUrl: trackData.previewUrl,
          albumName: trackData.albumName,
          albumImage: trackData.albumImage,
          artistId: artist.id,
        })
      }
    }

    // Crear tierlist para el usuario (pública o privada)
    const tierlist = await getOrCreateTierlist({
      userId: user.id,
      playlistId: playlist.id,
      isPrivate: isPrivate || false,
      privateName: isPrivate ? privatePlaylistName : undefined,
    })

    return NextResponse.json({
      success: true,
      playlistId: playlist.id,
      spotifyId: playlist.spotifyId,
      tierlistId: tierlist.id,
      isPrivate: isPrivate || false,
      privatePlaylistName: privatePlaylistName,
    })
  } catch (error) {
    console.error("Error al importar playlist:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}