import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronRight, Users } from "lucide-react";
import type { CourseSearch, FacetCourse, StatsById } from "@/lib/courseFilters";
import { RatingSummary } from "./StarRating";

/** Breadcrumb back up the scope; the last step is the current page and not a link. */
export function CatalogCrumbs({
  crumbs,
  current,
  onPick,
}: {
  crumbs: { text: string; patch: Partial<CourseSearch> }[];
  current: string;
  onPick: (patch: Partial<CourseSearch>) => void;
}) {
  const { t } = useTranslation();
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label={t("catalog.header.breadcrumb")}>
      <ol className="flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
        {crumbs.map((c) => (
          <li key={c.text} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPick(c.patch)}
              className="underline-offset-4 hover:underline"
            >
              {c.text}
            </button>
            <ChevronRight aria-hidden="true" className="size-3 opacity-60" />
          </li>
        ))}
        <li aria-current="page" className="text-muted-foreground">
          {current}
        </li>
      </ol>
    </nav>
  );
}

/** Course count, learners and the scope's weighted average rating. */
export function CatalogMeta({ courses, stats }: { courses: FacetCourse[]; stats: StatsById }) {
  const { t, i18n } = useTranslation();
  const m = useMemo(() => {
    let students = 0;
    let stars = 0;
    let ratings = 0;
    for (const c of courses) {
      const s = stats.get(c.id);
      if (!s) continue;
      students += s.students;
      stars += s.ratingAverage * s.ratingCount;
      ratings += s.ratingCount;
    }
    return { students, ratings, average: ratings ? stars / ratings : 0 };
  }, [courses, stats]);
  return (
    <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
      <li className="inline-flex items-center gap-1.5">
        <BookOpen aria-hidden="true" className="size-4" />
        {t("catalog.header.courses", { count: courses.length })}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <Users aria-hidden="true" className="size-4" />
        {t("catalog.header.learners", {
          count: m.students,
          formatted: m.students.toLocaleString(i18n.language),
        })}
      </li>
      <li>
        <RatingSummary average={m.average} count={m.ratings} className="text-sm" />
      </li>
    </ul>
  );
}
