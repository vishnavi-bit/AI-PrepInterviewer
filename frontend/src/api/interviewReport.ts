import { api } from "./client";

export type ReportCategory = {
  name: string;
  /** 0 to 100. */
  score: number;
  /** The percentage weight of this category in the overall score for the interview type. */
  weight: number;
};

export type InterviewReport = {
  session_id: string;
  interview_type: string;
  /** Out of 100, a weighted average of the category scores. */
  overall_score: number;
  categories: ReportCategory[];
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  /** Shown with every report: the scores are AI-generated practice estimates. */
  disclaimer: string;
  created_at: string;
};

/** The saved report for a completed interview. Rejects with 404 while none has been saved. */
export function getReport(sessionId: string) {
  return api<InterviewReport>(`/api/interview-sessions/${sessionId}/report`);
}

/** Creates the report when it is missing, for example after an AI failure. */
export function createReport(sessionId: string) {
  return api<InterviewReport>(`/api/interview-sessions/${sessionId}/report`, { method: "POST" });
}
