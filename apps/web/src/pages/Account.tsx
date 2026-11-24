// Profile, account settings, change password and delete account.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Box, FormControl, FormErrorMessage, FormLabel, Input, Stack, Text, useDisclosure, Divider, HStack } from '@chakra-ui/react';
import { api, ApiError } from '../api/client';
import type { Profile } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { ErrorAlert, Eyebrow, GhostButton, LoadingBlock, PageHeader, PrimaryButton, Surface } from '../components/ui';

export function ProfilePage() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Profile>('/profile').then((p) => {
      setProfile(p);
      setName(p.name);
    }).catch((err) => setError(err instanceof ApiError ? err.message : 'We could not load your profile.'));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.patch<Profile>('/profile', { name: name.trim() });
      setProfile(updated);
      setUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your changes were not saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Profile" subtitle="The name shown across your account and reports." />
      <Stack spacing={6} maxW="640px">
        <ErrorAlert message={error} />
        {!profile && !error && <LoadingBlock lines={3} />}
        {profile && (
          <Surface as="form" onSubmit={save}>
            <Stack spacing={5}>
              <FormControl isInvalid={!!error && name.trim().length < 2}>
                <FormLabel color="var(--pp-muted)" fontSize="sm">Full name</FormLabel>
                <Input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" autoComplete="name" />
                <FormErrorMessage>Enter your full name.</FormErrorMessage>
              </FormControl>
              <FormControl>
                <FormLabel color="var(--pp-muted)" fontSize="sm">Email</FormLabel>
                <Input value={profile.email} isReadOnly bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-muted)" />
                <Text fontSize="xs" color="var(--pp-faint)" mt={2}>Your email is used to log in and cannot be changed here.</Text>
              </FormControl>
              <HStack spacing={4}>
                <PrimaryButton type="submit" isLoading={busy} loadingText="Saving">Save changes</PrimaryButton>
                {saved && <Text role="status" fontSize="sm" color="green.200">Saved.</Text>}
              </HStack>
            </Stack>
          </Surface>
        )}
      </Stack>
    </>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const dialog = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.delete('/profile', { password });
      dialog.onClose();
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not delete your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Account settings" subtitle="Security and your data." />
      <Stack spacing={6} maxW="640px">
        <Surface>
          <Stack spacing={4}>
            <Eyebrow>Password</Eyebrow>
            <Text color="var(--pp-muted)" fontSize="sm">Change the password you use to log in. You will stay signed in on this device.</Text>
            <GhostButton alignSelf="flex-start" onClick={() => navigate('/settings/password')}>Change password</GhostButton>
          </Stack>
        </Surface>
        <Surface>
          <Stack spacing={4}>
            <Eyebrow>Your data</Eyebrow>
            <Text color="var(--pp-muted)" fontSize="sm">Your resume file, extracted text, analysis, interviews, answers and reports are stored only for your account. Deleting resumes removes the file and its text. Deleting your account removes everything listed above.</Text>
            <Divider borderColor="var(--pp-border)" />
            <Text color="var(--pp-text)" fontSize="sm" fontWeight="medium">Delete account</Text>
            <Text color="var(--pp-faint)" fontSize="sm">This cannot be undone.</Text>
            <GhostButton alignSelf="flex-start" color="red.200" borderColor="rgba(255,90,90,0.3)" onClick={dialog.onOpen}>Delete my account</GhostButton>
          </Stack>
        </Surface>
      </Stack>

      <AlertDialog isOpen={dialog.isOpen} leastDestructiveRef={cancelRef} onClose={dialog.onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent bg="var(--pp-input)" border="1px solid" borderColor="var(--pp-border)">
            <AlertDialogHeader fontWeight="semibold">Delete your account?</AlertDialogHeader>
            <AlertDialogBody>
              <Stack spacing={4}>
                <Text color="var(--pp-muted)">Everything tied to your account is deleted. Enter your password to confirm.</Text>
                <ErrorAlert message={error} />
                <FormControl>
                  <FormLabel color="var(--pp-muted)" fontSize="sm">Password</FormLabel>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} bg="var(--pp-fill)" borderColor="var(--pp-border)" autoComplete="current-password" />
                </FormControl>
              </Stack>
            </AlertDialogBody>
            <AlertDialogFooter>
              <GhostButton ref={cancelRef} onClick={dialog.onClose}>Cancel</GhostButton>
              <PrimaryButton ml={3} bg="red.500" _hover={{ bg: 'red.400' }} onClick={remove} isLoading={busy} isDisabled={!password}>Delete account</PrimaryButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError('Use at least 8 characters for your new password.');
    if (next !== confirm) return setError('The new passwords do not match.');
    setBusy(true);
    try {
      await api.post('/profile/password', { currentPassword: current, newPassword: next });
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your password was not changed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Change password" subtitle="Choose a new password you do not use elsewhere." />
      <Stack spacing={6} maxW="480px">
        <ErrorAlert message={error} />
        {done && <Text role="status" color="green.200" fontSize="sm">Your password was changed.</Text>}
        <Surface as="form" onSubmit={submit}>
          <Stack spacing={5}>
            <FormControl>
              <FormLabel color="var(--pp-muted)" fontSize="sm">Current password</FormLabel>
              <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" />
            </FormControl>
            <FormControl>
              <FormLabel color="var(--pp-muted)" fontSize="sm">New password</FormLabel>
              <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" />
            </FormControl>
            <FormControl>
              <FormLabel color="var(--pp-muted)" fontSize="sm">Confirm new password</FormLabel>
              <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" />
            </FormControl>
            <HStack spacing={3}>
              <PrimaryButton type="submit" isLoading={busy} loadingText="Saving" isDisabled={!current || !next || !confirm}>Change password</PrimaryButton>
              <GhostButton onClick={() => navigate('/settings')}>Back to settings</GhostButton>
            </HStack>
          </Stack>
        </Surface>
        <Box />
      </Stack>
    </>
  );
}
