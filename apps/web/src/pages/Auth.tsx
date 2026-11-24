// Log in and create account. Validation happens on the page and again on the server, and errors are shown next to the form.
import React, { useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, FormControl, FormErrorMessage, FormLabel, Heading, Input, Stack, Text, InputGroup, InputRightElement, Button, Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, Flex } from '@chakra-ui/react';
import { CheckCircle } from '@phosphor-icons/react';
import { api, ApiError } from '../api/client';
import type { User } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { ErrorAlert, GradientText, PrimaryButton, Surface } from '../components/ui';
import { GRADIENT } from '../styling/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const POP_CSS = `
@keyframes pp-pop { 0% { opacity: 0; transform: translateY(16px) scale(0.92) } 100% { opacity: 1; transform: none } }
@keyframes pp-ring-in { 0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) } }
@media (prefers-reduced-motion: reduce) { .pp-pop, .pp-ring-in { animation: none !important } }
`;

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Container maxW="440px" py={{ base: 12, md: 20 }} px={5}>
      <Stack spacing={2} mb={8} textAlign="center">
        <Heading as="h1" size="xl" fontWeight="bold" letterSpacing="-0.03em"><GradientText>{title}</GradientText></Heading>
        <Text color="var(--pp-muted)">{subtitle}</Text>
      </Stack>
      <Surface>{children}</Surface>
    </Container>
  );
}

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailError = email && !EMAIL.test(email) ? 'Enter a valid email address.' : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email) || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await api.post<User>('/auth/login', { email, password });
      setUser(user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Log in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue your practice.">
      <Box as="form" onSubmit={submit} noValidate>
        <Stack spacing={5}>
          <ErrorAlert message={error} />
          <FormControl isInvalid={!!emailError}>
            <FormLabel color="var(--pp-muted)" fontSize="sm">Email</FormLabel>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" _hover={{ borderColor: 'gray.700' }} />
            <FormErrorMessage>{emailError}</FormErrorMessage>
          </FormControl>
          <FormControl>
            <Flex justify="space-between" align="baseline">
              <FormLabel color="var(--pp-muted)" fontSize="sm">Password</FormLabel>
              <Text as={RouterLink} to="/forgot-password" fontSize="sm" color="neon.cyan" fontWeight="medium" _hover={{ textDecoration: 'underline' }}>Forgot Password?</Text>
            </Flex>
            <InputGroup>
              <Input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" _hover={{ borderColor: 'gray.700' }} />
              <InputRightElement>
                <Button size="sm" variant="ghost" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</Button>
              </InputRightElement>
            </InputGroup>
          </FormControl>
          <PrimaryButton type="submit" isLoading={busy} loadingText="Logging in" size="lg" w="full">Log in</PrimaryButton>
          <Text fontSize="sm" color="var(--pp-muted)" textAlign="center">
            New here? <Text as={RouterLink} to="/register" color="neon.cyan" fontWeight="medium" _hover={{ textDecoration: 'underline' }}>Create an account</Text>
          </Text>
        </Stack>
      </Box>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // A ref blocks a second submit before React has re-rendered, so a double click cannot create two requests.
  const inFlight = useRef(false);
  const errors = {
    name: name && name.trim().length < 2 ? 'Enter your full name.' : null,
    email: email && !EMAIL.test(email) ? 'Enter a valid email address.' : null,
    password: password && password.length < 8 ? 'Use at least 8 characters.' : null,
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    if (name.trim().length < 2 || !EMAIL.test(email) || password.length < 8) {
      setError('Check the highlighted fields and try again.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      // The account is saved on the server before this returns. The success popup appears only after that.
      await api.post<User>('/auth/register', { name: name.trim(), email, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not create your account. Please try again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Start with your resume. It takes about two minutes.">
      <style>{POP_CSS}</style>
      <Box as="form" onSubmit={submit} noValidate aria-busy={busy}>
        <Stack spacing={5}>
          <ErrorAlert message={error} />
          <FormControl isInvalid={!!errors.name}>
            <FormLabel color="var(--pp-muted)" fontSize="sm">Full name</FormLabel>
            <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} isDisabled={busy} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" />
            <FormErrorMessage>{errors.name}</FormErrorMessage>
          </FormControl>
          <FormControl isInvalid={!!errors.email}>
            <FormLabel color="var(--pp-muted)" fontSize="sm">Email</FormLabel>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} isDisabled={busy} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" />
            <FormErrorMessage>{errors.email}</FormErrorMessage>
          </FormControl>
          <FormControl isInvalid={!!errors.password}>
            <FormLabel color="var(--pp-muted)" fontSize="sm">Password</FormLabel>
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} isDisabled={busy} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" />
            <FormErrorMessage>{errors.password}</FormErrorMessage>
          </FormControl>
          <Text fontSize="xs" color="var(--pp-faint)">Passwords are stored as salted hashes. Nobody, including us, can read them.</Text>
          <PrimaryButton type="submit" isLoading={busy} loadingText="Creating your account..." isDisabled={busy} size="lg" w="full">Create account</PrimaryButton>
          <Text fontSize="sm" color="var(--pp-muted)" textAlign="center">
            Already registered? <Text as={RouterLink} to="/login" color="neon.cyan" fontWeight="medium" _hover={{ textDecoration: 'underline' }}>Log in</Text>
          </Text>
        </Stack>
      </Box>

      <Modal isOpen={success} onClose={() => undefined} closeOnOverlayClick={false} closeOnEsc={false} isCentered motionPreset="scale">
        <ModalOverlay bg="rgba(3,5,14,0.7)" backdropFilter="blur(8px)" />
        <ModalContent bg="var(--pp-glass)" backdropFilter="blur(22px)" border="1px solid" borderColor="var(--pp-border-strong)" borderRadius="2xl" boxShadow="0 0 60px rgba(139,92,246,0.45)" mx={5}>
          <ModalBody pt={10} px={8} textAlign="center">
            <Stack spacing={4} align="center" className="pp-pop" sx={{ animation: 'pp-pop 600ms cubic-bezier(0.22,1,0.36,1) both' }}>
              <Box w="72px" h="72px" borderRadius="full" bgImage={GRADIENT} display="grid" placeItems="center" boxShadow="0 0 40px rgba(34,211,238,0.5)" sx={{ animation: 'pp-ring-in 700ms cubic-bezier(0.22,1,0.36,1) both' }}>
                <CheckCircle size={40} weight="fill" color="white" aria-hidden />
              </Box>
              <Heading as="h2" size="lg" fontWeight="bold"><GradientText>Registration Successful!</GradientText></Heading>
              <Text color="var(--pp-muted)" fontSize="md" lineHeight="1.7">Thank you for registering with AI PrepInterviewer. Your account has been created successfully!</Text>
            </Stack>
          </ModalBody>
          <ModalFooter justifyContent="center" pb={8}>
            <PrimaryButton size="lg" onClick={() => navigate('/login', { replace: true })}>Continue to Login</PrimaryButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthShell>
  );
}
