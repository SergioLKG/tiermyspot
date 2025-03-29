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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  spotifyId: text("spotify_id").notNull().unique(),
  name: text("name").notNull(),
  previewUrl: text("preview_url"),
  albumName: text("album_name"),
  albumImage: text("album_image"),
  artistId: integer("artist_id").notNull(),
})

export const tierlists = pgTable("tierlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  playlistId: integer("playlist_id").notNull(),
  isPrivate: boolean("is_private").default(false),
  privateName: text("private_name"),
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
}) {
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
    .where(sql`${userPlaylists.userId} = ${userId} AND ${userPlaylists.playlistId} = ${playlistId}`)

  if (existing.length === 0) {
    const result = await db.insert(userPlaylists).values({ userId, playlistId }).returning()
    return safeSerialize(result[0])
  }

  // Si estaba oculta, la hacemos visible de nuevo
  if (existing[0].isHidden) {
    const result = await db
      .update(userPlaylists)
      .set({ isHidden: false })
      .where(sql`${userPlaylists.id} = ${existing[0].id}`)
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
    .where(sql`${userPlaylists.userId} = ${userId} AND ${userPlaylists.playlistId} = ${playlistId}`)
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
      isHidden: userPlaylists.isHidden,
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

// Reemplazar la función getPlaylistArtists existente con esta versión corregida
export async function getPlaylistArtists(playlistId: number) {
  const db = getDbConnection()

  // Primero, necesitamos obtener los IDs de los artistas asociados a esta playlist
  // Esto requiere una consulta más compleja que antes

  // Obtener la playlist para verificar su ID de Spotify
  const playlistData = await db.select().from(playlists).where(sql`${playlists.id} = ${playlistId}`)

  if (playlistData.length === 0) {
    return []
  }

  const spotifyId = playlistData[0].spotifyId

  // Ahora, necesitamos encontrar los artistas que están asociados a esta playlist
  // Esto implica buscar en la tabla de tracks

  // Primero, obtenemos todos los artistas que tienen tracks
  const artistsWithTracks = await db
    .select({
      id: artists.id,
      spotifyId: artists.spotifyId,
      name: artists.name,
      image: artists.image,
    })
    .from(artists)
    .where(sql`EXISTS (SELECT 1 FROM tracks WHERE tracks.artist_id = ${artists.id})`)

  // Ahora, para cada artista, verificamos si tiene tracks asociados a esta playlist
  // Esto es una simplificación, ya que no tenemos una relación directa entre playlists y tracks
  // En una implementación real, necesitaríamos una tabla de relación

  // Por ahora, asumiremos que todos los artistas con tracks están asociados a todas las playlists
  // Esto es una solución temporal hasta que implementemos una relación adecuada

  return safeSerialize(artistsWithTracks)
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

export async function getTrackBySpotifyId(spotifyId: string) {
  const db = getDbConnection()
  const result = await db.select().from(tracks).where(sql`${tracks.spotifyId} = ${spotifyId}`)
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
  let track = await getTrackBySpotifyId(trackData.spotifyId)

  if (!track) {
    track = await createTrack(trackData)
  }

  return track
}

export async function getArtistTracks(artistId: number) {
  const db = getDbConnection()
  const result = await db.select().from(tracks).where(sql`${tracks.artistId} = ${artistId}`)
  return safeSerialize(result)
}

// Nuevas funciones para el sistema de tierlists

export async function getTierlist(userId: number, playlistId: number, privateName?: string) {
  const db = getDbConnection()
  let query = db
    .select()
    .from(tierlists)
    .where(sql`${tierlists.userId} = ${userId} AND ${tierlists.playlistId} = ${playlistId}`)

  if (privateName) {
    query = query.where(sql`${tierlists.privateName} = ${privateName}`)
  } else {
    query = query.where(sql`${tierlists.privateName} IS NULL`)
  }

  const result = await query
  return safeSerialize(result[0])
}

export async function createTierlist(tierlistData: {
  userId: number
  playlistId: number
  isPrivate?: boolean
  privateName?: string
}) {
  const db = getDbConnection()
  const result = await db.insert(tierlists).values(tierlistData).returning()
  return safeSerialize(result[0])
}

export async function getOrCreateTierlist(tierlistData: {
  userId: number
  playlistId: number
  isPrivate?: boolean
  privateName?: string
}) {
  let tierlist = await getTierlist(tierlistData.userId, tierlistData.playlistId, tierlistData.privateName)

  if (!tierlist) {
    tierlist = await createTierlist(tierlistData)
  }

  return tierlist
}

export async function updateTierlistRating(
  userId: number,
  playlistId: number,
  artistId: number,
  tierId: string | null,
  privateName?: string,
) {
  const db = getDbConnection()

  // Obtener o crear la tierlist
  const tierlist = await getOrCreateTierlist({
    userId,
    playlistId,
    isPrivate: !!privateName,
    privateName,
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

  // Actualizar la tierlist grupal
  await updateGroupTierlist(playlistId, privateName)

  return safeSerialize(result[0])
}

export async function getGroupTierlist(playlistId: number, privateName?: string) {
  const db = getDbConnection()
  let query = db.select().from(groupTierlists).where(sql`${groupTierlists.playlistId} = ${playlistId}`)

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

  // Obtener todas las tierlists para esta playlist
  let query = db.select().from(tierlists).where(sql`${tierlists.playlistId} = ${playlistId}`)

  if (privateName) {
    query = query.where(sql`${tierlists.privateName} = ${privateName}`)
  } else {
    query = query.where(sql`${tierlists.privateName} IS NULL`)
  }

  const userTierlists = await query

  // Calcular los ratings agregados
  const aggregatedRatings = {}
  const uniqueUserIds = new Set()

  userTierlists.forEach((tierlist) => {
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

export async function getUserTierlistsForPlaylist(userId: number, playlistId: number) {
  const db = getDbConnection()
  const result = await db
    .select()
    .from(tierlists)
    .where(sql`${tierlists.userId} = ${userId} AND ${tierlists.playlistId} = ${playlistId}`)

  return safeSerialize(result)
}

export async function getFullPlaylistData(playlistId: number) {
  const db = getDbConnection()
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

    const artistsWithTracks = []

    // Obtener pistas para cada artista
    for (const artist of artistsData) {
      const tracksData = await getArtistTracks(artist.id)

      artistsWithTracks.push({
        ...artist,
        tracks: safeSerialize(tracksData),
      })
    }

    return {
      ...playlist,
      artists: artistsWithTracks,
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