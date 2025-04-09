"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, Import } from "lucide-react"

interface NoPlaylistModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NoPlaylistModal({ open, onOpenChange }: NoPlaylistModalProps) {
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            No hay playlist seleccionada
          </DialogTitle>
          <DialogDescription>
            Para ver una tierlist, primero debes seleccionar o importar una playlist.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="sm:flex-1"
            onClick={() => {
              onOpenChange(false)
              router.push("/dashboard")
            }}
            title="Ir al Dashboard"
            aria-label="Ir al Dashboard"
          >
            Ir al Dashboard
          </Button>
          <Button
            className="sm:flex-1"
            onClick={() => {
              onOpenChange(false)
              router.push("/import-playlist")
            }}
            title="Importar Playlist"
            aria-label="Importar Playlist"
          >
            <Import className="h-4 w-4 mr-2" />
            Importar Playlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

