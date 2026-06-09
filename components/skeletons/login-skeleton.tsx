import { Skeleton } from "@/components/ui/skeleton"

export function LoginSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </main>
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
