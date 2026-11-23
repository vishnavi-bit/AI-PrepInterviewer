import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  DIFFICULTIES,
  INTERVIEW_TYPES,
  getInterviewConfiguration,
  saveInterviewConfiguration,
  type Difficulty,
  type InterviewConfiguration,
  type InterviewType,
} from "../api/interviewConfiguration";

type Notice = { kind: "ok" | "error"; text: string };

const LOAD_FAILED = "Something went wrong. Please try again.";

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : LOAD_FAILED;
}

export function InterviewConfigurationPage() {
  const [config, setConfig] = useState<InterviewConfiguration | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewType>("Technical");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    getInterviewConfiguration()
      .then((result) => {
        setConfig(result);
        if (result.settings) {
          setInterviewType(result.settings.interview_type);
          setDifficulty(result.settings.difficulty);
          setDuration(result.settings.duration_minutes);
        } else {
          setDuration(result.duration_options[0] ?? null);
        }
      })
      .catch((err) => setNotice({ kind: "error", text: errorText(err) }))
      .finally(() => setLoading(false));
  }, []);

  async function onStart(event: FormEvent) {
    event.preventDefault();
    if (duration === null) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await saveInterviewConfiguration({
        interview_type: interviewType,
        difficulty,
        duration_minutes: duration,
      });
      setConfig(result);
      setNotice({ kind: "ok", text: "Saved. Your interview will use these settings." });
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading your interview setup…</p>;

  if (!config) {
    return (
      <section className="card">
        <h1>Interview setup</h1>
        {notice && <Message notice={notice} />}
      </section>
    );
  }

  if (!config.role) {
    return (
      <section className="card">
        <h1>Interview setup</h1>
        <p className="hint">
          Choose a role first. <Link to="/roles">Pick one of your suggested roles</Link>, then come back here.
        </p>
      </section>
    );
  }

  const noDurations = config.duration_options.length === 0;

  return (
    <section className="card">
      <h1>Interview setup</h1>
      <p className="hint">
        Role: <strong>{config.role}</strong>. Choose the type, difficulty and duration, then review them before you start.
      </p>

      {notice && <Message notice={notice} />}

      <form onSubmit={onStart} noValidate>
        <fieldset className="role-options" disabled={busy}>
          <legend>Interview type</legend>
          {INTERVIEW_TYPES.map((type) => (
            <label key={type} className="role-option">
              <input
                type="radio"
                name="interview-type"
                value={type}
                checked={interviewType === type}
                onChange={() => setInterviewType(type)}
              />
              <span>{type}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="role-options" disabled={busy}>
          <legend>Difficulty</legend>
          {DIFFICULTIES.map((level) => (
            <label key={level} className="role-option">
              <input
                type="radio"
                name="difficulty"
                value={level}
                checked={difficulty === level}
                onChange={() => setDifficulty(level)}
              />
              <span>{level}</span>
            </label>
          ))}
        </fieldset>

        <label>
          Duration
          <select
            value={duration ?? ""}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={busy || noDurations}
          >
            {config.duration_options.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
          {noDurations && <span className="hint">No durations are set up yet.</span>}
        </label>

        <section className="review" aria-label="Review your interview">
          <h2>Review</h2>
          <dl>
            <dt>Role</dt>
            <dd>{config.role}</dd>
            <dt>Interview type</dt>
            <dd>{interviewType}</dd>
            <dt>Difficulty</dt>
            <dd>{difficulty}</dd>
            <dt>Duration</dt>
            <dd>{duration === null ? "Not chosen" : `${duration} minutes`}</dd>
          </dl>
        </section>

        <div className="actions">
          <button type="submit" disabled={busy || duration === null}>
            {busy ? "Saving…" : "Start interview"}
          </button>
        </div>
      </form>
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
