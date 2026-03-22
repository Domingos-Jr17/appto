import crypto from "node:crypto";
import { env } from "@/lib/env";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const HASH_ALGORITHM = "sha256";

function getKey() {
  return crypto.createHash(HASH_ALGORITHM).update(env.AUTH_SECRET).digest();
}

export function hashToken(value: string) {
  return crypto.createHash(HASH_ALGORITHM).update(value).digest("hex");
}

export function generateOpaqueToken(size = 32) {
  return crypto.randomBytes(size).toString("hex");
}

export function encryptText(value: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptText(value: string) {
  const [ivHex, authTagHex, encryptedHex] = value.split(":");
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
