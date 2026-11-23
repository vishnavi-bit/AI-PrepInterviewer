import { ApiError, api } from "./client";

/** One entry of an object list. Values are text, except `technologies`, which is a list. */
export type Entry = Record<string, string | string[]>;

export type Analysis = {
  skills: string[];
  certifications: string[];
  technologies: string[];
  education: Entry[];
  projects: Entry[];
  experience: Entry[];
  internships: Entry[];
};

export type AnalysisResult = {
  ai_output: Analysis;
  corrections: Analysis | null;
  corrected: boolean;
};

/** Resolves to null when there is no analysis for the current resume (the server answers 404). */
export async function getAnalysis(): Promise<AnalysisResult | null> {
  try {
    return await api<AnalysisResult>("/api/resume/analysis");
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function runAnalysis() {
  return api<AnalysisResult>("/api/resume/analysis", { method: "POST" });
}

/** Saves the candidate's corrected version. The AI output is kept unchanged on the server. */
export function saveCorrections(corrections: Analysis) {
  return api<AnalysisResult>("/api/resume/analysis/corrections", {
    method: "PUT",
    body: JSON.stringify(corrections),
  });
}
