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
  type TeacherLiteDto,
} from "../components/courseHelpers";
import { toast } from "sonner";

import { parseJwt } from "@/lib/auth";
import { API_BASE } from "@/components/courseHelpers";
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
  const [dbStudents, setDbStudents] = useState<StudentData[]>([]);
  const [dbTeachers, setDbTeachers] = useState<TeacherLiteDto[]>([]);
  const [dbCourses, setDbCourses] = useState<CourseData[]>([]);
  const [dbEnrollments, setDbEnrollments] = useState<EnrollmentData[]>([]);

  // Student Dashboard States
  const [myCourses, setMyCourses] = useState<EnrollmentData[]>([]);
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
      const headers = { Authorization: `Bearer ${token}` };

      let role = t("dashboard.studentRole");
      if (token) {
        const payload = parseJwt(token);
        if (payload) {
          role =
            payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
            payload.role ||
            t("dashboard.studentRole");
        }
      }

      const r = role.toLowerCase();
      const canManage = r === "eğitmen" || r === "admin" || r === "superadmin" || r === "teacher";
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
        if (eRes.ok) setDbEnrollments(await eRes.json());
        if (tRes.ok) setDbTeachers(await tRes.json());

        const cats = await fetchCategories(token || undefined);
        setCategories(cats);

        if (token) {
          const [myRes, recRes] = await Promise.all([
            fetch(`${API_BASE}/api/enrollments/my-courses`, { headers }),
            fetch(`${API_BASE}/api/courses/recommended`, { headers }),
          ]);
          if (myRes.ok) setMyCourses(await myRes.json());
          if (recRes.ok) setRecommendedCourses(await recRes.json());
        }
      } catch (err) {
        console.error("Veri çekme hatası:", err);
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
        const role =
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
          payload.role ||
          t("dashboard.studentRole");
        setCurrentUser({ name, role });
      }
    }
  }, [t]);

  const isAdmin =
    currentUser.role.toLowerCase() === "admin" || currentUser.role.toLowerCase() === "superadmin";
  const canManage =
    currentUser.role.toLowerCase() === "eğitmen" ||
    currentUser.role.toLowerCase() === "teacher" ||
    isAdmin;

  const isStudent = !canManage;

  const handleCourseSaved = (updated: CourseData) => {
    setSelectedCourse(updated);
    setDbCourses((prev) =>
      prev.map((c) => ((c.id ?? c.Id) === (updated.id ?? updated.Id) ? { ...c, ...updated } : c)),
    );
  };

  const handleJoinCourse = async () => {
    if (!selectedCourse) return;
    const courseId = selectedCourse.id || selectedCourse.Id;
    const token = localStorage.getItem("jwt_token");
    try {
      const res = await fetch(`${API_BASE}/api/enrollments/join/${courseId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        toast.success(t("dashboard.alerts.joinSuccess"));
        const myRes = await fetch(`${API_BASE}/api/enrollments/my-courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (myRes.ok) setMyCourses(await myRes.json());
      } else {
        const errorText = await res.text();
        toast.error(`${t("dashboard.alerts.joinError")}: ${errorText}`);
      }
    } catch (err) {
      toast.error(t("dashboard.alerts.joinErrorGeneric"));
    }
  };

  const handleLeaveCourse = async () => {
    if (!selectedCourse) return;
    const courseId = selectedCourse.id || selectedCourse.Id;
    const token = localStorage.getItem("jwt_token");
    try {
      const res = await fetch(`${API_BASE}/api/enrollments/leave/${courseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        toast.success(t("dashboard.alerts.leaveSuccess", "Kurstan başarıyla ayrıldınız."));
        const myRes = await fetch(`${API_BASE}/api/enrollments/my-courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (myRes.ok) setMyCourses(await myRes.json());
      } else {
        const errorText = await res.text();
        toast.error(`${t("dashboard.alerts.leaveError", "Hata")}: ${errorText}`);
      }
    } catch (err) {
      toast.error(t("dashboard.alerts.leaveErrorGeneric", "Bir hata oluştu."));
    }
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

  const renderCourseCard = (
    c: CourseData,
    index: number,
    isEnrolled: boolean = false,
    status: string = "",
  ) => {
    const originalTitle = c.title || c.Title || t("dashboard.unnamedCourse");
    const originalCategory = c.category || c.Category || t("dashboard.general");

    const title = i18n.exists(`dynamic.courses.${originalTitle}`)
      ? t(`dynamic.courses.${originalTitle}`)
      : originalTitle;
    const category = i18n.exists(`dynamic.categories.${originalCategory}`)
      ? t(`dynamic.categories.${originalCategory}`)
      : originalCategory;

    const price = c.price || c.Price || "₺0";
    const instructor = c.instructor || c.Instructor || t("dashboard.unknown");
    const studentsCount = getCourseEnrollments(c, dbEnrollments).length;

    return (
      <div
        key={c.id || c.Id || index}
        onClick={() => setSelectedCourse(c)}
        title="Kurs detaylarını görüntüle"
        className="group bg-card border border-border hover:border-accent transition-colors rounded-md overflow-hidden shadow-sm cursor-pointer"
      >
        <div className="w-full aspect-video relative overflow-hidden bg-muted">
          <img src={getCourseImage(c, index)} alt={title} className="w-full h-full object-cover" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.06) 100%)",
            }}
          />
          {isEnrolled && status && (
            <div className="absolute top-2 right-2 bg-black text-white text-[10px] px-2 py-1 rounded-sm font-bold uppercase z-10">
              {i18n.exists(`dynamic.status.${status}`)
                ? t(`dynamic.status.${status}`)
                : status === "Devam Ediyor"
                  ? t("dashboard.inProgress", "Devam Ediyor")
                  : status}
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-mono text-accent uppercase">{category}</span>
            {!isEnrolled && (
              <span className="text-sm font-bold">₺{String(price).replace(/^₺/, "")}</span>
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
      </div>
    );
  };

  return (
    <>
      <PageHeader crumb={t("dashboard.breadcrumb")} />

      <div className="p-8 space-y-8 animate-reveal">
        {!isAdmin && (
          <>
            <section className="space-y-4">
              <SectionHeader title={t("dashboard.recommendedCourses")} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <div className="col-span-full py-8 text-center text-muted-foreground text-xs border border-border bg-card animate-pulse">
                    Yükleniyor...
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
                    Kategorilere Göre
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
                          to="/kurslar"
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
          isEnrolled={myCourses.some(
            (e) => (e.courseId || e.CourseId) === (selectedCourse.id || selectedCourse.Id),
          )}
          onJoin={handleJoinCourse}
          onLeave={handleLeaveCourse}
        />
      )}
    </>
  );
}
