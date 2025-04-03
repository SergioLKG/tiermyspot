import Cookies from "js-cookie"

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
  userPlaylistId?: string
}) {
  // Primero eliminar la cookie existente para evitar problemas
  Cookies.remove(SELECTED_PLAYLIST_COOKIE)

  // Luego establecer la nueva cookie
  Cookies.set(SELECTED_PLAYLIST_COOKIE, JSON.stringify(playlistData), {
    expires: 30, // Expira en 30 días
    path: "/", // Asegurar que la cookie esté disponible en toda la aplicación
  })
}

// Función para limpiar la playlist seleccionada
export function clearSelectedPlaylist() {
  Cookies.remove(SELECTED_PLAYLIST_COOKIE, { path: "/" })
}