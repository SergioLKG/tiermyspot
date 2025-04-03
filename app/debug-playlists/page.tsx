"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function DebugPlaylistsPage() {
  const { data: session, status } = useSession()
  const [debugInfo, setDebugInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fixResult, setFixResult] = useState(null)
  const [isFixing, setIsFixing] = useState(false)

  useEffect(() => {
    const fetchDebugInfo = async () => {
      if (status !== "authenticated") return

      try {
        setIsLoading(true)
        const response = await fetch("/api/debug-playlists")

        if (!response.ok) {
          throw new Error("Error al obtener información de depuración")
        }

        const data = await response.json()
        setDebugInfo(data)
      } catch (err) {
        console.error("Error:", err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDebugInfo()
  }, [status])

  const handleFixPlaylists = async () => {
    try {
      setIsFixing(true)
      const response = await fetch("/api/fix-playlists", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Error al corregir las playlists")
      }

      const result = await response.json()
      setFixResult(result)

      // Recargar la información de depuración
      const debugResponse = await fetch("/api/debug-playlists")
      if (debugResponse.ok) {
        const debugData = await debugResponse.json()
        setDebugInfo(debugData)
      }
    } catch (err) {
      console.error("Error al corregir playlists:", err)
      setFixResult({ success: false, error: err.message })
    } finally {
      setIsFixing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header activePage="debug" />
        <main className="flex-1 p-4 md:p-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Depuración de Playlists</h1>
            <div className="flex justify-center items-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="ml-2">Cargando información de depuración...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header activePage="debug" />
        <main className="flex-1 p-4 md:p-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Depuración de Playlists</h1>
            <div className="bg-destructive/10 p-6 rounded-lg border border-destructive/20">
              <h2 className="text-xl font-bold text-destructive mb-2">Error</h2>
              <p>{error}</p>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                Intentar de nuevo
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header activePage="debug" />
      <main className="flex-1 p-4 md:p-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Depuración de Playlists</h1>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Total de user_playlists: {debugInfo?.total || 0}</p>
              <p>Playlists que contienen tu usuario: {debugInfo?.matching || 0}</p>

              <div className="mt-4 flex gap-4">
                <Button onClick={() => window.location.reload()}>Actualizar información</Button>
                <Button variant="outline" onClick={handleFixPlaylists} disabled={isFixing}>
                  {isFixing ? "Corrigiendo..." : "Corregir arrays usersIds"}
                </Button>
              </div>

              {fixResult && (
                <div
                  className={`mt-4 p-4 rounded-lg ${fixResult.success ? "bg-green-100 border border-green-200" : "bg-red-100 border border-red-200"}`}
                >
                  {fixResult.success ? (
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <p>
                        Corrección completada. Se corrigieron {fixResult.fixed} de {fixResult.total} playlists.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      <p>Error al corregir playlists: {fixResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {debugInfo?.details && debugInfo.details.length > 0 ? (
            <div className="grid gap-4">
              <h2 className="text-xl font-bold">Detalles de las playlists</h2>
              {debugInfo.details.map((playlist, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="font-medium">UserPlaylist ID:</p>
                        <p>{playlist.id}</p>
                      </div>
                      <div>
                        <p className="font-medium">Playlist ID:</p>
                        <p>{playlist.playlistId}</p>
                      </div>
                      <div>
                        <p className="font-medium">Es privada:</p>
                        <p>{playlist.isPrivate ? "Sí" : "No"}</p>
                      </div>
                      <div>
                        <p className="font-medium">Nombre privado:</p>
                        <p>{playlist.privateName || "N/A"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-medium">IDs de usuarios:</p>
                        <p className="break-all">{JSON.stringify(playlist.usersIds)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No se encontraron playlists asociadas a tu usuario.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}