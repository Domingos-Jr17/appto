import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { serializeStoredFile } from "@/lib/files";
import { deleteStoredObject } from "@/lib/storage";

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
      return apiError("NÃ£o autorizado", 401);
    }

    const { id } = await params;
    const storedFile = await getOwnedFile(id, session.user.id);

    if (!storedFile) {
      return apiError("Ficheiro nÃ£o encontrado", 404);
    }

    return apiSuccess(await serializeStoredFile(storedFile));
  } catch (error) {
    return handleApiError(error, "NÃ£o foi possÃ­vel obter o ficheiro");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("NÃ£o autorizado", 401);
    }

    const { id } = await params;
    const storedFile = await getOwnedFile(id, session.user.id);

    if (!storedFile) {
      return apiError("Ficheiro nÃ£o encontrado", 404);
    }

    await deleteStoredObject(storedFile).catch(() => null);

    await db.storedFile.delete({
      where: { id: storedFile.id },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error, "NÃ£o foi possÃ­vel eliminar o ficheiro");
  }
}
