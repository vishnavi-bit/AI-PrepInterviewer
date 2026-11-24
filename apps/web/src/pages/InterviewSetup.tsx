// Interview setup: choose the type, difficulty and duration, review the settings, then start.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, HStack, Stack, Text } from '@chakra-ui/react';
import { api, ApiError } from '../api/client';
import type { InterviewOptions, RolesState, SessionView } from '../api/types';
import { EmptyState, ErrorAlert, Eyebrow, GhostButton, LoadingBlock, PageHeader, PrimaryButton, Surface } from '../components/ui';

const TYPE_HINT: Record<string, string> = {
  Technical: 'Concepts, problem solving and how you would build things.',
  HR: 'Motivation, communication and fit for the team.',
  Behavioral: 'Real situations from your past, told with structure.',
  'Project-based': 'Depth on the projects listed on your resume.',
};

function Choice<T extends string | number>({ label, value, selected, onSelect, hint }: { label: string; value: T; selected: boolean; onSelect: (v: T) => void; hint?: string }) {
  return (
    <Box
      as="button"
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      textAlign="left"
      p={4}
      borderRadius="xl"
      bg={selected ? 'gray.900' : 'gray.950'}
      border="1px solid"
      borderColor={selected ? 'brand.400' : 'gray.800'}
      transition="all 300ms cubic-bezier(0.22,1,0.36,1)"
      _hover={{ borderColor: selected ? 'brand.400' : 'gray.700' }}
      _active={{ transform: 'scale(0.98)' }}
      w="full"
    >
      <Text fontWeight="semibold" color="var(--pp-text)">{label}</Text>
      {hint && <Text fontSize="xs" color="var(--pp-faint)" mt={1}>{hint}</Text>}
    </Box>
  );
}

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [options, setOptions] = useState<InterviewOptions | null>(null);
  const [roles, setRoles] = useState<RolesState | null>(null);
  const [type, setType] = useState<string>('Technical');
  const [difficulty, setDifficulty] = useState<string>('Medium');
  const [minutes, setMinutes] = useState<number>(15);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<InterviewOptions>('/interview/options'), api.get<RolesState>('/roles')])
      .then(([o, r]) => {
        setOptions(o);
        setRoles(r);
        setMinutes(o.durations.includes(15) ? 15 : o.durations[0]);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'We could not load the interview settings.'));
    api.get<{ session: SessionView | null }>('/interview/sessions/current').then((r) => setActiveId(r.session?.id ?? null)).catch(() => undefined);
  }, []);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ session: SessionView }>('/interview/sessions', { interviewType: type, difficulty, durationMinutes: minutes });
      navigate(`/interview/room/${res.session.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const current = await api.get<{ session: SessionView | null }>('/interview/sessions/current').catch(() => null);
        if (current?.session) {
          setActiveId(current.session.id);
        }
      }
      setError(err instanceof ApiError ? err.message : 'We could not start the interview. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const role = roles?.selectedRole ?? null;
  const ready = roles?.status === 'ready' && !!role;

  return (
    <>
      <PageHeader title="Set up your interview" subtitle="Choose the kind of interview, how hard it is, and how long it lasts. The settings are shown before you start." />
      <Stack spacing={6}>
        <ErrorAlert message={error} />
        {activeId && (
          <Surface borderColor="brand.700">
            <HStack justify="space-between" wrap="wrap" spacing={4}>
              <Text>You have an interview in progress.</Text>
              <PrimaryButton size="sm" onClick={() => navigate(`/interview/room/${activeId}`)}>Continue it</PrimaryButton>
            </HStack>
          </Surface>
        )}
        {!options || !roles ? (
          !error && <LoadingBlock lines={4} />
        ) : !ready ? (
          <EmptyState
            title={roles.status === 'needs-analysis' ? 'Upload and analyse your resume' : roles.status === 'needs-confirmation' ? 'Confirm your resume details' : 'Choose a job role first'}
            body="An interview is built from a role and your confirmed resume, so these come first."
            action={<PrimaryButton onClick={() => navigate(roles.status === 'ready' ? '/roles' : '/resume')}>{roles.status === 'ready' ? 'Choose a role' : 'Go to your resume'}</PrimaryButton>}
          />
        ) : (
          <Grid templateColumns={{ base: '1fr', xl: '1fr 360px' }} gap={6} alignItems="start">
            <Stack spacing={6}>
              <Surface>
                <Stack spacing={4}>
                  <Eyebrow>Interview type</Eyebrow>
                  <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3} role="radiogroup" aria-label="Interview type">
                    {options.types.map((t) => <Choice key={t} label={t} value={t} selected={type === t} onSelect={setType} hint={TYPE_HINT[t]} />)}
                  </Grid>
                </Stack>
              </Surface>
              <Surface>
                <Stack spacing={4}>
                  <Eyebrow>Difficulty</Eyebrow>
                  <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3} role="radiogroup" aria-label="Difficulty">
                    {options.difficulties.map((d) => <Choice key={d} label={d} value={d} selected={difficulty === d} onSelect={setDifficulty} />)}
                  </Grid>
                </Stack>
              </Surface>
              <Surface>
                <Stack spacing={4}>
                  <Eyebrow>Duration</Eyebrow>
                  <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} role="radiogroup" aria-label="Duration">
                    {options.durations.map((m) => <Choice key={m} label={`${m} min`} value={m} selected={minutes === m} onSelect={setMinutes} />)}
                  </Grid>
                </Stack>
              </Surface>
            </Stack>

            <Surface position={{ xl: 'sticky' }} top={{ xl: 6 }}>
              <Stack spacing={5}>
                <Eyebrow>Your interview</Eyebrow>
                <Stack spacing={3} fontSize="sm">
                  <HStack justify="space-between"><Text color="var(--pp-muted)">Role</Text><Text color="var(--pp-text)" textAlign="right">{role}</Text></HStack>
                  <HStack justify="space-between"><Text color="var(--pp-muted)">Type</Text><Text color="var(--pp-text)">{type}</Text></HStack>
                  <HStack justify="space-between"><Text color="var(--pp-muted)">Difficulty</Text><Text color="var(--pp-text)">{difficulty}</Text></HStack>
                  <HStack justify="space-between"><Text color="var(--pp-muted)">Time limit</Text><Text color="var(--pp-text)">{minutes} minutes</Text></HStack>
                  <HStack justify="space-between"><Text color="var(--pp-muted)">Questions</Text><Text color="var(--pp-text)">{options.mainQuestions}, plus up to one follow-up each</Text></HStack>
                </Stack>
                <Text fontSize="xs" color="var(--pp-faint)">Scores come at the end as practice estimates. They are not shown during the interview.</Text>
                <PrimaryButton size="lg" w="full" onClick={start} isLoading={busy} loadingText="Starting">Start interview</PrimaryButton>
                <GhostButton w="full" onClick={() => navigate('/roles')}>Change role</GhostButton>
              </Stack>
            </Surface>
          </Grid>
        )}
      </Stack>
    </>
  );
}
