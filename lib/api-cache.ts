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
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error en la solicitud a ${url}:`, errorText)
      throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Guardar en caché
    apiCache.set(cacheKey, { data, timestamp: Date.now() })
    return data
  } catch (error) {
    console.error(`Error en cachedFetch para ${url}:`, error)
    throw error
  }
}

// Limpiar caché para una URL específica
export function invalidateCache(url: string) {
  for (const key of apiCache.keys()) {
    if (key.startsWith(url)) {
      apiCache.delete(key)
    }
  }
}

// Limpiar toda la caché
export function clearCache() {
  apiCache.clear()
}