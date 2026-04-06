"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Check, Pencil, Trash2,
  X, Save, RefreshCw, LayoutDashboard, Flame, CheckSquare, Calendar, Snowflake,
} from "lucide-react";
import { habitsApi, Habit, HABIT_COLORS, HabitLogInfo } from "@/lib/habits-api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

// ─── Date Helpers ─────────────────────────────────────────────────────────

function toLocalDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDates(anchor: Date): Date[] {
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatWeekLabel(days: Date[]) {
  const s = days[0];
  const e = days[6];
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}, ${e.getFullYear()}`;
}

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// ─── Add / Edit Habit Modal ────────────────────────────────────────────────

function HabitFormModal({ habit, onSave, onClose }: {
  habit?: Habit;
  onSave: (name: string, color: string, description: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(habit?.name ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(name.trim(), color, description.trim()); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 dark:text-white">{habit ? "Edit Habit" : "New Habit"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Habit Name</label>
            <input
              type="text"
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-white"
              placeholder="e.g. Wake Up Early (5 AM)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Description <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <textarea
              rows={2}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-white resize-none"
              placeholder="e.g. Drink 2 litres of water daily"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={cn("w-7 h-7 rounded-full transition-transform hover:scale-110",
                    color === c && "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!name.trim() || saving}
            className="flex-1 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-1.5">
            <Save size={14} />{saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function TrackerPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [lookup, setLookup] = useState<Record<string, Record<string, HabitLogInfo>>>({});
  const [freezes, setFreezes] = useState<Record<string, Record<string, boolean>>>({});
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [freezing, setFreezing] = useState<Set<string>>(new Set());

  const [showAddModal, setShowAddModal] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [deleteHabitId, setDeleteHabitId] = useState<string | null>(null);

  const weekDays = getWeekDates(anchorDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateString(today);

  const isCurrentWeek = toLocalDateString(weekDays[0]) === toLocalDateString(getWeekDates(today)[0]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [habitsRes, logsRes] = await Promise.all([
        habitsApi.getHabits(),
        habitsApi.getLogs(toLocalDateString(weekDays[0]), toLocalDateString(weekDays[6])),
      ]);
      setHabits(habitsRes.data.data);
      setLookup(logsRes.data.lookup ?? {});
      // Flatten freezes: { habitId: { dateStr: true } }
      const flatFreezes: Record<string, Record<string, boolean>> = {};
      for (const [hId, dates] of Object.entries(logsRes.data.freezes ?? {})) {
        flatFreezes[hId] = {};
        for (const [ds, info] of Object.entries(dates as any)) {
          flatFreezes[hId][ds] = (info as any).frozen;
        }
      }
      setFreezes(flatFreezes);
    } finally {
      setLoading(false);
    }
  }, [toLocalDateString(weekDays[0])]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggle = async (habitId: string, dateStr: string) => {
    const cellDate = new Date(dateStr + "T00:00:00");
    if (cellDate > today) return;
    const key = `${habitId}-${dateStr}`;
    if (toggling.has(key)) return;
    const current = lookup[habitId]?.[dateStr]?.completed ?? false;
    const next = !current;
    setLookup((prev) => ({ ...prev, [habitId]: { ...prev[habitId], [dateStr]: { ...prev[habitId]?.[dateStr], completed: next } } }));
    setToggling((prev) => new Set(prev).add(key));
    try { await habitsApi.toggleLog(habitId, dateStr, next); }
    catch { setLookup((prev) => ({ ...prev, [habitId]: { ...prev[habitId], [dateStr]: { ...prev[habitId]?.[dateStr], completed: current } } })); }
    finally { setToggling((prev) => { const s = new Set(prev); s.delete(key); return s; }); }
  };

  const handleFreeze = async (habitId: string, dateStr: string) => {
    const key = `${habitId}-${dateStr}`;
    if (freezing.has(key)) return;
    const current = freezes[habitId]?.[dateStr] ?? false;
    setFreezes((prev) => ({ ...prev, [habitId]: { ...prev[habitId], [dateStr]: !current } }));
    setFreezing((prev) => new Set(prev).add(key));
    try { await habitsApi.toggleFreeze(habitId, dateStr); }
    catch { setFreezes((prev) => ({ ...prev, [habitId]: { ...prev[habitId], [dateStr]: current } })); }
    finally { setFreezing((prev) => { const s = new Set(prev); s.delete(key); return s; }); }
  };

  const handleAddHabit = async (name: string, color: string, description: string) => {
    await habitsApi.createHabit({ name, color, description: description || undefined, sort_order: habits.length });
    await loadData();
  };
  const handleEditHabit = async (name: string, color: string, description: string) => {
    if (!editHabit) return;
    await habitsApi.updateHabit(editHabit.id, { name, color, description: description || undefined });
    await loadData();
  };
  const handleDeleteHabit = async () => {
    if (!deleteHabitId) return;
    await habitsApi.deleteHabit(deleteHabitId);
    setDeleteHabitId(null);
    await loadData();
  };

  const daySummary = weekDays.map((d) => {
    const ds = toLocalDateString(d);
    const done = habits.filter((h) => lookup[h.id]?.[ds]?.completed).length;
    return { done, total: habits.length, pct: habits.length ? Math.round(done / habits.length * 100) : 0 };
  });

  const todayDone = habits.filter((h) => lookup[h.id]?.[todayStr]?.completed).length;
  const todayPct = habits.length ? Math.round(todayDone / habits.length * 100) : 0;
  const weekTotalDone = daySummary.filter((_, i) => weekDays[i] <= today).reduce((acc, s) => acc + s.done, 0);
  const weekTotalPossible = daySummary.filter((_, i) => weekDays[i] <= today).reduce((acc, s) => acc + s.total, 0);
  const weekPct = weekTotalPossible > 0 ? Math.round(weekTotalDone / weekTotalPossible * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Habit Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isCurrentWeek ? `Today: ${todayDone}/${habits.length} done (${todayPct}%)` : "Past week"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/habits/dashboard" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Dashboard">
            <LayoutDashboard size={16} />
          </Link>
          <button onClick={loadData} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors">
            <Plus size={15} /> Add Habit
          </button>
        </div>
      </div>

      {/* Top mini stat cards + Week Nav in one row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Week Navigation — spans 2 cols */}
        <div className="lg:col-span-2 flex items-center justify-between bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-4">
          <button
            onClick={() => setAnchorDate((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatWeekLabel(weekDays)}</p>
            {isCurrentWeek && <span className="text-xs text-purple-500 font-semibold">Current Week</span>}
          </div>
          <button
            onClick={() => setAnchorDate((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })}
            disabled={isCurrentWeek}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Today stat */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Today</span>
            <CheckSquare size={14} className={todayPct === 100 ? "text-emerald-500" : todayPct >= 60 ? "text-amber-500" : "text-purple-500"} />
          </div>
          <p className={cn("text-2xl font-bold mb-1",
            todayPct === 100 ? "text-emerald-500" : todayPct >= 60 ? "text-amber-500" : "text-purple-500")}>
            {todayDone}/{habits.length}
          </p>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all",
              todayPct === 100 ? "bg-emerald-500" : todayPct >= 60 ? "bg-amber-500" : "bg-purple-500")}
              style={{ width: `${todayPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{todayPct}% complete</p>
        </div>

        {/* Week stat */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">This Week</span>
            <Calendar size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-500 mb-1">{weekPct}%</p>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${weekPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{weekTotalDone}/{weekTotalPossible} checks done</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto -mx-0">
        {/* Column headers */}
        <div className="grid border-b border-gray-100 dark:border-gray-800 min-w-[620px]" style={{ gridTemplateColumns: "minmax(180px,1fr) repeat(7, minmax(60px, 80px))" }}>
          <div className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-widest">Habit</div>
          {weekDays.map((d, i) => {
            const ds = toLocalDateString(d);
            const isToday = ds === todayStr;
            const isFuture = d > today;
            return (
              <div key={ds} className={cn(
                "flex flex-col items-center justify-center py-3 border-l border-gray-100 dark:border-gray-800",
                isToday && "bg-purple-50 dark:bg-purple-950/20"
              )}>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest",
                  isToday ? "text-purple-500" : "text-gray-400")}>
                  {DAY_LABELS[i]}
                </span>
                <span className={cn("text-sm font-bold mt-0.5",
                  isToday ? "text-purple-600 dark:text-purple-400"
                  : isFuture ? "text-gray-300 dark:text-gray-700"
                  : "text-gray-700 dark:text-gray-300")}>
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Habit rows */}
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : habits.length === 0 ? (
          <div className="p-16 text-center">
            <CheckSquare size={40} className="mx-auto text-gray-200 dark:text-gray-800 mb-3" />
            <p className="text-sm text-gray-400 mb-3">No habits yet. Add your first one!</p>
            <button onClick={() => setShowAddModal(true)}
              className="text-sm font-semibold text-purple-600 hover:text-purple-700">
              + Add Habit
            </button>
          </div>
        ) : (
          habits.map((habit, hIdx) => (
            <div key={habit.id}
              className={cn("grid group items-center min-w-[620px]", hIdx < habits.length - 1 && "border-b border-gray-50 dark:border-gray-900/70")}
              style={{ gridTemplateColumns: "minmax(180px,1fr) repeat(7, minmax(60px, 80px))" }}>
              {/* Habit label */}
              <div className="flex items-center gap-3 px-5 py-4 min-w-0">
                <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: habit.color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate block leading-tight">
                    {habit.name}
                  </span>
                  {habit.description && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate block mt-0.5 leading-tight">
                      {habit.description}
                    </span>
                  )}
                </div>
                <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditHabit(habit)}
                    className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeleteHabitId(habit.id)}
                    className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Day cells */}
              {weekDays.map((d) => {
                const ds = toLocalDateString(d);
                const isToday = ds === todayStr;
                const isFuture = d > today;
                const done = lookup[habit.id]?.[ds]?.completed ?? false;
                const frozen = freezes[habit.id]?.[ds] ?? false;
                const notes = lookup[habit.id]?.[ds]?.notes;
                const isToggling = toggling.has(`${habit.id}-${ds}`);
                return (
                  <div key={ds} className={cn(
                    "flex items-center justify-center border-l border-gray-50 dark:border-gray-900/70 py-4 group/cell relative",
                    isToday && "bg-purple-50 dark:bg-purple-950/20"
                  )}>
                    {frozen && !done ? (
                      // Freeze indicator
                      <button
                        onClick={() => handleFreeze(habit.id, ds)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-950/40 border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        title="Streak freeze — click to remove"
                      >
                        <Snowflake size={14} className="text-blue-500" />
                      </button>
                    ) : (
                      <div className="relative">
                        <button
                          onClick={() => handleToggle(habit.id, ds)}
                          disabled={isFuture || isToggling}
                          className={cn(
                            "w-9 h-9 rounded-xl transition-all duration-150 flex items-center justify-center",
                            isFuture
                              ? "opacity-10 cursor-not-allowed border-2 border-dashed border-gray-300 dark:border-gray-700"
                              : done
                              ? "shadow-sm scale-95"
                              : "border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:scale-105 transition-transform"
                          )}
                          style={done ? { backgroundColor: habit.color, borderColor: habit.color } : {}}
                          title={notes ? `Note: ${notes}` : undefined}
                        >
                          {done && <Check size={15} className="text-white" strokeWidth={3} />}
                        </button>
                        {/* Freeze shortcut on right-click / long-press visual — show on hover for past days */}
                        {!isFuture && !done && (
                          <button
                            onClick={() => handleFreeze(habit.id, ds)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity hover:bg-blue-200 z-10"
                            title="Add streak freeze"
                          >
                            <Snowflake size={8} className="text-blue-500" />
                          </button>
                        )}
                        {notes && done && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-400" title={`Note: ${notes}`} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Summary row */}
        {!loading && habits.length > 0 && (
          <div className="grid border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 min-w-[620px]"
            style={{ gridTemplateColumns: "minmax(180px,1fr) repeat(7, minmax(60px, 80px))" }}>
            <div className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Done</div>
            {daySummary.map((s, i) => {
              const ds = toLocalDateString(weekDays[i]);
              const isToday = ds === todayStr;
              const isFuture = weekDays[i] > today;
              return (
                <div key={ds} className={cn(
                  "flex flex-col items-center justify-center border-l border-gray-100 dark:border-gray-800 py-2.5",
                  isToday && "bg-purple-50 dark:bg-purple-950/20"
                )}>
                  {isFuture ? (
                    <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                  ) : (
                    <>
                      <span className={cn("text-sm font-bold",
                        s.pct === 100 ? "text-emerald-500"
                        : s.pct >= 60 ? "text-amber-500"
                        : "text-gray-400 dark:text-gray-500")}>
                        {s.done}/{s.total}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{s.pct}%</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>{/* end overflow-x-auto */}
      </div>

      {/* Modals */}
      {showAddModal && <HabitFormModal onSave={handleAddHabit} onClose={() => setShowAddModal(false)} />}
      {editHabit && <HabitFormModal habit={editHabit} onSave={handleEditHabit} onClose={() => setEditHabit(null)} />}
      <ConfirmDeleteModal
        open={deleteHabitId !== null}
        title="Delete this habit?"
        message="All logs for this habit will also be deleted. This cannot be undone."
        onConfirm={handleDeleteHabit}
        onCancel={() => setDeleteHabitId(null)}
      />
    </div>
  );
}
