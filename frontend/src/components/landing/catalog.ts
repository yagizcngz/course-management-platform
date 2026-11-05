import { formatTry } from "@/lib/utils";
import type { LandingCourse, LandingProps } from "./shared";

/** Lower-cases with Turkish rules and folds diacritics, so "yazilim" finds "Yazılım". */
export function fold(s: string) {
  return s.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * Every word of the query must appear in the title, category, sub-category, instructor,
 * description or `extra` (lesson titles, the teacher's branch and bio, field names in both languages).
 */
export function matchesQuery(
  course: LandingCourse,
  query: string,
  label: LandingProps["label"],
  extra = "",
) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fold(
    [
      course.title,
      label("courses", course.title),
      course.category,
      label("categories", course.category),
      course.subCategory ?? "",
      course.subCategory ? label("subCategories", course.subCategory) : "",
      course.instructor,
      course.description ?? "",
      extra,
    ].join(" "),
  );
  return words.every((w) => hay.includes(w));
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
