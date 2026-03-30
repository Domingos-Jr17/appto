import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceLoadingSkeleton() {
  return (
    <div className="flex flex-1 gap-3 bg-background p-3">
      <div className="glass glass-border hidden min-w-[240px] rounded-2xl p-4 lg:flex lg:w-[22%] lg:flex-col">
        <Skeleton className="h-10 w-full rounded-full" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
              <Skeleton className="h-4 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="mt-auto border-t border-border/60 pt-3">
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </div>

      <div className="glass glass-border flex min-w-0 flex-1 flex-col rounded-2xl p-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
        <div className="mt-4 flex-1 space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3 w-16 rounded-full" />
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-4/5 rounded-xl" />
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border/60 pt-3">
          <div className="flex gap-2">
            <Skeleton className="h-20 flex-1 rounded-2xl" />
            <Skeleton className="h-20 w-12 shrink-0 rounded-2xl" />
          </div>
          <Skeleton className="mt-2 h-3 w-20 rounded-full" />
        </div>
      </div>

      <div className="glass glass-border hidden flex-col rounded-2xl xl:flex xl:w-[380px]">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-3 w-full rounded-lg" />
          <Skeleton className="h-3 w-2/3 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
