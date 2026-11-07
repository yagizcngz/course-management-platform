import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame, Sparkles, TrendingUp, Trophy, type LucideIcon } from "lucide-react";
import { API_BASE } from "./courseHelpers";
import { formatDate } from "@/lib/utils";
import {
  showcaseRows,
  type CourseStats,
  type ShowcaseCourse,
  type ShowcaseKind,
} from "@/lib/showcase";

const ICONS: Record<ShowcaseKind, LucideIcon> = {
  popular: Trophy,
  hottest: Flame,
  trending: TrendingUp,
  new: Sparkles,
};

// one fetch per page load; the rows only need rough, minutes-old numbers
let statsRequest: Promise<CourseStats[]> | null = null;
const loadStats = () =>
  (statsRequest ??= fetch(`${API_BASE}/api/courses/stats`)
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => {
      statsRequest = null;
      return [];
    }));

/**
 * Curated rows above a course list (most popular, hottest, trending, new), each a horizontal
 * strip of compact cards. Scrolls sideways instead of growing, so a subject with many courses
 * stays readable; renders nothing until there is something to show.
 */
export function CourseShowcase<T extends ShowcaseCourse>({
  courses,
  titleOf,
  categoryOf,
  imageOf,
  onOpen,
}: {
  courses: T[];
  titleOf: (c: T) => string;
  categoryOf: (c: T) => string;
  imageOf: (c: T, index: number) => string;
  onOpen: (c: T) => void;
}) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<CourseStats[]>([]);
  useEffect(() => {
    let off = false;
    loadStats().then((s) => !off && setStats(s));
    return () => {
      off = true;
    };
  }, []);
  const rows = useMemo(() => showcaseRows(courses, stats), [courses, stats]);
  // a course's image index must match the grid's so placeholder art stays the same
  const indexOf = useMemo(() => new Map(courses.map((c, i) => [c.id, i])), [courses]);
  if (rows.length === 0) return null;

  const metric = (kind: ShowcaseKind, value: number) =>
    kind === "new"
      ? t("showcase.added", { date: formatDate(new Date(value).toISOString(), i18n.language) })
      : t(`showcase.${kind}.metric`, { count: Math.floor(value) });

  return (
    <div className="space-y-8 mb-10">
      {rows.map((row) => {
        const Icon = ICONS[row.kind];
        return (
          <section key={row.kind} aria-labelledby={`showcase-${row.kind}`}>
            <div className="flex items-baseline gap-2 mb-3">
              <Icon className="size-4 text-accent self-center" aria-hidden />
              <h2 id={`showcase-${row.kind}`} className="font-bold">
                {t(`showcase.${row.kind}.title`)}
              </h2>
              <p className="text-xs text-muted-foreground">{t(`showcase.${row.kind}.hint`)}</p>
            </div>
            <ul className="flex gap-4 overflow-x-auto snap-x pb-2 -mx-1 px-1">
              {row.items.map(({ course, metric: value }) => (
                <li key={course.id} className="snap-start shrink-0 w-56">
                  <button
                    type="button"
                    onClick={() => onOpen(course)}
                    className="group w-full text-left bg-card border border-border hover:border-accent rounded-md overflow-hidden transition-colors"
                  >
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img
                        src={imageOf(course, indexOf.get(course.id) ?? 0)}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-mono text-accent uppercase truncate">
                        {categoryOf(course)}
                      </p>
                      <p className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">
                        {titleOf(course)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {metric(row.kind, value)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
