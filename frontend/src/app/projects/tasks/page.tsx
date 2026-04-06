"use client";

import { useEffect, useState } from "react";
import { Check, Trash2, Plus, RefreshCw, Filter, LayoutDashboard, FolderKanban } from "lucide-react";
import { projectsApi, ProjectTask, Project, TYPE_COLORS, PRIORITY_COLORS, TaskStatus, TaskPriority } from "@/lib/projects-api";
import { cn } from "@/lib/utils";
import Link from "next/link";

const inputCls = "px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 transition-colors";

export default function TasksPage() {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  // New task
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newDue, setNewDue] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const [tasksRes, projRes] = await Promise.all([
      projectsApi.getAllTasks(),
      projectsApi.getProjects(),
    ]);
    setTasks(tasksRes.data.data);
    setProjects(projRes.data.data);
    if (projRes.data.data.length > 0 && !newProject) setNewProject(projRes.data.data[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (task: ProjectTask) => {
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    await projectsApi.updateTask(task.id, { status: newStatus });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  const handleDelete = async (id: string) => {
    await projectsApi.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newProject) return;
    setAdding(true);
    const res = await projectsApi.createTask({
      project_id: newProject,
      title: newTitle.trim(),
      priority: newPriority,
      due_date: newDue || undefined,
    });
    setTasks(prev => [res.data, ...prev]);
    setNewTitle(""); setNewDue(""); setShowAdd(false);
    setAdding(false);
  };

  // Apply filters
  const filtered = tasks.filter(t => {
    if (filterProject && t.project_id !== filterProject) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  // Group: in_progress → todo → done
  const inProgress = filtered.filter(t => t.status === "in_progress");
  const todo = filtered.filter(t => t.status === "todo");
  const done = filtered.filter(t => t.status === "done");

  const hasFilters = filterProject || filterStatus || filterPriority;

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} tasks · {filtered.filter(t => t.status === "done").length} done
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects/dashboard" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <LayoutDashboard size={16} />
          </Link>
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors">
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add New Task</p>
          <input className={cn(inputCls, "w-full")} placeholder="Task title…" value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setShowAdd(false); }}
            autoFocus />
          <div className="flex flex-wrap gap-3">
            <select className={inputCls} value={newProject} onChange={e => setNewProject(e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className={inputCls} value={newPriority} onChange={e => setNewPriority(e.target.value as TaskPriority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input type="date" className={inputCls} value={newDue} onChange={e => setNewDue(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={adding || !newTitle.trim() || !newProject}
              className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium">
              {adding ? "Adding…" : "Add Task"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
        <Filter size={14} className="text-gray-400" />
        <select className={inputCls} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={inputCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select className={inputCls} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterProject(""); setFilterStatus(""); setFilterPriority(""); }}
            className="text-xs text-orange-500 hover:text-orange-600 font-medium">
            Clear filters
          </button>
        )}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderKanban size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No tasks found.</p>
          {hasFilters && <button onClick={() => { setFilterProject(""); setFilterStatus(""); setFilterPriority(""); }} className="text-orange-500 text-sm mt-1">Clear filters</button>}
        </div>
      ) : (
        <div className="space-y-5">
          {/* In Progress */}
          {inProgress.length > 0 && (
            <TaskGroup label="In Progress" tasks={inProgress} onToggle={handleToggle} onDelete={handleDelete} />
          )}
          {/* Todo */}
          {todo.length > 0 && (
            <TaskGroup label="To Do" tasks={todo} onToggle={handleToggle} onDelete={handleDelete} />
          )}
          {/* Done */}
          {done.length > 0 && (
            <TaskGroup label="Done" tasks={done} onToggle={handleToggle} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  );
}

function TaskGroup({ label, tasks, onToggle, onDelete }: {
  label: string;
  tasks: ProjectTask[];
  onToggle: (t: ProjectTask) => void;
  onDelete: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(label === "Done");

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      <button onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{label}</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <span className={cn("text-gray-400 transition-transform text-xs", collapsed && "rotate-180")}>▲</span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {tasks.map(t => <TaskItem key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete }: {
  task: ProjectTask;
  onToggle: (t: ProjectTask) => void;
  onDelete: (id: string) => void;
}) {
  const done = task.status === "done";
  const pc = PRIORITY_COLORS[task.priority];
  const proj = task.project;
  const tc = proj ? TYPE_COLORS[proj.type] : null;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !done;

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all group",
      done ? "border-gray-100 dark:border-gray-800/30 bg-gray-50/30 dark:bg-transparent" : "border-gray-200 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-900/50")}>
      <button onClick={() => onToggle(task)}
        className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
          done ? "bg-emerald-500 border-emerald-500" : "border-gray-300 dark:border-gray-600 hover:border-emerald-400")}>
        {done && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm truncate", done ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200")}>{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {proj && tc && (
            <Link href={`/projects/${proj.id}`} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }} />
              <span className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{proj.name}</span>
            </Link>
          )}
          <span className={cn("text-[10px] font-medium", pc.text)}>{task.priority}</span>
          {task.due_date && (
            <span className={cn("text-[10px]", isOverdue ? "text-red-400 font-medium" : "text-gray-400")}>
              {isOverdue ? "⚠ " : ""}{new Date(task.due_date).toLocaleDateString("en", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      <button onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-400 transition-all">
        <Trash2 size={13} />
      </button>
    </div>
  );
}
