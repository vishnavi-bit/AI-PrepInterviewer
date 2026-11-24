// Registration, login, logout, the current user, and password recovery (forgot and reset).
import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../lib/passwords';
import { endSession, requireUser, startSession, userIdOf } from '../lib/session';
import { badRequest, conflict, HttpError, notFound, unauthorized } from '../lib/errors';
import { db, newId, now, one, run, type Row } from '../lib/db';
import { wrap, parseBody } from '../lib/http';
import { MailNotConfiguredError, mailConfigured, passwordChangedMessage, resetMessage, sendMail, welcomeMessage } from '../services/email';

const RESET_TTL_MINUTES = 30;
const RESET_COOLDOWN_SECONDS = 60;

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: z.email('Enter a valid email address.').max(254).transform((e) => e.toLowerCase()),
  password: z.string().min(8, 'Use at least 8 characters for your password.').max(200),
});
const loginSchema = z.object({
  email: z.email('Enter a valid email address.').max(254).transform((e) => e.toLowerCase()),
  password: z.string().min(1, 'Enter your password.').max(200),
});
const forgotSchema = z.object({
  email: z.email('Enter a valid email address.').max(254).transform((e) => e.toLowerCase()),
});
const resetSchema = z.object({
  token: z.string().min(20, 'This reset link is not valid.').max(200),
  password: z.string().min(8, 'Use at least 8 characters for your new password.').max(200),
});

export const publicUser = (row: Row) => ({ id: String(row.id), name: String(row.name), email: String(row.email), createdAt: String(row.created_at) });

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const isUniqueViolation = (err: unknown) => err instanceof Error && /UNIQUE constraint failed/i.test(err.message);

// Sends a mail and reports failure to the caller, so a page never claims an email went out when it did not.
async function deliver(message: Parameters<typeof sendMail>[0]): Promise<void> {
  if (!mailConfigured()) throw new MailNotConfiguredError('Email is not configured on this server.');
  await sendMail(message);
}

export function mountAuth(router: Router): void {
  // Creating the account saves the user row and returns straight away. The welcome email is sent in the background,
  // so a slow mail server never delays the success screen.
  router.post('/api/auth/register', wrap(async (req, res) => {
    const input = parseBody(registerSchema, req.body);
    const database = db(req);
    const id = newId();
    const stamp = now();
    try {
      await run(database, 'INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [id, input.email, input.name, await hashPassword(input.password), stamp, stamp]);
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict('An account with this email already exists. Log in instead.');
      throw err;
    }
    const user = { id, name: input.name, email: input.email, created_at: stamp };
    if (mailConfigured()) {
      sendMail(welcomeMessage(input.email, input.name)).catch((err) => console.error('welcome email failed:', err instanceof Error ? err.message : err));
    } else {
      console.warn('welcome email skipped: email is not configured');
    }
    res.status(201).json(publicUser(user));
  }));

  router.post('/api/auth/login', wrap(async (req, res) => {
    const input = parseBody(loginSchema, req.body);
    const database = db(req);
    const user = await one(database, 'SELECT * FROM users WHERE email = ?', [input.email]);
    // The same message for an unknown email and a wrong password, so accounts cannot be probed.
    const ok = user ? await verifyPassword(input.password, String(user.password_hash)) : false;
    if (!user || !ok) throw unauthorized('Invalid email or password.');
    await startSession(res, String(user.id));
    res.json(publicUser(user));
  }));

  router.post('/api/auth/logout', (_req, res) => {
    endSession(res);
    res.status(204).end();
  });

  router.get('/api/auth/me', requireUser, wrap(async (req, res) => {
    const user = await one(db(req), 'SELECT * FROM users WHERE id = ?', [userIdOf(req)]);
    if (!user) throw notFound('Your account could not be found. Please log in again.');
    res.json(publicUser(user));
  }));

  // Step 1 of recovery: send a single-use reset link to a registered address.
  // The answer is the same whether or not the address has an account, so the form cannot be used to find accounts.
  router.post('/api/auth/forgot-password', wrap(async (req, res) => {
    const input = parseBody(forgotSchema, req.body);
    if (!mailConfigured()) throw new HttpError(503, 'Password reset email is not configured on this server yet. Please contact support.');
    const database = db(req);
    const user = await one(database, 'SELECT id, name, email FROM users WHERE email = ?', [input.email]);
    const generic = { message: 'If an account exists for that email, a password reset link has been sent. Check your inbox.' };
    if (!user) return res.json(generic);

    const recent = await one(database, 'SELECT created_at FROM password_reset_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [String(user.id)]);
    if (recent && Date.now() - Date.parse(String(recent.created_at)) < RESET_COOLDOWN_SECONDS * 1000) {
      return res.json(generic);
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + RESET_TTL_MINUTES * 60_000).toISOString();
    await run(database, 'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)', [newId(), String(user.id), hashToken(token), expires, now()]);
    const base = (process.env.APP_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
    const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await deliver(resetMessage(String(user.email), String(user.name), link, RESET_TTL_MINUTES));
    } catch (err) {
      await run(database, 'DELETE FROM password_reset_tokens WHERE token_hash = ?', [hashToken(token)]);
      if (err instanceof MailNotConfiguredError) throw new HttpError(503, err.message);
      console.error('reset email failed:', err instanceof Error ? err.message : err);
      throw new HttpError(502, 'We could not send the reset email right now. Please try again in a few minutes.');
    }
    res.json(generic);
  }));

  // Checks a reset link before the form is shown, so an expired link is explained up front.
  router.get('/api/auth/reset-password/check', wrap(async (req, res) => {
    const token = String(req.query.token ?? '');
    if (token.length < 20) return res.json({ valid: false });
    const row = await one(db(req), 'SELECT id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?', [hashToken(token), now()]);
    res.json({ valid: Boolean(row) });
  }));

  // Step 2 of recovery: set a new password with a valid, unused token. The token is spent in the same step.
  router.post('/api/auth/reset-password', wrap(async (req, res) => {
    const input = parseBody(resetSchema, req.body);
    const database = db(req);
    const row = await one(database, 'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?', [hashToken(input.token), now()]);
    if (!row) throw badRequest('This reset link is invalid or has expired. Request a new one.');
    const userId = String(row.user_id);
    const stamp = now();
    // Spend the token first, so a double click or a replayed link cannot change the password twice.
    const spent = await run(database, 'UPDATE password_reset_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL', [stamp, String(row.id)]);
    if (spent !== 1) throw badRequest('This reset link has already been used. Request a new one.');
    await run(database, 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [await hashPassword(input.password), stamp, userId]);
    await run(database, 'UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL', [stamp, userId]);
    const user = await one(database, 'SELECT name, email FROM users WHERE id = ?', [userId]);
    if (user && mailConfigured()) {
      sendMail(passwordChangedMessage(String(user.email), String(user.name))).catch((err) => console.error('password-changed email failed:', err instanceof Error ? err.message : err));
    }
    res.json({ message: 'Your password has been reset. You can log in with your new password.' });
  }));
}
