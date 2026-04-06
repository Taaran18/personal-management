"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, RefreshCw, Snowflake,
  LayoutDashboard, CalendarCheck, Star, Flame, CheckSquare, Target,
} from "lucide-react";
import { habitsApi, CalendarDay } from "@/lib/habits-api";
import StatCard from "@/components/salary/StatCard";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL    = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type CalView = "week" | "month" | "year";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekStart(d: Date) {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay()); // Sunday = 0
  s.setHours(0, 0, 0, 0);
  return s;
}

function pctColor(pct: number, frozen: boolean, isToday: boolean, large = false): string {
  const ring = isToday
    ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-950"
    : "";
  const size = large ? "text-sm" : "text-[11px]";
  if (frozen)   return cn("bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300", size, ring);
  if (pct === 0) return cn("bg-transparent text-gray-300 dark:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/60", size, ring);
  if (pct < 30)  return cn("bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300", size, ring);
  if (pct < 60)  return cn("bg-purple-200 dark:bg-purple-800/60 text-purple-700 dark:text-purple-200", size, ring);
  if (pct < 80)  return cn("bg-purple-400 dark:bg-purple-700 text-white", size, ring);
  if (pct < 100) return cn("bg-purple-500 dark:bg-purple-600 text-white", size, ring);
  return cn("bg-emerald-400 dark:bg-emerald-500 text-white font-bold", size, ring);
}

function pctLabel(pct: number, frozen: boolean) {
  if (frozen)    return "❄️ Freeze day";
  if (pct === 0) return "No habits done";
  if (pct === 100) return "Perfect day! 🎉";
  return `${pct}% complete`;
}

// ── View Toggle ───────────────────────────────────────────────────────────────

function ViewToggle({ view, onChange }: { view: CalView; onChange: (v: CalView) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
      {(["week", "month", "year"] as CalView[]).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "px-3.5 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors",
            view === v
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
      {[
        { label: "None",   cls: "bg-gray-100 dark:bg-gray-800" },
        { label: "<30%",   cls: "bg-purple-100 dark:bg-purple-900/40" },
        { label: "<60%",   cls: "bg-purple-200 dark:bg-purple-800/60" },
        { label: "<80%",   cls: "bg-purple-400 dark:bg-purple-700" },
        { label: "<100%",  cls: "bg-purple-500 dark:bg-purple-600" },
        { label: "100% ✦", cls: "bg-emerald-400 dark:bg-emerald-500" },
      ].map((l) => (
        <div key={l.label} className="flex items-center gap-1.5">
          <div className={cn("w-3.5 h-3.5 rounded-md shrink-0", l.cls)} />
          <span>{l.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ml-1">
        <div className="w-3.5 h-3.5 rounded-md bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
          <Snowflake size={8} className="text-blue-400" />
        </div>
        <span>Freeze</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3.5 h-3.5 rounded-md ring-2 ring-purple-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-950 bg-gray-100 dark:bg-gray-800 shrink-0" />
        <span>Today</span>
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────

function WeekView({ weekStart, dayMap, today }: { weekStart: Date; dayMap: Map<string, CalendarDay>; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
    <div className="grid grid-cols-7 gap-1 sm:gap-3 min-w-[560px]">
      {days.map((d) => {
        const key = fmt(d);
        const cal = dayMap.get(key);
        const isToday = key === today;
        const isFuture = key > today;
        const pct = cal?.pct ?? 0;
        const frozen = cal?.frozen ?? false;

        // Arc calculation for SVG ring
        const r = 32;
        const circ = 2 * Math.PI * r;
        const dash = isFuture ? 0 : (pct / 100) * circ;

        const ringColor =
          frozen  ? "#93c5fd" :
          pct === 100 ? "#34d399" :
          pct >= 80 ? "#a855f7" :
          pct >= 50 ? "#8b5cf6" :
          pct > 0  ? "#c4b5fd" :
          "#374151";

        return (
          <div
            key={key}
            className={cn(
              "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
              isToday
                ? "bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700"
                : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800",
              isFuture && "opacity-40"
            )}
          >
            {/* Day label */}
            <div className="text-center">
              <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-0.5",
                isToday ? "text-purple-500" : "text-gray-400")}
              >
                {DAY_NAMES[d.getDay()]}
              </p>
              <p className={cn("text-2xl font-bold",
                isToday ? "text-purple-600 dark:text-purple-400"
                : isFuture ? "text-gray-300 dark:text-gray-700"
                : "text-gray-800 dark:text-gray-100")}
              >
                {d.getDate()}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{MONTH_SHORT[d.getMonth()]}</p>
            </div>

            {/* Ring */}
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor"
                  className="text-gray-100 dark:text-gray-800" strokeWidth="6" />
                {!isFuture && (
                  <circle cx="40" cy="40" r={r} fill="none" stroke={ringColor}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                    className="transition-all duration-700" />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {frozen ? (
                  <Snowflake size={20} className="text-blue-400" />
                ) : (
                  <>
                    <span className={cn("text-lg font-bold", isFuture ? "text-gray-300 dark:text-gray-700" : "text-gray-900 dark:text-white")}>
                      {isFuture ? "—" : `${pct}%`}
                    </span>
                    {!isFuture && cal && (
                      <span className="text-[9px] text-gray-400">{cal.completed}/{cal.total}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Status label */}
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              isFuture ? "bg-gray-100 dark:bg-gray-800 text-gray-400" :
              pct === 100 ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600" :
              pct >= 80  ? "bg-purple-100 dark:bg-purple-950/40 text-purple-600" :
              pct >= 50  ? "bg-purple-50 dark:bg-purple-950/30 text-purple-500" :
              pct > 0    ? "bg-gray-100 dark:bg-gray-800 text-gray-500" :
              frozen     ? "bg-blue-100 dark:bg-blue-950/40 text-blue-500" :
              "bg-gray-100 dark:bg-gray-800 text-gray-400"
            )}>
              {isFuture ? "Upcoming" : pctLabel(pct, frozen)}
            </span>
          </div>
        );
      })}
    </div>
    </div>
  );
}

// ── Single Month View ─────────────────────────────────────────────────────────

function MonthView({ year, monthIdx, dayMap, today }: {
  year: number; monthIdx: number; dayMap: Map<string, CalendarDay>; today: string;
}) {
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`b${i}`} className="h-12" />)}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const cal = dayMap.get(key);
          const isToday = key === today;
          const isFuture = key > today;

          return (
            <div
              key={key}
              title={cal ? `${key}: ${pctLabel(cal.pct, cal.frozen)}` : key}
              className={cn(
                "relative h-12 flex flex-col items-center justify-center rounded-xl font-medium transition-all cursor-default select-none",
                isFuture
                  ? "text-gray-300 dark:text-gray-700"
                  : cal
                  ? pctColor(cal.pct, cal.frozen, isToday, true)
                  : pctColor(0, false, isToday, true)
              )}
            >
              {cal?.frozen ? (
                <>
                  <Snowflake size={11} className="opacity-70 mb-0.5" />
                  <span className="text-[10px]">{day}</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold leading-none">{day}</span>
                  {cal && cal.pct > 0 && !isFuture && (
                    <span className="text-[9px] mt-0.5 opacity-80">{cal.pct}%</span>
                  )}
                </>
              )}
              {cal?.pct === 100 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-300 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Year Grid View ────────────────────────────────────────────────────────────

function YearView({ year, dayMap, today }: { year: number; dayMap: Map<string, CalendarDay>; today: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {MONTH_NAMES.map((_, mIdx) => {
        const firstDay = new Date(year, mIdx, 1).getDay();
        const daysInMonth = new Date(year, mIdx + 1, 0).getDate();

        const monthDays: CalendarDay[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const k = `${year}-${String(mIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const c = dayMap.get(k);
          if (c) monthDays.push(c);
        }
        const activeDays  = monthDays.filter((d) => d.pct > 0);
        const perfectDays = monthDays.filter((d) => d.pct === 100).length;
        const avgPct = activeDays.length > 0
          ? Math.round(activeDays.reduce((s, d) => s + d.pct, 0) / activeDays.length) : 0;

        const hdrColor = avgPct >= 80 ? "text-emerald-500" : avgPct >= 50 ? "text-purple-500" : avgPct > 0 ? "text-blue-400" : "text-gray-400";

        return (
          <div key={mIdx} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{MONTH_NAMES[mIdx]}</h3>
              {avgPct > 0 && <span className={cn("text-xs font-semibold", hdrColor)}>{avgPct}% avg</span>}
            </div>
            <div className="grid grid-cols-7 mb-0.5">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[9px] font-semibold text-gray-400 uppercase tracking-wide py-0.5">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`b${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const key = `${year}-${String(mIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const cal = dayMap.get(key);
                const isToday = key === today;
                const isFuture = key > today;
                return (
                  <div key={key} title={cal ? `${key}: ${pctLabel(cal.pct, cal.frozen)}` : key}
                    className={cn(
                      "relative aspect-square flex items-center justify-center rounded-md text-[10px] font-medium transition-all cursor-default select-none",
                      isFuture ? "text-gray-300 dark:text-gray-700"
                      : cal ? pctColor(cal.pct, cal.frozen, isToday)
                      : pctColor(0, false, isToday)
                    )}
                  >
                    {cal?.frozen
                      ? <span className="flex flex-col items-center"><Snowflake size={7} className="opacity-70" /><span className="text-[8px]">{day}</span></span>
                      : <span>{day}</span>}
                    {cal?.pct === 100 && <span className="absolute top-0.5 right-0.5 w-1 h-1 bg-yellow-300 rounded-full" />}
                  </div>
                );
              })}
            </div>
            {monthDays.length > 0 && (
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100 dark:border-gray-800/60">
                <span className="text-[10px] text-gray-400"><span className="text-emerald-500 font-semibold">{perfectDays}</span> perfect</span>
                <span className="text-[10px] text-gray-400"><span className="text-purple-500 font-semibold">{activeDays.length}</span> active</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [view, setView]           = useState<CalView>("month");
  const [year, setYear]           = useState(new Date().getFullYear());
  const [monthIdx, setMonthIdx]   = useState(new Date().getMonth());
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [data, setData]           = useState<CalendarDay[]>([]);
  const [loading, setLoading]     = useState(true);

  const today = useMemo(() => fmt(new Date()), []);

  // Load year data when year changes
  const load = (y = year) => {
    setLoading(true);
    habitsApi.getCalendar(y)
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [year]);

  // Also load adjacent year for week view when crossing year boundary
  const weekStart = useMemo(() => getWeekStart(weekAnchor), [weekAnchor]);

  const dayMap = useMemo(() => new Map(data.map((d) => [d.date, d])), [data]);

  // ── Stats (scoped to current view period) ──────────────────────────────────
  const periodData = useMemo(() => {
    if (view === "year") return data;
    if (view === "month") {
      return data.filter((d) => {
        const dm = new Date(d.date + "T00:00:00");
        return dm.getFullYear() === year && dm.getMonth() === monthIdx;
      });
    }
    // week
    const ws = fmt(weekStart);
    const we = fmt(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6));
    return data.filter((d) => d.date >= ws && d.date <= we);
  }, [view, data, year, monthIdx, weekStart]);

  const perfectDays = periodData.filter((d) => d.pct === 100).length;
  const activeDays  = periodData.filter((d) => d.pct > 0).length;
  const frozenDays  = periodData.filter((d) => d.frozen).length;
  const avgPct = activeDays > 0
    ? Math.round(periodData.filter((d) => d.pct > 0).reduce((s, d) => s + d.pct, 0) / activeDays) : 0;

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goPrev = () => {
    if (view === "year")  setYear((y) => y - 1);
    if (view === "month") {
      if (monthIdx === 0) { setYear((y) => y - 1); setMonthIdx(11); }
      else setMonthIdx((m) => m - 1);
    }
    if (view === "week") setWeekAnchor((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
  };
  const goNext = () => {
    if (view === "year")  setYear((y) => y + 1);
    if (view === "month") {
      if (monthIdx === 11) { setYear((y) => y + 1); setMonthIdx(0); }
      else setMonthIdx((m) => m + 1);
    }
    if (view === "week") setWeekAnchor((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
  };

  const isCurrentPeriod =
    view === "year"  ? year === new Date().getFullYear() :
    view === "month" ? year === new Date().getFullYear() && monthIdx === new Date().getMonth() :
    fmt(weekStart) === fmt(getWeekStart(new Date()));

  const goToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonthIdx(now.getMonth());
    setWeekAnchor(now);
  };

  // When view changes to month/week, sync year
  useEffect(() => {
    if (view === "month" && year !== new Date().getFullYear()) {
      const targetYear = year;
      if (targetYear !== year) load(targetYear);
    }
  }, [view]);

  // When year changes due to month navigation, reload
  const prevYear = useMemo(() => year, []);
  useEffect(() => { load(year); }, [year]);

  // ── Period label ───────────────────────────────────────────────────────────
  const periodLabel =
    view === "year" ? `${year}` :
    view === "month" ? `${MONTH_NAMES[monthIdx]} ${year}` :
    (() => {
      const we = new Date(weekStart);
      we.setDate(weekStart.getDate() + 6);
      return weekStart.getMonth() === we.getMonth()
        ? `${MONTH_SHORT[weekStart.getMonth()]} ${weekStart.getDate()}–${we.getDate()}, ${year}`
        : `${MONTH_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_SHORT[we.getMonth()]} ${we.getDate()}, ${year}`;
    })();

  const subtitleLabel =
    view === "year"  ? `${perfectDays} perfect · ${activeDays} active days` :
    view === "month" ? `${MONTH_NAMES[monthIdx]} ${year} · ${activeDays} active days` :
    `Week of ${periodLabel}`;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Habit Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitleLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <Link href="/habits/dashboard" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Dashboard">
            <LayoutDashboard size={16} />
          </Link>
          <Link href="/habits/tracker" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Tracker">
            <CalendarCheck size={16} />
          </Link>
          <button onClick={() => load()} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Stat Cards (dashboard style) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Perfect Days" value={String(perfectDays)}
          sub={view === "year" ? "100% completion days" : undefined}
          icon={Star}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          trend={perfectDays > 0 ? "up" : "neutral"}
          trendLabel={perfectDays > 0 ? "🏆 Keep it up" : undefined}
        />
        <StatCard
          label="Active Days" value={String(activeDays)}
          sub="Days with any habit done"
          icon={CheckSquare}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatCard
          label="Avg Completion" value={`${avgPct}%`}
          sub="On active days"
          icon={Target}
          gradient={avgPct >= 80 ? "bg-gradient-to-br from-emerald-500 to-green-600"
            : avgPct >= 50 ? "bg-gradient-to-br from-amber-500 to-orange-500"
            : "bg-gradient-to-br from-blue-500 to-indigo-600"}
        />
        <StatCard
          label="Freeze Days" value={String(frozenDays)}
          sub="Streak protection used"
          icon={Snowflake}
          gradient="bg-gradient-to-br from-sky-500 to-blue-600"
        />
      </div>

      {/* ── Navigator + Legend row ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigator */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-1.5">
          <button onClick={goPrev} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center min-w-[160px]">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{periodLabel}</p>
            {isCurrentPeriod && <p className="text-[10px] text-purple-500 font-semibold leading-tight">Current {view}</p>}
          </div>
          <button onClick={goNext} disabled={isCurrentPeriod}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors">
            <ChevronRight size={16} />
          </button>
          {!isCurrentPeriod && (
            <button onClick={goToday}
              className="ml-1 text-[11px] font-semibold text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors border-l border-gray-200 dark:border-gray-700">
              Today
            </button>
          )}
        </div>
        <Legend />
      </div>

      {/* ── Calendar Content ─────────────────────────────────────────────── */}
      {loading ? (
        <div className={cn(
          "grid gap-4",
          view === "week"  ? "grid-cols-7 min-w-[560px] overflow-x-auto" :
          view === "month" ? "grid-cols-1" :
          "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        )}>
          {Array.from({ length: view === "week" ? 7 : view === "month" ? 1 : 12 }).map((_, i) => (
            <div key={i} className={cn("bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse",
              view === "week" ? "h-64" : view === "month" ? "h-96" : "h-52")} />
          ))}
        </div>
      ) : view === "week" ? (
        <WeekView weekStart={weekStart} dayMap={dayMap} today={today} />
      ) : view === "month" ? (
        <MonthView year={year} monthIdx={monthIdx} dayMap={dayMap} today={today} />
      ) : (
        <YearView year={year} dayMap={dayMap} today={today} />
      )}
    </div>
  );
}
