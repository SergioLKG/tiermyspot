const refreshCache = new Map<string, string>();

export async function handlePlaylistImageError(
  playlistId: number | string,
  target: EventTarget | HTMLImageElement,
) {
  const img = target as HTMLImageElement;
  const cacheKey = `playlist-img-${playlistId}`;

  if (refreshCache.has(cacheKey)) {
    img.src = refreshCache.get(cacheKey)!;
    return;
  }

  if (refreshCache.has(`${cacheKey}-stale`)) {
    img.src = "/placeholder.svg";
    return;
  }

  try {
    const response = await fetch(`/api/playlists/${playlistId}/refresh-image`, {
      method: "POST",
    });

    if (!response.ok) {
      img.src = "/placeholder.svg";
      refreshCache.set(`${cacheKey}-stale`, "1");
      return;
    }

    const data = await response.json();

    if (data.stale) {
      img.src = "/placeholder.svg";
      refreshCache.set(`${cacheKey}-stale`, "1");
      return;
    }

    img.src = data.image;
    refreshCache.set(cacheKey, data.image);
  } catch {
    img.src = "/placeholder.svg";
    refreshCache.set(`${cacheKey}-stale`, "1");
  }
}
