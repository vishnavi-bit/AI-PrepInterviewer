// Transactional email: welcome, password reset and password-changed messages.
// Sending uses SMTP, configured by environment variables (see .env.example). Nothing is reported as sent unless the
// transport accepted it. In tests, MAIL_TRANSPORT=memory captures messages instead of sending them.
import nodemailer, { type Transporter } from 'nodemailer';

export interface OutgoingMail { to: string; subject: string; text: string; html: string }

export class MailNotConfiguredError extends Error {}

let transporter: Transporter | undefined;
let captured: OutgoingMail[] = [];

export function mailConfigured(): boolean {
  return process.env.MAIL_TRANSPORT === 'memory' || Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getTransporter(): Transporter | null {
  if (process.env.MAIL_TRANSPORT === 'memory') return null;
  if (!transporter) {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) throw new MailNotConfiguredError('Email is not configured: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM.');
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(message: OutgoingMail): Promise<void> {
  const t = getTransporter();
  if (!t) {
    captured.push(message);
    return;
  }
  await t.sendMail({ from: process.env.SMTP_FROM, to: message.to, subject: message.subject, text: message.text, html: message.html });
}

// Test helpers.
export function sentMail(): OutgoingMail[] {
  return captured;
}
export function resetSentMail(): void {
  captured = [];
}

const APP_NAME = 'AI PrepInterviewer';

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#070B1F;font-family:Arial,Helvetica,sans-serif;color:#EEF2FF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#070B1F;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0E1433;border:1px solid #2A3570;border-radius:20px;padding:36px;">
        <tr><td style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#22D3EE;">${APP_NAME}</td></tr>
        <tr><td style="padding:14px 0 8px;font-size:24px;font-weight:bold;color:#FFFFFF;">${title}</td></tr>
        <tr><td style="font-size:15px;line-height:1.7;color:#C7CEEA;">${body}</td></tr>
        <tr><td style="padding-top:28px;font-size:12px;line-height:1.6;color:#8790B8;border-top:1px solid #2A3570;">You are receiving this because of activity on your ${APP_NAME} account. AI scores are practice estimates and do not guarantee hiring outcomes.</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

export function welcomeMessage(to: string, name: string): OutgoingMail {
  const text = `Hi ${name},\n\nThank you for registering with ${APP_NAME}. Your account is ready. Upload your resume to start your first practice interview.\n\n- The ${APP_NAME} team`;
  return {
    to,
    subject: `Welcome to ${APP_NAME}`,
    text,
    html: layout(`Welcome, ${escapeHtml(name)}`, `<p style="margin:0 0 14px;">Thank you for registering with ${APP_NAME}. Your account has been created successfully.</p><p style="margin:0;">Upload your resume to get role suggestions and start your first mock interview.</p>`),
  };
}

export function resetMessage(to: string, name: string, link: string, minutes: number): OutgoingMail {
  const text = `Hi ${name},\n\nWe received a request to reset your ${APP_NAME} password. Open this link to choose a new password. It works once and expires in ${minutes} minutes:\n\n${link}\n\nIf you did not ask for this, you can ignore this email. Your password will not change.`;
  return {
    to,
    subject: `Reset your ${APP_NAME} password`,
    text,
    html: layout('Reset your password', `<p style="margin:0 0 14px;">Hi ${escapeHtml(name)}, we received a request to reset your password.</p><p style="margin:0 0 22px;"><a href="${link}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:linear-gradient(120deg,#22D3EE,#8B5CF6,#EC4899);color:#FFFFFF;text-decoration:none;font-weight:bold;">Choose a new password</a></p><p style="margin:0 0 10px;font-size:13px;color:#8790B8;">This link works once and expires in ${minutes} minutes. If you did not ask for this, ignore this email.</p><p style="margin:0;font-size:12px;word-break:break-all;color:#8790B8;">${link}</p>`),
  };
}

export function passwordChangedMessage(to: string, name: string): OutgoingMail {
  const text = `Hi ${name},\n\nThe password for your ${APP_NAME} account was just changed. If this was you, no action is needed. If it was not, reset your password right away and contact us.`;
  return {
    to,
    subject: `Your ${APP_NAME} password was changed`,
    text,
    html: layout('Your password was changed', `<p style="margin:0 0 14px;">Hi ${escapeHtml(name)}, the password for your account was just changed.</p><p style="margin:0;">If this was you, no action is needed. If it was not, reset your password right away.</p>`),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
