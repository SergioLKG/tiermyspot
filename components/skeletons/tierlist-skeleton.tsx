import { Skeleton } from "@/components/ui/skeleton"

const TIERS = [
  { id: "S", color: "bg-red-100 dark:bg-red-900" },
  { id: "A", color: "bg-orange-100 dark:bg-orange-900" },
  { id: "B", color: "bg-yellow-100 dark:bg-yellow-900" },
  { id: "C", color: "bg-green-100 dark:bg-green-900" },
  { id: "D", color: "bg-blue-100 dark:bg-blue-900" },
  { id: "F", color: "bg-purple-100 dark:bg-purple-900" },
]

export function TierlistSkeleton({ isGroup = false }: { isGroup?: boolean }) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-16 border-b bg-background" />
      <main className="flex-1 p-4 md:p-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-6 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isGroup && <Skeleton className="h-8 w-48 rounded-full" />}
              <Skeleton className="h-8 w-32 rounded-md" />
              <Skeleton className="h-8 w-36 rounded-md" />
            </div>
          </div>

          <div className="grid gap-4">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`${tier.color} rounded-lg p-4 border border-transparent`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-md shrink-0" />
                  <div className="flex flex-wrap gap-3">
                    {Array.from({ length: (tier.id.charCodeAt(0) % 3) + 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 w-28 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Skeleton className="h-7 w-48 mb-4" />
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-28 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </main>
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
