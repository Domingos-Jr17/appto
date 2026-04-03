"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { DocumentPreview } from "./DocumentPreview";
import { CoverModal } from "./CoverModal";
import { EditorLink } from "./EditorLink";
import type { WorkspaceData } from "@/types/workspace";
import type { AcademicEducationLevel, ProjectBrief } from "@/types/editor";

function isCoverIncomplete(brief?: ProjectBrief | null): boolean {
  if (!brief) return true;
  const essentials = [brief.institutionName, brief.studentName, brief.advisorName].filter(Boolean);
  return essentials.length < 2;
}

interface WorkspaceLayoutProps {
  initialData: WorkspaceData;
}

export function WorkspaceLayout({ initialData }: WorkspaceLayoutProps) {
  const workspace = useWorkspace({ initialData });
  const [coverSheetOpen, setCoverSheetOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    plan: string;
    remaining: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/subscription")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.subscription) {
          const sub = data.data.subscription;
          setSubscriptionStatus({
            plan: sub.plan,
            remaining: sub.remaining,
            total: sub.worksPerMonth,
          });
        }
      })
      .catch(() => {
        // silent — subscription info is optional
      });
  }, []);

  return (
    <>
      {workspace.error && (
        <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {workspace.error}
        </div>
      )}

      <div className="flex h-[calc(100dvh)] flex-col">
        <WorkspaceHeader
          title={workspace.data?.brief?.title ?? ''}
          workType={workspace.data?.brief?.workType ?? 'monografia'}
          progress={workspace.progress}
          generationProgress={workspace.data?.generationProgress ?? 0}
          generationStep={workspace.data?.generationStep ?? null}
          isGenerating={workspace.isGenerating}
          allDone={workspace.allDone}
          sections={workspace.data?.sections ?? []}
          subscriptionStatus={subscriptionStatus ?? undefined}
          onGenerate={workspace.generateAll}
          onDownload={workspace.downloadDocx}
          onEditCover={() => setCoverSheetOpen(true)}
          onSaveTitle={workspace.updateTitle}
          coverIncomplete={isCoverIncomplete(workspace.data?.brief)}
        />

        <div className="flex-1 overflow-y-auto pb-16">
          <div
            className={cn(
              "transition-[margin] duration-300 ease-in-out",
              coverSheetOpen ? "mr-0 sm:mr-[28rem]" : "mr-0"
            )}
          >
            <DocumentPreview
              sections={workspace.data?.sections ?? []}
              isGenerating={workspace.isGenerating}
            />
          </div>
        </div>

        <EditorLink workId={workspace.data?.id ?? ''} />

        <CoverModal
          open={coverSheetOpen}
          brief={workspace.data?.brief ?? {
            title: '',
            workType: 'monografia',
            theme: '',
            educationLevel: 'HIGHER_EDUCATION',
            coverTemplate: 'UEM_STANDARD',
          }}
          currentTemplate={workspace.data?.brief?.coverTemplate ?? 'UEM_STANDARD'}
          educationLevel={workspace.data?.brief?.educationLevel as AcademicEducationLevel | undefined}
          onSelect={workspace.setCoverTemplate}
          onSaveBrief={workspace.saveBrief}
          onClose={() => setCoverSheetOpen(false)}
        />
      </div>
    </>
  );
}