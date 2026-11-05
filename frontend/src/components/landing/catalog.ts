import type { LandingCourse, LandingProps } from "./shared";

/** Lower-cases with Turkish rules and folds diacritics, so "yazilim" finds "Yazılım". */
export function fold(s: string) {
  return s.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * Every word of the query must appear in the title, category, instructor, description
 * or `extra` (the course's lesson titles and its teacher's branch and bio).
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
      course.instructor,
      course.description ?? "",
      extra,
    ].join(" "),
  );
  return words.every((w) => hay.includes(w));
}

export const price = (n: number) => `₺${Number(n).toLocaleString("tr-TR")}`;

/** Courses grouped by category, in the order the categories endpoint returns them. */
export function groupByCategory(courses: LandingCourse[], categories: string[]) {
  const names = [...categories];
  for (const c of courses) if (!names.includes(c.category)) names.push(c.category);
  return names
    .map((name) => ({ name, courses: courses.filter((c) => c.category === name) }))
    .filter((g) => g.courses.length > 0);
}
