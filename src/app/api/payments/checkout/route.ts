import { NextRequest } from "next/server";
import { apiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  void request;
  return apiError(
    "O checkout público de créditos foi arquivado. Use /app/subscription para gerir pacotes e trabalhos extras.",
    410,
  );
}
