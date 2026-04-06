export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#f97316",
  "Rent": "#8b5cf6",
  "Transport": "#3b82f6",
  "Utilities": "#06b6d4",
  "Entertainment": "#ec4899",
  "Shopping": "#f59e0b",
  "Healthcare": "#10b981",
  "Education": "#6366f1",
  "Investment / SIP": "#84cc16",
  "EMI": "#ef4444",
  "Salary Credit": "#22c55e",
  "Other Income": "#14b8a6",
  "Miscellaneous": "#94a3b8",
};
