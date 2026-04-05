import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { getPromptValidationReport } from "@/lib/prompt-loader";
import { PROMPT_VERSION } from "@/lib/ai-prompts";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return apiError("Não autorizado", 401);
    }

    const { searchParams } = new URL(request.url);
    const _includeContent = searchParams.get("includeContent") === "true";

    const report = getPromptValidationReport();

    const allValid = report.every((entry) => entry.exists && entry.missingSections.length === 0);

    return apiSuccess({
      version: PROMPT_VERSION,
      allValid,
      files: report.map((entry) => ({
        file: entry.file,
        exists: entry.exists,
        missingSections: entry.missingSections,
        status: entry.exists && entry.missingSections.length === 0 ? "ok" : entry.exists ? "incomplete" : "missing",
      })),
      summary: {
        total: report.length,
        valid: report.filter((e) => e.exists && e.missingSections.length === 0).length,
        incomplete: report.filter((e) => e.exists && e.missingSections.length > 0).length,
        missing: report.filter((e) => !e.exists).length,
      },
    });
  } catch (error) {
    return handleApiError(error, "Não foi possível carregar o relatório de prompts.");
  }
}
