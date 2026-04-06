import { cn } from "@/lib/utils";

interface ProgressBarProps {
  pct: number;          // 0–100
  label?: string;
  showPct?: boolean;
  color?: string;       // tailwind bg class e.g. "bg-blue-500"
  size?: "sm" | "md";
}

export default function ProgressBar({
  pct,
  label,
  showPct = true,
  color = "bg-blue-500",
  size = "md",
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full">
      {(label || showPct) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>}
          {showPct && (
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {clamped.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div className={cn("w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden", height)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
