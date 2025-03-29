import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import Cookies from "js-cookie"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Nombre de la cookie para la playlist seleccionada
const SELECTED_PLAYLIST_COOKIE = "selected_playlist"

// Función para obtener la playlist seleccionada
export function getSelectedPlaylist() {
  const selectedPlaylist = Cookies.get(SELECTED_PLAYLIST_COOKIE)

  if (!selectedPlaylist) return null

  try {
    return JSON.parse(selectedPlaylist)
  } catch (error) {
    console.error("Error parsing selected playlist cookie:", error)
    return null
  }
}

// Función para establecer la playlist seleccionada
export function setSelectedPlaylist(playlistData: {
  id: number | string
  name: string
  image?: string
  isPrivate?: boolean
  privatePlaylistName?: string
}) {
  // Limpiar cualquier caché relacionada con tierlists
  if (typeof window !== "undefined") {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("tierlist-")) {
        sessionStorage.removeItem(key)
      }
    })
  }

  Cookies.set(SELECTED_PLAYLIST_COOKIE, JSON.stringify(playlistData), { expires: 30 }) // Expira en 30 días
}

// Función para limpiar la playlist seleccionada
export function clearSelectedPlaylist() {
  Cookies.remove(SELECTED_PLAYLIST_COOKIE)
}