"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthSelectorProps {
  value: Date; // first day of the selected month
  onChange: (month: Date) => void;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function toMonthString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function toReferenceDate(d: Date) {
  // Last day of month
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

export default function MonthSelector({ value, onChange, className }: MonthSelectorProps) {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const isCurrentMonth = value.getFullYear() === currentMonthStart.getFullYear()
    && value.getMonth() === currentMonthStart.getMonth();

  const goPrev = () => {
    const d = new Date(value.getFullYear(), value.getMonth() - 1, 1);
    onChange(d);
  };

  const goNext = () => {
    if (isCurrentMonth) return;
    const d = new Date(value.getFullYear(), value.getMonth() + 1, 1);
    onChange(d);
  };

  const goToday = () => onChange(currentMonthStart);

  return (
    <div className={cn("flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-xl p-1", className)}>
      <button
        onClick={goPrev}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Previous month"
      >
        <ChevronLeft size={15} />
      </button>

      <div className="flex items-center gap-2 px-2 min-w-[160px] justify-center">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {MONTH_NAMES[value.getMonth()]} {value.getFullYear()}
        </span>
      </div>

      <button
        onClick={goNext}
        disabled={isCurrentMonth}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
        title="Next month"
      >
        <ChevronRight size={15} />
      </button>

      {!isCurrentMonth && (
        <button
          onClick={goToday}
          className="ml-1 text-[11px] font-semibold text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          Today
        </button>
      )}
    </div>
  );
}
