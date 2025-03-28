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
  getPlaylistBySpotifyId,
  getPlaylistArtists,
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

    // Obtener usuario
    const user = await getUserByEmail(session.user.email)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar si la playlist ya existe (para playlists públicas)
    let playlist = null
    let isNewPlaylist = false

    if (!isPrivate) {
      playlist = await getPlaylistBySpotifyId(playlistId)

      if (playlist) {
        console.log("Playlist pública ya existe, asociando al usuario")
        // Si la playlist ya existe, solo asociarla al usuario
        await addUserToPlaylist(user.id, playlist.id)

        return NextResponse.json({
          success: true,
          playlistId: playlist.id,
          spotifyId: playlist.spotifyId,
          isNew: false,
        })
      }
    }

    // Para playlists privadas o si la pública no existe, obtener datos de Spotify
    console.log("Obteniendo datos de playlist desde Spotify")
    const playlistData = await processPlaylistData(playlistId, session.accessToken)

    // Crear o actualizar playlist
    playlist = await getOrCreatePlaylist({
      spotifyId: playlistData.id,
      name: playlistData.name,
      description: playlistData.description,
      image: playlistData.image,
      isPrivate: isPrivate || false,
      privatePlaylistName: privatePlaylistName,
    })

    // Asociar usuario con playlist
    await addUserToPlaylist(user.id, playlist.id)

    // Si es una playlist privada o es nueva, guardar artistas y pistas
    if (isPrivate || !(await getPlaylistArtists(playlist.id).length)) {
      isNewPlaylist = true
      console.log("Guardando artistas y pistas")

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
    }

    return NextResponse.json({
      success: true,
      playlistId: playlist.id,
      spotifyId: playlist.spotifyId,
      isNew: isNewPlaylist,
    })
  } catch (error) {
    console.error("Error al importar playlist:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}