// Response shapes returned by the API (apps/api/src/routes).
export interface User { id: string; name: string; email: string; createdAt: string }

export interface ResumeInfo { filename: string; mimeType: string; sizeBytes: number; uploadedAt: string; updatedAt: string; extractedText: string }

export interface ResumeAnalysisData {
  skills: string[];
  technologies: string[];
  education: string[];
  projects: { name: string; description: string }[];
  experience: string[];
  certifications: string[];
}
export interface AnalysisState { analysis: ResumeAnalysisData; confirmed: boolean; updatedAt: string }

export interface RoleRec { title: string; reason: string }
export interface RolesState { status: 'needs-analysis' | 'needs-confirmation' | 'ready' | 'no-matches'; roles: RoleRec[]; selectedRole: string | null }

export interface InterviewOptions { types: string[]; difficulties: string[]; durations: number[]; mainQuestions: number }
export interface TranscriptItem { questionId: string; question: string; answer: string; source: 'voice' | 'text'; kind: 'main' | 'followup' }
export interface SessionView {
  id: string;
  role: string;
  interviewType: string;
  difficulty: string;
  durationMinutes: number;
  status: 'in_progress' | 'completed' | 'ended_early' | 'time_up';
  startedAt: string;
  endsAt: string;
  endedAt: string | null;
  remainingSeconds: number;
  progress: { answered: number; mainTotal: number };
  currentQuestion: { id: string; text: string; kind: 'main' | 'followup' } | null;
  transcript: TranscriptItem[];
}

export interface SessionSummary { id: string; role: string; interviewType: string; difficulty: string; durationMinutes: number; status: string; createdAt: string; score: number | null }

export interface Report {
  session: { id: string; role: string; interviewType: string; difficulty: string; durationMinutes: number; status: string; endedAt: string | null };
  overallScore: number;
  categories: { name: string; score: number }[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  questionFeedback: { question: string; feedback: string; score: number }[];
  disclaimer: string;
  createdAt: string;
}

export interface Dashboard {
  totalCompleted: number;
  latestScore: number | null;
  averageScore: number | null;
  recent: { id: string; role: string; interviewType: string; score: number; createdAt: string }[];
  roles: { role: string; interviews: number; averageScore: number }[];
  weakTopics: { name: string; score: number }[];
  progress: { date: string; score: number }[];
  suggestions: string[];
}

export interface Profile extends User {}
