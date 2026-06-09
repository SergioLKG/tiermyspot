"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Import, AlertTriangle } from "lucide-react";
import { setSelectedPlaylist } from "@/lib/playlist-selection";
import { extractPlaylistId } from "@/lib/spotify-api";

interface ImportPlaylistModalProps {
  children?: React.ReactNode;
  onPlaylistImported?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ImportPlaylistModal({
  children,
  onPlaylistImported,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ImportPlaylistModalProps) {
  const { data: session } = useSession();
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [privateName, setPrivateName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isDemo = session?.isDemo || false;
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange || setInternalOpen;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      if (!playlistUrl.trim()) {
        throw new Error("Por favor, introduce una URL de playlist válida");
      }

      if (isPrivate && !privateName.trim()) {
        throw new Error(
          "Por favor, introduce un nombre para tu playlist privada"
        );
      }

      const playlistId = extractPlaylistId(playlistUrl);

      if (!playlistId) {
        throw new Error(
          "URL de playlist inválida. Por favor, introduce un enlace de compartición de Spotify válido."
        );
      }

      const response = await fetch("/api/import-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistUrl, playlistId, isPrivate, privateName: isPrivate ? privateName : "" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al importar la playlist");
      }

      const data = await response.json();
      setSuccess(true);

      setSelectedPlaylist({
        id: data.playlistId,
        name: data.playlistName,
        image: data.playlistImage,
        isPrivate,
        privateName: isPrivate ? privateName : "",
        userPlaylistId: data.userPlaylistId,
      });

      setTimeout(() => {
        onOpenChange(false);
        onPlaylistImported?.();
        setPlaylistUrl("");
        setIsPrivate(false);
        setPrivateName("");
        setSuccess(false);
      }, 1500);
    } catch (error: any) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setError("");
      setSuccess(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Playlist</DialogTitle>
          <DialogDescription>
            Importa una playlist de Spotify para crear tu tierlist
          </DialogDescription>
        </DialogHeader>

        {isDemo ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <p className="text-muted-foreground">
              La importación de playlists no está disponible en el modo demo.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-300">
                  Playlist importada correctamente.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-playlist-url">
                  URL de la Playlist de Spotify
                </Label>
                <Input
                  id="modal-playlist-url"
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
                  id="modal-isPrivate"
                  checked={isPrivate}
                  onCheckedChange={(checked) => setIsPrivate(checked === true)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="modal-isPrivate"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Crear como playlist privada
                </Label>
              </div>

              {isPrivate && (
                <div className="space-y-2">
                  <Label htmlFor="modal-privateName">
                    Nombre de tu playlist privada
                  </Label>
                  <Input
                    id="modal-privateName"
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

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
