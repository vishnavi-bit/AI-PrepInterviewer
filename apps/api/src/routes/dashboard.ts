// Dashboard: totals, recent and average scores, role-wise performance, weak topics and practice suggestions.
import { Router } from 'express';
import { many, parseJson } from '../lib/db';
import { db } from '../lib/db';
import { requireUser, userIdOf } from '../lib/session';
import { wrap } from '../lib/http';

type Category = { name: string; score: number };

export function mountDashboard(router: Router): void {
  router.get('/api/dashboard', requireUser, wrap(async (req, res) => {
    const rows = await many(db(req), `
      SELECT s.id, s.role, s.interview_type, s.created_at, r.overall_score, r.category_scores_json, r.suggestions_json
      FROM interview_sessions s JOIN interview_reports r ON r.session_id = s.id
      WHERE s.user_id = ? ORDER BY r.created_at DESC`, [userIdOf(req)]);

    const scores = rows.map((r) => Number(r.overall_score));
    const average = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;

    const byRole = new Map<string, number[]>();
    const byTopic = new Map<string, number[]>();
    for (const r of rows) {
      const role = String(r.role);
      byRole.set(role, [...(byRole.get(role) ?? []), Number(r.overall_score)]);
      for (const c of parseJson<Category[]>(r.category_scores_json, [])) {
        byTopic.set(c.name, [...(byTopic.get(c.name) ?? []), c.score]);
      }
    }
    const avg = (xs: number[]) => Math.round(xs.reduce((s, v) => s + v, 0) / xs.length);

    const weakTopics = [...byTopic.entries()]
      .map(([name, xs]) => ({ name, score: avg(xs) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    const suggestions = [...new Set(rows.slice(0, 3).flatMap((r) => parseJson<string[]>(r.suggestions_json, [])))].slice(0, 5);

    res.json({
      totalCompleted: rows.length,
      latestScore: scores[0] ?? null,
      averageScore: average,
      recent: rows.slice(0, 5).map((r) => ({ id: String(r.id), role: String(r.role), interviewType: String(r.interview_type), score: Number(r.overall_score), createdAt: String(r.created_at) })),
      roles: [...byRole.entries()].map(([role, xs]) => ({ role, interviews: xs.length, averageScore: avg(xs) })),
      weakTopics,
      progress: [...rows].reverse().map((r) => ({ date: String(r.created_at), score: Number(r.overall_score) })),
      suggestions: suggestions.length ? suggestions : ['Complete an interview to get practice suggestions.'],
    });
  }));
}
