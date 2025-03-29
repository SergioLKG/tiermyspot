"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Music } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function ArtistCard({ artist, currentTrackIndex = 0, playingTrackId = null, onPlay, onNext, onPrev, children }) {
  const [hasPreviewUrl, setHasPreviewUrl] = useState(false)
  const [isEmbedOpen, setIsEmbedOpen] = useState(false)

  // Verificar si el artista tiene al menos una pista con previewUrl
  useEffect(() => {
    if (artist.tracks && artist.tracks.length > 0) {
      const hasPreview = artist.tracks.some((track:any) => track.previewUrl)
      setHasPreviewUrl(hasPreview)
    }
  }, [artist])

  const currentTrack = artist.tracks && artist.tracks.length > 0 ? artist.tracks[currentTrackIndex] : null

  const isPlaying = playingTrackId === `${artist.id}_${currentTrack?.id}`
  const currentTrackHasPreview = currentTrack?.previewUrl ? true : false

  // Asegurarnos de que la imagen del artista sea válida
  const artistImage =
    artist.image ||
    `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(artist.name?.substring(0, 2) || "?")}`

  // Generar la URL del embed de Spotify
  const spotifyEmbedUrl = artist.spotifyId ? `https://open.spotify.com/embed/artist/${artist.spotifyId}` : null

  return (
    <Card className="w-[160px] transition-all hover:shadow-md">
      <CardContent className="p-3">
        <div className="relative mb-2 group">
          <Image
            src={artistImage || "/placeholder.svg"}
            alt={artist.name}
            width={80}
            height={80}
            className="rounded-md mx-auto shadow-sm"
          />
          {spotifyEmbedUrl && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center transition-opacity">
              <Dialog open={isEmbedOpen} onOpenChange={setIsEmbedOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:text-white"
                  >
                    <Music className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{artist.name}</DialogTitle>
                    <DialogDescription>Escucha las canciones más populares de este artista</DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                      <iframe
                        style={{ borderRadius: "12px" }}
                        src={spotifyEmbedUrl}
                        width="100%"
                        height="352"
                        frameBorder="0"
                        allowFullScreen
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                      ></iframe>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        <p className="text-xs text-center font-medium mb-1">{artist.name}</p>

        {children}
      </CardContent>
    </Card>
  )
}