import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { AuthSecurityService } from "@/lib/auth-security";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { id } = await params;
    const security = new AuthSecurityService(db);
    await security.revokeSession(session.user.id, id);

    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
