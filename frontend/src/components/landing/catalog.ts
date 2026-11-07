import { formatTry } from "@/lib/utils";
import { searchRank } from "@/lib/search";
import type { LandingCourse, LandingProps } from "./shared";

/**
 * How well a course matches the query (0 = not at all, see `searchRank`): every word must appear
 * in the title, category, sub-category, instructor, description or `extra` (lesson titles, the
 * teacher's branch and bio, field names in both languages); stored and translated titles rank first.
 */
export function courseRank(
  course: LandingCourse,
  query: string,
  label: LandingProps["label"],
  extra = "",
) {
  return searchRank(
    query,
    [course.title, label("courses", course.title)],
    [
      course.category,
      label("categories", course.category),
      course.subCategory ?? "",
      course.subCategory ? label("subCategories", course.subCategory) : "",
      course.instructor,
      course.description ?? "",
      extra,
    ],
  );
}

export const price = (n: number) => formatTry(Number(n), 0);

/** Courses grouped by category, in the order the categories endpoint returns them. */
export function groupByCategory(courses: LandingCourse[], categories: string[]) {
  const names = [...categories];
  for (const c of courses) if (!names.includes(c.category)) names.push(c.category);
  return names
    .map((name) => ({ name, courses: courses.filter((c) => c.category === name) }))
    .filter((g) => g.courses.length > 0);
}
