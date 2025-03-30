import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { pgTable, serial, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Función para obtener la conexión a la base de datos
export function getDbConnection() {
  const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      "No se ha proporcionado una cadena de conexión a la base de datos. Verifica tus variables de entorno.",
    )
  }

  const neonClient = neon(connectionString)
  return drizzle(neonClient)
}

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
  artistIds: jsonb("artist_ids").default([]), // Nueva columna para almacenar los IDs de los artistas
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const userPlaylists = pgTable("user_playlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  playlistId: integer("playlist_id").notNull(),
  isHidden: boolean("is_hidden").default(false),
  isPrivate: boolean("is_private").default(false), // Movido desde tierlists
  privateName: text("private_name"), // Movido desde tierlists
  createdAt: timestamp("created_at").defaultNow(),
})

export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  spotifyId: text("spotify_id").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
})

export const tierlists = pgTable("tierlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userPlaylistId: integer("user_playlist_id").notNull(), // Cambiado de playlistId a userPlaylistId
  ratings: jsonb("ratings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const groupTierlists = pgTable("group_tierlists", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").notNull(),
  privateName: text("private_name"),
  aggregatedRatings: jsonb("aggregated_ratings").default({}),
  userCount: integer("user_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Función auxiliar para manejar la serialización de objetos
function safeSerialize(obj:any):any {
  if (!obj) return obj

  // Si es un array, aplicar a cada elemento
  if (Array.isArray(obj)) {
    return obj.map((item) => safeSerialize(item))
  }

  // Si es un objeto, crear una copia limpia
  if (typeof obj === "object") {
    const result:any = {}
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
    const result = await db.select().from(users).where(sql`${users.email} = ${email}`)
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
          .where(sql`${users.id} = ${user.id}`)
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
  const result = await db.select().from(playlists).where(sql`${playlists.spotifyId} = ${spotifyId}`)
  return safeSerialize(result[0])
}

export async function createPlaylist(playlistData: {
  spotifyId: string
  name: string
  description?: string
  image?: string
  artistIds?: string[]
}) {
  const db = getDbConnection()
  const result = await db
    .insert(playlists)
    .values({
      spotifyId: playlistData.spotifyId,
      name: playlistData.name,
      description: playlistData.description,
      image: playlistData.image,
      artistIds: playlistData.artistIds || [],
    })
    .returning()
  return safeSerialize(result[0])
}

export async function updatePlaylistArtists(playlistId: number, artistIds: string[]) {
  const db = getDbConnection()
  const result = await db
    .update(playlists)
    .set({
      artistIds: artistIds,
      updatedAt: new Date(),
    })
    .where(sql`${playlists.id} = ${playlistId}`)
    .returning()
  return safeSerialize(result[0])
}

export async function getOrCreatePlaylist(playlistData: {
  spotifyId: string
  name: string
  description?: string
  image?: string
  artistIds?: string[]
}) {
  let playlist = await getPlaylistBySpotifyId(playlistData.spotifyId)

  if (!playlist) {
    playlist = await createPlaylist(playlistData)
  } else if (playlistData.artistIds && playlistData.artistIds.length > 0) {
    // Verificar si hay nuevos artistas para actualizar
    const currentArtistIds = playlist.artistIds || []
    const newArtistIds = playlistData.artistIds.filter((id) => !currentArtistIds.includes(id))

    if (newArtistIds.length > 0) {
      // Actualizar la lista de artistas
      const updatedArtistIds = [...currentArtistIds, ...newArtistIds]
      playlist = await updatePlaylistArtists(playlist.id, updatedArtistIds)
    }
  }

  return playlist
}

export async function getUserPlaylist(userId: number, playlistId: number, privateName?: string) {
  const db = getDbConnection()
  let query:any = db
    .select()
    .from(userPlaylists)
    .where(sql`${userPlaylists.userId} = ${userId} AND ${userPlaylists.playlistId} = ${playlistId}`)

  if (privateName) {
    query = query.where(sql`${userPlaylists.privateName} = ${privateName}`)
  } else {
    query = query.where(sql`${userPlaylists.privateName} IS NULL`)
  }

  const result = await query
  return safeSerialize(result[0])
}

export async function createUserPlaylist(userPlaylistData: {
  userId: number
  playlistId: number
  isHidden?: boolean
  isPrivate?: boolean
  privateName?: string
}) {
  const db = getDbConnection()
  const result = await db
    .insert(userPlaylists)
    .values({
      userId: userPlaylistData.userId,
      playlistId: userPlaylistData.playlistId,
      isHidden: userPlaylistData.isHidden || false,
      isPrivate: userPlaylistData.isPrivate || false,
      privateName: userPlaylistData.privateName,
    })
    .returning()
  return safeSerialize(result[0])
}

export async function getOrCreateUserPlaylist(userPlaylistData: {
  userId: number
  playlistId: number
  isHidden?: boolean
  isPrivate?: boolean
  privateName?: string
}) {
  let userPlaylist = await getUserPlaylist(
    userPlaylistData.userId,
    userPlaylistData.playlistId,
    userPlaylistData.privateName,
  )

  if (!userPlaylist) {
    userPlaylist = await createUserPlaylist(userPlaylistData)
  } else if (userPlaylist.isHidden) {
    // Si estaba oculta, la hacemos visible de nuevo
    const db = getDbConnection()
    const result = await db
      .update(userPlaylists)
      .set({ isHidden: false })
      .where(sql`${userPlaylists.id} = ${userPlaylist.id}`)
      .returning()
    userPlaylist = safeSerialize(result[0])
  }

  return userPlaylist
}

export async function hideUserPlaylist(userId: number, playlistId: number) {
  const db = getDbConnection()
  const result = await db
    .update(userPlaylists)
    .set({ isHidden: true })
    .where(sql`${userPlaylists.userId} = ${userId} AND ${userPlaylists.playlistId} = ${playlistId}`)
    .returning()
  return safeSerialize(result[0])
}

export async function getUserPlaylists(userId: number, includeHidden = false) {
  const db = getDbConnection()
  let query:any = db
    .select({
      id: playlists.id,
      spotifyId: playlists.spotifyId,
      name: playlists.name,
      description: playlists.description,
      image: playlists.image,
      artistIds: playlists.artistIds,
      isHidden: userPlaylists.isHidden,
      isPrivate: userPlaylists.isPrivate,
      privateName: userPlaylists.privateName,
      userPlaylistId: userPlaylists.id,
      createdAt: playlists.createdAt,
    })
    .from(userPlaylists)
    .innerJoin(playlists, sql`${userPlaylists.playlistId} = ${playlists.id}`)
    .where(sql`${userPlaylists.userId} = ${userId}`)

  if (!includeHidden) {
    query = query.where(sql`${userPlaylists.isHidden} = false`)
  }

  const result = await query
  return safeSerialize(result)
}

export async function getPlaylistArtists(playlistId: number) {
  const db = getDbConnection()

  // Primero obtenemos los IDs de artistas de la playlist
  const playlistResult:any = await db
    .select({ artistIds: playlists.artistIds })
    .from(playlists)
    .where(sql`${playlists.id} = ${playlistId}`)
    .execute()

  if (!playlistResult.length || !playlistResult[0].artistIds || !playlistResult[0].artistIds.length) {
    return []
  }

  // Luego obtenemos los detalles de los artistas
  const artistIds = playlistResult[0].artistIds
  const result = await db.select().from(artists).where(sql`${artists.spotifyId} IN (${artistIds})`).execute()

  return safeSerialize(result)
}

export async function getArtistBySpotifyId(spotifyId: string) {
  try {
    const db = getDbConnection()
    const result = await db.select().from(artists).where(sql`${artists.spotifyId} = ${spotifyId}`)
    return safeSerialize(result[0])
  } catch (error) {
    console.error("Error al obtener artista por spotifyId:", error)
    throw error
  }
}

export async function createArtist(artistData: { spotifyId: string; name: string; image?: string }) {
  const db = getDbConnection()
  const result = await db.insert(artists).values(artistData).returning()
  return safeSerialize(result[0])
}

export async function getOrCreateArtist(artistData: { spotifyId: string; name: string; image?: string }) {
  let artist = await getArtistBySpotifyId(artistData.spotifyId)

  if (!artist) {
    artist = await createArtist(artistData)
  } else {
    // Actualizar la imagen si ha cambiado
    if (artistData.image && artistData.image !== artist.image) {
      const db = getDbConnection()
      const result = await db
        .update(artists)
        .set({ image: artistData.image })
        .where(sql`${artists.id} = ${artist.id}`)
        .returning()
      artist = safeSerialize(result[0])
    }
  }

  return artist
}

// Nuevas funciones para el sistema de tierlists

export async function getTierlist(userId: number, userPlaylistId: number) {
  const db = getDbConnection()
  const result = await db
    .select()
    .from(tierlists)
    .where(sql`${tierlists.userId} = ${userId} AND ${tierlists.userPlaylistId} = ${userPlaylistId}`)
    .execute()

  return safeSerialize(result[0])
}

export async function createTierlist(tierlistData: {
  userId: number
  userPlaylistId: number
  ratings?: Record<string, string>
}) {
  const db = getDbConnection()
  const result = await db
    .insert(tierlists)
    .values({
      userId: tierlistData.userId,
      userPlaylistId: tierlistData.userPlaylistId,
      ratings: tierlistData.ratings || {},
    })
    .returning()
  return safeSerialize(result[0])
}

export async function getOrCreateTierlist(tierlistData: {
  userId: number
  userPlaylistId: number
  ratings?: Record<string, string>
}) {
  let tierlist = await getTierlist(tierlistData.userId, tierlistData.userPlaylistId)

  if (!tierlist) {
    tierlist = await createTierlist(tierlistData)
  }

  return tierlist
}

export async function updateTierlistRating(
  userId: number,
  userPlaylistId: number,
  artistId: number,
  tierId: string | null,
) {
  const db = getDbConnection()

  // Obtener o crear la tierlist
  const tierlist = await getOrCreateTierlist({
    userId,
    userPlaylistId,
  })

  // Actualizar los ratings
  const ratings = tierlist.ratings || {}

  if (tierId === null) {
    // Eliminar el rating
    delete ratings[artistId]
  } else {
    // Actualizar o añadir el rating
    ratings[artistId] = tierId
  }

  // Guardar los cambios
  const result = await db
    .update(tierlists)
    .set({
      ratings: ratings,
      updatedAt: new Date(),
    })
    .where(sql`${tierlists.id} = ${tierlist.id}`)
    .returning()

  // Obtener la información de la playlist para actualizar la tierlist grupal
  const userPlaylistInfo:any = await db
    .select({
      playlistId: userPlaylists.playlistId,
      privateName: userPlaylists.privateName,
    })
    .from(userPlaylists)
    .where(sql`${userPlaylists.id} = ${userPlaylistId}`)
    .execute()

  if (userPlaylistInfo.length > 0) {
    // Actualizar la tierlist grupal
    await updateGroupTierlist(userPlaylistInfo[0].playlistId, userPlaylistInfo[0].privateName)
  }

  return safeSerialize(result[0])
}

export async function getGroupTierlist(playlistId: number, privateName?: string) {
  const db = getDbConnection()
  let query:any = db.select().from(groupTierlists).where(sql`${groupTierlists.playlistId} = ${playlistId}`)

  if (privateName) {
    query = query.where(sql`${groupTierlists.privateName} = ${privateName}`)
  } else {
    query = query.where(sql`${groupTierlists.privateName} IS NULL`)
  }

  const result = await query
  return safeSerialize(result[0])
}

export async function createGroupTierlist(groupTierlistData: {
  playlistId: number
  privateName?: string
}) {
  const db = getDbConnection()
  const result = await db.insert(groupTierlists).values(groupTierlistData).returning()
  return safeSerialize(result[0])
}

export async function getOrCreateGroupTierlist(groupTierlistData: {
  playlistId: number
  privateName?: string
}) {
  let groupTierlist = await getGroupTierlist(groupTierlistData.playlistId, groupTierlistData.privateName)

  if (!groupTierlist) {
    groupTierlist = await createGroupTierlist(groupTierlistData)
  }

  return groupTierlist
}

export async function updateGroupTierlist(playlistId: number, privateName?: string) {
  const db = getDbConnection()

  // Obtener todas las userPlaylists para esta playlist
  let userPlaylistsQuery:any = db
    .select({ id: userPlaylists.id })
    .from(userPlaylists)
    .where(sql`${userPlaylists.playlistId} = ${playlistId}`)

  if (privateName) {
    userPlaylistsQuery = userPlaylistsQuery.where(sql`${userPlaylists.privateName} = ${privateName}`)
  } else {
    userPlaylistsQuery = userPlaylistsQuery.where(sql`${userPlaylists.privateName} IS NULL`)
  }

  const userPlaylistsResult = await userPlaylistsQuery.execute()
  const userPlaylistIds = userPlaylistsResult.map((up:any) => up.id)

  if (userPlaylistIds.length === 0) {
    return null
  }

  // Obtener todas las tierlists para estas userPlaylists
  const tierlistsResult = await db
    .select()
    .from(tierlists)
    .where(sql`${tierlists.userPlaylistId} IN (${userPlaylistIds})`)
    .execute()

  // Calcular los ratings agregados
  const aggregatedRatings:any = {}
  const uniqueUserIds = new Set()

  tierlistsResult.forEach((tierlist) => {
    uniqueUserIds.add(tierlist.userId)

    // Procesar los ratings de esta tierlist
    Object.entries(tierlist.ratings || {}).forEach(([artistId, tierId]) => {
      if (!aggregatedRatings[artistId]) {
        aggregatedRatings[artistId] = {
          S: 0,
          A: 0,
          B: 0,
          C: 0,
          D: 0,
          F: 0,
          totalScore: 0,
          userCount: 0,
          averageScore: 0,
          tier: null,
        }
      }

      // Incrementar el contador para este tier
      aggregatedRatings[artistId][tierId]++

      // Actualizar estadísticas
      aggregatedRatings[artistId].userCount++

      // Convertir tierId a valor numérico
      let score = 0
      switch (tierId) {
        case "S":
          score = 5
          break
        case "A":
          score = 4
          break
        case "B":
          score = 3
          break
        case "C":
          score = 2
          break
        case "D":
          score = 1
          break
        case "F":
          score = 0
          break
      }

      aggregatedRatings[artistId].totalScore += score
    })
  })

  // Calcular promedios y asignar tiers
  Object.values(aggregatedRatings).forEach((artistRating: any) => {
    if (artistRating.userCount > 0) {
      artistRating.averageScore = artistRating.totalScore / artistRating.userCount

      // Asignar tier basado en promedio
      if (artistRating.averageScore >= 4.5) artistRating.tier = "S"
      else if (artistRating.averageScore >= 3.5) artistRating.tier = "A"
      else if (artistRating.averageScore >= 2.5) artistRating.tier = "B"
      else if (artistRating.averageScore >= 1.5) artistRating.tier = "C"
      else if (artistRating.averageScore >= 0.5) artistRating.tier = "D"
      else artistRating.tier = "F"
    }
  })

  // Obtener o crear la tierlist grupal
  const groupTierlist = await getOrCreateGroupTierlist({
    playlistId,
    privateName,
  })

  // Actualizar la tierlist grupal
  const result = await db
    .update(groupTierlists)
    .set({
      aggregatedRatings,
      userCount: uniqueUserIds.size,
      updatedAt: new Date(),
    })
    .where(sql`${groupTierlists.id} = ${groupTierlist.id}`)
    .returning()

  return safeSerialize(result[0])
}

export async function getFullPlaylistData(playlistId: number) {
  const db = getDbConnection()
  const playlistData = await db.select().from(playlists).where(sql`${playlists.id} = ${playlistId}`)

  if (playlistData.length === 0) {
    return null
  }

  const playlist = playlistData[0]
  const artistsData = await getPlaylistArtists(playlistId)

  return {
    ...playlist,
    artists: artistsData,
  }
}

export async function getFullPlaylistDataBySpotifyId(spotifyId: string) {
  try {
    const db = getDbConnection()
    const playlistData = await db.select().from(playlists).where(sql`${playlists.spotifyId} = ${spotifyId}`)

    if (playlistData.length === 0) {
      return null
    }

    const playlist = playlistData[0]

    // Obtener artistas de la playlist
    const artistsData = await getPlaylistArtists(playlist.id)

    return {
      ...playlist,
      artists: artistsData,
    }
  } catch (error) {
    console.error("Error al obtener datos completos de playlist por Spotify ID:", error)
    throw error
  }
}

export async function getTierlists(userId: number) {
  const db = getDbConnection()
  const result = await db.select().from(tierlists).where(sql`${tierlists.userId} = ${userId}`)

  return safeSerialize(result)
}

export async function getPlaylistUserCount(playlistId: number): Promise<number> {
  try {
    const db = getDbConnection()
    const result = await db
      .select({ count: sql<number>`count(DISTINCT ${userPlaylists.userId})`.as("count") })
      .from(userPlaylists)
      .where(sql`${userPlaylists.playlistId} = ${playlistId}`)
      .execute()

    if (result && result.length > 0 && result[0].count !== null) {
      return result[0].count
    } else {
      return 0
    }
  } catch (error) {
    console.error("Error al obtener el conteo de usuarios de la playlist:", error)
    return 0
  }
}

// Reemplazar la función migrateDatabase con esta nueva versión
export async function migrateDatabase() {
  const db = getDbConnection()

  try {
    // Eliminar todas las tablas existentes si existen
    await db.execute(sql`
      DROP TABLE IF EXISTS tierlists CASCADE;
      DROP TABLE IF EXISTS group_tierlists CASCADE;
      DROP TABLE IF EXISTS user_playlists CASCADE;
      DROP TABLE IF EXISTS playlist_artists CASCADE;
      DROP TABLE IF EXISTS artists CASCADE;
      DROP TABLE IF EXISTS playlists CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `)

    // Crear tabla de usuarios
    await db.execute(sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        image TEXT,
        spotify_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Crear tabla de playlists
    await db.execute(sql`
      CREATE TABLE playlists (
        id SERIAL PRIMARY KEY,
        spotify_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        artist_ids JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Crear tabla de artistas
    await db.execute(sql`
      CREATE TABLE artists (
        id SERIAL PRIMARY KEY,
        spotify_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        image TEXT
      )
    `)

    // Crear tabla de relación usuario-playlist
    await db.execute(sql`
      CREATE TABLE user_playlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        playlist_id INTEGER NOT NULL,
        is_hidden BOOLEAN DEFAULT FALSE,
        is_private BOOLEAN DEFAULT FALSE,
        private_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
      )
    `)

    // Crear tabla de tierlists
    await db.execute(sql`
      CREATE TABLE tierlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_playlist_id INTEGER NOT NULL,
        ratings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE
      )
    `)

    // Crear tabla de tierlists grupales
    await db.execute(sql`
      CREATE TABLE group_tierlists (
        id SERIAL PRIMARY KEY,
        playlist_id INTEGER NOT NULL,
        private_name TEXT,
        aggregated_ratings JSONB DEFAULT '{}',
        user_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
      )
    `)

    // Crear índices para mejorar el rendimiento
    await db.execute(sql`
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_playlists_spotify_id ON playlists(spotify_id);
      CREATE INDEX idx_artists_spotify_id ON artists(spotify_id);
      CREATE INDEX idx_user_playlists_user_id ON user_playlists(user_id);
      CREATE INDEX idx_user_playlists_playlist_id ON user_playlists(playlist_id);
      CREATE INDEX idx_tierlists_user_id ON tierlists(user_id);
      CREATE INDEX idx_tierlists_user_playlist_id ON tierlists(user_playlist_id);
      CREATE INDEX idx_group_tierlists_playlist_id ON group_tierlists(playlist_id);
    `)

    return { success: true, message: "Base de datos creada correctamente desde cero" }
  } catch (error:any) {
    console.error("Error durante la creación de la base de datos:", error)
    return { success: false, error: error.message }
  }
}

export async function getPlaylistRankings(playlistId: number) {
  try {
    const db = getDbConnection()

    const result:any = await db
      .select({
        userId: tierlists.userId,
        artistId: sql<number>`CAST(key AS INTEGER)`,
        tierId: sql<string>`value`,
      })
      .from(tierlists)
      .innerJoin(userPlaylists, sql`${tierlists.userPlaylistId} = ${userPlaylists.id}`)
      .where(sql`${userPlaylists.playlistId} = ${playlistId}`)
      .execute()

    const rankings = []
    for (const row of result) {
      if (row && row.userId) {
        const tierlist = await getTierlist(row.userId, row.userPlaylistId)
        if (tierlist && tierlist.ratings) {
          for (const artistId in tierlist.ratings) {
            rankings.push({
              userId: row.userId,
              artistId: Number.parseInt(artistId),
              tierId: tierlist.ratings[artistId],
            })
          }
        }
      }
    }

    return safeSerialize(rankings)
  } catch (error) {
    console.error("Error al obtener rankings de la playlist:", error)
    throw error
  }
}