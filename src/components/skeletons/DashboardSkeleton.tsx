import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="glass glass-border rounded-[28px] p-6 lg:p-8">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="mt-4 h-10 w-2/3 rounded-xl" />
        <Skeleton className="mt-3 h-4 w-full rounded-lg" />
        <Skeleton className="mt-2 h-4 w-3/4 rounded-lg" />
        <Skeleton className="mt-6 h-14 w-64 rounded-2xl" />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="mt-3 h-5 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      </section>

      <section className="glass glass-border rounded-[28px] p-5">
        <Skeleton className="h-4 w-40 rounded-full" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border/60 bg-background/55 px-4 py-4">
              <Skeleton className="h-5 w-3/5 rounded-lg" />
              <Skeleton className="mt-2 h-3 w-2/3 rounded-lg" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
