"use client";

import { useEffect, useState } from "react";
import { RefreshCw, LayoutDashboard, List, AlertTriangle, Clock, MapPin, Briefcase, X, ChevronRight, Calendar } from "lucide-react";
import { jobsApi, JobApplication, JOB_STAGES, statusColor, sourceColor, tagColor } from "@/lib/jobs-api";
import { cn } from "@/lib/utils";
import Link from "next/link";

const GROUPS = [
  { key: "Applied",      label: "Applied",      color: "bg-gray-500",   border: "border-gray-300 dark:border-gray-700",   header: "text-gray-600 dark:text-gray-400",   dot: "bg-gray-400" },
  { key: "Screening",    label: "Screening",    color: "bg-indigo-500", border: "border-indigo-300 dark:border-indigo-800", header: "text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500" },
  { key: "Interviewing", label: "Interviewing", color: "bg-blue-500",   border: "border-blue-300 dark:border-blue-800",    header: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-500" },
  { key: "Offer",        label: "Offer Stage",  color: "bg-emerald-500",border: "border-emerald-300 dark:border-emerald-800",header: "text-emerald-600 dark:text-emerald-400",dot: "bg-emerald-500" },
  { key: "Closed",       label: "Closed",       color: "bg-red-400",   border: "border-red-200 dark:border-red-900",      header: "text-red-500 dark:text-red-400",     dot: "bg-red-400" },
] as const;

// ─── Quick Status Change Modal ─────────────────────────────────────────────────

function QuickStatusModal({ app, onSave, onClose }: { app: JobApplication; onSave: () => void; onClose: () => void }) {
  const [status, setStatus] = useState(app.current_status);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await jobsApi.updateApplication(app.id, { current_status: status, notes: notes || undefined });
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{app.company_name}</h3>
            <p className="text-xs text-gray-500">{app.job_title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
        </div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">New Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-500 text-gray-900 dark:text-white mb-3"
        >
          {JOB_STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Note (optional)</label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-500 text-gray-900 dark:text-white resize-none mb-4"
          placeholder="e.g. Scheduled 2nd round" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-medium disabled:opacity-50">
            {saving ? "Saving…" : "Update Status"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Application Card ─────────────────────────────────────────────────────────

function AppCard({ app, onStatusClick }: { app: JobApplication; onStatusClick: (a: JobApplication) => void }) {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-950 border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow group relative",
      app.is_stale ? "border-amber-300 dark:border-amber-700" : "border-gray-200 dark:border-gray-800"
    )}>
      {/* Stale badge */}
      {app.is_stale && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full">
          <AlertTriangle size={9} /> {app.days_since_last_update}d stale
        </div>
      )}

      {/* Company + Title */}
      <div className="flex items-start gap-2.5 mb-2.5 pr-12">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">{app.company_name.charAt(0)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">{app.company_name}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{app.job_title}</p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", sourceColor(app.source))}>
          {app.source}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          {app.job_type}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          {app.work_mode}
        </span>
      </div>

      {/* Custom tags */}
      {(app.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {(app.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", tagColor(t))}>{t}</span>
          ))}
          {(app.tags ?? []).length > 3 && (
            <span className="text-[10px] text-gray-400">+{(app.tags ?? []).length - 3}</span>
          )}
        </div>
      )}

      {/* Follow-up badge */}
      {app.follow_up_date && app.follow_up_urgency && ["overdue", "today", "soon"].includes(app.follow_up_urgency) && (
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 w-fit",
          app.follow_up_urgency === "overdue"
            ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
            : "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
        )}>
          <Calendar size={9} />
          {app.follow_up_urgency === "overdue" ? "Follow-up overdue" : app.follow_up_urgency === "today" ? "Follow-up today!" : `Follow-up ${app.follow_up_date}`}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <div className="flex items-center gap-1"><Clock size={9} />{app.application_date}</div>
        {app.location && <div className="flex items-center gap-1"><MapPin size={9} />{app.location}</div>}
      </div>

      {/* Current status + move button */}
      <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", statusColor(app.current_status))}>
          {app.current_status}
        </span>
        <button
          onClick={() => onStatusClick(app)}
          className="text-[10px] font-semibold text-pink-500 hover:text-pink-600 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Move <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [groups, setGroups] = useState<Record<string, JobApplication[]>>({});
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusApp, setStatusApp] = useState<JobApplication | null>(null);

  const load = () => {
    setLoading(true);
    jobsApi.getPipeline()
      .then((r) => { setGroups(r.data.groups); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const activeCount = GROUPS.filter((g) => g.key !== "Closed").reduce((s, g) => s + (groups[g.key]?.length ?? 0), 0);
  const staleCount  = Object.values(groups).flat().filter((a) => a.is_stale).length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeCount} active · {total} total
            {staleCount > 0 && <span className="ml-2 text-amber-500 font-medium">· {staleCount} stale</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/jobs/dashboard" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Dashboard">
            <LayoutDashboard size={16} />
          </Link>
          <Link href="/jobs/applications" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Table View">
            <List size={16} />
          </Link>
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Group totals strip */}
      <div className="flex gap-3 flex-wrap">
        {GROUPS.map((g) => (
          <div key={g.key} className="flex items-center gap-1.5 text-xs">
            <div className={cn("w-2 h-2 rounded-full", g.dot)} />
            <span className="text-gray-500">{g.label}</span>
            <span className={cn("font-bold", g.header)}>{groups[g.key]?.length ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {GROUPS.map((g) => (
            <div key={g.key} className="h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {GROUPS.map((g) => {
            const cards = groups[g.key] ?? [];
            return (
              <div key={g.key} className={cn("rounded-2xl border p-3 bg-gray-50 dark:bg-gray-900/40", g.border)}>
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", g.dot)} />
                    <h3 className={cn("text-xs font-bold uppercase tracking-wide", g.header)}>{g.label}</h3>
                  </div>
                  <span className={cn("text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center",
                    cards.length > 0 ? "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200" : "text-gray-400")}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5 min-h-[120px]">
                  {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                      <Briefcase size={16} className="text-gray-300 dark:text-gray-700 mb-1" />
                      <p className="text-[10px] text-gray-300 dark:text-gray-700">Empty</p>
                    </div>
                  ) : (
                    cards.map((app) => (
                      <AppCard key={app.id} app={app} onStatusClick={setStatusApp} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Status Modal */}
      {statusApp && (
        <QuickStatusModal
          app={statusApp}
          onSave={load}
          onClose={() => setStatusApp(null)}
        />
      )}
    </div>
  );
}
