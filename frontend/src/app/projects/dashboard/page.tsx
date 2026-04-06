"use client";

import { useEffect, useState } from "react";
import {
  FolderKanban, CheckSquare, Clock, AlertTriangle,
  TrendingUp, RefreshCw, Plus, GitBranch, ExternalLink,
  ArrowRight, Layers, Briefcase, User, BarChart2, Target,
} from "lucide-react";
import { projectsApi, Project, StatsSummary, TYPE_COLORS, STATUS_COLORS, PRIORITY_COLORS } from "@/lib/projects-api";
import StatCard from "@/components/salary/StatCard";
import { cn } from "@/lib/utils";
import Link from "next/link";

const tooltipStyle = {
  contentStyle: { background: "#111827", border: "1px solid #1f2937", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#9ca3af" },
};

function ProjectCard({ project }: { project: Project }) {
  const tc = TYPE_COLORS[project.type];
  const sc = STATUS_COLORS[project.status];
  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000)
    : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && project.status === "active";

  return (
    <Link href={`/projects/${project.id}`}
      className="block bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-900/50 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              {project.name}
            </h3>
          </div>
          {project.description && (
            <p className="text-xs text-gray-400 line-clamp-1">{project.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", tc.bg, tc.text)}>
            {project.type}
          </span>
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", sc.bg, sc.text)}>
            {project.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Progress</span>
          <span className="font-bold text-gray-700 dark:text-gray-300">{project.progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${project.progress}%`, backgroundColor: project.color }}
          />
        </div>
      </div>

      {/* Tech stack */}
      {project.tech_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {project.tech_stack.slice(0, 4).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded font-medium">
              {t}
            </span>
          ))}
          {project.tech_stack.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 text-gray-400">+{project.tech_stack.length - 4}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {project.github_url && (
            <a href={project.github_url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <GitBranch size={12} /> Code
            </a>
          )}
          {project.live_url && (
            <a href={project.live_url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <ExternalLink size={12} /> Live
            </a>
          )}
        </div>
        {daysLeft !== null && project.status === "active" && (
          <span className={cn("font-semibold", isOverdue ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-gray-400")}>
            {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ProjectsDashboard() {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      projectsApi.getStatsSummary(),
      projectsApi.getProjects(),
    ])
      .then(([sumRes, projRes]) => {
        setSummary(sumRes.data);
        setProjects(projRes.data.data);
      })
      .catch(() => setError("Failed to load. Make sure the backend is running."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={load} className="text-sm text-orange-500 hover:underline flex items-center gap-1">
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
  if (!summary) return null;

  const activeProjects = projects.filter(p => p.status === "active");
  const completedProjects = projects.filter(p => p.status === "completed");

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {summary.total} projects · {summary.total_tasks} tasks total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
          <Link href="/projects/board"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-xl transition-colors">
            <Layers size={14} /> Board
          </Link>
          <Link href="/projects/new"
            className="flex items-center gap-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors">
            <Plus size={15} /> New Project
          </Link>
        </div>
      </div>

      {/* Top 4 Gradient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={String(summary.total)}
          sub={`${summary.active} active · ${summary.on_hold} on hold`}
          icon={FolderKanban} gradient="bg-gradient-to-br from-orange-500 to-amber-600" />
        <StatCard label="Completed" value={String(summary.completed)}
          sub={`${summary.cancelled} cancelled`}
          icon={CheckSquare} gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          trend={summary.completed > 0 ? "up" : "neutral"}
          trendLabel={summary.completed > 0 ? `${summary.completed} done` : undefined} />
        <StatCard label="Total Tasks" value={String(summary.total_tasks)}
          sub={`${summary.done_tasks} done · ${summary.pending_tasks} pending`}
          icon={Target} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
        <StatCard label="Avg Progress" value={`${summary.avg_progress}%`}
          sub={`across ${summary.active} active projects`}
          icon={TrendingUp} gradient="bg-gradient-to-br from-purple-500 to-violet-600" />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* By type */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Personal</span>
            <User size={14} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-500 mb-1">{summary.by_type.personal || 0}</p>
          <p className="text-xs text-gray-400">personal projects</p>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Freelance</span>
            <Briefcase size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-500 mb-1">{summary.by_type.freelance || 0}</p>
          <p className="text-xs text-gray-400">client projects</p>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Office</span>
            <BarChart2 size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-500 mb-1">{summary.by_type.office || 0}</p>
          <p className="text-xs text-gray-400">work projects</p>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400">Overdue</span>
            <AlertTriangle size={14} className={summary.overdue_projects > 0 ? "text-red-500" : "text-gray-400"} />
          </div>
          <p className={cn("text-2xl font-bold mb-1", summary.overdue_projects > 0 ? "text-red-500" : "text-gray-400")}>
            {summary.overdue_projects}
          </p>
          <p className="text-xs text-gray-400">{summary.overdue_tasks} overdue tasks</p>
        </div>
      </div>

      {/* Active Projects + Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Clock size={15} className="text-orange-500" /> Upcoming Deadlines
          </h2>
          {summary.upcoming_deadlines.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No upcoming deadlines</p>
          ) : (
            <div className="space-y-3">
              {summary.upcoming_deadlines.map((p) => {
                const days = Math.ceil((new Date(p.deadline!).getTime() - Date.now()) / 86400000);
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-900/50 -mx-2 px-2 py-1.5 rounded-xl transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-orange-500 transition-colors">
                        {p.name}
                      </span>
                    </div>
                    <span className={cn("text-xs font-bold shrink-0", days <= 3 ? "text-red-500" : days <= 7 ? "text-amber-500" : "text-gray-400")}>
                      {days}d
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Task Status Summary */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <CheckSquare size={15} className="text-blue-500" /> Task Overview
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: "To Do", value: summary.pending_tasks, color: "#94a3b8" },
              { label: "In Progress", value: summary.in_progress_tasks, color: "#f97316" },
              { label: "Done", value: summary.done_tasks, color: "#10b981" },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Overall task progress bar */}
          {summary.total_tasks > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">Overall completion</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  {Math.round(summary.done_tasks / summary.total_tasks * 100)}%
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.round(summary.done_tasks / summary.total_tasks * 100)}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>0</span>
                <span>{summary.total_tasks} total tasks</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Projects Grid */}
      {activeProjects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Projects ({activeProjects.length})</h2>
            <Link href="/projects/board" className="text-xs text-orange-500 hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Completed ({completedProjects.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
            {completedProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center">
          <FolderKanban size={48} className="mx-auto text-gray-200 dark:text-gray-800 mb-4" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No projects yet</h3>
          <p className="text-sm text-gray-400 mb-5">Add your first project to start tracking progress</p>
          <Link href="/projects/new"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm">
            <Plus size={15} /> Create First Project
          </Link>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
    </div>
  );
}
