import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizeSettings, DEFAULT_USER_SETTINGS } from "@/lib/user-settings";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
    }

    let settings = await db.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      settings = await db.userSettings.create({
        data: {
          userId: session.user.id,
          language: DEFAULT_USER_SETTINGS.language,
          citationStyle: DEFAULT_USER_SETTINGS.citationStyle,
          fontSize: DEFAULT_USER_SETTINGS.fontSize,
          autoSave: DEFAULT_USER_SETTINGS.autoSave,
          aiSuggestionsEnabled: true,
          emailNotifications: DEFAULT_USER_SETTINGS.emailNotifications,
          marketingEmails: false,
        },
      });
    }

    return apiSuccess(normalizeSettings(settings));
  } catch (error) {
    logger.error("Get settings error", { error: String(error) });
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Não autorizado", 401);
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

    const settings = await db.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        ...(language !== undefined ? { language } : {}),
        ...(citationStyle !== undefined ? { citationStyle } : {}),
        ...(fontSize !== undefined ? { fontSize } : {}),
        ...(autoSave !== undefined ? { autoSave } : {}),
        ...(aiSuggestionsEnabled !== undefined ? { aiSuggestionsEnabled } : {}),
        ...(emailNotifications !== undefined ? { emailNotifications } : {}),
        ...(marketingEmails !== undefined ? { marketingEmails } : {}),
      },
      create: {
        userId: session.user.id,
        language: language || DEFAULT_USER_SETTINGS.language,
        citationStyle: citationStyle || DEFAULT_USER_SETTINGS.citationStyle,
        fontSize: fontSize || DEFAULT_USER_SETTINGS.fontSize,
        autoSave: autoSave ?? DEFAULT_USER_SETTINGS.autoSave,
        aiSuggestionsEnabled: aiSuggestionsEnabled ?? true,
        emailNotifications: emailNotifications ?? DEFAULT_USER_SETTINGS.emailNotifications,
        marketingEmails: marketingEmails ?? false,
      },
    });

    return apiSuccess(normalizeSettings(settings));
  } catch (error) {
    logger.error("Update settings error", { error: String(error) });
    return handleApiError(error);
  }
}
