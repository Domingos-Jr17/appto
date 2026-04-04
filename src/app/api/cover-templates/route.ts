import { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import { getTemplatesForLevel } from "@/lib/cover-template-config";
import type { AcademicEducationLevel } from "@/types/editor";

const VALID_LEVELS = new Set<string>(["SECONDARY", "TECHNICAL", "HIGHER_EDUCATION"]);

export async function GET(request: NextRequest) {
  const level = request.nextUrl.searchParams.get("educationLevel") as AcademicEducationLevel | null;

  if (level && !VALID_LEVELS.has(level)) {
    return apiError("Nível educacional inválido", 400);
  }

  const templates = getTemplatesForLevel(level ?? undefined);

  return apiSuccess({ templates });
}
