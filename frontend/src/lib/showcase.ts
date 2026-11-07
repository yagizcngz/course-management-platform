/** GET /api/courses/stats: active enrollments per course, overall and over recent windows. */
export interface CourseStats {
  courseId: number;
  students: number;
  /** Joined in the last 7 days. */
  last7: number;
  /** Joined in the 7 days before that. */
  prev7: number;
  /** Joined in the last 30 days. */
  last30: number;
  /** Average of 1-5 star ratings, 0 when nobody rated. */
  ratingAverage: number;
  ratingCount: number;
  lessons: number;
  /** Total video length of the lessons, in seconds. */
  durationSeconds: number;
}

export type ShowcaseKind = "popular" | "hottest" | "trending" | "new";

export interface ShowcaseCourse {
  id: number;
  createdAt?: string | null;
}

export interface ShowcaseRow<T> {
  kind: ShowcaseKind;
  /** Each course with the number its row ranks by (students, joins, growth or a timestamp). */
  items: { course: T; metric: number }[];
}

/**
 * The catalogue's curated rows, each at most `size` courses, an empty row left out:
 * - popular: most students overall
 * - hottest: most students who joined in the last 30 days
 * - trending: biggest rise in joins, last 7 days against the 7 before
 * - new: most recently added
 * Ties keep the API's order, so rows are stable between renders.
 */
export function showcaseRows<T extends ShowcaseCourse>(
  courses: T[],
  stats: CourseStats[],
  size = 8,
): ShowcaseRow<T>[] {
  const byId = new Map(stats.map((s) => [s.courseId, s]));
  const zero: CourseStats = {
    courseId: 0,
    students: 0,
    last7: 0,
    prev7: 0,
    last30: 0,
    ratingAverage: 0,
    ratingCount: 0,
    lessons: 0,
    durationSeconds: 0,
  };
  const of = (c: T) => byId.get(c.id) ?? zero;
  const rank = (kind: ShowcaseKind, metric: (c: T) => number): ShowcaseRow<T> => ({
    kind,
    items: courses
      .map((course) => ({ course, metric: metric(course) }))
      .filter((x) => x.metric > 0)
      .sort((a, b) => b.metric - a.metric)
      .slice(0, size),
  });
  return [
    rank("popular", (c) => of(c).students),
    rank("hottest", (c) => of(c).last30),
    // a small tie-break on this week's joins: +3 from 5 ranks above +3 from 3
    rank("trending", (c) => {
      const s = of(c);
      const rise = s.last7 - s.prev7;
      return rise > 0 ? rise + s.last7 / 1000 : 0;
    }),
    rank("new", (c) => (c.createdAt ? Date.parse(c.createdAt) || 0 : 0)),
  ].filter((row) => row.items.length > 0);
}
