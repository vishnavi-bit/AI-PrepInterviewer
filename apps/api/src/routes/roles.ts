// Job-role recommendations from confirmed resume information, and the candidate's chosen role.
import { Router } from 'express';
import { z } from 'zod';
import { badRequest } from '../lib/errors';
import { db, newId, now, one, run, parseJson } from '../lib/db';
import { requireUser, userIdOf } from '../lib/session';
import { wrap, parseBody } from '../lib/http';
import { getAi, type RoleRecommendation } from '../services/ai';
import { loadAnalysis } from './resume';

async function currentRoles(database: Parameters<typeof one>[0], userId: string) {
  const row = await one(database, 'SELECT * FROM role_recommendations WHERE user_id = ?', [userId]);
  return {
    roles: row ? parseJson<RoleRecommendation[]>(row.roles_json, []) : null,
    selectedRole: row?.selected_role ? String(row.selected_role) : null,
  };
}

export function mountRoles(router: Router): void {
  // Generates recommendations once per confirmed analysis, then returns the stored list.
  router.get('/api/roles', requireUser, wrap(async (req, res) => {
    const userId = userIdOf(req);
    const database = db(req);
    const saved = await loadAnalysis(database, userId);
    if (!saved) return res.json({ status: 'needs-analysis', roles: [], selectedRole: null });
    if (!saved.confirmed) return res.json({ status: 'needs-confirmation', roles: [], selectedRole: null });
    let { roles, selectedRole } = await currentRoles(database, userId);
    if (!roles) {
      roles = await getAi().recommendRoles(saved.analysis);
      const stamp = now();
      await run(database, 'INSERT INTO role_recommendations (id, user_id, roles_json, selected_role, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)', [newId(), userId, JSON.stringify(roles), stamp, stamp]);
    }
    res.json({ status: roles.length ? 'ready' : 'no-matches', roles, selectedRole });
  }));

  // The candidate picks one recommended role. They are not forced to take the first one.
  router.post('/api/roles/selection', requireUser, wrap(async (req, res) => {
    const userId = userIdOf(req);
    const database = db(req);
    const { role } = parseBody(z.object({ role: z.string().trim().min(2).max(80) }), req.body);
    const saved = await loadAnalysis(database, userId);
    if (!saved?.confirmed) throw badRequest('Confirm your resume details before choosing a role.');
    let { roles } = await currentRoles(database, userId);
    if (!roles) {
      roles = await getAi().recommendRoles(saved.analysis);
      const stamp = now();
      await run(database, 'INSERT INTO role_recommendations (id, user_id, roles_json, selected_role, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)', [newId(), userId, JSON.stringify(roles), stamp, stamp]);
    }
    if (!roles.some((r) => r.title === role)) throw badRequest('Choose one of the recommended roles.');
    await run(database, 'UPDATE role_recommendations SET selected_role = ?, updated_at = ? WHERE user_id = ?', [role, now(), userId]);
    res.json({ status: 'ready', roles, selectedRole: role });
  }));
}
