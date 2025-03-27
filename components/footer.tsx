import Link from "next/link"
import { Logo } from "@/components/logo"

export function Footer() {
  return (
    <footer className="w-full border-t py-6 px-4 md:px-6">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
          <Logo size="small" />
          <p className="text-xs text-muted-foreground mt-2">
            © {new Date().getFullYear()} TierMySpot. Todos los derechos reservados.
          </p>
        </div>
        <div className="flex gap-6">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Inicio
          </Link>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link
            href="/import-playlist"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Importar Playlist
          </Link>
          <a
            href="https://github.com/yourusername/tiermyspot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}

