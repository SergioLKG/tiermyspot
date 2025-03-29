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

    // Obtener datos de Spotify
    console.log("Obteniendo datos de playlist desde Spotify")
    const playlistData = await processPlaylistData(playlistId, session.accessToken)

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

