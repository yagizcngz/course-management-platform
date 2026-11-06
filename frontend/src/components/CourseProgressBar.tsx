import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { CourseStatus } from "./courseHelpers";

const STATUS_LABEL: Record<CourseStatus, string> = {
  completed: "myCourses.completedBadge",
  inProgress: "dashboard.inProgress",
  notStarted: "myCourses.notStarted",
};

/** The student's status on a course card's cover, the same on every page. */
export function CourseStatusPill({ status }: { status: CourseStatus }) {
  const { t } = useTranslation();
  const done = status === "completed";
  return (
    <span
      className={cn(
        "absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-sm",
        done ? "bg-gold text-night" : "bg-black/70 text-white",
      )}
    >
      {done && <CheckCircle2 aria-hidden="true" className="size-3" />}
      {t(STATUS_LABEL[status])}
    </span>
  );
}

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
