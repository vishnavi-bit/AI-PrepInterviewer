import { GRADIENT } from '../styling/tokens';
// Interview completion, the full report, and the interview history.
import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Box, Grid, HStack, Stack, Table, Tbody, Td, Text, Th, Thead, Tr, Progress, SimpleGrid, Badge } from '@chakra-ui/react';
import { CheckCircle, Clock, Flag } from '@phosphor-icons/react';
import { api, ApiError } from '../api/client';
import type { Report, SessionSummary, SessionView } from '../api/types';
import { EmptyState, ErrorAlert, Eyebrow, GhostButton, LoadingBlock, PageHeader, PrimaryButton, ScoreRing, Surface } from '../components/ui';

const STATUS_TEXT: Record<string, { title: string; body: string; icon: React.ReactNode }> = {
  completed: { title: 'Interview complete', body: 'You answered every question. Your report is ready.', icon: <CheckCircle size={28} color="#9AE6B4" /> },
  ended_early: { title: 'You ended the interview', body: 'Your answers so far are saved. The report covers the questions you answered.', icon: <Flag size={28} color="#22D3EE" /> },
  time_up: { title: 'Time is up', body: 'The time limit was reached. The report covers the questions you answered.', icon: <Clock size={28} color="#FAF089" /> },
  in_progress: { title: 'Interview in progress', body: 'Go back to the room to continue.', icon: <Clock size={28} color="#22D3EE" /> },
};

export function InterviewComplete() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ session: SessionView }>(`/interview/sessions/${sessionId}`).then((r) => setSession(r.session)).catch((err) => setError(err instanceof ApiError ? err.message : 'We could not load this interview.'));
  }, [sessionId]);

  if (error) return <Stack spacing={4}><ErrorAlert message={error} /><GhostButton alignSelf="flex-start" onClick={() => navigate('/dashboard')}>Back to dashboard</GhostButton></Stack>;
  if (!session) return <LoadingBlock lines={3} />;
  if (session.status === 'in_progress') {
    return <EmptyState title="This interview is still running" body="Return to the room to answer the next question." action={<PrimaryButton as={RouterLink} to={`/interview/room/${session.id}`}>Return to the interview</PrimaryButton>} />;
  }
  const copy = STATUS_TEXT[session.status] ?? STATUS_TEXT.completed;
  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.body} />
      <Surface maxW="680px">
        <Stack spacing={6}>
          <HStack spacing={4}>{copy.icon}<Stack spacing={0}><Text fontWeight="semibold">{session.role}</Text><Text fontSize="sm" color="var(--pp-muted)">{session.interviewType} · {session.difficulty} · {session.progress.answered} of {session.progress.mainTotal} questions answered</Text></Stack></HStack>
          <HStack spacing={3} wrap="wrap">
            <PrimaryButton as={RouterLink} to={`/interview/report/${session.id}`}>View my report</PrimaryButton>
            <GhostButton as={RouterLink} to="/interview">Start another interview</GhostButton>
          </HStack>
          <Text fontSize="xs" color="var(--pp-faint)">Reports are AI practice estimates. They do not guarantee real hiring outcomes.</Text>
        </Stack>
      </Surface>
    </>
  );
}

export function ReportPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Report>(`/interview/sessions/${sessionId}/report`).then(setReport).catch((err) => setError(err instanceof ApiError ? err.message : 'We could not load this report.'));
  }, [sessionId]);

  if (error) return <Stack spacing={4}><ErrorAlert message={error} /><GhostButton alignSelf="flex-start" onClick={() => navigate('/interview/history')}>Back to history</GhostButton></Stack>;
  if (!report) return <LoadingBlock lines={6} />;

  return (
    <>
      <PageHeader title="Interview report" subtitle={`${report.session.role} · ${report.session.interviewType} · ${report.session.difficulty}`} actions={<GhostButton as={RouterLink} to="/interview/history">All interviews</GhostButton>} />
      <Stack spacing={6}>
        <Grid templateColumns={{ base: '1fr', md: '240px 1fr' }} gap={5}>
          <Surface display="flex" flexDir="column" alignItems="center" justifyContent="center" gap={3}>
            <ScoreRing score={report.overallScore} />
            <Text fontSize="sm" color="var(--pp-muted)">Overall score</Text>
          </Surface>
          <Surface>
            <Stack spacing={4}>
              <Eyebrow>By category</Eyebrow>
              {report.categories.map((c) => (
                <Box key={c.name}>
                  <HStack justify="space-between" mb={2}><Text fontSize="sm" color="var(--pp-text)">{c.name}</Text><Text fontSize="sm" color="var(--pp-muted)">{c.score}</Text></HStack>
                  <Progress value={c.score} size="sm" borderRadius="full" bg="var(--pp-fill)" sx={{ '& > div': { background: GRADIENT } }} aria-label={`${c.name} ${c.score} out of 100`} />
                </Box>
              ))}
            </Stack>
          </Surface>
        </Grid>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}>
          <Surface><Stack spacing={3}><Eyebrow>Strengths</Eyebrow>{report.strengths.length ? report.strengths.map((s) => <Text key={s} fontSize="sm" color="var(--pp-text)">{s}</Text>) : <Text fontSize="sm" color="var(--pp-faint)">No standout strengths in this interview.</Text>}</Stack></Surface>
          <Surface><Stack spacing={3}><Eyebrow>To improve</Eyebrow>{report.weaknesses.length ? report.weaknesses.map((s) => <Text key={s} fontSize="sm" color="var(--pp-text)">{s}</Text>) : <Text fontSize="sm" color="var(--pp-faint)">Nothing stood out as a weak area.</Text>}</Stack></Surface>
          <Surface><Stack spacing={3}><Eyebrow>Practise next</Eyebrow>{report.suggestions.map((s) => <Text key={s} fontSize="sm" color="var(--pp-text)">{s}</Text>)}</Stack></Surface>
        </SimpleGrid>

        <Surface>
          <Stack spacing={5}>
            <Eyebrow>Question by question</Eyebrow>
            {report.questionFeedback.map((f, i) => (
              <Box key={i} pb={4} borderBottom={i < report.questionFeedback.length - 1 ? '1px solid' : 'none'} borderColor="var(--pp-border)">
                <HStack justify="space-between" align="flex-start" spacing={4}>
                  <Text fontWeight="medium" color="var(--pp-text)">{i + 1}. {f.question}</Text>
                  <Badge borderRadius="full" px={3} bg="var(--pp-fill)" color="var(--pp-text)" border="1px solid" borderColor="var(--pp-border)">{f.score}</Badge>
                </HStack>
                <Text fontSize="sm" color="var(--pp-muted)" mt={2}>{f.feedback}</Text>
              </Box>
            ))}
          </Stack>
        </Surface>
        <Text fontSize="xs" color="var(--pp-faint)">{report.disclaimer}</Text>
      </Stack>
    </>
  );
}

export function HistoryPage() {
  const [rows, setRows] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.get<{ sessions: SessionSummary[] }>('/interview/sessions').then((r) => setRows(r.sessions)).catch((err) => setError(err instanceof ApiError ? err.message : 'We could not load your history.'));
  }, []);

  const label: Record<string, string> = { completed: 'Completed', ended_early: 'Ended early', time_up: 'Time up', in_progress: 'In progress' };

  return (
    <>
      <PageHeader title="Interview history" subtitle="Every practice interview you have started, with its score once a report is ready." />
      <Stack spacing={5}>
        <ErrorAlert message={error} />
        {!rows && !error && <LoadingBlock lines={5} />}
        {rows && rows.length === 0 && <EmptyState title="No interviews yet" body="Your practice interviews will appear here." action={<PrimaryButton as={RouterLink} to="/interview">Start an interview</PrimaryButton>} />}
        {rows && rows.length > 0 && (
          <Surface p={0} overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th color="var(--pp-muted)" borderColor="var(--pp-border)">Date</Th>
                  <Th color="var(--pp-muted)" borderColor="var(--pp-border)">Role</Th>
                  <Th color="var(--pp-muted)" borderColor="var(--pp-border)">Type</Th>
                  <Th color="var(--pp-muted)" borderColor="var(--pp-border)">Status</Th>
                  <Th color="var(--pp-muted)" borderColor="var(--pp-border)" isNumeric>Score</Th>
                  <Th borderColor="var(--pp-border)" />
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((r) => (
                  <Tr key={r.id} _hover={{ bg: 'gray.950' }}>
                    <Td borderColor="var(--pp-border)" whiteSpace="nowrap">{new Date(r.createdAt).toLocaleString()}</Td>
                    <Td borderColor="var(--pp-border)">{r.role}</Td>
                    <Td borderColor="var(--pp-border)">{r.interviewType}</Td>
                    <Td borderColor="var(--pp-border)">{label[r.status] ?? r.status}</Td>
                    <Td borderColor="var(--pp-border)" isNumeric>{r.score ?? '—'}</Td>
                    <Td borderColor="var(--pp-border)" textAlign="right">
                      {r.score !== null && <GhostButton size="sm" as={RouterLink} to={`/interview/report/${r.id}`}>Open report</GhostButton>}
                      {r.status === 'in_progress' && <GhostButton size="sm" as={RouterLink} to={`/interview/room/${r.id}`}>Continue</GhostButton>}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Surface>
        )}
      </Stack>
    </>
  );
}
