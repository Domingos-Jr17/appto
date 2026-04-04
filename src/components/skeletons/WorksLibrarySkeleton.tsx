import { Skeleton } from "@/components/ui/skeleton";

export function WorksLibrarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <Skeleton className="mt-3 h-3 w-64 rounded-lg" />
      </div>
      <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border/50 bg-card/50 p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <Skeleton className="mt-4 h-5 w-3/4 rounded-lg" />
            <Skeleton className="mt-2 h-3 w-full rounded-lg" />
            <Skeleton className="mt-1 h-3 w-2/3 rounded-lg" />
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
            <div className="mt-4 flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
