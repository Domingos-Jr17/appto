import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { RagService } from "@/lib/rag";

const ingestDocumentSchema = z.object({
  sourceId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(220),
  content: z.string().trim().min(50),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return apiError("Unauthorized", 401);
    }

    const body = await parseBody(request, ingestDocumentSchema);
    const ragService = new RagService();
    const document = await ragService.ingestDocument(body);

    return apiSuccess({ document }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
