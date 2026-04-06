"use client";

import { useEffect, useState } from "react";
import { RefreshCw, LayoutDashboard, List, Star, MapPin, Briefcase, Scale } from "lucide-react";
import { jobsApi, JobApplication, OffersData, statusColor } from "@/lib/jobs-api";
import Link from "next/link";
import { cn } from "@/lib/utils";
import StatCard from "@/components/salary/StatCard";

const fmt = (n?: number | null) => n != null ? `₹${(n / 100000).toFixed(1)}L` : "—";

function CompareCard({ app }: { app: JobApplication }) {
  const diff = app.salary_offered && app.salary_expected
    ? app.salary_offered - app.salary_expected : null;

  return (
    <div className={cn(
      "rounded-2xl border p-5 flex flex-col gap-4",
      app.current_status === "Offer Accepted"  ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20" :
      app.current_status === "Offer Declined"  ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20" :
      "border-green-300 dark:border-green-800 bg-white dark:bg-gray-950"
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">{app.company_name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white truncate">{app.company_name}</h3>
          <p className="text-xs text-gray-500 truncate">{app.job_title}</p>
        </div>
        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0", statusColor(app.current_status))}>
          {app.current_status}
        </span>
      </div>

      {/* Salary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Expected</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(app.salary_expected)}</p>
        </div>
        <div className={cn("p-3 rounded-xl", app.salary_offered ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-gray-50 dark:bg-gray-900")}>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Offered</p>
          <p className={cn("text-lg font-bold", app.salary_offered ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400")}>
            {fmt(app.salary_offered)}
          </p>
        </div>
      </div>

      {/* Diff badge */}
      {diff != null && (
        <div className={cn(
          "text-center text-xs font-bold py-1.5 rounded-lg",
          diff >= 0 ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
        )}>
          {diff >= 0 ? `+${fmt(diff)} above expectation` : `${fmt(Math.abs(diff))} below expectation`}
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
        {[
          { label: "Location", value: app.location },
          { label: "Work Mode", value: app.work_mode },
          { label: "Job Type", value: app.job_type },
          { label: "Source", value: app.source },
          { label: "Applied", value: app.application_date },
          { label: "Follow-up", value: app.follow_up_date ?? "—" },
        ].map((f) => (
          <div key={f.label} className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{f.label}</span>
            <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{f.value ?? "—"}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {app.notes && (
        <p className="text-xs text-gray-500 italic border-t border-gray-100 dark:border-gray-800 pt-3">{app.notes}</p>
      )}
    </div>
  );
}

export default function OffersPage() {
  const [data, setData]     = useState<OffersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    jobsApi.getOffers()
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else if (s.size < 3) s.add(id);
      return s;
    });
  };

  const compareOffers = data?.data.filter((o) => selectedIds.has(o.id)) ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Offers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {data?.summary.total ?? 0} offers · {data?.summary.accepted ?? 0} accepted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/jobs/dashboard" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><LayoutDashboard size={16} /></Link>
          <Link href="/jobs/applications" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><List size={16} /></Link>
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><RefreshCw size={16} /></button>
          {(data?.count ?? 0) > 1 && (
            <button
              onClick={() => { setCompareMode(!compareMode); setSelectedIds(new Set()); }}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors",
                compareMode ? "bg-pink-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <Scale size={14} /> {compareMode ? "Cancel Compare" : "Compare"}
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Offers"    value={String(data.summary.total)}    icon={Star}     gradient="bg-gradient-to-br from-pink-500 to-rose-600" />
          <StatCard label="Accepted"        value={String(data.summary.accepted)} icon={Star}     gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
          <StatCard label="Pending Decision" value={String(data.summary.pending)} icon={Briefcase} gradient="bg-gradient-to-br from-amber-500 to-orange-500" />
          <StatCard label="Avg Salary (₹)"
            value={data.summary.avg_salary_offered != null ? `${(data.summary.avg_salary_offered / 100000).toFixed(1)}L` : "—"}
            icon={Scale}
            gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-72 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : !data || data.count === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <Star size={32} className="text-gray-300 dark:text-gray-700" />
          <p className="text-sm text-gray-400">No offers yet — keep going! 🚀</p>
        </div>
      ) : (
        <>
          {/* Compare panel */}
          {compareMode && (
            <div className="p-4 rounded-2xl bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800">
              <p className="text-sm font-medium text-pink-700 dark:text-pink-300">
                {selectedIds.size === 0 ? "Click offers below to compare (up to 3)" :
                 selectedIds.size === 1 ? "Select 1 or 2 more to compare" :
                 `Comparing ${selectedIds.size} offers`}
              </p>
            </div>
          )}

          {/* Compare cards */}
          {compareMode && compareOffers.length >= 2 && (
            <div>
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Scale size={14} className="text-pink-500" /> Side-by-Side Comparison
              </h2>
              <div className={cn("grid gap-4", compareOffers.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3")}>
                {compareOffers.map((o) => <CompareCard key={o.id} app={o} />)}
              </div>
            </div>
          )}

          {/* All offers */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
              All Offers ({data.count})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {data.data.map((offer) => (
                <div key={offer.id}
                  onClick={() => compareMode && toggleSelect(offer.id)}
                  className={cn(compareMode && "cursor-pointer")}>
                  {compareMode && (
                    <div className={cn(
                      "mb-1 text-xs text-center font-semibold py-1 rounded-lg transition-colors",
                      selectedIds.has(offer.id)
                        ? "bg-pink-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    )}>
                      {selectedIds.has(offer.id) ? "✓ Selected" : "Click to select"}
                    </div>
                  )}
                  <CompareCard app={offer} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
