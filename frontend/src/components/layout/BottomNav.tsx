"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, BookOpen, BarChart3, Settings, List, Star, CalendarCheck, CalendarDays, FolderKanban, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const salaryLinks = [
  { name: "Dashboard", href: "/salary/dashboard", icon: LayoutDashboard },
  { name: "Txns", href: "/salary/transactions", icon: ArrowLeftRight },
  { name: "Ledger", href: "/salary/ledger", icon: BookOpen },
  { name: "Analytics", href: "/salary/monthly-summary", icon: BarChart3 },
  { name: "Config", href: "/salary/config", icon: Settings },
];

const booksLinks = [
  { name: "Dashboard", href: "/books/dashboard", icon: LayoutDashboard },
  { name: "Library", href: "/books/library", icon: List },
  { name: "Log", href: "/books/log", icon: ArrowLeftRight },
  { name: "Reviews", href: "/books/reviews", icon: Star },
];

const habitsLinks = [
  { name: "Dashboard", href: "/habits/dashboard", icon: LayoutDashboard },
  { name: "Tracker", href: "/habits/tracker", icon: CalendarCheck },
  { name: "Calendar", href: "/habits/calendar", icon: CalendarDays },
];

const projectsLinks = [
  { name: "Dashboard", href: "/projects/dashboard", icon: LayoutDashboard },
  { name: "Board", href: "/projects/board", icon: FolderKanban },
  { name: "Tasks", href: "/projects/tasks", icon: CheckSquare },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isSalary = pathname.startsWith("/salary");
  const isBooks = pathname.startsWith("/books");
  const isHabits = pathname.startsWith("/habits");
  const isProjects = pathname.startsWith("/projects");

  if (!isSalary && !isBooks && !isHabits && !isProjects) return null;

  const links = isBooks ? booksLinks : isHabits ? habitsLinks : isProjects ? projectsLinks : salaryLinks;
  const activeColor = isBooks ? "text-blue-500" : isHabits ? "text-purple-500" : isProjects ? "text-orange-500" : "text-emerald-500";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 safe-area-pb">
      <div className="flex items-stretch h-16">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            pathname === link.href ||
            (link.href === "/salary/dashboard" && pathname === "/salary") ||
            (link.href === "/books/dashboard" && pathname === "/books") ||
            (link.href === "/habits/tracker" && pathname === "/habits");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                active ? activeColor : "text-gray-400 dark:text-gray-500"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              {link.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
