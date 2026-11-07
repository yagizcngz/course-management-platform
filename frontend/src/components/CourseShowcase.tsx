import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { prefersLessMotion } from "@/lib/motionPref";
import { showcaseRows, type ShowcaseCourse, type ShowcaseKind } from "@/lib/showcase";
import { useCourseStats } from "./useCourseStats";
import { RatingSummary } from "./StarRating";

const ICONS: Record<ShowcaseKind, LucideIcon> = {
  popular: Trophy,
  hottest: Flame,
  trending: TrendingUp,
  new: Sparkles,
};

/**
 * Curated rows above a course list (most popular, hottest, trending, new), each a horizontal
 * strip of compact cards moved with previous/next buttons. The rows follow the page's scope
 * (category, sub-field, topic) and ignore the list's filters and sort; renders nothing until
 * there is something to show.
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
  const { list: stats, byId } = useCourseStats();
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
        const headingId = `showcase-${row.kind}`;
        return (
          <section key={row.kind} aria-labelledby={headingId}>
            <Carousel
              labelledBy={headingId}
              heading={
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <Icon className="size-4 text-accent self-center" aria-hidden />
                  <h2 id={headingId} className="font-bold">
                    {t(`showcase.${row.kind}.title`)}
                  </h2>
                  <p className="text-xs text-muted-foreground">{t(`showcase.${row.kind}.hint`)}</p>
                </div>
              }
            >
              {row.items.map(({ course, metric: value }) => {
                const s = byId.get(course.id);
                return (
                  <li key={course.id} className="snap-start shrink-0 w-56">
                    <button
                      type="button"
                      onClick={() => onOpen(course)}
                      className="group h-full w-full text-left bg-card border border-border hover:border-accent rounded-md overflow-hidden transition-colors"
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
                        <RatingSummary
                          average={s?.ratingAverage ?? 0}
                          count={s?.ratingCount ?? 0}
                          className="mt-1"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {metric(row.kind, value)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </Carousel>
          </section>
        );
      })}
    </div>
  );
}

/**
 * A horizontal list without a scrollbar: previous/next buttons page through it and are
 * disabled at either end. Tabbing into a card still scrolls it into view natively.
 */
export function Carousel({
  heading,
  labelledBy,
  children,
}: {
  heading: ReactNode;
  labelledBy: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 2px of slack: fractional widths can leave scrollLeft a hair short of the end
    const start = el.scrollLeft <= 2;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    // same edges keep the same object, so measuring after every render cannot loop
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);
  // new or fewer cards change the scroll width without resizing the list
  useEffect(measure);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(el.clientWidth * 0.85, 224),
      behavior: prefersLessMotion() ? "auto" : "smooth",
    });
  };

  const arrow =
    "flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-35";

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-4">
        {heading}
        {!(edges.start && edges.end) && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => page(-1)}
              disabled={edges.start}
              aria-label={t("showcase.prev")}
              className={arrow}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => page(1)}
              disabled={edges.end}
              aria-label={t("showcase.next")}
              className={arrow}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <ul
        ref={ref}
        onScroll={measure}
        aria-labelledby={labelledBy}
        // the inner padding keeps card focus rings clear of the clipped edges
        className="-mx-1 flex snap-x scroll-px-1 gap-4 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
    </>
  );
}
