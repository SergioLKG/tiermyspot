import { sql } from "@vercel/postgres"
import { drizzle } from "drizzle-orm/vercel-postgres"
import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core"

// Definición de tablas
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  spotifyId: text("spotify_id"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  spotifyId: text("spotify_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  isPrivate: boolean("is_private").default(false),
  privatePlaylistName: text("private_playlist_name"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const userPlaylists = pgTable("user_playlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  playlistId: integer("playlist_id").notNull(),
  isHidden: boolean("is_hidden").default(false),
  createdAt: timestamp("created_at").defaultNow(),
})

export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  spotifyId: text("spotify_id").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
})

export const playlistArtists = pgTable("playlist_artists", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").notNull(),
  artistId: integer("artist_id").notNull(),
})

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  spotifyId: text("spotify_id").notNull().unique(),
  name: text("name").notNull(),
  previewUrl: text("preview_url"),
  albumName: text("album_name"),
  albumImage: text("album_image"),
  artistId: integer("artist_id").notNull(),
})

export const rankings = pgTable("rankings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  playlistId: integer("playlist_id").notNull(),
  artistId: integer("artist_id").notNull(),
  tierId: text("tier_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Cliente de Drizzle
export const db = drizzle(sql)

// Funciones de acceso a datos
export async function getUserByEmail(email: string) {
  const result = await db.select().from(users).where(sql`${users.email} = ${email}`)
  return result[0]
}

export async function createUser(userData: { email: string; name?: string; image?: string; spotifyId?: string }) {
  const result = await db.insert(users).values(userData).returning()
  return result[0]
}

export async function getOrCreateUser(userData: { email: string; name?: string; image?: string; spotifyId?: string }) {
  let user = await getUserByEmail(userData.email)

  if (!user) {
    user = await createUser(userData)
  } else {
    // Actualizar datos del usuario si han cambiado
    if (
      (userData.name && userData.name !== user.name) ||
      (userData.image && userData.image !== user.image) ||
      (userData.spotifyId && userData.spotifyId !== user.spotifyId)
    ) {
      const result = await db
        .update(users)
        .set({
          name: userData.name || user.name,
          image: userData.image || user.image,
          spotifyId: userData.spotifyId || user.spotifyId,
        })
        .where(sql`${users.id} = ${user.id}`)
        .returning()
      user = result[0]
    }
  }

  return user
}

export async function getPlaylistBySpotifyId(spotifyId: string) {
  const result = await db.select().from(playlists).where(sql`${playlists.spotifyId} = ${spotifyId}`)
  return result[0]
}

export async function createPlaylist(playlistData: {
  spotifyId: string
  name: string
  description?: string
  image?: string
  isPrivate?: boolean
  privatePlaylistName?: string
}) {
  const result = await db.insert(playlists).values(playlistData).returning()
  return result[0]
}

export async function getOrCreatePlaylist(playlistData: {
  spotifyId: string
  name: string
  description?: string
  image?: string
  isPrivate?: boolean
  privatePlaylistName?: string
}) {
  let playlist = await getPlaylistBySpotifyId(playlistData.spotifyId)

  if (!playlist) {
    playlist = await createPlaylist(playlistData)
  }

  return playlist
}

export async function addUserToPlaylist(userId: number, playlistId: number) {
  // Verificar si ya existe la relación
  const existing = await db
    .select()
    .from(userPlaylists)
    .where(sql`${userPlaylists.userId} = ${userId} AND ${userPlaylists.playlistId} = ${playlistId}`)

  if (existing.length === 0) {
    const result = await db.insert(userPlaylists).values({ userId, playlistId }).returning()
    return result[0]
  }

  // Si estaba oculta, la hacemos visible de nuevo
  if (existing[0].isHidden) {
    const result = await db
      .update(userPlaylists)
      .set({ isHidden: false })
      .where(sql`${userPlaylists.id} = ${existing[0].id}`)
      .returning()
    return result[0]
  }

  return existing[0]
}

export async function hideUserPlaylist(userId: number, playlistId: number) {
  const result = await db
    .update(userPlaylists)
    .set({ isHidden: true })
    .where(sql`${userPlaylists.userId} = ${userId} AND ${userPlaylists.playlistId} = ${playlistId}`)
    .returning()
  return result[0]
}

export async function getUserPlaylists(userId: number, includeHidden = false) {
  let query = db
    .select({
      id: playlists.id,
      spotifyId: playlists.spotifyId,
      name: playlists.name,
      description: playlists.description,
      image: playlists.image,
      isPrivate: playlists.isPrivate,
      privatePlaylistName: playlists.privatePlaylistName,
      isHidden: userPlaylists.isHidden,
      createdAt: playlists.createdAt,
    })
    .from(userPlaylists)
    .innerJoin(playlists, sql`${userPlaylists.playlistId} = ${playlists.id}`)
    .where(sql`${userPlaylists.userId} = ${userId}`)

  if (!includeHidden) {
    query = query.where(sql`${userPlaylists.isHidden} = false`)
  }

  return await query
}

export async function getArtistBySpotifyId(spotifyId: string) {
  const result = await db.select().from(artists).where(sql`${artists.spotifyId} = ${spotifyId}`)
  return result[0]
}

export async function createArtist(artistData: { spotifyId: string; name: string; image?: string }) {
  const result = await db.insert(artists).values(artistData).returning()
  return result[0]
}

export async function getOrCreateArtist(artistData: { spotifyId: string; name: string; image?: string }) {
  let artist = await getArtistBySpotifyId(artistData.spotifyId)

  if (!artist) {
    artist = await createArtist(artistData)
  }

  return artist
}

export async function addArtistToPlaylist(playlistId: number, artistId: number) {
  // Verificar si ya existe la relación
  const existing = await db
    .select()
    .from(playlistArtists)
    .where(sql`${playlistArtists.playlistId} = ${playlistId} AND ${playlistArtists.artistId} = ${artistId}`)

  if (existing.length === 0) {
    const result = await db.insert(playlistArtists).values({ playlistId, artistId }).returning()
    return result[0]
  }

  return existing[0]
}

export async function getTrackBySpotifyId(spotifyId: string) {
  const result = await db.select().from(tracks).where(sql`${tracks.spotifyId} = ${spotifyId}`)
  return result[0]
}

export async function createTrack(trackData: {
  spotifyId: string
  name: string
  previewUrl?: string
  albumName?: string
  albumImage?: string
  artistId: number
}) {
  const result = await db.insert(tracks).values(trackData).returning()
  return result[0]
}

export async function getOrCreateTrack(trackData: {
  spotifyId: string
  name: string
  previewUrl?: string
  albumName?: string
  albumImage?: string
  artistId: number
}) {
  let track = await getTrackBySpotifyId(trackData.spotifyId)

  if (!track) {
    track = await createTrack(trackData)
  }

  return track
}

export async function getArtistTracks(artistId: number) {
  return await db.select().from(tracks).where(sql`${tracks.artistId} = ${artistId}`)
}

export async function getPlaylistArtists(playlistId: number) {
  return await db
    .select({
      id: artists.id,
      spotifyId: artists.spotifyId,
      name: artists.name,
      image: artists.image,
    })
    .from(playlistArtists)
    .innerJoin(artists, sql`${playlistArtists.artistId} = ${artists.id}`)
    .where(sql`${playlistArtists.playlistId} = ${playlistId}`)
}

export async function getUserRanking(userId: number, playlistId: number, artistId: number) {
  const result = await db
    .select()
    .from(rankings)
    .where(
      sql`${rankings.userId} = ${userId} AND ${rankings.playlistId} = ${playlistId} AND ${rankings.artistId} = ${artistId}`,
    )
  return result[0]
}

export async function setUserRanking(userId: number, playlistId: number, artistId: number, tierId: string) {
  const existing = await getUserRanking(userId, playlistId, artistId)

  if (existing) {
    const result = await db
      .update(rankings)
      .set({ tierId, updatedAt: new Date() })
      .where(sql`${rankings.id} = ${existing.id}`)
      .returning()
    return result[0]
  } else {
    const result = await db.insert(rankings).values({ userId, playlistId, artistId, tierId }).returning()
    return result[0]
  }
}

export async function deleteUserRanking(userId: number, playlistId: number, artistId: number) {
  return await db
    .delete(rankings)
    .where(
      sql`${rankings.userId} = ${userId} AND ${rankings.playlistId} = ${playlistId} AND ${rankings.artistId} = ${artistId}`,
    )
}

export async function getUserRankings(userId: number, playlistId: number) {
  return await db
    .select({
      artistId: rankings.artistId,
      tierId: rankings.tierId,
    })
    .from(rankings)
    .where(sql`${rankings.userId} = ${userId} AND ${rankings.playlistId} = ${playlistId}`)
}

export async function getPlaylistRankings(playlistId: number) {
  return await db
    .select({
      userId: rankings.userId,
      artistId: rankings.artistId,
      tierId: rankings.tierId,
    })
    .from(rankings)
    .where(sql`${rankings.playlistId} = ${playlistId}`)
}

export async function getPlaylistUserCount(playlistId: number) {
  const result = await db
    .select({ count: sql<number>`count(distinct ${rankings.userId})` })
    .from(rankings)
    .where(sql`${rankings.playlistId} = ${playlistId}`)
  return result[0]?.count || 0
}

export async function getFullPlaylistData(playlistId: number) {
  const playlistData = await db.select().from(playlists).where(sql`${playlists.id} = ${playlistId}`)

  if (playlistData.length === 0) {
    return null
  }

  const playlist = playlistData[0]
  const artistsData = await getPlaylistArtists(playlistId)

  const artists = []

  for (const artist of artistsData) {
    const tracksData = await getArtistTracks(artist.id)
    artists.push({
      ...artist,
      tracks: tracksData,
    })
  }

  return {
    ...playlist,
    artists,
  }
}

