import type { CourseStats } from "./showcase";

/**
 * Facets and orderings of the "All courses" list on both catalogues (/kurslar and /katalog).
 * Every function returns a new array; the source list is never sorted or changed in place.
 */

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const PRICE_BANDS = ["free", "paid", "under500", "500to1000", "over1000"] as const;
/** Total video length: under 1 h, 1-3 h, 3-6 h, over 6 h. */
export const DURATIONS = ["under1", "1to3", "3to6", "over6"] as const;
export const RATINGS = [4.5, 4, 3.5, 3] as const;
export const LANGUAGES = ["tr", "en", "de", "fr", "es", "ar"] as const;
export const SORTS = ["popular", "rated", "newest", "priceAsc", "priceDesc", "title"] as const;

export type Level = (typeof LEVELS)[number];
export type PriceBand = (typeof PRICE_BANDS)[number];
export type Duration = (typeof DURATIONS)[number];
export type Language = (typeof LANGUAGES)[number];
export type Sort = (typeof SORTS)[number];

/** The course fields the facets read, whatever shape the page holds its courses in. */
export interface FacetCourse {
  id: number;
  category: string;
  subCategory?: string | null;
  topic?: string | null;
  level?: string | null;
  language?: string | null;
  /** Comma separated language codes, as the API stores them. */
  subtitleLanguages?: string | null;
  price: number;
  createdAt?: string | null;
}

/** Navigation scope: the page header follows it. */
export interface CourseScope {
  category?: string;
  subCategory?: string;
  topic?: string;
}

/** Refinements of the "All courses" list. */
export interface CourseFilters {
  level?: Level;
  price?: PriceBand;
  duration?: Duration;
  rating?: number;
  language?: Language;
  subtitle?: Language;
}

export type StatsById = ReadonlyMap<number, CourseStats>;

export const statsById = (stats: CourseStats[]): StatsById =>
  new Map(stats.map((s) => [s.courseId, s]));

const HOUR = 3600;

export function inPriceBand(price: number, band?: PriceBand) {
  switch (band) {
    case undefined:
      return true;
    case "free":
      return price <= 0;
    case "paid":
      return price > 0;
    case "under500":
      return price > 0 && price < 500;
    case "500to1000":
      return price >= 500 && price <= 1000;
    case "over1000":
      return price > 1000;
  }
}

export function durationBand(seconds: number): Duration {
  if (seconds < HOUR) return "under1";
  if (seconds < 3 * HOUR) return "1to3";
  if (seconds < 6 * HOUR) return "3to6";
  return "over6";
}

export const subtitlesOf = (c: FacetCourse) =>
  (c.subtitleLanguages ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Courses without a language predate the field and are Turkish. */
export const languageOf = (c: FacetCourse) => c.language || "tr";

export function inScope(c: FacetCourse, s: CourseScope) {
  return (
    (!s.category || c.category === s.category) &&
    (!s.subCategory || c.subCategory === s.subCategory) &&
    (!s.topic || c.topic === s.topic)
  );
}

/** Every facet of the "All courses" list: the scope and the refinements. */
export type CourseQuery = CourseScope & CourseFilters;
export type FilterKey = keyof CourseQuery;

/**
 * Whether a course passes every facet except `skip` (used for each facet's own counts). Scope and
 * refinements go through the same check, so the order they were picked in never changes a result.
 */
export function passes(c: FacetCourse, stats: StatsById, f: CourseQuery, skip?: FilterKey) {
  const s = stats.get(c.id);
  return (
    (skip === "category" || !f.category || c.category === f.category) &&
    (skip === "subCategory" || !f.subCategory || c.subCategory === f.subCategory) &&
    (skip === "topic" || !f.topic || c.topic === f.topic) &&
    (skip === "level" || !f.level || c.level === f.level) &&
    (skip === "price" || inPriceBand(Number(c.price) || 0, f.price)) &&
    (skip === "duration" || !f.duration || durationBand(s?.durationSeconds ?? 0) === f.duration) &&
    (skip === "rating" || !f.rating || (s?.ratingCount ? s.ratingAverage >= f.rating : false)) &&
    (skip === "language" || !f.language || languageOf(c) === f.language) &&
    (skip === "subtitle" || !f.subtitle || subtitlesOf(c).includes(f.subtitle))
  );
}

export function filterCourses<T>(
  items: readonly T[],
  of: (item: T) => FacetCourse,
  stats: StatsById,
  f: CourseQuery,
): T[] {
  return items.filter((item) => passes(of(item), stats, f));
}

/** How many courses each option of one facet would leave, with the other filters applied. */
export function facetCounts<T>(
  items: readonly T[],
  of: (item: T) => FacetCourse,
  stats: StatsById,
  f: CourseQuery,
  key: FilterKey,
): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1);
  for (const item of items) {
    const c = of(item);
    if (!passes(c, stats, f, key)) continue;
    const s = stats.get(c.id);
    switch (key) {
      case "category":
        add(c.category);
        break;
      case "subCategory":
        if (c.subCategory) add(c.subCategory);
        break;
      case "topic":
        if (c.topic) add(c.topic);
        break;
      case "level":
        if (c.level) add(c.level);
        break;
      case "price":
        for (const band of PRICE_BANDS) if (inPriceBand(Number(c.price) || 0, band)) add(band);
        break;
      case "duration":
        add(durationBand(s?.durationSeconds ?? 0));
        break;
      case "rating":
        if (s?.ratingCount) for (const r of RATINGS) if (s.ratingAverage >= r) add(String(r));
        break;
      case "language":
        add(languageOf(c));
        break;
      case "subtitle":
        for (const l of subtitlesOf(c)) add(l);
        break;
    }
  }
  return counts;
}

/**
 * A sorted copy. Ties keep the incoming order (the API's popularity or the search rank), so a
 * re-render never reshuffles equal courses.
 */
export function sortCourses<T>(
  items: readonly T[],
  of: (item: T) => FacetCourse,
  stats: StatsById,
  sort: Sort,
  titleOf: (item: T) => string,
): T[] {
  const time = (c: FacetCourse) => (c.createdAt ? Date.parse(c.createdAt) || 0 : 0);
  const cmp: Record<Sort, (a: T, b: T) => number> = {
    popular: (a, b) => (stats.get(of(b).id)?.students ?? 0) - (stats.get(of(a).id)?.students ?? 0),
    rated: (a, b) => {
      const x = stats.get(of(a).id);
      const y = stats.get(of(b).id);
      // unrated courses go last, then average, then how many people rated
      return (
        Number(!!y?.ratingCount) - Number(!!x?.ratingCount) ||
        (y?.ratingAverage ?? 0) - (x?.ratingAverage ?? 0) ||
        (y?.ratingCount ?? 0) - (x?.ratingCount ?? 0)
      );
    },
    newest: (a, b) => time(of(b)) - time(of(a)) || of(b).id - of(a).id,
    priceAsc: (a, b) => (Number(of(a).price) || 0) - (Number(of(b).price) || 0),
    priceDesc: (a, b) => (Number(of(b).price) || 0) - (Number(of(a).price) || 0),
    title: (a, b) => titleOf(a).localeCompare(titleOf(b), "tr"),
  };
  return [...items].sort(cmp[sort]);
}

/**
 * Values of one field, most courses first. Facets list their options in this order, taken before
 * the refinements, so picking a filter changes the counts but never reorders the options.
 */
export function valuesByCount<T>(
  items: readonly T[],
  value: (item: T) => string | null | undefined,
) {
  const m = new Map<string, number>();
  for (const item of items) {
    const v = value(item);
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr")).map(([v]) => v);
}

// --- URL search params shared by both catalogues ---

export interface CourseSearch extends CourseScope, CourseFilters {
  q?: string;
  sort?: Sort;
}

const pick = <T extends string | number>(list: readonly T[], value: unknown) =>
  list.find((x) => String(x) === String(value));
const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : undefined;

/** Unknown or malformed values are dropped, so a shared or hand-edited link cannot break the page. */
export function parseCourseSearch(s: Record<string, unknown>): CourseSearch {
  return {
    q: text(s.q),
    category: text(s.category),
    subCategory: text(s.subCategory),
    topic: text(s.topic),
    level: pick(LEVELS, s.level),
    price: pick(PRICE_BANDS, s.price),
    duration: pick(DURATIONS, s.duration),
    rating: pick(RATINGS, s.rating),
    language: pick(LANGUAGES, s.language),
    subtitle: pick(LANGUAGES, s.subtitle),
    sort: pick(SORTS, s.sort),
  };
}

/** Number of active facets, the category included. */
export const activeFilterCount = (s: CourseSearch) =>
  [
    s.category,
    s.subCategory,
    s.topic,
    s.level,
    s.price,
    s.duration,
    s.rating,
    s.language,
    s.subtitle,
  ].filter((v) => v !== undefined).length;

/** The patch that clears every facet but keeps the text search and sort. */
export const clearedFilters: Partial<CourseSearch> = {
  category: undefined,
  subCategory: undefined,
  topic: undefined,
  level: undefined,
  price: undefined,
  duration: undefined,
  rating: undefined,
  language: undefined,
  subtitle: undefined,
};
