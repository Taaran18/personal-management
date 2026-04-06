import { api } from "./api";

// ─── Constants ────────────────────────────────────────────────────────────────

export const JOB_STAGES = [
  "Applied", "Screening",
  "Interview Round 1", "Interview Round 2", "Interview Round 3",
  "Interview Round 4", "Interview Round 5", "Interview Round 6",
  "Offer Received", "Offer Accepted", "Offer Declined",
  "Rejected", "Withdrawn", "Ghosted",
] as const;
export type JobStage = typeof JOB_STAGES[number];

export const JOB_SOURCES   = ["LinkedIn", "Company Site", "Referral", "Job Board", "Cold Outreach", "Indeed", "Naukri", "Other"] as const;
export const JOB_TYPES     = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"] as const;
export const WORK_MODES    = ["Remote", "Hybrid", "On-site"] as const;
export const INTERVIEW_TYPES    = ["Phone", "Video", "In-person", "Technical", "Take-home", "HR", "Final"] as const;
export const INTERVIEW_OUTCOMES = ["Pending", "Passed", "Failed"] as const;
export type JobSource     = typeof JOB_SOURCES[number];
export type InterviewType = typeof INTERVIEW_TYPES[number];

export const PIPELINE_GROUPS = ["Applied", "Screening", "Interviewing", "Offer", "Closed"] as const;
export type PipelineGroup = typeof PIPELINE_GROUPS[number];

// ─── Core Types ───────────────────────────────────────────────────────────────

export interface JobApplication {
  id: string;
  company_name: string;
  job_title: string;
  job_url?: string;
  source: JobSource;
  current_status: JobStage;
  application_date: string;
  last_updated_date: string;
  interview_rounds_done: number;
  contact_name?: string;
  contact_email?: string;
  location?: string;
  job_type: string;
  work_mode: string;
  salary_expected?: number;
  salary_offered?: number;
  notes?: string;
  is_active: boolean;
  follow_up_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  // computed
  days_since_application?: number;
  days_since_last_update?: number;
  is_stale?: boolean;
  follow_up_urgency?: "overdue" | "today" | "soon" | "future" | null;
}

export interface StageLog {
  id: string;
  application_id: string;
  stage: JobStage;
  date_of_update: string;
  notes?: string;
  created_at: string;
  days_since_prev?: number;
}

export interface InterviewNote {
  id: string;
  application_id: string;
  interview_date?: string;
  interview_time?: string;
  interview_type: string;
  round_number: number;
  interviewer_name?: string;
  prep_notes?: string;
  questions_asked?: string;
  outcome: string;
  feedback?: string;
  created_at: string;
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface DashboardSummary {
  total: number; active: number;
  offers_received: number; offers_accepted: number;
  rejections: number; ghosted: number; withdrawn: number;
  offer_rate: number;
  avg_days_to_response: number | null;
  avg_interview_rounds: number | null;
}

export interface FollowUpReminder {
  id: string; company_name: string; job_title: string;
  current_status: JobStage; follow_up_date: string;
  days_delta: number; urgency: "overdue" | "today" | "soon";
}

export interface SourceBreakdown {
  source: string; total: number; interviews: number; offers: number;
  interview_rate: number; offer_rate: number;
}

export interface PipelineFunnel {
  Applied: number; Screening: number; Interviewing: number; Offer: number; Accepted: number;
}

export interface StaleApplication {
  id: string; company_name: string; job_title: string;
  current_status: JobStage; days_since_last_update: number;
}

export interface MonthlyTrendPoint { month: string; key: string; count: number; }

export interface JobDashboard {
  summary: DashboardSummary;
  status_breakdown: Record<string, number>;
  source_breakdown: SourceBreakdown[];
  pipeline_funnel: PipelineFunnel;
  stale_applications: StaleApplication[];
  follow_up_reminders: FollowUpReminder[];
  recent_applications: JobApplication[];
  monthly_trend: MonthlyTrendPoint[];
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface StageTimeRow { stage: string; avg_days: number; count: number; }
export interface DayOfWeekRow { day: string; short: string; total: number; responses: number; response_rate: number; }
export interface JobAnalytics { stage_times: StageTimeRow[]; day_of_week: DayOfWeekRow[]; has_data: boolean; }

// ─── Offers Types ─────────────────────────────────────────────────────────────

export interface OffersSummary { total: number; accepted: number; declined: number; pending: number; avg_salary_offered: number | null; }
export interface OffersData { data: JobApplication[]; count: number; summary: OffersSummary; }

// ─── Status / Source color helpers ───────────────────────────────────────────

export function statusColor(status: JobStage): string {
  if (status === "Offer Accepted")   return "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400";
  if (status === "Offer Received")   return "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400";
  if (status === "Offer Declined")   return "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400";
  if (status.startsWith("Interview")) return "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400";
  if (status === "Screening")        return "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400";
  if (status === "Applied")          return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
  if (status === "Rejected")         return "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400";
  if (status === "Ghosted")          return "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400";
  if (status === "Withdrawn")        return "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
  return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
}

export function statusBarColor(status: JobStage): string {
  if (status === "Offer Accepted")    return "#10b981";
  if (status === "Offer Received")    return "#22c55e";
  if (status === "Offer Declined")    return "#f97316";
  if (status.startsWith("Interview")) return "#3b82f6";
  if (status === "Screening")         return "#6366f1";
  if (status === "Applied")           return "#6b7280";
  if (status === "Rejected")          return "#ef4444";
  if (status === "Ghosted")           return "#eab308";
  if (status === "Withdrawn")         return "#9ca3af";
  return "#6b7280";
}

export function sourceColor(source: string): string {
  const map: Record<string, string> = {
    LinkedIn:        "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
    "Company Site":  "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
    Referral:        "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    "Job Board":     "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    "Cold Outreach": "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
    Indeed:          "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300",
    Naukri:          "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
    Other:           "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  };
  return map[source] ?? map.Other;
}

export function outcomeColor(outcome: string): string {
  if (outcome === "Passed") return "text-emerald-500";
  if (outcome === "Failed") return "text-red-500";
  return "text-gray-400";
}

export function tagColor(tag: string): string {
  const colors = [
    "bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300",
    "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
    "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300",
    "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    "bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300",
    "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash + tag.charCodeAt(i)) % colors.length;
  return colors[hash];
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const jobsApi = {
  // Applications
  getApplications: (params?: { status?: string; source?: string; tag?: string; from_date?: string; to_date?: string; active_only?: boolean }) =>
    api.get<{ data: JobApplication[]; count: number }>("/jobs/applications", { params }),

  createApplication: (body: Partial<JobApplication>) =>
    api.post<JobApplication>("/jobs/applications", body),

  updateApplication: (id: string, body: Partial<JobApplication>) =>
    api.put<JobApplication>(`/jobs/applications/${id}`, body),

  deleteApplication: (id: string) =>
    api.delete(`/jobs/applications/${id}`),

  // Stage logs
  getStageLogs: (appId: string) =>
    api.get<{ data: StageLog[]; count: number }>(`/jobs/applications/${appId}/logs`),

  addStageLog: (body: { application_id: string; stage: string; date_of_update: string; notes?: string }) =>
    api.post<StageLog>("/jobs/stage-logs", body),

  // Interview notes
  getInterviews: (appId: string) =>
    api.get<{ data: InterviewNote[]; count: number }>(`/jobs/applications/${appId}/interviews`),

  createInterview: (body: Partial<InterviewNote>) =>
    api.post<InterviewNote>("/jobs/interviews", body),

  updateInterview: (id: string, body: Partial<InterviewNote>) =>
    api.put<InterviewNote>(`/jobs/interviews/${id}`, body),

  deleteInterview: (id: string) =>
    api.delete(`/jobs/interviews/${id}`),

  // Views
  getDashboard: () =>
    api.get<JobDashboard>("/jobs/dashboard"),

  getPipeline: () =>
    api.get<{ groups: Record<string, JobApplication[]>; total: number }>("/jobs/pipeline"),

  getOffers: () =>
    api.get<OffersData>("/jobs/offers"),

  getTimeline: (activeOnly = true) =>
    api.get<{ data: (JobApplication & { stage_logs: StageLog[] })[]; count: number }>("/jobs/timeline", { params: { active_only: activeOnly } }),

  getAnalytics: () =>
    api.get<JobAnalytics>("/jobs/analytics"),

  getMeta: () =>
    api.get<{ stages: string[]; sources: string[]; job_types: string[]; work_modes: string[]; interview_types: string[]; interview_outcomes: string[] }>("/jobs/meta"),
};
