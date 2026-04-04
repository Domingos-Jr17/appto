import { NextRequest } from "next/server";
import { apiError } from "@/lib/api";

export async function GET(_request: NextRequest) {
  return apiError(
    "O fluxo de créditos foi arquivado. Use /app/subscription para gerir pacotes e trabalhos extras.",
    410,
  );
}

export async function POST(_request: NextRequest) {
  return apiError(
    "A compra pública de créditos foi arquivada. Use /app/subscription para gerir pacotes e trabalhos extras.",
    410,
  );
}
