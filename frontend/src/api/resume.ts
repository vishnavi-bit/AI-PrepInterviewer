import { ApiError, api } from "./client";

export type Resume = {
  original_filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
};

/** Resolves to null when the candidate has no resume (the server answers 404). */
export async function getResume(): Promise<Resume | null> {
  try {
    return await api<Resume>("/api/resume");
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Uploads a resume. If one already exists, the server replaces it. */
export function uploadResume(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api<Resume>("/api/resume", { method: "POST", body: form });
}

export function deleteResume() {
  return api<void>("/api/resume", { method: "DELETE" });
}
