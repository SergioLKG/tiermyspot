"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Users, AlertTriangle, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { TierlistSkeleton } from "@/components/skeletons/tierlist-skeleton";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  getSelectedPlaylist,
  setSelectedPlaylist,
} from "@/lib/playlist-selection";
import { ArtistCard } from "@/components/artist-card";
import { NoPlaylistModal } from "@/components/no-playlist-modal";
import { UserVotesPopup } from "@/components/user-votes-popup";
import { TierlistExport } from "@/components/tierlist-export";
import { handlePlaylistImageError } from "@/lib/refresh-image";

// Default tiers
const TIERS = [
  {
    id: "S",
    label: "S",
    value: 5,
    color: "bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-800",
  },
  {
    id: "A",
    label: "A",
    value: 4,
    color:
      "bg-orange-100 dark:bg-orange-900 border-orange-200 dark:border-orange-800",
  },
  {
    id: "B",
    label: "B",
    value: 3,
    color:
      "bg-yellow-100 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800",
  },
  {
    id: "C",
    label: "C",
    value: 2,
    color:
      "bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800",
  },
  {
    id: "D",
    label: "D",
    value: 1,
    color: "bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800",
  },
  {
    id: "F",
    label: "F",
    value: 0,
    color:
      "bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-800",
  },
];

export default function GroupTierlistPage() {
  const { data: session, status } = useSession();
  const [groupRankings, setGroupRankings] = useState<Record<string, any>>({});
  const [userVotes, setUserVotes] = useState<Record<string, any>>({});
  const [playingTrack, setPlayingTrack] = useState<any>(null);
  const [audio, setAudio] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [currentTrackIndices, setCurrentTrackIndices] = useState<
    Record<string, number>
  >({});
  const [playlistName, setPlaylistName] = useState("");
  const [playlistImage, setPlaylistImage] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState("");
  const [userCount, setUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const dataLoadedRef = useRef(false);
  const [error, setError] = useState<any>(null);
  const [showNoPlaylistModal, setShowNoPlaylistModal] = useState(false);
  const [usersData, setUsersData] = useState<Record<string, any>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierlistRef = useRef(null);
  const { toast } = useToast();

  const handleShare = () => {
    const privateName = getSelectedPlaylist()?.privateName || "";
    const url = new URL(window.location.href);
    url.searchParams.set("playlistId", playlistId);
    if (privateName) {
      url.searchParams.set("privateName", privateName);
    }
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        toast({
          title: "Enlace copiado",
          description:
            "Comparte este enlace para que otros voten en esta playlist",
        });
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "No se pudo copiar el enlace",
          variant: "destructive",
        });
      });
  };

  // Redirigir al login si no hay sesión
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Modificar la función fetchData para usar la nueva estructura
  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    if (dataLoadedRef.current) return;
    dataLoadedRef.current = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let selectedPlaylist = getSelectedPlaylist();

        // Si hay parámetros de URL, usarlos para seleccionar la playlist
        const urlPlaylistId = searchParams.get("playlistId");
        const urlPrivateName = searchParams.get("privateName");
        if (urlPlaylistId && !selectedPlaylist) {
          try {
            const resolveRes = await fetch(`/api/playlists/${urlPlaylistId}`);
            if (resolveRes.ok) {
              const resolveData = await resolveRes.json();
              selectedPlaylist = {
                id: urlPlaylistId,
                name: resolveData.name,
                image: resolveData.image,
                isPrivate: !!urlPrivateName,
                privateName: urlPrivateName || undefined,
              };
              setSelectedPlaylist(selectedPlaylist);
            }
          } catch (e) {
            // Si falla, seguimos con la cookie
          }
        }

        if (!selectedPlaylist) {
          setShowNoPlaylistModal(true);
          setIsLoading(false);
          return;
        }

        const playlistId = selectedPlaylist.id;
        const privateName = selectedPlaylist.privateName || "";

        // Obtener datos de la tierlist grupal
        const response = await fetch(
          `/api/group-tierlists?playlistId=${playlistId}&privateName=${privateName}`,
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Error al cargar la tierlist grupal",
          );
        }

        const data = await response.json();

        // Actualizar estado con los datos recibidos
        setPlaylistId(data.playlist.id);
        setPlaylistName(data.playlist.name);
        if (selectedPlaylist.isPrivate && selectedPlaylist.privateName) {
          setPlaylistName(
            `${data.playlist.name} (${selectedPlaylist.privateName})`,
          );
        }
        setPlaylistImage(data.playlist.image);
        setSpotifyPlaylistUrl(
          data.playlist.spotify_id
            ? `https://open.spotify.com/playlist/${data.playlist.spotify_id}`
            : "",
        );
        setArtists(data.playlist.artists);

        // Inicializar índices de pistas actuales
        const initialIndices: Record<string, number> = {};
        data.playlist.artists.forEach((artist: any) => {
          initialIndices[artist.id] = 0;
        });
        setCurrentTrackIndices(initialIndices);

        // Establecer rankings grupales
        setGroupRankings(data.groupTierlist.aggregated_ratings || {});
        setUserCount(data.groupTierlist.user_count || 0);

        // Obtener votos de usuarios
        try {
          const privateNameParam = selectedPlaylist.privateName
            ? `&privateName=${encodeURIComponent(selectedPlaylist.privateName)}`
            : "";
          const votesResponse = await fetch(
            `/api/group-tierlist/${playlistId}?t=${Date.now()}${privateNameParam}`,
          );
          if (votesResponse.ok) {
            const votesData = await votesResponse.json();
            setUserVotes(votesData.groupRankings?.votes || {});

            // Obtener información de usuarios si está disponible
            if (votesData.users) {
              setUsersData(votesData.users);
            }
            if (votesData.currentUserId) {
              setCurrentUserId(votesData.currentUserId);
            }
          }
        } catch (votesError) {
          console.error("Error al obtener votos de usuarios:", votesError);
          // No interrumpir el flujo principal si falla esta parte
        }
      } catch (err: any) {
        console.error("Error al cargar datos:", err);
        setError(err.message || "Error al cargar la tierlist grupal");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session?.user?.email, status]);

  const handlePlayTrack = (artist: any, trackIndex: any) => {
    const track = artist.tracks[trackIndex];
    if (!track || !track.previewUrl) {
      console.error(
        "No hay URL de previsualización disponible para esta pista",
      );
      return;
    }

    const trackId = `${artist.id}_${track.id}`;

    if (playingTrack === trackId) {
      // Detener reproducción
      if (audio) {
        audio.pause();
      }
      setPlayingTrack(null);
    } else {
      // Detener reproducción actual si existe
      if (audio) {
        audio.pause();
      }

      // Crear nuevo audio
      const newAudio = new Audio(track.previewUrl);

      // Configurar eventos
      newAudio.addEventListener("canplay", () => {
        newAudio.play().catch((error: any) => {
          console.error("Error al reproducir audio:", error);
        });
      });

      newAudio.addEventListener("error", (e) => {
        console.error("Error al cargar audio:", e);
      });

      // Detener cuando termine la vista previa
      newAudio.addEventListener("ended", () => {
        setPlayingTrack(null);
      });

      // Intentar cargar y reproducir
      newAudio.load();
      setAudio(newAudio);
      setPlayingTrack(trackId);
    }
  };

  const handleNextTrack = (artistId: any) => {
    const artist = artists.find((a) => a.id === artistId);
    if (!artist) return;

    const currentIndex = currentTrackIndices[artistId];
    const nextIndex = (currentIndex + 1) % artist.tracks.length;

    setCurrentTrackIndices({
      ...currentTrackIndices,
      [artistId]: nextIndex,
    });

    // Si se está reproduciendo una pista de este artista, reproducir la siguiente
    if (playingTrack && playingTrack.startsWith(artistId)) {
      handlePlayTrack(artist, nextIndex);
    }
  };

  const handlePrevTrack = (artistId: any) => {
    const artist = artists.find((a) => a.id === artistId);
    if (!artist) return;

    const currentIndex = currentTrackIndices[artistId];
    const prevIndex =
      (currentIndex - 1 + artist.tracks.length) % artist.tracks.length;

    setCurrentTrackIndices({
      ...currentTrackIndices,
      [artistId]: prevIndex,
    });

    // Si se está reproduciendo una pista de este artista, reproducir la anterior
    if (playingTrack && playingTrack.startsWith(artistId)) {
      handlePlayTrack(artist, prevIndex);
    }
  };

  // Mostrar pantalla de carga mientras se verifica la sesión o se cargan los datos
  if (status === "loading" || isLoading) {
    return <TierlistSkeleton isGroup />;
  }

  // Si no hay sesión, redirigir al login
  if (!session) {
    return null; // La redirección se maneja en el useEffect
  }

  // Mostrar error si lo hay
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header activePage="group" />
        <main
          id="main-content"
          className="flex-1 p-4 md:p-6 flex items-center justify-center"
        >
          <div className="max-w-md w-full">
            <div className="bg-destructive/10 p-6 rounded-lg border border-destructive/20 flex flex-col items-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-bold mb-2">
                Error al cargar la tierlist grupal
              </h2>
              <p className="text-center mb-4">{error}</p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  title="Reintentar"
                  aria-label="Reintentar"
                  onClick={() => window.location.reload()}
                >
                  Intentar de nuevo
                </Button>
                <Link href="/dashboard">
                  <Button
                    title="Volver al dashboard"
                    aria-label="Volver al dashboard"
                  >
                    Volver al dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Preparar los rankings para el componente de exportación
  const tierRankings: Record<string, string> = {};
  Object.entries(groupRankings).forEach(([artistId, data]: [string, any]) => {
    if (data.tier) {
      tierRankings[artistId] = data.tier;
    }
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header activePage="group" />

      <main id="main-content" className="flex-1 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {playlistImage && (
                <div className="relative h-16 w-16 overflow-hidden rounded-md shadow-md">
                  <Image
                    src={playlistImage || "/placeholder.svg"}
                    alt={playlistName}
                    fill
                    className="object-cover"
                    onError={(e) =>
                      handlePlaylistImageError(playlistId, e.target)
                    }
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Tierlist Grupal
                </h1>
                {spotifyPlaylistUrl ? (
                  <a
                    href={spotifyPlaylistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary hover:underline transition-colors"
                    title={`Abrir "${playlistName}" en Spotify`}
                  >
                    {playlistName}
                  </a>
                ) : (
                  <p className="text-muted-foreground">{playlistName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDialogOpen(true)}
                className="bg-primary/10 px-3 py-1 rounded-full text-sm font-medium flex items-center hover:bg-primary/20 transition-colors cursor-pointer"
                title="Ver quiénes han votado"
                aria-label={`Ver usuarios que han calificado esta playlist (${userCount} ${userCount === 1 ? "persona" : "personas"})`}
              >
                <span className="flex items-center justify-center align-middle gap-0.5 cursor-pointer select-none pointer-events-none">
                  <Users className="h-4 w-4 mr-1 cursor-pointer select-none pointer-events-none" />
                  {userCount}
                  {userCount === 1 ? " participante" : " participantes"}
                </span>
              </button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Usuarios que han calificado</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-80 overflow-y-auto -mx-6 px-6">
                    {Object.keys(usersData).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Aún no hay votos
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {Object.entries(usersData).map(([userId, user]) => {
                          const isCurrentUser = userId === currentUserId;
                          return (
                            <li
                              key={userId}
                              className={`flex items-center gap-3 py-3 ${isCurrentUser ? "font-medium" : ""}`}
                            >
                              <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0">
                                <Image
                                  src={user.image || "/placeholder.svg"}
                                  alt={user.name || "Usuario"}
                                  fill
                                  className="object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "/placeholder.svg";
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">
                                  {user.name || "Usuario desconocido"}
                                  {isCurrentUser && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      (tú)
                                    </span>
                                  )}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                title="Compartir tierlist grupal"
                aria-label="Compartir tierlist grupal"
                className="transition-all hover:bg-primary hover:text-primary-foreground"
              >
                <Share2 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Compartir</span>
              </Button>
              <TierlistExport
                playlistName={playlistName}
                playlistImage={playlistImage}
                artists={artists}
                rankings={tierRankings}
                isGroup={true}
              />
              <Link href="/import-playlist">
                <Button
                  variant="outline"
                  size="sm"
                  title="Cambiar Playlist"
                  aria-label="Cambiar Playlist"
                  className="transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  Cambiar Playlist
                </Button>
              </Link>
            </div>
          </div>

          {(() => {
            const filteredArtists = searchQuery
              ? artists.filter((a: any) =>
                  a.name?.toLowerCase().includes(searchQuery.toLowerCase()),
                )
              : artists;

            return (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar artistas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label="Buscar artistas por nombre"
                  />
                </div>

                <div
                  className="grid gap-4"
                  ref={tierlistRef}
                  role="region"
                  aria-label="Tiers de clasificación"
                >
                  {TIERS.map((tier, tierIndex) => (
                    <div
                      key={tier.id}
                      className={`${tier.color} rounded-lg p-4 border shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2`}
                      style={{
                        animationDelay: `${tierIndex * 80}ms`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center font-bold text-2xl rounded-md bg-background/80 backdrop-blur-sm shadow-sm aspect-square">
                          {tier.label}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {filteredArtists
                            .filter(
                              (artist: any) =>
                                groupRankings[artist.id]?.tier === tier.id,
                            )
                            .map((artist: any) => (
                              <ArtistCard
                                key={artist.id}
                                artist={artist}
                                currentTrackIndex={
                                  currentTrackIndices[artist.id] || 0
                                }
                                playingTrackId={playingTrack}
                                onPlay={handlePlayTrack}
                                onNext={handleNextTrack}
                                onPrev={handlePrevTrack}
                              >
                                {/* Añadir el popup de votos de usuarios */}
                                <div className="mt-2 flex justify-center">
                                  <UserVotesPopup
                                    artistName={artist.name}
                                    votes={userVotes[artist.id] || []}
                                    users={usersData}
                                  />
                                </div>
                              </ArtistCard>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-8"
                  role="region"
                  aria-label="Artistas sin clasificar"
                >
                  <h2 className="text-xl font-bold mb-4">
                    Artistas sin clasificar
                  </h2>
                  {(() => {
                    const unclassified = filteredArtists.filter(
                      (artist: any) => !groupRankings[artist.id]?.tier,
                    );
                    if (unclassified.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {filteredArtists.length === 0
                            ? searchQuery
                              ? "No se encontraron artistas"
                              : "No hay artistas en esta playlist"
                            : "¡Todos los artistas han sido clasificados!"}
                        </p>
                      );
                    }
                    return (
                      <div className="flex flex-wrap gap-4">
                        {unclassified.map((artist: any) => (
                          <ArtistCard
                            key={artist.id}
                            artist={artist}
                            currentTrackIndex={
                              currentTrackIndices[artist.id] || 0
                            }
                            playingTrackId={playingTrack}
                            onPlay={handlePlayTrack}
                            onNext={handleNextTrack}
                            onPrev={handlePrevTrack}
                          >
                            {/* Añadir el popup de votos de usuarios si hay votos */}
                            {userVotes[artist.id] &&
                              userVotes[artist.id].length > 0 && (
                                <div className="mt-2 flex justify-center">
                                  <UserVotesPopup
                                    artistName={artist.name}
                                    votes={userVotes[artist.id] || []}
                                    users={usersData}
                                  />
                                </div>
                              )}
                          </ArtistCard>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            );
          })()}
        </div>
      </main>

      <Footer />

      {/* Modal para cuando no hay playlist seleccionada */}
      <NoPlaylistModal
        open={showNoPlaylistModal}
        onOpenChange={setShowNoPlaylistModal}
      />
    </div>
  );
}
