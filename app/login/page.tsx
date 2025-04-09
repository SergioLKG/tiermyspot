"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { SpotifyButton } from "@/components/ui/spotify-button";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Footer } from "@/components/footer";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleSpotifyLogin = async () => {
    setIsLoading(true);
    await signIn("spotify", { callbackUrl: "/dashboard" });
  };

  // Función simplificada para el modo demo
  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    // Usar signIn con el proveedor de credenciales "demo-login"
    await signIn("demo-login", { callbackUrl: "/dashboard" });
  };

  // Show loading screen while checking session
  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Conectando con Spotify...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Logo />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Bienvenido a TierMySpot
            </CardTitle>
            <CardDescription className="text-center">
              Inicia sesión con tu cuenta de Spotify para crear tierlists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error de autenticación. Por favor, inténtalo de nuevo.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col space-y-2">
              <SpotifyButton
                onClick={handleSpotifyLogin}
                className="w-full py-6 text-base"
              >
                Iniciar sesión con Spotify
              </SpotifyButton>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    O
                  </span>
                </div>
              </div>

              <Button
                onClick={handleDemoLogin}
                variant="outline"
                className="w-full py-6 text-base"
                disabled={isDemoLoading}
              >
                {isDemoLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando modo demo...
                  </>
                ) : (
                  "Probar en modo demo"
                )}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Beneficios
                </span>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center">
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
                  className="h-4 w-4 mr-2 text-green-500"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Importa tus playlists de Spotify
              </li>
              <li className="flex items-center">
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
                  className="h-4 w-4 mr-2 text-green-500"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Escucha fragmentos de canciones
              </li>
              <li className="flex items-center">
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
                  className="h-4 w-4 mr-2 text-green-500"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Crea y comparte tus tierlists
              </li>
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Al iniciar sesión, aceptas nuestros términos de servicio y
              política de privacidad.
            </p>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
