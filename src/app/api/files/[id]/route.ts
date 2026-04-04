import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { serializeStoredFile } from "@/lib/files";
import { trackProductEvent } from "@/lib/product-events";

async function getOwnedFile(id: string, userId: string) {
  return db.storedFile.findFirst({
    where: {
      id,
      userId,
      status: {
        not: "DELETED",
      },
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id } = await params;
    const storedFile = await getOwnedFile(id, session.user.id);

    if (!storedFile) {
      return apiError("Ficheiro não encontrado", 404);
    }

    return apiSuccess(await serializeStoredFile(storedFile));
  } catch (error) {
    return handleApiError(error, "Não foi possível obter o ficheiro");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id } = await params;
    const storedFile = await getOwnedFile(id, session.user.id);

    if (!storedFile) {
      return apiError("Ficheiro não encontrado", 404);
    }

    await db.storedFile.update({
      where: { id: storedFile.id },
      data: { status: "DELETED" },
    });

    await trackProductEvent({
      name: "stored_file_deleted",
      category: "storage",
      userId: session.user.id,
      projectId: storedFile.projectId,
      metadata: { fileId: storedFile.id, kind: storedFile.kind },
    }).catch(() => null);

    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error, "Não foi possível eliminar o ficheiro");
  }
}
