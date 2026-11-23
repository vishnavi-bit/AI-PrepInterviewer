import { api } from "./client";

export type DashboardInterview = {
  session_id: string;
  role: string;
  interview_type: string;
  started_at: string;
  /** Out of 100 from the saved report; null while the interview has no saved report. */
  overall_score: number | null;
};

export type DashboardTrend = {
  /** Points: the most recent saved score minus the one before it. */
  change: number;
  direction: "improved" | "declined" | "no_change";
};

export type DashboardRole = {
  role: string;
  interviews: number;
  average_score: number;
};

export type DashboardWeakTopic = {
  name: string;
  average_score: number;
};

export type Dashboard = {
  has_history: boolean;
  completed_count: number;
  most_recent_score: number | null;
  /** Shown only with at least two saved reports; otherwise null. */
  average_score: number | null;
  trend: DashboardTrend | null;
  recent: DashboardInterview[];
  role_performance: DashboardRole[];
  weak_topics: DashboardWeakTopic[];
  suggested_practice: string[];
};

/** The signed-in candidate's own dashboard. */
export function getDashboard() {
  return api<Dashboard>("/api/dashboard");
}
