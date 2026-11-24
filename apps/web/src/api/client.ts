// The only place the browser talks to the API. Requests go to /api on the same origin (Vite proxies them in development).
// Session cookies are HttpOnly, so no token is ever read or stored by page code.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const NETWORK_MESSAGE = 'We could not reach the server. Check your connection and try again.';
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

async function send<T>(method: string, path: string, init: { body?: unknown; raw?: Blob; contentType?: string; headers?: Record<string, string> } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  let body: BodyInit | undefined;
  if (init.raw) {
    body = init.raw;
    headers['content-type'] = init.contentType ?? 'application/octet-stream';
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers['content-type'] = 'application/json';
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, NETWORK_MESSAGE);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  if (!res.ok) {
    const message = (data as { error?: string } | undefined)?.error;
    // 500 is an internal failure: never show its details. Other errors carry messages the server wrote for people.
    throw new ApiError(res.status, res.status === 500 ? GENERIC_MESSAGE : message ?? GENERIC_MESSAGE);
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string) => send<T>('GET', path),
  post: <T,>(path: string, body?: unknown) => send<T>('POST', path, { body }),
  put: <T,>(path: string, body?: unknown) => send<T>('PUT', path, { body }),
  patch: <T,>(path: string, body?: unknown) => send<T>('PATCH', path, { body }),
  delete: <T,>(path: string, body?: unknown) => send<T>('DELETE', path, { body }),
  upload: <T,>(path: string, file: File) => send<T>('PUT', path, { raw: file, contentType: file.type || 'application/octet-stream', headers: { 'x-filename': encodeURIComponent(file.name) } }),
};
