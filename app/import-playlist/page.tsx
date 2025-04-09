"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Import, AlertTriangle } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { setSelectedPlaylist } from "@/lib/playlist-selection";
import { extractPlaylistId } from "@/lib/spotify-api";

export default function ImportPlaylistPage() {
  const { data: session, status } = useSession();
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [privateName, setPrivateName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const isDemo = session?.isDemo || false;

  // Redirigir al login si no hay sesión
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }

    // Redirigir al dashboard si es un usuario demo
    if (status === "authenticated" && isDemo) {
      router.push("/dashboard");
    }
  }, [status, router, isDemo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Validar URL
      if (!playlistUrl.trim()) {
        throw new Error("Por favor, introduce una URL de playlist válida");
      }

      // Validar nombre privado si es privado
      if (isPrivate && !privateName.trim()) {
        throw new Error(
          "Por favor, introduce un nombre para tu playlist privada"
        );
      }

      // Extraer ID de la playlist
      const playlistId = extractPlaylistId(playlistUrl);

      if (!playlistId) {
        throw new Error(
          "URL de playlist inválida. Por favor, introduce un enlace de compartición de Spotify válido."
        );
      }

      // Enviar solicitud
      const response = await fetch("/api/import-playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlistUrl,
          playlistId,
          isPrivate,
          privateName: isPrivate ? privateName : "",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al importar la playlist");
      }

      const data = await response.json();
      setSuccess(true);

      // Guardar la playlist seleccionada en una cookie
      setSelectedPlaylist({
        id: data.playlistId,
        name: data.playlistName,
        image: data.playlistImage,
        isPrivate,
        privateName: isPrivate ? privateName : "",
        userPlaylistId: data.userPlaylistId,
      });

      // Redirigir a la página de tierlist después de un breve retraso
      setTimeout(() => {
        router.push("/tierlist");
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si es un usuario demo, mostrar mensaje de restricción
  if (isDemo) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header activePage="import" />
        <main className="flex-1 p-4 md:p-6 bg-muted/30 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <div className="flex flex-col items-center text-center gap-4">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <h1 className="text-2xl font-bold">Función no disponible</h1>
                <p className="text-muted-foreground">
                  La importación de playlists no está disponible en el modo
                  demo. Estás utilizando playlists predefinidas para probar la
                  aplicación.
                </p>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="mt-4"
                >
                  Volver al dashboard
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Si no hay sesión, redirigir al login
  if (!session) {
    return null; // La redirección se maneja en el useEffect
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header activePage="import" />

      <main className="flex-1 p-4 md:p-6 bg-muted/30 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <h1 className="text-2xl font-bold mb-6">Importar Playlist</h1>

            {error && (
              <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20 mb-4 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md border border-green-200 dark:border-green-800 mb-4">
                <p className="text-sm text-green-800 dark:text-green-300">
                  Playlist importada correctamente. Redirigiendo...
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playlistUrl">
                  URL de la Playlist de Spotify
                </Label>
                <Input
                  id="playlistUrl"
                  type="text"
                  placeholder="https://open.spotify.com/playlist/..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Pega la URL completa de una playlist pública de Spotify
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPrivate"
                  checked={isPrivate}
                  onCheckedChange={(checked) => setIsPrivate(checked === true)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="isPrivate"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Crear como playlist privada
                </Label>
              </div>

              {isPrivate && (
                <div className="space-y-2">
                  <Label htmlFor="privateName">
                    Nombre de tu playlist privada
                  </Label>
                  <Input
                    id="privateName"
                    type="text"
                    placeholder="Mi playlist personal"
                    value={privateName}
                    onChange={(e) => setPrivateName(e.target.value)}
                    disabled={isLoading}
                    required={isPrivate}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este nombre solo será visible para ti
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Import className="mr-2 h-4 w-4" />
                    Importar Playlist
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
