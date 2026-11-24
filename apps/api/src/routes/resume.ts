// Resume upload, view, replace and delete; then the AI analysis and the candidate's corrections.
import express, { Router } from 'express';
import { z } from 'zod';
import { badRequest, notFound } from '../lib/errors';
import { db, newId, now, one, run, parseJson } from '../lib/db';
import { requireUser, userIdOf } from '../lib/session';
import { wrap, parseBody } from '../lib/http';
import { deleteStoredFile, detectKind, extractText, MAX_RESUME_BYTES, MIME_FOR, safeFileName, storeFile } from '../services/resumeFile';
import { getAi, type ResumeAnalysis } from '../services/ai';

const ACCEPTED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'];
const rawUpload = express.raw({ type: ACCEPTED, limit: MAX_RESUME_BYTES });

const listOf = (max: number, itemMax: number) => z.array(z.string().trim().max(itemMax)).max(max);
const analysisSchema = z.object({
  skills: listOf(40, 80),
  technologies: listOf(40, 80),
  education: listOf(10, 300),
  projects: z.array(z.object({ name: z.string().trim().max(120), description: z.string().trim().max(400) })).max(10),
  experience: listOf(12, 400),
  certifications: listOf(12, 200),
});

async function loadResume(database: Parameters<typeof one>[0], userId: string) {
  return one(database, 'SELECT * FROM resumes WHERE user_id = ?', [userId]);
}

export async function loadAnalysis(database: Parameters<typeof one>[0], userId: string) {
  const row = await one(database, 'SELECT * FROM resume_analyses WHERE user_id = ?', [userId]);
  if (!row) return null;
  return { analysis: parseJson<ResumeAnalysis>(row.analysis_json, emptyAnalysis()), confirmed: Number(row.confirmed) === 1, updatedAt: String(row.updated_at) };
}

export const emptyAnalysis = (): ResumeAnalysis => ({ skills: [], technologies: [], education: [], projects: [], experience: [], certifications: [] });

const resumeOut = (row: Record<string, unknown>) => ({
  filename: String(row.filename),
  mimeType: String(row.mime_type),
  sizeBytes: Number(row.size_bytes),
  uploadedAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  extractedText: String(row.extracted_text),
});

export function mountResume(router: Router): void {
  router.get('/api/resume', requireUser, wrap(async (req, res) => {
    const row = await loadResume(db(req), userIdOf(req));
    if (!row) throw notFound('You have not uploaded a resume yet.');
    res.json(resumeOut(row));
  }));

  // Upload or replace. The body is the raw file; the server checks the content, not the name or the sent type.
  router.put('/api/resume', requireUser, rawUpload, wrap(async (req, res) => {
    const buffer = req.body as Buffer;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw badRequest('Choose a PDF or DOCX file to upload.');
    if (buffer.length > MAX_RESUME_BYTES) throw badRequest('The file is larger than 5 MB. Upload a smaller resume.');
    const kind = detectKind(buffer);
    const text = await extractText(buffer, kind);
    const userId = userIdOf(req);
    const database = db(req);
    const previous = await loadResume(database, userId);
    const storagePath = await storeFile(userId, buffer, kind);
    const filename = safeFileName(decodeURIComponent(String(req.get('x-filename') ?? 'resume')));
    const stamp = now();
    if (previous) {
      await run(database, 'UPDATE resumes SET filename = ?, mime_type = ?, size_bytes = ?, storage_path = ?, extracted_text = ?, updated_at = ? WHERE user_id = ?', [filename, MIME_FOR[kind], buffer.length, storagePath, text, stamp, userId]);
      await deleteStoredFile(String(previous.storage_path));
      // Analysis and roles were built from the old resume, so they are reset.
      await run(database, 'DELETE FROM resume_analyses WHERE user_id = ?', [userId]);
      await run(database, 'DELETE FROM role_recommendations WHERE user_id = ?', [userId]);
    } else {
      await run(database, 'INSERT INTO resumes (id, user_id, filename, mime_type, size_bytes, storage_path, extracted_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [newId(), userId, filename, MIME_FOR[kind], buffer.length, storagePath, text, stamp, stamp]);
    }
    res.status(previous ? 200 : 201).json(resumeOut((await loadResume(database, userId))!));
  }));

  router.delete('/api/resume', requireUser, wrap(async (req, res) => {
    const userId = userIdOf(req);
    const database = db(req);
    const row = await loadResume(database, userId);
    if (!row) throw notFound('You have not uploaded a resume yet.');
    await deleteStoredFile(String(row.storage_path));
    await run(database, 'DELETE FROM resume_analyses WHERE user_id = ?', [userId]);
    await run(database, 'DELETE FROM role_recommendations WHERE user_id = ?', [userId]);
    await run(database, 'DELETE FROM resumes WHERE user_id = ?', [userId]);
    res.status(204).end();
  }));

  router.get('/api/resume/analysis', requireUser, wrap(async (req, res) => {
    res.json({ analysis: await loadAnalysis(db(req), userIdOf(req)) });
  }));

  router.post('/api/resume/analysis', requireUser, wrap(async (req, res) => {
    const userId = userIdOf(req);
    const database = db(req);
    const resume = await loadResume(database, userId);
    if (!resume) throw badRequest('Upload a resume before running the analysis.');
    const analysis = await getAi().analyzeResume(String(resume.extracted_text));
    const stamp = now();
    const json = JSON.stringify(analysis);
    if (await one(database, 'SELECT id FROM resume_analyses WHERE user_id = ?', [userId])) {
      await run(database, 'UPDATE resume_analyses SET analysis_json = ?, confirmed = 0, updated_at = ? WHERE user_id = ?', [json, stamp, userId]);
    } else {
      await run(database, 'INSERT INTO resume_analyses (id, user_id, analysis_json, confirmed, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)', [newId(), userId, json, stamp, stamp]);
    }
    res.json({ analysis: await loadAnalysis(database, userId) });
  }));

  // The candidate reviews and corrects the extracted information. Confirmed data is what roles and interviews use.
  router.put('/api/resume/analysis/corrections', requireUser, wrap(async (req, res) => {
    const userId = userIdOf(req);
    const database = db(req);
    const corrected = parseBody(analysisSchema, req.body);
    if (!(await one(database, 'SELECT id FROM resume_analyses WHERE user_id = ?', [userId]))) {
      throw badRequest('Run the resume analysis before confirming it.');
    }
    await run(database, 'UPDATE resume_analyses SET analysis_json = ?, confirmed = 1, updated_at = ? WHERE user_id = ?', [JSON.stringify(corrected), now(), userId]);
    await run(database, 'DELETE FROM role_recommendations WHERE user_id = ?', [userId]);
    res.json({ analysis: await loadAnalysis(database, userId) });
  }));

}
