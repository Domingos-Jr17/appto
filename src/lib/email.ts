import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// ==================== TRANSPORTERS ====================

const smtpTransporter =
  env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST ?? "smtp.gmail.com",
        port: env.SMTP_PORT ?? 465,
        secure: env.SMTP_SECURE ?? true,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      })
    : null;

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function getFrom() {
  if (env.SMTP_USER) return `aptto <${env.SMTP_USER}>`;
  if (env.RESEND_FROM_EMAIL) return `aptto <${env.RESEND_FROM_EMAIL}>`;
  return "onboarding@resend.dev";
}

async function sendMail(to: string, subject: string, html: string) {
  // Try SMTP (Gmail) first
  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: getFrom(),
        to,
        subject,
        html,
      });
      logger.info("Email sent via SMTP", { to, subject });
      return;
    } catch (err) {
      logger.warn("SMTP send failed, falling back to Resend", {
        to,
        error: String(err),
      });
    }
  }

  // Fallback to Resend
  if (resendClient) {
    try {
      await resendClient.emails.send({
        from: getFrom(),
        to,
        subject,
        html,
      });
      logger.info("Email sent via Resend", { to, subject });
      return;
    } catch (err) {
      logger.error("Both SMTP and Resend failed", {
        to,
        smtpError: "checked first",
        resendError: String(err),
      });
      throw err;
    }
  }

  logger.warn("No email transport configured (no SMTP or Resend)", { to, subject });
}

// ==================== HTML HELPERS ====================

function baseLayout(title: string, body: string, footer?: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #1a1916;">
      <div style="padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #1a1916;">aptto</h1>
        </div>
        <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px; color: #1a1916;">${title}</h2>
        ${body}
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
          <p style="color: #8a877e; font-size: 12px; margin: 0 0 8px;">${footer || "Este email foi enviado pela plataforma aptto."}</p>
          <p style="color: #8a877e; font-size: 12px; margin: 0;">Maputo, Moçambique · ola@aptto.co.mz</p>
        </div>
      </div>
    </div>
  `;
}

function ctaButton(text: string, url: string) {
  return `<a href="${url}" style="display: inline-block; background: #2d52e0; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 16px 0;">${text}</a>`;
}

function paragraph(text: string, color = "#5a574f", size = "14px") {
  return `<p style="color: ${color}; font-size: ${size}; line-height: 1.6; margin: 0 0 12px;">${text}</p>`;
}

// ==================== 1. PASSWORD RESET ====================
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const body =
    paragraph("Recebemos um pedido para redefinir a tua palavra-passe no aptto.") +
    ctaButton("Redefinir palavra-passe", resetUrl) +
    paragraph("Este link expira em 30 minutos.", "#8a877e", "13px") +
    paragraph("Se não pediste esta acção, ignora este email.", "#8a877e", "12px");

  await sendMail(email, "Redefinir palavra-passe — aptto", baseLayout("Redefinir palavra-passe", body));
}

// ==================== 2. EMAIL VERIFICATION ====================
export async function sendVerificationEmail(email: string, name: string | null, verifyUrl: string) {
  const greeting = name ? `Olá ${name},` : "Olá,";

  const body =
    paragraph(greeting) +
    paragraph("Clica no link abaixo para verificar o teu email no aptto:") +
    ctaButton("Verificar email", verifyUrl) +
    paragraph("Este link expira em 24 horas.", "#8a877e", "13px") +
    paragraph("Se não criaste uma conta no aptto, ignora este email.", "#8a877e", "12px");

  await sendMail(email, "Verifica o teu email — aptto", baseLayout("Verificar email", body));
}

// ==================== 3. WELCOME EMAIL ====================
export async function sendWelcomeEmail(email: string, name: string | null) {
  const greeting = name ? `Bem-vindo(a), ${name}!` : "Bem-vindo(a)!";

  const body =
    paragraph(greeting) +
    paragraph("A tua conta no aptto foi criada com sucesso. Aqui está o que podes fazer:") +
    `<div style="margin: 16px 0;">
      <div style="padding: 12px 16px; background: #f4f3f0; border-radius: 8px; margin-bottom: 8px;">
        <p style="margin: 0; font-size: 14px;"><strong>1.</strong> Cria o teu primeiro trabalho académico</p>
      </div>
      <div style="padding: 12px 16px; background: #f4f3f0; border-radius: 8px; margin-bottom: 8px;">
        <p style="margin: 0; font-size: 14px;"><strong>2.</strong> Usa a IA para estruturar e melhorar o teu texto</p>
      </div>
      <div style="padding: 12px 16px; background: #f4f3f0; border-radius: 8px; margin-bottom: 8px;">
        <p style="margin: 0; font-size: 14px;"><strong>3.</strong> Exporta em DOCX ou PDF (plano PRO)</p>
      </div>
    </div>` +
    paragraph("Tens créditos de boas-vindas disponíveis para começar.", "#2d52e0", "14px") +
    ctaButton("Começar agora", `${env.APP_URL}/app`) +
    paragraph("Se tiveres dúvidas, consulta o nosso FAQ ou contacta-nos em ola@aptto.co.mz.", "#8a877e", "12px");

  await sendMail(email, "Bem-vindo(a) ao aptto!", baseLayout("Bem-vindo(a) ao aptto", body));
}

// ==================== 4. PURCHASE RECEIPT ====================
export async function sendPurchaseReceiptEmail(
  email: string,
  name: string | null,
  details: {
    packageName: string;
    amount: number;
    currency: string;
    worksIncluded: number;
    paymentMethod: string;
    transactionId: string;
    date: string;
  }
) {
  const greeting = name ? `Olá ${name},` : "Olá,";

  const body =
    paragraph(greeting) +
    paragraph("O teu pagamento foi confirmado com sucesso. Aqui está o resumo:") +
    `<div style="margin: 16px 0; padding: 16px; background: #f4f3f0; border-radius: 8px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #5a574f;">Pacote</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.packageName}</td></tr>
        <tr><td style="padding: 6px 0; color: #5a574f;">Trabalhos incluídos</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.worksIncluded}</td></tr>
        <tr><td style="padding: 6px 0; color: #5a574f;">Método de pagamento</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.paymentMethod}</td></tr>
        <tr><td style="padding: 6px 0; color: #5a574f;">Data</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.date}</td></tr>
        <tr><td style="padding: 6px 0; color: #5a574f;">Transacção</td><td style="padding: 6px 0; text-align: right; font-weight: 600; font-family: monospace; font-size: 12px;">${details.transactionId}</td></tr>
        <tr style="border-top: 1px solid #d4d3d0;"><td style="padding: 10px 0 6px; font-weight: 600; font-size: 16px;">Total</td><td style="padding: 10px 0 6px; text-align: right; font-weight: 700; font-size: 16px;">${details.amount} ${details.currency}</td></tr>
      </table>
    </div>` +
    ctaButton("Ver os meus projectos", `${env.APP_URL}/app`) +
    paragraph("Obrigado por usares o aptto!", "#8a877e", "12px");

  await sendMail(
    email,
    `Recibo — ${details.packageName} (${details.amount} ${details.currency})`,
    baseLayout("Recibo de pagamento", body, "Guarda este email como comprovativo de pagamento.")
  );
}

// ==================== 5. EXTRA WORKS RECEIPT ====================
export async function sendExtraWorksReceiptEmail(
  email: string,
  name: string | null,
  details: {
    quantity: number;
    unitPrice: number;
    total: number;
    currency: string;
    paymentMethod: string;
    transactionId: string;
    date: string;
    validityMonths: number;
  }
) {
  const greeting = name ? `Olá ${name},` : "Olá,";

  const body =
    paragraph(greeting) +
    paragraph("A tua compra de trabalhos extras foi confirmada:") +
    `<div style="margin: 16px 0; padding: 16px; background: #f4f3f0; border-radius: 8px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #5a574f;">Quantidade</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.quantity} trabalho(s)</td></tr>
        <tr><td style="padding: 6px 0; color: #5a574f;">Preço unitário</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.unitPrice} ${details.currency}</td></tr>
        <tr><td style="padding: 6px 0; color: #5a574f;">Validade</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.validityMonths} meses</td></tr>
        <tr><td style="padding: 6px 0; color: #5a574f;">Método de pagamento</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.paymentMethod}</td></tr>
        <tr><td style="padding: 6px 0; color: #5a574f;">Data</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.date}</td></tr>
        <tr><td style="padding: 6px 0; color: #5a574f;">Transacção</td><td style="padding: 6px 0; text-align: right; font-weight: 600; font-family: monospace; font-size: 12px;">${details.transactionId}</td></tr>
        <tr style="border-top: 1px solid #d4d3d0;"><td style="padding: 10px 0 6px; font-weight: 600; font-size: 16px;">Total</td><td style="padding: 10px 0 6px; text-align: right; font-weight: 700; font-size: 16px;">${details.total} ${details.currency}</td></tr>
      </table>
    </div>` +
    ctaButton("Ver os meus créditos", `${env.APP_URL}/app/subscription`) +
    paragraph("Os trabalhos extras foram adicionados à tua conta.", "#8a877e", "12px");

  await sendMail(
    email,
    `Recibo — ${details.quantity} trabalho(s) extra(s) (${details.total} ${details.currency})`,
    baseLayout("Recibo de compra", body, "Guarda este email como comprovativo de pagamento.")
  );
}

// ==================== 6. LOW CREDITS ALERT ====================
export async function sendLowCreditsAlert(
  email: string,
  name: string | null,
  details: { remaining: number; total: number }
) {
  const greeting = name ? `Olá ${name},` : "Olá,";

  const body =
    paragraph(greeting) +
    paragraph(`O teu saldo de trabalhos está baixo. Restam-te <strong>${details.remaining}</strong> de ${details.total} trabalhos disponíveis.`) +
    paragraph("Para não ficares sem capacidade de trabalho, considera adicionar trabalhos extras ou actualizar o teu plano.") +
    ctaButton("Adicionar trabalhos", `${env.APP_URL}/app/subscription`) +
    paragraph("Este é um aviso automático. Não precisas de tomar nenhuma acção imediata.", "#8a877e", "12px");

  await sendMail(email, "Aviso: saldo de trabalhos baixo — aptto", baseLayout("Saldo de trabalhos baixo", body));
}

// ==================== 7. SUSPICIOUS LOGIN ALERT ====================
export async function sendSuspiciousLoginAlert(
  email: string,
  name: string | null,
  details: { ipAddress?: string | null; userAgent?: string | null; date: string }
) {
  const greeting = name ? `Olá ${name},` : "Olá,";

  const body =
    paragraph(greeting) +
    paragraph("Detectámos um login na tua conta a partir de um dispositivo ou localização diferente do habitual:") +
    `<div style="margin: 16px 0; padding: 16px; background: #fdf0ef; border-radius: 8px; border: 1px solid rgba(192,57,43,.15);">
      ${details.ipAddress ? `<p style="margin: 0 0 8px; font-size: 14px;"><strong>IP:</strong> ${details.ipAddress}</p>` : ""}
      ${details.userAgent ? `<p style="margin: 0 0 8px; font-size: 14px;"><strong>Dispositivo:</strong> ${details.userAgent}</p>` : ""}
      <p style="margin: 0; font-size: 14px;"><strong>Data:</strong> ${details.date}</p>
    </div>` +
    paragraph("Se foste tu que entraste, podes ignorar este email.") +
    paragraph("Se não reconheces este login, altera a tua palavra-passe imediatamente e activa a autenticação de dois factores (2FA).") +
    ctaButton("Alterar palavra-passe", `${env.APP_URL}/app/definicoes?tab=seguranca`) +
    paragraph("Se não tentaste entrar na tua conta, contacta-nos em ola@aptto.co.mz.", "#8a877e", "12px");

  await sendMail(email, "Actividade suspeita na tua conta — aptto", baseLayout("Actividade suspeita detectada", body, "Este email foi enviado automaticamente para proteger a tua conta."));
}

// ==================== 8. MARKETING / NEWSLETTER ====================
export async function sendMarketingEmail(
  email: string,
  name: string | null,
  details: {
    subject: string;
    title: string;
    body: string;
    ctaText?: string;
    ctaUrl?: string;
  }
) {
  const greeting = name ? `Olá ${name},` : "Olá,";

  const htmlBody =
    paragraph(greeting) +
    details.body +
    (details.ctaText && details.ctaUrl ? ctaButton(details.ctaText, details.ctaUrl) : "") +
    paragraph("Para deixares de receber emails de novidades, visita as tuas definições de notificações.", "#8a877e", "12px");

  await sendMail(email, details.subject, baseLayout(details.title, htmlBody, "aptto · Maputo, Moçambique"));
}
