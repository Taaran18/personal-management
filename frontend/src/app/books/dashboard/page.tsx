"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadialBarChart, RadialBar,
} from "recharts";
import {
  Library, BookOpen, CheckSquare, FileText, Flame, Clock,
  TrendingUp, TrendingDown, BarChart2, Activity, Award,
  ArrowUpRight, ArrowDownRight, RefreshCw, Star, ChevronRight,
} from "lucide-react";
import { booksApi, StatsSummary, TrendsData, Book, ReadingSession, GENRE_COLORS } from "@/lib/books-api";
import StatCard from "@/components/salary/StatCard";
import MonthSelector, { toMonthString } from "@/components/MonthSelector";
import Link from "next/link";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  contentStyle: { background: "#111827", border: "1px solid #1f2937", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#9ca3af" },
};

export default function BooksDashboardPage() {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [daily, setDaily] = useState<TrendsData | null>(null);
  const [monthly, setMonthly] = useState<TrendsData | null>(null);
  const [readingBooks, setReadingBooks] = useState<Book[]>([]);
  const [recentSessions, setRecentSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const nowDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1));
  const isCurrentMonth = selectedMonth.getFullYear() === nowDate.getFullYear() && selectedMonth.getMonth() === nowDate.getMonth();

  const load = (month = selectedMonth) => {
    setLoading(true);
    setError("");
    const monthStr = toMonthString(month);
    const isNow = month.getFullYear() === nowDate.getFullYear() && month.getMonth() === nowDate.getMonth();
    Promise.all([
      booksApi.getStatsSummary(monthStr),
      booksApi.getStatsTrends("daily", monthStr),
      booksApi.getStatsTrends("monthly"),
      booksApi.getBooks({ status: "Reading" }),
      booksApi.getSessions({ limit: 5 }),
    ])
      .then(([sumRes, dayRes, monRes, readRes, sessRes]) => {
        setSummary(sumRes.data);
        setDaily(dayRes.data);
        setMonthly(monRes.data);
        setReadingBooks(readRes.data.data);
        setRecentSessions(sessRes.data.data);
      })
      .catch(() => setError("Failed to load. Make sure the backend is running."))
      .finally(() => setLoading(false));
  };

  const handleMonthChange = (month: Date) => {
    setSelectedMonth(month);
    load(month);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={() => load()} className="flex items-center gap-2 text-sm text-blue-500 hover:underline">
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
  if (!summary) return null;

  const now = selectedMonth;
  const hours = Math.floor(summary.total_minutes / 60);
  const mins = summary.total_minutes % 60;
  const timeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const genreData = Object.entries(summary.genre_counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ name: genre, value: count }));

  // Reading health score (0–100)
  const healthScore = Math.min(100, Math.max(0,
    (summary.streak_days > 0 ? 25 : 0) +
    (summary.streak_days >= 7 ? 10 : 0) +
    (summary.completed > 0 ? 20 : 0) +
    (summary.reading > 0 ? 15 : 0) +
    (summary.avg_pages_per_day >= 20 ? 20 : summary.avg_pages_per_day >= 10 ? 10 : 0) +
    (summary.total_minutes > 0 ? 10 : 0)
  ));
  const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "Getting Started";
  const healthColor = healthScore >= 80 ? "#10b981" : healthScore >= 60 ? "#3b82f6" : healthScore >= 40 ? "#f59e0b" : "#94a3b8";
  const healthRadial = [{ name: "Health", value: healthScore, fill: healthColor }];

  // Month-over-month from monthly trend
  const monthlyData = monthly?.data ?? [];
  const curMonthLabel = now.toLocaleDateString("en-US", { month: "short" });
  const curIdx = monthlyData.findIndex((m) => m.label.startsWith(curMonthLabel));
  const curMonth = curIdx >= 0 ? monthlyData[curIdx] : null;
  const prevMonth = curIdx > 0 ? monthlyData[curIdx - 1] : null;

  const pagesChange = curMonth && prevMonth && prevMonth.pages > 0
    ? ((curMonth.pages - prevMonth.pages) / prevMonth.pages) * 100 : null;
  const minsChange = curMonth && prevMonth && prevMonth.minutes > 0
    ? ((curMonth.minutes - prevMonth.minutes) / prevMonth.minutes) * 100 : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Book Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {summary.total_books} books tracked{!isCurrentMonth ? " · Viewing past month" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector value={selectedMonth} onChange={handleMonthChange} />
          <button onClick={() => load()} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
          <Link
            href="/books/log"
            className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl transition-colors"
          >
            Log Session <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Top 4 Gradient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Books"
          value={String(summary.total_books)}
          sub={`${summary.not_started} not started · ${summary.on_hold} on hold`}
          icon={Library}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <StatCard
          label="Currently Reading"
          value={String(summary.reading)}
          sub={summary.reading > 0 ? "books in progress" : "Start a new book!"}
          icon={BookOpen}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          trend={summary.reading > 0 ? "up" : "neutral"}
          trendLabel={summary.reading > 0 ? `${summary.reading} Active` : undefined}
        />
        <StatCard
          label="Completed"
          value={String(summary.completed)}
          sub={`${summary.total_books > 0 ? Math.round(summary.completed / summary.total_books * 100) : 0}% completion rate`}
          icon={CheckSquare}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          trend={summary.completed > 0 ? "up" : "neutral"}
          trendLabel={summary.completed > 0 ? "Finished" : undefined}
        />
        <StatCard
          label="Pages Read"
          value={summary.total_pages_read.toLocaleString()}
          sub={`Avg ${summary.avg_pages_per_day} pages/day`}
          icon={FileText}
          gradient="bg-gradient-to-br from-purple-500 to-violet-600"
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Reading Streak */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Reading Streak</span>
            <Flame size={14} className={summary.streak_days > 0 ? "text-orange-500" : "text-gray-400"} />
          </div>
          <p className={`text-2xl font-bold mb-1 ${summary.streak_days > 0 ? "text-orange-500" : "text-gray-400"}`}>
            {summary.streak_days}d
          </p>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: `${Math.min(summary.streak_days / 30 * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{summary.streak_days > 0 ? "Keep it going!" : "Start today"}</p>
        </div>

        {/* Avg Pages/Day */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Avg Pages/Day</span>
            <BarChart2 size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{summary.avg_pages_per_day}</p>
          <p className="text-xs text-gray-400">on active reading days</p>
        </div>

        {/* Reading Time */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Time Reading</span>
            <Clock size={14} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {summary.total_minutes > 0 ? timeLabel : "—"}
          </p>
          <p className="text-xs text-gray-400">total tracked time</p>
        </div>

        {/* Genres */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Genres</span>
            <Star size={14} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-500 mb-1">{genreData.length}</p>
          <p className="text-xs text-gray-400">
            {genreData.length > 0 ? `Top: ${genreData[0].name.split(" ")[0]}` : "No books yet"}
          </p>
        </div>
      </div>

      {/* Reading Health + Month-over-Month */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Reading Health</span>
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
          <p className="text-xs text-gray-400 mt-1">Based on streak, pace & progress</p>
        </div>

        {/* Month-over-Month */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
            <Activity size={15} className="text-blue-500" /> Month-over-Month
          </h3>
          {curMonth && prevMonth ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Pages This Month", cur: curMonth.pages, prev: prevMonth.pages, change: pagesChange, good: true },
                { label: "Reading Time", cur: curMonth.minutes, prev: prevMonth.minutes, change: minsChange, good: true, isTime: true },
                { label: "Books Completed", cur: summary.completed, prev: null, change: null, good: true },
                { label: "Avg Pages/Day", cur: summary.avg_pages_per_day, prev: null, change: null, good: true },
              ].map((item) => {
                const isPos = item.change !== null && item.change > 0;
                return (
                  <div key={item.label} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {item.isTime
                        ? (item.cur >= 60 ? `${Math.floor(item.cur / 60)}h ${item.cur % 60}m` : `${item.cur}m`)
                        : item.cur.toLocaleString()}
                    </p>
                    {item.change !== null && (
                      <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${isPos ? "text-emerald-500" : "text-red-500"}`}>
                        {isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(item.change).toFixed(1)}% vs last month
                      </div>
                    )}
                    {item.change === null && item.prev === null && (
                      <p className="text-xs text-gray-400 mt-1">all time</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Log sessions to see month-over-month trends
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily pages bar */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-blue-500" /> Pages Read — Last 30 Days
          </h2>
          {daily && daily.data.some((d: any) => d.pages > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={daily.data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} pages`, "Pages"]} />
                <Bar dataKey="pages" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No sessions logged in the last 30 days" />
          )}
        </div>

        {/* Genre pie */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Books by Genre</h2>
          {genreData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={genreData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {genreData.map((entry) => (
                      <Cell key={entry.name} fill={GENRE_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: any, name: any) => [`${v} book${v !== 1 ? "s" : ""}`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {genreData.slice(0, 5).map((g) => (
                  <div key={g.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: GENRE_COLORS[g.name] || "#94a3b8" }} />
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{g.name}</span>
                    </div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{g.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyChart label="No books added yet" />
          )}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Monthly Pages — This Year</h2>
        {monthly && monthly.data.some((d: any) => d.pages > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthly.data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} pages`, "Pages"]} />
              <Line type="monotone" dataKey="pages" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="No sessions logged this year" />
        )}
      </div>

      {/* Currently Reading + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Currently Reading</h2>
            <Link href="/books/library?status=Reading" className="text-xs text-blue-500 hover:underline">View all</Link>
          </div>
          {readingBooks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No books in progress</p>
          ) : (
            <div className="space-y-4">
              {readingBooks.slice(0, 4).map((book) => (
                <Link key={book.id} href={`/books/${book.id}`} className="block group">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                        {book.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{book.total_pages}p</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "0%" }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Sessions</h2>
            <Link href="/books/log" className="text-xs text-blue-500 hover:underline">Log session</Link>
          </div>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No sessions logged yet</p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    {s.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 italic">"{s.notes}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      pp {s.from_page}–{s.to_page}
                      {s.reading_minutes ? ` · ${s.reading_minutes}min` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-blue-500">+{s.pages_read}p</span>
                    <p className="text-[10px] text-gray-400">{s.session_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-40 flex items-center justify-center">
      <p className="text-sm text-gray-400 dark:text-gray-500">{label}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-52 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="lg:col-span-2 h-52 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );
}
