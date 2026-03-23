import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { z } from "zod";

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    image: z
      .string()
      .trim()
      .refine(
        (value) =>
          value.length === 0 ||
          value.startsWith("/") ||
          /^https?:\/\//.test(value) ||
          value.startsWith("data:"),
        "URL de imagem invÃ¡lida"
      )
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nenhum campo válido enviado",
  });

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        credits: true,
        subscription: true,
        settings: true,
      },
    });

    if (!user) {
      return apiError("Utilizador não encontrado", 404);
    }

    return apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      twoFactorEnabled: user.twoFactorEnabled,
      credits: user.credits?.balance || 0,
      usedCredits: user.credits?.used || 0,
      subscription: user.subscription
        ? {
            plan: user.subscription.plan,
            status: user.subscription.status,
          }
        : null,
      settings: user.settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    const { name, image } = await parseBody(request, updateUserSchema);

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(image !== undefined ? { image } : {}),
      },
    });

    return apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
