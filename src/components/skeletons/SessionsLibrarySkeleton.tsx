import { Skeleton } from "@/components/ui/skeleton";

export function SessionsLibrarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass glass-border shadow-soft rounded-2xl p-5">
        <Skeleton className="h-6 w-40 rounded-lg" />
        <Skeleton className="mt-3 h-4 w-64 rounded-lg" />
      </div>
      <div className="glass glass-border shadow-soft rounded-2xl p-5">
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="glass glass-border shadow-soft rounded-2xl p-5">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="mt-4 h-6 w-3/4 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-full rounded-lg" />
            <Skeleton className="mt-6 h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
