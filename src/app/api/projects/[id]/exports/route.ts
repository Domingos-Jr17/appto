import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { serializeStoredFile } from "@/lib/files";

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
    const project = await db.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!project) {
      return apiError("Projecto não encontrado", 404);
    }

    const exports = await db.projectExport.findMany({
      where: { projectId: id },
      include: { file: true },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({
      exports: await Promise.all(
        exports.map(async (item) => ({
          id: item.id,
          format: item.format,
          createdAt: item.createdAt,
          file: await serializeStoredFile(item.file),
        }))
      ),
    });
  } catch (error) {
    return handleApiError(error, "Não foi possível listar as exportações");
  }
}
