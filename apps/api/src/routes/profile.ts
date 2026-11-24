// Profile and account settings: view, update name, change password, delete account.
import { Router } from 'express';
import { z } from 'zod';
import { badRequest, unauthorized } from '../lib/errors';
import { db, now, one, run } from '../lib/db';
import { endSession, requireUser, userIdOf } from '../lib/session';
import { wrap, parseBody } from '../lib/http';
import { hashPassword, verifyPassword } from '../lib/passwords';
import { deleteStoredFile } from '../services/resumeFile';
import { publicUser } from './auth';

const newPassword = z.string().min(8, 'Use at least 8 characters for your new password.').max(200);

export function mountProfile(router: Router): void {
  router.get('/api/profile', requireUser, wrap(async (req, res) => {
    const user = await one(db(req), 'SELECT * FROM users WHERE id = ?', [userIdOf(req)]);
    res.json(publicUser(user!));
  }));

  router.patch('/api/profile', requireUser, wrap(async (req, res) => {
    const { name } = parseBody(z.object({ name: z.string().trim().min(2, 'Enter your full name.').max(80) }), req.body);
    const userId = userIdOf(req);
    await run(db(req), 'UPDATE users SET name = ?, updated_at = ? WHERE id = ?', [name, now(), userId]);
    res.json(publicUser((await one(db(req), 'SELECT * FROM users WHERE id = ?', [userId]))!));
  }));

  router.post('/api/profile/password', requireUser, wrap(async (req, res) => {
    const input = parseBody(z.object({ currentPassword: z.string().min(1, 'Enter your current password.'), newPassword }), req.body);
    if (input.currentPassword === input.newPassword) throw badRequest('Choose a password that is different from your current one.');
    const userId = userIdOf(req);
    const database = db(req);
    const user = await one(database, 'SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user || !(await verifyPassword(input.currentPassword, String(user.password_hash)))) {
      throw unauthorized('Your current password is not correct.');
    }
    await run(database, 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [await hashPassword(input.newPassword), now(), userId]);
    res.status(204).end();
  }));

  // Deleting the account removes every row that belongs to it (the database cascades) and its stored resume file.
  router.delete('/api/profile', requireUser, wrap(async (req, res) => {
    const { password } = parseBody(z.object({ password: z.string().min(1, 'Enter your password to confirm.') }), req.body);
    const userId = userIdOf(req);
    const database = db(req);
    const user = await one(database, 'SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user || !(await verifyPassword(password, String(user.password_hash)))) throw unauthorized('Your password is not correct.');
    const resume = await one(database, 'SELECT storage_path FROM resumes WHERE user_id = ?', [userId]);
    if (resume) await deleteStoredFile(String(resume.storage_path));
    await run(database, 'DELETE FROM users WHERE id = ?', [userId]);
    endSession(res);
    res.status(204).end();
  }));
}
