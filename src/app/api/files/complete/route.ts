import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { db } from "@/lib/db";
import { serializeStoredFile } from "@/lib/files";
import { trackProductEvent } from "@/lib/product-events";
import { finalizeUploadedFile } from "@/lib/storage";
import { completeFileUploadSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { fileId } = await parseBody(request, completeFileUploadSchema);
    const storedFile = await db.storedFile.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
      },
    });

    if (!storedFile) {
      return apiError("Ficheiro não encontrado", 404);
    }

    await finalizeUploadedFile(storedFile);

    const readyFile = await db.storedFile.update({
      where: { id: storedFile.id },
      data: {
        status: "READY",
      },
    });

    await trackProductEvent({
      name: "stored_file_ready",
      category: "storage",
      userId: session.user.id,
      projectId: readyFile.projectId,
      metadata: { fileId: readyFile.id, kind: readyFile.kind },
    }).catch(() => null);

    return apiSuccess({
      success: true,
      file: await serializeStoredFile(readyFile),
    });
  } catch (error) {
    return handleApiError(error, "Não foi possível concluir o upload");
  }
}
