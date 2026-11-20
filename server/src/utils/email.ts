/**
 * Envio de e-mails transacionais via API HTTP da Brevo (antigo Sendinblue).
 *
 * Por que API HTTP e não SMTP: o plano gratuito do Render bloqueia portas SMTP
 * de saída, e a Brevo permite enviar para qualquer destinatário verificando
 * apenas um e-mail remetente (sem precisar de domínio próprio).
 *
 * Variáveis de ambiente:
 * - BREVO_API_KEY     Chave da API (Brevo > SMTP & API > API Keys)
 * - MAIL_FROM_EMAIL   E-mail remetente verificado na Brevo
 * - MAIL_FROM_NAME    Nome exibido como remetente (opcional)
 *
 * Sem BREVO_API_KEY fora de produção, o código é apenas impresso no console
 * (útil para desenvolvimento local).
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function isEmailServiceConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL);
}

function canUseConsoleFallback(): boolean {
  return (process.env.APP_ENV || process.env.NODE_ENV) !== 'production';
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<void> {
  if (!isEmailServiceConfigured()) {
    if (canUseConsoleFallback()) {
      console.log(`📧 [E-mail simulado — configure BREVO_API_KEY para enviar de verdade]\nPara: ${to}\nAssunto: ${subject}\n${text}`);
      return;
    }
    throw new Error('Serviço de e-mail não configurado (BREVO_API_KEY / MAIL_FROM_EMAIL).');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY as string,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: process.env.MAIL_FROM_EMAIL,
        name: process.env.MAIL_FROM_NAME || 'MyTrackList',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Falha ao enviar e-mail (Brevo ${response.status}): ${body}`);
  }
}

export async function sendVerificationCodeEmail(to: string, username: string, code: string): Promise<void> {
  const subject = `${code} é o seu código de verificação — MyTrackList`;
  const text =
    `Olá, ${username}!\n\n` +
    `Seu código de verificação para ativar sua conta no MyTrackList é:\n\n` +
    `>> ${code} <<\n\n` +
    `Este código é válido por 10 minutos.\n` +
    `Se você não solicitou este cadastro no MyTrackList, por favor desconsidere este e-mail.\n\n` +
    `Atenciosamente,\nEquipe MyTrackList`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Código de Verificação - MyTrackList</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #121212; color: #ffffff; margin: 0; padding: 0; }
        .wrapper { width: 100%; max-width: 520px; margin: 40px auto; background-color: #181818; border-radius: 12px; border: 1px solid #282828; overflow: hidden; }
        .header { background: linear-gradient(135deg, #1db954 0%, #15883e 100%); padding: 32px 24px; text-align: center; }
        .logo { font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; text-decoration: none; margin: 0; }
        .content { padding: 32px 28px; color: #e0e0e0; font-size: 15px; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 600; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
        .code-box { background-color: #0c0c0c; border: 1px dashed #1db954; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
        .code { font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #1db954; font-family: 'Courier New', monospace; margin: 0; }
        .timer-warning { font-size: 13px; color: #a0a0a0; margin-top: 8px; margin-bottom: 0; }
        .footer { padding: 20px 28px; border-top: 1px solid #282828; font-size: 12px; color: #777777; text-align: center; }
      </style>
    </head>
    <body style="background-color: #121212; margin: 0; padding: 20px;">
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">🎵 MyTrackList</h1>
        </div>
        <div class="content">
          <p class="greeting">Olá, ${escapeHtml(username)}!</p>
          <p>Você iniciou a criação da sua conta no <strong>MyTrackList</strong>. Utilize o código de confirmação abaixo para concluir seu cadastro:</p>
          
          <div class="code-box">
            <div class="code">${code}</div>
            <p class="timer-warning">⏱️ Válido por <strong>10 minutos</strong></p>
          </div>
          
          <p style="font-size: 13px; color: #888;">Se você não solicitou este cadastro, pode ignorar este e-mail com segurança. Nenhuma conta será criada sem a inserção deste código.</p>
        </div>
        <div class="footer">
          <p style="margin: 0;">© ${new Date().getFullYear()} MyTrackList • Sua plataforma social de música.</p>
          <p style="margin: 4px 0 0 0;">Esta é uma mensagem automática gerada pelo sistema. Não responda a este e-mail.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to, subject, html, text });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

