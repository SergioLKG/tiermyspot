"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2, Users, AlertTriangle } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getSelectedPlaylist } from "@/lib/playlist-selection";
import { ArtistCard } from "@/components/artist-card";
import { NoPlaylistModal } from "@/components/no-playlist-modal";
import { UserVotesPopup } from "@/components/user-votes-popup";
import { TierlistExport } from "@/components/tierlist-export";

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
  const [groupRankings, setGroupRankings] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audio, setAudio] = useState(null);
  const [artists, setArtists] = useState([]);
  const [currentTrackIndices, setCurrentTrackIndices] = useState({});
  const [playlistName, setPlaylistName] = useState("");
  const [playlistImage, setPlaylistImage] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [userCount, setUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNoPlaylistModal, setShowNoPlaylistModal] = useState(false);
  const [usersData, setUsersData] = useState({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierlistRef = useRef(null);

  // Redirigir al login si no hay sesión
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Modificar la función fetchData para usar la nueva estructura
  useEffect(() => {
    const fetchData = async () => {
      if (status !== "authenticated" || !session) return;

      try {
        setIsLoading(true);
        setError(null);

        // Obtener la playlist seleccionada de la cookie
        const selectedPlaylist = getSelectedPlaylist();

        // Si no hay playlist seleccionada, mostrar el modal
        if (!selectedPlaylist) {
          setShowNoPlaylistModal(true);
          setIsLoading(false);
          return;
        }

        const playlistId = selectedPlaylist.id;
        const privateName = selectedPlaylist.privateName || "";

        // Obtener datos de la tierlist grupal
        const response = await fetch(
          `/api/group-tierlists?playlistId=${playlistId}&privateName=${privateName}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Error al cargar la tierlist grupal"
          );
        }

        const data = await response.json();

        // Actualizar estado con los datos recibidos
        setPlaylistId(data.playlist.id);
        setPlaylistName(data.playlist.name);
        if (selectedPlaylist.isPrivate && selectedPlaylist.privateName) {
          setPlaylistName(
            `${data.playlist.name} (${selectedPlaylist.privateName})`
          );
        }
        setPlaylistImage(data.playlist.image);
        setArtists(data.playlist.artists);

        // Inicializar índices de pistas actuales
        const initialIndices = {};
        data.playlist.artists.forEach((artist: any) => {
          initialIndices[artist.id] = 0;
        });
        setCurrentTrackIndices(initialIndices);

        // Establecer rankings grupales
        setGroupRankings(data.groupTierlist.aggregatedRatings || {});
        setUserCount(data.groupTierlist.userCount || 0);

        // Obtener votos de usuarios
        try {
          const votesResponse = await fetch(
            `/api/group-tierlist/${playlistId}`
          );
          if (votesResponse.ok) {
            const votesData = await votesResponse.json();
            setUserVotes(votesData.groupRankings?.votes || {});

            // Obtener información de usuarios si está disponible
            if (votesData.users) {
              setUsersData(votesData.users);
            }
          }
        } catch (votesError) {
          console.error("Error al obtener votos de usuarios:", votesError);
          // No interrumpir el flujo principal si falla esta parte
        }
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError(err.message || "Error al cargar la tierlist grupal");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router, session, status]);

  const handlePlayTrack = (artist: any, trackIndex: any) => {
    const track = artist.tracks[trackIndex];
    if (!track || !track.previewUrl) {
      console.error(
        "No hay URL de previsualización disponible para esta pista"
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
        newAudio.play().catch((error) => {
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
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Cargando la tierlist grupal...
          </p>
        </div>
      </div>
    );
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
        <main className="flex-1 p-4 md:p-6 bg-muted/30 flex items-center justify-center">
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
                  onClick={() => window.location.reload()}
                >
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
    );
  }

  // Preparar los rankings para el componente de exportación
  const tierRankings = {};
  Object.entries(groupRankings).forEach(([artistId, data]: [string, any]) => {
    if (data.tier) {
      tierRankings[artistId] = data.tier;
    }
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header activePage="group" />

      <main className="flex-1 p-4 md:p-6 bg-muted/30">
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
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Tierlist Grupal
                </h1>
                <p className="text-muted-foreground">{playlistName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {userCount} <span className="hidden sm:block"> {userCount === 1 ? " persona ha" : " personas han"} calificado esta playlist</span>
              </div>
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
                  className="transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  Cambiar Playlist
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4" ref={tierlistRef}>
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`${tier.color} rounded-lg p-4 border shadow-sm transition-all`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center font-bold text-2xl rounded-md bg-background/80 backdrop-blur-sm shadow-sm">
                    {tier.label}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {artists
                      .filter(
                        (artist: any) =>
                          groupRankings[artist.id]?.tier === tier.id
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

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Artistas sin clasificar</h2>
            <div className="flex flex-wrap gap-4">
              {artists
                .filter((artist: any) => !groupRankings[artist.id]?.tier)
                .map((artist: any) => (
                  <ArtistCard
                    key={artist.id}
                    artist={artist}
                    currentTrackIndex={currentTrackIndices[artist.id] || 0}
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
          </div>
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
