import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: playlistIdStr } = await params;
    const playlistId = Number.parseInt(playlistIdStr);

    if (isNaN(playlistId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL!);

    const playlistRows = await sql`SELECT spotify_id, image FROM playlists WHERE id = ${playlistId}`;
    if (playlistRows.length === 0) {
      return NextResponse.json({ error: "Playlist no encontrada" }, { status: 404 });
    }

    const spotifyId = playlistRows[0].spotify_id;

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: "Error al obtener token de Spotify" }, { status: 502 });
    }

    const tokenData = await tokenResponse.json();

    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${spotifyId}?market=ES&fields=images`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!playlistResponse.ok) {
      return NextResponse.json({ image: "/placeholder.svg", stale: true });
    }

    const spotifyData = await playlistResponse.json();
    const newImage = spotifyData.images?.[0]?.url || "/placeholder.svg";

    await sql`UPDATE playlists SET image = ${newImage} WHERE id = ${playlistId}`;

    return NextResponse.json({ image: newImage });
  } catch (error: any) {
    console.error("Error al refrescar imagen:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
