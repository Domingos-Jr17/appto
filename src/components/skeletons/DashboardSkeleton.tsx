import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="glass glass-border rounded-2xl p-6 lg:p-8">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32 rounded-full" />
            <Skeleton className="h-10 w-3/4 rounded-xl" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
          <div className="mt-8 rounded-xl border border-border/60 p-5">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="mt-3 h-8 w-3/5 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-full rounded-lg" />
            <Skeleton className="mt-2 h-4 w-1/2 rounded-lg" />
            <div className="mt-5 flex items-center gap-3">
              <Skeleton className="h-10 w-36 rounded-full" />
            </div>
          </div>
        </div>

        <div className="glass glass-border rounded-2xl p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="glass glass-border rounded-xl p-4">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="mt-3 h-8 w-16 rounded-lg" />
                <Skeleton className="mt-2 h-3 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <div className="glass glass-border rounded-2xl p-5">
            <Skeleton className="h-6 w-44 rounded-lg" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border/60 p-4">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="mt-3 h-5 w-2/3 rounded-lg" />
                  <Skeleton className="mt-2 h-3 w-1/2 rounded-lg" />
                  <Skeleton className="mt-3 h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass glass-border rounded-2xl p-5">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-border/60 p-4">
                <Skeleton className="h-4 w-32 rounded-lg" />
                <Skeleton className="mt-2 h-3 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
