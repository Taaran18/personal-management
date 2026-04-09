"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, RadialBarChart, RadialBar,
} from "recharts";
import {
  Wallet, ShoppingCart, PiggyBank, Clock, Target, TrendingUp, TrendingDown,
  AlertTriangle, Zap, Activity, ArrowUpRight, ArrowDownRight, Calendar,
  Flame, Award, BarChart2, RefreshCw, ChevronRight,
} from "lucide-react";
import { salaryApi, DashboardData } from "@/lib/api";
import { formatCurrency, formatDate, CATEGORY_COLORS } from "@/lib/utils";
import StatCard from "@/components/salary/StatCard";
import MonthSelector, { toMonthString } from "@/components/MonthSelector";
import Link from "next/link";

const RADIAN = Math.PI / 180;
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const tooltipStyle = {
  contentStyle: { background: "#111827", border: "1px solid #1f2937", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#9ca3af" },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const nowDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1));

  const load = (month = selectedMonth) => {
    setLoading(true);
    setError("");
    salaryApi.getDashboard(toMonthString(month))
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load. Make sure the backend is running."))
      .finally(() => setLoading(false));
  };

  const handleMonthChange = (month: Date) => {
    setSelectedMonth(month);
    load(month);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { this_month, spending_by_category, yearly_overview, recent_transactions } = data;

  // ── Derived metrics ───────────────────────────────────────────────────────
  const expenseRatio = this_month.income > 0 ? (this_month.expenses / this_month.income) * 100 : 0;
  const isAboveGoal = this_month.goal_status === "Above Goal";
  const goalProgress = Math.min((this_month.savings / this_month.saving_goal) * 100, 100);
  const burnRate = this_month.projected_spend > 0 && this_month.income > 0
    ? (this_month.projected_spend / this_month.income) * 100 : 0;

  // Spending pie (OUT only, non-zero)
  const spendingPie = Object.entries(spending_by_category)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Top 3 expense categories
  const top3 = spendingPie.slice(0, 3);

  // Financial health score (0–100)
  const healthScore = Math.min(100, Math.max(0,
    (isAboveGoal ? 30 : 0) +
    (expenseRatio < 70 ? 30 : expenseRatio < 90 ? 15 : 0) +
    (this_month.savings >= 0 ? 20 : 0) +
    (burnRate < 90 ? 20 : 10)
  ));
  const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "At Risk";
  const healthColor = healthScore >= 80 ? "#10b981" : healthScore >= 60 ? "#3b82f6" : healthScore >= 40 ? "#f59e0b" : "#ef4444";

  const isCurrentMonth = selectedMonth.getFullYear() === nowDate.getFullYear() && selectedMonth.getMonth() === nowDate.getMonth();

  // Cash flow area chart data — trim to selected month to avoid flat-zero trailing space
  const cashFlowData = yearly_overview
    .slice(0, selectedMonth.getMonth() + 1)
    .map((m) => ({
      month: m.month.split("-")[0],
      income: m.income,
      expenses: m.expenses,
      savings: m.savings,
      goal: m.goal,
    }));

  // Month-over-month: find previous month's data
  const curMonthLabel = selectedMonth.toLocaleDateString("en-IN", { month: "short" }) + "-" + selectedMonth.getFullYear();
  const curIdx = yearly_overview.findIndex((m) => m.month === curMonthLabel);
  const prevMonthData = curIdx > 0 ? yearly_overview[curIdx - 1] : null;
  const incomeChange = prevMonthData && prevMonthData.income > 0
    ? ((this_month.income - prevMonthData.income) / prevMonthData.income) * 100 : null;
  const expenseChange = prevMonthData && prevMonthData.expenses > 0
    ? ((this_month.expenses - prevMonthData.expenses) / prevMonthData.expenses) * 100 : null;

  // Radial health
  const healthRadial = [{ name: "Health", value: healthScore, fill: healthColor }];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {selectedMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · {this_month.days_elapsed} days tracked{!isCurrentMonth ? " · Viewing past month" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector value={selectedMonth} onChange={handleMonthChange} />
          <button
            onClick={() => load()}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <Link
            href="/salary/transactions"
            className="flex items-center gap-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl transition-colors"
          >
            Transactions <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Top 4 Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="This Month Income" value={formatCurrency(this_month.income)} icon={Wallet}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <StatCard label="This Month Expenses" value={formatCurrency(this_month.expenses)} icon={ShoppingCart}
          gradient="bg-gradient-to-br from-red-500 to-rose-600" />
        <StatCard label="Net Savings" value={formatCurrency(this_month.savings)}
          sub={`${this_month.saving_pct}% savings rate`} icon={PiggyBank}
          gradient={isAboveGoal ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-gradient-to-br from-amber-500 to-orange-500"}
          trend={isAboveGoal ? "up" : "down"} trendLabel={this_month.goal_status} />
        <StatCard label="Projected Spend" value={formatCurrency(this_month.projected_spend)}
          sub={`${this_month.days_left} days left`} icon={Clock}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
      </div>

      {/* ── Secondary Metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expense Ratio */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Expense Ratio</span>
            <BarChart2 size={14} className={expenseRatio > 90 ? "text-red-500" : expenseRatio > 70 ? "text-amber-500" : "text-emerald-500"} />
          </div>
          <p className={`text-2xl font-bold mb-1 ${expenseRatio > 90 ? "text-red-500" : expenseRatio > 70 ? "text-amber-500" : "text-emerald-500"}`}>
            {expenseRatio.toFixed(1)}%
          </p>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div className={`h-full rounded-full ${expenseRatio > 90 ? "bg-red-500" : expenseRatio > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(expenseRatio, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">of income spent</p>
        </div>

        {/* Daily Avg Spend */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Daily Avg Spend</span>
            <Zap size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{formatCurrency(this_month.daily_avg_spend)}</p>
          <p className="text-xs text-gray-400">per day this month</p>
        </div>

        {/* Burn Rate */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Budget Burn Rate</span>
            <Flame size={14} className={burnRate > 100 ? "text-red-500" : "text-orange-500"} />
          </div>
          <p className={`text-2xl font-bold mb-1 ${burnRate > 100 ? "text-red-500" : "text-orange-500"}`}>
            {burnRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400">projected vs income</p>
        </div>

        {/* Savings Goal */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Goal Progress</span>
            <Target size={14} className={isAboveGoal ? "text-emerald-500" : "text-amber-500"} />
          </div>
          <p className={`text-2xl font-bold mb-1 ${isAboveGoal ? "text-emerald-500" : "text-amber-500"}`}>
            {goalProgress.toFixed(0)}%
          </p>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div className={`h-full rounded-full ${isAboveGoal ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${goalProgress}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">of {formatCurrency(this_month.saving_goal)} goal</p>
        </div>
      </div>

      {/* ── Financial Health + Month vs Month ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Financial Health</span>
          </div>
          <div className="relative w-36 h-36 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%"
                startAngle={90} endAngle={-270} data={healthRadial}>
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#1f2937" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{healthScore}</span>
              <span className="text-xs text-gray-400">/100</span>
            </div>
          </div>
          <span className="text-lg font-bold" style={{ color: healthColor }}>{healthLabel}</span>
          <p className="text-xs text-gray-400 mt-1">Based on savings, spending & goal</p>
        </div>

        {/* Month vs Month */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <Activity size={15} className="text-blue-500" /> Month-over-Month
          </h3>
          {prevMonthData && prevMonthData.income > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Income", cur: this_month.income, change: incomeChange, icon: TrendingUp, good: true },
                { label: "Expenses", cur: this_month.expenses, change: expenseChange, icon: TrendingDown, good: false },
                { label: "Savings", cur: this_month.savings, prev: prevMonthData.savings, icon: PiggyBank, good: true },
                { label: "Saving %", cur: this_month.saving_pct, prev: prevMonthData.saving_pct, icon: Target, good: true, pct: true },
              ].map((item) => {
                const change = item.change !== undefined ? item.change : (item.prev !== undefined && item.prev !== 0 ? ((item.cur - item.prev) / Math.abs(item.prev)) * 100 : null);
                const isPos = change !== null && change > 0;
                const isGood = item.good ? isPos : !isPos;
                return (
                  <div key={item.label} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {item.pct ? `${item.cur}%` : formatCurrency(item.cur)}
                    </p>
                    {change !== null && (
                      <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${isGood ? "text-emerald-500" : "text-red-500"}`}>
                        {isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(change).toFixed(1)}% vs last month
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Add last month's data to see comparison
            </div>
          )}
        </div>
      </div>

      {/* ── Savings Goal Progress Bar ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={16} className={isAboveGoal ? "text-emerald-500" : "text-amber-500"} />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">Monthly Savings Goal</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{formatCurrency(this_month.savings)}</span>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(this_month.saving_goal)}</span>
          </div>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${isAboveGoal ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-amber-400 to-orange-500"}`}
            style={{ width: `${goalProgress}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-400">{goalProgress.toFixed(1)}% achieved</span>
          <span className={`text-xs font-semibold ${isAboveGoal ? "text-emerald-500" : "text-amber-500"}`}>
            {isAboveGoal ? "Goal reached ✓" : `₹${(this_month.saving_goal - this_month.savings).toLocaleString("en-IN")} remaining`}
          </span>
        </div>
      </div>

      {/* ── Charts Row 1 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cash Flow Area Chart */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <BarChart2 size={15} className="text-emerald-500" /> Income vs Expenses (Year)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cashFlowData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" strokeOpacity={0.4} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Spending Pie */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <ShoppingCart size={15} className="text-red-500" /> Where Did Money Go?
          </h3>
          {spendingPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={spendingPie} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                    labelLine={false} label={renderPieLabel}>
                    {spendingPie.map((e) => <Cell key={e.name} fill={CATEGORY_COLORS[e.name] || "#94a3b8"} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                {spendingPie.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[item.name] || "#94a3b8" }} />
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-shrink-0 ml-1">
                      ₹{item.value.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No spending data this month</div>
          )}
        </div>
      </div>

      {/* ── Top Expense Categories ─────────────────────────────────────────── */}
      {top3.length > 0 && (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <Flame size={15} className="text-orange-500" /> Top Spending Categories
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {top3.map((item, i) => {
              const pct = this_month.expenses > 0 ? (item.value / this_month.expenses) * 100 : 0;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={item.name} className="rounded-xl p-4 border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{medals[i]}</span>
                    <span className="text-xs font-medium text-gray-400">{pct.toFixed(1)}%</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{item.name}</p>
                  <p className="text-xl font-bold" style={{ color: CATEGORY_COLORS[item.name] || "#94a3b8" }}>
                    {formatCurrency(item.value)}
                  </p>
                  <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CATEGORY_COLORS[item.name] || "#94a3b8" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Charts Row 2 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Savings vs Goal Line */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-violet-500" /> Savings vs Goal (Year)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cashFlowData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" strokeOpacity={0.4} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="savings" name="Savings" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: "#8b5cf6" }} />
              <Line type="monotone" dataKey="goal" name="Goal" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category bar chart */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <BarChart2 size={15} className="text-blue-500" /> Expense Breakdown
          </h3>
          {spendingPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={spendingPie.slice(0, 7)} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} {...tooltipStyle} />
                <Bar dataKey="value" name="Spent" radius={[0, 4, 4, 0]}>
                  {spendingPie.slice(0, 7).map((e) => (
                    <Cell key={e.name} fill={CATEGORY_COLORS[e.name] || "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* ── Category Breakdown Progress Bars + Recent Transactions ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <Activity size={15} className="text-emerald-500" /> This Month Breakdown
          </h3>
          <div className="space-y-3">
            {spendingPie.map((item) => {
              const pct = this_month.expenses > 0 ? (item.value / this_month.expenses) * 100 : 0;
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[item.name] || "#94a3b8" }} />
                      <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.value)} <span className="text-gray-400">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: CATEGORY_COLORS[item.name] || "#94a3b8" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <Calendar size={15} className="text-blue-500" /> Recent Transactions
          </h3>
          <div className="space-y-1">
            {recent_transactions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No transactions yet</p>
            ) : (
              recent_transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${CATEGORY_COLORS[tx.category] || "#94a3b8"}20` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[tx.category] || "#94a3b8" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400">{formatDate(tx.date)} · {tx.category}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ml-2 ${tx.type === "IN" ? "text-emerald-500" : "text-red-500"}`}>
                    {tx.type === "IN" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Alerts / Insights ─────────────────────────────────────────────── */}
      {(expenseRatio > 90 || burnRate > 100 || !isAboveGoal) && (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" /> Insights & Alerts
          </h3>
          <div className="space-y-2">
            {expenseRatio > 90 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400">
                  <span className="font-semibold">High expense ratio ({expenseRatio.toFixed(1)}%).</span> You're spending over 90% of your income. Consider reducing discretionary expenses.
                </p>
              </div>
            )}
            {burnRate > 100 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                <Flame size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-semibold">Projected overspend.</span> At your current daily rate, you'll spend more than you earn this month.
                </p>
              </div>
            )}
            {!isAboveGoal && this_month.income > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <Target size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <span className="font-semibold">Below savings goal.</span> Save ₹{(this_month.saving_goal - this_month.savings).toLocaleString("en-IN")} more to hit your target of {formatCurrency(this_month.saving_goal)}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="h-56 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="lg:col-span-2 h-56 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mb-4">
        <Activity size={24} className="text-red-500" />
      </div>
      <p className="font-semibold text-gray-900 dark:text-white mb-1">Connection Error</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{message}</p>
    </div>
  );
}
