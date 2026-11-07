import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "./courseHelpers";
import { statsById, type StatsById } from "@/lib/courseFilters";
import type { CourseStats } from "@/lib/showcase";

// one request per page load: rows, filters and stars only need minutes-old numbers
let request: Promise<CourseStats[]> | null = null;

export const loadCourseStats = () =>
  (request ??= fetch(`${API_BASE}/api/courses/stats`)
    .then((r) => (r.ok ? (r.json() as Promise<CourseStats[]>) : Promise.reject(r.status)))
    .catch(() => {
      request = null; // a failed load is retried by the next caller
      return [];
    }));

/** Drops the cached numbers, e.g. after the viewer rated a course. */
export const refreshCourseStats = () => {
  request = null;
};

/** Per-course students, ratings and length from GET /api/courses/stats; empty until loaded. */
export function useCourseStats(): { list: CourseStats[]; byId: StatsById } {
  const [list, setList] = useState<CourseStats[]>([]);
  useEffect(() => {
    let off = false;
    loadCourseStats().then((s) => !off && setList(s));
    return () => {
      off = true;
    };
  }, []);
  const byId = useMemo(() => statsById(list), [list]);
  return { list, byId };
}
