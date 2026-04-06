"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, GitBranch, ExternalLink, LayoutDashboard } from "lucide-react";
import { projectsApi, Project, TYPE_COLORS, STATUS_COLORS, ProjectStatus } from "@/lib/projects-api";
import { cn } from "@/lib/utils";
import Link from "next/link";

const COLUMNS: { status: ProjectStatus; label: string; accent: string }[] = [
  { status: "active",    label: "Active",    accent: "border-t-emerald-500" },
  { status: "on_hold",   label: "On Hold",   accent: "border-t-amber-500"   },
  { status: "completed", label: "Completed", accent: "border-t-blue-500"    },
  { status: "cancelled", label: "Cancelled", accent: "border-t-gray-400"    },
];

function KanbanCard({ project, onStatusChange }: {
  project: Project;
  onStatusChange: (id: string, status: ProjectStatus) => void;
}) {
  const tc = TYPE_COLORS[project.type];
  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000)
    : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && project.status === "active";

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-md transition-all">
      {/* Name + type */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link href={`/projects/${project.id}`} className="flex items-center gap-2 flex-1 min-w-0 group">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <span className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-500 transition-colors">
            {project.name}
          </span>
        </Link>
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0", tc.bg, tc.text)}>
          {project.type}
        </span>
      </div>

      {project.description && (
        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{project.description}</p>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Progress</span><span className="font-bold">{project.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
        </div>
      </div>

      {/* Tech stack */}
      {project.tech_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {project.tech_stack.slice(0, 3).map((t) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded font-medium">
              {t}
            </span>
          ))}
          {project.tech_stack.length > 3 && (
            <span className="text-[9px] text-gray-400">+{project.tech_stack.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {project.github_url && (
            <a href={project.github_url} target="_blank" rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <GitBranch size={12} />
            </a>
          )}
          {project.live_url && (
            <a href={project.live_url} target="_blank" rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <ExternalLink size={12} />
            </a>
          )}
        </div>
        {/* Quick status change */}
        <select
          value={project.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(project.id, e.target.value as ProjectStatus)}
          className="text-[10px] bg-transparent text-gray-400 border-none outline-none cursor-pointer"
        >
          <option value="active">→ Active</option>
          <option value="on_hold">→ On Hold</option>
          <option value="completed">→ Complete</option>
          <option value="cancelled">→ Cancel</option>
        </select>
      </div>

      {daysLeft !== null && project.status === "active" && (
        <div className={cn("text-[10px] font-semibold mt-2", isOverdue ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-gray-400")}>
          {isOverdue ? `⚠ ${Math.abs(daysLeft)}d overdue` : `📅 ${daysLeft}d left`}
        </div>
      )}
    </div>
  );
}

export default function BoardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    projectsApi.getProjects()
      .then((r) => setProjects(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id: string, status: ProjectStatus) => {
    await projectsApi.updateProject(id, { status });
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  };

  const byStatus = (status: ProjectStatus) => projects.filter((p) => p.status === status);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Board</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{projects.length} total projects</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects/dashboard" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <LayoutDashboard size={16} />
          </Link>
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
          <Link href="/projects/new"
            className="flex items-center gap-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors">
            <Plus size={15} /> New
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colProjects = byStatus(col.status);
            const sc = STATUS_COLORS[col.status];
            return (
              <div key={col.status} className={cn(
                "bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-t-4 p-4", col.accent
              )}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">{col.label}</h2>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", sc.bg, sc.text)}>
                    {colProjects.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colProjects.map((p) => (
                    <KanbanCard key={p.id} project={p} onStatusChange={handleStatusChange} />
                  ))}
                  {colProjects.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No projects</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
