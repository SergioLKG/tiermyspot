import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Tipos para tipado seguro
interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SpotifyErrorResponse {
  error: {
    status: number;
    message: string;
  };
}

export function extractPlaylistId(url: string): string | null {
  const patterns = [
    /spotify:playlist:([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Caché en memoria para reducir llamadas a la API de Spotify
const playlistCache = new Map();
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

// Función de espera para manejar retries
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Clase para manejar errores de Spotify de manera más estructurada
class SpotifyAPIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SpotifyAPIError";
    this.status = status;
  }
}

// Función para refrescar el token de Spotify
export async function refreshSpotifyToken(
  refreshToken: string
): Promise<SpotifyTokens> {
  try {
    const response = await spotifyFetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error getting access token:", errorData);
      throw new Error(
        `Failed to obtain access token: ${
          errorData.error_description || errorData.error || "Unknown error"
        }`
      );
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  } catch (error) {
    console.error("Error in getAccessToken:", error);
    throw error;
  }
}

async function getPlaylistData(
  playlistId: string,
  accessToken: string,
  market: string = "ES"
) {
  // Verificar si tenemos datos en caché y si son recientes
  const cacheKey = `playlist_${playlistId}`;
  const cachedData = playlistCache.get(cacheKey);

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
    console.log("Usando datos de playlist en caché");
    return cachedData.data;
  }

  console.log("Obteniendo datos de playlist desde Spotify API");
  const response = await spotifyFetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?market=${market}&fields=id,name,description,images`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error fetching playlist data:", errorData);
    throw new Error(
      `Failed to fetch playlist data: ${
        errorData.error?.message || "Unknown error"
      }`
    );
  }

  const data = await response.json();

  // Guardar en caché
  playlistCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });

  return data;
}

// Función de fetch personalizada con manejo de errores y rate limiting
async function spotifyFetch(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  delay = 1000
): Promise<Response> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);

      // Manejar códigos de error específicos
      if (response.status === 401) {
        // Token expirado, intentar refrescar
        throw new SpotifyAPIError("Unauthorized - Token may be expired", 401);
      }

      if (response.status === 429) {
        // Rate limiting
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * delay
          : Math.pow(2, retries) * delay;

        console.warn(
          `Spotify API Rate Limited. Waiting ${waitTime / delay} seconds.`
        );
        await wait(waitTime);
        retries++;
        continue;
      }

      if (!response.ok) {
        // Parsear el error de Spotify si es posible
        const errorData: SpotifyErrorResponse = await response
          .json()
          .catch(() => ({}));
        throw new SpotifyAPIError(
          errorData.error?.message || response.statusText,
          response.status
        );
      }

      return response;
    } catch (error) {
      if (error instanceof SpotifyAPIError && error.status === 401) {
        // Intentar refrescar el token
        try {
          const session = await getServerSession(authOptions);
          if (session?.refreshToken) {
            const newTokens = await refreshSpotifyToken(session.refreshToken);
            // Aquí deberías actualizar el token en tu sistema de sesión
            // Este es un punto donde necesitarás implementar la lógica específica de tu aplicación

            // Actualizar las opciones con el nuevo token
            options.headers = {
              ...options.headers,
              Authorization: `Bearer ${newTokens.accessToken}`,
            };

            // Reintentar la solicitud
            continue;
          }
        } catch (refreshError) {
          // Si falla el refresco, propagar el error
          throw error;
        }
      }

      if (retries === maxRetries - 1) {
        throw error;
      }

      // Backoff exponencial
      await wait(Math.pow(2, retries) * delay);
      retries++;
    }
  }

  throw new Error("Max retries reached");
}

// Función para obtener un token de acceso actualizado
export async function getAccessToken(session: any): Promise<string> {
  // Verificar si el token actual es válido
  if (session?.accessToken && session.expiresAt > Date.now()) {
    return session.accessToken;
  }

  // Intentar refrescar el token
  if (session?.refreshToken) {
    try {
      const newTokens = await refreshSpotifyToken(session.refreshToken);
      // Aquí deberías implementar la lógica para guardar los nuevos tokens
      return newTokens.accessToken;
    } catch (error) {
      throw new Error("No se pudo obtener un token de acceso válido");
    }
  }

  throw new Error("No hay tokens disponibles para obtener acceso");
}

export async function getPlaylist(
  playlistId: string,
  accessToken: string,
  market: string = "ES"
) {
  const response = await spotifyFetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?market=${market}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  return await response.json();
}

export async function getPlaylistTracks(
  playlistId: string,
  accessToken: string,
  market: string = "ES"
) {
  const cacheKey = `tracks_${playlistId}`;
  const cachedData = playlistCache.get(cacheKey);

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
    console.log("chache:do");
    return cachedData.data;
  }

  let tracks: any[] = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=${market}&limit=50&fields=items(track(id,name,images(url),artists(id,name,href))),next`;
console.log(url);
  while (url) {
    const response = await spotifyFetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error fetching playlist tracks:", errorData);
      throw new Error(
        `Failed to fetch playlist tracks: ${
          errorData.error?.message || "Unknown error"
        }`
      );
    }

    const data = await response.json();
    tracks = [...tracks, ...data.items];
    url = data.next;
  }

  // Guardar en caché
  playlistCache.set(cacheKey, {
    data: tracks,
    timestamp: Date.now(),
  });

  return tracks;
}

export async function processPlaylistData(
  playlistId: any,
  accessToken: any,
  market: string = "ES"
) {
  console.log("entra a procesar");
  // Verificar si ya existe la playlist en la base de datos
  try {
    // Primero intentamos obtener la playlist de la base de datos
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Añadir un timeout a la solicitud para evitar que se quede esperando indefinidamente
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
    console.log("antes del fetch");

    try {
      const response = await spotifyFetch(
        `${baseUrl}/api/playlists/exists/${playlistId}`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const existsData = await response.json();

        // Si la playlist existe, obtener los datos completos
        if (existsData.exists) {
          console.log(
            "Playlist encontrada en la base de datos, obteniendo datos completos"
          );
          const fullDataResponse = await fetch(
            `${baseUrl}/api/playlists/spotify/${playlistId}`
          );

          if (fullDataResponse.ok) {
            const existingData = await fullDataResponse.json();
            return existingData;
          }
        }
      }
    } catch (fetchError) {
      // Si hay un error de timeout o cualquier otro error de fetch, continuamos con la importación
      console.log(
        "Error al verificar playlist en base de datos (timeout o error de red), continuando con importación:",
        fetchError
      );
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.log(
      "Error al verificar playlist en base de datos, continuando con importación:",
      error
    );
  }

  // Si no existe en la base de datos, obtener de Spotify con rate limiting
  const playlistData = await getPlaylistData(playlistId, accessToken);
  const playlistTracks = await getPlaylistTracks(playlistId, accessToken);
  console.log("entra a procesar" , playlistData);

  const artistsMap: any = {};
  console.log("playlistTracks", playlistTracks);
  playlistTracks.forEach((item: any) => {
  console.log("item", item);

    if (!item.track) return; // Skip local tracks or tracks without data

    const artist = item.track.artists[0]; // Use the first artist
    const image = item.track.images[0].url; // Use the first image
    if (!artist) return;

    if (!artistsMap[artist.id]) {
      artistsMap[artist.id] = {
        id: artist.id,
        spotifyId: artist.id,
        name: artist.name,
        image: image,
      };
    }
  });

  const artists = Object.values(artistsMap);

  // Fetch artist images (only once per artist)
  const artistChunks = [];
  for (let i = 0; i < artists.length; i += 50) {
    artistChunks.push(artists.slice(i, i + 50));
  }

  // Procesar cada grupo por separado
  for (const chunk of artistChunks) {
    const artistIds = artists.map((artist: any) => artist.id).join(",");
    if (artistIds) {
      try {
        const artistDetailsResponse = await spotifyFetch(
          `https://api.spotify.com/v1/artists?ids=${artistIds}?market=${market}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (artistDetailsResponse.ok) {
          const artistDetailsData = await artistDetailsResponse.json();
          artistDetailsData.artists.forEach((artistDetail: any) => {
            const artist: any = artists.find(
              (a: any) => a.id === artistDetail.id
            );
            if (artist) {
              artist.image = artistDetail.images[0]?.url || null;
            }
          });
        } else {
          console.warn("Failed to fetch artist details, using default images.");
        }
      } catch (error) {
        console.warn("Error fetching artist details:", error);
      }
    }
  }

  return {
    id: playlistData.id,
    name: playlistData.name,
    description: playlistData.description,
    image: playlistData.images[0]?.url || null,
    artists: artists,
  };
}
