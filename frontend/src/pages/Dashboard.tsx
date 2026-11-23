import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { getDashboard, type Dashboard } from "../api/dashboard";
import { deleteInterview } from "../api/interviewSession";

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function trendText(trend: NonNullable<Dashboard["trend"]>): string {
  if (trend.direction === "no_change") return "No change since your previous interview.";
  const points = Math.abs(trend.change);
  return trend.direction === "improved"
    ? `Improved by ${points} points since your previous interview.`
    : `Down by ${points} points since your previous interview.`;
}

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setNotice(null);
    try {
      setData(await getDashboard());
    } catch (err) {
      setNotice(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(sessionId: string) {
    setDeleting(true);
    setNotice(null);
    try {
      await deleteInterview(sessionId, deletePassword);
      setDeleteFor(null);
      setDeletePassword("");
      await load();
    } catch (err) {
      setNotice(errorText(err));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="muted">Loading your dashboard…</p>;

  if (!data) {
    return (
      <section className="card">
        <h1>Dashboard</h1>
        {notice && <p className="error" role="alert">{notice}</p>}
        <div className="actions">
          <button type="button" className="secondary" onClick={load}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!data.has_history) {
    return (
      <section className="card dashboard">
        <h1>Dashboard</h1>
        <p>
          You have no completed interviews yet. Finish an interview and your scores, progress and past reports will
          appear here.
        </p>
        <p className="hint">
          <Link to="/interview">Set up an interview</Link>
        </p>
      </section>
    );
  }

  return (
    <div className="dashboard">
      {notice && <p className="error" role="alert">{notice}</p>}

      <section className="card">
        <h1>Dashboard</h1>
        <div className="dashboard-stats">
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{data.completed_count}</span>
            <span className="muted">Completed interviews</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{data.most_recent_score ?? "—"}</span>
            <span className="muted">Most recent score (out of 100)</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat-value">{data.average_score ?? "—"}</span>
            <span className="muted">
              {data.average_score === null ? "Average score (after 2 saved reports)" : "Average score (out of 100)"}
            </span>
          </div>
        </div>
        <p className="hint">Scores are AI-generated practice estimates, not guarantees of real hiring outcomes.</p>
        <p>
          {data.trend ? trendText(data.trend) : "Complete two interviews with saved reports to see your progress."}
        </p>
      </section>

      <section className="card">
        <h2>Recent interviews</h2>
        <ul className="dashboard-list">
          {data.recent.map((row) => (
            <li key={row.session_id}>
              <div>
                <strong>{row.role}</strong>{" "}
                <span className="muted">
                  · {row.interview_type} · {formatDate(row.started_at)}
                </span>
              </div>
              <div className="dashboard-list-end">
                <span>{row.overall_score === null ? "Report not ready" : `${row.overall_score} / 100`}</span>
                {row.overall_score !== null && (
                  <Link to={`/interview/report/${row.session_id}`}>Open report</Link>
                )}
                {deleteFor !== row.session_id && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={deleting}
                    onClick={() => {
                      setDeleteFor(row.session_id);
                      setDeletePassword("");
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              {deleteFor === row.session_id && (
                <form
                  className="dashboard-delete"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void onDelete(row.session_id);
                  }}
                  noValidate
                >
                  <p className="hint">
                    This removes the interview, its answers and its report permanently. Enter your current password to
                    confirm.
                  </p>
                  <label>
                    Current password
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={deletePassword}
                      disabled={deleting}
                      onChange={(event) => setDeletePassword(event.target.value)}
                    />
                  </label>
                  <div className="actions">
                    <button type="submit" disabled={deleting || deletePassword.length === 0}>
                      {deleting ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={deleting}
                      onClick={() => {
                        setDeleteFor(null);
                        setDeletePassword("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Role-wise performance</h2>
        {data.role_performance.length === 0 ? (
          <p className="muted">No saved reports yet.</p>
        ) : (
          <ul className="dashboard-list">
            {data.role_performance.map((row) => (
              <li key={row.role}>
                <span>{row.role}</span>
                <span className="muted">
                  {row.average_score} / 100 · {row.interviews} {row.interviews === 1 ? "interview" : "interviews"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Weak topics</h2>
        {data.weak_topics.length === 0 ? (
          <p className="muted">No weak topics: every topic averages 60 or more.</p>
        ) : (
          <ul className="dashboard-list">
            {data.weak_topics.map((topic) => (
              <li key={topic.name}>
                <span>{topic.name}</span>
                <span className="muted">{topic.average_score} / 100 average</span>
              </li>
            ))}
          </ul>
        )}
        {data.suggested_practice.length > 0 && (
          <>
            <h3>Suggested practice</h3>
            <ul>
              {data.suggested_practice.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
