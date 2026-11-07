import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionHeader } from "../components/PageHeader";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CourseDetailModal } from "../components/CourseDetailModal";
import {
  getCourseImage,
  getCourseEnrollments,
  fetchCategories,
  type CourseData,
  type EnrollmentDto,
  type TeacherLiteDto,
} from "../components/courseHelpers";
import { CourseStatusPill } from "@/components/CourseProgressBar";
import { toast } from "sonner";
import { formatTry } from "@/lib/utils";

import {
  authHeaders,
  getRoleFromToken,
  isAdminRole,
  isTeacherRole,
  parseJwt,
  readError,
} from "@/lib/auth";
import { API_BASE } from "@/components/courseHelpers";
import { BadgeStrip, useBadges } from "@/components/Badges";
import { joinCourse, leaveCourse, useMyCourses } from "@/components/useMyCourses";
export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Ana Sayfa — E-Kurs" },
      { name: "description", content: "Popüler kurslar ve platform özeti." },
    ],
  }),
  component: HomePage,
});

interface StudentData {
  id?: string | number;
  Id?: string | number;
  name?: string;
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  email?: string;
  Email?: string;
  studentNumber?: string;
  StudentNumber?: string;
  course?: string;
  Course?: string;
  date?: string;
  Date?: string;
  status?: string;
  Status?: string;
  initials?: string;
}

interface EnrollmentData {
  id?: string | number;
  Id?: string | number;
  studentId?: string | number;
  StudentId?: string | number;
  courseId?: string | number;
  CourseId?: string | number;
  enrollmentDate?: string;
  EnrollmentDate?: string;
  date?: string;
  Date?: string;
  studentFullName?: string;
  StudentFullName?: string;
  studentNumber?: string;
  StudentNumber?: string;
  courseTitle?: string;
  CourseTitle?: string;
  status?: string;
  Status?: string;
}

function HomePage() {
  const { t, i18n } = useTranslation();
  const badges = useBadges();
  const [dbStudents, setDbStudents] = useState<StudentData[]>([]);
  const [dbTeachers, setDbTeachers] = useState<TeacherLiteDto[]>([]);
  const [dbCourses, setDbCourses] = useState<CourseData[]>([]);
  const [dbEnrollments, setDbEnrollments] = useState<EnrollmentData[]>([]);

  // Student Dashboard States
  const { relation } = useMyCourses();
  const [recommendedCourses, setRecommendedCourses] = useState<CourseData[]>([]);

  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showAllPopular, setShowAllPopular] = useState(false);

  // Kurs tanıtım/düzenleme modalı için (Kurslar sayfasındakiyle aynı bileşen)
  const [currentUser, setCurrentUser] = useState({
    name: t("dashboard.unknown"),
    role: t("dashboard.studentRole"),
  });
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");

    const fetchHomeData = async () => {
      const headers = authHeaders();

      const r = getRoleFromToken();
      const canManage = isTeacherRole(r) || isAdminRole(r);
      const isStudent = !canManage;

      try {
        const [sRes, cRes, eRes, tRes] = await Promise.all([
          // Öğrenci listesi yalnızca yönetici/öğretmene açık
          canManage ? fetch(`${API_BASE}/api/students`, { headers }) : Promise.resolve(null),
          fetch(`${API_BASE}/api/courses`, { headers }),
          fetch(`${API_BASE}/api/enrollments`, { headers }),
          fetch(`${API_BASE}/api/teachers`, { headers }),
        ]);
        if (sRes?.ok) setDbStudents(await sRes.json());
        if (cRes.ok) setDbCourses(await cRes.json());
        else toast.error(t("common.loadFailed"));
        if (eRes.ok) setDbEnrollments(await eRes.json());
        if (tRes.ok) setDbTeachers(await tRes.json());

        const cats = await fetchCategories(token || undefined);
        setCategories(cats);

        // admins see neither section, and these endpoints are participant-only
        if (token && !isAdminRole(r)) {
          const recRes = await fetch(`${API_BASE}/api/courses/recommended`, { headers });
          if (recRes.ok) setRecommendedCourses(await recRes.json());
        }
      } catch (err) {
        console.error("Veri çekme hatası:", err);
        toast.error(t("common.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchHomeData();

    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        const name =
          payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
          payload.name ||
          payload.unique_name ||
          t("dashboard.unknownInstructor");
        const role = getRoleFromToken() || t("dashboard.studentRole");
        setCurrentUser({ name, role });
      }
    }
  }, [t]);

  const isAdmin = isAdminRole(currentUser.role);
  const canManage = isTeacherRole(currentUser.role) || isAdmin;

  const isStudent = !canManage;

  const handleCourseSaved = (updated: CourseData) => {
    setSelectedCourse(updated);
    setDbCourses((prev) =>
      prev.map((c) => ((c.id ?? c.Id) === (updated.id ?? updated.Id) ? { ...c, ...updated } : c)),
    );
  };

  // enrolment counts on the cards change too, so the full list is refetched
  const refreshEnrollments = async () => {
    const res = await fetch(`${API_BASE}/api/enrollments`, { headers: authHeaders() });
    if (res.ok) setDbEnrollments(await res.json());
  };
  const handleJoinCourse = async () => {
    if (selectedCourse && (await joinCourse(selectedCourse.id ?? selectedCourse.Id, t)))
      await refreshEnrollments();
  };
  const handleLeaveCourse = async () => {
    if (selectedCourse && (await leaveCourse(selectedCourse.id ?? selectedCourse.Id, t)))
      await refreshEnrollments();
  };

  const filteredCourses = dbCourses;

  const sortedPopularCourses = [...filteredCourses].sort((a, b) => {
    const studentsA = getCourseEnrollments(a, dbEnrollments).length;
    const studentsB = getCourseEnrollments(b, dbEnrollments).length;
    return studentsB - studentsA;
  });

  const displayedPopularCourses = sortedPopularCourses.slice(0, showAllPopular ? 10 : 3);

  const popularCoursesByCategory = categories
    .map((cat) => {
      return {
        category: cat,
        courses: sortedPopularCourses
          .filter((c) => (c.category || c.Category) === cat)
          .slice(0, showAllPopular ? 10 : 3),
      };
    })
    .filter((group) => group.courses.length > 0);

  const renderCourseCard = (c: CourseData, index: number) => {
    const status = isStudent ? relation(c.id ?? c.Id) : "none";
    // enrolled or owned: the price and head count are no longer what the student needs
    const isEnrolled = status !== "none";
    const originalTitle = c.title || c.Title || t("dashboard.unnamedCourse");
    const originalCategory = c.category || c.Category || t("dashboard.general");

    const title = i18n.exists(`dynamic.courses.${originalTitle}`)
      ? t(`dynamic.courses.${originalTitle}`)
      : originalTitle;
    const category = i18n.exists(`dynamic.categories.${originalCategory}`)
      ? t(`dynamic.categories.${originalCategory}`)
      : originalCategory;

    const price = c.price || c.Price || "0";
    const instructor = c.instructor || c.Instructor || t("dashboard.unknown");
    const studentsCount = getCourseEnrollments(c, dbEnrollments).length;

    return (
      <button
        type="button"
        key={c.id || c.Id || index}
        onClick={() => setSelectedCourse(c)}
        className="group text-left w-full bg-card border border-border hover:border-accent transition-colors rounded-md overflow-hidden shadow-sm cursor-pointer"
      >
        <div className="w-full aspect-video relative overflow-hidden bg-muted">
          <img src={getCourseImage(c, index)} alt={title} className="w-full h-full object-cover" />
          <CourseStatusPill status={status} />
        </div>
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-mono text-accent uppercase">{category}</span>
            {!isEnrolled && (
              <span className="text-sm font-bold">
                {formatTry(Number(String(price).replace(/^₺/, "")), 0)}
              </span>
            )}
          </div>
          <h4 className="font-bold mb-4 line-clamp-1">{title}</h4>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {t("dashboard.instructor")} {instructor}
            </span>
            {!isEnrolled && (
              <span className="font-mono">
                {studentsCount} {t("dashboard.studentCount")}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <PageHeader crumb={t("dashboard.breadcrumb")} />

      <div className="p-8 space-y-8 animate-reveal">
        {badges && <BadgeStrip badges={badges} />}
        {!isAdmin && (
          <>
            <section className="space-y-4">
              <SectionHeader title={t("dashboard.recommendedCourses")} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <div className="col-span-full py-8 text-center text-muted-foreground text-xs border border-border bg-card animate-pulse">
                    {t("dashboard.loadingCourses")}
                  </div>
                ) : recommendedCourses.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-muted-foreground text-xs border border-border bg-card">
                    {t("dashboard.noRecommendedCourses")}
                  </div>
                ) : (
                  recommendedCourses.map((c, index) => renderCourseCard(c, index))
                )}
              </div>
            </section>
          </>
        )}

        <section className="space-y-6">
          <SectionHeader
            title={t("dashboard.popularCourses")}
            right={
              <button
                onClick={() => setShowAllPopular(!showAllPopular)}
                className="text-xs font-mono text-accent hover:underline transition-all"
              >
                {showAllPopular ? t("dashboard.showLess") : t("dashboard.showMore")}
              </button>
            }
          />
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-xs border border-border bg-card animate-pulse">
              {t("dashboard.loadingCourses")}
            </div>
          ) : displayedPopularCourses.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs border border-border bg-card">
              {t("dashboard.noCoursesFound")}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {displayedPopularCourses.map((c: CourseData, index) => renderCourseCard(c, index))}
              </div>

              {popularCoursesByCategory.length > 0 && (
                <div className="space-y-6 pt-4 border-t border-border/50">
                  <h2 className="text-lg font-bold uppercase tracking-tight text-muted-foreground">
                    {t("dashboard.byCategory")}
                  </h2>
                  {popularCoursesByCategory.map((group) => (
                    <div
                      key={group.category}
                      className="space-y-3 border border-border/50 rounded-lg p-4 bg-background/30"
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-accent">
                          {i18n.exists(`dynamic.categories.${group.category}`)
                            ? t(`dynamic.categories.${group.category}`)
                            : group.category}
                        </h3>
                        <Link
                          to="/katalog"
                          search={{ category: group.category }}
                          className="text-xs font-mono text-accent hover:underline transition-all"
                        >
                          {t("dashboard.showMore")}
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {group.courses.map((c, index) => renderCourseCard(c, index))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          canManage={canManage}
          enrollments={dbEnrollments}
          teachers={dbTeachers}
          categories={categories}
          onSaved={handleCourseSaved}
          isStudent={isStudent}
          relation={relation(selectedCourse.id ?? selectedCourse.Id)}
          onJoin={handleJoinCourse}
          onLeave={handleLeaveCourse}
        />
      )}
    </>
  );
}
