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

// Función de espera para manejar retries
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Clase para manejar errores de Spotify de manera más estructurada
class SpotifyAPIError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = 'SpotifyAPIError';
    this.status = status;
  }
}

// Función para refrescar el token de Spotify
export async function refreshSpotifyToken(refreshToken: string): Promise<SpotifyTokens> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new SpotifyAPIError('Failed to refresh token', response.status);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in * 1000)
  };
}

// Función de fetch personalizada con manejo de errores y rate limiting
async function spotifyFetch(
  url: string, 
  options: RequestInit = {}, 
  maxRetries: number = 3
): Promise<Response> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);

      // Manejar códigos de error específicos
      if (response.status === 401) {
        // Token expirado, intentar refrescar
        throw new SpotifyAPIError('Unauthorized - Token may be expired', 401);
      }

      if (response.status === 429) {
        // Rate limiting
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter 
          ? parseInt(retryAfter, 10) * 1000 
          : Math.pow(2, retries) * 1000;

        console.warn(`Spotify API Rate Limited. Waiting ${waitTime/1000} seconds.`);
        await wait(waitTime);
        retries++;
        continue;
      }

      if (!response.ok) {
        // Parsear el error de Spotify si es posible
        const errorData: SpotifyErrorResponse = await response.json().catch(() => ({}));
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
              'Authorization': `Bearer ${newTokens.accessToken}`
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
      await wait(Math.pow(2, retries) * 1000);
      retries++;
    }
  }

  throw new Error('Max retries reached');
}

// Función para obtener un token de acceso actualizado
export async function getAccessToken(session): Promise<string> {
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

// Resto de las funciones originales, usando spotifyFetch
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

export async function getPlaylist(playlistId: string, accessToken: string) {
  const response = await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return await response.json();
}

export async function getPlaylistTracks(playlistId: string, accessToken: string) {
  let tracks: any[] = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

  while (url) {
    const response = await spotifyFetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    tracks = [...tracks, ...data.items];
    url = data.next;
  }

  return tracks;
}

export async function getArtistTopTracks(
  artistId: string, 
  accessToken: string, 
  market: string = "ES"
) {
  const response = await spotifyFetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`, 
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data.tracks;
}

export async function processPlaylistData(playlistId: string, accessToken: string) {
  // Obtener detalles de la playlist
  const playlist = await getPlaylist(playlistId, accessToken);

  // Obtener todas las pistas
  const playlistTracks = await getPlaylistTracks(playlistId, accessToken);

  // Agrupar pistas por artista
  const artistsMap: Record<string, any> = {};

  for (const item of playlistTracks) {
    const track = item.track;
    if (!track) continue;

    const artist = track.artists[0];

    if (!artistsMap[artist.id]) {
      artistsMap[artist.id] = {
        id: artist.id,
        name: artist.name,
        image: artist.images?.[0]?.url || track.album?.images?.[0]?.url || "/placeholder.svg?height=100&width=100",
        tracks: [],
      };
    }

    // Añadir la pista al artista (hasta 3 pistas por artista)
    if (artistsMap[artist.id].tracks.length < 3 && track.preview_url) {
      artistsMap[artist.id].tracks.push({
        id: track.id,
        name: track.name,
        previewUrl: track.preview_url,
        albumName: track.album?.name,
        albumImage: track.album?.images?.[0]?.url,
      });
    }
  }

  // Para artistas con menos de 3 pistas, intentar obtener sus canciones principales
  for (const artistId in artistsMap) {
    const artist = artistsMap[artistId];

    if (artist.tracks.length < 3) {
      try {
        const topTracks = await getArtistTopTracks(artistId, accessToken);

        // Añadir canciones principales que tengan preview_url y no estén ya incluidas
        for (const track of topTracks) {
          if (artist.tracks.length >= 3) break;

          const isAlreadyIncluded = artist.tracks.some((t: any) => t.id === track.id);

          if (!isAlreadyIncluded && track.preview_url) {
            artist.tracks.push({
              id: track.id,
              name: track.name,
              previewUrl: track.preview_url,
              albumName: track.album?.name,
              albumImage: track.album?.images?.[0]?.url,
            });
          }
        }
      } catch (error) {
        console.error(`Error al obtener canciones principales para ${artist.name}:`, error);
      }
    }
  }

  // Convertir el mapa a un array
  const artists = Object.values(artistsMap);

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    image: playlist.images?.[0]?.url,
    artists: artists,
  };
}