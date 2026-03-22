import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiError("Não autorizado", 401);
  }

  const { id } = await params;
  const payment = await db.paymentTransaction.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!payment) {
    return apiError("Pagamento não encontrado", 404);
  }

  return apiSuccess({ payment });
}
