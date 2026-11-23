import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { createReport, getReport, type InterviewReport } from "../api/interviewReport";

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}

export function InterviewReportPage() {
  const { sessionId = "" } = useParams();
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [sessionId]);

  async function load() {
    setLoading(true);
    setNotice(null);
    try {
      setReport(await getReport(sessionId));
      setMissing(false);
    } catch (err) {
      setMissing(err instanceof ApiError && err.status === 404);
      setNotice(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    setBusy(true);
    setNotice(null);
    try {
      setReport(await createReport(sessionId));
      setMissing(false);
    } catch (err) {
      setNotice(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading your report…</p>;

  if (!report) {
    return (
      <section className="card">
        <h1>Interview report</h1>
        {notice && <p className="error" role="alert">{notice}</p>}
        <div className="actions">
          {missing && (
            <button type="button" onClick={onCreate} disabled={busy}>
              {busy ? "Creating report…" : "Create report"}
            </button>
          )}
          <button type="button" className="secondary" onClick={load} disabled={busy}>
            Check again
          </button>
        </div>
        <p className="hint">
          <Link to="/interview/room">Back to the interview room</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="card report">
      <h1>Interview report</h1>
      <p className="hint">{report.disclaimer}</p>

      <div className="report-overall">
        <span className="report-overall-score">{report.overall_score}</span>
        <span className="muted"> / 100 overall ({report.interview_type} interview)</span>
      </div>

      <h2>Category scores</h2>
      <ul className="report-categories">
        {report.categories.map((category) => (
          <li key={category.name}>
            <div className="report-category-head">
              <span>{category.name}</span>
              <span className="muted">
                {category.score} / 100 · weight {category.weight}%
              </span>
            </div>
            <div
              className="report-bar"
              role="meter"
              aria-label={category.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={category.score}
            >
              <span style={{ width: `${category.score}%` }} />
            </div>
          </li>
        ))}
      </ul>

      <h2>Strengths</h2>
      <ul>
        {report.strengths.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <h2>Areas to improve</h2>
      <ul>
        {report.improvements.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <h2>Suggestions for future practice</h2>
      <ul>
        {report.suggestions.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <p className="hint">
        <Link to="/interview/room">Back to the interview room</Link>
      </p>
    </section>
  );
}
