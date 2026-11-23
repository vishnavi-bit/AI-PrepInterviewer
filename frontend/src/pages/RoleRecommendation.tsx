import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRoleRecommendations, selectRole, type RoleRecommendations } from "../api/roleRecommendation";
import { ApiError } from "../api/client";

type Notice = { kind: "ok" | "error"; text: string };

const LOAD_FAILED = "Something went wrong. Please try again.";

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : LOAD_FAILED;
}

export function RoleRecommendation() {
  const [data, setData] = useState<RoleRecommendations | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    getRoleRecommendations()
      .then((result) => {
        setData(result);
        const index = result.roles.findIndex((role) => role.name === result.selected_role);
        setChosen(index >= 0 ? result.roles[index].position : null);
      })
      .catch((err) => setNotice({ kind: "error", text: errorText(err) }))
      .finally(() => setLoading(false));
  }, []);

  async function onChoose() {
    if (chosen === null) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await selectRole(chosen);
      setData(result);
      setNotice({ kind: "ok", text: `Saved: ${result.selected_role}.` });
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading suggested roles…</p>;

  return (
    <section className="card">
      <h1>Suggested roles for your resume</h1>
      <p className="hint">Pick the role you want to practise. You do not have to take the first suggestion.</p>

      {notice && <Message notice={notice} />}

      {data && data.roles.length > 0 && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void onChoose();
          }}
        >
          <fieldset className="role-options" disabled={busy}>
            <legend className="sr-only">Suggested roles</legend>
            {data.roles.map((role) => (
              <label key={role.position} className="role-option">
                <input
                  type="radio"
                  name="role"
                  value={role.position}
                  checked={chosen === role.position}
                  onChange={() => setChosen(role.position)}
                />
                <span>
                  <strong>{role.name}</strong>
                  <span className="role-reason">
                    <span className="analysis-label">Why: </span>
                    {role.reason}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="actions">
            <button type="submit" disabled={busy || chosen === null}>
              {busy ? "Saving…" : "Choose this role"}
            </button>
          </div>
        </form>
      )}

      {!data && (
        <p className="hint">
          <Link to="/resume">Go to your resume</Link> to upload it and run the analysis first.
        </p>
      )}
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
