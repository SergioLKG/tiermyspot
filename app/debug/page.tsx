"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function DebugPage() {
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState(null);
  const [spotifyStatus, setSpotifyStatus] = useState(null);
  const [error, setError] = useState(null);

  const checkConnections = async () => {
    setLoading(true);
    setError(null);

    try {
      // Verificar la conexión a la base de datos
      const dbResponse = await fetch("/api/debug");
      const dbData = await dbResponse.json();
      setDbStatus(dbData);

      // Verificar la configuración de Spotify
      const spotifyResponse = await fetch("/api/spotify-check");
      const spotifyData = await spotifyResponse.json();
      setSpotifyStatus(spotifyData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnections();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Página de Diagnóstico</h1>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Verificando conexiones...</p>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          {/* Estado de la Base de Datos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {dbStatus?.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                )}
                Conexión a la Base de Datos
              </CardTitle>
              <CardDescription>
                Estado de la conexión a Neon Postgres
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dbStatus?.success ? (
                <div>
                  <p className="text-green-600 font-medium mb-2">
                    ✓ Conectado correctamente
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Hora del servidor: {dbStatus.time}
                  </p>
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Variables de entorno:</h4>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(dbStatus.envVars).map(([key, value]) => (
                        <li key={key} className="flex items-start">
                          <span className="font-mono bg-muted px-1 rounded mr-2">
                            {key}:
                          </span>
                          <span>{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-red-600 font-medium mb-2">
                    ✗ Error de conexión
                  </p>
                  <p className="text-sm bg-red-50 p-3 rounded border border-red-200">
                    {dbStatus?.error ||
                      "No se pudo conectar a la base de datos"}
                  </p>
                  <div className="mt-4 bg-amber-50 p-3 rounded border border-amber-200">
                    <h4 className="font-medium mb-2">Posibles soluciones:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>
                        Verifica que la variable de entorno
                        POSTGRES_DATABASE_URL esté configurada correctamente
                      </li>
                      <li>
                        Asegúrate de que la base de datos Neon esté activa y
                        accesible
                      </li>
                      <li>
                        Verifica que las credenciales de conexión sean correctas
                      </li>
                      <li>
                        Ejecuta el script de migración para crear las tablas
                        necesarias
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estado de Spotify */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {spotifyStatus?.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                )}
                Configuración de Spotify
              </CardTitle>
              <CardDescription>
                Estado de la conexión a la API de Spotify
              </CardDescription>
            </CardHeader>
            <CardContent>
              {spotifyStatus?.success ? (
                <div>
                  <p className="font-medium mb-2">
                    Estado de la API:{" "}
                    <span
                      className={
                        spotifyStatus.spotifyApiStatus.includes("Conectado")
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {spotifyStatus.spotifyApiStatus}
                    </span>
                  </p>

                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Configuración:</h4>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(spotifyStatus.spotifyConfig).map(
                        ([key, value]) => (
                          <li key={key} className="flex items-start">
                            <span className="font-mono bg-muted px-1 rounded mr-2">
                              {key}:
                            </span>
                            <span>{value}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
                    <h4 className="font-medium mb-2">Instrucciones:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {spotifyStatus.pasos.map((paso, index) => (
                        <li key={index}>{paso}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-red-600 font-medium mb-2">
                    ✗ Error de configuración
                  </p>
                  <p className="text-sm bg-red-50 p-3 rounded border border-red-200">
                    {spotifyStatus?.error ||
                      "No se pudo verificar la configuración de Spotify"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Button onClick={checkConnections} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            "Verificar de nuevo"
          )}
        </Button>
      </div>
    </div>
  );
}
