"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { BarChart2, RefreshCw, Clock, CalendarDays, LayoutDashboard, List } from "lucide-react";
import { jobsApi, JobAnalytics } from "@/lib/jobs-api";
import Link from "next/link";
import { cn } from "@/lib/utils";

const tooltip = {
  contentStyle: { background: "#111827", border: "1px solid #1f2937", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#9ca3af" },
};

const STAGE_COLORS: Record<string, string> = {
  Applied: "#6b7280", Screening: "#6366f1", Interviewing: "#3b82f6",
  "Offer Received": "#22c55e", "Offer Accepted": "#10b981",
  "Offer Declined": "#f97316", Rejected: "#ef4444", Ghosted: "#eab308", Withdrawn: "#9ca3af",
};

const DOW_COLORS = ["#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", "#10b981", "#f59e0b", "#f97316"];

export default function AnalyticsPage() {
  const [data, setData] = useState<JobAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    jobsApi.getAnalytics()
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Pipeline performance & application patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/jobs/dashboard" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Dashboard">
            <LayoutDashboard size={16} />
          </Link>
          <Link href="/jobs/applications" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Applications">
            <List size={16} />
          </Link>
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => <div key={i} className="h-72 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : !data?.has_data ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <BarChart2 size={40} className="text-gray-300 dark:text-gray-700" />
          <p className="text-sm text-gray-400">Add some applications to see analytics</p>
          <Link href="/jobs/applications" className="text-pink-500 text-sm font-medium hover:underline">+ Add Application</Link>
        </div>
      ) : (
        <>
          {/* ── Time in Stage ─────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-violet-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Average Time in Each Stage</h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">How many days on average before moving to the next stage</p>

            {data.stage_times.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Not enough stage log data yet</p>
            ) : (
              <>
                {/* Horizontal visual bars */}
                <div className="space-y-3">
                  {data.stage_times.map((row) => {
                    const maxDays = Math.max(...data.stage_times.map((r) => r.avg_days), 1);
                    const pct = Math.round((row.avg_days / maxDays) * 100);
                    const color = STAGE_COLORS[row.stage] ?? "#8b5cf6";
                    return (
                      <div key={row.stage}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{row.stage}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{row.count} apps</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{row.avg_days}d</span>
                          </div>
                        </div>
                        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg flex items-center px-2 transition-all duration-700"
                            style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
                          >
                            {pct > 10 && <span className="text-[11px] text-white font-semibold">{row.avg_days}d avg</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary callout */}
                {data.stage_times.length > 0 && (() => {
                  const slowest = [...data.stage_times].sort((a, b) => b.avg_days - a.avg_days)[0];
                  return (
                    <div className="mt-4 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40 text-xs text-violet-700 dark:text-violet-300">
                      💡 Your slowest stage is <strong>{slowest.stage}</strong> at avg <strong>{slowest.avg_days} days</strong>. Consider following up sooner here.
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* ── Response Rate by Day of Week ──────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={16} className="text-blue-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Response Rate by Day of Week</h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">Which weekday gives you the best callback rate when you apply</p>

            {data.day_of_week.every((d) => d.total === 0) ? (
              <p className="text-sm text-gray-400 text-center py-8">Not enough data yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.day_of_week} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="short" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                    <Tooltip
                      {...tooltip}
                      formatter={(value: any, _name: any, props: any) => [
                        `${value ?? 0}% (${props?.payload?.responses ?? 0}/${props?.payload?.total ?? 0} apps)`,
                        "Response Rate",
                      ]}
                    />
                    <Bar dataKey="response_rate" radius={[5, 5, 0, 0]} maxBarSize={48}>
                      {data.day_of_week.map((_, i) => (
                        <Cell key={i} fill={DOW_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Day cards */}
                <div className="grid grid-cols-7 gap-1 mt-3">
                  {data.day_of_week.map((d, i) => {
                    const best = Math.max(...data.day_of_week.map((x) => x.response_rate));
                    const isBest = d.response_rate === best && best > 0;
                    return (
                      <div key={d.day} className={cn(
                        "rounded-xl p-2 text-center border",
                        isBest
                          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700"
                          : "border-transparent"
                      )}>
                        <p className="text-[10px] font-bold text-gray-400">{d.short}</p>
                        <p className={cn("text-sm font-bold mt-0.5", isBest ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300")}>
                          {d.response_rate}%
                        </p>
                        <p className="text-[9px] text-gray-400">{d.total} apps</p>
                        {isBest && <p className="text-[9px] font-bold text-blue-500 mt-0.5">Best ⭐</p>}
                      </div>
                    );
                  })}
                </div>

                {/* Insight */}
                {(() => {
                  const best = [...data.day_of_week].filter((d) => d.total > 0).sort((a, b) => b.response_rate - a.response_rate)[0];
                  const worst = [...data.day_of_week].filter((d) => d.total > 0).sort((a, b) => a.response_rate - b.response_rate)[0];
                  if (!best) return null;
                  return (
                    <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-300">
                      💡 You get the most callbacks when applying on <strong>{best.day}</strong> ({best.response_rate}% rate).
                      {worst && worst.day !== best.day ? ` Avoid <strong>${worst.day}</strong> ({worst.response_rate}%).` : ""}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
