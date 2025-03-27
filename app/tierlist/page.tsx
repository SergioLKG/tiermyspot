"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

// Default tiers
const TIERS = [
  { id: "S", label: "S", value: 5, color: "bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-800" },
  { id: "A", label: "A", value: 4, color: "bg-orange-100 dark:bg-orange-900 border-orange-200 dark:border-orange-800" },
  { id: "B", label: "B", value: 3, color: "bg-yellow-100 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800" },
  { id: "C", label: "C", value: 2, color: "bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800" },
  { id: "D", label: "D", value: 1, color: "bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800" },
  { id: "F", label: "F", value: 0, color: "bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-800" },
]

export default function TierlistPage() {
  const { data: session, status } = useSession()
  const [rankings, setRankings] = useState({})
  const [playingTrack, setPlayingTrack] = useState(null)
  const [audio, setAudio] = useState(null)
  const [artists, setArtists] = useState([])
  const [currentTrackIndices, setCurrentTrackIndices] = useState({})
  const [playlistName, setPlaylistName] = useState("")
  const [playlistImage, setPlaylistImage] = useState("")
  const [playlistId, setPlaylistId] = useState("")
  const [playlistStats, setPlaylistStats] = useState({ userCount: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirigir al login si no hay sesión
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      if (status !== "authenticated" || !session) return

      try {
        setIsLoading(true)

        // Obtener ID de la playlist de los parámetros de búsqueda
        const id = searchParams.get("id")

        if (!id) {
          // Si no hay ID en los parámetros, redirigir a importar
          router.push("/import-playlist")
          return
        }

        // Obtener datos de la playlist
        const playlistResponse = await fetch(`/api/playlists/${id}`)

        if (!playlistResponse.ok) {
          throw new Error("Error al cargar la playlist")
        }

        const playlistData = await playlistResponse.json()

        setPlaylistId(playlistData.id)
        setPlaylistName(playlistData.name)
        if (playlistData.isPrivate && playlistData.privatePlaylistName) {
          setPlaylistName(`${playlistData.name} (${playlistData.privatePlaylistName})`)
        }
        setPlaylistImage(playlistData.image)
        setArtists(playlistData.artists)

        // Inicializar índices de pistas actuales
        const initialIndices = {}
        playlistData.artists.forEach((artist) => {
          initialIndices[artist.id] = 0
        })
        setCurrentTrackIndices(initialIndices)

        // Obtener estadísticas de la playlist
        const statsResponse = await fetch(`/api/playlists/${id}/stats`)

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setPlaylistStats(statsData)
        }

        // Obtener rankings del usuario
        const rankingsResponse = await fetch(`/api/rankings?playlistId=${id}&type=user`)

        if (rankingsResponse.ok) {
          const rankingsData = await rankingsResponse.json()
          setRankings(rankingsData)
        }
      } catch (error) {
        console.error("Error al cargar datos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Limpiar audio al desmontar
    return () => {
      if (audio) {
        audio.pause()
        audio.src = ""
      }
    }
  }, [router, session, status, searchParams])

  const handleRankArtist = async (artistId, tierId) => {
    try {
      // Si el artista ya está clasificado con este tier, quitarlo
      const newRankings = { ...rankings }

      if (rankings[artistId] === tierId) {
        delete newRankings[artistId]
        setRankings(newRankings)

        // Enviar a la API
        await fetch("/api/rankings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playlistId,
            artistId,
            tierId: null, // Eliminar ranking
          }),
        })
      } else {
        // Si no, clasificarlo o cambiar su clasificación
        newRankings[artistId] = tierId
        setRankings(newRankings)

        // Enviar a la API
        await fetch("/api/rankings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playlistId,
            artistId,
            tierId,
          }),
        })
      }
    } catch (error) {
      console.error("Error al guardar ranking:", error)
    }
  }

  const handlePlayTrack = (artist, trackIndex) => {
    const track = artist.tracks[trackIndex]
    if (!track || !track.previewUrl) {
      console.error("No hay URL de previsualización disponible para esta pista")
      return
    }

    const trackId = `${artist.id}_${track.id}`

    if (playingTrack === trackId) {
      // Detener reproducción
      if (audio) {
        audio.pause()
      }
      setPlayingTrack(null)
    } else {
      // Detener reproducción actual si existe
      if (audio) {
        audio.pause()
      }

      // Crear nuevo audio
      const newAudio = new Audio(track.previewUrl)

      // Configurar eventos
      newAudio.addEventListener("canplay", () => {
        newAudio.play().catch((error) => {
          console.error("Error al reproducir audio:", error)
        })
      })

      newAudio.addEventListener("error", (e) => {
        console.error("Error al cargar audio:", e)
      })

      // Detener cuando termine la vista previa
      newAudio.addEventListener("ended", () => {
        setPlayingTrack(null)
      })

      // Intentar cargar y reproducir
      newAudio.load()
      setAudio(newAudio)
      setPlayingTrack(trackId)
    }
  }

  const handleNextTrack = (artistId) => {
    const artist = artists.find((a) => a.id === artistId)
    if (!artist) return

    const currentIndex = currentTrackIndices[artistId]
    const nextIndex = (currentIndex + 1) % artist.tracks.length

    setCurrentTrackIndices({
      ...currentTrackIndices,
      [artistId]: nextIndex,
    })

    // Si se está reproduciendo una pista de este artista, reproducir la siguiente
    if (playingTrack && playingTrack.startsWith(artistId)) {
      handlePlayTrack(artist, nextIndex)
    }
  }

  const handlePrevTrack = (artistId) => {
    const artist = artists.find((a) => a.id === artistId)
    if (!artist) return

    const currentIndex = currentTrackIndices[artistId]
    const prevIndex = (currentIndex - 1 + artist.tracks.length) % artist.tracks.length

    setCurrentTrackIndices({
      ...currentTrackIndices,
      [artistId]: prevIndex,
    })

    // Si se está reproduciendo una pista de este artista, reproducir la anterior
    if (playingTrack && playingTrack.startsWith(artistId)) {
      handlePlayTrack(artist, prevIndex)
    }
  }

  // Mostrar pantalla de carga mientras se verifica la sesión o se cargan los datos
  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando tu tierlist...</p>
        </div>
      </div>
    )
  }

  // Si no hay sesión, redirigir al login
  if (!session) {
    return null // La redirección se maneja en el useEffect
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header activePage="tierlist" />

      <main className="flex-1 p-4 md:p-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {playlistImage && (
                <div className="relative h-16 w-16 overflow-hidden rounded-md shadow-md">
                  <Image src={playlistImage || "/placeholder.svg"} alt={playlistName} fill className="object-cover" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Mi Tierlist</h1>
                <p className="text-muted-foreground">{playlistName}</p>
              </div>
            </div>
            <Link href="/import-playlist">
              <Button
                variant="outline"
                size="sm"
                className="transition-all hover:bg-primary hover:text-primary-foreground"
              >
                Cambiar Playlist
              </Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {TIERS.map((tier) => (
              <div key={tier.id} className={`${tier.color} rounded-lg p-4 border shadow-sm transition-all`}>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center font-bold text-2xl rounded-md bg-background/80 backdrop-blur-sm shadow-sm">
                    {tier.label}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {artists
                      .filter((artist) => rankings[artist.id] === tier.id)
                      .map((artist) => (
                        <Card key={artist.id} className="w-[160px] transition-all hover:shadow-md">
                          <CardContent className="p-3">
                            <div
                              className="relative mb-2 group cursor-pointer"
                              onClick={() => handlePlayTrack(artist, currentTrackIndices[artist.id])}
                            >
                              <Image
                                src={artist.image || "/placeholder.svg"}
                                alt={artist.name}
                                width={80}
                                height={80}
                                className="rounded-md mx-auto shadow-sm"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center transition-opacity">
                                {artist.tracks.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:text-white"
                                  >
                                    {playingTrack ===
                                    `${artist.id}_${artist.tracks[currentTrackIndices[artist.id]]?.id}` ? (
                                      <Pause className="h-5 w-5" />
                                    ) : (
                                      <Play className="h-5 w-5" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-center font-medium mb-1">{artist.name}</p>

                            {/* Track navigation and playback */}
                            {artist.tracks.length > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1 bg-muted/50 rounded-md px-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handlePrevTrack(artist.id)}
                                    disabled={artist.tracks.length <= 1}
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  <div className="text-xs truncate max-w-[120px] text-center">
                                    {artist.tracks[currentTrackIndices[artist.id]]?.name || "No track"}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleNextTrack(artist.id)}
                                    disabled={artist.tracks.length <= 1}
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="w-full h-7 text-xs"
                                  onClick={() => handlePlayTrack(artist, currentTrackIndices[artist.id])}
                                >
                                  {playingTrack ===
                                  `${artist.id}_${artist.tracks[currentTrackIndices[artist.id]]?.id}` ? (
                                    <>
                                      <Pause className="h-3 w-3 mr-1" /> Pausar
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3 mr-1" /> Escuchar
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-0.5 mt-2">
                              {TIERS.map((t) => (
                                <Button
                                  key={t.id}
                                  variant={t.id === tier.id ? "default" : "outline"}
                                  size="sm"
                                  className={`h-5 px-1 text-xs transition-all ${
                                    t.id === tier.id
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                      : "hover:bg-muted"
                                  }`}
                                  onClick={() => handleRankArtist(artist.id, t.id)}
                                  title={
                                    t.id === tier.id ? "Haz clic para quitar de este tier" : `Mover a tier ${t.label}`
                                  }
                                >
                                  {t.label}
                                </Button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Artistas sin clasificar</h2>
            <div className="flex flex-wrap gap-4">
              {artists
                .filter((artist) => !rankings[artist.id])
                .map((artist) => (
                  <Card key={artist.id} className="w-[160px] transition-all hover:shadow-md">
                    <CardContent className="p-3">
                      <div
                        className="relative mb-2 group cursor-pointer"
                        onClick={() => handlePlayTrack(artist, currentTrackIndices[artist.id])}
                      >
                        <Image
                          src={artist.image || "/placeholder.svg"}
                          alt={artist.name}
                          width={80}
                          height={80}
                          className="rounded-md mx-auto shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center transition-opacity">
                          {artist.tracks.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:text-white"
                            >
                              {playingTrack === `${artist.id}_${artist.tracks[currentTrackIndices[artist.id]]?.id}` ? (
                                <Pause className="h-5 w-5" />
                              ) : (
                                <Play className="h-5 w-5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-center font-medium mb-2">{artist.name}</p>

                      {/* Track navigation and playback */}
                      {artist.tracks.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1 bg-muted/50 rounded-md px-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handlePrevTrack(artist.id)}
                              disabled={artist.tracks.length <= 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-xs truncate max-w-[100px] text-center">
                              {artist.tracks[currentTrackIndices[artist.id]]?.name || "No track"}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleNextTrack(artist.id)}
                              disabled={artist.tracks.length <= 1}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => handlePlayTrack(artist, currentTrackIndices[artist.id])}
                          >
                            {playingTrack === `${artist.id}_${artist.tracks[currentTrackIndices[artist.id]]?.id}` ? (
                              <>
                                <Pause className="h-4 w-4 mr-1" /> Pausar
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" /> Escuchar
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-1">
                        {TIERS.map((tier) => (
                          <Button
                            key={tier.id}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 transition-all hover:bg-muted"
                            onClick={() => handleRankArtist(artist.id, tier.id)}
                          >
                            {tier.label}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

