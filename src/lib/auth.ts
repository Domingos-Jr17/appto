import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AuthSecurityService } from "@/lib/auth-security";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifySync } from "otplib";
import { decryptText } from "@/lib/crypto";
import { AuthSessionEvent } from "@prisma/client";
import { sendSuspiciousLoginAlert } from "@/lib/email";

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
      emailVerified?: Date | null;
    };
    error?: "SessionInvalidated";
  }
  interface User {
    id: string;
    role: string;
    credits: number;
    twoFactorEnabled: boolean;
    passwordChangedAt?: string | null;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    credits?: number;
    twoFactorEnabled?: boolean;
    passwordChangedAt?: string | null;
    invalidated?: boolean;
    emailVerified?: Date | null;
  }
}

const sessionTokenCookieName = env.isProduction
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  secret: env.AUTH_SECRET,
  cookies: {
    sessionToken: {
      name: sessionTokenCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: env.isProduction,
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

        await enforceRateLimit(`login:${normalizedEmail}`, 20, 60 * 1000);

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
            throw new Error("Excedeu as tentativas de login. Conta bloqueada por 15 minutos.");
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
          passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
          emailVerified: user.emailVerified,
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
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.credits = user.credits;
        token.twoFactorEnabled = user.twoFactorEnabled;
        token.passwordChangedAt = user.passwordChangedAt ?? null;
        token.invalidated = false;
        token.emailVerified = user.emailVerified ?? null;
      }

      if (!token.sub) {
        return token;
      }

      const currentUser = await db.user.findUnique({
        where: { id: token.sub },
        include: { credits: true },
      });

      if (!currentUser) {
        token.invalidated = true;
        return token;
      }

      const currentPasswordChangedAt = currentUser.passwordChangedAt?.toISOString() ?? null;
      if ((token.passwordChangedAt ?? null) !== currentPasswordChangedAt) {
        token.invalidated = true;
      }

      token.role = currentUser.role;
      token.credits = currentUser.credits?.balance || 0;
      token.twoFactorEnabled = currentUser.twoFactorEnabled;
      token.passwordChangedAt = currentPasswordChangedAt;
      token.emailVerified = currentUser.emailVerified;
      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      if (token.invalidated || !token.sub) {
        session.error = "SessionInvalidated";
        session.user.id = "";
        session.user.role = "STUDENT";
        session.user.credits = 0;
        session.user.twoFactorEnabled = false;
        return session;
      }

      session.user.id = token.sub;
      session.user.role = token.role || "STUDENT";
      session.user.credits = token.credits || 0;
      session.user.twoFactorEnabled = Boolean(token.twoFactorEnabled);
      session.user.emailVerified = token.emailVerified ?? null;
      return session;
    },
    async signIn({ user, account }) {
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
          user.passwordChangedAt = existingUser.passwordChangedAt?.toISOString() ?? null;
          return true;
        }
      }
      return true;
    },
  },
  events: {
    async signIn({ user, account }) {
      const security = new AuthSecurityService(db);
      const existingSubscription = await db.subscription.findUnique({
        where: { userId: user.id },
      });

      if (!existingSubscription) {
        await db.subscription.create({
          data: {
            userId: user.id,
            package: "FREE",
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

      // Check for suspicious login (new IP/UA)
      const headers = await import("next/headers");
      const requestHeaders = await headers.headers();
      const ip = requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? null;
      const userAgent = requestHeaders.get("user-agent") ?? null;

      const previousSessions = await db.session.findMany({
        where: { userId: user.id },
        orderBy: { lastActiveAt: "desc" },
        take: 5,
      });

      const isNewDevice = !previousSessions.some(
        (s) => s.ipAddress === ip && s.userAgent === userAgent
      );

      if (isNewDevice && previousSessions.length > 0 && user.email) {
        sendSuspiciousLoginAlert(user.email, user.name ?? null, {
          ipAddress: ip,
          userAgent: userAgent,
          date: new Date().toLocaleString("pt-MZ"),
        }).catch((err) => {
          console.error("Failed to send suspicious login alert:", err);
        });
      }
    },
    async signOut({ session }) {
      if (session?.user?.id) {
        const security = new AuthSecurityService(db);
        await security.recordSessionEvent(session.user.id, null, AuthSessionEvent.SIGN_OUT);
      }
    },
  },
};
