"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getSelectedPlaylist } from "@/lib/playlist-selection";
import { ArtistCard } from "@/components/artist-card";
import { cachedFetch } from "@/lib/api-cache";
import { NoPlaylistModal } from "@/components/no-playlist-modal";
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

export default function TierlistPage() {
  const { data: session, status }: any = useSession();
  const [artists, setArtists]: any = useState([]);
  const [rankings, setRankings]: any = useState({});
  const [playlistName, setPlaylistName]: any = useState("");
  const [playlistImage, setPlaylistImage]: any = useState("");
  const [playlistId, setPlaylistId]: any = useState("");
  const [userPlaylistId, setUserPlaylistId]: any = useState("");
  const [playingTrack, setPlayingTrack]: any = useState(null);
  const [audio, setAudio]: any = useState(null);
  const [currentTrackIndices, setCurrentTrackIndices]: any = useState({});
  const [isLoading, setIsLoading]: any = useState(true);
  const [error, setError]: any = useState(null);
  const [loadingMessage, setLoadingMessage]: any = useState("");
  const [showNoPlaylistModal, setShowNoPlaylistModal]: any = useState(false);
  const router: any = useRouter();
  const searchParams: any = useSearchParams();
  const tierlistRef: any = useRef(null);

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

        const playlistIdValue = selectedPlaylist.id;
        setPlaylistId(playlistIdValue);

        // Mostrar mensaje de carga específico
        setLoadingMessage("Cargando datos de la playlist...");

        // Obtener datos de la playlist
        const playlistData = await cachedFetch(
          `/api/playlists/${playlistIdValue}`
        );

        if (!playlistData) {
          throw new Error("Error al cargar la playlist");
        }

        // Actualizar datos de la playlist
        setPlaylistName(
          selectedPlaylist.isPrivate && selectedPlaylist.privateName
            ? `${playlistData.name} (${selectedPlaylist.privateName})`
            : playlistData.name
        );
        setPlaylistImage(playlistData.image);
        setArtists(playlistData.artists || []);

        // Inicializar índices de pistas actuales
        const initialIndices: any = {};
        playlistData.artists.forEach((artist: any) => {
          initialIndices[artist.id] = 0;
        });
        setCurrentTrackIndices(initialIndices);

        // Obtener tierlist del usuario
        setLoadingMessage("Cargando tus rankings...");
        const tierlistData = await cachedFetch(
          `/api/tierlists?playlistId=${playlistIdValue}&privateName=${
            selectedPlaylist.privateName || ""
          }`
        );

        if (tierlistData && !tierlistData.error) {
          setRankings(tierlistData.ratings || {});
          if (tierlistData.userPlaylistId) {
            setUserPlaylistId(tierlistData.userPlaylistId);
          }
        } else {
          // Si hay un error o no hay tierlist, inicializar con un objeto vacío
          setRankings({});
        }
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Error al cargar los datos. Por favor, intenta de nuevo.");
      } finally {
        setIsLoading(false);
        setLoadingMessage("");
      }
    };

    fetchData();

    // Limpiar audio al desmontar
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, [router, session, status]);

  const handleRankArtist = async (artistId: any, tierId: any) => {
    try {
      // Si el artista ya está clasificado con este tier, quitarlo
      const newRankings = { ...rankings };

      if (rankings[artistId] === tierId) {
        delete newRankings[artistId];
        setRankings(newRankings);
      } else {
        // Si no, clasificarlo o cambiar su clasificación
        newRankings[artistId] = tierId;
        setRankings(newRankings);
      }

      // Enviar a la API
      const response = await fetch("/api/rankings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlistId,
          artistId,
          tierId: rankings[artistId] === tierId ? null : tierId,
          privateName: getSelectedPlaylist()?.privateName,
        }),
      });

      if (!response.ok) {
        // Si hay un error, revertir el cambio local
        console.error("Error al guardar ranking:", await response.text());
        setRankings({ ...rankings }); // Restaurar el estado anterior

        // Mostrar un mensaje de error al usuario
        alert("Error al guardar el ranking. Por favor, inténtalo de nuevo.");
      }
    } catch (error) {
      console.error("Error al guardar ranking:", error);
      // Revertir el cambio local
      setRankings({ ...rankings });
      // Mostrar un mensaje de error al usuario
      alert("Error al guardar el ranking. Por favor, inténtalo de nuevo.");
    }
  };

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

  const handleNextTrack = (artistId) => {
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

  const handlePrevTrack = (artistId) => {
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
            {loadingMessage || "Cargando tu tierlist..."}
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
        <Header activePage="tierlist" />
        <main className="flex-1 p-4 md:p-6 bg-muted/30 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="bg-destructive/10 p-6 rounded-lg border border-destructive/20 flex flex-col items-center">
              <div className="text-destructive mb-4">
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
                  className="h-12 w-12"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <path d="M12 9v4"></path>
                  <path d="M12 17h.01"></path>
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">
                Error al cargar la tierlist
              </h2>
              <p className="text-center mb-4">{error}</p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  title="Intentar de nuevo"
                  aria-label="Intentar de nuevo"
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

  return (
    <div className="flex flex-col min-h-screen">
      <Header activePage="tierlist" />

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
                  Mi Tierlist
                </h1>
                <p className="text-muted-foreground">{playlistName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <TierlistExport
                playlistName={playlistName}
                playlistImage={playlistImage}
                artists={artists}
                rankings={rankings}
              />
              <Link href="/import-playlist">
                <Button
                  variant="outline"
                  size="sm"
                  className="transition-all hover:bg-primary hover:text-primary-foreground"
                  title="Cambiar Playlist"
                  aria-label="Cambiar Playlist"
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
                      .filter((artist) => rankings[artist.id] === tier.id)
                      .map((artist) => (
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
                          <div className="grid grid-cols-3 gap-1.5 mt-2">
                            {TIERS.map((t) => (
                              <Button
                                key={t.id}
                                variant={
                                  t.id === tier.id ? "default" : "outline"
                                }
                                size="sm"
                                className={`h-5 px-1 text-xs transition-all ${
                                  t.id === tier.id
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "hover:bg-muted"
                                }`}
                                onClick={() =>
                                  handleRankArtist(artist.id, t.id)
                                }
                                title={
                                  t.id === tier.id
                                    ? "Haz clic para quitar de este tier"
                                    : `Mover a tier ${t.label}`
                                }
                                aria-label={
                                  t.id === tier.id
                                    ? "Haz clic para quitar de este tier"
                                    : `Mover a tier ${t.label}`
                                }
                              >
                                {t.label}
                              </Button>
                            ))}
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
                .filter((artist) => !rankings[artist.id])
                .map((artist) => (
                  <ArtistCard
                    key={artist.id}
                    artist={artist}
                    currentTrackIndex={currentTrackIndices[artist.id] || 0}
                    playingTrackId={playingTrack}
                    onPlay={handlePlayTrack}
                    onNext={handleNextTrack}
                    onPrev={handlePrevTrack}
                  >
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      {TIERS.map((tier) => (
                        <Button
                          key={tier.id}
                          variant="outline"
                          title={`Mover a tier ${tier.label}`}
                          aria-label={`Mover a tier ${tier.label}`}
                          size="sm"
                          className="h-8 px-2 transition-all hover:bg-muted"
                          onClick={() => handleRankArtist(artist.id, tier.id)}
                        >
                          {tier.label}
                        </Button>
                      ))}
                    </div>
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
