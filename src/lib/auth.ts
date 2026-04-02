import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AuthSecurityService } from "@/lib/auth-security";
import { CreditLedgerService } from "@/lib/credit-ledger";
import { CREDIT_DEFAULTS } from "@/lib/credits";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifySync } from "otplib";
import { decryptText } from "@/lib/crypto";
import { AuthSessionEvent } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      credits: number;
      twoFactorEnabled: boolean;
    };
  }
  interface User {
    id: string;
    role: string;
    credits: number;
    twoFactorEnabled: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  secret: env.AUTH_SECRET,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otpCode: { label: "Código 2FA", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();

        enforceRateLimit(`login:${normalizedEmail}`, 20, 60 * 1000);

        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            credits: true,
            totpCredential: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          const remainingMinutes = Math.ceil(
            (user.lockoutUntil.getTime() - Date.now()) / 60000
          );
          throw new Error(`Conta bloqueada. Tenta novamente em ${remainingMinutes} minuto(s).`);
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
          
          if (newFailedAttempts >= 5) {
            const lockoutDuration = new Date(Date.now() + 15 * 60 * 1000);
            await db.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: newFailedAttempts,
                lockoutUntil: lockoutDuration,
              },
            });
            throw new Error("Exceeded login attempts. Account locked for 15 minutes.");
          }

          await db.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: newFailedAttempts },
          });

          const remainingAttempts = 5 - newFailedAttempts;
          throw new Error(`Palavra-passe incorrecta. Restam ${remainingAttempts} tentativa(s).`);
        }

        await db.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockoutUntil: null },
        });

        if (user.twoFactorEnabled) {
          if (!credentials.otpCode || !user.totpCredential?.secretEncrypted) {
            throw new Error("TwoFactorRequired");
          }

          const secret = decryptText(user.totpCredential.secretEncrypted);
          const isValidOtp = verifySync({
            token: credentials.otpCode,
            secret,
          }).valid;

          if (!isValidOtp) {
            throw new Error("InvalidTwoFactorCode");
          }

          await db.totpCredential.update({
            where: { userId: user.id },
            data: { lastUsedAt: new Date() },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          credits: user.credits?.balance || 0,
          twoFactorEnabled: user.twoFactorEnabled,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      const fullUser = user?.id
        ? await db.user.findUnique({
            where: { id: user.id },
            include: { credits: true },
          })
        : session.user?.email
          ? await db.user.findUnique({
              where: { email: session.user.email },
              include: { credits: true },
            })
          : null;

      if (session.user && fullUser) {
        session.user.id = fullUser.id;
        session.user.role = fullUser.role;
        session.user.credits = fullUser.credits?.balance || 0;
        session.user.twoFactorEnabled = fullUser.twoFactorEnabled;
      }

      return session;
    },
    async signIn({ user, account }) {
      // For OAuth providers, create credits and subscription
      if (account?.provider !== "credentials" && user.email) {
        const existingUser = await db.user.findUnique({
          where: { email: user.email },
          include: { credits: true, subscription: true },
        });

        if (existingUser) {
          user.id = existingUser.id;
          user.role = existingUser.role;
          user.credits = existingUser.credits?.balance || 0;
          user.twoFactorEnabled = existingUser.twoFactorEnabled;
          return true;
        }
      }
      return true;
    },
  },
  events: {
    async signIn({ user, account }) {
      const ledger = new CreditLedgerService(db);
      const security = new AuthSecurityService(db);
      const existingCredits = await db.credit.findUnique({
        where: { userId: user.id },
      });

      if (!existingCredits) {
        await ledger.grant(
          user.id,
          CREDIT_DEFAULTS.initialBalance,
          "BONUS",
          "Créditos iniciais de boas-vindas",
          { source: account?.provider ?? "credentials" }
        );

        await db.subscription.create({
          data: {
            userId: user.id,
            plan: "FREE",
            status: "ACTIVE",
            worksPerMonth: 1,
          },
        });

        await db.userSettings.create({
          data: {
            userId: user.id,
          },
        });
      }

      await security.recordSessionEvent(user.id, null, AuthSessionEvent.SIGN_IN);
    },
    async signOut({ session }) {
      if (session?.user?.id) {
        const security = new AuthSecurityService(db);
        await security.recordSessionEvent(session.user.id, null, AuthSessionEvent.SIGN_OUT);
      }
    },
  },
};
