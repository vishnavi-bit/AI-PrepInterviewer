import { api } from "./client";

export const INTERVIEW_TYPES = ["Technical", "HR", "Behavioral", "Project-based"] as const;
export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];

export type InterviewSettings = {
  interview_type: InterviewType;
  difficulty: Difficulty;
  duration_minutes: number;
};

export type InterviewConfiguration = {
  /** The role chosen on the job roles page, or null when none is chosen yet. */
  role: string | null;
  /** Durations the candidate can choose from, in minutes. Empty when none are set up. */
  duration_options: number[];
  /** The saved choice, or null when the candidate has not saved one yet. */
  settings: InterviewSettings | null;
};

export function getInterviewConfiguration() {
  return api<InterviewConfiguration>("/api/interview-configuration");
}

/** Saves the reviewed configuration; the interview session reads it when it starts. */
export function saveInterviewConfiguration(settings: InterviewSettings) {
  return api<InterviewConfiguration>("/api/interview-configuration", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
