import { cn } from "@/lib/utils";

/** Course completion (0-100) as a thin gold bar with a mono label and percentage. */
export function CourseProgressBar({
  percent,
  label,
  className,
}: {
  percent: number;
  label: string;
  className?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
