import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: "appto2026@gmail.com", pass: "jhsn vuxb lylx thmy" },
});

const to = "domingosalfredotimane@gmail.com";

function layout(title, body, footer) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #1a1916;">
      <div style="padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 32px;"><h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #1a1916;">aptto</h1></div>
        <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px; color: #1a1916;">${title}</h2>
        ${body}
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
          <p style="color: #8a877e; font-size: 12px; margin: 0 0 8px;">${footer || "Este email foi enviado pela plataforma aptto."}</p>
          <p style="color: #8a877e; font-size: 12px; margin: 0;">Maputo, Moçambique · ola@aptto.co.mz</p>
        </div>
      </div>
    </div>`;
}

function p(text, color = "#5a574f", size = "14px") {
  return `<p style="color: ${color}; font-size: ${size}; line-height: 1.6; margin: 0 0 12px;">${text}</p>`;
}

function btn(text, url) {
  return `<a href="${url}" style="display: inline-block; background: #2d52e0; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 16px 0;">${text}</a>`;
}

const emails = [
  {
    subject: "Verifica o teu email — aptto",
    html: layout("Verificar email",
      p("Olá,") +
      p("Clica no link abaixo para verificar o teu email no aptto:") +
      btn("Verificar email", "https://appto-grad.vercel.app/verify-email?token=demo-token") +
      p("Este link expira em 24 horas.", "#8a877e", "13px") +
      p("Se não criaste uma conta no aptto, ignora este email.", "#8a877e", "12px")
    ),
  },
  {
    subject: "Redefinir palavra-passe — aptto",
    html: layout("Redefinir palavra-passe",
      p("Recebemos um pedido para redefinir a tua palavra-passe no aptto.") +
      btn("Redefinir palavra-passe", "https://appto-grad.vercel.app/reset-password?token=demo-token") +
      p("Este link expira em 30 minutos.", "#8a877e", "13px") +
      p("Se não pediste esta acção, ignora este email.", "#8a877e", "12px")
    ),
  },
  {
    subject: "Recibo — Starter (100 MZN)",
    html: layout("Recibo de pagamento",
      p("Olá,") +
      p("O teu pagamento foi confirmado com sucesso. Aqui está o resumo:") +
      `<div style="margin: 16px 0; padding: 16px; background: #f4f3f0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #5a574f;">Pacote</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">Starter</td></tr>
          <tr><td style="padding: 6px 0; color: #5a574f;">Trabalhos incluídos</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">4</td></tr>
          <tr><td style="padding: 6px 0; color: #5a574f;">Método de pagamento</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">M-Pesa</td></tr>
          <tr><td style="padding: 6px 0; color: #5a574f;">Data</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">05/04/2026</td></tr>
          <tr style="border-top: 1px solid #d4d3d0;"><td style="padding: 10px 0 6px; font-weight: 600; font-size: 16px;">Total</td><td style="padding: 10px 0 6px; text-align: right; font-weight: 700; font-size: 16px;">100 MZN</td></tr>
        </table>
      </div>` +
      btn("Ver os meus projectos", "https://appto-grad.vercel.app/app") +
      p("Obrigado por usares o aptto!", "#8a877e", "12px"),
      "Guarda este email como comprovativo de pagamento."
    ),
  },
  {
    subject: "Recibo — 3 trabalho(s) extra(s) (150 MZN)",
    html: layout("Recibo de compra",
      p("Olá,") +
      p("A tua compra de trabalhos extras foi confirmada:") +
      `<div style="margin: 16px 0; padding: 16px; background: #f4f3f0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #5a574f;">Quantidade</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">3 trabalho(s)</td></tr>
          <tr><td style="padding: 6px 0; color: #5a574f;">Preço unitário</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">50 MZN</td></tr>
          <tr><td style="padding: 6px 0; color: #5a574f;">Validade</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">3 meses</td></tr>
          <tr><td style="padding: 6px 0; color: #5a574f;">Método de pagamento</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">e-Mola</td></tr>
          <tr><td style="padding: 6px 0; color: #5a574f;">Data</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">05/04/2026</td></tr>
          <tr style="border-top: 1px solid #d4d3d0;"><td style="padding: 10px 0 6px; font-weight: 600; font-size: 16px;">Total</td><td style="padding: 10px 0 6px; text-align: right; font-weight: 700; font-size: 16px;">150 MZN</td></tr>
        </table>
      </div>` +
      btn("Ver os meus créditos", "https://appto-grad.vercel.app/app/subscription") +
      p("Os trabalhos extras foram adicionados à tua conta.", "#8a877e", "12px"),
      "Guarda este email como comprovativo de pagamento."
    ),
  },
  {
    subject: "Aviso: saldo de trabalhos baixo — aptto",
    html: layout("Saldo de trabalhos baixo",
      p("Olá,") +
      p('O teu saldo de trabalhos está baixo. Restam-te <strong>1</strong> de 4 trabalhos disponíveis.') +
      p("Para não ficares sem capacidade de trabalho, considera adicionar trabalhos extras ou actualizar o teu plano.") +
      btn("Adicionar trabalhos", "https://appto-grad.vercel.app/app/subscription") +
      p("Este é um aviso automático. Não precisas de tomar nenhuma acção imediata.", "#8a877e", "12px")
    ),
  },
  {
    subject: "Actividade suspeita na tua conta — aptto",
    html: layout("Actividade suspeita detectada",
      p("Olá,") +
      p("Detectámos um login na tua conta a partir de um dispositivo ou localização diferente do habitual:") +
      `<div style="margin: 16px 0; padding: 16px; background: #fdf0ef; border-radius: 8px; border: 1px solid rgba(192,57,43,.15);">
        <p style="margin: 0 0 8px; font-size: 14px;"><strong>IP:</strong> 196.216.45.123</p>
        <p style="margin: 0 0 8px; font-size: 14px;"><strong>Dispositivo:</strong> Chrome · Windows 10</p>
        <p style="margin: 0; font-size: 14px;"><strong>Data:</strong> 05/04/2026, 14:32</p>
      </div>` +
      p("Se foste tu que entraste, podes ignorar este email.") +
      p("Se não reconheces este login, altera a tua palavra-passe imediatamente e activa a autenticação de dois factores (2FA).") +
      btn("Alterar palavra-passe", "https://appto-grad.vercel.app/app/definicoes?tab=seguranca") +
      p("Se não tentaste entrar na tua conta, contacta-nos em ola@aptto.co.mz.", "#8a877e", "12px"),
      "Este email foi enviado automaticamente para proteger a tua conta."
    ),
  },
  {
    subject: "Novidade: exportação PDF já disponível — aptto",
    html: layout("Novidade: exportação PDF",
      p("Olá,") +
      p("Temos uma novidade para ti! A exportação em PDF já está disponível para utilizadores do plano PRO.") +
      p("Agora podes descarregar os teus trabalhos directamente em PDF, com formatação ABNT pronta para submissão.") +
      btn("Actualizar para PRO", "https://appto-grad.vercel.app/app/subscription") +
      p("Para deixares de receber emails de novidades, visita as tuas definições de notificações.", "#8a877e", "12px"),
      "aptto · Maputo, Moçambique"
    ),
  },
];

async function sendAll() {
  for (let i = 0; i < emails.length; i++) {
    const e = emails[i];
    try {
      const r = await transporter.sendMail({
        from: "aptto <appto2026@gmail.com>",
        to,
        subject: e.subject,
        html: e.html,
      });
      console.log(`${i + 1}. ${e.subject} → ${r.messageId}`);
    } catch (err) {
      console.error(`${i + 1}. ERRO: ${err.message}`);
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  console.log("\nTodos os emails foram enviados!");
}

sendAll();
