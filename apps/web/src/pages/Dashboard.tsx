import { GRADIENT } from '../styling/tokens';
// Dashboard: totals, scores, recent interviews, role-wise performance, weak topics, progress and practice suggestions.
import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Grid, HStack, Progress, Stack, Text, SimpleGrid } from '@chakra-ui/react';
import { ArrowRight, Microphone, Lightbulb } from '@phosphor-icons/react';
import { api, ApiError } from '../api/client';
import type { Dashboard as DashboardData } from '../api/types';
import { EmptyState, ErrorAlert, Eyebrow, GhostButton, LoadingBlock, PageHeader, PrimaryButton, Surface } from '../components/ui';
import { useAuth } from '../context/AuthContext';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Surface>
      <Stack spacing={2}>
        <Text fontSize="sm" color="var(--pp-muted)">{label}</Text>
        <Text fontSize="4xl" fontWeight="semibold" letterSpacing="-0.02em" lineHeight="1">{value}</Text>
        {hint && <Text fontSize="xs" color="var(--pp-faint)">{hint}</Text>}
      </Stack>
    </Surface>
  );
}

function ProgressChart({ points }: { points: { date: string; score: number }[] }) {
  if (points.length < 2) return <Text fontSize="sm" color="var(--pp-muted)">Complete two interviews to see your progress over time.</Text>;
  const w = 640;
  const h = 180;
  const xs = points.map((_, i) => (i / (points.length - 1)) * (w - 24) + 12);
  const ys = points.map((p) => h - 14 - (p.score / 100) * (h - 28));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length - 1]},${h} L${xs[0]},${h} Z`;
  return (
    <Box as="svg" role="img" aria-label={`Scores over ${points.length} interviews, from ${points[0].score} to ${points[points.length - 1].score}`} viewBox={`0 0 ${w} ${h}`} w="full" h="auto" overflow="visible">
      <defs>
        <linearGradient id="pp-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#22D3EE" /><stop offset="55%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#EC4899" /></linearGradient>
        <linearGradient id="pp-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.22" /><stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" /></linearGradient>
      </defs>
      {[0, 50, 100].map((g) => (
        <line key={g} x1="0" x2={w} y1={h - 14 - (g / 100) * (h - 28)} y2={h - 14 - (g / 100) * (h - 28)} style={{ stroke: 'var(--pp-border)' }} strokeWidth="1" />
      ))}
      <path d={area} fill="url(#pp-area)" />
      <path d={line} fill="none" stroke="url(#pp-line)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.7))" }} />
      {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="5" fill="#070B1F" stroke="#22D3EE" strokeWidth="2.5" />)}
    </Box>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<DashboardData>('/dashboard').then(setData).catch((err) => setError(err instanceof ApiError ? err.message : 'We could not load your dashboard.'));
  }, []);

  const first = user?.name.split(' ')[0] ?? 'there';

  return (
    <>
      <PageHeader
        title={`Hello, ${first}`}
        subtitle="Your practice at a glance: scores, recent interviews and what to work on next."
        actions={<PrimaryButton rightIcon={<ArrowRight size={16} />} onClick={() => navigate('/interview')}>Start an interview</PrimaryButton>}
      />
      <Stack spacing={6}>
        <ErrorAlert message={error} />
        {!data && !error && <LoadingBlock lines={5} />}

        {data && data.totalCompleted === 0 && (
          <EmptyState
            title="No interviews yet"
            body="Finish your first practice interview to see your score, feedback and progress here."
            action={<PrimaryButton leftIcon={<Microphone size={16} />} onClick={() => navigate('/interview')}>Start your first interview</PrimaryButton>}
          />
        )}

        {data && data.totalCompleted > 0 && (
          <>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}>
              <Stat label="Completed interviews" value={String(data.totalCompleted)} />
              <Stat label="Most recent score" value={data.latestScore === null ? '—' : String(data.latestScore)} hint="Out of 100, an AI practice estimate" />
              <Stat label="Average score" value={data.averageScore === null ? '—' : String(data.averageScore)} hint="Across all completed interviews" />
            </SimpleGrid>

            <Grid templateColumns={{ base: '1fr', xl: '1.4fr 1fr' }} gap={5}>
              <Surface>
                <Stack spacing={5}>
                  <Stack direction="row" justify="space-between" align="center">
                    <Stack spacing={0}>
                      <Eyebrow>Progress</Eyebrow>
                      <Text fontWeight="semibold">Scores over time</Text>
                    </Stack>
                  </Stack>
                  <ProgressChart points={data.progress} />
                </Stack>
              </Surface>
              <Surface>
                <Stack spacing={4}>
                  <Eyebrow>Next steps</Eyebrow>
                  <Stack spacing={3}>
                    {data.suggestions.map((s) => (
                      <HStack key={s} align="flex-start" spacing={3}>
                        <Lightbulb size={18} color="#22D3EE" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
                        <Text fontSize="sm" color="var(--pp-text)">{s}</Text>
                      </HStack>
                    ))}
                  </Stack>
                </Stack>
              </Surface>
            </Grid>

            <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
              <Surface>
                <Stack spacing={5}>
                  <Eyebrow>Role performance</Eyebrow>
                  {data.roles.map((r) => (
                    <Box key={r.role}>
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" color="var(--pp-text)">{r.role}</Text>
                        <Text fontSize="sm" color="var(--pp-muted)">{r.averageScore} · {r.interviews} {r.interviews === 1 ? 'interview' : 'interviews'}</Text>
                      </HStack>
                      <Progress value={r.averageScore} size="sm" borderRadius="full" bg="var(--pp-fill)" sx={{ '& > div': { background: GRADIENT } }} aria-label={`${r.role} average ${r.averageScore} out of 100`} />
                    </Box>
                  ))}
                </Stack>
              </Surface>
              <Surface>
                <Stack spacing={5}>
                  <Eyebrow>Topics to work on</Eyebrow>
                  {data.weakTopics.length === 0 && <Text fontSize="sm" color="var(--pp-faint)">Topic scores appear after your first report.</Text>}
                  {data.weakTopics.map((t) => (
                    <Box key={t.name}>
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" color="var(--pp-text)">{t.name}</Text>
                        <Text fontSize="sm" color="var(--pp-muted)">{t.score}</Text>
                      </HStack>
                      <Progress value={t.score} size="sm" borderRadius="full" bg="var(--pp-fill)" sx={{ '& > div': { background: GRADIENT } }} aria-label={`${t.name} ${t.score} out of 100`} />
                    </Box>
                  ))}
                </Stack>
              </Surface>
            </Grid>

            <Surface>
              <HStack justify="space-between" wrap="wrap" spacing={4}>
                <Stack spacing={1}>
                  <Text fontWeight="semibold">Recent interviews</Text>
                  <Text fontSize="sm" color="var(--pp-muted)">Open any report to read the full feedback.</Text>
                </Stack>
                <GhostButton as={RouterLink} to="/interview/history">View all history</GhostButton>
              </HStack>
              <Stack spacing={2} mt={5} divider={<Box borderTop="1px solid" borderColor="var(--pp-border)" />}>
                {data.recent.map((r) => (
                  <HStack key={r.id} justify="space-between" py={3} wrap="wrap" spacing={4}>
                    <Stack spacing={0}>
                      <Text fontSize="sm" color="var(--pp-text)">{r.role} · {r.interviewType}</Text>
                      <Text fontSize="xs" color="var(--pp-faint)">{new Date(r.createdAt).toLocaleString()}</Text>
                    </Stack>
                    <HStack spacing={4}>
                      <Text fontWeight="semibold">{r.score}</Text>
                      <GhostButton size="sm" as={RouterLink} to={`/interview/report/${r.id}`}>Open report</GhostButton>
                    </HStack>
                  </HStack>
                ))}
              </Stack>
            </Surface>
          </>
        )}
      </Stack>
    </>
  );
}
