import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceLoadingSkeleton() {
  return (
    <div className="flex flex-1 gap-3 bg-background p-3">
      <div className="glass glass-border shadow-soft hidden min-w-[240px] rounded-2xl p-4 lg:block lg:w-[22%]">
        <Skeleton className="h-10 w-full rounded-full" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="glass glass-border shadow-soft flex-1 rounded-2xl p-4">
        <Skeleton className="h-11 w-1/2 rounded-xl" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      <div className="glass glass-border shadow-soft hidden rounded-2xl p-4 xl:block xl:w-[30%]">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
