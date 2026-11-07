import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
  DURATIONS,
  LANGUAGES,
  LEVELS,
  PRICE_BANDS,
  RATINGS,
  facetCounts,
  valuesByCount,
  type CourseFilters,
  type CourseSearch,
  type FacetCourse,
  type FilterKey,
  type StatsById,
} from "@/lib/courseFilters";
import { Stars } from "./StarRating";

const self = (c: FacetCourse) => c;

/**
 * The facet column of the "All courses" list: category, sub-field and topic (which also set the
 * page's header), then rating, length, level, price, language and subtitles. Each option shows how
 * many courses it would leave with every other choice kept, whatever order they were picked in.
 */
export function CourseFilterPanel({
  search,
  set,
  courses,
  categories,
  stats,
  label,
}: {
  search: CourseSearch;
  set: (patch: Partial<CourseSearch>) => void;
  /** Every course of the catalogue; the panel applies the scope and filters itself. */
  courses: FacetCourse[];
  /** Category names in display order; categories without courses are left out. */
  categories: string[];
  stats: StatsById;
  label: (kind: "categories" | "subCategories" | "topics", value: string) => string;
}) {
  const { t, i18n } = useTranslation();
  const counts = (key: FilterKey) => facetCounts(courses, self, stats, search, key);

  // option order comes from the scope above each facet, not from the counts, so picking a
  // filter changes the numbers but never reshuffles the list under the pointer
  const categoryOptions = useMemo(() => {
    const present = valuesByCount(courses, (c) => c.category);
    return [
      ...categories.filter((c) => present.includes(c)),
      ...present.filter((c) => !categories.includes(c)),
    ];
  }, [courses, categories]);
  const subOptions = useMemo(
    () =>
      search.category
        ? valuesByCount(
            courses.filter((c) => c.category === search.category),
            (c) => c.subCategory,
          )
        : [],
    [courses, search.category],
  );
  const topicOptions = useMemo(
    () =>
      valuesByCount(
        courses.filter(
          (c) =>
            (!search.category || c.category === search.category) &&
            (!search.subCategory || c.subCategory === search.subCategory),
        ),
        (c) => c.topic,
      ),
    [courses, search.category, search.subCategory],
  );

  const category = counts("category");
  const sub = counts("subCategory");
  const topic = counts("topic");
  const rating = counts("rating");
  const duration = counts("duration");
  const level = counts("level");
  const price = counts("price");
  const language = counts("language");
  const subtitle = counts("subtitle");
  const ratingText = (r: number) =>
    t("catalog.ratingAtLeast", {
      value: r.toLocaleString(i18n.language, { minimumFractionDigits: 1 }),
    });

  return (
    <div className="divide-y divide-border border-y border-border">
      <Facet
        title={t("catalog.facets.category")}
        name="category"
        value={search.category}
        // a new category holds none of the old sub-field or topic
        onPick={(v) => set({ category: v, subCategory: undefined, topic: undefined })}
        options={categoryOptions.map((v) => ({
          value: v,
          label: label("categories", v),
          count: category.get(v) ?? 0,
        }))}
      />
      <Facet
        title={t("catalog.facets.subCategory")}
        name="subCategory"
        value={search.subCategory}
        // a new sub-field may not hold the chosen topic
        onPick={(v) => set({ subCategory: v, topic: undefined })}
        options={subOptions.map((v) => ({
          value: v,
          label: label("subCategories", v),
          count: sub.get(v) ?? 0,
        }))}
      />
      <Facet
        title={t("catalog.facets.topic")}
        name="topic"
        value={search.topic}
        onPick={(v) => set({ topic: v })}
        options={topicOptions.map((v) => ({
          value: v,
          label: label("topics", v),
          count: topic.get(v) ?? 0,
        }))}
      />
      <Facet
        title={t("catalog.facets.rating")}
        name="rating"
        value={search.rating === undefined ? undefined : String(search.rating)}
        onPick={(v) => set({ rating: v === undefined ? undefined : Number(v) })}
        options={RATINGS.map((r) => ({
          value: String(r),
          label: (
            <span className="inline-flex items-center gap-2">
              <Stars value={r} className="text-[0.8rem]" />
              {ratingText(r)}
            </span>
          ),
          text: ratingText(r),
          count: rating.get(String(r)) ?? 0,
        }))}
      />
      <Facet
        title={t("catalog.facets.duration")}
        name="duration"
        value={search.duration}
        onPick={(v) => set({ duration: v as CourseFilters["duration"] })}
        options={DURATIONS.map((d) => ({
          value: d,
          label: t(`catalog.durations.${d}`),
          count: duration.get(d) ?? 0,
        }))}
      />
      <Facet
        title={t("catalog.level")}
        name="level"
        value={search.level}
        onPick={(v) => set({ level: v as CourseFilters["level"] })}
        options={LEVELS.map((l) => ({
          value: l,
          label: t(`catalog.levels.${l}`),
          count: level.get(l) ?? 0,
        }))}
      />
      <Facet
        title={t("catalog.price")}
        name="price"
        value={search.price}
        onPick={(v) => set({ price: v as CourseFilters["price"] })}
        options={PRICE_BANDS.map((p) => ({
          value: p,
          label: t(`catalog.prices.${p}`),
          count: price.get(p) ?? 0,
        }))}
      />
      <Facet
        title={t("catalog.facets.language")}
        name="language"
        value={search.language}
        onPick={(v) => set({ language: v as CourseFilters["language"] })}
        options={LANGUAGES.filter((l) => language.has(l) || search.language === l).map((l) => ({
          value: l,
          label: t(`languages.${l}`),
          count: language.get(l) ?? 0,
        }))}
      />
      <Facet
        title={t("catalog.facets.subtitles")}
        name="subtitle"
        value={search.subtitle}
        onPick={(v) => set({ subtitle: v as CourseFilters["subtitle"] })}
        options={LANGUAGES.filter((l) => subtitle.has(l) || search.subtitle === l).map((l) => ({
          value: l,
          label: t(`languages.${l}`),
          count: subtitle.get(l) ?? 0,
        }))}
      />
    </div>
  );
}

interface Option {
  value: string;
  label: ReactNode;
  /** Plain text of a non-text label, for the accessible name. */
  text?: string;
  count: number;
}

/** Long lists (categories, topics) show this many options until "Show all". */
const LIMIT = 8;

/** One collapsible group of radio options; "Any" clears it. */
function Facet({
  title,
  name,
  value,
  onPick,
  options,
}: {
  title: string;
  name: string;
  value?: string;
  onPick: (value: string | undefined) => void;
  options: Option[];
}) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  if (options.length === 0) return null;
  const long = options.length > LIMIT;
  // a checked option past the limit stays visible
  const shown =
    long && !all ? options.filter((o, i) => i < LIMIT || o.value === (value ?? "")) : options;
  return (
    <details open className="group py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <fieldset className="mt-2 min-w-0 space-y-1">
        <legend className="sr-only">{title}</legend>
        {[{ value: "", label: t("catalog.facets.any"), count: -1 } as Option, ...shown].map((o) => {
          const checked = (value ?? "") === o.value;
          const empty = o.count === 0 && !checked;
          return (
            <label
              key={o.value || "any"}
              className={`flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-secondary ${
                empty ? "opacity-45" : ""
              }`}
            >
              <input
                type="radio"
                name={name}
                checked={checked}
                disabled={empty}
                aria-label={o.text}
                onChange={() => onPick(o.value || undefined)}
                className="mt-1 size-3.5 shrink-0 accent-[var(--color-primary)]"
              />
              <span className="min-w-0 flex-1 break-words">{o.label}</span>
              {o.count >= 0 && (
                <span className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {o.count}
                </span>
              )}
            </label>
          );
        })}
        {long && (
          <button
            type="button"
            aria-expanded={all}
            onClick={() => setAll((v) => !v)}
            className="px-1.5 py-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {all
              ? t("catalog.facets.showLess")
              : t("catalog.facets.showAll", { count: options.length })}
          </button>
        )}
      </fieldset>
    </details>
  );
}
