import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { Toaster } from "@/components/ui/toaster";
import { Metadata, Viewport } from "next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  width: "device-width",
  height: "device-height",
  viewportFit: "cover",
  themeColor: "#0c0a09",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tiermyspot.vercel.app"),
  title: "Tiermyspot - Crea tierlists de tus artistas favoritos de Spotify",
  description:
    "Crea y comparte tier lists personalizadas con tus artistas más escuchados de Spotify. Público, privado o con amigos. by SergioLKG",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Tiermyspot - Crea tierlists de tus artistas favoritos de Spotify",
    description:
      "Crea y comparte tier lists personalizadas con tus artistas más escuchados de Spotify. Público, privado o con amigos. by SergioLKG",
    url: "https://tiermyspot.vercel.app",
    siteName: "Tiermyspot",
    images: [
      {
        url: "https://tiermyspot.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
      },
      {
        url: "/screenshot1.png", // Must be an absolute URL
        width: 1200,
        height: 630,
      },
      {
        url: "/screenshot2.png", // Must be an absolute URL
        width: 1200,
        height: 630,
      },
    ],
  },
  authors: [
    {
      name: "SergioLKG",
      url: "https://sergiodominguez.vercel.app",
    },
  ],
  creator: "SergioLKG",
  alternates: {
    canonical: "/",
    languages: {
      es: "/es",
      en: "/en",
    },
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiermyspot - Crea tierlists de tus artistas favoritos de Spotify",
    description:
      "Crea y comparte tier lists personalizadas con tus artistas más escuchados de Spotify. Público, privado o con amigos. by SergioLKG",
    creator: "@sergiolkg",
    images: ["/og-image.jpg"],
  },
  keywords: [
    "tierlist",
    "spotify",
    "spotify tierlist",
    "tierlist maker",
    "tierlist generator",
    "tierlist creator",
    "tierlist app",
    "tierlist online",
    "tierlist web",
    "tierlist website",
    "tierlist tool",
    "tierlist platform",
    "tierlist community",
    "tierlist social",
    "tierlist share",
    "tierlist shareable",
    "tierlist collaborative",
    "tierlist multiplayer",
    "tierlist friends",
    "tierlist private",
    "tierlist public",
    "tierlist group",
    "tierlist group maker",
    "tierlist group generator",
    "tierlist group creator",
    "tierlist group app",
    "tierlist group online",
    "tierlist group web",
    "tierlist group website",
    "tierlist group tool",
    "tierlist group platform",
    "tierlist group community",
    "tierlist group social",
    "tierlist group share",
    "tierlist group shareable",
    "tierlist group collaborative",
    "tierlist group multiplayer",
    "tierlist group friends",
    "tierlist group private",
    "tierlist group public",
    "tierlist group",
    "tierlist group tierlist",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
