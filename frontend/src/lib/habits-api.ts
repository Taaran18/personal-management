import { api } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────

export interface Habit {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
  completed: boolean;
  notes?: string;
}

export interface HabitLogInfo {
  completed: boolean;
  notes?: string;
  is_freeze?: boolean;
}

export interface HabitLogsResponse {
  data: HabitLog[];
  lookup: Record<string, Record<string, HabitLogInfo>>;
  freezes: Record<string, Record<string, { frozen: boolean; reason?: string }>>;
}

export interface HabitConsistency {
  habit_id: string;
  name: string;
  color: string;
  pct_30d: number;
  done_30d: number;
  streak: number;
}

export interface PeriodStat {
  completed: number;
  total: number;
  pct: number;
}

export interface StatsSummary {
  today: PeriodStat;
  current_week: PeriodStat;
  current_month: PeriodStat;
  current_quarter: PeriodStat;
  best_week_pct: number;
  best_week_label: string;
  habit_consistency: HabitConsistency[];
}

export interface TrendPoint {
  label: string;
  completed: number;
  total: number;
  pct: number;
}

export interface TrendsData {
  period: string;
  data: TrendPoint[];
}

export interface CalendarDay {
  date: string;
  completed: number;
  total: number;
  pct: number;
  frozen: boolean;
}

export interface CalendarData {
  year: number;
  total_habits: number;
  data: CalendarDay[];
}

export interface Milestone {
  type: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  habit_name?: string;
  pct?: number;
}

export interface MilestonesResponse {
  milestones: Milestone[];
  total: number;
}

export const HABIT_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#f97316", "#06b6d4", "#ec4899", "#6366f1", "#84cc16",
  "#14b8a6", "#a16207", "#0ea5e9", "#d946ef", "#22c55e",
];

// ─── API ──────────────────────────────────────────────────────────────────

export const habitsApi = {
  getHabits: (includeArchived = false) =>
    api.get<{ data: Habit[] }>("/habits", includeArchived ? { params: { include_archived: true } } : {}),

  createHabit: (body: { name: string; description?: string; color: string; sort_order?: number }) =>
    api.post<Habit>("/habits", body),

  updateHabit: (id: string, updates: Partial<Omit<Habit, "id" | "created_at">>) =>
    api.patch<Habit>(`/habits/${id}`, updates),

  archiveHabit: (id: string) =>
    api.patch<Habit>(`/habits/${id}`, { is_active: false }),

  restoreHabit: (id: string) =>
    api.patch<Habit>(`/habits/${id}`, { is_active: true }),

  deleteHabit: (id: string) =>
    api.delete(`/habits/${id}`),

  getLogs: (startDate: string, endDate: string) =>
    api.get<HabitLogsResponse>("/habits/logs", { params: { start_date: startDate, end_date: endDate } }),

  toggleLog: (habitId: string, logDate: string, completed: boolean) =>
    api.post<HabitLog>("/habits/logs/toggle", { habit_id: habitId, log_date: logDate, completed }),

  addLogNote: (habitId: string, logDate: string, notes: string) =>
    api.post("/habits/logs/note", null, { params: { habit_id: habitId, log_date: logDate, notes } }),

  toggleFreeze: (habitId: string, freezeDate: string, reason?: string) =>
    api.post("/habits/freezes", null, { params: { habit_id: habitId, freeze_date: freezeDate, ...(reason ? { reason } : {}) } }),

  getCalendar: (year: number) =>
    api.get<CalendarData>("/habits/calendar", { params: { year } }),

  getMilestones: () =>
    api.get<MilestonesResponse>("/habits/milestones"),

  getStatsSummary: (referenceDate?: string) =>
    api.get<StatsSummary>("/habits/stats/summary", referenceDate ? { params: { reference_date: referenceDate } } : {}),

  getStatsTrends: (period: "weekly" | "monthly" | "quarterly" | "annually") =>
    api.get<TrendsData>("/habits/stats/trends", { params: { period } }),
};
