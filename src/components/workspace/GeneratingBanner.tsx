"use client";

interface GeneratingBannerProps {
  isGenerating: boolean;
  progress: number;
  generationStep: string | null;
}

export function GeneratingBanner({
  isGenerating,
  progress,
  generationStep,
}: GeneratingBannerProps) {
  if (!isGenerating) return null;

  return (
    <div className="border-b border-warning/30 bg-warning/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-warning/40 border-t-warning" />
        <div className="flex-1">
          <p className="text-xs font-medium text-foreground">
            A gerar o teu trabalho...
          </p>
          {generationStep && (
            <p className="text-[10px] text-muted-foreground">
              {generationStep}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-warning">
          {progress}%
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-warning/15">
        <div
          className="h-full rounded-full bg-warning transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
