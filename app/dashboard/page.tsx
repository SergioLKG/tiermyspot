"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Import, X, AlertTriangle } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { setSelectedPlaylist } from "@/lib/utils"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [publicPlaylists, setPublicPlaylists] = useState([])
  const [privatePlaylists, setPrivatePlaylists] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    playlistId: null,
    playlistName: "",
  })
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    const fetchPlaylists = async () => {
      if (status !== "authenticated" || !session) return

      try {
        setIsLoading(true)

        const response = await fetch("/api/dashboard")

        if (!response.ok) {
          throw new Error("Error al cargar las playlists")
        }

        const data = await response.json()

        setPublicPlaylists(data.publicPlaylists || [])
        setPrivatePlaylists(data.privatePlaylists || [])
      } catch (error) {
        console.error("Error al cargar playlists:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlaylists()
  }, [router, session, status])

  // Función para activar una playlist
  const activatePlaylist = (playlist) => {
    // Limpiar cualquier caché relacionada con tierlists
    if (typeof window !== "undefined") {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("tierlist-")) {
          sessionStorage.removeItem(key)
        }
      })
    }

    // Guardar la playlist seleccionada en una cookie
    setSelectedPlaylist({
      id: playlist.id,
      name: playlist.name,
      image: playlist.image,
      isPrivate: playlist.isPrivate,
      privatePlaylistName: playlist.privateName, // Corregido de privatePlaylistName a privateName
      userPlaylistId: playlist.userPlaylistId, // Añadido para tener referencia directa
    })

    // Redirigir a la página de tierlist
    router.push(`/tierlist`)
  }

  // Función para ocultar una playlist
  const hidePlaylist = async (playlistId) => {
    try {
      const response = await fetch("/api/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlistId,
          action: "hide",
        }),
      })

      if (!response.ok) {
        throw new Error("Error al ocultar la playlist")
      }

      // Actualizar la lista de playlists
      setPublicPlaylists(publicPlaylists.filter((playlist) => playlist.id !== playlistId))
      setPrivatePlaylists(privatePlaylists.filter((playlist) => playlist.id !== playlistId))

      setConfirmDialog({ open: false, playlistId: null, playlistName: "" })
    } catch (error) {
      console.error("Error al ocultar playlist:", error)
    }
  }

  // Show loading screen while checking session
  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header activePage="dashboard" />
      <main className="flex-1 p-4 md:p-6 bg-muted/30">
        <div className="grid gap-4 md:gap-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Bienvenido, {session?.user?.name || "Usuario"}</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Mi Tierlist</CardTitle>
                <CardDescription>Crea y gestiona tu tierlist personal</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/tierlist">
                  <Button>Ir a Mi Tierlist</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tierlist Grupal</CardTitle>
                <CardDescription>Ver los rankings combinados de todos los usuarios</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/group-tierlist">
                  <Button>Ver Tierlist Grupal</Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle>Importar Playlist</CardTitle>
                <CardDescription>Importa una playlist de Spotify para comenzar</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/import-playlist">
                  <Button className="w-full">
                    <Import className="mr-2 h-4 w-4" />
                    Importar Playlist
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Playlists Públicas */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Playlists Públicas</h2>
            {publicPlaylists.length === 0 ? (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No tienes playlists públicas</p>
                  <Link href="/import-playlist">
                    <Button variant="outline">Importar Playlist</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publicPlaylists.map((playlist) => (
                  <Card key={playlist.id} className="overflow-hidden">
                    <div className="relative h-32">
                      <Image
                        src={playlist.image || "/placeholder.svg"}
                        alt={playlist.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                        <div>
                          <h3 className="font-bold text-white">{playlist.name}</h3>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            playlistId: playlist.id,
                            playlistName: playlist.name,
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Playlist pública</div>
                        <Button size="sm" onClick={() => activatePlaylist(playlist)}>
                          Seleccionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Playlists Privadas */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Playlists Privadas</h2>
            {privatePlaylists.length === 0 ? (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No tienes playlists privadas</p>
                  <Link href="/import-playlist">
                    <Button variant="outline">Crear Playlist Privada</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {privatePlaylists.map((playlist) => (
                  <Card key={`${playlist.id}-${playlist.privatePlaylistName}`} className="overflow-hidden">
                    <div className="relative h-32">
                      <Image
                        src={playlist.image || "/placeholder.svg"}
                        alt={playlist.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                        <div>
                          <h3 className="font-bold text-white">{playlist.name}</h3>
                          {playlist.privatePlaylistName && (
                            <p className="text-xs text-white/80">({playlist.privatePlaylistName})</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            playlistId: playlist.id,
                            playlistName: playlist.privatePlaylistName || playlist.name,
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Playlist privada</div>
                        <Button size="sm" onClick={() => activatePlaylist(playlist)}>
                          Seleccionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Botón para importar nueva playlist */}
          <div className="mt-4">
            <Card className="flex items-center justify-center h-full min-h-[200px] border-dashed">
              <CardContent className="text-center">
                <Link href="/import-playlist">
                  <Button variant="outline" className="flex flex-col h-auto py-4 px-6">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 mb-2"
                    >
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                    <span>Importar Nueva Playlist</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Diálogo de confirmación para ocultar playlist */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Ocultar playlist
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres ocultar la playlist "{confirmDialog.playlistName}"? Podrás volver a acceder a
              ella importándola de nuevo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({
                  open: false,
                  playlistId: null,
                  playlistName: "",
                })
              }
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => hidePlaylist(confirmDialog.playlistId)}>
              Ocultar playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}