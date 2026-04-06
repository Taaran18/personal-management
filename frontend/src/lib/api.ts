import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ─── Types ────────────────────────────────────────────────────────────────

export type TransactionType = "IN" | "OUT";
export type PaidBy = "Self" | "Dad" | "Mom" | "Other";
export const PAID_BY_OPTIONS: PaidBy[] = ["Self", "Dad", "Mom", "Other"];

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: TransactionType;
  paid_by?: PaidBy;
  created_at?: string;
}

export interface LedgerRow extends Transaction {
  balance: number;
  credit: number | null;
  debit: number | null;
}

export interface LedgerSummary {
  opening_balance: number;
  total_credits: number;
  total_debits: number;
  net_flow: number;
  closing_balance: number;
  saving_goal: number;
  status: string;
}

export interface MonthSummary {
  month: string;
  month_key: string;
  income: number;
  expenses: number;
  net_savings: number;
  saving_pct: number;
  vs_goal: string;
  budget_used_pct: number;
  category_breakdown: Record<string, number>;
}

export interface DashboardData {
  this_month: {
    income: number;
    expenses: number;
    savings: number;
    saving_pct: number;
    goal_status: string;
    days_left: number;
    days_elapsed: number;
    daily_avg_spend: number;
    projected_spend: number;
    saving_goal: number;
  };
  category_breakdown: Record<string, number>;
  spending_by_category: Record<string, number>;
  yearly_overview: {
    month: string;
    income: number;
    expenses: number;
    savings: number;
    saving_pct: number;
    goal: number;
  }[];
  recent_transactions: Transaction[];
}

export interface SalaryConfig {
  id?: string;
  opening_balance: number;
  saving_goal: number;
  categories: string[];
  income_categories: string[];
}

export interface WeeklyData {
  week_start: string;
  week_end: string;
  today: string;
  offset: number;
  days: { day: string; date: string; income: number; expenses: number; is_future: boolean }[];
  total_income: number;
  total_expenses: number;
  net: number;
  last_week_income: number;
  last_week_expenses: number;
  weekly_saving_goal: number;
  category_breakdown: Record<string, number>;
}

// ─── API Calls ────────────────────────────────────────────────────────────

export const salaryApi = {
  getTransactions: (params?: { month?: string; category?: string; type?: string }) =>
    api.get<{ data: Transaction[]; count: number }>("/salary/transactions", { params }),

  createTransaction: (tx: Omit<Transaction, "id" | "created_at">) =>
    api.post<Transaction>("/salary/transactions", tx),

  updateTransaction: (id: string, tx: Partial<Omit<Transaction, "id">>) =>
    api.put<Transaction>(`/salary/transactions/${id}`, tx),

  deleteTransaction: (id: string) =>
    api.delete(`/salary/transactions/${id}`),

  getLedger: (month?: string) =>
    api.get<{ ledger: LedgerRow[]; summary: LedgerSummary }>("/salary/ledger", {
      params: month ? { month } : {},
    }),

  getMonthlySummary: () =>
    api.get<{ months: MonthSummary[]; yearly: any; category_matrix: any; categories: string[] }>("/salary/monthly-summary"),

  getDashboard: (month?: string) =>
    api.get<DashboardData>("/salary/dashboard", { params: month ? { month } : {} }),

  getConfig: () =>
    api.get<SalaryConfig>("/salary/config"),

  updateConfig: (cfg: Partial<SalaryConfig>) =>
    api.put<SalaryConfig>("/salary/config", cfg),

  getCategories: () =>
    api.get<{ categories: string[]; income_categories: string[] }>("/salary/categories"),

  getWeekly: (offset = 0) =>
    api.get<WeeklyData>(`/salary/weekly?offset=${offset}`),
};
