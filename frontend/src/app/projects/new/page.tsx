"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, ExternalLink, Plus, X, ChevronLeft } from "lucide-react";
import { projectsApi, PROJECT_COLORS, TECH_OPTIONS } from "@/lib/projects-api";
import { cn } from "@/lib/utils";
import Link from "next/link";

const inputCls = "w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 transition-colors";
const labelCls = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2";

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [techInput, setTechInput] = useState("");
  const [showTechSuggestions, setShowTechSuggestions] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "personal" as "personal" | "freelance" | "office",
    status: "active" as "active" | "on_hold",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    tech_stack: [] as string[],
    github_url: "",
    live_url: "",
    start_date: "",
    deadline: "",
    client_name: "",
    color: PROJECT_COLORS[0],
    progress: 0,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const addTech = (t: string) => {
    const clean = t.trim();
    if (clean && !form.tech_stack.includes(clean)) {
      set("tech_stack", [...form.tech_stack, clean]);
    }
    setTechInput("");
    setShowTechSuggestions(false);
  };

  const removeTech = (t: string) => set("tech_stack", form.tech_stack.filter((x) => x !== t));

  const techSuggestions = TECH_OPTIONS.filter(
    (t) => t.toLowerCase().includes(techInput.toLowerCase()) && !form.tech_stack.includes(t)
  ).slice(0, 8);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Project name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description || undefined,
        type: form.type,
        status: form.status,
        priority: form.priority,
        tech_stack: form.tech_stack,
        github_url: form.github_url || undefined,
        live_url: form.live_url || undefined,
        start_date: form.start_date || undefined,
        deadline: form.deadline || undefined,
        client_name: form.client_name || undefined,
        color: form.color,
        progress: form.progress,
      };
      const res = await projectsApi.createProject(payload);
      router.push(`/projects/${res.data.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to create project.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/projects/dashboard" className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Project</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Set up your project details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Main form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5">
            {/* Name */}
            <div>
              <label className={labelCls}>Project Name *</label>
              <input type="text" className={inputCls} placeholder="e.g. Personal Finance App"
                value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={cn(inputCls, "resize-none")} rows={3}
                placeholder="What is this project about? Goals, scope…"
                value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>

            {/* Type + Status + Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Type</label>
                <select className={inputCls} value={form.type} onChange={(e) => set("type", e.target.value)}>
                  <option value="personal">Personal</option>
                  <option value="freelance">Freelance</option>
                  <option value="office">Office</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <select className={inputCls} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" className={inputCls} value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Deadline</label>
                <input type="date" className={inputCls} value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
              </div>
            </div>

            {/* Client name (freelance only) */}
            {form.type === "freelance" && (
              <div>
                <label className={labelCls}>Client Name</label>
                <input type="text" className={inputCls} placeholder="e.g. Acme Corp"
                  value={form.client_name} onChange={(e) => set("client_name", e.target.value)} />
              </div>
            )}

            {/* Tech stack */}
            <div>
              <label className={labelCls}>Tech Stack</label>
              {form.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.tech_stack.map((t) => (
                    <span key={t} className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50 rounded-lg font-medium">
                      {t}
                      <button onClick={() => removeTech(t)} className="text-orange-400 hover:text-orange-600">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Search tech (React, Next.js, FastAPI…) or type custom"
                  value={techInput}
                  onChange={(e) => { setTechInput(e.target.value); setShowTechSuggestions(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && techInput) { e.preventDefault(); addTech(techInput); } }}
                  onFocus={() => setShowTechSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTechSuggestions(false), 200)}
                />
                {showTechSuggestions && techInput && techSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden">
                    {techSuggestions.map((t) => (
                      <button key={t} onMouseDown={() => addTech(t)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-orange-950/30 text-gray-700 dark:text-gray-300 transition-colors">
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Press Enter to add custom tech</p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>GitHub URL</label>
                <div className="relative">
                  <GitBranch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="url" className={cn(inputCls, "pl-9")} placeholder="https://github.com/…"
                    value={form.github_url} onChange={(e) => set("github_url", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Live URL</label>
                <div className="relative">
                  <ExternalLink size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="url" className={cn(inputCls, "pl-9")} placeholder="https://…"
                    value={form.live_url} onChange={(e) => set("live_url", e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Color + Preview */}
        <div className="space-y-4">
          {/* Color */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <label className={labelCls}>Project Color</label>
            <div className="flex flex-wrap gap-3">
              {PROJECT_COLORS.map((c) => (
                <button key={c} onClick={() => set("color", c)}
                  className={cn("w-9 h-9 rounded-xl transition-transform hover:scale-110",
                    form.color === c && "ring-3 ring-offset-2 ring-gray-900 dark:ring-white scale-110")}
                  style={{ backgroundColor: c, outline: form.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
              ))}
            </div>
          </div>

          {/* Preview card */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <p className={labelCls}>Preview</p>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: form.color }} />
                <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {form.name || "Project Name"}
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-2">
                <div className="h-full rounded-full" style={{ width: "0%", backgroundColor: form.color }} />
              </div>
              <div className="flex gap-1 flex-wrap">
                {form.tech_stack.slice(0, 3).map((t) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="space-y-2">
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm">
              <Plus size={16} />
              {saving ? "Creating…" : "Create Project"}
            </button>
            <Link href="/projects/dashboard"
              className="w-full flex items-center justify-center py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
