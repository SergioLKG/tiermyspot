"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react"
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

// Helper function to get tier by score
const getTierByScore = (score) => {
  // Map score to tier (0-5 to F-S)
  const normalizedScore = Math.round(score)
  return TIERS.find((tier) => tier.value === normalizedScore) || TIERS[0]
}

export default function GroupTierlistPage() {
  const { data: session, status } = useSession()
  const [groupRankings, setGroupRankings] = useState({})
  const [userRankings, setUserRankings] = useState({})
  const [playingTrack, setPlayingTrack] = useState(null)
  const [audio, setAudio] = useState(null)
  const [artists, setArtists] = useState([])
  const [currentTrackIndices, setCurrentTrackIndices] = useState({})
  const [playlistName, setPlaylistName] = useState("")
  const [playlistImage, setPlaylistImage] = useState("")
  const [playlistId, setPlaylistId] = useState("")
  const [playlistStats, setPlaylistStats] = useState({ userCount: 0, users: [] })
  const [users, setUsers] = useState([])
  const router = useRouter()

  // Redirigir al login si no hay sesión
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    // Obtener el ID de la playlist activa
    const activePlaylistId = localStorage.getItem("active_playlist")

    if (activePlaylistId) {
      // Cargar datos de la playlist activa
      const playlistData = localStorage.getItem(`playlist_${activePlaylistId}`)
      if (playlistData) {
        const parsedData = JSON.parse(playlistData)
        setArtists(parsedData.artists || [])
        setPlaylistName(parsedData.name || "Festival Playlist")
        if (parsedData.isPrivate && parsedData.privatePlaylistName) {
          setPlaylistName(`${parsedData.name} (${parsedData.privatePlaylistName})`)
        }
        setPlaylistImage(parsedData.image || "")
        setPlaylistId(activePlaylistId)

        // Inicializar índices de pistas actuales
        const initialIndices = {}
        parsedData.artists.forEach((artist) => {
          initialIndices[artist.id] = 0
        })
        setCurrentTrackIndices(initialIndices)

        // Cargar estadísticas de la playlist
        const playlistStatsKey = `playlist_stats_${activePlaylistId}`
        const playlistStats = JSON.parse(localStorage.getItem(playlistStatsKey) || '{"userCount": 0, "users": []}')
        setPlaylistStats(playlistStats)

        // Recopilar usuarios que han creado rankings para esta playlist
        const allUsers = []
        // Buscar todas las claves en localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key.startsWith(`rankings_`) && key.endsWith(`_${activePlaylistId}`)) {
            const username = key.replace(`rankings_`, "").replace(`_${activePlaylistId}`, "")
            // Añadir usuario a la lista
            allUsers.push({
              username,
              displayName: username.split("@")[0],
              avatar: `/placeholder.svg?height=40&width=40&text=${username.substring(0, 2).toUpperCase()}`,
            })
          }
        }
        setUsers(allUsers)

        // Calcular rankings grupales
        calculateGroupRankings(allUsers, activePlaylistId)
      }
    } else if (status === "authenticated") {
      // Si no hay playlist activa pero hay sesión, redirigir a importar
      router.push("/import-playlist")
    }

    // Limpiar audio al desmontar
    return () => {
      if (audio) {
        audio.pause()
        audio.src = ""
      }
    }
  }, [router, status])

  // Actualizar la función calculateGroupRankings para usar el ID de playlist
  const calculateGroupRankings = (usersList, playlistId) => {
    const allRankings = {}
    const userVotes = {}

    // Para cada usuario
    usersList.forEach((user) => {
      const userRankings = localStorage.getItem(`rankings_${user.username}_${playlistId}`)
      if (userRankings) {
        const parsedRankings = JSON.parse(userRankings)

        // Añadir la puntuación de cada artista al total
        Object.entries(parsedRankings).forEach(([artistId, tierId]) => {
          if (!allRankings[artistId]) {
            allRankings[artistId] = {
              totalScore: 0,
              userCount: 0,
            }
            userVotes[artistId] = []
          }

          // Encontrar el valor del tier
          const tier = TIERS.find((t) => t.id === tierId)
          if (tier) {
            allRankings[artistId].totalScore += tier.value
            allRankings[artistId].userCount += 1

            // Guardar qué usuario votó por qué tier
            userVotes[artistId].push({
              username: user.username,
              displayName: user.displayName || user.username.split("@")[0],
              avatar:
                user.avatar ||
                `/placeholder.svg?height=20&width=20&text=${(user.displayName || user.username).substring(0, 2).toUpperCase()}`,
              tier: tierId,
            })
          }
        })
      }
    })

    // Calcular puntuaciones promedio y asignar tiers
    const finalRankings = {}
    Object.entries(allRankings).forEach(([artistId, data]) => {
      const averageScore = data.userCount > 0 ? data.totalScore / data.userCount : 0
      const tier = getTierByScore(averageScore)
      finalRankings[artistId] = tier.id
    })

    setGroupRankings(finalRankings)
    setUserRankings(userVotes)
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

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (status === "loading") {
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
                {playlistStats.userCount} {playlistStats.userCount === 1 ? "persona ha" : "personas han"} calificado
                esta playlist
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
                      .filter((artist) => groupRankings[artist.id] === tier.id)
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
                              {userRankings[artist.id]?.length > 3 ? (
                                <div className="flex items-center">
                                  <div className="flex -space-x-2">
                                    {userRankings[artist.id].slice(0, 3).map((vote, index) => (
                                      <div
                                        key={index}
                                        className="relative"
                                        title={`${vote.displayName || vote.username.split("@")[0]} votó: ${vote.tier}`}
                                      >
                                        <Image
                                          src={
                                            vote.avatar ||
                                            `/placeholder.svg?height=20&width=20&text=${(vote.displayName || vote.username).substring(0, 2).toUpperCase()}`
                                          }
                                          alt={vote.displayName || vote.username.split("@")[0]}
                                          width={20}
                                          height={20}
                                          className="rounded-full border-2 border-white"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <span className="ml-1 text-xs font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">
                                    +{userRankings[artist.id].length - 3}
                                  </span>
                                </div>
                              ) : (
                                userRankings[artist.id]?.map((vote, index) => (
                                  <div
                                    key={index}
                                    className="relative"
                                    title={`${vote.displayName || vote.username.split("@")[0]} votó: ${vote.tier}`}
                                  >
                                    <Image
                                      src={
                                        vote.avatar ||
                                        `/placeholder.svg?height=20&width=20&text=${(vote.displayName || vote.username).substring(0, 2).toUpperCase()}`
                                      }
                                      alt={vote.displayName || vote.username.split("@")[0]}
                                      width={20}
                                      height={20}
                                      className="rounded-full border-2 border-white"
                                    />
                                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] w-3 h-3 rounded-full flex items-center justify-center">
                                      {vote.tier}
                                    </span>
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
                .filter((artist) => !groupRankings[artist.id])
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

