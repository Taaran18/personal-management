import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  gradient?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor = "text-emerald-500",
  iconBg = "bg-emerald-500/10",
  gradient,
  trend,
  trendLabel,
}: StatCardProps) {
  return (
    <div className={cn(
      "relative rounded-2xl p-5 overflow-hidden",
      gradient
        ? gradient
        : "bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800"
    )}>
      {/* Decorative circle */}
      {gradient && (
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      )}

      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", gradient ? "bg-white/20" : iconBg)}>
          <Icon size={20} className={gradient ? "text-white" : iconColor} />
        </div>
        {trend && trendLabel && (
          <span className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full",
            gradient
              ? "bg-white/20 text-white"
              : trend === "up"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                : trend === "down"
                  ? "bg-red-50 dark:bg-red-950/40 text-red-500"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
          )}>
            {trendLabel}
          </span>
        )}
      </div>

      <p className={cn("text-sm font-medium mb-1", gradient ? "text-white/70" : "text-gray-500 dark:text-gray-400")}>
        {label}
      </p>
      <p className={cn("text-2xl font-bold", gradient ? "text-white" : "text-gray-900 dark:text-white")}>
        {value}
      </p>
      {sub && (
        <p className={cn("text-xs mt-1", gradient ? "text-white/60" : "text-gray-400 dark:text-gray-500")}>
          {sub}
        </p>
      )}
    </div>
  );
}
