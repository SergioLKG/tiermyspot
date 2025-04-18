import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    // Buscar ?password= en los parametros de la url, y comparar contra MIGRATION_PASSWORD en el .env
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("password");
  
    if (password !== process.env.NEXTAUTH_SECRET) {
      return NextResponse.json(
        {
          success: false,
          error: "Contraseña incorrecta. No se puede realizar la migración.",
        },
        { status: 401 }
      );
    }

    // Verificar las variables de entorno
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL

    if (!connectionString) {
      return NextResponse.json(
        {
          success: false,
          error: "No se ha proporcionado una cadena de conexión a la base de datos",
          envVars: {
            POSTGRES_DATABASE_URL: process.env.POSTGRES_DATABASE_URL ? "✓ Configurado" : "✗ No configurado",
            DATABASE_URL: process.env.DATABASE_URL ? "✓ Configurado" : "✗ No configurado",
            NEXTAUTH_URL: process.env.NEXTAUTH_URL || "No configurado",
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✓ Configurado" : "✗ No configurado",
            SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? "✓ Configurado" : "✗ No configurado",
            SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? "✓ Configurado" : "✗ No configurado",
          },
        },
        { status: 400 },
      )
    }

    // Verificar la conexión a la base de datos
    const sql = neon(connectionString)
    const result = await sql`SELECT NOW() as time`

    return NextResponse.json({
      success: true,
      time: result[0].time,
      envVars: {
        POSTGRES_DATABASE_URL: "✓ Configurado (valor oculto por seguridad)",
        DATABASE_URL: process.env.DATABASE_URL ? "✓ Configurado (valor oculto por seguridad)" : "✗ No configurado",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✓ Configurado" : "✗ No configurado",
        SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? "✓ Configurado" : "✗ No configurado",
        SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? "✓ Configurado" : "✗ No configurado",
      },
    })
  } catch (error) {
    console.error("Error en la depuración:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        envVars: {
          POSTGRES_DATABASE_URL: process.env.POSTGRES_DATABASE_URL
            ? "✓ Configurado (pero hay un error)"
            : "✗ No configurado",
          DATABASE_URL: process.env.DATABASE_URL ? "✓ Configurado (pero hay un error)" : "✗ No configurado",
          NEXTAUTH_URL: process.env.NEXTAUTH_URL || "No configurado",
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✓ Configurado" : "✗ No configurado",
          SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? "✓ Configurado" : "✗ No configurado",
          SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? "✓ Configurado" : "✗ No configurado",
        },
      },
      { status: 500 },
    )
  }
}