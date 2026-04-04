import "server-only";

import { fileTypeFromBuffer } from "file-type";

import { ApiRouteError } from "@/lib/api";

const MIME_EQUIVALENTS: Record<string, string[]> = {
  "application/msword": ["application/x-cfb"],
};

function looksLikeUtf8Text(buffer: Uint8Array) {
  const sample = Buffer.from(buffer.slice(0, 2048)).toString("utf8");
  return !sample.includes("\uFFFD");
}

export async function assertUploadedFileMatchesMime(buffer: Uint8Array, expectedMime: string) {
  if (expectedMime === "text/plain") {
    if (!looksLikeUtf8Text(buffer)) {
      throw new ApiRouteError("O conteúdo do ficheiro não corresponde ao tipo text/plain.", 400, "INVALID_FILE_SIGNATURE");
    }
    return;
  }

  const detected = await fileTypeFromBuffer(Buffer.from(buffer));
  if (!detected) {
    throw new ApiRouteError("Não foi possível validar o tipo real do ficheiro enviado.", 400, "INVALID_FILE_SIGNATURE");
  }

  const allowedMimes = new Set([expectedMime, ...(MIME_EQUIVALENTS[expectedMime] ?? [])]);
  if (!allowedMimes.has(detected.mime)) {
    throw new ApiRouteError(
      `O ficheiro enviado não corresponde ao tipo esperado (${expectedMime}).`,
      400,
      "INVALID_FILE_SIGNATURE",
      { expectedMime, detectedMime: detected.mime },
    );
  }
}
