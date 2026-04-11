import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/api";
import { randomBytes } from "crypto";

function generateToken(): string {
  return randomBytes(16).toString("hex");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return apiError("Project not found", 404);
    }

    const existingShare = await db.sharedDocument.findFirst({
      where: {
        projectId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    const origin = new URL(request.url).origin;

    if (existingShare) {
      const shareUrl = `${origin}/share/${existingShare.token}`;
      return NextResponse.json({
        success: true,
        data: {
          token: existingShare.token,
          shareUrl,
          createdAt: existingShare.createdAt,
          views: existingShare.views,
        },
      });
    }

    const token = generateToken();

    const sharedDoc = await db.sharedDocument.create({
      data: {
        projectId,
        token,
        isActive: true,
      },
    });

    const shareUrl = `${origin}/share/${sharedDoc.token}`;

    return NextResponse.json({
      success: true,
      data: {
        token: sharedDoc.token,
        shareUrl,
        createdAt: sharedDoc.createdAt,
        views: sharedDoc.views,
      },
    });
  } catch (error) {
    return handleApiError(error, "Error creating share link");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("shareId");

    if (!shareId) {
      return apiError("Share ID is required", 400);
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return apiError("Project not found", 404);
    }

    await db.sharedDocument.updateMany({
      where: {
        id: shareId,
        projectId,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Share link revoked",
    });
  } catch (error) {
    return handleApiError(error, "Error revoking share link");
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return apiError("Project not found", 404);
    }

    const shares = await db.sharedDocument.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        token: true,
        isActive: true,
        createdAt: true,
        expiresAt: true,
        views: true,
        lastViewedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: shares,
    });
  } catch (error) {
    return handleApiError(error, "Error listing share links");
  }
}
