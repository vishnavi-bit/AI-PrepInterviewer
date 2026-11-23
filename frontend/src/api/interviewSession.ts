import { api } from "./client";

export type SessionStatus = "in_progress" | "completed" | "interrupted" | "ended_early";

export type InterviewQuestion = {
  kind: "main" | "follow_up";
  /** The main question this question belongs to (a follow-up belongs to the main question before it). */
  main_number: number;
  text: string;
  /** The countdown for a main question; null for a follow-up, which uses the remaining interview time. */
  question_deadline_at: string | null;
  follow_ups_used: number;
};

export type InterviewSession = {
  id: string;
  status: SessionStatus;
  role: string;
  interview_type: string;
  difficulty: string;
  duration_minutes: number;
  started_at: string;
  /** The overall limit: the interview ends here whatever the state of the current question. */
  deadline_at: string;
  ended_at: string | null;
  /** The server's clock, used to keep the countdowns right when the device clock is off. */
  server_now: string;
  plan_size: number;
  main_number: number;
  warning_seconds: number;
  /** The question waiting for an answer, or null once the interview has ended. */
  current: InterviewQuestion | null;
};

/** The candidate's most recent interview, or null when none has been started yet. */
export function getCurrentInterview() {
  return api<InterviewSession | null>("/api/interview-sessions/current");
}

/** Starts an interview from the saved role, setup and resume. */
export function startInterview() {
  return api<InterviewSession>("/api/interview-sessions", { method: "POST" });
}

/** Sends the answer to the open question. An empty answer is saved as unanswered. */
export function submitAnswer(sessionId: string, answer: string) {
  return api<InterviewSession>(`/api/interview-sessions/${sessionId}/answers`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

/** Ends the interview now; the text in the answer box is saved first. */
export function endInterview(sessionId: string, answer: string) {
  return api<InterviewSession>(`/api/interview-sessions/${sessionId}/end`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}
