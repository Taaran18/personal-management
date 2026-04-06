"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell,
} from "recharts";
import {
  Briefcase, TrendingUp, Star, UserX, Ghost, RefreshCw,
  AlertTriangle, ChevronRight, Clock, Award, Target, Send,
  CalendarClock, BarChart2, GitBranch,
} from "lucide-react";
import { jobsApi, JobDashboard, FollowUpReminder, statusColor, sourceColor } from "@/lib/jobs-api";
import StatCard from "@/components/salary/StatCard";
import Link from "next/link";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  contentStyle: { background: "#111827", border: "1px solid #1f2937", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#9ca3af" },
};

const FUNNEL_COLORS = ["#8b5cf6", "#6366f1", "#3b82f6", "#10b981", "#34d399"];

export default function JobsDashboard() {
  const [data, setData] = useState<JobDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    jobsApi.getDashboard()
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load. Make sure the backend is running."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={load} className="flex items-center gap-2 text-sm text-pink-500 hover:underline">
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
  if (!data) return null;

  const { summary, source_breakdown, pipeline_funnel, stale_applications, follow_up_reminders, recent_applications, monthly_trend } = data;

  const funnelData = [
    { name: "Applied", value: pipeline_funnel.Applied },
    { name: "Screening", value: pipeline_funnel.Screening },
    { name: "Interviewing", value: pipeline_funnel.Interviewing },
    { name: "Offer", value: pipeline_funnel.Offer },
    { name: "Accepted", value: pipeline_funnel.Accepted },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Applications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {summary.total} total · {summary.active} active in pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/jobs/analytics" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Analytics">
            <BarChart2 size={16} />
          </Link>
          <Link href="/jobs/timeline" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Timeline">
            <GitBranch size={16} />
          </Link>
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
          <Link
            href="/jobs/applications"
            className="flex items-center gap-1.5 text-sm font-medium bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-xl transition-colors"
          >
            Applications <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Applications" value={String(summary.total)}
          sub="All time"
          icon={Briefcase}
          gradient="bg-gradient-to-br from-pink-500 to-rose-600"
        />
        <StatCard
          label="Active Pipeline" value={String(summary.active)}
          sub="Currently in progress"
          icon={Target}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatCard
          label="Offers Received" value={String(summary.offers_received)}
          sub={`${summary.offers_accepted} accepted`}
          icon={Star}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          trend={summary.offers_received > 0 ? "up" : "neutral"}
          trendLabel={summary.offers_received > 0 ? `${summary.offer_rate}% rate` : undefined}
        />
        <StatCard
          label="Offer Rate" value={`${summary.offer_rate}%`}
          sub="Applications → Offer"
          icon={Award}
          gradient={summary.offer_rate >= 10
            ? "bg-gradient-to-br from-emerald-500 to-green-600"
            : "bg-gradient-to-br from-blue-500 to-indigo-600"}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Avg Days to Response",
            value: summary.avg_days_to_response != null ? `${summary.avg_days_to_response}d` : "—",
            icon: Clock,
            color: "text-blue-500",
          },
          {
            label: "Avg Interview Rounds",
            value: summary.avg_interview_rounds != null ? String(summary.avg_interview_rounds) : "—",
            icon: TrendingUp,
            color: "text-purple-500",
          },
          {
            label: "Rejections",
            value: String(summary.rejections),
            icon: UserX,
            color: "text-red-500",
          },
          {
            label: "Ghosted",
            value: String(summary.ghosted),
            icon: Ghost,
            color: "text-yellow-500",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{s.label}</span>
              <s.icon size={14} className={s.color} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Application Trend */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Send size={15} className="text-pink-500" /> Monthly Applications
          </h2>
          {monthly_trend.every((m) => m.count === 0) ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly_trend} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [v, "Applications"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40} fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Source Effectiveness */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Target size={15} className="text-violet-500" /> Source Effectiveness
          </h2>
          {source_breakdown.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          ) : (
            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {source_breakdown.map((s) => (
                <div key={s.source}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sourceColor(s.source)}`}>
                        {s.source}
                      </span>
                      <span className="text-xs text-gray-500">{s.total} apps</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-blue-500 font-medium">{s.interview_rate}% interview</span>
                      <span className="text-emerald-500 font-medium">{s.offer_rate}% offer</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-pink-500 transition-all" style={{ width: `${Math.min(100, (s.total / (source_breakdown[0]?.total || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Funnel + Stale Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Funnel */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-purple-500" /> Pipeline Funnel
          </h2>
          {funnelData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No applications yet</div>
          ) : (
            <div className="space-y-2">
              {[
                { label: "Applied", value: pipeline_funnel.Applied, color: "#8b5cf6" },
                { label: "Screening", value: pipeline_funnel.Screening, color: "#6366f1" },
                { label: "Interviewing", value: pipeline_funnel.Interviewing, color: "#3b82f6" },
                { label: "Offer Stage", value: pipeline_funnel.Offer, color: "#10b981" },
                { label: "Accepted", value: pipeline_funnel.Accepted, color: "#34d399" },
              ].map((s, i) => {
                const maxVal = pipeline_funnel.Applied || 1;
                const pct = Math.round((s.value / maxVal) * 100);
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{s.label}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{s.value}</span>
                    </div>
                    <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-700"
                        style={{ width: `${Math.max(pct, s.value > 0 ? 8 : 0)}%`, backgroundColor: s.color }}
                      >
                        {s.value > 0 && <span className="text-[10px] text-white font-bold">{pct}%</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stale / Needs Follow-up */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col gap-5">

          {/* ── Stale applications ── */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" /> Stale Applications
              {stale_applications.length > 0 && (
                <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                  {stale_applications.length}
                </span>
              )}
            </h2>
            {stale_applications.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No stale applications 🎉</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {stale_applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{app.company_name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{app.job_title}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{app.days_since_last_update}d</p>
                      <p className="text-[10px] text-gray-400">no update</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* separator */}
          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* ── Follow-up reminders ── */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <CalendarClock size={15} className="text-pink-500" /> Follow-up Due
              {follow_up_reminders.length > 0 && (
                <span className="ml-auto text-xs bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400 px-2 py-0.5 rounded-full font-semibold">
                  {follow_up_reminders.length}
                </span>
              )}
            </h2>
            {follow_up_reminders.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No follow-ups due soon</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {follow_up_reminders.map((r: FollowUpReminder) => (
                  <div key={r.id} className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border",
                    r.urgency === "overdue"
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50"
                      : r.urgency === "today"
                      ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50"
                      : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                  )}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{r.company_name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{r.current_status}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={cn("text-xs font-bold",
                        r.urgency === "overdue" ? "text-red-500" :
                        r.urgency === "today"   ? "text-amber-500" : "text-gray-400")}>
                        {r.urgency === "overdue" ? `${Math.abs(r.days_delta)}d overdue` :
                         r.urgency === "today"   ? "Today!" : r.follow_up_date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      {recent_applications.length > 0 && (
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Briefcase size={15} className="text-pink-500" /> Recent Applications
            </h2>
            <Link href="/jobs/applications" className="text-xs text-pink-500 hover:underline font-medium">View all</Link>
          </div>
          <div className="space-y-2">
            {recent_applications.map((app) => (
              <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{app.company_name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{app.company_name}</p>
                  <p className="text-xs text-gray-500 truncate">{app.job_title} · {app.source}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor(app.current_status)}`}>
                    {app.current_status}
                  </span>
                  <span className="text-[10px] text-gray-400">{app.days_since_application}d ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-52 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
    </div>
  );
}
