"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import html2canvas from "html2canvas"

interface CaptureTierlistProps {
  targetRef: React.RefObject<HTMLElement>
  filename?: string
}

export function CaptureTierlist({ targetRef, filename = "tierlist" }: CaptureTierlistProps) {
  const [isCapturing, setIsCapturing] = useState(false)

  const handleCapture = async () => {
    if (!targetRef.current) return

    try {
      setIsCapturing(true)

      // Capturar el elemento
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: "#ffffff",
        scale: 2, // Mayor calidad
        useCORS: true, // Permitir imágenes de otros dominios
        logging: false,
        allowTaint: true,
      })

      // Convertir a imagen
      const image = canvas.toDataURL("image/png")

      // Crear enlace de descarga
      const link = document.createElement("a")
      link.href = image
      link.download = `${filename}-${new Date().toISOString().split("T")[0]}.png`

      // Simular clic para descargar
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error al capturar la tierlist:", error)
      alert("Hubo un error al capturar la tierlist. Por favor, intenta de nuevo.")
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <Button onClick={handleCapture} disabled={isCapturing} variant="outline" className="flex items-center gap-2">
      {isCapturing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Capturando...</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span>Guardar como imagen</span>
        </>
      )}
    </Button>
  )
}