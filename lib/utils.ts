import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import Cookies from "js-cookie"

const SELECTED_PLAYLIST_COOKIE = "selectedPlaylist"

// Función para obtener la playlist seleccionada
export function getSelectedPlaylist() {
  const selectedPlaylist = Cookies.get(SELECTED_PLAYLIST_COOKIE)

  if (!selectedPlaylist) return null

  try {
    const playlist = JSON.parse(selectedPlaylist)

    // Asegurar que los campos críticos existen
    if (!playlist.id) {
      console.error("Selected playlist missing ID")
      return null
    }

    // Normalizar campos para consistencia
    return {
      id: playlist.id,
      name: playlist.name || "",
      image: playlist.image || "",
      isPrivate: !!playlist.isPrivate,
      privatePlaylistName: playlist.privatePlaylistName || playlist.privateName || "",
      userPlaylistId: playlist.userPlaylistId || null,
    }
  } catch (error) {
    console.error("Error parsing selected playlist cookie:", error)
    return null
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}