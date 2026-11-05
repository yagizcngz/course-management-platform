import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  API_BASE,
  fetchCategories,
  fetchPublicTeachers,
  type TeacherLiteDto,
} from "../courseHelpers";
import type { LandingCourse } from "./shared";

/** Fetches JSON and returns null on any failure, so one bad endpoint cannot crash the page. */
export async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Guest-safe catalogue data shared by the public pages. Courses come most popular first
 * (the API orders them by enrolment count); null while loading.
 */
export function usePublicCatalog() {
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState<LandingCourse[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<TeacherLiteDto[]>([]);
  const [outline, setOutline] = useState<Record<string, string[]>>({});

  useEffect(() => {
    getJson<LandingCourse[]>(`${API_BASE}/api/Courses`).then((data) =>
      setCourses(Array.isArray(data) ? data : []),
    );
    fetchCategories().then(setCategories);
    fetchPublicTeachers().then(setTeachers);
    getJson<Record<string, string[]>>(`${API_BASE}/api/lessons/outline`).then(
      (data) => data && setOutline(data),
    );
  }, []);

  const label = useCallback(
    (kind: "categories" | "courses" | "subCategories", value: string) =>
      i18n.exists(`dynamic.${kind}.${value}`) ? t(`dynamic.${kind}.${value}`) : value,
    [i18n, t],
  );

  /** The course description in the current language, falling back to the stored text. */
  const describe = useCallback(
    (c: LandingCourse) =>
      i18n.exists(`dynamic.descriptions.${c.title}`)
        ? t(`dynamic.descriptions.${c.title}`)
        : (c.description ?? ""),
    [i18n, t],
  );

  // search also reads each course's lesson titles and its teacher's branch and bio
  const extra = useMemo(() => {
    const byTeacher = new Map(
      teachers.map((m) => [
        String(m.id ?? m.Id),
        `${m.branch ?? m.Branch ?? ""} ${m.aboutMe ?? m.AboutMe ?? ""}`,
      ]),
    );
    // field names in both languages, so "calculus" and "kalkülüs" both match in either UI language
    const both = (kind: string, value?: string | null) =>
      value
        ? ["tr", "en"]
            .map((lng) => t(`dynamic.${kind}.${value}`, { lng, defaultValue: value }))
            .join(" ")
        : "";
    return (c: LandingCourse) =>
      `${(outline[c.id] ?? []).join(" ")} ${byTeacher.get(String(c.teacherId)) ?? ""} ${both("categories", c.category)} ${both("subCategories", c.subCategory)}`;
  }, [teachers, outline, t]);

  return { courses, categories, teachers, outline, label, describe, extra };
}
