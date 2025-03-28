import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

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

    const sql = neon(process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL || "");

    // Verificar la conexión a la base de datos
    const result = await sql`SELECT NOW() as time`;

    // Verificar las variables de entorno (sin mostrar valores completos por seguridad)
    const envVars = {
      POSTGRES_DATABASE_URL: process.env.POSTGRES_DATABASE_URL
        ? "✓ Configurado"
        : "✗ No configurado",
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID
        ? "✓ Configurado"
        : "✗ No configurado",
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET
        ? "✓ Configurado"
        : "✗ No configurado",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET
        ? "✓ Configurado"
        : "✗ No configurado",
      SPOTIFY_REDIRECT_URI:
        process.env.SPOTIFY_REDIRECT_URI || "No configurado (opcional)",
    };

    return NextResponse.json({
      success: true,
      dbConnection: "Conectado correctamente",
      time: result[0].time,
      envVars,
    });
  } catch (error) {
    console.error("Error en la depuración:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
