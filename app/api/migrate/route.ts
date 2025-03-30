import { type NextRequest, NextResponse } from "next/server"
import { migrateDatabase } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const password = url.searchParams.get("password")
    if (password !== process.env.NEXTAUTH_SECRET) {
      return NextResponse.json({ success: false, message: "Contraseña incorrecta" }, { status: 401 })
    }

    // Ejecutar la migración
    const result = await migrateDatabase()

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("Error al ejecutar migración:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}