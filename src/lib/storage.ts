import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StoredFile, StoredFileKind, StorageProvider } from "@prisma/client";
import { ApiRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { trackProductEvent } from "@/lib/product-events";
import { resolveStorageTopology } from "@/lib/storage-topology";

const MAX_LOCAL_UPLOAD_SIZE = 25 * 1024 * 1024;

type UploadIntent = {
  provider: "LOCAL" | "SUPABASE" | "R2";
  method: "PUT";
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
};

type StorageWriteResult = {
  provider: StorageProvider;
  bucket: string;
  objectKey: string;
  fallbackUsed: boolean;
};

const FILE_RULES: Record<
  StoredFileKind,
  { maxSizeBytes: number; mimeTypes: string[]; requiresProject: boolean }
> = {
  AVATAR: {
    maxSizeBytes: 2 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    requiresProject: false,
  },
  EXPORT: {
    maxSizeBytes: 25 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    requiresProject: true,
  },
  UPLOAD: {
    maxSizeBytes: 25 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/rtf",
      "application/vnd.oasis.opendocument.text",
    ],
    requiresProject: true,
  },
  KNOWLEDGE_SOURCE: {
    maxSizeBytes: 25 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    requiresProject: false,
  },
  ATTACHMENT: {
    maxSizeBytes: 10 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    requiresProject: false,
  },
};

let s3ClientSingleton: S3Client | null = null;
const storageTopology = resolveStorageTopology(env);

function getStorageProvider(): StorageProvider {
  if (storageTopology.primary.provider === "SUPABASE") {
    return "SUPABASE";
  }

  if (storageTopology.primary.provider === "R2") {
    return "R2";
  }

  return "LOCAL";
}

function getBucket(provider: StorageProvider = getStorageProvider()) {
  if (provider === "SUPABASE") {
    return env.SUPABASE_STORAGE_BUCKET!;
  }

  if (provider === "R2") {
    return env.R2_BUCKET!;
  }

  return "local";
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function getFileExtension(fileName: string, mimeType: string) {
  const original = path.extname(fileName).replace(/^\./, "").toLowerCase();
  if (original) return original;

  const mimeExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "application/rtf": "rtf",
    "application/vnd.oasis.opendocument.text": "odt",
  };

  return mimeExtensions[mimeType] ?? "bin";
}

function buildObjectKey(input: {
  userId: string;
  projectId?: string | null;
  fileId: string;
  kind: StoredFileKind;
  originalName: string;
  mimeType: string;
}) {
  const safeName = sanitizeFileName(input.originalName);
  const ext = getFileExtension(input.originalName, input.mimeType);
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");

  if (input.kind === "AVATAR") {
    return `users/${input.userId}/avatar/${input.fileId}.${ext}`;
  }

  if (input.kind === "EXPORT") {
    const projectId = input.projectId ?? "unknown";
    return `projects/${projectId}/exports/${yyyy}/${mm}/${input.fileId}.${ext}`;
  }

  if (input.kind === "KNOWLEDGE_SOURCE") {
    return `knowledge/${input.userId}/${input.fileId}-${safeName || "source"}.${ext}`;
  }

  if (input.kind === "UPLOAD") {
    const projectId = input.projectId ?? "unknown";
    return `projects/${projectId}/uploads/${input.fileId}-${safeName || "upload"}.${ext}`;
  }

  return `users/${input.userId}/attachments/${input.fileId}-${safeName || "file"}.${ext}`;
}

function getLocalRoot() {
  return path.resolve(process.cwd(), env.STORAGE_LOCAL_ROOT);
}

function getLocalPath(objectKey: string) {
  return path.join(getLocalRoot(), ...objectKey.split("/"));
}

function getSupabaseStorageBaseUrl() {
  return `${env.SUPABASE_URL!.replace(/\/$/, "")}/storage/v1`;
}

function getSupabaseStorageHeaders(contentType?: string) {
  return {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
    apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

function getR2Client() {
  if (s3ClientSingleton) return s3ClientSingleton;

  s3ClientSingleton = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });

  return s3ClientSingleton;
}

export function validateFileUpload(input: {
  kind: StoredFileKind;
  mimeType: string;
  sizeBytes: number;
  projectId?: string;
}) {
  const rules = FILE_RULES[input.kind];

  if (!rules) {
    throw new ApiRouteError("Tipo de ficheiro não suportado", 400, "UNSUPPORTED_FILE_TYPE");
  }

  if (input.sizeBytes > rules.maxSizeBytes) {
    throw new ApiRouteError("O ficheiro excede o tamanho permitido", 400, "FILE_TOO_LARGE");
  }

  if (!rules.mimeTypes.includes(input.mimeType)) {
    throw new ApiRouteError("Tipo de ficheiro não permitido", 400, "FILE_TYPE_NOT_ALLOWED");
  }

  if (rules.requiresProject && !input.projectId) {
    throw new ApiRouteError("Este tipo de ficheiro requer um projecto", 400, "PROJECT_REQUIRED");
  }
}

export function buildStoredFileRecord(input: {
  userId: string;
  projectId?: string | null;
  fileId: string;
  kind: StoredFileKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const provider = getStorageProvider();
  return {
    provider,
    bucket: getBucket(provider),
    objectKey: buildObjectKey(input),
  };
}

export async function createUploadIntent(file: StoredFile): Promise<UploadIntent> {
  return {
    provider: file.provider,
    method: "PUT",
    uploadUrl: `/api/files/upload-local/${file.id}`,
    headers: {
      "Content-Type": file.mimeType,
    },
    expiresInSeconds: 900,
  };
}

export async function writeLocalUpload(file: StoredFile, bytes: Uint8Array) {
  if (bytes.byteLength > Math.min(file.sizeBytes, MAX_LOCAL_UPLOAD_SIZE)) {
    throw new ApiRouteError("O ficheiro recebido excede o tamanho permitido", 400, "FILE_TOO_LARGE");
  }

  const absolutePath = getLocalPath(file.objectKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, bytes);
}

async function uploadToSupabaseStorage(file: StoredFile, buffer: Buffer | Uint8Array) {
  const body = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/${encodeURIComponent(file.bucket)}/${file.objectKey.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        ...getSupabaseStorageHeaders(file.mimeType),
        "x-upsert": "true",
      },
      body,
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ApiRouteError(
      `Falha ao guardar ficheiro no Supabase Storage (${response.status})`,
      502,
      "SUPABASE_STORAGE_UPLOAD_FAILED",
      body.slice(0, 300),
    );
  }
}

async function readSupabaseStoredFileBytes(file: StoredFile) {
  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/authenticated/${encodeURIComponent(file.bucket)}/${file.objectKey.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "GET",
      headers: getSupabaseStorageHeaders(),
    },
  );

  if (!response.ok) {
    throw new ApiRouteError("O objecto armazenado não pôde ser lido.", 500, "FILE_READ_FAILED");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  return Buffer.from(bytes);
}

async function deleteSupabaseStoredObject(file: StoredFile) {
  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/${encodeURIComponent(file.bucket)}/${file.objectKey.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "DELETE",
      headers: getSupabaseStorageHeaders(),
    },
  );

  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => "");
    throw new ApiRouteError(
      `Falha ao remover ficheiro do Supabase Storage (${response.status})`,
      502,
      "SUPABASE_STORAGE_DELETE_FAILED",
      body.slice(0, 300),
    );
  }
}

async function headSupabaseStoredObject(file: StoredFile) {
  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/info/authenticated/${encodeURIComponent(file.bucket)}/${file.objectKey.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "GET",
      headers: getSupabaseStorageHeaders(),
    },
  );

  if (!response.ok) {
    throw new ApiRouteError(
      `Falha ao validar ficheiro no Supabase Storage (${response.status})`,
      502,
      "SUPABASE_STORAGE_HEAD_FAILED",
    );
  }

  const payload = (await response.json().catch(() => null)) as { metadata?: { size?: number }; size?: number } | null;
  return { contentLength: Number(payload?.metadata?.size ?? payload?.size ?? file.sizeBytes) };
}

function buildStoredFileWithProvider(file: StoredFile, provider: StorageProvider): StoredFile {
  return {
    ...file,
    provider,
    bucket: getBucket(provider),
  };
}

function resolveWritableFallbackProvider(file: StoredFile): StorageProvider | null {
  if (env.STORAGE_FAILOVER_MODE !== "write-fallback") {
    return null;
  }

  if (file.provider === "SUPABASE" && storageTopology.fallback?.provider === "R2") {
    return "R2";
  }

  return null;
}

export async function finalizeUploadedFile(file: StoredFile) {
  if (file.provider === "LOCAL") {
    const absolutePath = getLocalPath(file.objectKey);
    const stat = await fs.stat(absolutePath);
    return { contentLength: stat.size };
  }

  if (file.provider === "SUPABASE") {
    return headSupabaseStoredObject(file);
  }

  const client = getR2Client();
  const head = await client.send(
    new HeadObjectCommand({
      Bucket: file.bucket,
      Key: file.objectKey,
    })
  );

  return { contentLength: Number(head.ContentLength || 0) };
}

export async function uploadBufferToStorage(file: StoredFile, buffer: Buffer | Uint8Array) {
  const bytes = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;

  const writeToProvider = async (provider: StorageProvider) => {
    const target = buildStoredFileWithProvider(file, provider);

    if (provider === "LOCAL") {
      await writeLocalUpload(target, bytes);
    } else if (provider === "SUPABASE") {
      await uploadToSupabaseStorage(target, buffer);
    } else {
      const client = getR2Client();
      await client.send(
        new PutObjectCommand({
          Bucket: target.bucket,
          Key: target.objectKey,
          Body: buffer,
          ContentType: target.mimeType,
        }),
      );
    }

    return {
      provider,
      bucket: target.bucket,
      objectKey: target.objectKey,
      fallbackUsed: provider !== file.provider,
    } satisfies StorageWriteResult;
  };

  try {
    return await writeToProvider(file.provider);
  } catch (error) {
    const fallbackProvider = resolveWritableFallbackProvider(file);
    if (!fallbackProvider) {
      throw error;
    }

    logger.warn("[storage] primary write failed, attempting fallback provider", {
      fileId: file.id,
      primaryProvider: file.provider,
      fallbackProvider,
      error: error instanceof Error ? error.message : String(error),
    });

    return writeToProvider(fallbackProvider);
  }
}

export async function deleteStoredObject(file: StoredFile) {
  if (file.provider === "LOCAL") {
    const absolutePath = getLocalPath(file.objectKey);
    await fs.rm(absolutePath, { force: true });
    return;
  }

  if (file.provider === "SUPABASE") {
    await deleteSupabaseStoredObject(file);
    return;
  }

  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: file.bucket,
      Key: file.objectKey,
    })
  );
}

export async function cleanupStoredFileLifecycle(input?: {
  pendingOlderThanHours?: number;
  failedOlderThanHours?: number;
  deletedOlderThanHours?: number;
}) {
  const now = Date.now();
  const pendingCutoff = new Date(now - (input?.pendingOlderThanHours ?? 6) * 60 * 60 * 1000);
  const failedCutoff = new Date(now - (input?.failedOlderThanHours ?? 72) * 60 * 60 * 1000);
  const deletedCutoff = new Date(now - (input?.deletedOlderThanHours ?? 24) * 60 * 60 * 1000);

  const [pendingExpired, failedExpired, deletedExpired] = await Promise.all([
    db.storedFile.findMany({
      where: { status: "PENDING", updatedAt: { lt: pendingCutoff } },
      take: 50,
    }),
    db.storedFile.findMany({
      where: { status: "FAILED", updatedAt: { lt: failedCutoff } },
      take: 50,
    }),
    db.storedFile.findMany({
      where: { status: "DELETED", updatedAt: { lt: deletedCutoff } },
      take: 50,
    }),
  ]);

  if (pendingExpired.length) {
    await db.storedFile.updateMany({
      where: { id: { in: pendingExpired.map((file) => file.id) } },
      data: { status: "FAILED" },
    });
  }

  const removable = [...failedExpired, ...deletedExpired];
  for (const file of removable) {
    await deleteStoredObject(file).catch((error) => {
      logger.warn("[storage] failed to delete object during lifecycle cleanup", {
        fileId: file.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    await db.storedFile.delete({ where: { id: file.id } }).catch(() => null);
  }

  const summary = {
    pendingMarkedFailed: pendingExpired.length,
    removedFailed: failedExpired.length,
    removedDeleted: deletedExpired.length,
  };

  if (summary.pendingMarkedFailed || summary.removedFailed || summary.removedDeleted) {
    logger.info("[storage] lifecycle cleanup completed", summary);
    await trackProductEvent({
      name: "storage_lifecycle_cleanup",
      category: "ops",
      metadata: summary,
    }).catch(() => null);
  }

  return summary;
}

export async function getStoredFileDownloadUrl(file: StoredFile, expiresInSeconds = 900) {
  if (file.provider === "LOCAL" || file.provider === "SUPABASE") {
    return `/api/files/${file.id}/content`;
  }

  if (env.R2_PUBLIC_BASE_URL) {
    return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${file.objectKey}`;
  }

  const client = getR2Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: file.bucket,
      Key: file.objectKey,
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function readStoredFileBytes(file: StoredFile) {
  if (file.provider === "LOCAL") {
    const absolutePath = getLocalPath(file.objectKey);
    return fs.readFile(absolutePath);
  }

  if (file.provider === "SUPABASE") {
    return readSupabaseStoredFileBytes(file);
  }

  const client = getR2Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: file.bucket,
      Key: file.objectKey,
    }),
  );

  if (!response.Body) {
    throw new ApiRouteError("O objecto armazenado não pôde ser lido.", 500, "FILE_READ_FAILED");
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function getStoredFileContentResponse(file: StoredFile) {
  if (file.provider === "LOCAL" || file.provider === "SUPABASE") {
    const buffer = file.provider === "LOCAL"
      ? await fs.readFile(getLocalPath(file.objectKey))
      : await readSupabaseStoredFileBytes(file);

    return new Response(buffer, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=300",
      },
    });
  }

  const signedUrl = await getStoredFileDownloadUrl(file, 300);
  return Response.redirect(signedUrl, 302);
}

async function runSupabaseStorageHealthcheck(bucket: string) {
  const startedAt = Date.now();

  try {
    const response = await fetch(
      `${getSupabaseStorageBaseUrl()}/bucket/${encodeURIComponent(bucket)}`,
      {
        method: "GET",
        headers: getSupabaseStorageHeaders(),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(body || `Supabase Storage returned ${response.status}`);
    }

    return {
      reachable: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      reachable: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runR2StorageHealthcheck(bucket: string) {
  const startedAt = Date.now();

  try {
    await getR2Client().send(new HeadBucketCommand({ Bucket: bucket }));
    return {
      reachable: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      reachable: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runLocalStorageHealthcheck() {
  const startedAt = Date.now();

  try {
    await fs.mkdir(getLocalRoot(), { recursive: true });
    return {
      reachable: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      reachable: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runStorageHealthcheck(target: { provider: StorageProvider; bucket: string }) {
  if (target.provider === "SUPABASE") {
    return runSupabaseStorageHealthcheck(target.bucket);
  }

  if (target.provider === "R2") {
    return runR2StorageHealthcheck(target.bucket);
  }

  return runLocalStorageHealthcheck();
}

export async function getStorageHealthSummary() {
  const primaryProvider = storageTopology.primary.provider === "SUPABASE"
    ? "SUPABASE"
    : storageTopology.primary.provider === "R2"
      ? "R2"
      : "LOCAL";
  const fallbackProvider = storageTopology.fallback?.provider === "R2" ? "R2" : null;

  const [primary, fallback] = await Promise.all([
    runStorageHealthcheck({ provider: primaryProvider, bucket: storageTopology.primary.bucket }),
    fallbackProvider && storageTopology.fallback
      ? runStorageHealthcheck({ provider: fallbackProvider, bucket: storageTopology.fallback.bucket })
      : Promise.resolve(null),
  ]);

  return {
    primary: {
      provider: primaryProvider,
      role: storageTopology.primary.role,
      bucket: storageTopology.primary.bucket,
      ...primary,
    },
    fallback: fallbackProvider && storageTopology.fallback
      ? {
          provider: fallbackProvider,
          role: storageTopology.fallback.role,
          bucket: storageTopology.fallback.bucket,
          ...(fallback ?? { reachable: false, latencyMs: 0 }),
        }
      : null,
    failoverMode: storageTopology.failoverMode,
  };
}

export function buildFileContentUrl(fileId: string) {
  return `/api/files/${fileId}/content`;
}



export function createChecksum(buffer: Buffer | Uint8Array) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
