import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/settings - Get user settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let settings = await db.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await db.userSettings.create({
        data: {
          userId: session.user.id,
          language: "pt-MZ",
          citationStyle: "ABNT",
          fontSize: 14,
          autoSave: true,
          aiSuggestionsEnabled: true,
          emailNotifications: true,
          marketingEmails: false,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      language,
      citationStyle,
      fontSize,
      autoSave,
      aiSuggestionsEnabled,
      emailNotifications,
      marketingEmails,
    } = body;

    // Upsert settings
    const settings = await db.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        ...(language !== undefined && { language }),
        ...(citationStyle !== undefined && { citationStyle }),
        ...(fontSize !== undefined && { fontSize }),
        ...(autoSave !== undefined && { autoSave }),
        ...(aiSuggestionsEnabled !== undefined && { aiSuggestionsEnabled }),
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(marketingEmails !== undefined && { marketingEmails }),
      },
      create: {
        userId: session.user.id,
        language: language || "pt-MZ",
        citationStyle: citationStyle || "ABNT",
        fontSize: fontSize || 14,
        autoSave: autoSave ?? true,
        aiSuggestionsEnabled: aiSuggestionsEnabled ?? true,
        emailNotifications: emailNotifications ?? true,
        marketingEmails: marketingEmails ?? false,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
