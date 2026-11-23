import { useEffect, useState, type FormEvent } from "react";
import { deleteResume, getResume, uploadResume, type Resume } from "../api/resume";
import { ApiError } from "../api/client";
import { ResumeAnalysis } from "../components/ResumeAnalysis";

const MAX_BYTES = 5 * 1024 * 1024; // the API enforces the same limit; this only gives a quicker message
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

type Notice = { kind: "ok" | "error"; text: string };

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fileType(contentType: string): string {
  return contentType === "application/pdf" ? "PDF" : "DOCX";
}

export function Resume() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getResume()
      .then(setResume)
      .catch((err) => setNotice({ kind: "error", text: errorText(err) }))
      .finally(() => setLoading(false));
  }, []);

  function chooseFile(chosen: File | undefined) {
    setNotice(null);
    if (!chosen) {
      setFile(null);
      return;
    }
    const name = chosen.name.toLowerCase();
    if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setFile(null);
      setNotice({ kind: "error", text: "Choose a PDF or DOCX resume." });
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setFile(null);
      setNotice({ kind: "error", text: "The resume must be 5 MB or smaller." });
      return;
    }
    setFile(chosen);
  }

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    const replacing = resume !== null;
    setBusy(true);
    setNotice(null);
    try {
      setResume(await uploadResume(file));
      setFile(null);
      setNotice({ kind: "ok", text: replacing ? "Resume replaced." : "Resume uploaded." });
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    setNotice(null);
    try {
      await deleteResume();
      setResume(null);
      setNotice({ kind: "ok", text: "Resume deleted." });
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div className="stack">
      <section className="card">
        <h1>Resume</h1>
        <p className="hint">Upload one PDF or DOCX resume, up to 5 MB. A new upload replaces the current one.</p>

        {resume ? (
          <dl className="resume-meta">
            <dt>Current resume</dt>
            <dd>{resume.original_filename}</dd>
            <dt>Type</dt>
            <dd>{fileType(resume.content_type)}</dd>
            <dt>Size</dt>
            <dd>{formatSize(resume.size_bytes)}</dd>
            <dt>Uploaded</dt>
            <dd>{new Date(resume.uploaded_at).toLocaleString()}</dd>
          </dl>
        ) : (
          <p className="muted">No resume uploaded yet.</p>
        )}

        <form onSubmit={onUpload} noValidate>
          <label className="file-button">
            {file ? file.name : resume ? "Choose a new file" : "Choose file"}
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={busy}
              onChange={(e) => chooseFile(e.target.files?.[0])}
            />
          </label>
          {notice && <Message notice={notice} />}
          <div className="actions">
            <button type="submit" disabled={busy || !file}>
              {resume ? "Replace" : "Upload"}
            </button>
            {resume && (
              <button type="button" className="secondary" disabled={busy} onClick={() => void onDelete()}>
                Delete resume
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Keyed by upload time, so a replaced or new resume starts with its own analysis state. */}
      {resume && <ResumeAnalysis key={resume.uploaded_at} />}
    </div>
  );
}

function Message({ notice }: { notice: Notice }) {
  return (
    <p className={notice.kind === "ok" ? "ok" : "error"} role={notice.kind === "error" ? "alert" : "status"}>
      {notice.text}
    </p>
  );
}
