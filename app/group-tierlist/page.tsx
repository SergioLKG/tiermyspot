"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, ChevronLeft, ChevronRight, Loader2, Users, AlertTriangle } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getSelectedPlaylist } from "@/lib/utils"

// Default tiers
const TIERS = [
  { id: "S", label: "S", value: 5, color: "bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-800" },
  { id: "A", label: "A", value: 4, color: "bg-orange-100 dark:bg-orange-900 border-orange-200 dark:border-orange-800" },
  { id: "B", label: "B", value: 3, color: "bg-yellow-100 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800" },
  { id: "C", label: "C", value: 2, color: "bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800" },
  { id: "D", label: "D", value: 1, color: "bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800" },
  { id: "F", label: "F", value: 0, color: "bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-800" },
]

export default function GroupTierlistPage() {
  const { data: session, status } = useSession()
  const [groupRankings, setGroupRankings] = useState({})
  const [userVotes, setUserVotes] = useState({})
  const [playingTrack, setPlayingTrack] = useState(null)
  const [audio, setAudio] = useState(null)
  const [artists, setArtists] = useState([])
  const [currentTrackIndices, setCurrentTrackIndices] = useState({})
  const [playlistName, setPlaylistName] = useState("")
  const [playlistImage, setPlaylistImage] = useState("")
  const [playlistId, setPlaylistId] = useState("")
  const [userCount, setUserCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
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
        setError(null)

        // Obtener la playlist seleccionada de la cookie
        const selectedPlaylist = getSelectedPlaylist()

        // Si no hay playlist seleccionada, redirigir al dashboard
        if (!selectedPlaylist) {
          router.push("/dashboard")
          return
        }

        const playlistId = selectedPlaylist.id
        const privateName = selectedPlaylist.privatePlaylistName || ""

        // Obtener datos de la tierlist grupal
        const response = await fetch(`/api/group-tierlists?playlistId=${playlistId}&privateName=${privateName}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al cargar la tierlist grupal")
        }

        const data = await response.json()

        // Actualizar estado con los datos recibidos
        setPlaylistId(data.playlist.id)
        setPlaylistName(data.playlist.name)
        if (selectedPlaylist.isPrivate && selectedPlaylist.privatePlaylistName) {
          setPlaylistName(`${data.playlist.name} (${selectedPlaylist.privatePlaylistName})`)
        }
        setPlaylistImage(data.playlist.image)
        setArtists(data.playlist.artists)

        // Inicializar índices de pistas actuales
        const initialIndices = {}
        data.playlist.artists.forEach((artist) => {
          initialIndices[artist.id] = 0
        })
        setCurrentTrackIndices(initialIndices)

        // Establecer rankings grupales
        setGroupRankings(data.groupTierlist.aggregatedRatings || {})
        setUserCount(data.groupTierlist.userCount || 0)
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError(err.message || "Error al cargar la tierlist grupal")
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
  }, [router, session, status])

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
          <p className="text-sm text-muted-foreground">Cargando la tierlist grupal...</p>
        </div>
      </div>
    )
  }

  // Si no hay sesión, redirigir al login
  if (!session) {
    return null // La redirección se maneja en el useEffect
  }

  // Mostrar error si lo hay
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header activePage="group" />
        <main className="flex-1 p-4 md:p-6 bg-muted/30 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="bg-destructive/10 p-6 rounded-lg border border-destructive/20 flex flex-col items-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-bold mb-2">Error al cargar la tierlist grupal</h2>
              <p className="text-center mb-4">{error}</p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Intentar de nuevo
                </Button>
                <Link href="/dashboard">
                  <Button>Volver al dashboard</Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header activePage="group" />

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
                <h1 className="text-3xl font-bold tracking-tight">Tierlist Grupal</h1>
                <p className="text-muted-foreground">{playlistName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {userCount} {userCount === 1 ? "persona ha" : "personas han"} calificado esta playlist
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
                      .filter((artist) => groupRankings[artist.id]?.tier === tier.id)
                      .map((artist) => (
                        <Card key={artist.id} className="w-[160px] transition-all hover:shadow-md">
                          <CardContent className="p-3">
                            <div className="relative mb-2 group">
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
                                    onClick={() => handlePlayTrack(artist, currentTrackIndices[artist.id])}
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

                            {/* User votes display */}
                            <div className="flex flex-wrap gap-1 mb-1 justify-center">
                              {userVotes[artist.id]?.length > 3 ? (
                                <div className="flex items-center">
                                  <div className="flex -space-x-2">
                                    {userVotes[artist.id].slice(0, 3).map((vote, index) => (
                                      <div
                                        key={index}
                                        className="relative"
                                        title={`Usuario ${vote.userId} votó: ${vote.tier}`}
                                      >
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[8px] text-primary-foreground border-2 border-white">
                                          {vote.tier}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <span className="ml-1 text-xs font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">
                                    +{userVotes[artist.id].length - 3}
                                  </span>
                                </div>
                              ) : (
                                userVotes[artist.id]?.map((vote, index) => (
                                  <div
                                    key={index}
                                    className="relative"
                                    title={`Usuario ${vote.userId} votó: ${vote.tier}`}
                                  >
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[8px] text-primary-foreground border-2 border-white">
                                      {vote.tier}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Track navigation and playback */}
                            {artist.tracks.length > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1 bg-muted/50 rounded-md px-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
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
                                    className="h-5 w-5"
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
                .filter((artist) => !groupRankings[artist.id]?.tier)
                .map((artist) => (
                  <Card key={artist.id} className="w-[160px] transition-all hover:shadow-md">
                    <CardContent className="p-3">
                      <div className="relative mb-2 group">
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
                              onClick={() => handlePlayTrack(artist, currentTrackIndices[artist.id])}
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
                              className="h-5 w-5"
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
                              className="h-5 w-5"
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