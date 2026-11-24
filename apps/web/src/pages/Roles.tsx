// Job role recommendations: the candidate picks one. They are never forced to take the first suggestion.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, RadioGroup, Stack, Text, Box, HStack } from '@chakra-ui/react';
import { api, ApiError } from '../api/client';
import type { RolesState } from '../api/types';
import { EmptyState, ErrorAlert, GhostButton, LoadingBlock, PageHeader, PrimaryButton, Surface } from '../components/ui';

export default function RolesPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<RolesState | null>(null);
  const [choice, setChoice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<RolesState>('/roles')
      .then((s) => {
        setState(s);
        setChoice(s.selectedRole ?? '');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'We could not load your role suggestions.'));
  }, []);

  const save = async () => {
    if (!choice) return;
    setSaving(true);
    setError(null);
    try {
      const next = await api.post<RolesState>('/roles/selection', { role: choice });
      setState(next);
      navigate('/interview');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your choice was not saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Job roles" subtitle="Based on your confirmed resume, these roles fit your skills. Choose the one you want to practise for." />
      <Stack spacing={6}>
        <ErrorAlert message={error} />
        {!state && !error && <LoadingBlock lines={4} />}

        {state?.status === 'needs-analysis' && (
          <EmptyState title="Analyse your resume first" body="We need the analysis of your resume before we can suggest roles." action={<PrimaryButton onClick={() => navigate('/resume')}>Go to your resume</PrimaryButton>} />
        )}
        {state?.status === 'needs-confirmation' && (
          <EmptyState title="Confirm your resume details" body="Review what we found and confirm it. Roles are based only on confirmed details." action={<PrimaryButton onClick={() => navigate('/resume')}>Review my resume</PrimaryButton>} />
        )}
        {state?.status === 'no-matches' && (
          <EmptyState title="No strong matches yet" body="We could not find a clear technology match in your confirmed details. Add skills or technologies on your resume page, then come back." action={<GhostButton onClick={() => navigate('/resume')}>Edit my details</GhostButton>} />
        )}

        {state?.status === 'ready' && (
          <>
            <RadioGroup value={choice} onChange={setChoice}>
              <Stack spacing={4}>
                {state.roles.map((r) => (
                  <Box as="label" key={r.title} cursor="pointer" display="block">
                    <Surface
                      borderColor={choice === r.title ? 'brand.400' : 'gray.800'}
                      boxShadow={choice === r.title ? '0 0 0 1px #6470F5' : 'none'}
                      transition="all 300ms cubic-bezier(0.22,1,0.36,1)"
                      _hover={{ borderColor: 'gray.700' }}
                    >
                      <HStack align="flex-start" spacing={4}>
                        <Radio value={r.title} colorScheme="brand" mt={1} aria-label={r.title} />
                        <Stack spacing={1}>
                          <Text fontWeight="semibold" fontSize="lg">{r.title}</Text>
                          <Text color="var(--pp-muted)" fontSize="sm">{r.reason}</Text>
                        </Stack>
                      </HStack>
                    </Surface>
                  </Box>
                ))}
              </Stack>
            </RadioGroup>
            <HStack spacing={3}>
              <PrimaryButton onClick={save} isDisabled={!choice} isLoading={saving} loadingText="Saving">Use this role</PrimaryButton>
              {state.selectedRole && <GhostButton onClick={() => navigate('/interview')}>Continue with {state.selectedRole}</GhostButton>}
            </HStack>
          </>
        )}
      </Stack>
    </>
  );
}
