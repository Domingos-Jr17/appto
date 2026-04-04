import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceLoadingSkeleton() {
  return (
    <div className="flex flex-1 gap-3 bg-background p-3">
      {/* Sidebar skeleton — matches AppSidebar */}
      <div className="hidden min-w-[220px] shrink-0 flex-col rounded-2xl border border-border/50 bg-card/50 lg:flex" style={{ width: 220 }}>
        <div className="shrink-0 border-b border-border/60 px-4 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-3.5 w-14 rounded-lg" />
              <Skeleton className="h-2.5 w-28 rounded-lg" />
            </div>
          </div>
          <Skeleton className="mt-4 h-11 w-full rounded-2xl" />
        </div>
        <div className="flex-1 px-3 py-4">
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <Skeleton className="h-3.5 flex-1 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat pane skeleton — matches ChatPane */}
      <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
          <Skeleton className="h-4 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <div className="flex-1 px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {/* Empty state skeleton */}
            <div className="flex flex-col items-center py-12 text-center">
              <Skeleton className="h-14 w-14 rounded-[1.4rem]" />
              <Skeleton className="mt-6 h-8 w-64 rounded-lg" />
              <Skeleton className="mt-3 h-4 w-96 rounded-lg" />
              <Skeleton className="mt-2 h-4 w-72 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="border-t border-border/60 bg-muted/30 px-4 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-border/50 bg-background/50 p-3">
              <div className="flex gap-2">
                <Skeleton className="h-[88px] flex-1 rounded-2xl" />
                <Skeleton className="h-[88px] w-12 shrink-0 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document pane skeleton — matches DocumentPane */}
      <div className="hidden w-[380px] shrink-0 flex-col rounded-2xl border border-border/50 bg-card/50 xl:flex xl:w-[420px]">
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-3">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4 space-y-3">
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-[420px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
