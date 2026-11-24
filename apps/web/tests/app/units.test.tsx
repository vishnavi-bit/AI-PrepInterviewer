/** @jest-environment jsdom */
// Unit tests for the browser-side logic that the candidate depends on: API error messages, speech failures, the avatar.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { api, ApiError } from '../../src/api/client';
import { SPEECH_ERRORS, listen } from '../../src/speech/speech';
import { InterviewerAvatar } from '../../src/components/InterviewerAvatar';

// jsdom has no Response class; this stand-in has the members the API client reads.
const respondWith = (status: number, body?: unknown) =>
  jest.fn(async () => ({ status, ok: status >= 200 && status < 300, text: async () => (body === undefined ? '' : JSON.stringify(body)) }) as unknown as Response);

afterEach(() => {
  jest.restoreAllMocks();
});

describe('API client', () => {
  it('shows the server message for a client error', async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = respondWith(409, { error: 'An account with this email already exists.' });
    await expect(api.post('/auth/register', {})).rejects.toMatchObject({ status: 409, message: 'An account with this email already exists.' });
  });

  it('never shows server internals for a 500', async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = respondWith(500, { error: 'SQLITE_CONSTRAINT: secret detail' });
    const err = (await api.get('/dashboard').catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Something went wrong. Please try again.');
  });

  it('explains a network failure in plain words', async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const err = (await api.get('/resume').catch((e) => e)) as ApiError;
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/could not reach the server/);
  });

  it('returns nothing for a 204 response', async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = respondWith(204);
    await expect(api.post('/auth/logout')).resolves.toBeUndefined();
  });
});

describe('speech', () => {
  it('gives an actionable message for each known recognition failure', () => {
    expect(SPEECH_ERRORS['not-allowed']).toMatch(/permission was denied/);
    expect(SPEECH_ERRORS['no-speech']).toMatch(/did not hear anything/);
    expect(SPEECH_ERRORS['audio-capture']).toMatch(/No microphone/);
    expect(SPEECH_ERRORS.network).toMatch(/internet connection/);
  });

  it('reports an unsupported browser instead of failing silently', () => {
    const onError = jest.fn();
    const onText = jest.fn();
    listen({ onText, onError, onEnd: jest.fn() });
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/not supported in this browser/));
    expect(onText).not.toHaveBeenCalled();
  });
});

describe('interviewer avatar', () => {
  const renderWith = (state: 'idle' | 'speaking' | 'listening') =>
    render(<ChakraProvider><InterviewerAvatar state={state} /></ChakraProvider>);

  it('describes its current state to assistive technology', () => {
    renderWith('speaking');
    expect(screen.getByRole('img', { name: /Interviewer is speaking/ })).toBeTruthy();
  });

  it('shows pulsing rings only while listening', () => {
    const { container, unmount } = renderWith('listening');
    expect(container.querySelectorAll('.pp-av-ring').length).toBe(2);
    unmount();
    const idle = renderWith('idle');
    expect(idle.container.querySelectorAll('.pp-av-ring').length).toBe(0);
  });
});
