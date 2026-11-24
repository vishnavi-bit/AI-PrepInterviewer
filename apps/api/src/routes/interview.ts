// Interview sessions: configuration, questions, answers, follow-ups, timing, completion and the saved report.
// The server owns the clock and the question order. The browser only displays state and sends answers.
import { Router } from 'express';
import { z } from 'zod';
import { badRequest, conflict, notFound } from '../lib/errors';
import { db, many, newId, now, one, parseJson, run, type Row } from '../lib/db';
import { requireUser, userIdOf } from '../lib/session';
import { wrap, parseBody } from '../lib/http';
import { DIFFICULTIES, DURATIONS, INTERVIEW_TYPES, getAi, type Evaluation, type InterviewContext, type QA } from '../services/ai';
import { loadAnalysis } from './resume';
import type { Db } from '../db/client';

const MAIN_QUESTIONS = 5;
const MAX_ANSWER_CHARS = 4000;
type Status = 'in_progress' | 'completed' | 'ended_early' | 'time_up';

const sessionBody = z.object({
  interviewType: z.enum(INTERVIEW_TYPES, { message: 'Choose an interview type.' }),
  difficulty: z.enum(DIFFICULTIES, { message: 'Choose a difficulty.' }),
  durationMinutes: z.number().int().refine((d) => (DURATIONS as readonly number[]).includes(d), 'Choose one of the available durations.'),
});
const answerBody = z.object({
  questionId: z.string().min(1).max(64),
  answerText: z.string().trim().min(1, 'Type or speak an answer before submitting.').max(MAX_ANSWER_CHARS, 'That answer is too long. Keep it under 4000 characters.'),
  source: z.enum(['voice', 'text']),
});

const remainingSeconds = (endsAt: string) => Math.max(0, Math.floor((Date.parse(endsAt) - Date.now()) / 1000));

async function loadSession(database: Db, userId: string, id: string): Promise<Row> {
  const row = await one(database, 'SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?', [id, userId]);
  if (!row) throw notFound('That interview could not be found.');
  return row;
}

async function questionRows(database: Db, sessionId: string): Promise<Row[]> {
  return many(database, `
    SELECT q.id, q.position, q.kind, q.parent_id, q.text, a.answer_text, a.source
    FROM interview_questions q LEFT JOIN interview_answers a ON a.question_id = q.id
    WHERE q.session_id = ? ORDER BY q.position ASC`, [sessionId]);
}

// Final evaluation: only answered questions are scored. Saved only when valid.
async function finish(database: Db, session: Row, status: Status): Promise<void> {
  const stamp = now();
  await run(database, 'UPDATE interview_sessions SET status = ?, ended_at = ? WHERE id = ?', [status, stamp, String(session.id)]);
  const answered = (await questionRows(database, String(session.id))).filter((q) => q.answer_text);
  if (answered.length === 0) return;
  const ctx = await contextFor(database, session);
  const qas: QA[] = answered.map((q) => ({ question: String(q.text), answer: String(q.answer_text) }));
  const evaluation: Evaluation = await getAi().evaluate(ctx, qas);
  if (!Number.isInteger(evaluation.overallScore) || evaluation.overallScore < 0 || evaluation.overallScore > 100) {
    throw new Error('Evaluation produced an invalid score');
  }
  await run(database, 'INSERT INTO interview_reports (id, session_id, user_id, overall_score, category_scores_json, strengths_json, weaknesses_json, suggestions_json, question_feedback_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    newId(), String(session.id), String(session.user_id), evaluation.overallScore,
    JSON.stringify(evaluation.categories), JSON.stringify(evaluation.strengths), JSON.stringify(evaluation.weaknesses),
    JSON.stringify(evaluation.suggestions), JSON.stringify(evaluation.questionFeedback), stamp,
  ]);
}

async function contextFor(database: Db, session: Row): Promise<InterviewContext> {
  const saved = await loadAnalysis(database, String(session.user_id));
  const a = saved?.analysis;
  return {
    role: String(session.role),
    interviewType: String(session.interview_type) as InterviewContext['interviewType'],
    difficulty: String(session.difficulty) as InterviewContext['difficulty'],
    skills: a ? [...a.skills, ...a.technologies].slice(0, 20) : [],
  };
}

// Applies the time limit. A session past its end time is finished as time_up before anything else is read or written.
async function refresh(database: Db, session: Row): Promise<Row> {
  if (session.status === 'in_progress' && remainingSeconds(String(session.ends_at)) === 0) {
    await finish(database, session, 'time_up');
    return (await one(database, 'SELECT * FROM interview_sessions WHERE id = ?', [String(session.id)]))!;
  }
  return session;
}

async function view(database: Db, session: Row) {
  const rows = await questionRows(database, String(session.id));
  const current = rows.find((q) => !q.answer_text) ?? null;
  const answered = rows.filter((q) => q.answer_text).length;
  return {
    id: String(session.id),
    role: String(session.role),
    interviewType: String(session.interview_type),
    difficulty: String(session.difficulty),
    durationMinutes: Number(session.duration_minutes),
    status: String(session.status),
    startedAt: String(session.started_at),
    endsAt: String(session.ends_at),
    endedAt: session.ended_at ? String(session.ended_at) : null,
    remainingSeconds: session.status === 'in_progress' ? remainingSeconds(String(session.ends_at)) : 0,
    progress: { answered, mainTotal: rows.filter((q) => q.kind === 'main').length },
    currentQuestion: session.status === 'in_progress' && current ? { id: String(current.id), text: String(current.text), kind: String(current.kind) } : null,
    transcript: rows.filter((q) => q.answer_text).map((q) => ({ questionId: String(q.id), question: String(q.text), answer: String(q.answer_text), source: String(q.source), kind: String(q.kind) })),
  };
}

export function mountInterview(router: Router): void {
  router.get('/api/interview/options', requireUser, (_req, res) => {
    res.json({ types: INTERVIEW_TYPES, difficulties: DIFFICULTIES, durations: DURATIONS, mainQuestions: MAIN_QUESTIONS });
  });

  // History: every session of this user, with the score when a report exists.
  router.get('/api/interview/sessions', requireUser, wrap(async (req, res) => {
    const rows = await many(db(req), `
      SELECT s.*, r.overall_score FROM interview_sessions s LEFT JOIN interview_reports r ON r.session_id = s.id
      WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 100`, [userIdOf(req)]);
    res.json({
      sessions: rows.map((s) => ({
        id: String(s.id), role: String(s.role), interviewType: String(s.interview_type), difficulty: String(s.difficulty),
        durationMinutes: Number(s.duration_minutes), status: String(s.status), createdAt: String(s.created_at),
        score: s.overall_score === null || s.overall_score === undefined ? null : Number(s.overall_score),
      })),
    });
  }));

  router.get('/api/interview/sessions/current', requireUser, wrap(async (req, res) => {
    const database = db(req);
    const row = await one(database, "SELECT * FROM interview_sessions WHERE user_id = ? AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1", [userIdOf(req)]);
    if (!row) return res.json({ session: null });
    const fresh = await refresh(database, row);
    res.json({ session: fresh.status === 'in_progress' ? await view(database, fresh) : null });
  }));

  // Starts an interview with the candidate's selected role and the chosen settings.
  router.post('/api/interview/sessions', requireUser, wrap(async (req, res) => {
    const userId = userIdOf(req);
    const database = db(req);
    const input = parseBody(sessionBody, req.body);

    const active = await one(database, "SELECT * FROM interview_sessions WHERE user_id = ? AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1", [userId]);
    if (active) {
      const fresh = await refresh(database, active);
      if (fresh.status === 'in_progress') throw conflict(`You already have an interview in progress (${String(fresh.role)}). Finish it before starting another.`);
    }

    const saved = await loadAnalysis(database, userId);
    if (!saved?.confirmed) throw badRequest('Confirm your resume details before starting an interview.');
    const roleRow = await one(database, 'SELECT selected_role FROM role_recommendations WHERE user_id = ?', [userId]);
    const role = roleRow?.selected_role ? String(roleRow.selected_role) : null;
    if (!role) throw badRequest('Choose a job role before starting an interview.');

    const ctx: InterviewContext = { role, interviewType: input.interviewType, difficulty: input.difficulty, skills: [...saved.analysis.skills, ...saved.analysis.technologies].slice(0, 20) };
    const questions = (await getAi().generateQuestions(ctx, MAIN_QUESTIONS)).slice(0, MAIN_QUESTIONS);
    if (questions.length === 0) throw badRequest('We could not create questions for this interview. Try again.');

    const id = newId();
    const started = new Date();
    const endsAt = new Date(started.getTime() + input.durationMinutes * 60_000).toISOString();
    const stamp = started.toISOString();
    await run(database, 'INSERT INTO interview_sessions (id, user_id, role, interview_type, difficulty, duration_minutes, status, started_at, ends_at, ended_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)', [id, userId, role, input.interviewType, input.difficulty, input.durationMinutes, 'in_progress', stamp, endsAt, stamp]);
    for (const [i, text] of questions.entries()) {
      await run(database, 'INSERT INTO interview_questions (id, session_id, user_id, position, kind, parent_id, text, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)', [newId(), id, userId, i + 1, 'main', text, stamp]);
    }
    res.status(201).json({ session: await view(database, (await loadSession(database, userId, id))) });
  }));

  router.get('/api/interview/sessions/:id', requireUser, wrap(async (req, res) => {
    const database = db(req);
    const row = await refresh(database, await loadSession(database, userIdOf(req), String(req.params.id)));
    res.json({ session: await view(database, row) });
  }));

  // Submit an answer to the current question. Each main question can get one follow-up, then the next question follows.
  router.post('/api/interview/sessions/:id/answers', requireUser, wrap(async (req, res) => {
    const userId = userIdOf(req);
    const database = db(req);
    const input = parseBody(answerBody, req.body);
    const row = await refresh(database, await loadSession(database, userId, String(req.params.id)));
    if (row.status !== 'in_progress') throw conflict('This interview has already finished.');

    const rows = await questionRows(database, String(row.id));
    const current = rows.find((q) => !q.answer_text);
    if (!current || current.id !== input.questionId) throw conflict('Answer the question that is currently shown.');

    const stamp = now();
    await run(database, 'INSERT INTO interview_answers (id, question_id, session_id, user_id, answer_text, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [newId(), String(current.id), String(row.id), userId, input.answerText, input.source, stamp]);

    // Follow-up: one per main question, only when the answer needs more detail.
    if (current.kind === 'main') {
      const ctx = await contextFor(database, row);
      const followUp = await getAi().followUp(ctx, { question: String(current.text), answer: input.answerText });
      if (followUp) {
        await run(database, 'INSERT INTO interview_questions (id, session_id, user_id, position, kind, parent_id, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [newId(), String(row.id), userId, Number(current.position) + 0.5, 'followup', String(current.id), followUp, stamp]);
      }
    }

    const after = await questionRows(database, String(row.id));
    if (!after.some((q) => !q.answer_text)) {
      await finish(database, row, 'completed');
    }
    const latest = (await one(database, 'SELECT * FROM interview_sessions WHERE id = ?', [String(row.id)]))!;
    res.json({ session: await view(database, latest) });
  }));

  router.post('/api/interview/sessions/:id/end', requireUser, wrap(async (req, res) => {
    const database = db(req);
    const row = await refresh(database, await loadSession(database, userIdOf(req), String(req.params.id)));
    if (row.status === 'in_progress') await finish(database, row, 'ended_early');
    const latest = (await one(database, 'SELECT * FROM interview_sessions WHERE id = ?', [String(row.id)]))!;
    res.json({ session: await view(database, latest) });
  }));

  router.get('/api/interview/sessions/:id/report', requireUser, wrap(async (req, res) => {
    const database = db(req);
    const row = await refresh(database, await loadSession(database, userIdOf(req), String(req.params.id)));
    if (row.status === 'in_progress') throw conflict('Finish the interview to see your report.');
    const report = await one(database, 'SELECT * FROM interview_reports WHERE session_id = ? AND user_id = ?', [String(row.id), userIdOf(req)]);
    if (!report) throw notFound('No answers were recorded for this interview, so there is no report.');
    res.json({
      session: { id: String(row.id), role: String(row.role), interviewType: String(row.interview_type), difficulty: String(row.difficulty), durationMinutes: Number(row.duration_minutes), status: String(row.status), endedAt: row.ended_at ? String(row.ended_at) : null },
      overallScore: Number(report.overall_score),
      categories: parseJson(report.category_scores_json, []),
      strengths: parseJson(report.strengths_json, []),
      weaknesses: parseJson(report.weaknesses_json, []),
      suggestions: parseJson(report.suggestions_json, []),
      questionFeedback: parseJson(report.question_feedback_json, []),
      disclaimer: 'These scores are AI-generated practice estimates. They do not guarantee real hiring outcomes.',
      createdAt: String(report.created_at),
    });
  }));
}
