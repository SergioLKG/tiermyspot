import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { Toaster } from "@/components/ui/toaster";
import { Metadata, Viewport } from "next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const title =
  "Tiermyspot - Crea tierlists de tus artistas favoritos de Spotify";
const description =
  "Crea y comparte tier lists personalizadas con tus artistas más escuchados de Spotify. Público, privado o con amigos. by Sergio Domínguez Pérez (SergioLKG)";

export const viewport: Viewport = {
  initialScale: 1,
  minimumScale: 0.7,
  maximumScale: 3,
  userScalable: true,
  width: "device-width",
  height: "device-height",
  viewportFit: "cover",
  themeColor: "#0c0a09",
  colorScheme: "dark",
  interactiveWidget: "overlays-content",
};

export const metadata: Metadata = {
  title: title,
  metadataBase: new URL("https://tiermyspot.vercel.app"),
  description: description,
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    url: "https://tiermyspot.vercel.app",
    type: "website",
    locale: "es-ES",
    title: title,
    siteName: "Tiermyspot",
    description: description,
    images: [
      {
        url: "https://tiermyspot.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
      },
      {
        url: "https://tiermyspot.vercel.app/screenshot1.png", // Must be an absolute URL
        width: 1200,
        height: 630,
      },
      {
        url: "https://tiermyspot.vercel.app/screenshot2.png", // Must be an absolute URL
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
    {
      name: "Sergio Domínguez Pérez",
      url: "https://sergiodominguez.vercel.app",
    },
  ],
  creator: "Sergio Domínguez Pérez",
  alternates: {
    media: {
      "image/png": "/screenshot.png",
      "image/jpg": "/og-image.jpg",
      "image/svg+xml": "/logo.svg",
      "image/icon": "/favicon.ico",
    },
    canonical: "/index",
    languages: {
      es: "/es",
      en: "/en",
    },
  },
  applicationName: "Tiermyspot",
  manifest: "/manifest.json",
  abstract: description,
  category: "funny",
  publisher: "Sergio Domínguez Pérez",
  classification: "Tierlist, Spotify, Social",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  referrer: "no-referrer",
  other: {
    "apple-mobile-web-app-title": title,
    "application-name": title,
    "msapplication-TileColor": "#0c0a09",
    "msapplication-TileImage": "/logo.svg",
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#0c0a09",
    "og:site_name": title,
    "og:locale": "es_ES",
    "og:type": "website",
    "og:description": description,
    "og:author": "Sergio Domínguez Pérez",
    "og:publisher": "Sergio Domínguez Pérez",
    "og:updated_time": new Date().toISOString(),
    "og:see_also": "https://sergiodominguez.vercel.app",
  },
  appleWebApp: {
    title: title,
    statusBarStyle: "default",
    capable: true,
    startupImage: "/logo.svg",
  },
  twitter: {
    title: title,
    card: "summary_large_image",
    creatorId: "@sergiolkg",
    siteId: "@sergiolkg",
    site: "@sergiolkg",
    creator: "@sergiolkg",
    description: description,
    images: ["https://tiermyspot.vercel.app/og-image.jpg"],
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
    "tierlist group tier list",
    "tierlist group tier list maker",
    "tierlist group tier list generator",
    "tierlist group tier list creator",
    "tierlist group tier list app",
    "tierlist group tier list online",
    "tierlist group tier list web",
  ],
  robots: {
    index: true,
    follow: true,
    nocache: false,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
    noarchive: false,
    noimageindex: false,
    nosnippet: false,
    notranslate: false,
    unavailable_after: "",
    indexifembedded: true,
    nositelinkssearchbox: false,
    googleBot: {
      index: true,
      indexifembedded: true,
      follow: true,
      nocache: false,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
      noarchive: false,
      noimageindex: false,
      nosnippet: false,
      notranslate: false,
      unavailable_after: "",
    },
  },
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
