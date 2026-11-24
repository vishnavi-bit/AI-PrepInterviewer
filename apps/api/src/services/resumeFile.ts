// Resume files: validate by content (not file name), extract readable text, and store the original outside the database.
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { badRequest, unprocessable } from '../lib/errors';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 60000;

export type ResumeKind = 'pdf' | 'docx';

export function detectKind(buffer: Buffer): ResumeKind {
  if (buffer.length < 4) throw badRequest('The file is empty or too small to be a resume.');
  if (buffer.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return 'docx';
  throw badRequest('Unsupported file. Upload a PDF or DOCX resume.');
}

export const MIME_FOR: Record<ResumeKind, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export async function extractText(buffer: Buffer, kind: ResumeKind): Promise<string> {
  let text = '';
  try {
    if (kind === 'pdf') {
      text = (await pdfParse(buffer)).text;
    } else {
      text = (await mammoth.extractRawText({ buffer })).value;
    }
  } catch (err) {
    console.error('resume parse failed:', err instanceof Error ? err.message : err);
    throw unprocessable('We could not read this file. Check that it opens normally and is not password protected.');
  }
  text = text.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').trim();
  if (text.length < 40) throw unprocessable('We could not find readable text in this file. A scanned image cannot be read; upload a text-based PDF or DOCX.');
  return text.slice(0, MAX_TEXT_CHARS);
}

function uploadsDir(): string {
  return path.resolve(process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), 'uploads'));
}

// Files are stored under a random name in a per-user folder. The original file name is never used as a path.
export async function storeFile(userId: string, buffer: Buffer, kind: ResumeKind): Promise<string> {
  const dir = path.join(uploadsDir(), crypto.createHash('sha256').update(userId).digest('hex').slice(0, 32));
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}.${kind}`;
  const full = path.join(dir, name);
  await fs.writeFile(full, buffer, { mode: 0o600 });
  return path.relative(uploadsDir(), full);
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  const root = uploadsDir();
  const full = path.resolve(root, storagePath);
  if (!full.startsWith(root + path.sep)) return;
  await fs.rm(full, { force: true });
}

export function safeFileName(raw: string): string {
  const base = path.basename(raw).replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 120);
  return base || 'resume';
}
