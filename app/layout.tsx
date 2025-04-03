import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/session-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TierMySpot - Crea tierlists de tus artistas favoritos",
  description: "Crea y comparte tierlists de tus artistas favoritos de Spotify. Con todo el mundo, con tus amigos o en privado. by SergioLKG",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "TierMySpot - Crea tierlists de tus artistas favoritos",
    description: "Crea y comparte tierlists de tus artistas favoritos de Spotify. Con todo el mundo, con tus amigos o en privado. by SergioLKG",
    url: "https://tiermyspot.vercel.app",
    siteName: "TierMySpot",
    images: [
      {
        url: "/screenshot.png",
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
  twitter: {
    card: "summary_large_image",
    title: "TierMySpot - Crea tierlists de tus artistas favoritos",   
    description: "Crea y comparte tierlists de tus artistas favoritos de Spotify. Con todo el mundo, con tus amigos o en privado. by SergioLKG",
    creator: "@sergiolkg",
    images: ["/screenshot.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    minimumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({ children }) {
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
  )
}



import './globals.css'
import { Metadata } from "next"
