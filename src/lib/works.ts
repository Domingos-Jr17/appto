import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeStoredContent } from "@/lib/content";
import { getWorkGenerationStatusAsync } from "@/lib/work-generation-jobs";
import { resolveGenerationSnapshot, resolveWorkspaceSectionState } from "@/lib/work-generation-state";
import type {
    WorkspaceData,
    WorkSection,
    SectionStatus,
} from "@/types/workspace";

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
    const generationSnapshot = resolveGenerationSnapshot({
        liveJob: liveGeneration,
        fallbackStatus: project.brief?.generationStatus,
    });

    const sections: WorkSection[] = project.sections.map((section) => {
        const normalizedContent = normalizeStoredContent(section.content) ?? "";
        const hasPersistedContent = section.wordCount > 0 || normalizedContent.trim().length > 0;

        return {
            id: section.id,
            title: section.title,
            status: resolveWorkspaceSectionState({
                generationStatus: generationSnapshot.status,
                activeSectionTitle: generationSnapshot.activeSectionTitle,
                hasPersistedContent,
                title: section.title,
            }) as SectionStatus,
            content: normalizedContent,
            order: section.order,
        };
    });

    return {
        id: project.id,
        brief: {
            title: project.title,
            workType: project.type,
            educationLevel: project.brief?.educationLevel ?? project.educationLevel,
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
        generationStatus: generationSnapshot.status,
        generationProgress: generationSnapshot.progress,
        generationStep: generationSnapshot.step,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
    };
}
