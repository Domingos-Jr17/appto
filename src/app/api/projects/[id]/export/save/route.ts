import crypto from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { db } from "@/lib/db";
import { serializeStoredFile } from "@/lib/files";
import { DocumentExportService } from "@/lib/document-export";
import { buildStoredFileRecord, createChecksum, uploadBufferToStorage } from "@/lib/storage";
import { saveProjectExportSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id } = await params;
    const { format } = await parseBody(request, saveProjectExportSchema);

    const project = await db.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!project) {
      return apiError("Projecto não encontrado", 404);
    }

    const model = DocumentExportService.createModel(project);
    const buffer =
      format === "PDF"
        ? await renderToBuffer(DocumentExportService.createPdfComponent(model))
        : await DocumentExportService.generateDocx(model);

    const fileId = crypto.randomUUID().replace(/-/g, "");
    const mimeType =
      format === "PDF"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const originalName = `${project.title}.${format === "PDF" ? "pdf" : "docx"}`;
    const storageRecord = buildStoredFileRecord({
      userId: session.user.id,
      projectId: project.id,
      fileId,
      kind: "EXPORT",
      originalName,
      mimeType,
      sizeBytes: buffer.byteLength,
    });

    const createdFile = await db.storedFile.create({
      data: {
        id: fileId,
        userId: session.user.id,
        projectId: project.id,
        kind: "EXPORT",
        provider: storageRecord.provider,
        bucket: storageRecord.bucket,
        objectKey: storageRecord.objectKey,
        mimeType,
        sizeBytes: buffer.byteLength,
        originalName,
        checksum: createChecksum(buffer),
      },
    });

    try {
      await uploadBufferToStorage(createdFile, buffer);
    } catch (error) {
      await db.storedFile.update({
        where: { id: createdFile.id },
        data: { status: "FAILED" },
      });
      throw error;
    }

    const [, savedExport] = await db.$transaction([
      db.storedFile.update({
        where: { id: createdFile.id },
        data: { status: "READY" },
      }),
      db.projectExport.create({
        data: {
          projectId: project.id,
          fileId: createdFile.id,
          format,
          createdById: session.user.id,
        },
        include: {
          file: true,
        },
      }),
    ]);

    return apiSuccess({
      success: true,
      export: {
        id: savedExport.id,
        format: savedExport.format,
        createdAt: savedExport.createdAt,
        file: await serializeStoredFile(savedExport.file),
      },
    });
  } catch (error) {
    return handleApiError(error, "Não foi possível guardar a exportação");
  }
}
