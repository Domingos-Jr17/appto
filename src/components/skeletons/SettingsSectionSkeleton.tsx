import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSectionSkeleton() {
  return (
    <div className="space-y-6 py-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        </div>
      ))}
    </div>
  );
}
