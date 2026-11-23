import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  endInterview,
  getCurrentInterview,
  startInterview,
  submitAnswer,
  type InterviewQuestion,
  type InterviewSession,
} from "../api/interviewSession";
import { InterviewAvatar } from "../components/InterviewAvatar";
import { isSttSupported, startListening } from "../speech/stt";
import { isTtsSupported, speak, stopSpeaking } from "../speech/tts";

type Notice = { kind: "ok" | "error"; text: string };

const NO_SPEECH_TEXT = "No speech was heard. Try again, or type your answer.";
const NO_AUDIO_TEXT = "Audio is not available on this device. Read the question above.";

/** Identifies the question on screen, so it is spoken once when it appears. */
function questionKey(session: InterviewSession, current: InterviewQuestion): string {
  return `${session.id}:${current.kind}:${current.main_number}:${current.text}`;
}

const LOAD_FAILED = "Something went wrong. Please try again.";
const ENDED_TEXT: Record<string, string> = {
  completed: "You answered every question.",
  interrupted: "The time ran out, so the interview has ended.",
  ended_early: "You ended the interview early.",
};

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : LOAD_FAILED;
}

/** m:ss, never negative. */
function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function InterviewRoomPage() {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [offsetMs, setOffsetMs] = useState(0); // server clock minus device clock
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // The question whose time-up has already been sent, so the answer goes in once.
  const sentFor = useRef<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  // Stops the current recording; null when none is running.
  const stopRecording = useRef<(() => void) | null>(null);
  const ttsAvailable = isTtsSupported();
  const sttAvailable = isSttSupported();

  function show(result: InterviewSession | null) {
    setSession(result);
    if (result) setOffsetMs(Date.parse(result.server_now) - Date.now());
  }

  useEffect(() => {
    getCurrentInterview()
      .then(show)
      .catch((err) => setNotice({ kind: "error", text: errorText(err) }))
      .finally(() => setLoading(false));
    // Stop audio and microphone when the candidate leaves the room.
    return () => {
      stopSpeaking();
      stopRecording.current?.();
    };
  }, []);

  const inProgress = session?.status === "in_progress";

  // Re-render every second so the countdowns move.
  useEffect(() => {
    if (!inProgress) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [inProgress]);

  const clock = now + offsetMs;
  const current = session?.current ?? null;
  const overallLeft = session ? Date.parse(session.deadline_at) - clock : 0;
  const questionLeft =
    current?.question_deadline_at != null ? Date.parse(current.question_deadline_at) - clock : null;
  const warning =
    questionLeft !== null &&
    session !== null &&
    questionLeft > 0 &&
    questionLeft <= session.warning_seconds * 1000;

  function speakCurrent(text: string) {
    speak(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: (code) => {
        setSpeaking(false);
        // Cancelling speech on purpose also reports an error; only real failures are shown.
        if (code !== "canceled" && code !== "interrupted") setNotice({ kind: "error", text: NO_AUDIO_TEXT });
      },
    });
  }

  // Each new question is spoken once, unless the candidate has muted audio.
  const currentKey = session && current ? questionKey(session, current) : null;
  useEffect(() => {
    if (!currentKey || !current || !ttsAvailable || muted) return;
    speakCurrent(current.text);
    // Only a new question starts speech; the mute setting is read as it was then.
  }, [currentKey]);

  function replayQuestion() {
    if (current) speakCurrent(current.text);
  }

  function toggleMute() {
    if (!muted) {
      stopSpeaking();
      setSpeaking(false);
    }
    setMuted(!muted);
  }

  function toggleRecording() {
    if (stopRecording.current) {
      stopRecording.current();
      return;
    }
    let heard = false;
    let failed = false;
    const stop = startListening({
      onText: (text) => {
        if (!text) return;
        heard = true;
        setDraft((draft) => (draft.trim() ? `${draft.trimEnd()} ${text}` : text));
      },
      onError: (message) => {
        failed = true;
        if (message) setNotice({ kind: "error", text: message });
      },
      onEnd: () => {
        stopRecording.current = null;
        setRecording(false);
        if (!heard && !failed) setNotice({ kind: "error", text: NO_SPEECH_TEXT });
      },
    });
    if (!stop) {
      setNotice({ kind: "error", text: "Voice input is not available in this browser. Type your answer below." });
      return;
    }
    setNotice(null);
    stopRecording.current = stop;
    setRecording(true);
  }

  async function sendAnswer(text: string, action: "submit" | "end") {
    if (!session) return;
    stopRecording.current?.();
    stopSpeaking();
    setBusy(true);
    setNotice(null);
    try {
      const result =
        action === "submit"
          ? await submitAnswer(session.id, text)
          : await endInterview(session.id, text);
      show(result);
      setDraft("");
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  // Time is up for the question or the whole interview: send what has been typed, once.
  useEffect(() => {
    if (!session || !inProgress || !current || busy) return;
    const timeUp = overallLeft <= 0 || (questionLeft !== null && questionLeft <= 0);
    if (!timeUp) return;
    const key = `${session.id}:${current.kind}:${current.main_number}:${current.text}`;
    if (sentFor.current === key) return;
    sentFor.current = key;
    void sendAnswer(draft, "submit");
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await sendAnswer(draft, "submit");
  }

  async function onEnd() {
    if (!window.confirm("End the interview now? The answers you have given are saved.")) return;
    await sendAnswer(draft, "end");
  }

  async function onStart() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await startInterview();
      sentFor.current = null;
      setDraft("");
      show(result);
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading your interview…</p>;

  if (!session || !inProgress) {
    return (
      <section className="card">
        <h1>Interview room</h1>
        {session && <p className="hint">{ENDED_TEXT[session.status] ?? "This interview has ended."}</p>}
        {session?.status === "completed" && (
          <p className="hint">
            <Link to={`/interview/report/${session.id}`}>View your report</Link>
          </p>
        )}
        {notice && <Message notice={notice} />}
        <p className="hint">
          Your interview uses the role, type, difficulty and duration you set up.{" "}
          <Link to="/interview">Check your interview setup</Link>.
        </p>
        <div className="actions">
          <button type="button" onClick={onStart} disabled={busy}>
            {busy ? "Starting…" : "Start interview"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card interview-room">
      <h1>Interview room</h1>
      <p className="hint">
        {session.role} · {session.interview_type} · {session.difficulty}
      </p>

      <dl className="room-timers">
        <dt>Time left</dt>
        <dd className="timer" aria-live="off">
          {formatTime(overallLeft)}
        </dd>
      </dl>

      {notice && <Message notice={notice} />}

      <InterviewAvatar state={recording ? "listening" : speaking ? "speaking" : "idle"} />

      {current && (
        <article className="question" aria-live="polite">
          <p className="hint">
            Question {session.main_number} of {session.plan_size}
            {current.kind === "follow_up" ? " · follow-up" : ""}
          </p>
          {current.kind === "main" && questionLeft !== null ? (
            <p className={warning ? "error" : "hint"}>
              Time for this question: {formatTime(questionLeft)}
              {warning ? " · 1 minute left" : ""}
            </p>
          ) : (
            <p className="hint">Follow-up: uses the time left in the interview.</p>
          )}
          <p className="question-text">{current.text}</p>
          <div className="audio-controls">
            <button type="button" className="secondary" onClick={replayQuestion} disabled={!ttsAvailable}>
              Replay question
            </button>
            <button
              type="button"
              className="secondary"
              onClick={toggleMute}
              disabled={!ttsAvailable}
              aria-pressed={muted}
            >
              {muted ? "Unmute audio" : "Mute audio"}
            </button>
          </div>
          {!ttsAvailable && <p className="hint">{NO_AUDIO_TEXT}</p>}
        </article>
      )}

      <form onSubmit={onSubmit} noValidate>
        {sttAvailable ? (
          <div className="actions">
            <button type="button" className="secondary" onClick={toggleRecording} disabled={busy} aria-pressed={recording}>
              {recording ? "Stop recording" : "Record answer"}
            </button>
          </div>
        ) : (
          <p className="hint">Voice input is not available in this browser. Type your answer below.</p>
        )}
        <label>
          Your answer
          <textarea
            className="answer-box"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            maxLength={4000}
            disabled={busy}
          />
        </label>
        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Submit answer"}
          </button>
          <button type="button" className="secondary" onClick={onEnd} disabled={busy}>
            End interview
          </button>
        </div>
      </form>

      <p className="hint">Status: in progress</p>
    </section>
  );
}

function Message({ notice }: { notice: Notice }) {
  return (
    <p className={notice.kind === "ok" ? "ok" : "error"} role={notice.kind === "error" ? "alert" : "status"}>
      {notice.text}
    </p>
  );
}
