// Funciones para interactuar con la API de Spotify con manejo de rate limiting

// Función de espera para manejar retries
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Función para manejar rate limiting y reintentos
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);

      // Manejar códigos de estado específicos
      if (response.status === 429) {
        // Obtener el tiempo de espera de los headers de Spotify
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, retries) * 1000; // Exponential backoff

        console.warn(
          `Rate limited. Waiting ${waitTime / 1000} seconds before retrying.`
        );
        await wait(waitTime);
        retries++;
        continue;
      }

      // Para otros códigos de error, lanzar una excepción
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (retries === maxRetries - 1) {
        throw error;
      }

      // Esperar antes de reintentar con backoff exponencial
      await wait(Math.pow(2, retries) * 1000);
      retries++;
    }
  }

  throw new Error("Max retries reached");
}

// Función para obtener un token de acceso actualizado si es necesario
export async function getAccessToken(session) {
  if (session?.accessToken) {
    return session.accessToken;
  }

  // En un caso real, aquí implementarías la lógica para refrescar el token
  throw new Error("No se pudo obtener un token de acceso válido");
}

// Función para obtener los detalles de una playlist
export async function getPlaylist(playlistId, accessToken) {
  const response = await fetchWithRetry(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return await response.json();
}

// Función para obtener todas las pistas de una playlist (maneja paginación)
export async function getPlaylistTracks(playlistId, accessToken) {
  let tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

  while (url) {
    const response = await fetchWithRetry(
      url, 
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    tracks = [...tracks, ...data.items];
    url = data.next; // Si hay más páginas, Spotify proporciona la URL en 'next'
  }

  return tracks;
}

// Función para obtener las canciones principales de un artista
export async function getArtistTopTracks(artistId, accessToken, market = "ES") {
  const response = await fetchWithRetry(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`, 
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  return data.tracks;
}

// Función para procesar los datos de la playlist y agrupar por artista
export async function processPlaylistData(playlistId, accessToken) {
  // Obtener detalles de la playlist
  const playlist = await getPlaylist(playlistId, accessToken);

  // Obtener todas las pistas
  const playlistTracks = await getPlaylistTracks(playlistId, accessToken);

  // Agrupar pistas por artista
  const artistsMap = {};

  for (const item of playlistTracks) {
    const track = item.track;
    if (!track) continue; // Saltar elementos sin pista

    // Usar el artista principal de cada pista
    const artist = track.artists[0];

    if (!artistsMap[artist.id]) {
      artistsMap[artist.id] = {
        id: artist.id,
        name: artist.name,
        image:
          artist.images?.[0]?.url ||
          track.album?.images?.[0]?.url ||
          "/placeholder.svg?height=100&width=100",
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

          // Verificar si la pista ya está incluida
          const isAlreadyIncluded = artist.tracks.some(
            (t) => t.id === track.id
          );

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
        console.error(
          `Error al obtener canciones principales para ${artist.name}:`,
          error
        );
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
