"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, Legend, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Award, Target, Flame, PiggyBank,
  BarChart2, ChevronDown, ChevronUp, Calendar, Zap, Activity,
  ArrowUpRight, ArrowDownRight, AlertTriangle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { salaryApi, MonthSummary, DashboardData, WeeklyData } from "@/lib/api";
import { formatCurrency, CATEGORY_COLORS, cn } from "@/lib/utils";

type Tab = "week" | "month" | "quarter" | "year";

const QUARTER_MONTHS = {
  Q1: ["01", "02", "03"],
  Q2: ["04", "05", "06"],
  Q3: ["07", "08", "09"],
  Q4: ["10", "11", "12"],
};

const tooltipStyle = {
  contentStyle: { background: "#111827", border: "1px solid #1f2937", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#9ca3af" },
};

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("month");
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [yearly, setYearly] = useState<any>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [weekly, setWeekly] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      salaryApi.getMonthlySummary(),
      salaryApi.getDashboard(),
      salaryApi.getWeekly(0),
    ]).then(([mRes, dRes, wRes]) => {
      setMonths(mRes.data.months);
      setYearly(mRes.data.yearly);
      setDashboard(dRes.data);
      setWeekly(wRes.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      setWeekLoading(true);
      salaryApi.getWeekly(weekOffset)
        .then((r) => setWeekly(r.data))
        .finally(() => setWeekLoading(false));
    }
  }, [weekOffset]);

  const activeMonths = months.filter((m) => m.income > 0 || m.expenses > 0);

  // Quarter calculations
  const quarters = (Object.entries(QUARTER_MONTHS) as [string, string[]][]).map(([label, monthNums]) => {
    const qMonths = months.filter((m) => monthNums.some((n) => m.month_key.endsWith(`-${n}`)));
    const income = qMonths.reduce((s, m) => s + m.income, 0);
    const expenses = qMonths.reduce((s, m) => s + m.expenses, 0);
    const savings = qMonths.reduce((s, m) => s + m.net_savings, 0);
    const currentQMonths = monthNums.map((n) => `${new Date().getFullYear()}-${n}`);
    const isCurrent = currentQMonths.some((k) => {
      const now = new Date();
      return k === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    return { label, income, expenses, savings, saving_pct: income > 0 ? Math.round((savings / income) * 100) : 0, isCurrent };
  });

  // MoM comparison for month tab
  const now = new Date();
  const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const curMonthData = months.find((m) => m.month_key === curMonthKey);
  const prevMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
  const prevMonthData = months.find((m) => m.month_key === prevMonthKey);

  const chartData = activeMonths.map((m) => ({
    month: m.month.split("-")[0],
    income: m.income,
    expenses: m.expenses,
    savings: m.net_savings,
    saving_pct: m.saving_pct,
  }));

  const quarterChartData = quarters.map((q) => ({
    quarter: q.label,
    income: q.income,
    expenses: q.expenses,
    savings: q.savings,
  }));

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}</div>
      <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Financial breakdown across time periods</p>
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl self-start sm:self-auto">
          {(["week", "month", "quarter", "year"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all capitalize",
                tab === t
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════ WEEK TAB ═══════════════ */}
      {tab === "week" && weekly && (
        <div className="space-y-5">

          {/* Week navigator */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3">
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <div className="text-center">
              <p className={cn("text-sm font-semibold text-gray-900 dark:text-white transition-opacity", weekLoading && "opacity-40")}>
                {weekOffset === 0 ? "This Week" : weekOffset === 1 ? "Last Week" : `${weekOffset} Weeks Ago`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(weekly.week_start + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                {" – "}
                {new Date(weekly.week_end + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <button
              onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
              disabled={weekOffset === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>

          {/* Week summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
              <p className="text-xs text-white/70 mb-1 font-medium">Week Income</p>
              <p className="text-xl font-bold text-white">{formatCurrency(weekly.total_income)}</p>
              {weekly.last_week_income > 0 && (
                <p className="text-[10px] text-white/60 mt-0.5">
                  vs {formatCurrency(weekly.last_week_income)} last week
                </p>
              )}
            </div>
            <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
              <p className="text-xs text-white/70 mb-1 font-medium">Week Expenses</p>
              <p className="text-xl font-bold text-white">{formatCurrency(weekly.total_expenses)}</p>
              {weekly.last_week_expenses > 0 && (() => {
                const chg = ((weekly.total_expenses - weekly.last_week_expenses) / weekly.last_week_expenses) * 100;
                return (
                  <p className={cn("text-[10px] mt-0.5", chg > 0 ? "text-red-200" : "text-emerald-200")}>
                    {chg > 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}% vs last week
                  </p>
                );
              })()}
            </div>
            <div className={cn("rounded-2xl p-4 relative overflow-hidden bg-gradient-to-br", weekly.net >= 0 ? "from-violet-500 to-purple-600" : "from-amber-500 to-orange-500")}>
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
              <p className="text-xs text-white/70 mb-1 font-medium">Net</p>
              <p className="text-xl font-bold text-white">{formatCurrency(weekly.net)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
              <p className="text-xs text-white/70 mb-1 font-medium">Daily Avg Spend</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(weekly.days.filter(d => !d.is_future).length > 0
                  ? weekly.total_expenses / weekly.days.filter(d => !d.is_future).length
                  : 0)}
              </p>
              <p className="text-[10px] text-white/60 mt-0.5">Weekly budget {formatCurrency(weekly.weekly_saving_goal)}</p>
            </div>
          </div>

          {/* Daily bar chart */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
              <BarChart2 size={14} className="text-blue-500" /> Daily Breakdown — This Week
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekly.days} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" strokeOpacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]}>
                  {weekly.days.map((d, i) => (
                    <Cell key={i} fill={d.is_future ? "#374151" : "#ef4444"} opacity={d.is_future ? 0.3 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Week category breakdown */}
          {Object.keys(weekly.category_breakdown).length > 0 && (
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                <Flame size={14} className="text-orange-500" /> Spending by Category This Week
              </h3>
              <div className="space-y-2.5">
                {Object.entries(weekly.category_breakdown).map(([cat, amt]) => {
                  const pct = weekly.total_expenses > 0 ? (amt / weekly.total_expenses) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] || "#94a3b8" }} />
                          <span className="text-gray-600 dark:text-gray-400">{cat}</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(amt)} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CATEGORY_COLORS[cat] || "#94a3b8" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* vs Last Week */}
          {(weekly.last_week_expenses > 0 || weekly.last_week_income > 0) && (
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                <Activity size={14} className="text-blue-500" /> vs Last Week
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Income", cur: weekly.total_income, prev: weekly.last_week_income, good: true },
                  { label: "Expenses", cur: weekly.total_expenses, prev: weekly.last_week_expenses, good: false },
                ].map((item) => {
                  const chg = item.prev > 0 ? ((item.cur - item.prev) / item.prev) * 100 : 0;
                  const isPos = chg > 0;
                  const isGood = item.good ? isPos : !isPos;
                  return (
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(item.cur)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">vs {formatCurrency(item.prev)} last week</p>
                      {item.prev > 0 && (
                        <div className={cn("flex items-center gap-1 text-xs font-medium mt-1.5", isGood ? "text-emerald-500" : "text-red-500")}>
                          {isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {Math.abs(chg).toFixed(1)}% change
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ MONTH TAB ═══════════════ */}
      {tab === "month" && dashboard && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Income", value: dashboard.this_month.income, prev: prevMonthData?.income, color: "from-emerald-500 to-teal-600", good: true },
              { label: "Expenses", value: dashboard.this_month.expenses, prev: prevMonthData?.expenses, color: "from-red-500 to-rose-600", good: false },
              { label: "Net Savings", value: dashboard.this_month.savings, prev: prevMonthData?.net_savings, color: dashboard.this_month.savings >= 0 ? "from-violet-500 to-purple-600" : "from-amber-500 to-orange-500", good: true },
              { label: "Saving Rate", value: dashboard.this_month.saving_pct, prev: prevMonthData?.saving_pct, color: "from-blue-500 to-indigo-600", good: true, pct: true },
            ].map((card) => {
              const chg = card.prev !== undefined && card.prev > 0 ? ((card.value - card.prev) / card.prev) * 100 : null;
              const isPos = chg !== null && chg > 0;
              const isGood = card.good ? isPos : !isPos;
              return (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 relative overflow-hidden`}>
                  <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
                  <p className="text-xs text-white/70 mb-1 font-medium">{card.label}</p>
                  <p className="text-xl font-bold text-white">
                    {card.pct ? `${card.value}%` : formatCurrency(card.value)}
                  </p>
                  {chg !== null && (
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium mt-1", isGood ? "text-white" : "text-white/60")}>
                      {isPos ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {Math.abs(chg).toFixed(1)}% vs last month
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Saving goal progress */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={15} className={dashboard.this_month.goal_status === "Above Goal" ? "text-emerald-500" : "text-amber-500"} />
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Monthly Savings Goal</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency(dashboard.this_month.savings)} / {formatCurrency(dashboard.this_month.saving_goal)}
                </span>
              </div>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${dashboard.this_month.goal_status === "Above Goal" ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-amber-400 to-orange-500"}`}
                style={{ width: `${Math.min((dashboard.this_month.savings / dashboard.this_month.saving_goal) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-gray-400">{Math.min((dashboard.this_month.savings / dashboard.this_month.saving_goal) * 100, 100).toFixed(1)}% achieved · {dashboard.this_month.days_left} days left</span>
              <span className={dashboard.this_month.goal_status === "Above Goal" ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"}>
                {dashboard.this_month.goal_status === "Above Goal" ? "Goal reached ✓" : `₹${(dashboard.this_month.saving_goal - dashboard.this_month.savings).toLocaleString("en-IN")} remaining`}
              </span>
            </div>
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Expense Ratio</span>
                <Zap size={13} className={dashboard.this_month.expenses / (dashboard.this_month.income || 1) * 100 > 80 ? "text-red-500" : "text-emerald-500"} />
              </div>
              <p className={`text-xl font-bold ${dashboard.this_month.expenses / (dashboard.this_month.income || 1) * 100 > 80 ? "text-red-500" : "text-emerald-500"}`}>
                {(dashboard.this_month.expenses / (dashboard.this_month.income || 1) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-0.5">of income spent</p>
            </div>
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Daily Avg Spend</span>
                <Activity size={13} className="text-blue-500" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(dashboard.this_month.daily_avg_spend)}</p>
              <p className="text-xs text-gray-400 mt-0.5">per day</p>
            </div>
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Projected Spend</span>
                <Flame size={13} className="text-orange-500" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(dashboard.this_month.projected_spend)}</p>
              <p className="text-xs text-gray-400 mt-0.5">end of month</p>
            </div>
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Days Tracked</span>
                <Calendar size={13} className="text-violet-500" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{dashboard.this_month.days_elapsed}</p>
              <p className="text-xs text-gray-400 mt-0.5">of {dashboard.this_month.days_elapsed + dashboard.this_month.days_left} days</p>
            </div>
          </div>

          {/* Category breakdown */}
          {Object.values(dashboard.spending_by_category).some(v => v > 0) && (
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                <BarChart2 size={14} className="text-emerald-500" /> This Month Spending
              </h3>
              <div className="space-y-2.5">
                {Object.entries(dashboard.spending_by_category)
                  .filter(([, v]) => v > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => {
                    const pct = dashboard.this_month.expenses > 0 ? (amt / dashboard.this_month.expenses) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] || "#94a3b8" }} />
                            <span className="text-gray-600 dark:text-gray-400">{cat}</span>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(amt)} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CATEGORY_COLORS[cat] || "#94a3b8" }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Insights */}
          {(() => {
            const expRatio = dashboard.this_month.expenses / (dashboard.this_month.income || 1) * 100;
            const alerts = [];
            if (expRatio > 90) alerts.push({ type: "red", icon: AlertTriangle, msg: `High expense ratio (${expRatio.toFixed(1)}%). You're spending over 90% of income.` });
            if (dashboard.this_month.projected_spend > dashboard.this_month.income) alerts.push({ type: "amber", icon: Flame, msg: "Projected overspend — at current daily rate you'll exceed your income this month." });
            if (dashboard.this_month.goal_status !== "Above Goal" && dashboard.this_month.income > 0) alerts.push({ type: "blue", icon: Target, msg: `₹${(dashboard.this_month.saving_goal - dashboard.this_month.savings).toLocaleString("en-IN")} more to reach your saving goal of ${formatCurrency(dashboard.this_month.saving_goal)}.` });
            if (alerts.length === 0) return null;
            return (
              <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" /> Insights & Alerts
                </h3>
                <div className="space-y-2">
                  {alerts.map((a, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${a.type === "red" ? "bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30" : a.type === "amber" ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30" : "bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30"}`}>
                      <a.icon size={13} className={`mt-0.5 flex-shrink-0 ${a.type === "red" ? "text-red-500" : a.type === "amber" ? "text-amber-500" : "text-blue-500"}`} />
                      <p className={`text-xs ${a.type === "red" ? "text-red-700 dark:text-red-400" : a.type === "amber" ? "text-amber-700 dark:text-amber-400" : "text-blue-700 dark:text-blue-400"}`}>{a.msg}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════ QUARTER TAB ═══════════════ */}
      {tab === "quarter" && (
        <div className="space-y-5">
          {/* Quarter cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quarters.map((q) => (
              <div key={q.label} className={cn(
                "rounded-2xl border p-4 relative overflow-hidden",
                q.isCurrent
                  ? "bg-gradient-to-br from-violet-500 to-purple-600 border-transparent"
                  : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-sm font-bold", q.isCurrent ? "text-white" : "text-gray-900 dark:text-white")}>{q.label}</span>
                  {q.isCurrent && <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-medium">Current</span>}
                </div>
                <p className={cn("text-lg font-bold", q.isCurrent ? "text-white" : "text-emerald-500")}>{formatCurrency(q.income)}</p>
                <p className={cn("text-xs mt-0.5", q.isCurrent ? "text-white/70" : "text-gray-400")}>income</p>
                <div className={cn("mt-2 pt-2 border-t", q.isCurrent ? "border-white/20" : "border-gray-100 dark:border-gray-800")}>
                  <p className={cn("text-sm font-semibold", q.savings >= 0 ? (q.isCurrent ? "text-white" : "text-emerald-500") : "text-red-500")}>
                    {formatCurrency(q.savings)} saved
                  </p>
                  <p className={cn("text-[10px]", q.isCurrent ? "text-white/60" : "text-gray-400")}>{q.saving_pct}% rate · {formatCurrency(q.expenses)} spent</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quarter chart */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
              <BarChart2 size={14} className="text-violet-500" /> Quarterly Comparison
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={quarterChartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" strokeOpacity={0.4} />
                <XAxis dataKey="quarter" tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" name="Savings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quarter table */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quarter Breakdown</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase">Quarter</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-emerald-500 uppercase">Income</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-red-400 uppercase">Expenses</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-violet-500 uppercase">Savings</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {quarters.map((q) => (
                  <tr key={q.label} className={cn("transition-colors", q.isCurrent && "bg-violet-50/40 dark:bg-violet-950/10")}>
                    <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white">
                      {q.label} {q.isCurrent && <span className="ml-1.5 text-[10px] bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full">Current</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">{q.income > 0 ? formatCurrency(q.income) : "—"}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-red-500">{q.expenses > 0 ? formatCurrency(q.expenses) : "—"}</td>
                    <td className={cn("px-4 py-3.5 text-right font-bold", q.savings > 0 ? "text-emerald-600 dark:text-emerald-400" : q.savings < 0 ? "text-red-500" : "text-gray-400")}>{q.income > 0 ? formatCurrency(q.savings) : "—"}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600 dark:text-gray-400 font-medium">{q.income > 0 ? `${q.saving_pct}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════ YEAR TAB ═══════════════ */}
      {tab === "year" && yearly && (
        <div className="space-y-5">
          {/* Year totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Year Income", value: yearly.income, color: "from-emerald-500 to-teal-600" },
              { label: "Year Expenses", value: yearly.expenses, color: "from-red-500 to-rose-600" },
              { label: "Year Savings", value: yearly.net_savings, color: yearly.net_savings >= 0 ? "from-violet-500 to-purple-600" : "from-amber-500 to-orange-500" },
              { label: "Savings Rate", value: yearly.saving_pct, color: "from-blue-500 to-indigo-600", pct: true },
            ].map((card) => (
              <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 relative overflow-hidden`}>
                <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
                <p className="text-sm font-medium text-white/70 mb-2">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.pct ? `${card.value}%` : formatCurrency(card.value)}</p>
              </div>
            ))}
          </div>

          {/* Insight cards */}
          {activeMonths.length > 0 && (() => {
            const best = activeMonths.reduce((a, b) => a.net_savings > b.net_savings ? a : b);
            const worst = activeMonths.reduce((a, b) => a.expenses > b.expenses ? a : b);
            const aboveGoal = activeMonths.filter((m) => m.vs_goal === "Above Goal").length;
            const avgSavings = activeMonths.reduce((s, m) => s + m.net_savings, 0) / activeMonths.length;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-1.5 mb-2"><Award size={13} className="text-amber-500" /><span className="text-xs text-gray-400">Best Month</span></div>
                  <p className="text-lg font-bold text-emerald-500">{formatCurrency(best.net_savings)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{best.month}</p>
                </div>
                <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-1.5 mb-2"><Flame size={13} className="text-red-500" /><span className="text-xs text-gray-400">Highest Spend</span></div>
                  <p className="text-lg font-bold text-red-500">{formatCurrency(worst.expenses)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{worst.month}</p>
                </div>
                <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-1.5 mb-2"><Target size={13} className="text-violet-500" /><span className="text-xs text-gray-400">Goal Streak</span></div>
                  <p className="text-lg font-bold text-violet-500">{aboveGoal}<span className="text-sm text-gray-400 font-normal"> / {activeMonths.length}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">months above goal</p>
                </div>
                <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-1.5 mb-2"><PiggyBank size={13} className="text-blue-500" /><span className="text-xs text-gray-400">Avg Monthly Save</span></div>
                  <p className="text-lg font-bold text-blue-500">{formatCurrency(avgSavings)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">projected {formatCurrency(avgSavings * 12)}/yr</p>
                </div>
              </div>
            );
          })()}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                <BarChart2 size={14} className="text-emerald-500" /> Income vs Expenses (Year)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="yExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" strokeOpacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#yIncome)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#yExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-violet-500" /> Savings Rate % (Monthly)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" strokeOpacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} {...tooltipStyle} />
                  <Bar dataKey="saving_pct" name="Saving %" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.saving_pct >= 30 ? "#10b981" : entry.saving_pct >= 15 ? "#8b5cf6" : entry.saving_pct > 0 ? "#f59e0b" : "#374151"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly table */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={12} /> Tap a month to expand categories
              </span>
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-28" />
                  <col className="w-36" />
                  <col className="w-36" />
                  <col className="w-36" />
                  <col className="w-20" />
                  <col className="w-28" />
                  <col className="w-28" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase">Month</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-emerald-500 uppercase">Income</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-red-400 uppercase">Expenses</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-violet-500 uppercase">Savings</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase">Rate</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase">vs Goal</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase">Budget Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {months.map((m, idx) => {
                    const isEmpty = m.income === 0 && m.expenses === 0;
                    const isExpanded = expandedMonth === m.month_key;
                    return (
                      <>
                        <tr
                          key={m.month_key}
                          onClick={() => !isEmpty && setExpandedMonth(isExpanded ? null : m.month_key)}
                          className={cn(
                            "transition-colors",
                            isEmpty ? "opacity-30" : "cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-900/40",
                            isExpanded && "bg-violet-50/40 dark:bg-violet-950/10",
                            !isExpanded && idx % 2 !== 0 && "bg-gray-50/40 dark:bg-gray-900/20"
                          )}
                        >
                          <td className={cn("px-4 py-3 font-medium flex items-center gap-1.5", isExpanded ? "text-violet-600 dark:text-violet-400" : "text-gray-900 dark:text-white")}>
                            {m.month}
                            {!isEmpty && (isExpanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{m.income > 0 ? formatCurrency(m.income) : <span className="text-gray-300 dark:text-gray-700">—</span>}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-500">{m.expenses > 0 ? formatCurrency(m.expenses) : <span className="text-gray-300 dark:text-gray-700">—</span>}</td>
                          <td className={cn("px-4 py-3 text-right font-bold", m.net_savings > 0 ? "text-emerald-600 dark:text-emerald-400" : m.net_savings < 0 ? "text-red-500" : "")}>{m.income > 0 ? formatCurrency(m.net_savings) : <span className="text-gray-300 dark:text-gray-700">—</span>}</td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{m.income > 0 ? `${m.saving_pct}%` : <span className="text-gray-300 dark:text-gray-700">—</span>}</td>
                          <td className="px-4 py-3 text-center">
                            {m.income > 0 ? (
                              <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                                m.vs_goal === "Above Goal" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                              )}>
                                {m.vs_goal === "Above Goal" ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                {m.vs_goal}
                              </span>
                            ) : <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {m.income > 0 ? (
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-14 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", m.budget_used_pct > 90 ? "bg-red-500" : m.budget_used_pct > 70 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(m.budget_used_pct, 100)}%` }} />
                                </div>
                                <span className={cn("text-xs font-medium", m.budget_used_pct > 90 ? "text-red-500" : m.budget_used_pct > 70 ? "text-amber-500" : "text-emerald-500")}>{m.budget_used_pct}%</span>
                              </div>
                            ) : <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>}
                          </td>
                        </tr>
                        {isExpanded && Object.keys(m.category_breakdown).length > 0 && (
                          <tr key={`${m.month_key}-detail`} className="bg-violet-50/30 dark:bg-violet-950/10">
                            <td colSpan={7} className="px-8 py-3">
                              <div className="grid sm:grid-cols-2 gap-2">
                                {Object.entries(m.category_breakdown).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                                  <div key={cat} className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] || "#94a3b8" }} />
                                      <span className="text-xs text-gray-500 dark:text-gray-400">{cat}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(amt)}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                {yearly && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-white text-xs uppercase">Full Year</td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(yearly.income)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-red-500">{formatCurrency(yearly.expenses)}</td>
                      <td className={cn("px-4 py-3.5 text-right font-bold", yearly.net_savings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>{formatCurrency(yearly.net_savings)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-600 dark:text-gray-400">{yearly.saving_pct}%</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                          yearly.vs_goal === "Above Goal" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                        )}>{yearly.vs_goal}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-600 dark:text-gray-400">{yearly.budget_used_pct}%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {months.filter(m => m.income > 0 || m.expenses > 0).map((m) => (
                <div key={m.month_key} onClick={() => setExpandedMonth(expandedMonth === m.month_key ? null : m.month_key)}
                  className={cn("p-4 cursor-pointer border-l-4 transition-colors", expandedMonth === m.month_key ? "border-violet-500 bg-violet-50/40 dark:bg-violet-950/10" : "border-transparent")}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{m.month}</span>
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", m.vs_goal === "Above Goal" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400")}>
                      {m.vs_goal}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-[10px] text-gray-400">Income</p><p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(m.income)}</p></div>
                    <div><p className="text-[10px] text-gray-400">Expenses</p><p className="text-sm font-bold text-red-500">{formatCurrency(m.expenses)}</p></div>
                    <div><p className="text-[10px] text-gray-400">Saved</p><p className={cn("text-sm font-bold", m.net_savings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>{formatCurrency(m.net_savings)}</p></div>
                  </div>
                  {expandedMonth === m.month_key && Object.keys(m.category_breakdown).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                      {Object.entries(m.category_breakdown).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{background: CATEGORY_COLORS[cat]||"#94a3b8"}} /><span className="text-xs text-gray-500">{cat}</span></div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(amt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
