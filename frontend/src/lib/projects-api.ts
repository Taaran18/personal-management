import { api } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────

export type ProjectType = "personal" | "freelance" | "office";
export type ProjectStatus = "active" | "on_hold" | "completed" | "cancelled";
export type ProjectPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority;
  tech_stack: string[];
  github_url?: string;
  live_url?: string;
  start_date?: string;
  deadline?: string;
  progress: number;
  client_name?: string;
  color: string;
  created_at: string;
  updated_at?: string;
}

export interface ProjectDetail extends Project {
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
  updates: ProjectUpdate[];
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  completed_at?: string;
  sort_order: number;
  created_at: string;
  project?: Pick<Project, "id" | "name" | "color" | "type">;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  content: string;
  created_at: string;
}

export interface StatsSummary {
  total: number;
  active: number;
  on_hold: number;
  completed: number;
  cancelled: number;
  by_type: Record<string, number>;
  total_tasks: number;
  done_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  overdue_projects: number;
  upcoming_deadlines: Project[];
  avg_progress: number;
}

// ─── Constants ────────────────────────────────────────────────────────────

export const PROJECT_COLORS = [
  "#f97316", "#6366f1", "#10b981", "#3b82f6", "#ec4899",
  "#8b5cf6", "#f59e0b", "#06b6d4", "#ef4444", "#84cc16",
];

export const TECH_OPTIONS = [
  "React", "Next.js", "Vue", "Angular", "Svelte",
  "TypeScript", "JavaScript", "Python", "Go", "Rust",
  "Node.js", "Express", "FastAPI", "Django", "Laravel",
  "PostgreSQL", "MySQL", "MongoDB", "Supabase", "Firebase",
  "TailwindCSS", "SCSS", "Docker", "AWS", "GCP", "Vercel",
  "Prisma", "GraphQL", "REST API", "WebSockets",
];

export const TYPE_COLORS: Record<ProjectType, { bg: string; text: string; dot: string }> = {
  personal: { bg: "bg-purple-100 dark:bg-purple-950/50", text: "text-purple-700 dark:text-purple-300", dot: "#8b5cf6" },
  freelance: { bg: "bg-emerald-100 dark:bg-emerald-950/50", text: "text-emerald-700 dark:text-emerald-300", dot: "#10b981" },
  office:    { bg: "bg-blue-100 dark:bg-blue-950/50",     text: "text-blue-700 dark:text-blue-300",     dot: "#3b82f6" },
};

export const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string }> = {
  active:    { bg: "bg-emerald-100 dark:bg-emerald-950/50", text: "text-emerald-700 dark:text-emerald-300" },
  on_hold:   { bg: "bg-amber-100 dark:bg-amber-950/50",     text: "text-amber-700 dark:text-amber-300"    },
  completed: { bg: "bg-blue-100 dark:bg-blue-950/50",       text: "text-blue-700 dark:text-blue-300"      },
  cancelled: { bg: "bg-gray-100 dark:bg-gray-800",          text: "text-gray-500 dark:text-gray-400"      },
};

export const PRIORITY_COLORS: Record<TaskPriority, { dot: string; text: string }> = {
  low:    { dot: "#94a3b8", text: "text-gray-400"   },
  medium: { dot: "#3b82f6", text: "text-blue-500"   },
  high:   { dot: "#f97316", text: "text-orange-500" },
  urgent: { dot: "#ef4444", text: "text-red-500"    },
};

// ─── API ──────────────────────────────────────────────────────────────────

export const projectsApi = {
  // Projects
  getProjects: (params?: { type?: string; status?: string; priority?: string }) =>
    api.get<{ data: Project[] }>("/projects", { params }),

  createProject: (body: Omit<Project, "id" | "created_at" | "updated_at">) =>
    api.post<Project>("/projects", body),

  getProject: (id: string) =>
    api.get<ProjectDetail>(`/projects/${id}`),

  updateProject: (id: string, updates: Partial<Omit<Project, "id" | "created_at">>) =>
    api.patch<Project>(`/projects/${id}`, updates),

  deleteProject: (id: string) =>
    api.delete(`/projects/${id}`),

  // Stats
  getStatsSummary: () =>
    api.get<StatsSummary>("/projects/stats/summary"),

  // Tasks
  getAllTasks: (params?: { status?: string; priority?: string; project_id?: string }) =>
    api.get<{ data: ProjectTask[] }>("/projects/tasks", { params }),

  createTask: (body: { project_id: string; title: string; priority?: string; due_date?: string; status?: string }) =>
    api.post<ProjectTask>("/projects/tasks/create", body),

  updateTask: (id: string, updates: Partial<ProjectTask>) =>
    api.patch<ProjectTask>(`/projects/tasks/${id}`, updates),

  deleteTask: (id: string) =>
    api.delete(`/projects/tasks/${id}`),

  // Milestones
  createMilestone: (body: { project_id: string; title: string; due_date?: string }) =>
    api.post<ProjectMilestone>("/projects/milestones/create", body),

  updateMilestone: (id: string, updates: Partial<ProjectMilestone>) =>
    api.patch<ProjectMilestone>(`/projects/milestones/${id}`, updates),

  deleteMilestone: (id: string) =>
    api.delete(`/projects/milestones/${id}`),

  // Updates / Notes
  createUpdate: (body: { project_id: string; content: string }) =>
    api.post<ProjectUpdate>("/projects/updates/create", body),

  deleteUpdate: (id: string) =>
    api.delete(`/projects/updates/${id}`),
};
