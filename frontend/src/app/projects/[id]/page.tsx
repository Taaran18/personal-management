"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft, GitBranch, ExternalLink, Edit2, Trash2, Plus, X, Check,
  Flag, Calendar, Clock, LayoutDashboard, CheckSquare, Milestone, FileText,
  ChevronDown, AlertCircle, RefreshCw
} from "lucide-react";
import Link from "next/link";
import {
  projectsApi, ProjectDetail, ProjectTask, ProjectMilestone, ProjectUpdate,
  TYPE_COLORS, STATUS_COLORS, PRIORITY_COLORS, PROJECT_COLORS, TECH_OPTIONS,
  TaskStatus, TaskPriority, ProjectStatus
} from "@/lib/projects-api";
import { cn } from "@/lib/utils";

const labelCls = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5";
const inputCls = "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 transition-colors";

type Tab = "tasks" | "milestones" | "updates";

// ─── Edit Modal ────────────────────────────────────────────────────────────
function EditProjectModal({ project, onClose, onSaved }: {
  project: ProjectDetail;
  onClose: () => void;
  onSaved: (updated: ProjectDetail) => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    description: project.description || "",
    type: project.type,
    status: project.status,
    priority: project.priority,
    github_url: project.github_url || "",
    live_url: project.live_url || "",
    start_date: project.start_date || "",
    deadline: project.deadline || "",
    client_name: project.client_name || "",
    color: project.color,
    tech_stack: [...project.tech_stack],
  });
  const [techInput, setTechInput] = useState("");
  const [showSugg, setShowSugg] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const sugg = TECH_OPTIONS.filter(t => t.toLowerCase().includes(techInput.toLowerCase()) && !form.tech_stack.includes(t)).slice(0, 6);
  const addTech = (t: string) => { const c = t.trim(); if (c && !form.tech_stack.includes(c)) set("tech_stack", [...form.tech_stack, c]); setTechInput(""); setShowSugg(false); };
  const removeTech = (t: string) => set("tech_stack", form.tech_stack.filter(x => x !== t));

  const save = async () => {
    setSaving(true);
    try {
      await projectsApi.updateProject(project.id, {
        name: form.name, description: form.description || undefined,
        type: form.type as any, status: form.status as any, priority: form.priority as any,
        github_url: form.github_url || undefined, live_url: form.live_url || undefined,
        start_date: form.start_date || undefined, deadline: form.deadline || undefined,
        client_name: form.client_name || undefined, color: form.color,
        tech_stack: form.tech_stack,
      });
      const res = await projectsApi.getProject(project.id);
      onSaved(res.data);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-950 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">Edit Project</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={cn(inputCls, "resize-none")} rows={3} value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={e => set("type", e.target.value)}>
                <option value="personal">Personal</option>
                <option value="freelance">Freelance</option>
                <option value="office">Office</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select className={inputCls} value={form.priority} onChange={e => set("priority", e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" className={inputCls} value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Deadline</label>
              <input type="date" className={inputCls} value={form.deadline} onChange={e => set("deadline", e.target.value)} />
            </div>
          </div>
          {form.type === "freelance" && (
            <div>
              <label className={labelCls}>Client Name</label>
              <input className={inputCls} value={form.client_name} onChange={e => set("client_name", e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>GitHub URL</label>
              <input type="url" className={inputCls} value={form.github_url} onChange={e => set("github_url", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Live URL</label>
              <input type="url" className={inputCls} value={form.live_url} onChange={e => set("live_url", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tech Stack</label>
            {form.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tech_stack.map(t => (
                  <span key={t} className="flex items-center gap-1 text-xs px-2 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50 rounded-md">
                    {t}
                    <button onClick={() => removeTech(t)}><X size={9} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input className={inputCls} placeholder="Add tech…" value={techInput}
                onChange={e => { setTechInput(e.target.value); setShowSugg(true); }}
                onKeyDown={e => { if (e.key === "Enter" && techInput) { e.preventDefault(); addTech(techInput); } }}
                onFocus={() => setShowSugg(true)} onBlur={() => setTimeout(() => setShowSugg(false), 150)} />
              {showSugg && techInput && sugg.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden">
                  {sugg.map(t => <button key={t} onMouseDown={() => addTech(t)} className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-950/30 text-gray-700 dark:text-gray-300">{t}</button>)}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => set("color", c)}
                  className={cn("w-8 h-8 rounded-lg transition-transform hover:scale-110", form.color === c && "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={save} disabled={saving || !form.name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Row ──────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete, onUpdate }: {
  task: ProjectTask;
  onToggle: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ProjectTask>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const done = task.status === "done";
  const pc = PRIORITY_COLORS[task.priority];

  const commitTitle = () => {
    if (title.trim() && title !== task.title) onUpdate(task.id, { title: title.trim() });
    setEditing(false);
  };

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all group",
      done ? "border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/20" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-orange-200 dark:hover:border-orange-900/50")}>
      <button onClick={() => onToggle(task.id, done ? "todo" : "done")}
        className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
          done ? "bg-emerald-500 border-emerald-500" : "border-gray-300 dark:border-gray-600 hover:border-emerald-400")}>
        {done && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input className="w-full text-sm bg-transparent border-b border-orange-400 outline-none text-gray-900 dark:text-white pb-0.5"
            value={title} onChange={e => setTitle(e.target.value)}
            onBlur={commitTitle} onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitle(task.title); setEditing(false); } }}
            autoFocus />
        ) : (
          <button onClick={() => setEditing(true)} className={cn("text-sm text-left w-full truncate", done ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200 hover:text-orange-500")}>
            {task.title}
          </button>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn("text-[10px] font-medium", pc.text)}>{task.priority}</span>
          {task.due_date && (
            <span className={cn("text-[10px]", new Date(task.due_date) < new Date() && !done ? "text-red-400" : "text-gray-400")}>
              {new Date(task.due_date).toLocaleDateString("en", { month: "short", day: "numeric" })}
            </span>
          )}
          {task.status === "in_progress" && (
            <span className="text-[10px] text-blue-500 font-medium">In Progress</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <select value={task.priority} onChange={e => onUpdate(task.id, { priority: e.target.value as TaskPriority })}
          className="text-[10px] bg-transparent text-gray-400 border-none outline-none cursor-pointer">
          <option value="low">Low</option>
          <option value="medium">Med</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <button onClick={() => onDelete(task.id)} className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Milestone Row ─────────────────────────────────────────────────────────
function MilestoneRow({ m, onToggle, onDelete }: {
  m: ProjectMilestone;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const done = !!m.completed_at;
  return (
    <div className="flex items-center gap-3 group">
      <div className="flex flex-col items-center shrink-0">
        <button onClick={() => onToggle(m.id, !done)}
          className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            done ? "bg-blue-500 border-blue-500" : "border-gray-300 dark:border-gray-600 hover:border-blue-400")}>
          {done && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
      </div>
      <div className={cn("flex-1 flex items-center justify-between p-3 rounded-xl border transition-all",
        done ? "border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/20" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950")}>
        <div>
          <p className={cn("text-sm font-medium", done && "line-through text-gray-400 dark:text-gray-600")}>{m.title}</p>
          {m.due_date && (
            <p className={cn("text-xs mt-0.5", done ? "text-gray-400" : new Date(m.due_date) < new Date() ? "text-red-400" : "text-gray-400")}>
              {done && m.completed_at ? `Completed ${new Date(m.completed_at).toLocaleDateString("en", { month: "short", day: "numeric" })}` : `Due ${new Date(m.due_date).toLocaleDateString("en", { month: "short", day: "numeric" })}`}
            </p>
          )}
        </div>
        <button onClick={() => onDelete(m.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-400 transition-all">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("tasks");
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Task add
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("medium");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Milestone add
  const [newMilestone, setNewMilestone] = useState("");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  // Update add
  const [newUpdate, setNewUpdate] = useState("");
  const [addingUpdate, setAddingUpdate] = useState(false);

  // Progress slider
  const [progressVal, setProgressVal] = useState(0);
  const [savingProgress, setSavingProgress] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await projectsApi.getProject(id);
      setProject(res.data);
      setProgressVal(res.data.progress);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // ── Derived ──
  const tc = project ? TYPE_COLORS[project.type] : null;
  const sc = project ? STATUS_COLORS[project.status] : null;
  const pc = project ? PRIORITY_COLORS[project.priority] : null;
  const daysLeft = project?.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000)
    : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && project?.status === "active";

  const doneTasks = project?.tasks.filter(t => t.status === "done").length ?? 0;
  const totalTasks = project?.tasks.length ?? 0;

  // ── Handlers ──
  const handleProgressSave = async () => {
    if (!project || progressVal === project.progress) return;
    setSavingProgress(true);
    await projectsApi.updateProject(project.id, { progress: progressVal });
    setProject(p => p ? { ...p, progress: progressVal } : p);
    setSavingProgress(false);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !project) return;
    setAddingTask(true);
    const res = await projectsApi.createTask({
      project_id: project.id,
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      due_date: newTaskDue || undefined,
    });
    setProject(p => p ? { ...p, tasks: [...p.tasks, res.data], progress: Math.round(p.tasks.filter(t => t.status === "done").length / (p.tasks.length + 1) * 100) } : p);
    setNewTaskTitle(""); setNewTaskDue(""); setNewTaskPriority("medium"); setShowTaskForm(false);
    setAddingTask(false);
    load(); // reload to get auto-updated progress
  };

  const handleToggleTask = async (taskId: string, status: TaskStatus) => {
    if (!project) return;
    await projectsApi.updateTask(taskId, { status });
    load();
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<ProjectTask>) => {
    await projectsApi.updateTask(taskId, updates);
    setProject(p => p ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) } : p);
  };

  const handleDeleteTask = async (taskId: string) => {
    await projectsApi.deleteTask(taskId);
    load();
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.trim() || !project) return;
    setAddingMilestone(true);
    const res = await projectsApi.createMilestone({ project_id: project.id, title: newMilestone.trim(), due_date: newMilestoneDue || undefined });
    setProject(p => p ? { ...p, milestones: [...p.milestones, res.data] } : p);
    setNewMilestone(""); setNewMilestoneDue(""); setShowMilestoneForm(false);
    setAddingMilestone(false);
  };

  const handleToggleMilestone = async (mId: string, done: boolean) => {
    const now = done ? new Date().toISOString() : null;
    await projectsApi.updateMilestone(mId, { completed_at: now ?? undefined });
    setProject(p => p ? { ...p, milestones: p.milestones.map(m => m.id === mId ? { ...m, completed_at: now ?? undefined } : m) } : p);
  };

  const handleDeleteMilestone = async (mId: string) => {
    await projectsApi.deleteMilestone(mId);
    setProject(p => p ? { ...p, milestones: p.milestones.filter(m => m.id !== mId) } : p);
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim() || !project) return;
    setAddingUpdate(true);
    const res = await projectsApi.createUpdate({ project_id: project.id, content: newUpdate.trim() });
    setProject(p => p ? { ...p, updates: [res.data, ...p.updates] } : p);
    setNewUpdate(""); setAddingUpdate(false);
  };

  const handleDeleteUpdate = async (uId: string) => {
    await projectsApi.deleteUpdate(uId);
    setProject(p => p ? { ...p, updates: p.updates.filter(u => u.id !== uId) } : p);
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await projectsApi.deleteProject(project.id);
    router.push("/projects/dashboard");
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-5xl">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-xl w-64" />
      <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
    </div>
  );

  if (!project) return (
    <div className="text-center py-20 text-gray-400">
      <AlertCircle size={40} className="mx-auto mb-3 opacity-50" />
      <p>Project not found.</p>
      <Link href="/projects/dashboard" className="text-orange-500 text-sm mt-2 inline-block">← Back to dashboard</Link>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {showEdit && <EditProjectModal project={project} onClose={() => setShowEdit(false)} onSaved={p => { setProject(p); setShowEdit(false); }} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/projects/dashboard" className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {tc && <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide", tc.bg, tc.text)}>{project.type}</span>}
                {sc && <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide", sc.bg, sc.text)}>{project.status.replace("_", " ")}</span>}
                {pc && <span className={cn("text-[10px] font-semibold", pc.text)}>● {project.priority}</span>}
                {project.client_name && <span className="text-xs text-gray-400">· {project.client_name}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {project.github_url && (
            <a href={project.github_url} target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <GitBranch size={18} />
            </a>
          )}
          {project.live_url && (
            <a href={project.live_url} target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <ExternalLink size={18} />
            </a>
          )}
          <button onClick={() => setShowEdit(true)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Edit2 size={16} />
          </button>
          <button onClick={handleDelete} disabled={deleting} className="p-2 rounded-xl text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Details + Tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {project.description && (
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              {(["tasks", "milestones", "updates"] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors",
                    tab === t ? "text-orange-500 border-b-2 border-orange-500 -mb-px bg-orange-50/30 dark:bg-orange-950/10" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300")}>
                  {t === "tasks" && <><CheckSquare size={14} /> Tasks {totalTasks > 0 && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">{doneTasks}/{totalTasks}</span>}</>}
                  {t === "milestones" && <><Milestone size={14} /> Milestones</>}
                  {t === "updates" && <><FileText size={14} /> Updates</>}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* ── Tasks Tab ── */}
              {tab === "tasks" && (
                <div className="space-y-3">
                  {/* Filter by status */}
                  {project.tasks.length > 0 && (
                    <div className="space-y-2">
                      {/* In Progress */}
                      {project.tasks.filter(t => t.status === "in_progress").length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">In Progress</p>
                          {project.tasks.filter(t => t.status === "in_progress").map(t => (
                            <TaskRow key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} />
                          ))}
                        </div>
                      )}
                      {/* Todo */}
                      {project.tasks.filter(t => t.status === "todo").length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">To Do</p>
                          {project.tasks.filter(t => t.status === "todo").map(t => (
                            <TaskRow key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} />
                          ))}
                        </div>
                      )}
                      {/* Done */}
                      {project.tasks.filter(t => t.status === "done").length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Done</p>
                          {project.tasks.filter(t => t.status === "done").map(t => (
                            <TaskRow key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {project.tasks.length === 0 && !showTaskForm && (
                    <div className="text-center py-8 text-gray-400">
                      <CheckSquare size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No tasks yet. Add your first task!</p>
                    </div>
                  )}

                  {/* Add task form */}
                  {showTaskForm ? (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                      <input className={inputCls} placeholder="Task title…" value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAddTask(); if (e.key === "Escape") setShowTaskForm(false); }}
                        autoFocus />
                      <div className="flex gap-3">
                        <select className={cn(inputCls, "flex-1")} value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as TaskPriority)}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                        <input type="date" className={cn(inputCls, "flex-1")} value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleAddTask} disabled={addingTask || !newTaskTitle.trim()}
                          className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium">
                          {addingTask ? "Adding…" : "Add Task"}
                        </button>
                        <button onClick={() => setShowTaskForm(false)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowTaskForm(true)}
                      className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 hover:border-orange-300 dark:hover:border-orange-800 hover:text-orange-500 transition-all text-sm">
                      <Plus size={15} /> Add Task
                    </button>
                  )}
                </div>
              )}

              {/* ── Milestones Tab ── */}
              {tab === "milestones" && (
                <div className="space-y-3">
                  {project.milestones.length > 0 && (
                    <div className="space-y-2">
                      {project.milestones
                        .sort((a, b) => (a.due_date ?? "z") > (b.due_date ?? "z") ? 1 : -1)
                        .map(m => (
                          <MilestoneRow key={m.id} m={m} onToggle={handleToggleMilestone} onDelete={handleDeleteMilestone} />
                        ))}
                    </div>
                  )}
                  {project.milestones.length === 0 && !showMilestoneForm && (
                    <div className="text-center py-8 text-gray-400">
                      <Milestone size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No milestones yet. Set key targets!</p>
                    </div>
                  )}
                  {showMilestoneForm ? (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                      <input className={inputCls} placeholder="Milestone title…" value={newMilestone}
                        onChange={e => setNewMilestone(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAddMilestone(); if (e.key === "Escape") setShowMilestoneForm(false); }}
                        autoFocus />
                      <input type="date" className={inputCls} value={newMilestoneDue} onChange={e => setNewMilestoneDue(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={handleAddMilestone} disabled={addingMilestone || !newMilestone.trim()}
                          className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium">
                          {addingMilestone ? "Adding…" : "Add Milestone"}
                        </button>
                        <button onClick={() => setShowMilestoneForm(false)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowMilestoneForm(true)}
                      className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 hover:border-orange-300 dark:hover:border-orange-800 hover:text-orange-500 transition-all text-sm">
                      <Plus size={15} /> Add Milestone
                    </button>
                  )}
                </div>
              )}

              {/* ── Updates Tab ── */}
              {tab === "updates" && (
                <div className="space-y-4">
                  {/* Add update */}
                  <div className="space-y-2">
                    <textarea className={cn(inputCls, "resize-none")} rows={3}
                      placeholder="Write a project update or note…"
                      value={newUpdate} onChange={e => setNewUpdate(e.target.value)} />
                    <button onClick={handleAddUpdate} disabled={addingUpdate || !newUpdate.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium">
                      <Plus size={14} /> {addingUpdate ? "Posting…" : "Post Update"}
                    </button>
                  </div>

                  {/* Update list */}
                  {project.updates.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <FileText size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No updates yet. Document your progress!</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {project.updates.map(u => (
                      <div key={u.id} className="group relative bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{u.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(u.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })} · {new Date(u.created_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <button onClick={() => handleDeleteUpdate(u.id)}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-400 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — Sidebar Info */}
        <div className="space-y-4">
          {/* Progress */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Progress</p>
              <span className="text-lg font-bold text-gray-900 dark:text-white" style={{ color: project.color }}>{project.progress}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
              <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
            </div>
            {totalTasks > 0 && (
              <p className="text-xs text-gray-400 mb-3">{doneTasks} of {totalTasks} tasks completed — auto-calculated</p>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500">Manual override</label>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{progressVal}%</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={progressVal}
                onChange={e => setProgressVal(Number(e.target.value))}
                className="w-full accent-orange-500" />
              {progressVal !== project.progress && (
                <button onClick={handleProgressSave} disabled={savingProgress}
                  className="w-full py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-medium">
                  {savingProgress ? "Saving…" : "Save Progress"}
                </button>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Details</p>

            {project.start_date && (
              <div className="flex items-center gap-3">
                <Calendar size={14} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Started</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(project.start_date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>
            )}

            {project.deadline && (
              <div className="flex items-center gap-3">
                <Clock size={14} className={isOverdue ? "text-red-400 shrink-0" : "text-gray-400 shrink-0"} />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Deadline</p>
                  <p className={cn("text-sm", isOverdue ? "text-red-500 font-medium" : "text-gray-700 dark:text-gray-300")}>
                    {new Date(project.deadline).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                    {daysLeft !== null && (
                      <span className="ml-1 text-xs">({isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`})</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Flag size={14} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Priority</p>
                <p className={cn("text-sm font-medium capitalize", pc?.text)}>{project.priority}</p>
              </div>
            </div>

            {project.client_name && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Client</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{project.client_name}</p>
              </div>
            )}
          </div>

          {/* Tech Stack */}
          {project.tech_stack.length > 0 && (
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Tech Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {project.tech_stack.map(t => (
                  <span key={t} className="text-xs px-2.5 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50 rounded-lg font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick nav */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-2">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Quick Links</p>
            <Link href="/projects/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              <LayoutDashboard size={14} /> Dashboard
            </Link>
            <Link href="/projects/board" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              <ChevronDown size={14} className="rotate-90" /> Board View
            </Link>
            <Link href="/projects/tasks" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              <CheckSquare size={14} /> All Tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
