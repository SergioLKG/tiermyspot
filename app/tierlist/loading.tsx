import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background" role="status" aria-live="polite">
      <header className="h-16 bg-card border-b flex items-center px-4 md:px-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </header>
      <main id="main-content" className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-green-600" />
          <p className="text-lg text-muted-foreground">Cargando tierlist...</p>
        </div>
      </main>
      <footer className="h-12 bg-card border-t" />
    </div>
  )
}
