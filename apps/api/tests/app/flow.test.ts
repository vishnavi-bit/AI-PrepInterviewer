/** @jest-environment node */
// End-to-end API tests: the real server, a temporary database and upload folder, and real HTTP requests.
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';

jest.setTimeout(60000);
let server: Server;
let base: string;
let tmp: string;

// Real resume files (see tests/fixtures/README.md): a text PDF and a Word document.
const fixture = (name: string): Buffer => fs.readFileSync(path.join(__dirname, "../fixtures", name));
const PDF_RESUME = fixture("resume-sample.pdf");
const DOCX_RESUME = fixture("resume-sample.docx");

async function call(method: string, p: string, opts: { body?: unknown; raw?: Buffer; type?: string; cookie?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.cookie) headers.cookie = opts.cookie;
  let body: BodyInit | undefined;
  if (opts.raw) {
    body = new Uint8Array(opts.raw);
    headers['content-type'] = opts.type ?? 'application/pdf';
  } else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['content-type'] = 'application/json';
  }
  const res = await fetch(base + p, { method, headers, body });
  const text = await res.text();
  let json: any = undefined;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  return { status: res.status, json, setCookie: res.headers.get('set-cookie'), cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

// Registering creates the account; the user then logs in, as they do on the site. Returns the session cookie.
async function registerUser(name: string, email: string) {
  const r = await call('POST', '/api/auth/register', { body: { name, email, password: 'StrongPass123' } });
  expect(r.status).toBe(201);
  const login = await call('POST', '/api/auth/login', { body: { email, password: 'StrongPass123' } });
  expect(login.status).toBe(200);
  return login.cookie!;
}

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-api-'));
  process.env.DATABASE_URL = `file:${path.join(tmp, 'test.db')}`;
  process.env.UPLOADS_DIR = path.join(tmp, 'uploads');
  process.env.MAIL_TRANSPORT = 'memory';
  process.env.JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32 ? process.env.JWT_SECRET : 'test-secret-that-is-long-enough-123';
  delete process.env.GEMINI_API_KEY;
  const { start } = await import('../../src/http/server');
  server = await start(0);
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch { /* Windows keeps the database file locked briefly */ }
});

describe('accounts and sessions', () => {
  it('registers, rejects a duplicate email, logs in and logs out', async () => {
    const cookie = await registerUser('Asha Rao', 'asha@example.com');
    expect(cookie).toMatch(/^pp_session=/);
    const dup = await call('POST', '/api/auth/register', { body: { name: 'Asha Rao', email: 'ASHA@example.com', password: 'StrongPass123' } });
    expect(dup.status).toBe(409);
    const bad = await call('POST', '/api/auth/login', { body: { email: 'asha@example.com', password: 'wrong-password' } });
    expect(bad.status).toBe(401);
    expect(bad.json.error).toBe('Invalid email or password.');
    const unknown = await call('POST', '/api/auth/login', { body: { email: 'nobody@example.com', password: 'wrong-password' } });
    expect(unknown.json.error).toBe('Invalid email or password.');
    const ok = await call('POST', '/api/auth/login', { body: { email: 'asha@example.com', password: 'StrongPass123' } });
    expect(ok.status).toBe(200);
    expect(ok.json).not.toHaveProperty('password_hash');
    const me = await call('GET', '/api/auth/me', { cookie: ok.cookie });
    expect(me.json.email).toBe('asha@example.com');
    const out = await call('POST', '/api/auth/logout');
    expect(out.status).toBe(204);
  });

  it('keeps private routes behind the session cookie', async () => {
    for (const p of ['/api/resume', '/api/roles', '/api/dashboard', '/api/profile', '/api/interview/sessions']) {
      const r = await call('GET', p);
      expect(r.status).toBe(401);
    }
  });

  it('validates registration input with a readable message', async () => {
    const r = await call('POST', '/api/auth/register', { body: { name: 'A', email: 'not-an-email', password: 'short' } });
    expect(r.status).toBe(400);
    expect(typeof r.json.error).toBe('string');
  });
});

describe('resume, analysis, roles and the interview', () => {
  let cookie: string;
  let sessionId: string;
  let firstQuestionId: string;

  beforeAll(async () => {
    cookie = await registerUser('Asha Candidate', 'candidate@example.com');
  });

  it('rejects an unsupported file and accepts a PDF resume', async () => {
    const bad = await call('PUT', '/api/resume', { cookie, raw: Buffer.from('just some text, not a resume at all'), type: 'text/plain' });
    expect(bad.status).toBe(400);
    expect(bad.json.error).toMatch(/PDF or DOCX/);
    const ok = await call('PUT', '/api/resume', { cookie, raw: PDF_RESUME, type: 'application/pdf', headers: { 'x-filename': encodeURIComponent('asha-resume.pdf') } });
    if (ok.status !== 201) console.log('UPLOAD', ok.status, JSON.stringify(ok.json));
    expect(ok.status).toBe(201);
    expect(ok.json.filename).toBe('asha-resume.pdf');
    expect(ok.json.extractedText).toMatch(/Python/);
    const replaced = await call('PUT', '/api/resume', { cookie, raw: DOCX_RESUME, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', headers: { 'x-filename': encodeURIComponent('asha-resume.docx') } });
    expect(replaced.status).toBe(200);
    expect(replaced.json.filename).toBe('asha-resume.docx');
    expect(replaced.json.extractedText).toMatch(/Brightlabs/);
  });

  it('runs the analysis, lets the candidate confirm it, and recommends roles', async () => {
    const analysis = await call('POST', '/api/resume/analysis', { cookie });
    expect(analysis.status).toBe(200);
    expect(analysis.json.analysis.analysis.skills).toEqual(expect.arrayContaining(['Python', 'React', 'SQL']));
    expect(analysis.json.analysis.confirmed).toBe(false);
    const before = await call('GET', '/api/roles', { cookie });
    expect(before.json.status).toBe('needs-confirmation');
    const corrected = { ...analysis.json.analysis.analysis, certifications: ['AWS Cloud Practitioner'] };
    const confirmed = await call('PUT', '/api/resume/analysis/corrections', { cookie, body: corrected });
    expect(confirmed.json.analysis.confirmed).toBe(true);
    const roles = await call('GET', '/api/roles', { cookie });
    expect(roles.json.status).toBe('ready');
    const titles = roles.json.roles.map((r: { title: string }) => r.title);
    expect(titles).toEqual(expect.arrayContaining(['Python Developer', 'Frontend Developer']));
    const badPick = await call('POST', '/api/roles/selection', { cookie, body: { role: 'Astronaut' } });
    expect(badPick.status).toBe(400);
    const pick = await call('POST', '/api/roles/selection', { cookie, body: { role: 'Python Developer' } });
    expect(pick.json.selectedRole).toBe('Python Developer');
  });

  it('validates the interview settings', async () => {
    const bad = await call('POST', '/api/interview/sessions', { cookie, body: { interviewType: 'Technical', difficulty: 'Easy', durationMinutes: 7 } });
    expect(bad.status).toBe(400);
    expect(bad.json.error).toMatch(/available durations/);
  });

  it('starts an interview, takes answers, asks a follow-up and completes with a report', async () => {
    const start = await call('POST', '/api/interview/sessions', { cookie, body: { interviewType: 'Technical', difficulty: 'Medium', durationMinutes: 20 } });
    expect(start.status).toBe(201);
    const session = start.json.session;
    sessionId = session.id;
    expect(session.status).toBe('in_progress');
    expect(session.role).toBe('Python Developer');
    expect(session.currentQuestion.kind).toBe('main');
    expect(session.remainingSeconds).toBeGreaterThan(19 * 60);
    firstQuestionId = session.currentQuestion.id;

    const dup = await call('POST', '/api/interview/sessions', { cookie, body: { interviewType: 'Technical', difficulty: 'Medium', durationMinutes: 20 } });
    expect(dup.status).toBe(409);

    const wrong = await call('POST', `/api/interview/sessions/${sessionId}/answers`, { cookie, body: { questionId: 'not-the-question', answerText: 'Hello there.', source: 'text' } });
    expect(wrong.status).toBe(409);

    const short = await call('POST', `/api/interview/sessions/${sessionId}/answers`, { cookie, body: { questionId: firstQuestionId, answerText: 'I use Python.', source: 'text' } });
    expect(short.status).toBe(200);
    expect(short.json.session.currentQuestion.kind).toBe('followup');

    const follow = short.json.session.currentQuestion;
    await call('POST', `/api/interview/sessions/${sessionId}/answers`, { cookie, body: { questionId: follow.id, answerText: 'For example, I built a FastAPI service and checked it with tests, because the team needed stable reports.', source: 'voice' } });

    let state = (await call('GET', `/api/interview/sessions/${sessionId}`, { cookie })).json.session;
    while (state.status === 'in_progress') {
      const q = state.currentQuestion;
      const r = await call('POST', `/api/interview/sessions/${sessionId}/answers`, { cookie, body: { questionId: q.id, answerText: 'I would start by clarifying the requirements, then design the data model and test each part because it reduces risk.', source: 'text' } });
      expect(r.status).toBe(200);
      state = r.json.session;
    }
    expect(state.status).toBe('completed');
    expect(state.transcript.length).toBeGreaterThanOrEqual(6);

    const report = await call('GET', `/api/interview/sessions/${sessionId}/report`, { cookie });
    expect(report.status).toBe(200);
    expect(report.json.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.json.overallScore).toBeLessThanOrEqual(100);
    expect(report.json.categories.length).toBeGreaterThan(0);
    expect(report.json.disclaimer).toMatch(/practice estimates/);

    const dash = await call('GET', '/api/dashboard', { cookie });
    expect(dash.json.totalCompleted).toBe(1);
    expect(dash.json.latestScore).toBe(report.json.overallScore);
    expect(dash.json.roles[0].role).toBe('Python Developer');

    const history = await call('GET', '/api/interview/sessions', { cookie });
    expect(history.json.sessions[0].score).toBe(report.json.overallScore);
  });

  it('keeps one user out of another user’s resume, interview and report', async () => {
    const other = await registerUser('Other Person', 'other@example.com');
    expect((await call('GET', '/api/resume', { cookie: other })).status).toBe(404);
    expect((await call('GET', `/api/interview/sessions/${sessionId}`, { cookie: other })).status).toBe(404);
    expect((await call('GET', `/api/interview/sessions/${sessionId}/report`, { cookie: other })).status).toBe(404);
    const dash = await call('GET', '/api/dashboard', { cookie: other });
    expect(dash.json.totalCompleted).toBe(0);
    expect(dash.json.latestScore).toBeNull();
  });

  it('ends an interview early and keeps the report', async () => {
    const start = await call('POST', '/api/interview/sessions', { cookie, body: { interviewType: 'HR', difficulty: 'Easy', durationMinutes: 10 } });
    const id = start.json.session.id;
    await call('POST', `/api/interview/sessions/${id}/answers`, { cookie, body: { questionId: start.json.session.currentQuestion.id, answerText: 'I am a second year student who likes building useful software for people.', source: 'text' } });
    const ended = await call('POST', `/api/interview/sessions/${id}/end`, { cookie });
    expect(ended.json.session.status).toBe('ended_early');
    expect((await call('GET', `/api/interview/sessions/${id}/report`, { cookie })).status).toBe(200);
  });

  it('finishes an interview when its time has run out', async () => {
    const start = await call('POST', '/api/interview/sessions', { cookie, body: { interviewType: 'Behavioral', difficulty: 'Hard', durationMinutes: 10 } });
    const id = start.json.session.id;
    const { createClient } = await import('@libsql/client');
    const client = createClient({ url: process.env.DATABASE_URL! });
    await client.execute({ sql: 'UPDATE interview_sessions SET ends_at = ? WHERE id = ?', args: [new Date(Date.now() - 1000).toISOString(), id] });
    client.close();
    const state = await call('GET', `/api/interview/sessions/${id}`, { cookie });
    expect(state.json.session.status).toBe('time_up');
    expect(state.json.session.currentQuestion).toBeNull();
  });
});

describe('profile and account settings', () => {
  it('updates the name, changes the password and deletes the account', async () => {
    const cookie = await registerUser('Profile Person', 'profile@example.com');
    const patched = await call('PATCH', '/api/profile', { cookie, body: { name: 'Profile Renamed' } });
    expect(patched.json.name).toBe('Profile Renamed');
    const wrongPw = await call('POST', '/api/profile/password', { cookie, body: { currentPassword: 'nope-nope', newPassword: 'NewStrongPass1' } });
    expect(wrongPw.status).toBe(401);
    const changed = await call('POST', '/api/profile/password', { cookie, body: { currentPassword: 'StrongPass123', newPassword: 'NewStrongPass1' } });
    expect(changed.status).toBe(204);
    const relog = await call('POST', '/api/auth/login', { body: { email: 'profile@example.com', password: 'NewStrongPass1' } });
    expect(relog.status).toBe(200);
    const del = await call('DELETE', '/api/profile', { cookie: relog.cookie, body: { password: 'NewStrongPass1' } });
    expect(del.status).toBe(204);
    const gone = await call('POST', '/api/auth/login', { body: { email: 'profile@example.com', password: 'NewStrongPass1' } });
    expect(gone.status).toBe(401);
  });
});
