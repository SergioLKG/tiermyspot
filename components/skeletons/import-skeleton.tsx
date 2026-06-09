import { Skeleton } from "@/components/ui/skeleton"

export function ImportSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-16 border-b bg-background" />
      <main className="flex-1 p-4 md:p-6 bg-muted/30 flex items-center justify-center">
        <div className="w-full max-w-lg space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </main>
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
