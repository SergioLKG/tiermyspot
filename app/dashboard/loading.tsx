import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background" role="status" aria-live="polite">
      <header className="h-16 bg-card border-b flex items-center px-4 md:px-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </header>
      <main id="main-content" className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </main>
      <footer className="h-12 bg-card border-t" />
    </div>
  )
}
