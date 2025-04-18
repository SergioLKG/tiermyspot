"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Import, X, AlertTriangle, Check, AlertCircle } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getSelectedPlaylist,
  setSelectedPlaylist,
  clearSelectedPlaylist,
} from "@/lib/playlist-selection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { prefetchDNS } from "react-dom";

export default function Dashboard() {
  prefetchDNS("https://image-cdn-ak.spotifycdn.com");
  prefetchDNS("https://i.scdn.co");
  prefetchDNS("https://mosaic.scdn.co");

  const { data: session, status } = useSession();
  const isDemo = session?.isDemo || false;
  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [privatePlaylists, setPrivatePlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    playlistId: null,
    playlistName: "",
  });
  const router = useRouter();
  const [selectedPlaylistInfo, setSelectedPlaylistInfo] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Obtener la playlist seleccionada actual
    const currentSelectedPlaylist = getSelectedPlaylist();
    setSelectedPlaylistInfo(currentSelectedPlaylist);

    const fetchPlaylists = async () => {
      if (status !== "authenticated" || !session) return;

      try {
        setIsLoading(true);

        const response = await fetch("/api/dashboard");

        if (!response.ok) {
          throw new Error("Error al cargar las playlists");
        }

        const data = await response.json();

        setPublicPlaylists(data.publicPlaylists || []);
        setPrivatePlaylists(data.privatePlaylists || []);
      } catch (error) {
        console.error("Error al cargar playlists:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, [router, session, status]);

  // Función para verificar si una playlist está seleccionada
  const isPlaylistSelected = (playlist) => {
    if (!selectedPlaylistInfo) return false;

    if (playlist.isPrivate) {
      return (
        selectedPlaylistInfo.id === playlist.id &&
        selectedPlaylistInfo.privateName === playlist.privateName
      );
    } else {
      return (
        selectedPlaylistInfo.userPlaylistId === playlist.userPlaylistId &&
        selectedPlaylistInfo.id === playlist.id
      );
    }
  };

  // Función para activar una playlist
  const activatePlaylist = (playlist) => {
    // Limpiar cualquier caché relacionada con tierlists
    if (typeof window !== "undefined") {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("tierlist-")) {
          sessionStorage.removeItem(key);
        }
      });
    }

    // Primero limpiar la cookie existente
    clearSelectedPlaylist();

    // Guardar la playlist seleccionada en una cookie
    setSelectedPlaylist({
      id: playlist.id,
      name: playlist.name,
      image: playlist.image,
      isPrivate: playlist.isPrivate,
      privateName: playlist.privateName, // Corregido de privateName a privateName
      userPlaylistId: playlist.userPlaylistId, // Añadido para tener referencia directa
    });

    // Actualizar el estado local
    setSelectedPlaylistInfo({
      id: playlist.id,
      name: playlist.name,
      image: playlist.image,
      isPrivate: playlist.isPrivate,
      privateName: playlist.privateName,
      userPlaylistId: playlist.userPlaylistId,
    });

    // Redirigir a la página de tierlist
    router.push(`/tierlist`);
  };

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
      });

      if (!response.ok) {
        throw new Error("Error al ocultar la playlist");
      }

      // Actualizar la lista de playlists
      setPublicPlaylists(
        publicPlaylists.filter((playlist) => playlist.id !== playlistId)
      );
      setPrivatePlaylists(
        privatePlaylists.filter((playlist) => playlist.id !== playlistId)
      );

      setConfirmDialog({ open: false, playlistId: null, playlistName: "" });
    } catch (error) {
      console.error("Error al ocultar playlist:", error);
    }
  };

  // Show loading screen while checking session
  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header activePage="dashboard" />
      <main className="flex-1 p-4 md:p-6 bg-muted/30">
        <div className="grid gap-4 md:gap-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              Bienvenido, {session?.user?.name || "Usuario"}
            </h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Mi Tierlist</CardTitle>
                <CardDescription>
                  Crea y gestiona tu tierlist personal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/tierlist">
                  <Button
                    title="Ver mi tierlist de la playlist seleccionada"
                    aria-label="Ver mi tierlist de la playlist seleccionada"
                  >
                    Ir a Mi Tierlist
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tierlist Grupal</CardTitle>
                <CardDescription>
                  Ver los rankings combinados de todos los usuarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/group-tierlist">
                  <Button
                    title="Ver tierlist grupal de la playlist seleccionada"
                    aria-label="Ver tierlist grupal de la playlist seleccionada"
                  >
                    Ver Tierlist Grupal
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle>Importar Playlist</CardTitle>
                <CardDescription>
                  Importa una playlist de Spotify para comenzar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isDemo ? (
                  <TooltipProvider delayDuration={100} skipDelayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 opacity-60 cursor-not-allowed"
                          title="Importar Playlist"
                          aria-label="Importar Playlist"
                          disabled
                        >
                          <Import className="h-4 w-4" />
                          <span className="hidden sm:inline-block">
                            Importar Playlist
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={5}
                        className="p-3 max-w-xs"
                        forceMount
                      >
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2 text-amber-500 flex-shrink-0" />
                          <p>
                            Esta función no está disponible en modo demo. Usa
                            las playlists predefinidas para probar la
                            aplicación.
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Link href="/import-playlist">
                    <Button
                      className="w-full"
                      title="Importar Playlist"
                      aria-label="Importar Playlist"
                    >
                      <Import className="mr-2 h-4 w-4" />
                      Importar Playlist
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Playlists Públicas */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Playlists Públicas</h2>
            {publicPlaylists.length === 0 ? (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No tienes playlists públicas
                  </p>
                  {isDemo ? (
                    <TooltipProvider delayDuration={100} skipDelayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 opacity-60 cursor-not-allowed"
                            title="Importar Playlist"
                            aria-label="Importar Playlist"
                            disabled
                          >
                            Importar Playlist
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          sideOffset={5}
                          className="p-3 max-w-xs"
                          forceMount
                        >
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2 text-amber-500 flex-shrink-0" />
                            <p>
                              Esta función no está disponible en modo demo. Usa
                              las playlists predefinidas para probar la
                              aplicación.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Link href="/import-playlist">
                      <Button
                        variant="outline"
                        title="Importar Playlist"
                        aria-label="Importar Playlist"
                      >
                        Importar Playlist
                      </Button>
                    </Link>
                  )}
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
                          <h3 className="font-bold text-white">
                            {playlist.name}
                          </h3>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white"
                        title="Ocultar Playlist"
                        aria-label="Ocultar Playlist"
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
                        <div className="text-sm text-muted-foreground">
                          Playlist pública
                        </div>
                        <Button
                          size="sm"
                          onClick={() => activatePlaylist(playlist)}
                          variant={
                            isPlaylistSelected(playlist) ? "default" : "outline"
                          }
                          className={
                            isPlaylistSelected(playlist)
                              ? "bg-green-600 hover:bg-green-700"
                              : ""
                          }
                          title="Seleccionar Playlist"
                          aria-label="Seleccionar Playlist"
                        >
                          {isPlaylistSelected(playlist) ? (
                            <span className="flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              Seleccionada
                            </span>
                          ) : (
                            "Seleccionar"
                          )}
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
                  <p className="text-muted-foreground mb-4">
                    No tienes playlists privadas
                  </p>
                  <Link href="/import-playlist">
                    <Button
                      variant="outline"
                      title="Crear Playlist Privada"
                      aria-label="Crear Playlist Privada"
                    >
                      Crear Playlist Privada
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {privatePlaylists.map((playlist) => (
                  <Card
                    key={`${playlist.id}-${playlist.privateName}`}
                    className="overflow-hidden"
                  >
                    <div className="relative h-32">
                      <Image
                        src={playlist.image || "/placeholder.svg"}
                        alt={playlist.name}
                        fill
                        loading="eager"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                        <div>
                          <h3 className="font-bold text-white">
                            {playlist.name}
                          </h3>
                          {playlist.privateName && (
                            <p className="text-xs text-white/80">
                              ({playlist.privateName})
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white"
                        title="Ocultar Playlist"
                        aria-label="Ocultar Playlist"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            playlistId: playlist.id,
                            playlistName: playlist.privateName || playlist.name,
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Playlist privada
                        </div>
                        <Button
                          size="sm"
                          onClick={() => activatePlaylist(playlist)}
                          variant={
                            isPlaylistSelected(playlist) ? "default" : "outline"
                          }
                          className={
                            isPlaylistSelected(playlist)
                              ? "bg-green-600 hover:bg-green-700"
                              : ""
                          }
                          title={
                            isPlaylistSelected(playlist)
                              ? "Playlist Seleccionada"
                              : "Seleccionar Playlist"
                          }
                          aria-label={
                            isPlaylistSelected(playlist)
                              ? "Playlist Seleccionada"
                              : "Seleccionar Playlist"
                          }
                        >
                          {isPlaylistSelected(playlist) ? (
                            <span className="flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              Seleccionada
                            </span>
                          ) : (
                            "Seleccionar"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Diálogo de confirmación para ocultar playlist */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Ocultar playlist
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres ocultar la playlist "
              {confirmDialog.playlistName}"? Podrás volver a acceder a ella
              importándola de nuevo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              title="Cancelar ocultar playlist"
              aria-label="Cancelar ocultar playlist"
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
            <Button
              variant="destructive"
              title="Confirmar Ocultar playlist"
              aria-label="Confirmar Ocultar playlist"
              onClick={() => {
                isDemo
                  ? console.log(
                      "Nothing happens... it's because this is a demo?"
                    )
                  : hidePlaylist(confirmDialog.playlistId);
              }}
            >
              Ocultar playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
