"use client";

import Link from "next/link";
import { Wallet, Library, CheckSquare, FolderKanban, Briefcase, ArrowRight } from "lucide-react";

const modules = [
  {
    name: "Salary Manager",
    description: "Track income, expenses, savings goals and monthly analytics",
    icon: Wallet,
    href: "/salary/dashboard",
    color: "from-emerald-500 to-teal-600",
    textColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    available: true,
  },
  {
    name: "Book Library",
    description: "Manage your reading list, track progress and write reviews",
    icon: Library,
    href: "/books/dashboard",
    color: "from-blue-500 to-indigo-600",
    textColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    available: true,
  },
  {
    name: "Habits Tracker",
    description: "Build streaks, track daily habits and monitor consistency",
    icon: CheckSquare,
    href: "/habits/tracker",
    color: "from-purple-500 to-violet-600",
    textColor: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    available: true,
  },
  {
    name: "Project Manager",
    description: "Organize projects, tasks, milestones and deadlines",
    icon: FolderKanban,
    href: "/projects/dashboard",
    color: "from-orange-500 to-amber-600",
    textColor: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    available: true,
  },
  {
    name: "Job Applications",
    description: "Track job applications, interviews and hiring pipeline",
    icon: Briefcase,
    href: "/jobs/dashboard",
    color: "from-pink-500 to-rose-600",
    textColor: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    available: true,
  },

];

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Personal Manager
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Your all-in-one system to manage finances, habits, projects and more.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.name}
              className={`relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 transition-all duration-200 ${
                mod.available
                  ? "hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 cursor-pointer"
                  : "opacity-60"
              }`}
            >
              {!mod.available && (
                <span className="absolute top-4 right-4 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                  Coming Soon
                </span>
              )}
              <div className={`w-11 h-11 rounded-xl ${mod.bgColor} flex items-center justify-center mb-4`}>
                <Icon size={22} className={mod.textColor} />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-1">{mod.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{mod.description}</p>
              {mod.available ? (
                <Link
                  href={mod.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${mod.textColor} hover:gap-2.5 transition-all`}
                >
                  Open <ArrowRight size={14} />
                </Link>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-600">Not available yet</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
