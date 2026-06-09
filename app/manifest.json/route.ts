import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      name: "Tiermyspot",
      short_name: "Tiermyspot",
      description: "Crea tierlists de tus artistas favoritos de Spotify",
      start_url: "/dashboard",
      display: "standalone",
      background_color: "#0c0a09",
      theme_color: "#0c0a09",
      orientation: "portrait-primary",
      lang: "es-ES",
      icons: [
        {
          src: "/logo.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any maskable",
        },
      ],
      categories: ["entertainment", "music", "social"],
      screenshots: [],
    },
    {
      headers: {
        "content-type": "application/manifest+json",
        "cache-control": "public, max-age=0, must-revalidate",
      },
    }
  );
}
