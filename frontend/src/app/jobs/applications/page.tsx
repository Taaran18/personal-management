"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus, Search, RefreshCw, ExternalLink, Pencil, Trash2, X, Save,
  ChevronUp, ChevronDown, LayoutDashboard, Kanban, Tag, Calendar,
  ClipboardList, Clock, CheckCircle, XCircle,
} from "lucide-react";
import {
  jobsApi, JobApplication, InterviewNote, StageLog,
  JOB_STAGES, JOB_SOURCES, JOB_TYPES, WORK_MODES,
  INTERVIEW_TYPES, INTERVIEW_OUTCOMES,
  statusColor, sourceColor, tagColor, outcomeColor,
} from "@/lib/jobs-api";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput("");
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className={cn("flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", tagColor(t))}>
            {t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:opacity-70"><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          placeholder="e.g. Dream Job, Startup (press Enter)"
          className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-500 text-gray-900 dark:text-white"
        />
        <button onClick={add} className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700">Add</button>
      </div>
    </div>
  );
}

// ─── Application Form Modal ───────────────────────────────────────────────────

type FormMode = "create" | "edit";

const EMPTY_FORM = {
  company_name: "", job_title: "", job_url: "", source: "LinkedIn",
  current_status: "Applied", application_date: new Date().toISOString().split("T")[0],
  interview_rounds_done: 0, contact_name: "", contact_email: "",
  location: "", job_type: "Full-time", work_mode: "Hybrid",
  salary_expected: "" as string | number, salary_offered: "" as string | number,
  notes: "", follow_up_date: "", tags: [] as string[],
};

function AppFormModal({ mode, initial, onSave, onClose }: {
  mode: FormMode; initial?: JobApplication; onSave: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState(
    initial
      ? { ...EMPTY_FORM, ...initial, salary_expected: initial.salary_expected ?? "", salary_offered: initial.salary_offered ?? "", follow_up_date: initial.follow_up_date ?? "", tags: initial.tags ?? [] }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.company_name.trim() || !form.job_title.trim()) {
      setError("Company name and job title are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        ...form,
        salary_expected:  form.salary_expected !== "" ? Number(form.salary_expected) : undefined,
        salary_offered:   form.salary_offered !== "" ? Number(form.salary_offered) : undefined,
        job_url:          form.job_url || undefined,
        contact_name:     form.contact_name || undefined,
        contact_email:    form.contact_email || undefined,
        location:         form.location || undefined,
        notes:            form.notes || undefined,
        follow_up_date:   form.follow_up_date || undefined,
        tags:             form.tags,
      };
      if (mode === "edit" && initial) await jobsApi.updateApplication(initial.id, payload);
      else await jobsApi.createApplication(payload);
      onSave();
      onClose();
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-500 text-gray-900 dark:text-white";
  const Field = ({ label, children, span2 = false }: { label: string; children: React.ReactNode; span2?: boolean }) => (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">{mode === "edit" ? "Edit Application" : "Add Application"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Company Name *"><input className={inputCls} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="e.g. Google" /></Field>
          <Field label="Job Title *"><input className={inputCls} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="e.g. Frontend Engineer" /></Field>
          <Field label="Job URL"><input className={inputCls} value={form.job_url as string} onChange={(e) => set("job_url", e.target.value)} placeholder="https://..." /></Field>
          <Field label="Application Date"><input type="date" className={inputCls} value={form.application_date} onChange={(e) => set("application_date", e.target.value)} /></Field>
          <Field label="Source">
            <select className={inputCls + " cursor-pointer"} value={form.source} onChange={(e) => set("source", e.target.value)}>
              {JOB_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls + " cursor-pointer"} value={form.current_status} onChange={(e) => set("current_status", e.target.value)}>
              {JOB_STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Job Type">
            <select className={inputCls + " cursor-pointer"} value={form.job_type} onChange={(e) => set("job_type", e.target.value)}>
              {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Work Mode">
            <select className={inputCls + " cursor-pointer"} value={form.work_mode} onChange={(e) => set("work_mode", e.target.value)}>
              {WORK_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Location"><input className={inputCls} value={form.location as string} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Bangalore, Remote" /></Field>
          <Field label="Follow-up Date"><input type="date" className={inputCls} value={form.follow_up_date as string} onChange={(e) => set("follow_up_date", e.target.value)} /></Field>
          <Field label="Interview Rounds Done"><input type="number" min={0} className={inputCls} value={form.interview_rounds_done} onChange={(e) => set("interview_rounds_done", Number(e.target.value))} /></Field>
          <Field label="Expected Salary (₹)"><input type="number" className={inputCls} value={form.salary_expected as string} onChange={(e) => set("salary_expected", e.target.value)} placeholder="e.g. 1500000" /></Field>
          <Field label="Offered Salary (₹)"><input type="number" className={inputCls} value={form.salary_offered as string} onChange={(e) => set("salary_offered", e.target.value)} placeholder="If offer received" /></Field>
          <Field label="Contact Name"><input className={inputCls} value={form.contact_name as string} onChange={(e) => set("contact_name", e.target.value)} placeholder="Recruiter name" /></Field>
          <Field label="Contact Email"><input className={inputCls} value={form.contact_email as string} onChange={(e) => set("contact_email", e.target.value)} placeholder="recruiter@company.com" /></Field>
          <Field label="Tags" span2>
            <TagInput tags={form.tags} onChange={(t) => set("tags", t)} />
          </Field>
          <Field label="Notes" span2>
            <textarea rows={3} className={inputCls + " resize-none"} value={form.notes as string} onChange={(e) => set("notes", e.target.value)} placeholder="Interview prep, feedback, next steps..." />
          </Field>
        </div>

        {error && <p className="px-5 text-xs text-red-500 pb-1">{error}</p>}
        <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded-xl flex items-center justify-center gap-2">
            <Save size={14} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Interview Form ───────────────────────────────────────────────────────────

const EMPTY_INTERVIEW = {
  interview_date: "", interview_time: "", interview_type: "Video",
  round_number: 1, interviewer_name: "", prep_notes: "", questions_asked: "", outcome: "Pending", feedback: "",
};

function InterviewForm({ appId, initial, onSave, onCancel }: {
  appId: string; initial?: InterviewNote; onSave: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState(initial ? { ...EMPTY_INTERVIEW, ...initial } : EMPTY_INTERVIEW);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 text-gray-900 dark:text-white";

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        application_id:  appId,
        interview_date:  form.interview_date || undefined,
        interview_time:  form.interview_time || undefined,
        interviewer_name: form.interviewer_name || undefined,
      };
      if (initial) await jobsApi.updateInterview(initial.id, payload);
      else await jobsApi.createInterview(payload);
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-pink-200 dark:border-pink-800/50 bg-pink-50 dark:bg-pink-950/20 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase font-semibold">Round #</label>
          <input type="number" min={1} className={inputCls} value={form.round_number} onChange={(e) => set("round_number", Number(e.target.value))} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase font-semibold">Type</label>
          <select className={inputCls} value={form.interview_type} onChange={(e) => set("interview_type", e.target.value)}>
            {INTERVIEW_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase font-semibold">Date</label>
          <input type="date" className={inputCls} value={form.interview_date as string} onChange={(e) => set("interview_date", e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase font-semibold">Time</label>
          <input className={inputCls} value={form.interview_time as string} onChange={(e) => set("interview_time", e.target.value)} placeholder="e.g. 3:00 PM IST" />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-gray-400 uppercase font-semibold">Interviewer</label>
          <input className={inputCls} value={form.interviewer_name as string} onChange={(e) => set("interviewer_name", e.target.value)} placeholder="Name / role" />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase font-semibold">Outcome</label>
          <select className={inputCls} value={form.outcome} onChange={(e) => set("outcome", e.target.value)}>
            {INTERVIEW_OUTCOMES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-gray-400 uppercase font-semibold">Prep Notes</label>
        <textarea rows={2} className={inputCls + " resize-none"} value={form.prep_notes as string} onChange={(e) => set("prep_notes", e.target.value)} placeholder="Topics to study, key points..." />
      </div>
      <div>
        <label className="text-[10px] text-gray-400 uppercase font-semibold">Questions Asked</label>
        <textarea rows={2} className={inputCls + " resize-none"} value={form.questions_asked as string} onChange={(e) => set("questions_asked", e.target.value)} placeholder="Record Q&As here..." />
      </div>
      <div>
        <label className="text-[10px] text-gray-400 uppercase font-semibold">Feedback</label>
        <input className={inputCls} value={form.feedback as string} onChange={(e) => set("feedback", e.target.value)} placeholder="Feedback received..." />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg font-medium">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-1.5 text-xs bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium disabled:opacity-50">
          {saving ? "Saving…" : initial ? "Update" : "Add"}
        </button>
      </div>
    </div>
  );
}

// ─── Detail Drawer (Stage Logs + Interviews) ──────────────────────────────────

function DetailDrawer({ app, onClose }: { app: JobApplication; onClose: () => void }) {
  const [tab, setTab]     = useState<"logs" | "interviews">("logs");
  const [logs, setLogs]   = useState<StageLog[]>([]);
  const [interviews, setInterviews] = useState<InterviewNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState<InterviewNote | null>(null);

  const loadLogs = () => jobsApi.getStageLogs(app.id).then((r) => setLogs(r.data.data));
  const loadInterviews = () => jobsApi.getInterviews(app.id).then((r) => setInterviews(r.data.data));

  useEffect(() => {
    Promise.all([loadLogs(), loadInterviews()]).finally(() => setLoading(false));
  }, [app.id]);

  const handleDeleteInterview = async (id: string) => {
    await jobsApi.deleteInterview(id);
    loadInterviews();
  };

  const OUTCOME_ICON = {
    Passed: <CheckCircle size={12} className="text-emerald-500" />,
    Failed: <XCircle size={12} className="text-red-500" />,
    Pending: <Clock size={12} className="text-gray-400" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white truncate">{app.company_name}</h3>
            <p className="text-xs text-gray-500 truncate">{app.job_title}</p>
            {app.tags && app.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {app.tags.map((t) => (
                  <span key={t} className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", tagColor(t))}>{t}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0">
          {([
            { key: "logs",       label: "Stage History", icon: ClipboardList },
            { key: "interviews", label: "Interviews",    icon: Calendar },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn("flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-3 border-b-2 transition-colors",
                tab === key ? "border-pink-500 text-pink-600 dark:text-pink-400" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300")}>
              <Icon size={13} />{label}
              {key === "interviews" && interviews.length > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-pink-100 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 text-[10px] flex items-center justify-center">
                  {interviews.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? <p className="text-sm text-gray-400">Loading…</p> : tab === "logs" ? (
            /* Stage Log Timeline */
            logs.length === 0 ? <p className="text-sm text-gray-400">No logs yet.</p> : (
              <div>
                {logs.map((log, i) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-pink-500 shrink-0 mt-0.5" />
                      {i < logs.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-800 my-1 min-h-[20px]" />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{log.stage}</p>
                      <p className="text-xs text-gray-400">
                        {log.date_of_update}
                        {(log.days_since_prev ?? 0) > 0 && <span className="ml-2 text-purple-400">+{log.days_since_prev}d</span>}
                      </p>
                      {log.notes && <p className="text-xs text-gray-500 mt-0.5">{log.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Interview Notes */
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Interview Rounds</span>
                {!showForm && (
                  <button onClick={() => { setShowForm(true); setEditNote(null); }}
                    className="text-xs font-semibold text-pink-500 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add Round
                  </button>
                )}
              </div>

              {showForm && !editNote && (
                <div className="mb-4">
                  <InterviewForm appId={app.id} onSave={() => { setShowForm(false); loadInterviews(); }} onCancel={() => setShowForm(false)} />
                </div>
              )}

              {interviews.length === 0 && !showForm ? (
                <p className="text-sm text-gray-400">No interview notes yet. Add your first round!</p>
              ) : (
                <div className="space-y-3">
                  {interviews.map((note) => (
                    <div key={note.id} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                      {editNote?.id === note.id ? (
                        <div className="p-2">
                          <InterviewForm appId={app.id} initial={note}
                            onSave={() => { setEditNote(null); loadInterviews(); }}
                            onCancel={() => setEditNote(null)} />
                        </div>
                      ) : (
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-white">Round {note.round_number}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">{note.interview_type}</span>
                              <div className="flex items-center gap-0.5">
                                {OUTCOME_ICON[note.outcome as keyof typeof OUTCOME_ICON]}
                                <span className={cn("text-[10px] font-semibold", outcomeColor(note.outcome))}>{note.outcome}</span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => setEditNote(note)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><Pencil size={11} /></button>
                              <button onClick={() => handleDeleteInterview(note.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={11} /></button>
                            </div>
                          </div>
                          {note.interview_date && <p className="text-[11px] text-gray-400 mb-1">📅 {note.interview_date}{note.interview_time && ` · ${note.interview_time}`}</p>}
                          {note.interviewer_name && <p className="text-[11px] text-gray-500 mb-1">👤 {note.interviewer_name}</p>}
                          {note.prep_notes && (
                            <div className="mt-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Prep Notes</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{note.prep_notes}</p>
                            </div>
                          )}
                          {note.questions_asked && (
                            <div className="mt-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Questions Asked</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{note.questions_asked}</p>
                            </div>
                          )}
                          {note.feedback && (
                            <div className="mt-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Feedback</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{note.feedback}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortKey = "application_date" | "company_name" | "current_status" | "days_since_last_update";

export default function ApplicationsPage() {
  const [apps, setApps]       = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editApp, setEditApp]     = useState<JobApplication | null>(null);
  const [detailApp, setDetailApp] = useState<JobApplication | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterTag, setFilterTag]       = useState("");
  const [sortKey, setSortKey]           = useState<SortKey>("application_date");
  const [sortAsc, setSortAsc]           = useState(false);

  const load = () => {
    setLoading(true);
    jobsApi.getApplications().then((r) => setApps(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const s = new Set<string>();
    apps.forEach((a) => (a.tags ?? []).forEach((t) => s.add(t)));
    return [...s].sort();
  }, [apps]);

  const handleDelete = async (id: string) => {
    await jobsApi.deleteApplication(id);
    setDeleteId(null);
    load();
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => sortKey !== k ? null : sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;

  const filtered = useMemo(() => {
    let list = apps;
    if (search) list = list.filter((a) =>
      a.company_name.toLowerCase().includes(search.toLowerCase()) ||
      a.job_title.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus) list = list.filter((a) => a.current_status === filterStatus);
    if (filterSource) list = list.filter((a) => a.source === filterSource);
    if (filterTag)    list = list.filter((a) => (a.tags ?? []).includes(filterTag));
    return [...list].sort((a, b) => {
      const va = (a as any)[sortKey] ?? 0;
      const vb = (b as any)[sortKey] ?? 0;
      return sortAsc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });
  }, [apps, search, filterStatus, filterSource, filterTag, sortKey, sortAsc]);

  const selectCls = "text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-500";
  const hasFilters = !!(filterStatus || filterSource || search || filterTag);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{apps.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/jobs/dashboard" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><LayoutDashboard size={16} /></Link>
          <Link href="/jobs/pipeline"  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><Kanban size={16} /></Link>
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><RefreshCw size={16} /></button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm font-medium bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-xl transition-colors">
            <Plus size={15} /> Add Application
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-500 text-gray-900 dark:text-white"
            placeholder="Search company or role…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={selectCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {JOB_STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={selectCls} value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          {JOB_SOURCES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {allTags.length > 0 && (
          <select className={selectCls} value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
            <option value="">All Tags</option>
            {allTags.map((t) => <option key={t}>{t}</option>)}
          </select>
        )}
        {hasFilters && (
          <button onClick={() => { setSearch(""); setFilterStatus(""); setFilterSource(""); setFilterTag(""); }}
            className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X size={12} /> Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-400 uppercase tracking-widest">
                {[
                  { label: "Company / Role", key: "company_name" as SortKey },
                  { label: "Status",         key: "current_status" as SortKey },
                  { label: "Source",         key: null },
                  { label: "Applied",        key: "application_date" as SortKey },
                  { label: "Last Update",    key: "days_since_last_update" as SortKey },
                  { label: "Tags",           key: null },
                  { label: "Follow-up",      key: null },
                  { label: "",              key: null },
                ].map((col, i) => (
                  <th key={i}
                    className={cn("px-4 py-3.5 text-left font-bold whitespace-nowrap", col.key && "cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 select-none")}
                    onClick={() => col.key && handleSort(col.key)}>
                    <span className="flex items-center gap-1">{col.label}{col.key && <SortIcon k={col.key} />}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <p className="text-gray-400 mb-2">No applications found.</p>
                  <button onClick={() => setShowForm(true)} className="text-pink-500 text-sm font-medium hover:underline">+ Add Application</button>
                </td></tr>
              ) : filtered.map((app) => (
                <tr key={app.id}
                  className={cn("group border-b border-gray-50 dark:border-gray-900/70 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors",
                    app.is_stale && "bg-amber-50/50 dark:bg-amber-950/10")}>

                  {/* Company / Role */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">{app.company_name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <button onClick={() => setDetailApp(app)}
                          className="text-sm font-semibold text-gray-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 truncate block max-w-[160px] text-left">
                          {app.company_name}
                        </button>
                        <p className="text-xs text-gray-500 truncate max-w-[160px]">{app.job_title}</p>
                      </div>
                      {app.job_url && (
                        <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-pink-500 transition-all">
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap", statusColor(app.current_status))}>
                      {app.current_status}
                    </span>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3.5">
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", sourceColor(app.source))}>
                      {app.source}
                    </span>
                  </td>

                  {/* Applied date */}
                  <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                    {app.application_date}
                    {app.days_since_application !== undefined && <span className="ml-1 text-gray-400">({app.days_since_application}d)</span>}
                  </td>

                  {/* Last update */}
                  <td className="px-4 py-3.5">
                    <span className={cn("text-xs whitespace-nowrap", app.is_stale ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-gray-500")}>
                      {app.days_since_last_update}d ago
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[130px]">
                      {(app.tags ?? []).slice(0, 2).map((t) => (
                        <span key={t} className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", tagColor(t))}>{t}</span>
                      ))}
                      {(app.tags ?? []).length > 2 && (
                        <span className="text-[10px] text-gray-400">+{(app.tags ?? []).length - 2}</span>
                      )}
                    </div>
                  </td>

                  {/* Follow-up */}
                  <td className="px-4 py-3.5">
                    {app.follow_up_date ? (
                      <div className={cn("flex items-center gap-1 text-xs font-semibold whitespace-nowrap",
                        app.follow_up_urgency === "overdue" ? "text-red-500" :
                        app.follow_up_urgency === "today"   ? "text-amber-500" :
                        "text-gray-400")}>
                        <Calendar size={11} />
                        {app.follow_up_urgency === "overdue" ? "Overdue" : app.follow_up_urgency === "today" ? "Today!" : app.follow_up_date}
                      </div>
                    ) : <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditApp(app)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteId(app.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showForm   && <AppFormModal mode="create" onSave={load} onClose={() => setShowForm(false)} />}
      {editApp    && <AppFormModal mode="edit" initial={editApp} onSave={load} onClose={() => setEditApp(null)} />}
      {detailApp  && <DetailDrawer app={detailApp} onClose={() => setDetailApp(null)} />}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">Delete this application?</h3>
            <p className="text-sm text-gray-500 mb-4">This will archive the application and all its stage logs.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
