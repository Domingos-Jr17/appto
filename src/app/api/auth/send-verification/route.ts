import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import crypto from "crypto";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, emailVerified: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  if (user.emailVerified) {
    return NextResponse.json(
      { error: "Email already verified" },
      { status: 400 }
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires,
    },
  });

  const nextauthUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${nextauthUrl}/verify-email?token=${token}`;

  try {
    await sendVerificationEmail(user.email, user.name, verifyUrl);
    return NextResponse.json({ message: "Verification email sent" });
  } catch {
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
