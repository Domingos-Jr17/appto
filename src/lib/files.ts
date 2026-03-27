import "server-only";

import { StoredFile } from "@prisma/client";
import { db } from "@/lib/db";
import { buildFileContentUrl, getStoredFileDownloadUrl } from "@/lib/storage";

export async function assertProjectOwnership(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    select: { id: true },
  });

  if (!project) {
    throw new Error("Projecto não encontrado");
  }

  return project;
}

export async function serializeStoredFile(file: StoredFile) {
  return {
    id: file.id,
    projectId: file.projectId,
    kind: file.kind,
    provider: file.provider,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    status: file.status,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    downloadUrl: await getStoredFileDownloadUrl(file),
    contentUrl: buildFileContentUrl(file.id),
  };
}
