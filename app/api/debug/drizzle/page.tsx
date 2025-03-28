import { type NextRequest, NextResponse } from "next/server"
import { getDbConnection, users } from "@/lib/db"
import { sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email") || "test@example.com"

    // Obtener la conexión a la base de datos
    const db = getDbConnection()

    // Ejecutar una consulta simple
    const result = await db.select().from(users).where(sql`${users.email} = ${email}`)

    // Devolver el resultado
    return NextResponse.json({
      success: true,
      query: `SELECT * FROM users WHERE email = '${email}'`,
      result: result.length > 0 ? result[0] : null,
      message: result.length > 0 ? "Usuario encontrado correctamente" : "No se encontró ningún usuario con ese email",
    })
  } catch (error) {
    console.error("Error en la depuración de Drizzle:", error)

    // Devolver información detallada sobre el error
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        tip: "Verifica la sintaxis de tus consultas Drizzle. Usa sql`` directamente en where, no funciones de callback.",
      },
      { status: 500 },
    )
  }
}