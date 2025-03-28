import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Función para obtener la conexión a la base de datos
// Esta función solo debe llamarse desde el servidor
export function getDbConnection() {
  const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      "No se ha proporcionado una cadena de conexión a la base de datos. Verifica tus variables de entorno.",
    )
  }

  const sql = neon(connectionString)
  return drizzle(sql)
}

// No inicializar la conexión aquí, solo cuando se necesite
// Esto evita errores en el cliente

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

// Función auxiliar para manejar la serialización de objetos
function safeSerialize(obj) {
  if (!obj) return obj

  // Si es un array, aplicar a cada elemento
  if (Array.isArray(obj)) {
    return obj.map((item) => safeSerialize(item))
  }

  // Si es un objeto, crear una copia limpia
  if (typeof obj === "object") {
    const result = {}
    for (const key in obj) {
      // Excluir propiedades que puedan causar referencias circulares
      if (key !== "table" && key !== "schema" && key !== "_") {
        result[key] = safeSerialize(obj[key])
      }
    }
    return result
  }

  return obj
}

// Funciones de acceso a datos
export async function getUserByEmail(email: string) {
  try {
    const db = getDbConnection()
    const result = await db
      .select()
      .from(users)
      .where((sql) => sql`${users.email} = ${email}`)
    return safeSerialize(result[0])
  } catch (error) {
    console.error("Error al obtener usuario por email:", error)
    throw error
  }
}

export async function createUser(userData: { email: string; name?: string; image?: string; spotifyId?: string }) {
  try {
    const db = getDbConnection()
    const result = await db.insert(users).values(userData).returning()
    return safeSerialize(result[0])
  } catch (error) {
    console.error("Error al crear usuario:", error)
    throw error
  }
}

export async function getOrCreateUser(userData: { email: string; name?: string; image?: string; spotifyId?: string }) {
  try {
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
        const db = getDbConnection()
        const result = await db
          .update(users)
          .set({
            name: userData.name || user.name,
            image: userData.image || user.image,
            spotifyId: userData.spotifyId || user.spotifyId,
          })
          .where((sql) => sql`${users.id} = ${user.id}`)
          .returning()
        user = safeSerialize(result[0])
      }
    }

    return user
  } catch (error) {
    console.error("Error en getOrCreateUser:", error)
    throw error
  }
}

export async function getPlaylistBySpotifyId(spotifyId: string) {
  const db = getDbConnection()
  const result = await db
    .select()
    .from(playlists)
    .where((sql) => sql`${playlists.spotifyId} = ${spotifyId}`)
  return safeSerialize(result[0])
}

export async function createPlaylist(playlistData: {
  spotifyId: string
  name: string
  description?: string
  image?: string
  isPrivate?: boolean
  privatePlaylistName?: string
}) {
  const db = getDbConnection()
  const result = await db.insert(playlists).values(playlistData).returning()
  return safeSerialize(result[0])
}

export async function getOrCreatePlaylist(playlistData: {
  spotifyId: string
  name: string
  description?: string
  image?: string
  isPrivate?: boolean
  privatePlaylistName?: string
}) {
  const db = getDbConnection()
  let playlist = await getPlaylistBySpotifyId(playlistData.spotifyId)

  if (!playlist) {
    playlist = await createPlaylist(playlistData)
  }

  return playlist
}

export async function addUserToPlaylist(userId: number, playlistId: number) {
  const db = getDbConnection()
  // Verificar si ya existe la relación
  const existing = await db
    .select()
    .from(userPlaylists)
    .where((sql) => sql`${userPlaylists.userId} = ${userId} AND ${userPlaylists.playlistId} = ${playlistId}`)

  if (existing.length === 0) {
    const result = await db.insert(userPlaylists).values({ userId, playlistId }).returning()
    return safeSerialize(result[0])
  }

  // Si estaba oculta, la hacemos visible de nuevo
  if (existing[0].isHidden) {
    const result = await db
      .update(userPlaylists)
      .set({ isHidden: false })
      .where((sql) => sql`${userPlaylists.id} = ${existing[0].id}`)
      .returning()
    return safeSerialize(result[0])
  }

  return safeSerialize(existing[0])
}

export async function hideUserPlaylist(userId: number, playlistId: number) {
  const db = getDbConnection()
  const result = await db
    .update(userPlaylists)
    .set({ isHidden: true })
    .where((sql) => sql`${userPlaylists.userId} = ${userId} AND ${userPlaylists.playlistId} = ${playlistId}`)
    .returning()
  return safeSerialize(result[0])
}

export async function getUserPlaylists(userId: number, includeHidden = false) {
  const db = getDbConnection()
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
    .innerJoin(playlists, (sql) => sql`${userPlaylists.playlistId} = ${playlists.id}`)
    .where((sql) => sql`${userPlaylists.userId} = ${userId}`)

  if (!includeHidden) {
    query = query.where((sql) => sql`${userPlaylists.isHidden} = false`)
  }

  const result = await query
  return safeSerialize(result)
}

export async function getArtistBySpotifyId(spotifyId: string) {
  const db = getDbConnection()
  const result = await db
    .select()
    .from(artists)
    .where((sql) => sql`${artists.spotifyId} = ${spotifyId}`)
  return safeSerialize(result[0])
}

export async function createArtist(artistData: { spotifyId: string; name: string; image?: string }) {
  const db = getDbConnection()
  const result = await db.insert(artists).values(artistData).returning()
  return safeSerialize(result[0])
}

export async function getOrCreateArtist(artistData: { spotifyId: string; name: string; image?: string }) {
  const db = getDbConnection()
  let artist = await getArtistBySpotifyId(artistData.spotifyId)

  if (!artist) {
    artist = await createArtist(artistData)
  }

  return artist
}

export async function addArtistToPlaylist(playlistId: number, artistId: number) {
  const db = getDbConnection()
  // Verificar si ya existe la relación
  const existing = await db
    .select()
    .from(playlistArtists)
    .where((sql) => sql`${playlistArtists.playlistId} = ${playlistId} AND ${playlistArtists.artistId} = ${artistId}`)

  if (existing.length === 0) {
    const result = await db.insert(playlistArtists).values({ playlistId, artistId }).returning()
    return safeSerialize(result[0])
  }

  return safeSerialize(existing[0])
}

export async function getTrackBySpotifyId(spotifyId: string) {
  const db = getDbConnection()
  const result = await db
    .select()
    .from(tracks)
    .where((sql) => sql`${tracks.spotifyId} = ${spotifyId}`)
  return safeSerialize(result[0])
}

export async function createTrack(trackData: {
  spotifyId: string
  name: string
  previewUrl?: string
  albumName?: string
  albumImage?: string
  artistId: number
}) {
  const db = getDbConnection()
  const result = await db.insert(tracks).values(trackData).returning()
  return safeSerialize(result[0])
}

export async function getOrCreateTrack(trackData: {
  spotifyId: string
  name: string
  previewUrl?: string
  albumName?: string
  albumImage?: string
  artistId: number
}) {
  const db = getDbConnection()
  let track = await getTrackBySpotifyId(trackData.spotifyId)

  if (!track) {
    track = await createTrack(trackData)
  }

  return track
}

export async function getArtistTracks(artistId: number) {
  const db = getDbConnection()
  const result = await db
    .select()
    .from(tracks)
    .where((sql) => sql`${tracks.artistId} = ${artistId}`)
  return safeSerialize(result)
}

export async function getPlaylistArtists(playlistId: number) {
  const db = getDbConnection()
  const result = await db
    .select({
      id: artists.id,
      spotifyId: artists.spotifyId,
      name: artists.name,
      image: artists.image,
    })
    .from(playlistArtists)
    .innerJoin(artists, (sql) => sql`${playlistArtists.artistId} = ${artists.id}`)
    .where((sql) => sql`${playlistArtists.playlistId} = ${playlistId}`)

  return safeSerialize(result)
}

export async function getUserRanking(userId: number, playlistId: number, artistId: number) {
  const db = getDbConnection()
  const result = await db
    .select()
    .from(rankings)
    .where(
      (sql) =>
        sql`${rankings.userId} = ${userId} AND ${rankings.playlistId} = ${playlistId} AND ${rankings.artistId} = ${artistId}`,
    )
  return safeSerialize(result[0])
}

export async function setUserRanking(userId: number, playlistId: number, artistId: number, tierId: string) {
  const db = getDbConnection()
  const existing = await getUserRanking(userId, playlistId, artistId)

  if (existing) {
    const result = await db
      .update(rankings)
      .set({ tierId, updatedAt: new Date() })
      .where((sql) => sql`${rankings.id} = ${existing.id}`)
      .returning()
    return safeSerialize(result[0])
  } else {
    const result = await db.insert(rankings).values({ userId, playlistId, artistId, tierId }).returning()
    return safeSerialize(result[0])
  }
}

export async function deleteUserRanking(userId: number, playlistId: number, artistId: number) {
  const db = getDbConnection()
  const result = await db
    .delete(rankings)
    .where(
      (sql) =>
        sql`${rankings.userId} = ${userId} AND ${rankings.playlistId} = ${playlistId} AND ${rankings.artistId} = ${artistId}`,
    )
  return safeSerialize(result)
}

export async function getUserRankings(userId: number, playlistId: number) {
  const db = getDbConnection()
  const result = await db
    .select({
      artistId: rankings.artistId,
      tierId: rankings.tierId,
    })
    .from(rankings)
    .where((sql) => sql`${rankings.userId} = ${userId} AND ${rankings.playlistId} = ${playlistId}`)

  return safeSerialize(result)
}

export async function getPlaylistRankings(playlistId: number) {
  const db = getDbConnection()
  const result = await db
    .select({
      userId: rankings.userId,
      artistId: rankings.artistId,
      tierId: rankings.tierId,
    })
    .from(rankings)
    .where((sql) => sql`${rankings.playlistId} = ${playlistId}`)

  return safeSerialize(result)
}

export async function getPlaylistUserCount(playlistId: number) {
  const db = getDbConnection()
  const result = await db
    .select({ count: sql<number>`count(distinct ${rankings.userId})` })
    .from(rankings)
    .where((sql) => sql`${rankings.playlistId} = ${playlistId}`)
  return result[0]?.count || 0
}

export async function getFullPlaylistData(playlistId: number) {
  const db = getDbConnection()
  const playlistData = await db
    .select()
    .from(playlists)
    .where((sql) => sql`${playlists.id} = ${playlistId}`)

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

