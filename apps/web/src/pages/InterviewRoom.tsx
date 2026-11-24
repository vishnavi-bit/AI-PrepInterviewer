// Interview room: the interviewer asks each question aloud and on screen. Answer by voice (with a transcript you can correct)
// or by typing. The server owns the clock and the question order; the page only shows what the server sends.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Box, Grid, HStack, Stack, Text, Textarea, useDisclosure } from '@chakra-ui/react';
import { Microphone, MicrophoneSlash, SpeakerHigh, SpeakerSlash, ArrowClockwise, PaperPlaneRight, Stop } from '@phosphor-icons/react';
import { api, ApiError } from '../api/client';
import type { SessionView } from '../api/types';
import { InterviewerAvatar, type AvatarState } from '../components/InterviewerAvatar';
import { ErrorAlert, GhostButton, LoadingBlock, PrimaryButton, Surface, Eyebrow } from '../components/ui';
import { listen, recognitionSupported, speak, type Listener } from '../speech/speech';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function InterviewRoom() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [interim, setInterim] = useState('');
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const listener = useRef<Listener | null>(null);
  const cancelSpeech = useRef<() => void>(() => undefined);
  const lastSpoken = useRef<string | null>(null);
  const endDialog = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const micSupported = recognitionSupported();

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ session: SessionView }>(`/interview/sessions/${sessionId}`);
      setSession(res.session);
      setSecondsLeft(res.session.remainingSeconds);
      if (res.session.status !== 'in_progress') navigate(`/interview/complete/${res.session.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not open this interview.');
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // Count down locally. The server is asked to finish the interview once, when the local clock reaches zero.
  const expiryChecked = useRef(false);
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;
    const id = window.setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [session?.id, session?.status]);
  useEffect(() => {
    if (session?.status !== 'in_progress' || secondsLeft > 0 || expiryChecked.current) return;
    expiryChecked.current = true;
    load();
  }, [secondsLeft, session?.status, load]);

  // Speak each new question once, unless the candidate has muted audio.
  useEffect(() => {
    const q = session?.currentQuestion;
    if (!q || q.id === lastSpoken.current) return;
    lastSpoken.current = q.id;
    expiryChecked.current = false;
    setDraft('');
    setInterim('');
    if (muted) return;
    cancelSpeech.current();
    cancelSpeech.current = speak(q.text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: (m) => setNotice(m),
    });
  }, [session?.currentQuestion, muted]);

  useEffect(() => () => {
    cancelSpeech.current();
    listener.current?.stop();
  }, []);

  const replay = () => {
    if (!session?.currentQuestion) return;
    setMuted(false);
    cancelSpeech.current();
    cancelSpeech.current = speak(session.currentQuestion.text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: (m) => setNotice(m),
    });
  };

  const toggleMute = () => {
    setMuted((m) => {
      if (!m) {
        cancelSpeech.current();
        setSpeaking(false);
      }
      return !m;
    });
  };

  const toggleMic = () => {
    if (recording) {
      listener.current?.stop();
      return;
    }
    setNotice(null);
    cancelSpeech.current();
    setSpeaking(false);
    setRecording(true);
    listener.current = listen({
      onText: (text, final) => {
        if (final) {
          setDraft((d) => (text ? (d ? `${d.trim()} ${text}` : text) : d));
          setInterim('');
        } else {
          setInterim(text);
        }
      },
      onError: (m) => {
        setNotice(m);
        setRecording(false);
      },
      onEnd: () => setRecording(false),
    });
  };

  const submit = async () => {
    if (!session?.currentQuestion) return;
    const answerText = draft.trim();
    if (!answerText) {
      setNotice('Type or speak an answer before submitting.');
      return;
    }
    if (recording) listener.current?.stop();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const source = recording || interim ? 'voice' : 'text';
    try {
      const res = await api.post<{ session: SessionView }>(`/interview/sessions/${session.id}/answers`, { questionId: session.currentQuestion.id, answerText, source });
      setSession(res.session);
      setSecondsLeft(res.session.remainingSeconds);
      if (res.session.status !== 'in_progress') {
        navigate(`/interview/complete/${res.session.id}`, { replace: true });
      }
    } catch (err) {
      // Keep the answer on screen so a failed request never loses it.
      setError(err instanceof ApiError ? err.message : 'Your answer was not sent. Your text is still here, so try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const endNow = async () => {
    endDialog.onClose();
    try {
      await api.post(`/interview/sessions/${sessionId}/end`);
      navigate(`/interview/complete/${sessionId}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not end the interview. Please try again.');
    }
  };

  if (error && !session) {
    return (
      <Stack spacing={4}>
        <ErrorAlert message={error} />
        <GhostButton onClick={() => navigate('/interview')} alignSelf="flex-start">Back to setup</GhostButton>
      </Stack>
    );
  }
  if (!session) return <LoadingBlock lines={5} />;

  const avatarState: AvatarState = speaking ? 'speaking' : recording ? 'listening' : 'idle';
  const q = session.currentQuestion;
  const answeredCount = session.progress.answered;
  const low = secondsLeft <= 60;

  return (
    <Stack spacing={6}>
      <HStack justify="space-between" wrap="wrap" spacing={4}>
        <Stack spacing={1}>
          <Eyebrow>{session.role} · {session.interviewType} · {session.difficulty}</Eyebrow>
          <Text fontSize="sm" color="var(--pp-muted)" aria-live="polite">
            Question {Math.min(answeredCount + 1, session.progress.mainTotal + (q?.kind === 'followup' ? 1 : 0))} of {session.progress.mainTotal} main questions
          </Text>
        </Stack>
        <HStack spacing={3}>
          <Box px={4} py={2} borderRadius="lg" bg="var(--pp-fill)" border="1px solid" borderColor={low ? 'red.400' : 'gray.800'}>
            <Text fontFamily="mono" fontSize="lg" color={low ? 'red.200' : 'gray.50'} aria-label={`${clock(secondsLeft)} remaining`} role="timer">{clock(secondsLeft)}</Text>
          </Box>
          <GhostButton onClick={endDialog.onOpen}>End interview</GhostButton>
        </HStack>
      </HStack>

      <Grid templateColumns={{ base: '1fr', lg: '320px 1fr' }} gap={6} alignItems="start">
        <Surface>
          <Stack spacing={5} align="center">
            <InterviewerAvatar state={avatarState} onActivate={replay} />
            <HStack spacing={2} wrap="wrap" justify="center">
              <GhostButton size="sm" leftIcon={<ArrowClockwise size={16} />} onClick={replay} isDisabled={!q}>Replay question</GhostButton>
              <GhostButton size="sm" leftIcon={muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />} onClick={toggleMute} aria-pressed={muted}>{muted ? 'Unmute' : 'Mute'}</GhostButton>
            </HStack>
          </Stack>
        </Surface>

        <Stack spacing={5}>
          <Surface>
            <Stack spacing={4}>
              <Eyebrow>{q?.kind === 'followup' ? 'Follow-up' : 'Question'}</Eyebrow>
              {q ? (
                <Text as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="semibold" lineHeight="1.3" letterSpacing="-0.01em" sx={{ textWrap: "balance" }}>{q.text}</Text>
              ) : (
                <Text color="var(--pp-muted)">Waiting for the next question…</Text>
              )}
            </Stack>
          </Surface>

          {error && <ErrorAlert message={error} />}
          {notice && <Text role="status" fontSize="sm" color="yellow.200">{notice}</Text>}

          <Surface>
            <Stack spacing={4}>
              <HStack justify="space-between" wrap="wrap" spacing={3}>
                <Text fontWeight="medium" color="var(--pp-text)">Your answer</Text>
                <HStack spacing={2}>
                  {micSupported ? (
                    <GhostButton size="sm" leftIcon={recording ? <Stop size={16} weight="fill" /> : <Microphone size={16} />} onClick={toggleMic} aria-pressed={recording} color={recording ? 'red.200' : undefined}>
                      {recording ? 'Stop recording' : 'Answer by voice'}
                    </GhostButton>
                  ) : (
                    <Text fontSize="xs" color="var(--pp-faint)" display="flex" alignItems="center" gap={1}><MicrophoneSlash size={14} /> Voice answers need Chrome or Edge. Type instead.</Text>
                  )}
                </HStack>
              </HStack>
              {recording && (
                <HStack spacing={2} role="status" aria-live="polite">
                  <Box w="8px" h="8px" borderRadius="full" bg="red.300" />
                  <Text fontSize="sm" color="var(--pp-muted)">Listening. Speak your answer, then press stop to review it.</Text>
                </HStack>
              )}
              <Textarea
                aria-label="Your answer"
                value={interim ? `${draft}${draft ? ' ' : ''}${interim}` : draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setInterim('');
                }}
                placeholder="Type your answer here, or use the microphone. You can correct a voice transcript before you submit."
                rows={7}
                bg="var(--pp-input)"
                borderColor="var(--pp-border)"
                _hover={{ borderColor: 'gray.700' }}
                _focusVisible={{ borderColor: 'brand.400' }}
                maxLength={4000}
              />
              <HStack justify="space-between" wrap="wrap" spacing={3}>
                <Text fontSize="xs" color="var(--pp-faint)">{draft.length} / 4000 characters</Text>
                <PrimaryButton rightIcon={<PaperPlaneRight size={16} />} onClick={submit} isLoading={submitting} loadingText="Sending" isDisabled={!q || !draft.trim()}>Submit answer</PrimaryButton>
              </HStack>
            </Stack>
          </Surface>

          {session.transcript.length > 0 && (
            <Surface>
              <Box as="details">
                <Box as="summary" cursor="pointer" color="neon.cyan" fontSize="sm" fontWeight="medium">Answers so far ({session.transcript.length})</Box>
                <Stack spacing={4} mt={4}>
                  {session.transcript.map((t) => (
                    <Box key={t.questionId}>
                      <Text fontSize="sm" color="var(--pp-muted)">{t.question}</Text>
                      <Text fontSize="sm" color="var(--pp-text)" mt={1}>{t.answer}</Text>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Surface>
          )}
        </Stack>
      </Grid>

      <AlertDialog isOpen={endDialog.isOpen} leastDestructiveRef={cancelRef} onClose={endDialog.onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent bg="var(--pp-input)" border="1px solid" borderColor="var(--pp-border)">
            <AlertDialogHeader fontWeight="semibold">End this interview?</AlertDialogHeader>
            <AlertDialogBody color="var(--pp-muted)">Your answers so far are kept and you will get a report for them. You cannot continue this interview afterwards.</AlertDialogBody>
            <AlertDialogFooter>
              <GhostButton ref={cancelRef} onClick={endDialog.onClose}>Keep going</GhostButton>
              <PrimaryButton ml={3} onClick={endNow}>End interview</PrimaryButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Stack>
  );
}
