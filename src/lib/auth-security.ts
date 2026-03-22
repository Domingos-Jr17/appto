import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { AuthSessionEvent, type PrismaClient, type Prisma } from "@prisma/client";
import { decryptText, encryptText, generateOpaqueToken, hashToken } from "@/lib/crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { env } from "@/lib/env";

type DbClient = PrismaClient | Prisma.TransactionClient;

export class AuthSecurityService {
  constructor(private readonly db: DbClient) {}

  async createPasswordResetToken(userId: string, email: string) {
    const rawToken = generateOpaqueToken(24);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.db.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${env.APP_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl);

    return { expiresAt };
  }

  async consumePasswordResetToken(token: string) {
    const tokenHash = hashToken(token);
    const resetToken = await this.db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new Error("Token inválido ou expirado.");
    }

    return resetToken;
  }

  async resetPassword(token: string, password: string) {
    const resetToken = await this.consumePasswordResetToken(token);
    const hashedPassword = await bcrypt.hash(password, 12);

    await this.db.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    await this.db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    await this.db.session.deleteMany({
      where: { userId: resetToken.userId },
    });

    await this.recordSessionEvent(resetToken.userId, null, AuthSessionEvent.PASSWORD_RESET);
  }

  async createTotpSetup(userId: string, email: string) {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: "appto-grad",
      label: email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.db.totpCredential.upsert({
      where: { userId },
      update: {
        secretEncrypted: encryptText(secret),
        enabledAt: null,
      },
      create: {
        userId,
        secretEncrypted: encryptText(secret),
      },
    });

    await this.db.recoveryCode.deleteMany({
      where: { userId },
    });

    return { otpauthUrl, qrCodeDataUrl };
  }

  async verifyTotpCode(userId: string, code: string, activate = false) {
    const credential = await this.db.totpCredential.findUnique({
      where: { userId },
    });

    if (!credential) {
      throw new Error("Configuração de 2FA não encontrada.");
    }

    const secret = decryptText(credential.secretEncrypted);
    const result = verifySync({ token: code, secret });
    const isValid = result.valid;

    if (!isValid) {
      throw new Error("Código de autenticação inválido.");
    }

    if (activate) {
      const recoveryCodes = await this.generateRecoveryCodes(userId);

      await this.db.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });

      await this.db.totpCredential.update({
        where: { userId },
        data: {
          enabledAt: new Date(),
          lastUsedAt: new Date(),
        },
      });

      await this.recordSessionEvent(userId, null, AuthSessionEvent.TWO_FACTOR_ENABLED);
      return { recoveryCodes };
    }

    await this.db.totpCredential.update({
      where: { userId },
      data: { lastUsedAt: new Date() },
    });

    return { recoveryCodes: [] };
  }

  async disableTotp(userId: string) {
    await this.db.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    });

    await this.db.totpCredential.deleteMany({
      where: { userId },
    });

    await this.db.recoveryCode.deleteMany({
      where: { userId },
    });

    await this.recordSessionEvent(userId, null, AuthSessionEvent.TWO_FACTOR_DISABLED);
  }

  async listSessions(userId: string, currentSessionToken?: string) {
    const sessions = await this.db.session.findMany({
      where: { userId },
      orderBy: { lastActiveAt: "desc" },
    });

    return sessions.map((session) => ({
      id: session.id,
      current: currentSessionToken ? session.sessionToken === currentSessionToken : false,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.db.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error("Sessão não encontrada.");
    }

    await this.db.session.delete({
      where: { id: sessionId },
    });

    await this.recordSessionEvent(userId, sessionId, AuthSessionEvent.SESSION_REVOKED);
  }

  async recordSessionEvent(userId: string, sessionId: string | null, event: AuthSessionEvent) {
    await this.db.authSessionAudit.create({
      data: {
        userId,
        sessionId: sessionId ?? undefined,
        event,
      },
    });
  }

  async touchSession(sessionToken: string, requestMeta?: { ipAddress?: string; userAgent?: string }) {
    const session = await this.db.session.findUnique({
      where: { sessionToken },
    });

    if (!session) {
      return null;
    }

    return this.db.session.update({
      where: { sessionToken },
      data: {
        lastActiveAt: new Date(),
        ...(requestMeta?.ipAddress !== undefined ? { ipAddress: requestMeta.ipAddress } : {}),
        ...(requestMeta?.userAgent !== undefined ? { userAgent: requestMeta.userAgent } : {}),
      },
    });
  }

  private async generateRecoveryCodes(userId: string) {
    const rawCodes = Array.from({ length: 8 }, () =>
      generateOpaqueToken(3).toUpperCase().slice(0, 10)
    );

    await this.db.recoveryCode.createMany({
      data: rawCodes.map((code) => ({
        userId,
        codeHash: hashToken(code),
      })),
    });

    return rawCodes;
  }
}
