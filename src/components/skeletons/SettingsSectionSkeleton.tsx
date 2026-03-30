import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSectionSkeleton({ variant = "profile" }: { variant?: "profile" | "preferences" | "security" | "account" }) {
  if (variant === "profile") {
    return (
      <div className="space-y-6 py-2">
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3 w-48 rounded-lg" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded-lg" />
            <Skeleton className="h-10 w-full max-w-md rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-12 rounded-lg" />
            <Skeleton className="h-10 w-full max-w-md rounded-lg" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 p-4">
            <Skeleton className="h-3 w-20 rounded-lg" />
            <Skeleton className="mt-2 h-5 w-16 rounded-lg" />
          </div>
          <div className="rounded-xl border border-border/60 p-4">
            <Skeleton className="h-3 w-16 rounded-lg" />
            <Skeleton className="mt-2 h-5 w-20 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "preferences") {
    return (
      <div className="space-y-6 py-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36 rounded-lg" />
              <Skeleton className="h-3 w-52 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded-lg" />
          <Skeleton className="h-5 w-full max-w-sm rounded-lg" />
        </div>
      </div>
    );
  }

  if (variant === "security") {
    return (
      <div className="space-y-6 py-2">
        <div className="space-y-4">
          <Skeleton className="h-5 w-36 rounded-lg" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-lg" />
              <Skeleton className="h-10 w-full max-w-md rounded-lg" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border/60 p-4">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <Skeleton className="mt-2 h-3 w-48 rounded-lg" />
          <Skeleton className="mt-4 h-9 w-24 rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-32 rounded-lg" />
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between rounded-xl border border-border/60 p-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40 rounded-lg" />
                <Skeleton className="h-3 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border/60 p-4">
            <Skeleton className="h-3 w-20 rounded-lg" />
            <Skeleton className="mt-2 h-5 w-24 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border/60 p-4">
        <Skeleton className="h-5 w-24 rounded-lg" />
        <Skeleton className="mt-2 h-3 w-52 rounded-lg" />
        <Skeleton className="mt-4 h-9 w-32 rounded-full" />
      </div>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <Skeleton className="h-5 w-28 rounded-lg" />
        <Skeleton className="mt-2 h-3 w-full max-w-sm rounded-lg" />
        <Skeleton className="mt-4 h-9 w-24 rounded-full" />
      </div>
    </div>
  );
}
