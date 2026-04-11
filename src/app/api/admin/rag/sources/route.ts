import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseBody } from "@/lib/api";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const createSourceSchema = z.object({
  name: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(180).optional(),
  type: z.enum(["PUBLIC", "INSTITUTIONAL", "PRIVATE"]).default("PUBLIC"),
  userId: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 180);
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return apiError("Unauthorized", 401);
    }

    const sources = await db.knowledgeSource.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    return apiSuccess({ sources });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return apiError("Unauthorized", 401);
    }

    const body = await parseBody(request, createSourceSchema);
    const metadata = body.metadata
      ? (JSON.parse(JSON.stringify(body.metadata)) as Prisma.InputJsonValue)
      : undefined;
    const source = await db.knowledgeSource.create({
      data: {
        name: body.name,
        slug: body.slug || slugify(body.name),
        type: body.type,
        userId: body.userId,
        isActive: body.isActive ?? true,
        metadata,
      },
    });

    return apiSuccess({ source }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
