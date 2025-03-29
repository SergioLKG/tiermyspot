// Caché simple para las solicitudes a la API
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export async function cachedFetch(url: string, options?: RequestInit) {
  // Si estamos en el servidor, no usar caché
  if (typeof window === "undefined") {
    return fetch(url, options).then((res) => res.json())
  }

  const cacheKey = `${url}:${JSON.stringify(options?.body || "")}`
  const cachedData = apiCache.get(cacheKey)

  // Si tenemos datos en caché y no han expirado, usarlos
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return Promise.resolve(cachedData.data)
  }

  // Si no hay datos en caché o han expirado, hacer la solicitud
  return fetch(url, options)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Error en la solicitud: ${res.status} ${res.statusText}`)
      }
      return res.json()
    })
    .then((data) => {
      // Guardar en caché
      apiCache.set(cacheKey, { data, timestamp: Date.now() })
      return data
    })
}

// Limpiar caché para una URL específica
export function invalidateCache(url: string) {
  for (const key of apiCache.keys()) {
    if (key.startsWith(url)) {
      apiCache.delete(key)
    }
  }
}