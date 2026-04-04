import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StoredFile, StoredFileKind, StorageProvider } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { trackProductEvent } from "@/lib/product-events";

const MAX_LOCAL_UPLOAD_SIZE = 25 * 1024 * 1024;

type UploadIntent = {
  provider: "LOCAL" | "R2";
  method: "PUT";
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
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

function getStorageProvider(): StorageProvider {
  return env.STORAGE_PROVIDER === "R2" ? "R2" : "LOCAL";
}

function getBucket() {
  return getStorageProvider() === "R2" ? env.R2_BUCKET! : "local";
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
    throw new Error("Tipo de ficheiro não suportado");
  }

  if (input.sizeBytes > rules.maxSizeBytes) {
    throw new Error("O ficheiro excede o tamanho permitido");
  }

  if (!rules.mimeTypes.includes(input.mimeType)) {
    throw new Error("Tipo de ficheiro não permitido");
  }

  if (rules.requiresProject && !input.projectId) {
    throw new Error("Este tipo de ficheiro requer um projecto");
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
  return {
    provider: getStorageProvider(),
    bucket: getBucket(),
    objectKey: buildObjectKey(input),
  };
}

export async function createUploadIntent(file: StoredFile): Promise<UploadIntent> {
  if (file.provider === "LOCAL") {
    return {
      provider: "LOCAL",
      method: "PUT",
      uploadUrl: `/api/files/upload-local/${file.id}`,
      headers: {
        "Content-Type": file.mimeType,
      },
      expiresInSeconds: 900,
    };
  }

  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: file.bucket,
    Key: file.objectKey,
    ContentType: file.mimeType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

  return {
    provider: "R2",
    method: "PUT",
    uploadUrl,
    headers: {
      "Content-Type": file.mimeType,
    },
    expiresInSeconds: 900,
  };
}

export async function writeLocalUpload(file: StoredFile, bytes: Uint8Array) {
  if (bytes.byteLength > Math.min(file.sizeBytes, MAX_LOCAL_UPLOAD_SIZE)) {
    throw new Error("O ficheiro recebido excede o tamanho permitido");
  }

  const absolutePath = getLocalPath(file.objectKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, bytes);
}

export async function finalizeUploadedFile(file: StoredFile) {
  if (file.provider === "LOCAL") {
    const absolutePath = getLocalPath(file.objectKey);
    await fs.access(absolutePath);
    return;
  }

  const client = getR2Client();
  await client.send(
    new HeadObjectCommand({
      Bucket: file.bucket,
      Key: file.objectKey,
    })
  );
}

export async function uploadBufferToStorage(file: StoredFile, buffer: Buffer | Uint8Array) {
  if (file.provider === "LOCAL") {
    await writeLocalUpload(file, buffer instanceof Buffer ? new Uint8Array(buffer) : buffer);
    return;
  }

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: file.bucket,
      Key: file.objectKey,
      Body: buffer,
      ContentType: file.mimeType,
    })
  );
}

export async function deleteStoredObject(file: StoredFile) {
  if (file.provider === "LOCAL") {
    const absolutePath = getLocalPath(file.objectKey);
    await fs.rm(absolutePath, { force: true });
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
  if (file.provider === "LOCAL") {
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

export async function getStoredFileContentResponse(file: StoredFile) {
  if (file.provider === "LOCAL") {
    const absolutePath = getLocalPath(file.objectKey);
    const buffer = await fs.readFile(absolutePath);

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

export function buildFileContentUrl(fileId: string) {
  return `/api/files/${fileId}/content`;
}



export function createChecksum(buffer: Buffer | Uint8Array) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
