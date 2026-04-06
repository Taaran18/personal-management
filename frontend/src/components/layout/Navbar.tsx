"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Sun, Moon, Menu, X, LayoutDashboard, ArrowLeftRight,
  BookOpen, BarChart3, Settings, ChevronDown, ChevronUp,
  Wallet, Library, CheckSquare, FolderKanban, Briefcase, Star, CalendarCheck, CalendarDays,
  BarChart2, Scale, GitBranch, Plus, LogOut, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  {
    name: "Dashboards",
    icon: LayoutDashboard,
    href: "/dashboards-overview", // acts as prefix check
    color: "text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300",
    activeColorMain: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white",
    sub: [
      { name: "Salary Dashboard", href: "/salary/dashboard", icon: Wallet, activeBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" },
      { name: "Book Dashboard",   href: "/books/dashboard",  icon: Library, activeBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400" },
      { name: "Habits Dashboard", href: "/habits/dashboard", icon: CheckSquare, activeBg: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400" },
      { name: "Projects Dashboard", href: "/projects/dashboard", icon: FolderKanban, activeBg: "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400" },
      { name: "Jobs Dashboard",   href: "/jobs/dashboard",   icon: Briefcase, activeBg: "bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400" },
    ],
  },
  {
    name: "Salary Manager",
    icon: Wallet,
    href: "/salary",
    color: "text-emerald-500",
    activeColorMain: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100",
    defaultActiveBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-medium",
    sub: [
      { name: "Dashboard", href: "/salary/dashboard", icon: LayoutDashboard },
      { name: "Transactions", href: "/salary/transactions", icon: ArrowLeftRight },
      { name: "Ledger", href: "/salary/ledger", icon: BookOpen },
      { name: "Analytics", href: "/salary/monthly-summary", icon: BarChart3 },
      { name: "Config", href: "/salary/config", icon: Settings },
    ],
  },
  {
    name: "Book Library",
    icon: Library,
    href: "/books",
    color: "text-blue-500",
    activeColorMain: "bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100",
    defaultActiveBg: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-medium",
    sub: [
      { name: "Dashboard", href: "/books/dashboard", icon: LayoutDashboard },
      { name: "Library", href: "/books/library", icon: BookOpen },
      { name: "Log Session", href: "/books/log", icon: ArrowLeftRight },
      { name: "Reviews", href: "/books/reviews", icon: Star },
    ],
  },
  {
    name: "Habits",
    icon: CheckSquare,
    href: "/habits",
    color: "text-purple-500",
    activeColorMain: "bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100",
    defaultActiveBg: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-medium",
    sub: [
      { name: "Dashboard", href: "/habits/dashboard", icon: LayoutDashboard },
      { name: "Tracker", href: "/habits/tracker", icon: CalendarCheck },
      { name: "Calendar", href: "/habits/calendar", icon: CalendarDays },
    ],
  },
  {
    name: "Projects",
    icon: FolderKanban,
    href: "/projects",
    color: "text-orange-500",
    activeColorMain: "bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-100",
    defaultActiveBg: "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 font-medium",
    sub: [
      { name: "Dashboard", href: "/projects/dashboard", icon: LayoutDashboard },
      { name: "Board", href: "/projects/board", icon: FolderKanban },
      { name: "All Tasks", href: "/projects/tasks", icon: CheckSquare },
      { name: "New Project", href: "/projects/new", icon: Plus },
    ],
  },
  {
    name: "Job Applications",
    icon: Briefcase,
    href: "/jobs",
    color: "text-pink-500",
    activeColorMain: "bg-pink-100 dark:bg-pink-900/40 text-pink-900 dark:text-pink-100",
    defaultActiveBg: "bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400 font-medium",
    sub: [
      { name: "Dashboard",    href: "/jobs/dashboard",    icon: LayoutDashboard },
      { name: "Applications", href: "/jobs/applications", icon: ArrowLeftRight },
      { name: "Pipeline",     href: "/jobs/pipeline",     icon: FolderKanban },
      { name: "Analytics",   href: "/jobs/analytics",    icon: BarChart2 },
      { name: "Timeline",    href: "/jobs/timeline",     icon: GitBranch },
      { name: "Offers",      href: "/jobs/offers",       icon: Scale },
    ],
  },
];

export default function Navbar({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(
    pathname.startsWith("/books") ? "Book Library"
    : pathname.startsWith("/habits") ? "Habits"
    : pathname.startsWith("/jobs") ? "Job Applications"
    : pathname.startsWith("/projects") ? "Projects"
    : "Salary Manager"
  );

  const handleLogout = () => {
    sessionStorage.removeItem("app_unlocked");
    window.location.reload();
  };

  const isActiveMain = (mod: any) => {
    if (mod.name === "Dashboards") {
      return mod.sub.some((s: any) => s.href === pathname);
    }
    return pathname.startsWith(mod.href);
  };

  const commonBtnClass = "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg flex items-center justify-center";

  return (
    <>
      {/* Top bar */}
      <header className={cn("fixed top-0 right-0 z-50 h-14 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 transition-all duration-300",
        isMinimized ? "left-0 lg:left-16" : "left-0 lg:left-60"
      )}>
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Wallet size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">Personal Manager</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300",
          mobileOpen ? "translate-x-0 w-60" : "-translate-x-full lg:translate-x-0",
          isMinimized ? "lg:w-16" : "lg:w-60"
        )}
      >
        <div className="h-14 flex items-center shrink-0 border-b border-gray-200 dark:border-gray-800 px-4">
          <Link href="/" className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <Wallet size={14} className="text-white" />
            </div>
            <span className={cn("font-bold text-gray-900 dark:text-white text-sm transition-opacity duration-300", isMinimized ? "opacity-0 invisible w-0" : "opacity-100")}>
              Personal Manager
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1 overflow-x-hidden scrollbar-none">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const expanded = expandedModule === mod.name && !isMinimized;
            const isMainActive = isActiveMain(mod);

            return (
              <div key={mod.name}>
                <button
                  onClick={() => {
                    if (isMinimized) setIsMinimized(false);
                    if (mod.sub.length > 0) {
                      setExpandedModule(expandedModule === mod.name ? null : mod.name);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isMainActive
                      ? mod.activeColorMain || "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white",
                    isMinimized ? "justify-center px-0" : "justify-between"
                  )}
                  title={isMinimized ? mod.name : undefined}
                >
                  <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                    <Icon size={18} className={mod.color} />
                    <span className={cn("transition-opacity duration-300", isMinimized ? "opacity-0 w-0 hidden" : "opacity-100")}>{mod.name}</span>
                  </div>
                  {!isMinimized && mod.sub.length > 0 && (
                    expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </button>

                {expanded && (
                  <div className="mt-1 ml-4 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                    {mod.sub.map((sub: any) => {
                      const SubIcon = sub.icon;
                      const active = pathname === sub.href;
                      const activeColor = sub.activeBg || mod.defaultActiveBg;
                      
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap",
                            active
                              ? activeColor
                              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          <SubIcon size={14} />
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer (Minimize & Logout) */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1 shrink-0 overflow-hidden">
          <button
            onClick={() => { setIsMinimized(!isMinimized); setExpandedModule(null); }}
            className={cn("w-full flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors", commonBtnClass, isMinimized ? "justify-center px-0" : "gap-3")}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className={cn("whitespace-nowrap transition-opacity duration-300", isMinimized ? "opacity-0 w-0 hidden" : "opacity-100")}>Collapse</span>
          </button>
          
          <button
            onClick={handleLogout}
            className={cn("w-full flex items-center px-3 py-2 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors", commonBtnClass, isMinimized ? "justify-center px-0" : "gap-3")}
            title={isMinimized ? "Logout" : undefined}
          >
            <LogOut size={18} />
            <span className={cn("whitespace-nowrap transition-opacity duration-300", isMinimized ? "opacity-0 w-0 hidden" : "opacity-100")}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className={cn("pt-14 min-h-screen pb-16 lg:pb-0 transition-all duration-300",
        isMinimized ? "lg:ml-16" : "lg:ml-60"
      )}>
        <main className="p-4 lg:p-6">{children}</main>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
