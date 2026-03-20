import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      credits: number;
    };
  }
  interface User {
    id: string;
    role: string;
    credits: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    credits: number;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: {
            credits: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          credits: user.credits?.balance || 0,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signUp: "/register",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.credits = user.credits;
      }

      // Update credits on session update
      if (trigger === "update" && session?.credits !== undefined) {
        token.credits = session.credits;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.credits = token.credits;
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
          // User exists, just return
          user.id = existingUser.id;
          user.role = existingUser.role;
          user.credits = existingUser.credits?.balance || 0;
          return true;
        }

        // New OAuth user - will be created by PrismaAdapter
        // We need to handle this in events.signIn
      }
      return true;
    },
  },
  events: {
    async signIn({ user, account }) {
      // Create credits and subscription for new OAuth users
      if (account?.provider !== "credentials") {
        const existingCredits = await db.credit.findUnique({
          where: { userId: user.id },
        });

        if (!existingCredits) {
          // New user - give them free credits
          await db.credit.create({
            data: {
              userId: user.id,
              balance: 150, // Free plan credits
            },
          });

          await db.creditTransaction.create({
            data: {
              userId: user.id,
              amount: 150,
              type: "BONUS",
              description: "Créditos iniciais de boas-vindas",
            },
          });

          await db.subscription.create({
            data: {
              userId: user.id,
              plan: "FREE",
              status: "ACTIVE",
              creditsPerMonth: 150,
            },
          });

          await db.userSettings.create({
            data: {
              userId: user.id,
            },
          });
        }
      }
    },
  },
};
