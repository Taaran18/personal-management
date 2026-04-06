"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar,
} from "recharts";
import {
  CheckSquare, Flame, TrendingUp, Calendar,
  Activity, Award, RefreshCw,
  Target, BarChart2, ChevronRight, Trophy, Star, CalendarDays, Snowflake,
} from "lucide-react";
import { habitsApi, StatsSummary, TrendPoint, Milestone, MilestonesResponse } from "@/lib/habits-api";
import StatCard from "@/components/salary/StatCard";
import MonthSelector, { toReferenceDate } from "@/components/MonthSelector";
import Link from "next/link";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  contentStyle: { background: "#111827", border: "1px solid #1f2937", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#9ca3af" },
};

const PERIOD_TABS = [
  { label: "Weekly", value: "weekly" as const },
  { label: "Monthly", value: "monthly" as const },
  { label: "Quarterly", value: "quarterly" as const },
  { label: "Annually", value: "annually" as const },
];

export default function HabitsDashboard() {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [period, setPeriod] = useState<"weekly" | "monthly" | "quarterly" | "annually">("weekly");
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const isCurrentMonth = selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() === now.getMonth();

  const loadSummary = (month = selectedMonth) => {
    setLoading(true);
    setError("");
    const refDate = toReferenceDate(month);
    Promise.all([
      habitsApi.getStatsSummary(refDate),
      habitsApi.getMilestones(),
    ])
      .then(([sumRes, milRes]) => {
        setSummary(sumRes.data);
        setMilestones(milRes.data.milestones.slice(0, 8));
      })
      .catch(() => setError("Failed to load. Make sure the backend is running."))
      .finally(() => setLoading(false));
  };

  const loadTrends = async (p: typeof period) => {
    setTrendLoading(true);
    try {
      const res = await habitsApi.getStatsTrends(p);
      setTrendData(res.data.data);
    } finally {
      setTrendLoading(false);
    }
  };

  const handleMonthChange = (month: Date) => {
    setSelectedMonth(month);
    loadSummary(month);
  };

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => { loadTrends(period); }, [period]);

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={loadSummary} className="flex items-center gap-2 text-sm text-purple-500 hover:underline">
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
  if (!summary) return null;

  const topStreak = Math.max(...summary.habit_consistency.map((h) => h.streak), 0);
  const totalHabits = summary.today.total;

  // Habit health score (0–100)
  const healthScore = Math.min(100, Math.max(0,
    Math.round(
      summary.today.pct * 0.3 +
      summary.current_week.pct * 0.35 +
      summary.current_month.pct * 0.35
    )
  ));
  const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "Building";
  const healthColor = healthScore >= 80 ? "#10b981" : healthScore >= 60 ? "#8b5cf6" : healthScore >= 40 ? "#f59e0b" : "#94a3b8";
  const healthRadial = [{ name: "Health", value: healthScore, fill: healthColor }];

  // Week-over-week from trend (weekly period)
  const weeklyTrend = trendData;
  const curWeek = weeklyTrend.length > 0 ? weeklyTrend[weeklyTrend.length - 1] : null;
  const prevWeek = weeklyTrend.length > 1 ? weeklyTrend[weeklyTrend.length - 2] : null;
  const weekPctChange = curWeek && prevWeek && prevWeek.pct > 0
    ? ((curWeek.pct - prevWeek.pct) / prevWeek.pct) * 100 : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Habits Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {totalHabits} habits tracked{!isCurrentMonth ? " · Viewing past month" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector value={selectedMonth} onChange={handleMonthChange} />
          <button onClick={() => loadSummary()} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
          <Link href="/habits/calendar" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Calendar">
            <CalendarDays size={16} />
          </Link>
          <Link
            href="/habits/tracker"
            className="flex items-center gap-1.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl transition-colors"
          >
            Tracker <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Top 4 Gradient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Completion"
          value={`${summary.today.pct}%`}
          sub={`${summary.today.completed}/${summary.today.total} habits done`}
          icon={CheckSquare}
          gradient={summary.today.pct === 100
            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
            : summary.today.pct >= 60
            ? "bg-gradient-to-br from-amber-500 to-orange-500"
            : "bg-gradient-to-br from-red-500 to-rose-600"}
          trend={summary.today.pct === 100 ? "up" : "neutral"}
          trendLabel={summary.today.pct === 100 ? "Perfect!" : undefined}
        />
        <StatCard
          label="This Week"
          value={`${summary.current_week.pct}%`}
          sub={`${summary.current_week.completed}/${summary.current_week.total} checks`}
          icon={Calendar}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          trend={summary.current_week.pct >= 70 ? "up" : "down"}
          trendLabel={summary.current_week.pct >= 70 ? "On Track" : undefined}
        />
        <StatCard
          label="Best Active Streak"
          value={`${topStreak}d`}
          sub={topStreak > 0 ? "consecutive days" : "No streak yet"}
          icon={Flame}
          gradient={topStreak >= 7
            ? "bg-gradient-to-br from-orange-500 to-red-500"
            : "bg-gradient-to-br from-amber-500 to-orange-400"}
          trend={topStreak > 0 ? "up" : "neutral"}
          trendLabel={topStreak >= 7 ? "🔥 Hot" : topStreak >= 3 ? "Growing" : undefined}
        />
        <StatCard
          label="This Month"
          value={`${summary.current_month.pct}%`}
          sub={`${summary.current_month.completed}/${summary.current_month.total} checks`}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-purple-500 to-violet-600"
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Habits */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Active Habits</span>
            <CheckSquare size={14} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-500 mb-1">{totalHabits}</p>
          <p className="text-xs text-gray-400">habits being tracked</p>
        </div>

        {/* Quarter */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">This Quarter</span>
            <Target size={14} className={summary.current_quarter.pct >= 70 ? "text-emerald-500" : "text-amber-500"} />
          </div>
          <p className={`text-2xl font-bold mb-1 ${summary.current_quarter.pct >= 70 ? "text-emerald-500" : "text-amber-500"}`}>
            {summary.current_quarter.pct}%
          </p>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div className={`h-full rounded-full ${summary.current_quarter.pct >= 70 ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${summary.current_quarter.pct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">completion rate</p>
        </div>

        {/* Weekly pct */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Week Rate</span>
            <BarChart2 size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-500 mb-1">{summary.current_week.pct}%</p>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${summary.current_week.pct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">of weekly checks done</p>
        </div>

        {/* Best Week Ever */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Best Week Ever</span>
            <Trophy size={14} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-500 mb-1">{summary.best_week_pct}%</p>
          <p className="text-xs text-gray-400 truncate">
            {summary.best_week_label || "No data yet"}
          </p>
        </div>
      </div>

      {/* Habit Health Score + Consistency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Habit Health</span>
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
          <p className="text-xs text-gray-400 mt-1">Based on today, week & month</p>
        </div>

        {/* Week-over-Week + Per habit snapshot */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <Activity size={15} className="text-purple-500" /> Habit Consistency — Last 30 Days
          </h3>
          {summary.habit_consistency.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Add habits and start tracking to see consistency
            </div>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {summary.habit_consistency.map((h) => (
                <div key={h.habit_id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {h.streak > 0 && (
                        <span className="text-[10px] text-orange-500 font-semibold flex items-center gap-0.5">
                          <Flame size={10} />{h.streak}d
                        </span>
                      )}
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-8 text-right">{h.pct_30d}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${h.pct_30d}%`, backgroundColor: h.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Milestones & Badges */}
      {milestones.length > 0 && (
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Trophy size={15} className="text-amber-500" /> Milestones & Badges
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: m.color }}>
                  {m.icon === "trophy" ? <Trophy size={16} /> :
                   m.icon === "flame" ? <Flame size={16} /> :
                   m.icon === "star" ? <Star size={16} /> :
                   <Award size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{m.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-tight">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <TrendingUp size={15} className="text-purple-500" /> Completion Trend
          </h2>
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setPeriod(tab.value)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                  period === tab.value
                    ? "bg-white dark:bg-gray-950 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {trendLoading ? (
          <div className="h-52 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ) : trendData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400">
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                interval={period === "weekly" ? 0 : "preserveStartEnd"}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v: any) => `${v}%`}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: any) => [`${v}%`, "Completion"]}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {trendData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.pct >= 80 ? "#10b981" : entry.pct >= 50 ? "#8b5cf6" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="h-52 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="lg:col-span-2 h-52 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
      <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
    </div>
  );
}
