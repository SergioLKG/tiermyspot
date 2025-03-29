import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Verificar las variables de entorno de Spotify
    const spotifyConfig = {
      clientId: process.env.SPOTIFY_CLIENT_ID ? "✓ Configurado" : "✗ No configurado",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ? "✓ Configurado" : "✗ No configurado",
      redirectUri: process.env.SPOTIFY_REDIRECT_URI || process.env.NEXTAUTH_URL + "/api/auth/callback/spotify",
      nextAuthUrl: process.env.NEXTAUTH_URL,
    }

    // Verificar la conexión a la API de Spotify
    let spotifyApiStatus = "No verificado"

    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      try {
        // Obtener un token de acceso
        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            grant_type: "client_credentials",
          }),
        })

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          spotifyApiStatus = "Conectado correctamente"

          // Verificar que podemos hacer una solicitud a la API
          const apiResponse = await fetch("https://api.spotify.com/v1/browse/new-releases?market=ES", {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          })

          if (apiResponse.ok) {
            spotifyApiStatus += " (API accesible)"
          } else {
            spotifyApiStatus += ` (Error en API: ${apiResponse.status} ${apiResponse.statusText})`
          }
        } else {
          spotifyApiStatus = `Error al obtener token: ${tokenResponse.status} ${tokenResponse.statusText}`
        }
      } catch (error) {
        spotifyApiStatus = `Error de conexión: ${error.message}`
      }
    }

    return NextResponse.json({
      success: true,
      spotifyConfig,
      spotifyApiStatus,
      message: "Para solucionar problemas de autenticación con Spotify:",
      pasos: [
        "1. Verifica que las credenciales de Spotify sean correctas",
        '2. Asegúrate de que la aplicación esté en modo "Development" y hayas añadido tu email como usuario de prueba, o cambia la aplicación a modo "Public"',
        "3. Verifica que las URLs de redirección en el Dashboard de Spotify incluyan:",
        `   - ${process.env.NEXTAUTH_URL}/api/auth/callback/spotify`,
        "   - http://localhost:3000/api/auth/callback/spotify (para desarrollo local)",
        "4. Asegúrate de que los scopes solicitados sean correctos",
      ],
    })
  } catch (error) {
    console.error("Error en la verificación de Spotify:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

