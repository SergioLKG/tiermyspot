import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-16 border-b bg-background" />
      <main className="flex-1 p-4 md:p-6 bg-muted/30">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>

          <div>
            <Skeleton className="h-5 w-36 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-8 flex-1 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
