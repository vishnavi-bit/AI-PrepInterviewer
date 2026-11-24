/** @jest-environment jsdom */
// Page-level tests: the real routes, the real providers and guards, with the API replaced by a fixed set of responses.
import React from 'react';
import { render, screen, fireEvent, configure } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../src/app/App';
import { router } from '../../src/app/router';

configure({ asyncUtilTimeout: 5000 });

type Responder = (path: string, method: string, body?: unknown) => { status: number; body?: unknown };

// jsdom has no Response class, so the tests use a minimal stand-in with the members the client reads.
function fakeResponse(status: number, body?: unknown): Response {
  const text = body === undefined ? '' : JSON.stringify(body);
  return { status, ok: status >= 200 && status < 300, text: async () => text } as unknown as Response;
}

function mockApi(respond: Responder) {
  const fn = jest.fn(async (url: string, init?: { method?: string; body?: string }) => {
    const path = String(url).replace(/^\/api/, '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body) : undefined;
    const r = respond(path, method, body);
    return fakeResponse(r.status, r.body);
  });
  (globalThis as unknown as { fetch: unknown }).fetch = fn;
  return fn;
}

const USER = { id: 'u1', name: 'Asha Rao', email: 'asha@example.com', createdAt: '2026-11-01T00:00:00.000Z' };

function renderAt(path: string) {
  const Router = ({ children }: { children?: React.ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  return render(<App Router={Router} />);
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('public pages', () => {
  it('shows the landing page with its call to action', async () => {
    mockApi(() => ({ status: 401, body: { error: 'Please sign in to continue.' } }));
    renderAt('/');
    expect(await screen.findByText(/Turn Your Resume into Interview Confidence/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Create your account/ })).toBeTruthy();
  });

  it('validates the login form before it sends anything', async () => {
    const fetchMock = mockApi(() => ({ status: 401, body: { error: 'Please sign in to continue.' } }));
    renderAt('/login');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter your email and password.')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([u, i]) => String(u).includes('/auth/login') && i?.method === 'POST')).toBe(false);
  });

  it('shows the branded not-found page for an unknown address', async () => {
    mockApi(() => ({ status: 401, body: { error: 'Please sign in to continue.' } }));
    renderAt('/no-such-page');
    expect(await screen.findByRole('heading', { name: 'This page does not exist' })).toBeTruthy();
  });
});

describe('private pages', () => {
  it('sends a signed-out visitor from the dashboard to log in', async () => {
    mockApi(() => ({ status: 401, body: { error: 'Please sign in to continue.' } }));
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeTruthy();
  });

  it('shows the empty dashboard for a signed-in user with no interviews', async () => {
    mockApi((path) => {
      if (path === '/auth/me') return { status: 200, body: USER };
      if (path === '/dashboard') return { status: 200, body: { totalCompleted: 0, latestScore: null, averageScore: null, recent: [], roles: [], weakTopics: [], progress: [], suggestions: [] } };
      return { status: 404, body: { error: 'Not found.' } };
    });
    renderAt('/dashboard');
    expect(await screen.findByText('No interviews yet')).toBeTruthy();
    expect(screen.getByText('Hello, Asha')).toBeTruthy();
  });

  it('lists the recommended roles and asks for a choice', async () => {
    mockApi((path) => {
      if (path === '/auth/me') return { status: 200, body: USER };
      if (path === '/roles') {
        return { status: 200, body: { status: 'ready', selectedRole: null, roles: [{ title: 'Python Developer', reason: 'Your resume mentions Python.' }, { title: 'Frontend Developer', reason: 'Your resume mentions React.' }] } };
      }
      return { status: 404, body: { error: 'Not found.' } };
    });
    renderAt('/roles');
    expect(await screen.findByText('Python Developer')).toBeTruthy();
    expect(screen.getByText('Your resume mentions React.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Use this role' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sets up an interview only after a role and confirmed resume exist', async () => {
    mockApi((path) => {
      if (path === '/auth/me') return { status: 200, body: USER };
      if (path === '/interview/options') return { status: 200, body: { types: ['Technical', 'HR', 'Behavioral', 'Project-based'], difficulties: ['Easy', 'Medium', 'Hard'], durations: [10, 15, 20, 30], mainQuestions: 5 } };
      if (path === '/roles') return { status: 200, body: { status: 'ready', selectedRole: 'Python Developer', roles: [{ title: 'Python Developer', reason: 'x' }] } };
      if (path === '/interview/sessions/current') return { status: 200, body: { session: null } };
      return { status: 404, body: { error: 'Not found.' } };
    });
    renderAt('/interview');
    expect(await screen.findByRole('button', { name: 'Start interview' })).toBeTruthy();
    expect(screen.getByText('Python Developer')).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Interview type' })).toBeTruthy();
  });

  it('asks for the resume first when there is no analysis yet', async () => {
    mockApi((path) => {
      if (path === '/auth/me') return { status: 200, body: USER };
      if (path === '/interview/options') return { status: 200, body: { types: ['Technical'], difficulties: ['Easy'], durations: [10], mainQuestions: 5 } };
      if (path === '/roles') return { status: 200, body: { status: 'needs-analysis', roles: [], selectedRole: null } };
      if (path === '/interview/sessions/current') return { status: 200, body: { session: null } };
      return { status: 404, body: { error: 'Not found.' } };
    });
    renderAt('/interview');
    expect(await screen.findByText('Upload and analyse your resume')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start interview' })).toBeNull();
  });
});
