import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { DEMO_PLAYLIST_ID, DEMO_EMAIL } from "@/lib/constants";

let sqlClient: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (sqlClient) return sqlClient;
  const connectionString =
    process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "No se ha proporcionado una cadena de conexión a la base de datos. Verifica tus variables de entorno."
    );
  }
  sqlClient = neon(connectionString);
  return sqlClient;
}

export function safeSerialize<T>(obj: T): any {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => safeSerialize(item));
  }
  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (key !== "table" && key !== "schema" && key !== "_") {
        result[key] = safeSerialize(obj[key]);
      }
    }
    return result;
  }
  return obj;
}

export async function getUserByEmail(email: string) {
  try {
    const sql = getSql();
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    return safeSerialize(result[0] || null);
  } catch (error: any) {
    console.error("Error al obtener usuario por email:", error);
    throw error;
  }
}

export async function createUser(userData: {
  email: string;
  name?: string;
  image?: string;
  spotifyId?: string;
}) {
  try {
    const sql = getSql();
    const result = await sql`
      INSERT INTO users (email, name, image, spotify_id)
      VALUES (${userData.email}, ${userData.name || null}, ${userData.image || null}, ${userData.spotifyId || null})
      RETURNING *
    `;
    return safeSerialize(result[0]);
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    throw error;
  }
}

export async function getOrCreateUser(userData: {
  email: string;
  name?: string;
  image?: string;
  spotifyId?: string;
  isDemo?: boolean;
}) {
  try {
    let user = await getUserByEmail(userData.email);

    if (!user) {
      user = await createUser(userData);
    } else {
      if (
        (userData.name && userData.name !== user.name) ||
        (userData.image && userData.image !== user.image) ||
        (userData.spotifyId && userData.spotifyId !== user.spotifyId)
      ) {
        const sql = getSql();
        const result = await sql`
          UPDATE users SET
            name = ${userData.name || user.name},
            image = ${userData.image || user.image},
            spotify_id = ${userData.spotifyId || user.spotifyId}
          WHERE id = ${user.id}
          RETURNING *
        `;
        user = safeSerialize(result[0]);
      }
    }

    return user;
  } catch (error: any) {
    console.error("Error en getOrCreateUser:", error);
    throw error;
  }
}

export async function getPlaylistBySpotifyId(spotifyId: string) {
  const sql = getSql();
  const result = await sql`SELECT * FROM playlists WHERE spotify_id = ${spotifyId}`;
  return safeSerialize(result[0] || null);
}

export async function createPlaylist(playlistData: {
  spotifyId: string;
  name: string;
  description?: string;
  image?: string;
  artistIds?: string[];
}) {
  const sql = getSql();
  const result = await sql`
    INSERT INTO playlists (spotify_id, name, description, image, artist_ids)
    VALUES (${playlistData.spotifyId}, ${playlistData.name}, ${playlistData.description || null}, ${playlistData.image || null}, ${JSON.stringify(playlistData.artistIds || [])})
    RETURNING *
  `;
  return safeSerialize(result[0]);
}

export async function updatePlaylistArtists(
  playlistId: number,
  artistIds: string[]
) {
  const sql = getSql();
  const result = await sql`
    UPDATE playlists SET artist_ids = ${JSON.stringify(artistIds)}, updated_at = NOW()
    WHERE id = ${playlistId}
    RETURNING *
  `;
  return safeSerialize(result[0]);
}

export async function getOrCreatePlaylist(playlistData: {
  spotifyId: string;
  name: string;
  description?: string;
  image?: string;
  artistIds?: string[];
}) {
  let playlist = await getPlaylistBySpotifyId(playlistData.spotifyId);

  if (!playlist) {
    playlist = await createPlaylist(playlistData);
  } else if (playlistData.artistIds && playlistData.artistIds.length > 0) {
    const currentArtistIds: string[] = playlist.artist_ids || [];
    const newArtistIds = playlistData.artistIds.filter(
      (id) => !currentArtistIds.includes(id)
    );

    if (newArtistIds.length > 0) {
      const updatedArtistIds = [...currentArtistIds, ...newArtistIds];
      playlist = await updatePlaylistArtists(playlist.id, updatedArtistIds);
    }
  }

  return playlist;
}

export async function getUserPlaylist(
  userId: number,
  playlistId: number,
  privateName?: string
) {
  const sql = getSql();

  try {
    let result;
    if (privateName) {
      result = await sql`
        SELECT * FROM user_playlists
        WHERE playlist_id = ${playlistId} AND private_name = ${privateName}
      `;
    } else {
      result = await sql`
        SELECT * FROM user_playlists
        WHERE playlist_id = ${playlistId} AND (private_name IS NULL OR private_name = '')
      `;
    }

    if (!result || result.length === 0) {
      return null;
    }

    const userPlaylist = result[0];
    let usersIds: any[] = userPlaylist.users_ids || [];

    if (!Array.isArray(usersIds)) {
      usersIds = [];
    }

    if (!usersIds.includes(userId)) {
      usersIds.push(userId);
      await sql`
        UPDATE user_playlists SET users_ids = ${JSON.stringify(usersIds)}
        WHERE id = ${userPlaylist.id}
      `;
    }

    return safeSerialize(userPlaylist);
  } catch (error: any) {
    console.error("Error en getUserPlaylist:", error);
    return null;
  }
}

export async function createUserPlaylist(userPlaylistData: {
  playlistId: number;
  isPrivate?: boolean;
  privateName?: string;
  userId: number;
}) {
  const sql = getSql();
  const result = await sql`
    INSERT INTO user_playlists (playlist_id, is_private, private_name, users_ids)
    VALUES (${userPlaylistData.playlistId}, ${userPlaylistData.isPrivate || false}, ${userPlaylistData.privateName || null}, ${JSON.stringify([userPlaylistData.userId])})
    RETURNING *
  `;
  return safeSerialize(result[0]);
}

export async function addUserToUserPlaylist(
  userPlaylistId: number,
  userId: number
) {
  const sql = getSql();

  const userPlaylistResult = await sql`
    SELECT * FROM user_playlists WHERE id = ${userPlaylistId}
  `;

  if (!userPlaylistResult || userPlaylistResult.length === 0) {
    throw new Error(`UserPlaylist con ID ${userPlaylistId} no encontrada`);
  }

  const userPlaylist = userPlaylistResult[0];
  let usersIds: any[] = userPlaylist.users_ids || [];

  if (!Array.isArray(usersIds)) {
    usersIds = [];
  }

  if (!usersIds.includes(userId)) {
    usersIds.push(userId);
    const result = await sql`
      UPDATE user_playlists SET users_ids = ${JSON.stringify(usersIds)}
      WHERE id = ${userPlaylistId}
      RETURNING *
    `;
    return safeSerialize(result[0]);
  }

  return safeSerialize(userPlaylist);
}

export async function getOrCreateUserPlaylist(userPlaylistData: {
  playlistId: number;
  isPrivate?: boolean;
  privateName?: string;
  userId: number;
}) {
  const sql = getSql();

  let userPlaylistResult;
  if (userPlaylistData.privateName) {
    userPlaylistResult = await sql`
      SELECT * FROM user_playlists
      WHERE playlist_id = ${userPlaylistData.playlistId} AND private_name = ${userPlaylistData.privateName}
    `;
  } else {
    userPlaylistResult = await sql`
      SELECT * FROM user_playlists
      WHERE playlist_id = ${userPlaylistData.playlistId} AND private_name IS NULL
    `;
  }

  if (userPlaylistResult && userPlaylistResult.length > 0) {
    const userPlaylist = userPlaylistResult[0];
    let usersIds: any[] = userPlaylist.users_ids || [];

    if (!Array.isArray(usersIds)) {
      usersIds = [];
    }

    if (!usersIds.includes(userPlaylistData.userId)) {
      usersIds.push(userPlaylistData.userId);
      const result = await sql`
        UPDATE user_playlists SET users_ids = ${JSON.stringify(usersIds)}
        WHERE id = ${userPlaylist.id}
        RETURNING *
      `;
      return safeSerialize(result[0]);
    }

    return safeSerialize(userPlaylist);
  }

  const result = await sql`
    INSERT INTO user_playlists (playlist_id, is_private, private_name, users_ids)
    VALUES (${userPlaylistData.playlistId}, ${userPlaylistData.isPrivate || false}, ${userPlaylistData.privateName || null}, ${JSON.stringify([userPlaylistData.userId])})
    RETURNING *
  `;

  return safeSerialize(result[0]);
}

export async function hideUserTierlist(userId: number, userPlaylistId: number) {
  const sql = getSql();
  const result = await sql`
    UPDATE tierlists SET is_hidden = true
    WHERE user_id = ${userId} AND user_playlist_id = ${userPlaylistId}
    RETURNING *
  `;
  return safeSerialize(result[0] || null);
}

export async function getUserPlaylists(userId: number, includeHidden = false) {
  const sql = getSql();

  try {
    const userPlaylistsResult = await sql`
      SELECT * FROM user_playlists WHERE users_ids::jsonb @> ${JSON.stringify([userId])}::jsonb
    `;

    if (userPlaylistsResult.length === 0) {
      return [];
    }

    const result: any[] = [];

    for (const userPlaylist of userPlaylistsResult) {
      const tierlist = await sql`
        SELECT id, is_hidden, ratings FROM tierlists
        WHERE user_id = ${userId} AND user_playlist_id = ${userPlaylist.id}
      `;

      let tierlistData = null;
      if (tierlist.length === 0) {
        tierlistData = await getOrCreateTierlist({
          userId,
          userPlaylistId: userPlaylist.id,
        });
      } else {
        tierlistData = tierlist[0];
        if (!includeHidden && tierlistData.is_hidden) {
          continue;
        }
      }

      const playlistData = await sql`
        SELECT * FROM playlists WHERE id = ${userPlaylist.playlist_id}
      `;

      if (playlistData.length > 0) {
        result.push({
          id: playlistData[0].id,
          spotifyId: playlistData[0].spotify_id,
          name: playlistData[0].name,
          description: playlistData[0].description,
          image: playlistData[0].image,
          artistIds: playlistData[0].artist_ids,
          isPrivate: userPlaylist.is_private,
          privateName: userPlaylist.private_name,
          userPlaylistId: userPlaylist.id,
          tierlistId: tierlistData?.id || null,
          isHidden: tierlistData?.is_hidden || false,
          ratings: tierlistData?.ratings || {},
          createdAt: playlistData[0].created_at,
        });
      }
    }

    return safeSerialize(result);
  } catch (error: any) {
    console.error("Error en getUserPlaylists:", error);
    return [];
  }
}

export async function getPlaylistArtists(playlistId: number) {
  const sql = getSql();

  const playlistResult = await sql`
    SELECT artist_ids FROM playlists WHERE id = ${playlistId}
  `;

  if (
    !playlistResult.length ||
    !playlistResult[0].artist_ids ||
    !playlistResult[0].artist_ids.length
  ) {
    return [];
  }

  const artistIds = playlistResult[0].artist_ids;
  const artistResults: any[] = [];

  const artistIdsArray = Array.isArray(artistIds) ? artistIds : [artistIds];

  for (const spotifyId of artistIdsArray) {
    const artistResult = await sql`
      SELECT * FROM artists WHERE spotify_id = ${String(spotifyId)}
    `;

    if (artistResult.length > 0) {
      artistResults.push(artistResult[0]);
    }
  }

  return safeSerialize(artistResults);
}

export async function getArtistBySpotifyId(spotifyId: string) {
  try {
    const sql = getSql();
    const result = await sql`SELECT * FROM artists WHERE spotify_id = ${spotifyId}`;
    return safeSerialize(result[0] || null);
  } catch (error: any) {
    console.error("Error al obtener artista por spotifyId:", error);
    throw error;
  }
}

export async function createArtist(artistData: {
  spotifyId: string;
  name: string;
  image?: string;
}) {
  const sql = getSql();
  const result = await sql`
    INSERT INTO artists (spotify_id, name, image)
    VALUES (${artistData.spotifyId}, ${artistData.name}, ${artistData.image || null})
    RETURNING *
  `;
  return safeSerialize(result[0]);
}

export async function getOrCreateArtist(artistData: {
  spotifyId: string;
  name: string;
  image?: string;
}) {
  let artist = await getArtistBySpotifyId(artistData.spotifyId);

  if (!artist) {
    artist = await createArtist(artistData);
  } else {
    if (artistData.image && artistData.image !== artist.image) {
      const sql = getSql();
      const result = await sql`
        UPDATE artists SET image = ${artistData.image}
        WHERE id = ${artist.id}
        RETURNING *
      `;
      artist = safeSerialize(result[0]);
    }
  }

  return artist;
}

export async function getTierlist(userId: number, userPlaylistId: number) {
  const sql = getSql();
  const result = await sql`
    SELECT * FROM tierlists
    WHERE user_id = ${userId} AND user_playlist_id = ${userPlaylistId}
  `;
  return safeSerialize(result[0] || null);
}

export async function createTierlist(tierlistData: {
  userId: number;
  userPlaylistId: number;
  ratings?: Record<string, string>;
  isHidden?: boolean;
}) {
  const sql = getSql();
  const result = await sql`
    INSERT INTO tierlists (user_id, user_playlist_id, ratings, is_hidden)
    VALUES (${tierlistData.userId}, ${tierlistData.userPlaylistId}, ${JSON.stringify(tierlistData.ratings || {})}, ${tierlistData.isHidden || false})
    RETURNING *
  `;
  return safeSerialize(result[0]);
}

export async function getOrCreateTierlist(tierlistData: {
  userId: number;
  userPlaylistId: number;
  ratings?: Record<string, string>;
  isHidden?: boolean;
}) {
  let tierlist = await getTierlist(
    tierlistData.userId,
    tierlistData.userPlaylistId
  );

  if (!tierlist) {
    tierlist = await createTierlist(tierlistData);
  }

  return tierlist;
}

export async function updateTierlistRating(
  userId: number,
  userPlaylistId: number,
  artistId: number | string,
  tierId: string | null
) {
  const sql = getSql();

  const result = await sql.transaction([
    sql`
      INSERT INTO tierlists (user_id, user_playlist_id, ratings, is_hidden)
      SELECT ${userId}, ${userPlaylistId}, '{}'::jsonb, false
      WHERE NOT EXISTS (
        SELECT 1 FROM tierlists WHERE user_id = ${userId} AND user_playlist_id = ${userPlaylistId}
      )
      RETURNING *
    `,
  ]);

  const current = await sql`
    SELECT * FROM tierlists WHERE user_id = ${userId} AND user_playlist_id = ${userPlaylistId}
  `;
  const currentTierlist = current[0];
  let ratings: Record<string, any> = currentTierlist.ratings || {};

  if (typeof ratings === "string") {
    try {
      ratings = JSON.parse(ratings);
    } catch (e) {
      ratings = {};
    }
  }

  const artistKey = String(artistId);

  if (tierId === null) {
    delete ratings[artistKey];
  } else {
    ratings[artistKey] = tierId;
  }

  const [updated] = await sql`
    UPDATE tierlists SET ratings = ${JSON.stringify(ratings)}, updated_at = NOW()
    WHERE id = ${currentTierlist.id}
    RETURNING *
  `;

  await updateGroupTierlist(userPlaylistId);

  return safeSerialize(updated);
}

export async function getGroupTierlist(userPlaylistId: number) {
  const sql = getSql();
  const result = await sql`
    SELECT * FROM group_tierlists WHERE user_playlist_id = ${userPlaylistId}
  `;
  return safeSerialize(result[0] || null);
}

export async function createGroupTierlist(userPlaylistId: number) {
  const sql = getSql();
  const result = await sql`
    INSERT INTO group_tierlists (user_playlist_id, aggregated_ratings, user_count)
    VALUES (${userPlaylistId}, '{}'::jsonb, 0)
    RETURNING *
  `;
  return safeSerialize(result[0]);
}

export async function getOrCreateGroupTierlist(userPlaylistId: number) {
  let groupTierlist = await getGroupTierlist(userPlaylistId);

  if (!groupTierlist) {
    groupTierlist = await createGroupTierlist(userPlaylistId);
  }

  return groupTierlist;
}

export async function updateGroupTierlist(userPlaylistId: number) {
  const sql = getSql();

  const tierlistsResult = await sql`
    SELECT * FROM tierlists
    WHERE user_playlist_id = ${userPlaylistId} AND is_hidden = false
  `;

  if (tierlistsResult.length === 0) {
    return null;
  }

  const aggregatedRatings: Record<string, any> = {};
  const uniqueUserIds = new Set();

  tierlistsResult.forEach((tierlist: any) => {
    uniqueUserIds.add(tierlist.user_id);

    let ratings = tierlist.ratings || {};

    if (typeof ratings === "string") {
      try {
        ratings = JSON.parse(ratings);
      } catch (e) {
        ratings = {};
      }
    }

    Object.entries(ratings).forEach(([artistId, tierId]: [string, any]) => {
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
        };
      }

      aggregatedRatings[artistId][tierId]++;
      aggregatedRatings[artistId].userCount++;

      let score = 0;
      switch (tierId) {
        case "S": score = 5; break;
        case "A": score = 4; break;
        case "B": score = 3; break;
        case "C": score = 2; break;
        case "D": score = 1; break;
        case "F": score = 0; break;
      }

      aggregatedRatings[artistId].totalScore += score;
    });
  });

  Object.values(aggregatedRatings).forEach((artistRating: any) => {
    if (artistRating.userCount > 0) {
      artistRating.averageScore =
        artistRating.totalScore / artistRating.userCount;

      if (artistRating.averageScore >= 4.5) artistRating.tier = "S";
      else if (artistRating.averageScore >= 3.5) artistRating.tier = "A";
      else if (artistRating.averageScore >= 2.5) artistRating.tier = "B";
      else if (artistRating.averageScore >= 1.5) artistRating.tier = "C";
      else if (artistRating.averageScore >= 0.5) artistRating.tier = "D";
      else artistRating.tier = "F";
    }
  });

  const groupTierlist = await getOrCreateGroupTierlist(userPlaylistId);

  const result = await sql`
    UPDATE group_tierlists SET
      aggregated_ratings = ${JSON.stringify(aggregatedRatings)}::jsonb,
      user_count = ${uniqueUserIds.size},
      updated_at = NOW()
    WHERE id = ${groupTierlist.id}
    RETURNING *
  `;

  return safeSerialize(result[0]);
}

export async function getFullPlaylistData(playlistId: number) {
  const sql = getSql();
  const playlistData = await sql`SELECT * FROM playlists WHERE id = ${playlistId}`;

  if (playlistData.length === 0) {
    return null;
  }

  const playlist = playlistData[0];
  const artistIds: string[] = playlist.artist_ids || [];
  let artistsData: any[] = [];

  if (artistIds && artistIds.length > 0) {
    const artistIdsArray = Array.isArray(artistIds) ? artistIds : [artistIds];

    artistsData = await Promise.all(
      artistIdsArray.map(async (spotifyId: string) => {
        const artistResult = await sql`
          SELECT * FROM artists WHERE spotify_id = ${spotifyId.toString()}
        `;
        return artistResult.length > 0 ? artistResult[0] : null;
      })
    );

    artistsData = artistsData.filter((artist) => artist !== null);
  }

  return {
    ...playlist,
    artists: artistsData,
  };
}

export async function getFullPlaylistDataBySpotifyId(spotifyId: string) {
  try {
    const sql = getSql();
    const playlistData = await sql`SELECT * FROM playlists WHERE spotify_id = ${spotifyId}`;

    if (playlistData.length === 0) {
      return null;
    }

    const playlist = playlistData[0];
    const artistsData = await getPlaylistArtists(playlist.id);

    return {
      ...playlist,
      artists: artistsData,
    };
  } catch (error: any) {
    console.error(
      "Error al obtener datos completos de playlist por Spotify ID:",
      error
    );
    throw error;
  }
}

export async function getTierlists(userId: number) {
  const sql = getSql();
  const result = await sql`SELECT * FROM tierlists WHERE user_id = ${userId}`;
  return safeSerialize(result);
}

export async function getPlaylistUserCount(
  playlistId: number
): Promise<number> {
  try {
    const sql = getSql();

    const userPlaylistsResult = await sql`
      SELECT * FROM user_playlists WHERE playlist_id = ${playlistId}
    `;

    if (userPlaylistsResult.length === 0) {
      return 0;
    }

    const allUserIds = new Set();
    userPlaylistsResult.forEach((userPlaylist: any) => {
      const usersIds: any[] = userPlaylist.users_ids || [];
      usersIds.forEach((userId: any) => allUserIds.add(userId));
    });

    return allUserIds.size;
  } catch (error: any) {
    console.error(
      "Error al obtener el conteo de usuarios de la playlist:",
      error
    );
    return 0;
  }
}

export async function migrateDatabase() {
  const sql = getSql();

  try {
    await sql`
      DROP TABLE IF EXISTS tierlists CASCADE;
      DROP TABLE IF EXISTS group_tierlists CASCADE;
      DROP TABLE IF EXISTS user_playlists CASCADE;
      DROP TABLE IF EXISTS playlist_artists CASCADE;
      DROP TABLE IF EXISTS artists CASCADE;
      DROP TABLE IF EXISTS playlists CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `;

    await sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        image TEXT,
        spotify_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
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
    `;

    await sql`
      CREATE TABLE artists (
        id SERIAL PRIMARY KEY,
        spotify_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        image TEXT
      )
    `;

    await sql`
      CREATE TABLE user_playlists (
        id SERIAL PRIMARY KEY,
        playlist_id INTEGER NOT NULL,
        is_private BOOLEAN DEFAULT FALSE,
        private_name TEXT,
        users_ids JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
      )
    `;

    await sql`
      CREATE TABLE tierlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_playlist_id INTEGER NOT NULL,
        ratings JSONB DEFAULT '{}',
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE
      )
    `;

    await sql`
      CREATE TABLE group_tierlists (
        id SERIAL PRIMARY KEY,
        user_playlist_id INTEGER NOT NULL,
        aggregated_ratings JSONB DEFAULT '{}',
        user_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE
      )
    `;

    await sql`
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_playlists_spotify_id ON playlists(spotify_id);
      CREATE INDEX idx_artists_spotify_id ON artists(spotify_id);
      CREATE INDEX idx_user_playlists_playlist_id ON user_playlists(playlist_id);
      CREATE INDEX idx_tierlists_user_id ON tierlists(user_id);
      CREATE INDEX idx_tierlists_user_playlist_id ON tierlists(user_playlist_id);
      CREATE INDEX idx_group_tierlists_user_playlist_id ON group_tierlists(user_playlist_id);
    `;

    return {
      success: true,
      message: "Base de datos creada correctamente desde cero",
    };
  } catch (error: any) {
    console.error("Error durante la creación de la base de datos:", error);
    return { success: false, error: error.message };
  }
}

export async function getPlaylistRankings(userPlaylistId: number) {
  try {
    const sql = getSql();

    const tierlistsResult = await sql`
      SELECT * FROM tierlists
      WHERE user_playlist_id = ${userPlaylistId} AND is_hidden = false
    `;

    const rankings: any[] = [];

    await Promise.all(
      tierlistsResult.map(async (tierlist: any) => {
        if (tierlist && tierlist.ratings) {
          const ratingsObj =
            typeof tierlist.ratings === "string"
              ? JSON.parse(tierlist.ratings)
              : tierlist.ratings;

          const userInfoResult = await sql`
            SELECT name AS user_name, image AS user_image, email AS user_email
            FROM users WHERE id = ${tierlist.user_id}
          `;

          const userInfo: any =
            userInfoResult.length > 0 ? userInfoResult[0] : {};

          const isDemo = userInfo?.user_email === "demo@tiermyspot.com";

          Object.entries(ratingsObj).forEach(([artistId, tierId]) => {
            if (typeof tierId === "string") {
              rankings.push({
                userId: tierlist.user_id,
                userName: userInfo?.user_name ?? null,
                userImage: userInfo?.user_image ?? null,
                artistId: Number.parseInt(artistId),
                tierId: tierId,
                isDemo: isDemo,
              });
            }
          });
        }
      })
    );

    return rankings;
  } catch (error: any) {
    console.error("Error al obtener rankings de la playlist:", error);
    throw error;
  }
}

export async function hideUserTierlists(userId: number, playlistId: number) {
  try {
    const sql = getSql();

    const userPlaylistsResult = await sql`
      SELECT * FROM user_playlists
      WHERE playlist_id = ${playlistId} AND users_ids::jsonb @> ${JSON.stringify([userId])}::jsonb
    `;

    if (!userPlaylistsResult || userPlaylistsResult.length === 0) {
      console.warn(
        `No user playlist found for user ${userId} and playlist ${playlistId}`
      );
      return null;
    }

    for (const userPlaylist of userPlaylistsResult) {
      const tierlistResult = await sql`
        SELECT * FROM tierlists
        WHERE user_id = ${userId} AND user_playlist_id = ${userPlaylist.id}
      `;

      if (tierlistResult && tierlistResult.length > 0) {
        await sql`
          UPDATE tierlists SET is_hidden = true WHERE id = ${tierlistResult[0].id}
        `;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error al ocultar la playlist:", error);
    throw error;
  }
}

export async function unhideUserTierlists(userId: number, playlistId: number) {
  try {
    const sql = getSql();

    const userPlaylistsResult = await sql`
      SELECT * FROM user_playlists
      WHERE playlist_id = ${playlistId} AND users_ids::jsonb @> ${JSON.stringify([userId])}::jsonb
    `;

    if (!userPlaylistsResult || userPlaylistsResult.length === 0) {
      console.warn(
        `No user playlist found for user ${userId} and playlist ${playlistId}`
      );
      return null;
    }

    for (const userPlaylist of userPlaylistsResult) {
      const tierlistResult = await sql`
        SELECT * FROM tierlists
        WHERE user_id = ${userId} AND user_playlist_id = ${userPlaylist.id}
      `;

      if (tierlistResult && tierlistResult.length > 0) {
        await sql`
          UPDATE tierlists SET is_hidden = false WHERE id = ${tierlistResult[0].id}
        `;
      } else {
        await createTierlist({
          userId,
          userPlaylistId: userPlaylist.id,
          isHidden: false,
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error al mostrar la playlist:", error);
    throw error;
  }
}

export async function debugUserPlaylists(userId: number) {
  try {
    const sql = getSql();

    const allUserPlaylists = await sql`SELECT * FROM user_playlists`;

    const matchingPlaylists = allUserPlaylists.filter((up: any) => {
      const usersIds = Array.isArray(up.users_ids) ? up.users_ids : [];
      return usersIds.includes(userId);
    });

    return {
      total: allUserPlaylists.length,
      matching: matchingPlaylists.length,
      details: matchingPlaylists,
    };
  } catch (error: any) {
    console.error("Error en debugUserPlaylists:", error);
    return { error: error.message };
  }
}

export async function fixUserPlaylistsArrays() {
  try {
    const sql = getSql();

    const allUserPlaylists = await sql`SELECT * FROM user_playlists`;

    let fixedCount = 0;

    for (const up of allUserPlaylists) {
      let needsFix = false;
      let usersIds = up.users_ids;

      if (usersIds === null || usersIds === undefined) {
        usersIds = [];
        needsFix = true;
      }

      if (!Array.isArray(usersIds)) {
        try {
          if (typeof usersIds === "string") {
            usersIds = JSON.parse(usersIds);
          } else {
            usersIds = [];
          }
          needsFix = true;
        } catch (e) {
          console.error(`Error parsing users_ids for userPlaylist ${up.id}:`, e);
          usersIds = [];
          needsFix = true;
        }
      }

      if (needsFix) {
        await sql`
          UPDATE user_playlists SET users_ids = ${JSON.stringify(usersIds)}
          WHERE id = ${up.id}
        `;
        fixedCount++;
      }
    }

    return {
      total: allUserPlaylists.length,
      fixed: fixedCount,
      success: true,
    };
  } catch (error: any) {
    console.error("Error en fixUserPlaylistsArrays:", error);
    return { error: error.message, success: false };
  }
}

export async function seedDemoPlaylist() {
  const sql = getSql();

  try {
    const userRows = await sql`SELECT * FROM users WHERE email = ${DEMO_EMAIL}`;

    if (userRows.length === 0) {
      return { success: false, error: "Demo user not found" };
    }

    const demoUser = userRows[0];

    const existingPlaylists = await sql`
      SELECT * FROM user_playlists WHERE users_ids::jsonb @> ${JSON.stringify([demoUser.id])}::jsonb
    `;

    if (existingPlaylists.length > 0) {
      return { success: true, message: "Demo user already has playlists" };
    }

    let existingPlaylist = null;
    try {
      const playlistResult = await sql`
        SELECT * FROM playlists WHERE spotify_id = ${DEMO_PLAYLIST_ID}
      `;
      existingPlaylist = playlistResult[0] || null;
    } catch (e) {
      // ignore
    }

    if (!existingPlaylist) {
      const tokenResponse = await fetch(
        "https://accounts.spotify.com/api/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64")}`,
          },
          body: new URLSearchParams({ grant_type: "client_credentials" }),
        }
      );

      if (!tokenResponse.ok) {
        return { success: false, error: "Failed to get Spotify token" };
      }

      const tokenData = await tokenResponse.json();

      const playlistResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${DEMO_PLAYLIST_ID}?market=ES`,
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );

      if (!playlistResponse.ok) {
        return { success: false, error: "Failed to fetch playlist from Spotify" };
      }

      const spotifyData = await playlistResponse.json();

      const artistSpotifyIds = spotifyData.tracks.items.map(
        (item: any) => item.track.artists[0].id
      );
      const uniqueArtistIds = [...new Set(artistSpotifyIds)] as string[];

      const [playlist] = await sql`
        INSERT INTO playlists (spotify_id, name, description, image, artist_ids)
        VALUES (${spotifyData.id}, ${spotifyData.name}, ${spotifyData.description || ""}, ${spotifyData.images?.[0]?.url || ""}, ${JSON.stringify(uniqueArtistIds)})
        RETURNING *
      `;

      for (const spotifyId of uniqueArtistIds) {
        const existing = await sql`
          SELECT * FROM artists WHERE spotify_id = ${spotifyId}
        `;

        if (existing.length === 0) {
          const track = spotifyData.tracks.items.find(
            (item: any) => item.track.artists[0].id === spotifyId
          );
          if (track) {
            const artist = track.track.artists[0];
            await sql`
              INSERT INTO artists (spotify_id, name, image)
              VALUES (${artist.id}, ${artist.name}, ${artist.images?.[0]?.url || ""})
            `;
          }
        }
      }

      existingPlaylist = playlist;
    }

    const [userPlaylist] = await sql`
      INSERT INTO user_playlists (playlist_id, is_private, users_ids)
      VALUES (${existingPlaylist.id}, false, ${JSON.stringify([demoUser.id])})
      RETURNING *
    `;

    await sql`
      INSERT INTO tierlists (user_id, user_playlist_id, ratings, is_hidden)
      VALUES (${demoUser.id}, ${userPlaylist.id}, '{}'::jsonb, false)
    `;

    return { success: true, message: "Demo playlist seeded successfully" };
  } catch (error: any) {
    console.error("Error seeding demo playlist:", error);
    return { success: false, error: error.message };
  }
}
