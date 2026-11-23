import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAnalysis,
  runAnalysis,
  saveCorrections,
  type Analysis,
  type AnalysisResult,
  type Entry,
} from "../api/resumeAnalysis";
import { ApiError } from "../api/client";

const TEXT_CATEGORIES = [
  { key: "skills", label: "Skills" },
  { key: "certifications", label: "Certifications" },
  { key: "technologies", label: "Technologies" },
] as const;

const ENTRY_CATEGORIES = [
  { key: "education", label: "Education", fields: ["institution", "degree", "year", "score"] },
  { key: "projects", label: "Projects", fields: ["name", "description", "technologies"] },
  { key: "experience", label: "Experience", fields: ["title", "organization", "period", "description"] },
  { key: "internships", label: "Internships", fields: ["title", "organization", "period", "description"] },
] as const;

type TextKey = (typeof TEXT_CATEGORIES)[number]["key"];
type EntryKey = (typeof ENTRY_CATEGORIES)[number]["key"];
type Row = Record<string, string>;

/** The form works on raw text, so typing (including Enter in a list) is never rewritten under the cursor. */
type Draft = {
  text: Record<TextKey, string>;
  entries: Record<EntryKey, Row[]>;
};

type Notice = { kind: "ok" | "error"; text: string };

const SAVE_FAILED = "Something went wrong. Please try again.";

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : SAVE_FAILED;
}

function joinValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join(", ") : (value ?? "");
}

function toDraft(analysis: Analysis): Draft {
  const text: Record<string, string> = {};
  for (const { key } of TEXT_CATEGORIES) text[key] = analysis[key].join("\n");

  const entries: Record<string, Row[]> = {};
  for (const { key, fields } of ENTRY_CATEGORIES) {
    entries[key] = (analysis[key] as Entry[]).map((entry) =>
      Object.fromEntries(fields.map((field) => [field, joinValue(entry[field])])),
    );
  }
  return { text, entries } as Draft;
}

function fromDraft(draft: Draft): Analysis {
  const result: Record<string, unknown> = {};
  for (const { key } of TEXT_CATEGORIES) {
    result[key] = draft.text[key].split("\n").map((line) => line.trim()).filter(Boolean);
  }
  for (const { key, fields } of ENTRY_CATEGORIES) {
    result[key] = draft.entries[key]
      .map((row) => {
        const entry: Entry = {};
        for (const field of fields) {
          const value = (row[field] ?? "").trim();
          entry[field] = field === "technologies" ? value.split(",").map((t) => t.trim()).filter(Boolean) : value;
        }
        return entry;
      })
      .filter((entry) => entry[fields[0]] !== "");  // an entry without its main field is dropped, as on the server
  }
  return result as unknown as Analysis;
}

export function ResumeAnalysis() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    getAnalysis()
      .then(setResult)
      .catch((err) => setNotice({ kind: "error", text: errorText(err) }))
      .finally(() => setLoading(false));
  }, []);

  async function onAnalyze() {
    setBusy(true);
    setNotice(null);
    try {
      setResult(await runAnalysis());
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  function onEdit() {
    if (!result) return;
    setDraft(toDraft(result.corrections ?? result.ai_output));
    setEditing(true);
    setNotice(null);
  }

  function onCancel() {
    setEditing(false);
    setDraft(null);
    setNotice(null);
  }

  async function onConfirm() {
    if (!draft) return;
    setBusy(true);
    setNotice(null);
    try {
      setResult(await saveCorrections(fromDraft(draft)));
      setEditing(false);
      setDraft(null);
      setNotice({ kind: "ok", text: "Your corrections are saved." });
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  function setText(key: TextKey, value: string) {
    setDraft((d) => (d ? { ...d, text: { ...d.text, [key]: value } } : d));
  }

  function setField(key: EntryKey, index: number, field: string, value: string) {
    setDraft((d) => {
      if (!d) return d;
      const rows = d.entries[key].map((row, i) => (i === index ? { ...row, [field]: value } : row));
      return { ...d, entries: { ...d.entries, [key]: rows } };
    });
  }

  function addRow(key: EntryKey) {
    const fields = ENTRY_CATEGORIES.find((c) => c.key === key)?.fields ?? [];
    const blank = Object.fromEntries(fields.map((field) => [field, ""]));
    setDraft((d) => (d ? { ...d, entries: { ...d.entries, [key]: [...d.entries[key], blank] } } : d));
  }

  function removeRow(key: EntryKey, index: number) {
    setDraft((d) => (d ? { ...d, entries: { ...d.entries, [key]: d.entries[key].filter((_, i) => i !== index) } } : d));
  }

  if (loading) return <p className="muted">Loading analysis…</p>;

  return (
    <section className="card">
      <h2>Resume analysis</h2>
      <p className="hint">
        The analysis lists only what your resume says. Review it and correct anything that is wrong or missing.
      </p>

      {notice && <Message notice={notice} />}

      {!result && (
        <div className="actions">
          <button type="button" disabled={busy} onClick={() => void onAnalyze()}>
            {busy ? "Analyzing…" : "Analyze resume"}
          </button>
        </div>
      )}

      {result && !editing && (
        <>
          {result.corrected && <p className="hint">Corrected by you.</p>}
          <AnalysisView analysis={result.corrections ?? result.ai_output} />
          <div className="actions">
            <button type="button" onClick={onEdit} disabled={busy}>
              Edit
            </button>
          </div>
          <p className="hint">
            Analysis complete. <Link to="/roles">See suggested job roles for your resume</Link>.
          </p>
        </>
      )}

      {result && editing && draft && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void onConfirm();
          }}
        >
          {TEXT_CATEGORIES.map(({ key, label }) => (
            <label key={key} className="analysis-field">
              <span>
                {label} <span className="hint">(one per line)</span>
              </span>
              <textarea rows={4} value={draft.text[key]} disabled={busy} onChange={(e) => setText(key, e.target.value)} />
            </label>
          ))}

          {ENTRY_CATEGORIES.map(({ key, label, fields }) => (
            <fieldset key={key} className="analysis-group">
              <legend>{label}</legend>
              {draft.entries[key].map((row, index) => (
                <div key={index} className="analysis-entry">
                  {fields.map((field) => (
                    <label key={field} className="analysis-field">
                      <span>
                        {capitalise(field)}
                        {field === "technologies" && <span className="hint"> (comma separated)</span>}
                      </span>
                      <input
                        value={row[field] ?? ""}
                        disabled={busy}
                        onChange={(e) => setField(key, index, field, e.target.value)}
                      />
                    </label>
                  ))}
                  <button type="button" className="secondary" disabled={busy} onClick={() => removeRow(key, index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="secondary" disabled={busy} onClick={() => addRow(key)}>
                Add {label.toLowerCase().replace(/s$/, "")}
              </button>
            </fieldset>
          ))}

          <div className="actions">
            <button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Confirm"}
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function AnalysisView({ analysis }: { analysis: Analysis }) {
  return (
    <div className="analysis-view">
      {TEXT_CATEGORIES.map(({ key, label }) => (
        <div key={key} className="analysis-group">
          <h3>{label}</h3>
          {analysis[key].length === 0 ? (
            <p className="muted">None found in your resume.</p>
          ) : (
            <ul className="analysis-tags">
              {analysis[key].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {ENTRY_CATEGORIES.map(({ key, label, fields }) => (
        <div key={key} className="analysis-group">
          <h3>{label}</h3>
          {analysis[key].length === 0 ? (
            <p className="muted">None found in your resume.</p>
          ) : (
            <ul className="analysis-entries">
              {(analysis[key] as Entry[]).map((entry, index) => (
                <li key={index}>
                  <strong>{joinValue(entry[fields[0]])}</strong>
                  {fields.slice(1).map((field) => {
                    const value = joinValue(entry[field]);
                    return value ? (
                      <div key={field} className="analysis-detail">
                        <span className="analysis-label">{capitalise(field)}: </span>
                        {value}
                      </div>
                    ) : null;
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Message({ notice }: { notice: Notice }) {
  return (
    <p className={notice.kind === "ok" ? "ok" : "error"} role={notice.kind === "error" ? "alert" : "status"}>
      {notice.text}
    </p>
  );
}
