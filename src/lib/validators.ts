import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120).optional().or(z.literal("")),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("EXCLUIR"),
  currentPassword: z.string().min(1).optional(),
  otpCode: z.string().trim().min(6).max(12).optional(),
});

export const projectTypeSchema = z.enum([
  "MONOGRAPHY",
  "DISSERTATION",
  "THESIS",
  "ARTICLE",
  "ESSAY",
  "REPORT",
  "SCHOOL_WORK",
  "RESEARCH_PROJECT",
  "INTERNSHIP_REPORT",
  "PRACTICAL_WORK",
  "TCC",
]);

export const projectStatusSchema = z.enum([
  "DRAFT",
  "IN_PROGRESS",
  "REVIEW",
  "COMPLETED",
  "ARCHIVED",
]);

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(5000).optional(),
  type: projectTypeSchema.default("MONOGRAPHY"),
});

export const updateProjectSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    status: projectStatusSchema.optional(),
    type: projectTypeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nenhum campo válido enviado",
  });

export const projectQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  type: projectTypeSchema.optional(),
  search: z.string().trim().max(120).optional(),
  sortBy: z.enum(["updatedAt", "createdAt", "title", "status", "type"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const createDocumentSchema = z.object({
  projectId: z.string().min(1),
  parentId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(180),
  content: z.string().max(100000).optional(),
  order: z.number().int().min(0).optional(),
});

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    content: z.string().max(100000).optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nenhum campo válido enviado",
  });

export const aiActionSchema = z.enum([
  "generate",
  "improve",
  "suggest",
  "references",
  "outline",
  "chat",
  "summarize",
  "translate",
  "citations",
  "plagiarism-check",
  "generate-section",
  "generate-complete",
]);

export const aiRequestSchema = z.object({
  action: aiActionSchema,
  text: z.string().trim().min(1).max(20000),
  context: z.string().trim().max(5000).optional(),
  projectId: z.string().min(1).optional(),
  useCache: z.boolean().optional(),
});

export const paymentCheckoutSchema = z.object({
  packageKey: z.enum(["starter", "basic", "pro", "academic"]),
  provider: z.enum(["SIMULATED", "MPESA", "EMOLA"]).optional(),
});

export const paymentCallbackSchema = z.object({
  paymentId: z.string().min(1),
  providerReference: z.string().min(1),
  status: z.enum(["CONFIRMED", "FAILED", "CANCELLED"]),
  providerPayload: z.unknown().optional(),
});

export const totpVerifySchema = z.object({
  code: z.string().trim().min(6).max(12),
});

export const disableTotpSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  otpCode: z.string().trim().min(6).max(12).optional(),
});
