import { z } from "zod";



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

export const projectTypeSchema = z.enum(["SCHOOL_WORK", "PRACTICAL_WORK", "RESEARCH_WORK"]);

export const projectStatusSchema = z.enum([
  "DRAFT",
  "IN_PROGRESS",
  "REVIEW",
  "COMPLETED",
  "ARCHIVED",
]);

export const citationStyleSchema = z.enum(["ABNT", "APA", "Vancouver"]);

export const coverTemplateSchema = z.enum([
  "UEM_STANDARD",
  "UP",
  "UDM",
  "ABNT_GENERIC",
  "SCHOOL_MOZ",
  "DISCIPLINARY_MOZ",
]);

export const workGenerationStatusSchema = z.enum([
  "BRIEFING",
  "GENERATING",
  "READY",
  "NEEDS_REVIEW",
  "FAILED",
]);

export const workBriefSchema = z.object({
  institutionName: z.string().trim().max(180).optional(),
  courseName: z.string().trim().max(180).optional(),
  subjectName: z.string().trim().max(180).optional(),
  educationLevel: z.enum(["SECONDARY", "TECHNICAL", "HIGHER_EDUCATION"]).optional(),
  advisorName: z.string().trim().max(180).optional(),
  studentName: z.string().trim().max(180).optional(),
  city: z.string().trim().max(120).optional(),
  academicYear: z.number().int().min(2000).max(2100).optional(),
  dueDate: z.string().date().optional(),
  theme: z.string().trim().max(240).optional(),
  subtitle: z.string().trim().max(240).optional(),
  objective: z.string().trim().max(5000).optional(),
  researchQuestion: z.string().trim().max(5000).optional(),
  methodology: z.string().trim().max(5000).optional(),
  keywords: z.string().trim().max(500).optional(),
  referencesSeed: z.string().trim().max(10000).optional(),
  citationStyle: citationStyleSchema.default("ABNT"),
  language: z.string().trim().min(2).max(20).default("pt-MZ"),
  additionalInstructions: z.string().trim().max(10000).optional(),
  coverTemplate: coverTemplateSchema.default("UEM_STANDARD"),
  // Education-level specific fields
  className: z.string().trim().max(30).optional(),
  turma: z.string().trim().max(10).optional(),
  facultyName: z.string().trim().max(180).optional(),
  departmentName: z.string().trim().max(180).optional(),
  studentNumber: z.string().trim().max(30).optional(),
  semester: z.string().trim().max(10).optional(),
});

export const updateWorkBriefSchema = workBriefSchema.partial();

export const createProjectSchema = z.object({
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().max(5000).optional(),
  type: projectTypeSchema.default("RESEARCH_WORK"),
  brief: updateWorkBriefSchema.optional(),
});

export const createWorkSchema = z.object({
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().max(5000).optional(),
  type: projectTypeSchema.default("RESEARCH_WORK"),
  brief: workBriefSchema.default({ language: "pt-MZ", citationStyle: "ABNT", coverTemplate: "UEM_STANDARD" }),
  generateContent: z.boolean().default(true),
});

export const updateProjectSchema = z.object({
  title: z.string().trim().min(5).max(180).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  type: projectTypeSchema.optional(),
  status: projectStatusSchema.optional(),
  brief: updateWorkBriefSchema.optional(),
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

export const storedFileKindSchema = z.enum([
  "AVATAR",
  "EXPORT",
  "UPLOAD",
  "KNOWLEDGE_SOURCE",
  "ATTACHMENT",
]);

export const createFileUploadSchema = z.object({
  projectId: z.string().min(1).optional(),
  kind: storedFileKindSchema,
  originalName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1).max(180),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
});

export const completeFileUploadSchema = z.object({
  fileId: z.string().min(1),
});

export const saveProjectExportSchema = z.object({
  format: z.enum(["DOCX", "PDF"]),
});

export const paymentCallbackSchema = z.object({
  paymentId: z.string().min(1),
  providerReference: z.string().min(1),
  status: z.enum(["CONFIRMED", "FAILED", "CANCELLED"]),
  providerPayload: z.unknown().optional(),
  signature: z.string().min(1),
});

export const totpSetupSchema = z.object({
  currentPassword: z.string().min(1),
});

export const totpVerifySchema = z.object({
  code: z.string().trim().min(6).max(12),
});

export const disableTotpSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  otpCode: z.string().trim().min(6).max(12).optional(),
});

export const demoOutlineSchema = z.object({
  topic: z.string().trim().min(8).max(160),
});
