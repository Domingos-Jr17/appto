import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { db } from "@/lib/db";
import { assertProjectOwnership, serializeStoredFile } from "@/lib/files";
import {
  buildStoredFileRecord,
  createUploadIntent,
  validateFileUpload,
} from "@/lib/storage";
import { createFileUploadSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("NÃ£o autorizado", 401);
    }

    const payload = await parseBody(request, createFileUploadSchema);

    validateFileUpload(payload);

    if (payload.projectId) {
      await assertProjectOwnership(payload.projectId, session.user.id);
    }

    const fileId = crypto.randomUUID().replace(/-/g, "");
    const storageRecord = buildStoredFileRecord({
      userId: session.user.id,
      projectId: payload.projectId,
      fileId,
      kind: payload.kind,
      originalName: payload.originalName,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
    });

    const storedFile = await db.storedFile.create({
      data: {
        id: fileId,
        userId: session.user.id,
        projectId: payload.projectId ?? null,
        kind: payload.kind,
        mimeType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
        originalName: payload.originalName,
        provider: storageRecord.provider,
        bucket: storageRecord.bucket,
        objectKey: storageRecord.objectKey,
      },
    });

    return apiSuccess({
      success: true,
      file: await serializeStoredFile(storedFile),
      upload: await createUploadIntent(storedFile),
    });
  } catch (error) {
    return handleApiError(error, "NÃ£o foi possÃ­vel iniciar o upload");
  }
}
