import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizeSettings, DEFAULT_USER_SETTINGS } from "@/lib/user-settings";
import { z } from "zod";

const updateSettingsSchema = z.object({
  language: z.enum(["pt-MZ", "pt-BR", "en"]).optional(),
  citationStyle: z.enum(["ABNT", "APA", "Vancouver"]).optional(),
  fontSize: z.number().int().min(12).max(24).optional(),
  autoSave: z.boolean().optional(),
  aiSuggestionsEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

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

    const body = updateSettingsSchema.parse(await request.json());
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
    if (error instanceof ZodError) {
      return apiError("Dados inválidos", 400, "VALIDATION_ERROR", error.flatten());
    }
    logger.error("Update settings error", { error: String(error) });
    return handleApiError(error);
  }
}
