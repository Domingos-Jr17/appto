import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { RagService } from "@/lib/rag";

const searchSchema = z.object({
  query: z.string().trim().min(2),
  userId: z.string().trim().optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return apiError("Não autorizado", 401);
    }

    const body = await parseBody(request, searchSchema);
    const ragService = new RagService();
    const results = await ragService.search(body.query, body.userId, body.limit ?? 5);

    return apiSuccess({ results });
  } catch (error) {
    return handleApiError(error);
  }
}
