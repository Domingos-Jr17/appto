import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { writeLocalUpload } from "@/lib/storage";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("NÃ£o autorizado", 401);
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
      return apiError("Upload nÃ£o encontrado", 404);
    }

    const bytes = new Uint8Array(await request.arrayBuffer());
    await writeLocalUpload(storedFile, bytes);

    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error, "NÃ£o foi possÃ­vel guardar o ficheiro");
  }
}
