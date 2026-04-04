import { getServerSession } from "next-auth";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertUploadedFileMatchesMime } from "@/lib/file-signature";
import { logger } from "@/lib/logger";
import { writeLocalUpload } from "@/lib/storage";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id } = await params;
    const storedFile = await db.storedFile.findFirst({
      where: {
        id,
        userId: session.user.id,
        provider: "LOCAL",
        status: "PENDING",
      },
    });

    if (!storedFile) {
      return apiError("Upload não encontrado", 404);
    }

    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader && Number(contentLengthHeader) > storedFile.sizeBytes) {
      return apiError("O corpo enviado excede o tamanho permitido para este ficheiro.", 400, "FILE_TOO_LARGE");
    }

    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength !== storedFile.sizeBytes) {
      return apiError("O ficheiro enviado não corresponde ao tamanho declarado.", 400, "FILE_SIZE_MISMATCH");
    }
    await assertUploadedFileMatchesMime(bytes, storedFile.mimeType);
    await writeLocalUpload(storedFile, bytes);

    return apiSuccess({ success: true });
  } catch (error) {
    logger.error("Local upload failed", { error: String(error) });
    return handleApiError(error, "Não foi possível guardar o ficheiro");
  }
}
