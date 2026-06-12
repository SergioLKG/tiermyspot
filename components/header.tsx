"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Import, AlertCircle, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

function NavLinks({ activePage, isDemo, session, onClickLink }: any) {
  return (
    <>
      <Link
        href="/dashboard"
        className={`text-sm font-medium transition-colors hover:text-primary ${
          activePage === "dashboard" ? "text-primary" : "text-muted-foreground"
        }`}
        onClick={onClickLink}
      >
        Dashboard
      </Link>
      <Link
        href="/tierlist"
        className={`text-sm font-medium transition-colors hover:text-primary ${
          activePage === "tierlist" ? "text-primary" : "text-muted-foreground"
        }`}
        onClick={onClickLink}
      >
        Mi Tierlist
      </Link>
      <Link
        href="/group-tierlist"
        className={`text-sm font-medium transition-colors hover:text-primary ${
          activePage === "group" ? "text-primary" : "text-muted-foreground"
        }`}
        onClick={onClickLink}
      >
        Tierlist Grupal
      </Link>

      {!isDemo ? (
        <Link
          href="/import-playlist"
          className={`text-sm font-medium transition-colors hover:text-primary ${
            activePage === "import" ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={onClickLink}
        >
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 w-full"
            title="Importar Playlist"
            aria-label="Importar Playlist"
          >
            <Import className="h-4 w-4" />
            <span>Importar Playlist</span>
          </Button>
        </Link>
      ) : null}

      {session?.user && (
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden rounded-full border shrink-0">
            <Image
              src={session.user.image || "/placeholder.svg"}
              alt={session.user.name || "Usuario"}
              fill
              className={
                session.user.image ? "object-cover" : "scale-150 object-cover"
              }
            />
          </div>
          <span className="text-sm font-medium">
            {session.user.name || "UnknownUser"}
            {isDemo && (
              <span className="ml-1 text-xs text-amber-500">(Demo)</span>
            )}
          </span>
        </div>
      )}
      {session && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </Button>
      )}
    </>
  );
}

export function Header({ activePage = "" }) {
  const { data: session } = useSession();
  const isDemo = session?.isDemo || false;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 lg:px-6">
        <Logo />

        {/* Desktop nav */}
        <nav className="ml-auto hidden sm:flex gap-4 sm:gap-6 items-center">
          <NavLinks activePage={activePage} isDemo={isDemo} session={session} />
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden ml-auto p-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="sm:hidden absolute top-14 left-0 right-0 z-50 border-b bg-background p-4 flex flex-col gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
            <NavLinks
              activePage={activePage}
              isDemo={isDemo}
              session={session}
              onClickLink={() => setMobileOpen(false)}
            />
          </nav>
        </>
      )}
    </header>
  );
}
