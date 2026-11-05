import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { GuestCourseModal, PageIntro, PublicPage } from "../components/PublicPage";
import { Stagger, StaggerItem } from "../components/motion";
import { CourseCard } from "../components/landing/VariantAtelier";
import { matchesQuery, price } from "../components/landing/catalog";
import { usePublicCatalog } from "../components/landing/usePublicCatalog";
import type { LandingCourse } from "../components/landing/shared";

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const PRICES = ["under500", "500to1000", "over1000"] as const;
const SORTS = ["popular", "newest", "priceAsc", "priceDesc", "title"] as const;

type Level = (typeof LEVELS)[number];
type PriceBand = (typeof PRICES)[number];
type Sort = (typeof SORTS)[number];

interface CatalogSearch {
  q?: string;
  category?: string;
  subCategory?: string;
  level?: Level;
  price?: PriceBand;
  sort?: Sort;
  view?: "index";
}

const pick = <T extends string>(list: readonly T[], value: unknown) =>
  list.includes(value as T) ? (value as T) : undefined;
const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : undefined;

export const Route = createFileRoute("/kurslar")({
  // every filter lives in the URL, so a category link anywhere can open this page pre-filtered
  validateSearch: (s: Record<string, unknown>): CatalogSearch => ({
    q: text(s.q),
    category: text(s.category),
    subCategory: text(s.subCategory),
    level: pick(LEVELS, s.level),
    price: pick(PRICES, s.price),
    sort: pick(SORTS, s.sort),
    view: s.view === "index" ? "index" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Kurslar — E-Kurs" },
      {
        name: "description",
        content: "E-Kurs'taki tüm kurslar: ara, alana, seviyeye ve fiyata göre süz.",
      },
    ],
  }),
  component: CoursesCatalog,
});

const inBand = (n: number, band?: PriceBand) =>
  !band ||
  (band === "under500" ? n < 500 : band === "500to1000" ? n >= 500 && n <= 1000 : n > 1000);

function CoursesCatalog() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/kurslar" });
  const { courses, categories, teachers, label, describe, extra } = usePublicCatalog();
  const [selected, setSelected] = useState<LandingCourse | null>(null);
  // typed text stays local so the field keeps spaces and focus; the trimmed value goes to the URL
  const [query, setQuery] = useState(search.q ?? "");
  const sort = search.sort ?? "popular";

  const set = (patch: Partial<CatalogSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false });

  const results = useMemo(() => {
    if (!courses) return null;
    const list = courses.filter(
      (c) =>
        (!search.category || c.category === search.category) &&
        (!search.subCategory || c.subCategory === search.subCategory) &&
        (!search.level || c.level === search.level) &&
        inBand(Number(c.price), search.price) &&
        matchesQuery(c, search.q ?? "", label, extra(c)),
    );
    // the API already returns the most popular first
    if (sort === "newest")
      list.sort(
        (a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "") || b.id - a.id,
      );
    if (sort === "priceAsc") list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "priceDesc") list.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "title")
      list.sort((a, b) => label("courses", a.title).localeCompare(label("courses", b.title), "tr"));
    return list;
  }, [
    courses,
    search.category,
    search.subCategory,
    search.level,
    search.price,
    search.q,
    sort,
    label,
    extra,
  ]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of courses ?? []) m.set(c.category, (m.get(c.category) ?? 0) + 1);
    return m;
  }, [courses]);
  const categoryNames = [
    ...categories.filter((c) => counts.has(c)),
    ...[...counts.keys()].filter((c) => !categories.includes(c)),
  ];
  // sub-fields of the chosen category, most courses first
  const subCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of courses ?? [])
      if (c.category === search.category && c.subCategory)
        m.set(c.subCategory, (m.get(c.subCategory) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [courses, search.category]);
  const filtered = !!(search.q || search.category || search.level || search.price);
  // the list re-staggers when the filter changes, so new cards never stay hidden
  const listKey = [
    search.q,
    search.category,
    search.subCategory,
    search.level,
    search.price,
    sort,
    search.view,
  ].join("|");

  const levelLabel = (level?: string | null) =>
    level ? t(`catalog.levels.${level}`, level) : t("catalog.allLevels");

  return (
    <PublicPage>
      <PageIntro eyebrow={t("catalog.eyebrow")} title={t("catalog.title")} lead={t("catalog.lead")}>
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="relative mt-10 max-w-2xl"
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
        {/* disciplines */}
        <nav
          aria-label={t("catalog.categoryFilter")}
          className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:overflow-visible"
        >
          <ul className="flex gap-2 py-6 max-lg:min-w-max lg:flex-wrap">
            {[null, ...categoryNames].map((name) => {
              const on = (search.category ?? null) === name;
              return (
                <li key={name ?? "all"}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ category: name ?? undefined, subCategory: undefined })}
                    className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-gold hover:text-foreground"
                    }`}
                  >
                    {name ? label("categories", name) : t("catalog.allCategories")}
                    <span className="ml-2 font-mono text-[11px] tabular-nums opacity-70">
                      {name ? counts.get(name) : (courses?.length ?? "")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* sub-fields of the chosen discipline */}
        {search.category && subCounts.length > 0 && (
          <div
            role="group"
            aria-label={t("catalog.subCategoryFilter")}
            className="-mx-4 -mt-2 overflow-x-auto px-4 pb-5 sm:mx-0 sm:px-0 lg:overflow-visible"
          >
            <ul className="flex items-center gap-x-1 gap-y-2 max-lg:min-w-max lg:flex-wrap">
              <li className="mr-2 font-mono text-[11px] uppercase tracking-[0.14em] text-gold">
                {t("catalog.subCategoryFilter")}
              </li>
              {[[null, counts.get(search.category) ?? 0] as const, ...subCounts].map(([sub, n]) => (
                <li key={sub ?? "all"}>
                  <button
                    type="button"
                    aria-pressed={(search.subCategory ?? null) === sub}
                    onClick={() => set({ subCategory: sub ?? undefined })}
                    className="rounded-full px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-secondary aria-pressed:font-medium aria-pressed:text-foreground"
                  >
                    {sub ? label("subCategories", sub) : t("catalog.allSubCategories")}
                    <span className="ml-1.5 font-mono text-[11px] tabular-nums opacity-70">
                      {n}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* level, price, sort, view */}
        <div className="flex flex-col gap-4 border-y border-border py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div role="group" aria-label={t("catalog.level")} className="flex flex-wrap gap-1">
              {[undefined, ...LEVELS].map((lv) => (
                <button
                  key={lv ?? "all"}
                  type="button"
                  aria-pressed={search.level === lv}
                  onClick={() => set({ level: lv })}
                  className="rounded-full px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-secondary aria-pressed:font-medium aria-pressed:text-foreground"
                >
                  {levelLabel(lv)}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              {t("catalog.price")}
              <select
                value={search.price ?? ""}
                onChange={(e) => set({ price: pick(PRICES, e.target.value) })}
                className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:border-gold"
              >
                <option value="">{t("catalog.anyPrice")}</option>
                {PRICES.map((p) => (
                  <option key={p} value={p}>
                    {t(`catalog.prices.${p}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              {t("catalog.sort")}
              <select
                value={sort}
                onChange={(e) =>
                  set({
                    sort: e.target.value === "popular" ? undefined : pick(SORTS, e.target.value),
                  })
                }
                className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:border-gold"
              >
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`catalog.sorts.${s}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center justify-between gap-4">
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

        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              set({
                q: undefined,
                category: undefined,
                subCategory: undefined,
                level: undefined,
                price: undefined,
              });
            }}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline decoration-gold underline-offset-4 hover:text-foreground"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
            {t("catalog.clearFilters")}
          </button>
        )}

        {results !== null && results.length === 0 && (
          <p role="status" className="py-24 text-center text-muted-foreground">
            {t("catalog.empty")}
          </p>
        )}

        {results && results.length > 0 && search.view !== "index" && (
          <Stagger
            key={listKey}
            className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
          >
            {results.map((course, i) => (
              <StaggerItem key={course.id}>
                <CourseCard
                  course={course}
                  index={i}
                  teachers={teachers}
                  label={label}
                  description={describe(course)}
                  onOpen={setSelected}
                  meta={
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {levelLabel(course.level)}
                      {course.subCategory && ` · ${label("subCategories", course.subCategory)}`}
                    </span>
                  }
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {results && results.length > 0 && search.view === "index" && (
          <ol key={listKey} className="mt-10 border-t border-foreground/70">
            {results.map((course, i) => (
              <li key={course.id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setSelected(course)}
                  className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-4 text-left sm:grid-cols-[3rem_1fr_11rem_9rem_6rem]"
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
                      <span className="sm:hidden"> · {label("categories", course.category)}</span>
                    </span>
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
            ))}
          </ol>
        )}
      </div>

      <GuestCourseModal course={selected} teachers={teachers} onClose={() => setSelected(null)} />
    </PublicPage>
  );
}
