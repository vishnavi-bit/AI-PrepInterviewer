/** @jest-environment node */
// Registration email, forgot password, reset password and the confirmation email, against the real server and database.
// Messages are captured by the in-memory mail transport; SMTP delivery uses the same code path with your credentials.
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';

jest.setTimeout(60000);
let server: Server;
let base: string;
let tmp: string;

async function call(method: string, p: string, body?: unknown) {
  const res = await fetch(base + p, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json: any = undefined;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  return { status: res.status, json, cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

// The reset link in the captured email, e.g. http://localhost:5173/reset-password?token=...
function tokenFrom(mail: { text: string }): string {
  const m = /reset-password\?token=([A-Za-z0-9_\-]+)/.exec(mail.text);
  if (!m) throw new Error('no reset link in the email');
  return decodeURIComponent(m[1]);
}

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-recovery-'));
  process.env.DATABASE_URL = `file:${path.join(tmp, 'test.db')}`;
  process.env.UPLOADS_DIR = path.join(tmp, 'uploads');
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-123';
  process.env.MAIL_TRANSPORT = 'memory';
  process.env.APP_BASE_URL = 'http://localhost:5173';
  const { start } = await import('../../src/http/server');
  server = await start(0);
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch { /* Windows keeps the database locked briefly */ }
});

describe('registration', () => {
  it('creates the account without logging in, and queues a welcome email', async () => {
    const { resetSentMail, sentMail } = await import('../../src/services/email');
    resetSentMail();
    const r = await call('POST', '/api/auth/register', { name: 'Welcome Person', email: 'welcome@example.com', password: 'StrongPass123' });
    expect(r.status).toBe(201);
    expect(r.cookie).toBeUndefined();
    expect(r.json.email).toBe('welcome@example.com');
    // The welcome email is sent in the background; wait briefly for it.
    for (let i = 0; i < 50 && sentMail().length === 0; i++) await new Promise((res) => setTimeout(res, 20));
    const mail = sentMail().find((m) => m.to === 'welcome@example.com');
    expect(mail).toBeDefined();
    expect(mail!.subject).toMatch(/Welcome to AI PrepInterviewer/);
    expect(mail!.text).toMatch(/Thank you for registering with AI PrepInterviewer/);
    expect(mail!.html).toMatch(/Welcome, Welcome Person/);
  });

  it('rejects a duplicate email with a clear message', async () => {
    const r = await call('POST', '/api/auth/register', { name: 'Welcome Again', email: 'WELCOME@example.com', password: 'StrongPass123' });
    expect(r.status).toBe(409);
    expect(r.json.error).toMatch(/already exists/);
  });

  it('lets the new user log in straight after registering', async () => {
    const login = await call('POST', '/api/auth/login', { email: 'welcome@example.com', password: 'StrongPass123' });
    expect(login.status).toBe(200);
    expect(login.cookie).toMatch(/^pp_session=/);
  });
});

describe('forgot password and reset', () => {
  beforeAll(async () => {
    await call('POST', '/api/auth/register', { name: 'Reset Person', email: 'reset@example.com', password: 'OldPassword1' });
  });

  it('sends a reset link to a registered address', async () => {
    const { resetSentMail, sentMail } = await import('../../src/services/email');
    resetSentMail();
    const r = await call('POST', '/api/auth/forgot-password', { email: 'reset@example.com' });
    expect(r.status).toBe(200);
    const mail = sentMail().find((m) => m.to === 'reset@example.com');
    expect(mail).toBeDefined();
    expect(mail!.subject).toMatch(/Reset your AI PrepInterviewer password/);
    expect(mail!.text).toMatch(/expires in 30 minutes/);
    expect(mail!.html).toMatch(/Choose a new password/);
    expect(tokenFrom(mail!).length).toBeGreaterThan(30);
  });

  it('answers the same way for an unknown address, and sends nothing', async () => {
    const { resetSentMail, sentMail } = await import('../../src/services/email');
    resetSentMail();
    const r = await call('POST', '/api/auth/forgot-password', { email: 'nobody-here@example.com' });
    expect(r.status).toBe(200);
    expect(r.json.message).toMatch(/If an account exists/);
    expect(sentMail()).toHaveLength(0);
  });

  it('limits how often a reset email can be requested for one account', async () => {
    const { resetSentMail, sentMail } = await import('../../src/services/email');
    resetSentMail();
    const r = await call('POST', '/api/auth/forgot-password', { email: 'reset@example.com' });
    expect(r.status).toBe(200);
    expect(sentMail()).toHaveLength(0);
  });

  it('checks a link before the form is shown', async () => {
    const { createClient } = await import('@libsql/client');
    const { resetSentMail, sentMail } = await import('../../src/services/email');
    resetSentMail();
    const client = createClient({ url: process.env.DATABASE_URL! });
    await client.execute("UPDATE password_reset_tokens SET created_at = '2000-01-01T00:00:00.000Z'");
    client.close();
    await call('POST', '/api/auth/forgot-password', { email: 'reset@example.com' });
    const token = tokenFrom(sentMail().find((m) => m.to === 'reset@example.com')!);
    const ok = await fetch(`${base}/api/auth/reset-password/check?token=${encodeURIComponent(token)}`).then((r) => r.json());
    expect(ok.valid).toBe(true);
    const bad = await fetch(`${base}/api/auth/reset-password/check?token=not-a-real-token-value-here`).then((r) => r.json());
    expect(bad.valid).toBe(false);
  });

  it('resets the password once, sends a confirmation, and refuses the same link again', async () => {
    const { resetSentMail, sentMail } = await import('../../src/services/email');
    resetSentMail();
    // Request a fresh link: the cooldown is passed by moving the earlier token's creation time back.
    const { createClient } = await import('@libsql/client');
    const client = createClient({ url: process.env.DATABASE_URL! });
    await client.execute("UPDATE password_reset_tokens SET created_at = '2000-01-01T00:00:00.000Z'");
    client.close();
    await call('POST', '/api/auth/forgot-password', { email: 'reset@example.com' });
    const token = tokenFrom(sentMail().find((m) => m.to === 'reset@example.com')!);

    const done = await call('POST', '/api/auth/reset-password', { token, password: 'NewPassword2' });
    expect(done.status).toBe(200);
    const confirm = sentMail().find((m) => m.subject === 'Your AI PrepInterviewer password was changed');
    expect(confirm).toBeDefined();
    expect(confirm!.to).toBe('reset@example.com');

    const again = await call('POST', '/api/auth/reset-password', { token, password: 'AnotherPass3' });
    expect(again.status).toBe(400);
    expect(again.json.error).toMatch(/invalid or has expired/);

    expect((await call('POST', '/api/auth/login', { email: 'reset@example.com', password: 'OldPassword1' })).status).toBe(401);
    expect((await call('POST', '/api/auth/login', { email: 'reset@example.com', password: 'NewPassword2' })).status).toBe(200);
  });

  it('refuses an expired link', async () => {
    const { createClient } = await import('@libsql/client');
    const { resetSentMail, sentMail } = await import('../../src/services/email');
    resetSentMail();
    const client = createClient({ url: process.env.DATABASE_URL! });
    await client.execute("UPDATE password_reset_tokens SET created_at = '2000-01-01T00:00:00.000Z'");
    client.close();
    await call('POST', '/api/auth/forgot-password', { email: 'reset@example.com' });
    const token = tokenFrom(sentMail().find((m) => m.to === 'reset@example.com')!);
    const client2 = createClient({ url: process.env.DATABASE_URL! });
    await client2.execute({ sql: 'UPDATE password_reset_tokens SET expires_at = ? WHERE used_at IS NULL', args: ['2000-01-01T00:00:00.000Z'] });
    client2.close();
    const r = await call('POST', '/api/auth/reset-password', { token, password: 'ThirdPassword4' });
    expect(r.status).toBe(400);
  });

  it('rejects a weak new password without touching the link', async () => {
    const r = await call('POST', '/api/auth/reset-password', { token: 'x'.repeat(40), password: 'short' });
    expect(r.status).toBe(400);
  });
});

describe('when email is not configured', () => {
  it('says so clearly instead of pretending an email was sent', async () => {
    const saved = process.env.MAIL_TRANSPORT;
    delete process.env.MAIL_TRANSPORT;
    delete process.env.SMTP_HOST;
    try {
      const r = await call('POST', '/api/auth/forgot-password', { email: 'reset@example.com' });
      expect(r.status).toBe(503);
      expect(r.json.error).toMatch(/not configured/);
    } finally {
      process.env.MAIL_TRANSPORT = saved;
    }
  });
});
