import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getStoredFileContentResponse } from "@/lib/storage";

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
    const storedFile = await db.storedFile.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: "READY",
      },
    });

    if (!storedFile) {
      return apiError("Ficheiro não encontrado", 404);
    }

    return getStoredFileContentResponse(storedFile);
  } catch (error) {
    return handleApiError(error, "Não foi possível servir o ficheiro");
  }
}
