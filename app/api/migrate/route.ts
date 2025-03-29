import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const password = url.searchParams.get("password");
    if (password !== process.env.NEXTAUTH_SECRET) {
      return NextResponse.json({ success: false, message: "Contraseña incorrecta" }, { status: 401 });
    }

    const sql = neon(process.env.POSTGRES_DATABASE_URL!)

    // Ejecutar el script de migración
    await sql`
      -- Crear tabla temporal para guardar datos de playlists
      CREATE TABLE IF NOT EXISTS temp_playlists AS SELECT * FROM playlists;

      -- Crear tabla temporal para guardar datos de rankings
      CREATE TABLE IF NOT EXISTS temp_rankings AS SELECT * FROM rankings;

      -- Crear tabla temporal para guardar relaciones usuario-playlist
      CREATE TABLE IF NOT EXISTS temp_user_playlists AS SELECT * FROM user_playlists;

      -- Eliminar tablas existentes que vamos a reestructurar
      DROP TABLE IF EXISTS rankings;
      DROP TABLE IF EXISTS playlist_artists;
      DROP TABLE IF EXISTS user_playlists;
      DROP TABLE IF EXISTS playlists;

      -- Crear nueva tabla de playlists (solo información básica)
      CREATE TABLE playlists (
        id SERIAL PRIMARY KEY,
        spotify_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Crear nueva tabla de tierlists (valoraciones de usuarios)
      CREATE TABLE tierlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        playlist_id INTEGER NOT NULL,
        is_private BOOLEAN DEFAULT FALSE,
        private_name TEXT,
        ratings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, playlist_id, private_name)
      );

      -- Crear nueva tabla de tierlists grupales
      CREATE TABLE group_tierlists (
        id SERIAL PRIMARY KEY,
        playlist_id INTEGER NOT NULL,
        private_name TEXT,
        aggregated_ratings JSONB DEFAULT '{}',
        user_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(playlist_id, private_name)
      );

      -- Crear nueva tabla de relaciones usuario-playlist
      CREATE TABLE user_playlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        playlist_id INTEGER NOT NULL,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, playlist_id)
      );

      -- Migrar datos de playlists
      INSERT INTO playlists (id, spotify_id, name, description, image, created_at)
      SELECT id, spotify_id, name, description, image, created_at
      FROM temp_playlists;

      -- Migrar datos de user_playlists
      INSERT INTO user_playlists (id, user_id, playlist_id, is_hidden, created_at)
      SELECT id, user_id, playlist_id, is_hidden, created_at
      FROM temp_user_playlists;

      -- Migrar datos de rankings a tierlists
      -- Primero, crear tierlists para cada combinación única de usuario y playlist
      INSERT INTO tierlists (user_id, playlist_id, is_private, private_name, created_at, updated_at)
      SELECT DISTINCT r.user_id, r.playlist_id, 
        COALESCE(p.is_private, FALSE) as is_private, 
        p.private_playlist_name as private_name,
        MIN(r.created_at) as created_at,
        MAX(r.updated_at) as updated_at
      FROM temp_rankings r
      JOIN temp_playlists p ON r.playlist_id = p.id
      GROUP BY r.user_id, r.playlist_id, p.is_private, p.private_playlist_name;

      -- Luego, actualizar los ratings como JSONB
      UPDATE tierlists t
      SET ratings = (
        SELECT jsonb_object_agg(r.artist_id::text, r.tier_id)
        FROM temp_rankings r
        WHERE r.user_id = t.user_id AND r.playlist_id = t.playlist_id
      );

      -- Crear registros iniciales para group_tierlists
      INSERT INTO group_tierlists (playlist_id, private_name)
      SELECT DISTINCT playlist_id, private_name
      FROM tierlists;
    `

    return NextResponse.json({ success: true, message: "Migración completada correctamente" })
  } catch (error) {
    console.error("Error al ejecutar migración:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}