// Password recovery pages: request a reset link, and choose a new password from the link in the email.
// Messages only say what really happened: a link is reported as sent only after the server accepted the email.
import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Box, FormControl, FormErrorMessage, FormLabel, Input, Stack, Text } from '@chakra-ui/react';
import { api, ApiError } from '../api/client';
import { AuthShell } from './Auth';
import { ErrorAlert, PrimaryButton, Surface } from '../components/ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = React.useRef(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    if (!EMAIL.test(email)) {
      setError('Enter the email address you registered with.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not send the reset link. Please try again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your registered email and we will send you a secure link to choose a new password.">
      <Box as="form" onSubmit={submit} noValidate aria-busy={busy}>
        <Stack spacing={5}>
          <ErrorAlert message={error} />
          {notice && (
            <Surface p={4} borderColor="rgba(34,211,238,0.35)">
              <Text role="status" fontSize="sm" color="var(--pp-text)">{notice}</Text>
            </Surface>
          )}
          <FormControl isInvalid={!!error && !EMAIL.test(email)}>
            <FormLabel color="var(--pp-muted)" fontSize="sm">Registered email</FormLabel>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} isDisabled={busy} placeholder="you@example.com" bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" />
            <FormErrorMessage>Enter a valid email address.</FormErrorMessage>
          </FormControl>
          <PrimaryButton type="submit" isLoading={busy} loadingText="Sending link..." isDisabled={busy} size="lg" w="full">Send reset link</PrimaryButton>
          <Text fontSize="sm" color="var(--pp-muted)" textAlign="center">
            Remembered it? <Text as={RouterLink} to="/login" color="neon.cyan" fontWeight="medium" _hover={{ textDecoration: 'underline' }}>Back to log in</Text>
          </Text>
        </Stack>
      </Box>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const inFlight = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    api
      .get<{ valid: boolean }>(`/auth/reset-password/check?token=${encodeURIComponent(token)}`)
      .then((r) => setValid(r.valid))
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ message: string }>('/auth/reset-password', { token, password });
      setDone(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not reset your password. Please try again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (!checking && (!token || !valid) && !done) {
    return (
      <AuthShell title="This link has expired" subtitle="Reset links work once and expire after 30 minutes.">
        <Stack spacing={5} textAlign="center">
          <Text color="var(--pp-muted)">Request a new reset link and open the newest email we send you.</Text>
          <PrimaryButton as={RouterLink} to="/forgot-password" size="lg" w="full">Request a new link</PrimaryButton>
        </Stack>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now log in with your new password.">
        <Stack spacing={5}>
          <Text role="status" color="var(--pp-text)" textAlign="center">{done}</Text>
          <PrimaryButton as={RouterLink} to="/login" size="lg" w="full">Continue to log in</PrimaryButton>
        </Stack>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 8 characters. You will be asked to log in with it afterwards.">
      <Box as="form" onSubmit={submit} noValidate aria-busy={busy}>
        <Stack spacing={5}>
          <ErrorAlert message={error} />
          <FormControl>
            <FormLabel color="var(--pp-muted)" fontSize="sm">New password</FormLabel>
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} isDisabled={busy || checking} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" />
          </FormControl>
          <FormControl>
            <FormLabel color="var(--pp-muted)" fontSize="sm">Confirm new password</FormLabel>
            <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} isDisabled={busy || checking} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" />
          </FormControl>
          <PrimaryButton type="submit" isLoading={busy} loadingText="Saving..." isDisabled={busy || checking} size="lg" w="full">Set new password</PrimaryButton>
        </Stack>
      </Box>
    </AuthShell>
  );
}
