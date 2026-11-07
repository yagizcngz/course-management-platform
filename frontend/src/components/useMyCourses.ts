import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import { authHeaders, getRoleFromToken, isAdminRole, readError } from "@/lib/auth";
import { API_BASE, courseRelation, type EnrollmentDto } from "./courseHelpers";

/** Fired after a join, leave, purchase or refund, so every mounted course list refetches. */
const COURSES_CHANGED = "courses-changed";
export const notifyCoursesChanged = () => window.dispatchEvent(new Event(COURSES_CHANGED));

async function enrollment(courseId: unknown, leave: boolean, t: TFunction) {
  const kind = leave ? "leave" : "join";
  try {
    const res = await fetch(`${API_BASE}/api/enrollments/${kind}/${courseId}`, {
      method: leave ? "DELETE" : "POST",
      headers: authHeaders(),
    });
    if (!res.ok) {
      toast.error(await readError(res, t(`dashboard.alerts.${kind}Error`)));
      return false;
    }
    toast.success(t(`dashboard.alerts.${kind}Success`));
    notifyCoursesChanged();
    return true;
  } catch {
    toast.error(t(`dashboard.alerts.${kind}ErrorGeneric`));
    return false;
  }
}
/** Joins a free or already owned course; true on success. */
export const joinCourse = (courseId: unknown, t: TFunction) => enrollment(courseId, false, t);
/** Leaves a course; a paid or finished one stays owned and can be rejoined for free. */
export const leaveCourse = (courseId: unknown, t: TFunction) => enrollment(courseId, true, t);

/**
 * The signed-in participant's enrollments and owned course ids, the single source for a course's
 * status (see `courseRelation`); refetches whenever a course is joined, left, bought or refunded.
 */
export function useMyCourses() {
  const { t } = useTranslation();
  const [myCourses, setMyCourses] = useState<EnrollmentDto[]>([]);
  const [ownedIds, setOwnedIds] = useState<number[]>([]);

  useEffect(() => {
    let off = false;
    const load = async () => {
      // guests and admins neither enrol in nor own courses
      if (!localStorage.getItem("jwt_token") || isAdminRole(getRoleFromToken())) return;
      const headers = authHeaders();
      const [mine, wallet] = await Promise.all([
        fetch(`${API_BASE}/api/enrollments/my-courses`, { headers }).catch(() => null),
        fetch(`${API_BASE}/api/wallet/me`, { headers }).catch(() => null),
      ]);
      const list = mine?.ok ? await mine.json() : null;
      const owned = wallet?.ok ? ((await wallet.json()).ownedCourseIds ?? []) : null;
      if (off) return;
      if (list) setMyCourses(list);
      else toast.error(t("common.loadFailed"));
      if (owned) setOwnedIds(owned);
    };
    load();
    window.addEventListener(COURSES_CHANGED, load);
    window.addEventListener("wallet-changed", load);
    return () => {
      off = true;
      window.removeEventListener(COURSES_CHANGED, load);
      window.removeEventListener("wallet-changed", load);
    };
  }, [t]);

  const relation = useCallback(
    (courseId: unknown) => courseRelation(courseId, myCourses, ownedIds),
    [myCourses, ownedIds],
  );
  return { myCourses, relation };
}
