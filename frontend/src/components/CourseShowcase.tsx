import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
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
 * The catalogue's curated rankings (most popular, hottest, trending, new) in one section: tabs pick
 * the ranking and the strip of compact cards below swaps in place, moved with previous/next
 * buttons. It ranks the courses it is given and knows nothing of the list's filters; a ranking
 * with no courses gets no tab, and nothing renders until one has something to show.
 */
export function CourseShowcase<T extends ShowcaseCourse>({
  courses,
  titleOf,
  categoryOf,
  imageOf,
  onOpen,
  titleClassName = "font-bold",
}: {
  courses: T[];
  titleOf: (c: T) => string;
  categoryOf: (c: T) => string;
  imageOf: (c: T, index: number) => string;
  onOpen: (c: T) => void;
  /** The section title matches the page's other section titles. */
  titleClassName?: string;
}) {
  const { t, i18n } = useTranslation();
  const { list: stats, byId } = useCourseStats();
  const rows = useMemo(() => showcaseRows(courses, stats), [courses, stats]);
  // a course's image index must match the grid's so placeholder art stays the same
  const indexOf = useMemo(() => new Map(courses.map((c, i) => [c.id, i])), [courses]);
  const [picked, setPicked] = useState<ShowcaseKind>("popular");
  const tabs = useRef<HTMLDivElement>(null);
  // the picked ranking may have emptied out (stats still loading); fall back to the first one
  const row = rows.find((r) => r.kind === picked) ?? rows[0];
  if (!row) return null;

  const metric = (kind: ShowcaseKind, value: number) =>
    kind === "new"
      ? t("showcase.added", { date: formatDate(new Date(value).toISOString(), i18n.language) })
      : t(`showcase.${kind}.metric`, { count: Math.floor(value) });

  // arrow keys move between tabs (WAI-ARIA tabs pattern); only the active tab is in the Tab order
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, Home: -rows.length, End: rows.length }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const at = rows.indexOf(row);
    const next = rows[Math.min(rows.length - 1, Math.max(0, at + step))];
    setPicked(next.kind);
    tabs.current?.querySelector<HTMLButtonElement>(`#showcase-tab-${next.kind}`)?.focus();
  };

  return (
    <section aria-labelledby="showcase-title" className="mb-10">
      <h2 id="showcase-title" className={`mb-4 ${titleClassName}`}>
        {t("showcase.title")}
      </h2>
      <Carousel
        key={row.kind} // a new ranking starts at its first card
        labelledBy={`showcase-tab-${row.kind}`}
        panelId="showcase-panel"
        heading={
          <div className="min-w-0">
            <div
              ref={tabs}
              role="tablist"
              aria-labelledby="showcase-title"
              onKeyDown={onKeyDown}
              className="-mx-1 flex gap-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {rows.map((r) => {
                const Icon = ICONS[r.kind];
                const on = r.kind === row.kind;
                return (
                  <button
                    key={r.kind}
                    id={`showcase-tab-${r.kind}`}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-controls="showcase-panel"
                    tabIndex={on ? 0 : -1}
                    onClick={() => setPicked(r.kind)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden />
                    {t(`showcase.${r.kind}.title`)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t(`showcase.${row.kind}.hint`)}</p>
          </div>
        }
      >
        {row.items.map(({ course, metric: value }, rank) => {
          const s = byId.get(course.id);
          return (
            <li key={course.id} className="snap-start shrink-0 w-56">
              <button
                type="button"
                onClick={() => onOpen(course)}
                className="group h-full w-full text-left bg-card border border-border hover:border-accent rounded-md overflow-hidden transition-colors"
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <img
                    src={imageOf(course, indexOf.get(course.id) ?? 0)}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 font-mono text-[11px] tabular-nums text-foreground shadow-sm">
                    {rank + 1}
                  </span>
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
                  <p className="mt-1 text-xs text-muted-foreground">{metric(row.kind, value)}</p>
                </div>
              </button>
            </li>
          );
        })}
      </Carousel>
    </section>
  );
}

/**
 * A horizontal list without a scrollbar: previous/next buttons page through it and are
 * disabled at either end. Tabbing into a card still scrolls it into view natively.
 */
export function Carousel({
  heading,
  labelledBy,
  panelId,
  children,
}: {
  heading: ReactNode;
  labelledBy: string;
  /** Set when tabs control the list; it is then wrapped in the tab panel. */
  panelId?: string;
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
      <div className="mb-3 flex items-end justify-between gap-4">
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
      <div id={panelId} role={panelId ? "tabpanel" : undefined} aria-labelledby={labelledBy}>
        <ul
          ref={ref}
          onScroll={measure}
          aria-labelledby={labelledBy}
          // the inner padding keeps card focus rings clear of the clipped edges
          className="-mx-1 flex snap-x scroll-px-1 gap-4 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </ul>
      </div>
    </>
  );
}
