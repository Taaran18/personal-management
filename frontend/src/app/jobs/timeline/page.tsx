"use client";

import { useEffect, useState, useMemo } from "react";
import { RefreshCw, LayoutDashboard, List, CalendarDays } from "lucide-react";
import { jobsApi, JobApplication, StageLog, statusBarColor, statusColor } from "@/lib/jobs-api";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_ORDER = [
  "Applied", "Screening",
  "Interview Round 1", "Interview Round 2", "Interview Round 3",
  "Offer Received", "Offer Accepted", "Offer Declined",
  "Rejected", "Withdrawn", "Ghosted",
];

function daysBetween(a: string, b: string) {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function fmt(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type AppWithLogs = JobApplication & { stage_logs: StageLog[] };

export default function TimelinePage() {
  const [apps, setApps]       = useState<AppWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");

  const load = () => {
    setLoading(true);
    jobsApi.getTimeline(activeOnly)
      .then((r) => setApps(r.data.data as AppWithLogs[]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeOnly]);

  const today = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() =>
    filterStatus ? apps.filter((a) => a.current_status === filterStatus) : apps
  , [apps, filterStatus]);

  // Compute date range for timeline scaling
  const { minDate, totalDays } = useMemo(() => {
    if (!filtered.length) return { minDate: today, totalDays: 30 };
    const start = filtered.reduce((m, a) => a.application_date < m ? a.application_date : m, today);
    const end   = today;
    const total = Math.max(daysBetween(start, end), 1);
    return { minDate: start, totalDays: total };
  }, [filtered, today]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Timeline</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} applications · {totalDays} day span
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/jobs/dashboard" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><LayoutDashboard size={16} /></Link>
          <Link href="/jobs/applications" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><List size={16} /></Link>
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)}
            className="w-4 h-4 rounded accent-pink-500" />
          Active only
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_ORDER.map((s) => <option key={s}>{s}</option>)}
        </select>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 ml-auto text-[10px] text-gray-400">
          {["Applied", "Screening", "Interview Round 1", "Offer Received", "Offer Accepted", "Rejected", "Ghosted"].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: statusBarColor(s as any) }} />
              <span>{s.replace("Interview Round 1", "Interviewing")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-x-auto">

        {/* Date axis header */}
        <div className="flex pl-[96px] sm:pl-[144px] md:pl-[200px] pr-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 gap-0">
          {Array.from({ length: 6 }).map((_, i) => {
            const d = new Date(minDate + "T00:00:00");
            d.setDate(d.getDate() + Math.round((totalDays / 5) * i));
            return (
              <div key={i} className="flex-1 text-[10px] text-gray-400 font-medium" style={{ textAlign: i === 0 ? "left" : "center" }}>
                {fmt(d.toISOString().split("T")[0])}
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-24 sm:w-36 md:w-[200px] h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse shrink-0" />
                <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" style={{ marginLeft: `${i * 8}%`, width: `${60 - i * 8}%` }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <CalendarDays size={32} className="text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400">No applications to show</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-900/70">
            {filtered.map((app) => {
              const appStart = app.application_date;
              const appEnd   = app.last_updated_date > today ? today : app.last_updated_date;
              const leftPct  = (daysBetween(minDate, appStart) / totalDays) * 100;
              const widthPct = Math.max((daysBetween(appStart, appEnd) / totalDays) * 100, 0.5);
              const barColor = statusBarColor(app.current_status);
              const isStale  = app.is_stale;

              return (
                <div key={app.id} className="flex items-center gap-0 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors group">
                  {/* App name */}
                  <div className="w-24 sm:w-36 md:w-[200px] shrink-0 flex items-center gap-2 px-2 sm:px-3 md:px-4 py-3">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0">
                      <span className="text-white text-[9px] font-bold">{app.company_name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">{app.company_name}</p>
                      <p className="text-[10px] text-gray-400 truncate leading-tight">{app.job_title}</p>
                    </div>
                  </div>

                  {/* Gantt row */}
                  <div className="flex-1 px-4 py-3 relative" style={{ minHeight: 48 }}>
                    <div className="relative h-7 w-full">
                      {/* Background track */}
                      <div className="absolute inset-0 rounded-md bg-gray-100 dark:bg-gray-800/50" />

                      {/* Main bar */}
                      <div
                        className={cn(
                          "absolute top-0 h-full rounded-md flex items-center overflow-hidden transition-all",
                          isStale && "animate-pulse"
                        )}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: barColor }}
                        title={`${app.application_date} → ${app.last_updated_date} · ${app.current_status}`}
                      >
                        <span className="px-2 text-[10px] text-white font-semibold truncate whitespace-nowrap">
                          {widthPct > 6 ? app.current_status : ""}
                        </span>

                        {/* Stale indicator */}
                        {isStale && (
                          <span className="ml-auto mr-1 text-[10px] text-white/80 font-bold shrink-0">
                            {widthPct > 12 ? `${app.days_since_last_update}d` : "!"}
                          </span>
                        )}
                      </div>

                      {/* Stage milestone dots from logs */}
                      {app.stage_logs.map((log, li) => {
                        const dotPct = (daysBetween(minDate, log.date_of_update) / totalDays) * 100;
                        if (dotPct < 0 || dotPct > 100) return null;
                        return (
                          <div
                            key={log.id}
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white dark:border-gray-950 z-10"
                            style={{ left: `${dotPct}%`, backgroundColor: statusBarColor(log.stage as any) }}
                            title={`${log.stage} · ${log.date_of_update}`}
                          />
                        );
                      })}
                    </div>

                    {/* Today line */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-purple-500/50 z-20 pointer-events-none"
                      style={{ left: `calc(${(daysBetween(minDate, today) / totalDays) * 100}% + 16px)` }}
                    />
                  </div>

                  {/* Status + days */}
                  <div className="w-32 shrink-0 px-3 py-2 hidden lg:flex flex-col gap-0.5 items-end">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusColor(app.current_status))}>
                      {app.current_status}
                    </span>
                    <span className="text-[10px] text-gray-400">{app.days_since_application}d total</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today marker label */}
      <div className="flex items-center gap-2 text-xs text-purple-500">
        <div className="w-px h-4 bg-purple-500" />
        <span className="font-semibold">Today ({today})</span>
      </div>
    </div>
  );
}
