"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react"

export function ArtistCard({ artist, currentTrackIndex = 0, playingTrackId = null, onPlay, onNext, onPrev, children }) {
  const [hasPreviewUrl, setHasPreviewUrl] = useState(false)

  // Verificar si el artista tiene al menos una pista con previewUrl
  useEffect(() => {
    if (artist.tracks && artist.tracks.length > 0) {
      const hasPreview = artist.tracks.some((track) => track.previewUrl)
      setHasPreviewUrl(hasPreview)
    }
  }, [artist])

  const currentTrack = artist.tracks && artist.tracks.length > 0 ? artist.tracks[currentTrackIndex] : null

  const isPlaying = playingTrackId === `${artist.id}_${currentTrack?.id}`
  const currentTrackHasPreview = currentTrack?.previewUrl ? true : false

  // Asegurarnos de que la imagen del artista sea válida
  const artistImage =
    artist.image ||
    "/placeholder.svg?height=100&width=100&text=" + encodeURIComponent(artist.name?.substring(0, 2) || "?")

  return (
    <Card className="w-[160px] transition-all hover:shadow-md">
      <CardContent className="p-3">
        <div
          className={`relative mb-2 group ${currentTrackHasPreview ? "cursor-pointer" : ""}`}
          onClick={() => currentTrackHasPreview && onPlay(artist, currentTrackIndex)}
        >
          <Image
            src={artistImage || "/placeholder.svg"}
            alt={artist.name}
            width={80}
            height={80}
            className="rounded-md mx-auto shadow-sm"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center transition-opacity">
            {currentTrackHasPreview && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:text-white"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-center font-medium mb-1">{artist.name}</p>

        {/* Track navigation and playback - solo mostrar si hay al menos una pista con previewUrl */}
        {hasPreviewUrl && artist.tracks && artist.tracks.length > 0 ? (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1 bg-muted/50 rounded-md px-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onPrev(artist.id)}
                disabled={artist.tracks.length <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-xs truncate max-w-[100px] text-center">{currentTrack?.name || "No track"}</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onNext(artist.id)}
                disabled={artist.tracks.length <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => currentTrackHasPreview && onPlay(artist, currentTrackIndex)}
              disabled={!currentTrackHasPreview}
            >
              {!currentTrackHasPreview ? (
                "No preview"
              ) : isPlaying ? (
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
        ) : (
          <div className="mt-2 text-xs text-center text-muted-foreground">No hay previsualizaciones disponibles</div>
        )}

        {children}
      </CardContent>
    </Card>
  )
}