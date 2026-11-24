// Password hashing with scrypt (built into Node). Passwords are never stored or logged in plain text.
import crypto from 'crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, n, r, p, saltB64, keyB64] = stored.split('$');
  if (algorithm !== 'scrypt' || !n || !r || !p || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await derive(password, Buffer.from(saltB64, 'base64'), Number(n), Number(r), Number(p));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
