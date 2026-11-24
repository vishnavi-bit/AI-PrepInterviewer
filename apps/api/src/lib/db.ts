// Small helpers over the libSQL client. All SQL uses ? placeholders with bound arguments; nothing is concatenated.
import crypto from 'crypto';
import type { Request } from 'express';
import { getDb } from '../db/provider';
import type { Db } from '../db/client';

export type Row = Record<string, unknown>;

export const db = (req: Request): Db => getDb(req.app);
export const now = (): string => new Date().toISOString();
export const newId = (): string => crypto.randomUUID();

export async function one(database: Db, sql: string, args: unknown[] = []): Promise<Row | undefined> {
  const r = await database.execute({ sql, args: args as never[] });
  return r.rows[0] as Row | undefined;
}

export async function many(database: Db, sql: string, args: unknown[] = []): Promise<Row[]> {
  const r = await database.execute({ sql, args: args as never[] });
  return r.rows as Row[];
}

export async function run(database: Db, sql: string, args: unknown[] = []): Promise<number> {
  const r = await database.execute({ sql, args: args as never[] });
  return r.rowsAffected;
}

export function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
