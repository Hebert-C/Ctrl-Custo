import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? "587", 10),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const appUrl = process.env.APP_URL ?? "http://localhost:5173";
  const link = `${appUrl}/verify-email?token=${token}`;
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Confirme seu e-mail — Ctrl+Custo",
    text: `Olá!\n\nClique no link abaixo para ativar sua conta:\n\n${link}\n\nO link expira em 24 horas.\n\nSe você não criou uma conta, ignore este e-mail.`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px">Confirme seu e-mail</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px">Clique no botão abaixo para ativar sua conta no <strong>Ctrl+Custo</strong>.</p>
    <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">Confirmar e-mail</a>
    <p style="color:#9ca3af;margin:24px 0 0;font-size:12px">Link válido por 24 horas. Se você não criou uma conta, ignore este e-mail.</p>
    <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 0"/>
    <p style="color:#d1d5db;margin:16px 0 0;font-size:11px">Ctrl+Custo — Controle financeiro pessoal</p>
  </div>
</body>
</html>`,
  });
}

export async function sendResendVerificationEmail(to: string, token: string) {
  return sendVerificationEmail(to, token);
}
