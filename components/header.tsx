"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, Import } from "lucide-react"
import { Logo } from "@/components/logo"

export function Header({ activePage = "" }) {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 lg:px-6">
        <Logo />
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link
            href="/dashboard"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              activePage === "dashboard" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/tierlist"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              activePage === "tierlist" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Mi Tierlist
          </Link>
          <Link
            href="/group-tierlist"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              activePage === "group" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Tierlist Grupal
          </Link>
          <Link
            href="/import-playlist"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              activePage === "import" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Import className="h-4 w-4" />
              <span className="hidden sm:inline-block">Importar Playlist</span>
            </Button>
          </Link>
          {session?.user && (
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-full border">
                <Image
                  src={session.user.image || "/placeholder.svg"}
                  alt={session.user.name || "Usuario"}
                  fill
                  className="scale-150 object-cover"
                />
              </div>
              <span className="text-sm font-medium hidden sm:inline-block">{session.user.name || "UnknownUser"}</span>
            </div>
          )}
          {session && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline-block">Cerrar sesión</span>
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}

