import type { FormEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TeacherLiteDto } from "../courseHelpers";

export type Variant = "a" | "b";

export interface LandingCourse {
  id: number;
  title: string;
  category: string;
  instructor: string;
  price: number;
  imageUrl: string;
  description?: string;
  teacherId?: number | null;
  level?: string | null;
  subCategory?: string | null;
  topic?: string | null;
  /** Teaching language and comma separated subtitle languages (ISO codes). */
  language?: string | null;
  subtitleLanguages?: string | null;
  maxCapacity?: number;
  createdAt?: string;
  enrollments: unknown[];
}

export interface GuestStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
}

/** A lesson as the public outline lists it (no video link). */
export interface OutlineLesson {
  title: string;
  description?: string | null;
}

export interface LandingProps {
  /** Every published course; null while loading, [] when the request failed or is empty. */
  courses: LandingCourse[] | null;
  popular: LandingCourse[];
  categories: string[];
  /** Guest-safe teacher profiles, with the courses each one gives. */
  teachers: TeacherLiteDto[];
  stats: GuestStats | null;
  /** The list the course section shows: search matches or the popular ones. */
  list: LandingCourse[];
  listMode: "results" | "popular";
  /** Search matches, or null when no filter is active. */
  matches: LandingCourse[] | null;
  matchIds: Set<number> | null;
  query: string;
  setQuery: (q: string) => void;
  category: string | null;
  setCategory: (c: string | null) => void;
  onSubmit: (e: FormEvent) => void;
  scrollToCourses: () => void;
  onClear: () => void;
  onOpen: (course: LandingCourse) => void;
  label: (kind: "categories" | "courses" | "subCategories" | "topics", value: string) => string;
  /** A course's description in the current language. */
  describe: (course: LandingCourse) => string;
  /** Each course's lessons in order, by course id. */
  outline: Record<string, OutlineLesson[]>;
}

/**
 * The search field. It filters as you type (the scene and the list react at once);
 * submitting scrolls to the results. The count line is a live region for screen readers.
 */
export function HeroSearch({
  p,
  className,
  inputClass,
  buttonClass,
  statusClass = "mt-3 text-sm text-muted-foreground",
  icon = true,
}: {
  p: LandingProps;
  className: string;
  inputClass: string;
  buttonClass: string;
  statusClass?: string;
  icon?: boolean;
}) {
  const { t } = useTranslation();
  const active = p.matches !== null;
  return (
    <div>
      <form
        role="search"
        onSubmit={p.onSubmit}
        className={`relative flex items-center ${className}`}
      >
        {icon && (
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-5 h-5 w-5 text-muted-foreground"
          />
        )}
        <input
          type="search"
          name="q"
          autoComplete="off"
          aria-label={t("guest.searchPlaceholder")}
          placeholder={t("guest.searchPlaceholder")}
          className={`w-full outline-none [&::-webkit-search-cancel-button]:hidden ${inputClass}`}
          value={p.query}
          onChange={(e) => p.setQuery(e.target.value)}
        />
        <button type="submit" className={buttonClass}>
          {t("guest.searchButton")}
        </button>
      </form>
      <p role="status" aria-live="polite" className={`min-h-5 ${statusClass}`}>
        {p.courses === null
          ? " "
          : active
            ? p.matches!.length
              ? t("guest.matchCount", { count: p.matches!.length })
              : t("guest.noMatch")
            : t("guest.catalogCount", { count: p.courses.length })}
      </p>
    </div>
  );
}

/** Shows the active category filter as a removable token. */
export function CategoryToken({ p, className }: { p: LandingProps; className: string }) {
  const { t } = useTranslation();
  if (!p.category) return null;
  return (
    <button
      type="button"
      onClick={() => p.setCategory(null)}
      aria-label={t("guest.removeCategory", { name: p.label("categories", p.category) })}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      {p.label("categories", p.category)}
      <X aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * Title row of the course section. Switches between popular and search results; the full
 * catalogue lives on /kurslar, which opens with the same filter.
 */
export function ListHeader({
  p,
  titleClass,
  metaClass,
  actionClass,
  children,
}: {
  p: LandingProps;
  titleClass: string;
  metaClass: string;
  actionClass: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const filterText = [
    p.category && p.label("categories", p.category),
    p.query.trim() && `“${p.query.trim()}”`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {children}
        <h2 className={titleClass}>
          {p.listMode === "results" ? t("guest.resultsTitle") : t("guest.popularCourses")}
        </h2>
        <p className={metaClass}>
          {p.listMode === "results"
            ? `${filterText} — ${t("guest.matchCount", { count: p.list.length })}`
            : t("guest.popularCoursesDesc")}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 self-start md:self-auto">
        {p.listMode === "results" && (
          <button type="button" onClick={p.onClear} className={actionClass}>
            {t("guest.clearSearch")}
          </button>
        )}
        <Link
          to="/kurslar"
          search={{ q: p.query.trim() || undefined, category: p.category ?? undefined }}
          className={actionClass}
        >
          {p.listMode === "results"
            ? t("guest.openInCatalog")
            : `${t("guest.viewAllCourses")}${p.courses ? ` (${p.courses.length})` : ""}`}
        </Link>
      </div>
    </div>
  );
}

/** Empty and loading states shared by every variant's course list. */
export function ListState({ p, className }: { p: LandingProps; className: string }) {
  const { t } = useTranslation();
  if (p.courses === null && p.list.length === 0)
    return (
      <p role="status" className={className}>
        {t("common.loading")}
      </p>
    );
  if (p.list.length > 0) return null;
  return (
    <p role="status" className={className}>
      {p.listMode === "results"
        ? t("guest.noResults", { query: p.query.trim() || p.label("categories", p.category ?? "") })
        : t("guest.noCourses")}
    </p>
  );
}
