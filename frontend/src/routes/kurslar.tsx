import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { GuestCourseModal, PageIntro, PublicPage } from "../components/PublicPage";
import { CourseShowcase } from "../components/CourseShowcase";
import { CourseFilterPanel } from "../components/CourseFilterPanel";
import { CatalogCrumbs, CatalogMeta } from "../components/CatalogHeading";
import { useCatalogHeading } from "../components/useCatalogHeading";
import { RatingSummary } from "../components/StarRating";
import { useCourseStats } from "../components/useCourseStats";
import { getCourseImage, type CourseData } from "../components/courseHelpers";
import { CourseCard } from "../components/landing/VariantAtelier";
import { courseRank, price } from "../components/landing/catalog";
import { rankBy } from "@/lib/search";
import {
  SORTS,
  activeFilterCount,
  clearedFilters,
  filterCourses,
  inScope,
  parseCourseSearch,
  sortCourses,
  type CourseSearch,
  type FacetCourse,
} from "@/lib/courseFilters";
import { usePublicCatalog } from "../components/landing/usePublicCatalog";
import { useOptimisticSearch } from "../components/useOptimisticSearch";
import type { LandingCourse } from "../components/landing/shared";

interface CatalogSearch extends CourseSearch {
  view?: "index";
}

const self = (c: LandingCourse) => c as FacetCourse;

export const Route = createFileRoute("/kurslar")({
  // every filter lives in the URL, so a category link anywhere can open this page pre-filtered
  validateSearch: (s: Record<string, unknown>): CatalogSearch => ({
    ...parseCourseSearch(s),
    view: s.view === "index" ? "index" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Kurslar — E-Kurs" },
      {
        name: "description",
        content:
          "E-Kurs'taki tüm kurslar: ara; alana, konuya, puana, süreye, seviyeye, dile ve fiyata göre süz.",
      },
    ],
  }),
  component: CoursesCatalog,
});

function CoursesCatalog() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/kurslar" });
  const [search, set] = useOptimisticSearch(Route.useSearch(), (patch: Partial<CatalogSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false }),
  );
  const { courses, categories, teachers, label, describe, extra } = usePublicCatalog();
  const { byId: stats } = useCourseStats();
  const [selected, setSelected] = useState<LandingCourse | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // typed text stays local so the field keeps spaces and focus; the trimmed value goes to the URL
  const [query, setQuery] = useState(search.q ?? "");

  // the header follows the scope; the curated rankings rank the whole catalogue
  const scoped = useMemo(
    () => (courses ?? []).filter((c) => inScope(self(c), search)),
    [courses, search],
  );

  const results = useMemo(() => {
    if (!courses) return null;
    const title = (c: LandingCourse) => label("courses", c.title);
    // best matches first; with no query every course ranks the same and the API order stays
    const ranked = rankBy(filterCourses(courses, self, stats, search), (c) =>
      courseRank(c, search.q ?? "", label, extra(c)),
    );
    // a search keeps its relevance order until a sort is picked
    if (search.q && !search.sort) return ranked;
    return sortCourses(ranked, self, stats, search.sort ?? "popular", title);
  }, [courses, stats, search, label, extra]);

  const heading = useCatalogHeading(search, label, {
    title: t("catalog.title"),
    lead: t("catalog.lead"),
  });
  const refinements = activeFilterCount(search);
  const levelLabel = (level?: string | null) =>
    level ? t(`catalog.levels.${level}`, level) : t("catalog.allLevels");

  return (
    <PublicPage>
      <PageIntro
        eyebrow={
          heading.eyebrow ?? (
            <CatalogCrumbs
              crumbs={heading.crumbs}
              current={heading.title}
              onPick={(patch) => set(patch)}
            />
          )
        }
        title={heading.title}
        lead={heading.lead}
      >
        <div className="mt-6">
          <CatalogMeta courses={scoped} stats={stats} />
        </div>
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="relative mt-8 max-w-2xl"
        >
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            autoComplete="off"
            aria-label={t("guest.searchPlaceholder")}
            placeholder={t("guest.searchPlaceholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              set({ q: e.target.value.trim() || undefined });
            }}
            className="w-full rounded-md border border-border bg-card py-4 pl-13 pr-4 text-base outline-none transition-[border-color,box-shadow] focus:border-gold focus:ring-4 focus:ring-gold/15 [&::-webkit-search-cancel-button]:hidden"
          />
        </form>
      </PageIntro>

      <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6">
        {/* curated rankings over the whole catalogue, untouched by the filters below; a text
            search shows only the ranked list.
            The old staggered grid is kept in components/stashed/StaggeredCourseGrid.tsx */}
        {courses && courses.length > 0 && search.view !== "index" && !search.q && (
          <div className="mt-10">
            <CourseShowcase
              courses={courses}
              titleClassName="font-serif text-3xl"
              titleOf={(c) => label("courses", c.title)}
              categoryOf={(c) => label("categories", c.category)}
              imageOf={(c, i) => getCourseImage(c as unknown as CourseData, i)}
              onOpen={setSelected}
            />
          </div>
        )}

        <h2 id="all-courses" className="mt-6 font-serif text-3xl">
          {t("showcase.allCourses")}
        </h2>

        {/* toolbar: filters (mobile), sort, count, view */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="course-filters"
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:border-gold lg:hidden"
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              {t("catalog.facets.title")}
              {refinements > 0 && (
                <span className="rounded-full bg-primary px-1.5 font-mono text-[11px] text-primary-foreground">
                  {refinements}
                </span>
              )}
            </button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              {t("catalog.sort")}
              <select
                value={search.sort ?? (search.q ? "" : "popular")}
                onChange={(e) => {
                  const v = e.target.value;
                  set({ sort: v ? (SORTS.find((s) => s === v) ?? undefined) : undefined });
                }}
                className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:border-gold"
              >
                {search.q && <option value="">{t("catalog.sorts.relevance")}</option>}
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`catalog.sorts.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            {(refinements > 0 || search.q) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  set({ ...clearedFilters, q: undefined });
                }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline decoration-gold underline-offset-4 hover:text-foreground"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
                {t("catalog.clearFilters")}
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p
              role="status"
              aria-live="polite"
              className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground"
            >
              {results === null
                ? t("common.loading")
                : t("guest.courseCount", { count: results.length })}
            </p>
            <div
              role="group"
              aria-label={t("catalog.view")}
              className="flex rounded-full border border-border p-0.5"
            >
              {([undefined, "index"] as const).map((v) => (
                <button
                  key={v ?? "grid"}
                  type="button"
                  aria-pressed={search.view === v}
                  aria-label={t(v ? "catalog.viewIndex" : "catalog.viewGrid")}
                  title={t(v ? "catalog.viewIndex" : "catalog.viewGrid")}
                  onClick={() => set({ view: v })}
                  className="flex h-8 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {v ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <aside
            id="course-filters"
            aria-label={t("catalog.facets.title")}
            className={`${filtersOpen ? "block" : "hidden"} mb-8 lg:mb-0 lg:block`}
          >
            <CourseFilterPanel
              search={search}
              set={set}
              courses={courses ?? []}
              categories={categories}
              stats={stats}
              label={label}
            />
          </aside>

          <div className="min-w-0">
            {results !== null && results.length === 0 && (
              <p role="status" className="py-24 text-center text-muted-foreground">
                {t("catalog.empty")}
              </p>
            )}

            {results && results.length > 0 && search.view !== "index" && (
              <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((course, i) => {
                  const s = stats.get(course.id);
                  return (
                    <div key={course.id}>
                      <CourseCard
                        course={course}
                        index={i}
                        teachers={teachers}
                        label={label}
                        description={describe(course)}
                        onOpen={setSelected}
                        meta={
                          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              {levelLabel(course.level)}
                              {course.subCategory &&
                                ` · ${label("subCategories", course.subCategory)}`}
                            </span>
                            <RatingSummary
                              average={s?.ratingAverage ?? 0}
                              count={s?.ratingCount ?? 0}
                            />
                          </span>
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {results && results.length > 0 && search.view === "index" && (
              <ol className="border-t border-foreground/70">
                {results.map((course, i) => {
                  const s = stats.get(course.id);
                  return (
                    <li key={course.id} className="border-b border-border">
                      <button
                        type="button"
                        onClick={() => setSelected(course)}
                        className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-4 text-left sm:grid-cols-[3rem_1fr_10rem_8rem_6rem]"
                      >
                        <span className="font-mono text-xs tabular-nums text-gold">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-serif text-xl leading-tight break-words decoration-gold underline-offset-4 group-hover:underline">
                            {label("courses", course.title)}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {course.instructor || "—"}
                            <span className="sm:hidden">
                              {" "}
                              · {label("categories", course.category)}
                            </span>
                          </span>
                          <RatingSummary
                            average={s?.ratingAverage ?? 0}
                            count={s?.ratingCount ?? 0}
                            className="mt-1"
                          />
                        </span>
                        <span className="hidden text-sm text-muted-foreground sm:block">
                          {label("categories", course.category)}
                          {course.subCategory && (
                            <span className="mt-0.5 block text-xs opacity-80">
                              {label("subCategories", course.subCategory)}
                            </span>
                          )}
                        </span>
                        <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:block">
                          {levelLabel(course.level)}
                        </span>
                        <span className="text-right tabular-nums">{price(course.price)}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>

      <GuestCourseModal course={selected} teachers={teachers} onClose={() => setSelected(null)} />
    </PublicPage>
  );
}
