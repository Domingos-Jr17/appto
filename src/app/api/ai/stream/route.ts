import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { isFeatureVisible } from "@/lib/features";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiError("Não autorizado", 401);
  }

  if (!isFeatureVisible("realTimeStreaming")) {
    return apiError("Streaming em tempo real ainda não está disponível.", 501);
  }

  return apiError("Streaming real não configurado para o provider atual.", 501);
}
