import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeStoredContent } from "@/lib/content";
import { getWorkGenerationStatusAsync } from "@/lib/work-generation-jobs";
import type {
    WorkspaceData,
    WorkSection,
    SectionStatus,
} from "@/types/workspace";

function deriveStatus(
    content: string | null,
    wordCount: number,
    isGenerating: boolean,
): SectionStatus {
    if (isGenerating && !content) return "generating";
    if (wordCount > 0 || (content && content.trim().length > 0)) return "done";
    return "pending";
}

export async function getWork(
    projectId: string,
): Promise<WorkspaceData | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const project = await db.project.findFirst({
        where: { id: projectId, userId: session.user.id },
        include: {
            sections: {
                select: {
                    id: true,
                    title: true,
                    content: true,
                    order: true,
                    wordCount: true,
                },
                orderBy: { order: "asc" },
            },
            brief: true,
        },
    });

    if (!project) return null;

    const liveGeneration = await getWorkGenerationStatusAsync(project.id);
    const generationStatus =
        liveGeneration?.status || project.brief?.generationStatus || "BRIEFING";
    const generationProgress =
        liveGeneration?.progress ?? (generationStatus === "READY" ? 100 : 0);
    const generationStep = liveGeneration?.step || null;
    const isGenerating = generationStatus === "GENERATING";

    const sections: WorkSection[] = project.sections.map((section) => ({
        id: section.id,
        title: section.title,
        status: deriveStatus(
            normalizeStoredContent(section.content),
            section.wordCount,
            isGenerating,
        ),
        content: normalizeStoredContent(section.content) ?? "",
        order: section.order,
    }));

    return {
        id: project.id,
        brief: {
            title: project.title,
            workType: project.type,
            institutionName: project.brief?.institutionName ?? undefined,
            courseName: project.brief?.courseName ?? undefined,
            subjectName: project.brief?.subjectName ?? undefined,
            advisorName: project.brief?.advisorName ?? undefined,
            studentName: project.brief?.studentName ?? undefined,
            city: project.brief?.city ?? undefined,
            year: project.brief?.academicYear?.toString() ?? undefined,
            coverTemplate: project.brief?.coverTemplate ?? undefined,
            className: project.brief?.className ?? undefined,
            turma: project.brief?.turma ?? undefined,
            facultyName: project.brief?.facultyName ?? undefined,
            departmentName: project.brief?.departmentName ?? undefined,
            studentNumber: project.brief?.studentNumber ?? undefined,
            semester: project.brief?.semester ?? undefined,
        },
        sections,
        generationStatus,
        generationProgress,
        generationStep,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
    };
}
