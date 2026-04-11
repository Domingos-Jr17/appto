import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { extractTextFromFile } from "@/lib/file-extraction";
import { RagService } from "@/lib/rag";

const ingestFileSchema = z.object({
  sourceId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(220),
  fileBase64: z.string().min(100),
  mimeType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return apiError("Unauthorized", 401);
    }

    const body = await parseBody(request, ingestFileSchema);
    const fileBuffer = Buffer.from(body.fileBase64, "base64");
    const content = await extractTextFromFile(fileBuffer, body.mimeType);

    if (content.length < 50) {
      return apiError("The file does not contain enough text for indexing.", 400);
    }

    const ragService = new RagService();
    const document = await ragService.ingestDocument({
      sourceId: body.sourceId,
      title: body.title,
      content,
      metadata: {
        ...(body.metadata || {}),
        mimeType: body.mimeType,
        extractedFrom: "file_upload",
        contentLength: content.length,
      },
    });

    return apiSuccess({ document }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
