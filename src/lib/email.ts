import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (!resend || !env.RESEND_FROM_EMAIL) {
    logger.warn("Password reset email skipped because Resend is not configured", {
      email,
      resetUrl,
    });
    return;
  }

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Redefinição de senha do aptto-grad",
    html: `
      <p>Recebemos um pedido para redefinir a sua senha.</p>
      <p><a href="${resetUrl}">Clique aqui para redefinir a senha</a></p>
      <p>Se não pediu esta ação, pode ignorar este email.</p>
    `,
  });
}
