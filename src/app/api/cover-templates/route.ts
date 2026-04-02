import { NextRequest, NextResponse } from "next/server";
import { getTemplatesForLevel } from "@/lib/cover-template-config";
import type { AcademicEducationLevel } from "@/types/editor";

const VALID_LEVELS = new Set<string>(["SECONDARY", "TECHNICAL", "HIGHER_EDUCATION"]);

export async function GET(request: NextRequest) {
  const level = request.nextUrl.searchParams.get("educationLevel") as AcademicEducationLevel | null;

  if (level && !VALID_LEVELS.has(level)) {
    return NextResponse.json(
      { error: "Nível educacional inválido" },
      { status: 400 }
    );
  }

  const templates = getTemplatesForLevel(level ?? undefined);

  return NextResponse.json({ templates });
}
