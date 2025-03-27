"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { extractPlaylistId } from "@/lib/spotify-api"
import { SpotifyButton } from "@/components/ui/spotify-button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function ImportPlaylistPage() {
  const { data: session, status } = useSession()
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [privatePlaylistName, setPrivatePlaylistName] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirigir al login si no hay sesión
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Verificar si hay parámetros de URL para playlist privada
  useEffect(() => {
    const pp = searchParams.get("pp")
    if (pp) {
      setIsPrivate(true)
      setPrivatePlaylistName(decodeURIComponent(pp))
    }

    // Verificar si hay una URL de playlist en los parámetros
    const playlistParam = searchParams.get("url")
    if (playlistParam) {
      setPlaylistUrl(decodeURIComponent(playlistParam))
    }
  }, [searchParams])

  const handleImportPlaylist = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // Verificar que tenemos una sesión con token de acceso
      if (!session?.accessToken) {
        throw new Error("No hay sesión activa con Spotify. Por favor, inicia sesión de nuevo.")
      }

      // Extraer ID de la playlist
      const playlistId = extractPlaylistId(playlistUrl)

      if (!playlistId) {
        throw new Error("URL de playlist inválida. Por favor, introduce un enlace de compartición de Spotify válido.")
      }

      // Enviar datos a la API
      const response = await fetch("/api/import-playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlistId,
          isPrivate,
          privatePlaylistName: isPrivate ? privatePlaylistName : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al importar la playlist")
      }

      const data = await response.json()

      setSuccess("¡Playlist importada correctamente! Redirigiendo...")

      // Redirigir a la página de tierlist
      setTimeout(() => {
        router.push("/tierlist?id=" + data.playlistId)
      }, 1500)
    } catch (err) {
      setError(err.message || "Error al importar la playlist. Por favor, inténtalo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  // Generar URL compartible
  const generateShareableUrl = () => {
    if (!playlistUrl) return ""

    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    let shareUrl = `${baseUrl}/import-playlist?url=${encodeURIComponent(playlistUrl)}`

    if (isPrivate && privatePlaylistName) {
      shareUrl += `&pp=${encodeURIComponent(privatePlaylistName)}`
    }

    return shareUrl
  }

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no hay sesión, mostrar botón para iniciar sesión con Spotify
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-muted/30">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>Iniciar sesión con Spotify</CardTitle>
            <CardDescription>
              Para importar playlists, necesitas iniciar sesión con tu cuenta de Spotify.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SpotifyButton onClick={() => signIn("spotify")} className="w-full">
              Iniciar sesión con Spotify
            </SpotifyButton>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header activePage="import" />

      <main className="flex-1 p-4 md:p-6 bg-muted/30">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Importar Playlist</h1>
            <p className="text-muted-foreground mt-2">
              Importa una playlist de Spotify para crear tu tierlist personalizada.
            </p>
          </div>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Importar Playlist de Spotify</CardTitle>
              <CardDescription>
                Introduce el enlace de compartición de una playlist de Spotify para importar los artistas y sus
                canciones.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleImportPlaylist}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="animate-in fade-in-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-50 text-green-800 border-green-200 animate-in fade-in-50">
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
                      className="h-4 w-4"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <AlertTitle>Éxito</AlertTitle>
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="playlist-url">URL de la Playlist</Label>
                  <Input
                    id="playlist-url"
                    placeholder="https://open.spotify.com/playlist/..."
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    className="bg-background"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Ejemplo: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="private-playlist"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="private-playlist">Crear playlist privada</Label>
                </div>

                {isPrivate && (
                  <div className="space-y-2">
                    <Label htmlFor="private-name">Nombre de la playlist privada</Label>
                    <Input
                      id="private-name"
                      placeholder="Ej: Festival con amigos"
                      value={privatePlaylistName}
                      onChange={(e) => setPrivatePlaylistName(e.target.value)}
                      className="bg-background"
                      required={isPrivate}
                    />
                    <p className="text-sm text-muted-foreground">
                      Este nombre se usará para identificar tu playlist privada.
                    </p>
                  </div>
                )}

                {playlistUrl && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                    <Label>URL para compartir</Label>
                    <div className="flex">
                      <Input value={generateShareableUrl()} readOnly className="bg-background" />
                      <Button
                        type="button"
                        variant="outline"
                        className="ml-2"
                        onClick={() => {
                          navigator.clipboard.writeText(generateShareableUrl())
                          alert("URL copiada al portapapeles")
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Comparte este enlace para que otros puedan importar la misma playlist.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    "Importar Playlist"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">Instrucciones</h2>
              <div className="bg-card rounded-lg border p-4 shadow-sm">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Abre Spotify y navega a la playlist que quieres importar.</li>
                  <li>
                    Haz clic en los tres puntos (...) y selecciona "Compartir" &gt; "Copiar enlace a la playlist".
                  </li>
                  <li>Pega el enlace en el campo de arriba y haz clic en "Importar Playlist".</li>
                  <li>Una vez importada, serás redirigido a tu tierlist donde podrás clasificar a los artistas.</li>
                </ol>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">Playlists Privadas</h2>
              <div className="bg-card rounded-lg border p-4 shadow-sm">
                <p className="mb-3">
                  Las playlists privadas te permiten crear tierlists compartidas solo con personas específicas:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
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
                      className="h-5 w-5 mr-2 text-green-500 flex-shrink-0 mt-0.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Marca la casilla "Crear playlist privada" y asigna un nombre único.</span>
                  </li>
                  <li className="flex items-start">
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
                      className="h-5 w-5 mr-2 text-green-500 flex-shrink-0 mt-0.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    <span>
                      Comparte el enlace generado con tus amigos para que puedan unirse a la misma playlist privada.
                    </span>
                  </li>
                  <li className="flex items-start">
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
                      className="h-5 w-5 mr-2 text-green-500 flex-shrink-0 mt-0.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    <span>
                      Las clasificaciones en playlists privadas solo se comparten entre quienes usan el mismo enlace.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

