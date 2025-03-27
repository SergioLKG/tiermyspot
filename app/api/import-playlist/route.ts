import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { processPlaylistData } from "@/lib/spotify-api"
import {
  getOrCreatePlaylist,
  getOrCreateArtist,
  getOrCreateTrack,
  addArtistToPlaylist,
  addUserToPlaylist,
  getUserByEmail,
} from "@/lib/db"

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

    // Obtener datos de la playlist desde Spotify
    const playlistData = await processPlaylistData(playlistId, session.accessToken)

    // Guardar usuario
    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Guardar playlist
    const playlist = await getOrCreatePlaylist({
      spotifyId: playlistData.id,
      name: playlistData.name,
      description: playlistData.description,
      image: playlistData.image,
      isPrivate: isPrivate || false,
      privatePlaylistName: privatePlaylistName,
    })

    // Asociar usuario con playlist
    await addUserToPlaylist(user.id, playlist.id)

    // Guardar artistas y pistas
    for (const artistData of playlistData.artists) {
      const artist = await getOrCreateArtist({
        spotifyId: artistData.id,
        name: artistData.name,
        image: artistData.image,
      })

      // Asociar artista con playlist
      await addArtistToPlaylist(playlist.id, artist.id)

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

    return NextResponse.json({
      success: true,
      playlistId: playlist.id,
      spotifyId: playlist.spotifyId,
    })
  } catch (error) {
    console.error("Error al importar playlist:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

