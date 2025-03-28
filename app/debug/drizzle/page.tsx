"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function DrizzleDebugPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("test@example.com");

  const testDrizzleQuery = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/debug/drizzle?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || "Error desconocido");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Depuración de Drizzle ORM</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Probar consulta de Drizzle</CardTitle>
          <CardDescription>
            Esta herramienta te permite probar una consulta simple de Drizzle
            para verificar que la conexión y la sintaxis funcionan
            correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email para buscar:</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Introduce un email para buscar"
              />
              <p className="text-xs text-muted-foreground">
                Esto ejecutará una consulta simple para buscar un usuario por
                email.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  <div className="font-mono text-xs whitespace-pre-wrap">
                    {error}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-2">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="font-medium">
                    Consulta ejecutada correctamente
                  </span>
                </div>

                <div className="bg-muted p-3 rounded-md">
                  <h4 className="font-medium mb-2">Resultado:</h4>
                  <pre className="text-xs overflow-auto max-h-60">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={testDrizzleQuery} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando consulta...
              </>
            ) : (
              "Probar consulta"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de depuración de Drizzle</CardTitle>
          <CardDescription>
            Consejos para solucionar problemas comunes con Drizzle ORM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">
                Sintaxis correcta para consultas
              </h3>
              <div className="bg-muted p-3 rounded-md">
                <pre className="text-xs">
                  {`// Forma correcta de usar where con sql
const result = await db
  .select()
  .from(users)
  .where(sql\`\${users.email} = \${email}\`)

// NO usar funciones de callback en where
// Esto causará el error "t is not a function"
// ❌ INCORRECTO:
const result = await db
  .select()
  .from(users)
  .where(sql => sql\`\${users.email} = \${email}\`)
`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Problemas comunes</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <span className="font-medium">
                    Error "t is not a function"
                  </span>
                  : Este error ocurre cuando se usa una función de callback en
                  el método where. Usa directamente sql`` en lugar de una
                  función de callback.
                </li>
                <li>
                  <span className="font-medium">
                    Error "Converting circular structure to JSON"
                  </span>
                  : Esto ocurre cuando se intenta serializar objetos de Drizzle
                  que contienen referencias circulares. Usa la función
                  safeSerialize para limpiar los objetos antes de devolverlos.
                </li>
                <li>
                  <span className="font-medium">
                    Error "No database connection string was provided"
                  </span>
                  : Asegúrate de que la variable de entorno
                  POSTGRES_DATABASE_URL o DATABASE_URL esté configurada
                  correctamente.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
