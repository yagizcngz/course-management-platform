import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
  DURATIONS,
  LANGUAGES,
  LEVELS,
  PRICE_BANDS,
  RATINGS,
  facetCounts,
  topicCounts,
  type CourseFilters,
  type CourseSearch,
  type FacetCourse,
  type StatsById,
} from "@/lib/courseFilters";
import { Stars } from "./StarRating";

const self = (c: FacetCourse) => c;

/**
 * The facet column of the "All courses" list: sub-field and topic (which also move the page's
 * header and curated rows), then rating, length, level, price, language and subtitles. Each
 * option shows how many courses it would leave with the other choices kept.
 */
export function CourseFilterPanel({
  search,
  set,
  inCategory,
  inScope,
  stats,
  subCategoryLabel,
}: {
  search: CourseSearch;
  set: (patch: Partial<CourseSearch>) => void;
  /** Courses of the chosen category (or all), for the sub-field and topic options. */
  inCategory: FacetCourse[];
  /** Courses of the chosen category, sub-field and topic, for the other facets. */
  inScope: FacetCourse[];
  stats: StatsById;
  subCategoryLabel: (value: string) => string;
}) {
  const { t, i18n } = useTranslation();
  const counts = (key: keyof CourseFilters) => facetCounts(inScope, self, stats, search, key);

  const subCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of inCategory)
      if (c.subCategory) m.set(c.subCategory, (m.get(c.subCategory) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [inCategory]);
  const topics = useMemo(
    () =>
      topicCounts(
        inCategory.filter((c) => !search.subCategory || c.subCategory === search.subCategory),
        self,
      ),
    [inCategory, search.subCategory],
  );

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
      {search.category && subCounts.length > 0 && (
        <Facet
          title={t("catalog.facets.subCategory")}
          name="subCategory"
          value={search.subCategory}
          // a new sub-field may not hold the chosen topic
          onPick={(v) => set({ subCategory: v, topic: undefined })}
          options={subCounts.map(([v, n]) => ({ value: v, label: subCategoryLabel(v), count: n }))}
        />
      )}
      {topics.length > 0 && (
        <Facet
          title={t("catalog.facets.topic")}
          name="topic"
          value={search.topic}
          onPick={(v) => set({ topic: v })}
          options={topics.map(([v, n]) => ({ value: v, label: v, count: n }))}
        />
      )}
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
  if (options.length === 0) return null;
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
        {[{ value: "", label: t("catalog.facets.any"), count: -1 } as Option, ...options].map(
          (o) => {
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
          },
        )}
      </fieldset>
    </details>
  );
}
