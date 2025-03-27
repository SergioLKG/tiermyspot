"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Logo } from "@/components/logo"
import { Footer } from "@/components/footer"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const errorDescription = getErrorDescription(error)

  // Log the error for debugging
  useEffect(() => {
    console.error("Authentication error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Logo />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center text-destructive mb-2">
              <AlertCircle className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Error de autenticación</CardTitle>
            <CardDescription className="text-center">
              Ha ocurrido un problema al intentar iniciar sesión
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 p-4 rounded-md text-destructive text-sm">
              <p className="font-medium">Error: {errorDescription.title}</p>
              <p className="mt-2">{errorDescription.message}</p>
              <p className="mt-2 text-xs">Código de error: {error}</p>
            </div>
            <div className="bg-amber-50 text-amber-800 p-4 rounded-md text-sm">
              <p className="font-medium">Posibles soluciones:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Asegúrate de que estás usando la cuenta correcta de Spotify</li>
                <li>Intenta cerrar sesión en Spotify y volver a iniciar sesión</li>
                <li>Limpia las cookies y caché de tu navegador</li>
                <li>Si acabas de crear la cuenta, espera unos minutos e intenta de nuevo</li>
                <li>Verifica que tu cuenta de Spotify esté completamente configurada</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Link href="/login" className="w-full">
              <Button className="w-full">Volver a intentar</Button>
            </Link>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center w-full mt-2"
            >
              Volver al inicio
            </Link>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </div>
  )
}

function getErrorDescription(errorCode: string | null) {
  switch (errorCode) {
    case "Configuration":
      return {
        title: "Error de configuración",
        message: "Hay un problema con la configuración del servidor. Por favor, contacta al administrador.",
      }
    case "AccessDenied":
      return {
        title: "Acceso denegado",
        message: "No tienes permiso para acceder a este recurso o has rechazado los permisos necesarios.",
      }
    case "Verification":
      return {
        title: "Error de verificación",
        message: "El enlace de verificación ha expirado o ya ha sido utilizado.",
      }
    case "OAuthSignin":
      return {
        title: "Error de inicio de sesión con OAuth",
        message: "Hubo un problema al iniciar sesión con Spotify. Intenta de nuevo o usa otra cuenta.",
      }
    case "OAuthCallback":
      return {
        title: "Error de callback OAuth",
        message:
          "Hubo un problema al procesar la respuesta de Spotify. Esto puede ocurrir si la cuenta es nueva o si hay problemas con los permisos.",
      }
    case "OAuthCreateAccount":
      return {
        title: "Error al crear cuenta",
        message: "No se pudo crear una cuenta con las credenciales proporcionadas.",
      }
    case "EmailCreateAccount":
      return {
        title: "Error al crear cuenta",
        message: "No se pudo crear una cuenta con el email proporcionado.",
      }
    case "Callback":
      return {
        title: "Error de callback",
        message: "Hubo un problema al procesar la autenticación.",
      }
    case "OAuthAccountNotLinked":
      return {
        title: "Cuenta no vinculada",
        message: "Esta cuenta ya está asociada con otro método de inicio de sesión.",
      }
    case "SessionRequired":
      return {
        title: "Sesión requerida",
        message: "Debes iniciar sesión para acceder a este recurso.",
      }
    default:
      return {
        title: "Error desconocido",
        message: "Ha ocurrido un error inesperado durante la autenticación. Por favor, intenta de nuevo.",
      }
  }
}

