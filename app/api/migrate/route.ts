import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  // Buscar ?password= en los parametros de la url, y comparar contra MIGRATION_PASSWORD en el .env
  const { searchParams } = new URL(request.url)
  const password = searchParams.get("password");

  if (password !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json(
      {
        success: false,
        error: "Contraseña incorrecta. No se puede realizar la migración.",
      },
      { status: 401 },
    )
  }

  try {
    const sql = neon(process.env.POSTGRES_DATABASE_URL!)

    // Crear tabla de usuarios
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        image TEXT,
        spotify_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `

    // Crear tabla de playlists
    await sql`
      CREATE TABLE IF NOT EXISTS playlists (
        id SERIAL PRIMARY KEY,
        spotify_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        is_private BOOLEAN DEFAULT FALSE,
        private_playlist_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `

    // Crear tabla de relación usuario-playlist
    await sql`
      CREATE TABLE IF NOT EXISTS user_playlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        playlist_id INTEGER NOT NULL,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `

    // Crear tabla de artistas
    await sql`
      CREATE TABLE IF NOT EXISTS artists (
        id SERIAL PRIMARY KEY,
        spotify_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        image TEXT
      );
    `

    // Crear tabla de relación playlist-artista
    await sql`
      CREATE TABLE IF NOT EXISTS playlist_artists (
        id SERIAL PRIMARY KEY,
        playlist_id INTEGER NOT NULL,
        artist_id INTEGER NOT NULL
      );
    `

    // Crear tabla de pistas
    await sql`
      CREATE TABLE IF NOT EXISTS tracks (
        id SERIAL PRIMARY KEY,
        spotify_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        preview_url TEXT,
        album_name TEXT,
        album_image TEXT,
        artist_id INTEGER NOT NULL
      );
    `

    // Crear tabla de rankings
    await sql`
      CREATE TABLE IF NOT EXISTS rankings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        playlist_id INTEGER NOT NULL,
        artist_id INTEGER NOT NULL,
        tier_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `

    return NextResponse.json({ success: true, message: "Tablas creadas correctamente" })
  } catch (error) {
    console.error("Error al crear tablas:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

