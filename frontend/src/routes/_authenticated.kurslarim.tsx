import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { CourseDetailModal } from "@/components/CourseDetailModal";
import {
  getCourseImage,
  type EnrollmentDto,
  type CourseData,
  type TeacherLiteDto,
} from "@/components/courseHelpers";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { CourseProgressBar } from "@/components/CourseProgressBar";
import { formatDate } from "@/lib/utils";

import { API_BASE } from "@/components/courseHelpers";
import { BadgeStrip, useBadges } from "@/components/Badges";
export const Route = createFileRoute("/_authenticated/kurslarim")({
  component: MyCoursesPage,
});

function MyCoursesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<EnrollmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const badges = useBadges();

  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [dbTeachers, setDbTeachers] = useState<TeacherLiteDto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [dbEnrollments, setDbEnrollments] = useState<EnrollmentDto[]>([]);

  const fetchMyCourses = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      if (!token) return;

      const [enrollRes, coursesRes, teachersRes, categoriesRes, enrollmentsRes] = await Promise.all(
        [
          fetch(`${API_BASE}/api/enrollments/my-courses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/courses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/teachers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/categories`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/enrollments`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ],
      );

      if (teachersRes.ok) {
        setDbTeachers(await teachersRes.json());
      }
      if (categoriesRes.ok) {
        const cats = await categoriesRes.json();
        setCategories(cats.map((c: { name?: string; Name?: string }) => c.name || c.Name || ""));
      }
      if (enrollmentsRes.ok) {
        setDbEnrollments(await enrollmentsRes.json());
      }

      if (!enrollRes.ok || !coursesRes.ok) {
        toast.error(t("courses.errors.serverError"));
      }
      if (enrollRes.ok && coursesRes.ok) {
        const enrollments = await enrollRes.json();
        const allCourses = await coursesRes.json();

        const merged = enrollments.map((env: EnrollmentDto) => {
          const courseDetail = allCourses.find((c: CourseData) => {
            const cId = c.id ?? c.Id;
            const envCId = env.courseId ?? env.CourseId ?? env.course?.id ?? env.Course?.Id;
            return cId !== undefined && envCId !== undefined && String(cId) === String(envCId);
          });
          return {
            ...env,
            course: courseDetail || {
              id: env.courseId ?? env.CourseId,
              title: env.courseTitle || env.CourseTitle,
            },
          };
        });
        setCourses(merged);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  const handleCourseSaved = () => {
    fetchMyCourses();
  };

  const progressOf = (e: EnrollmentDto) => e.progressPercent ?? 0;
  const ongoing = courses.filter((e) => progressOf(e) < 100);
  const completed = courses.filter((e) => progressOf(e) >= 100);

  const renderCard = (enrollment: EnrollmentDto, index: number) => {
    const c = (enrollment.course || enrollment.Course || enrollment) as CourseData;
    const title = c.title || c.Title || t("courses.unnamedCourse");
    const categoryRaw = c.category || c.Category || "";
    const category = categoryRaw
      ? i18n.exists(`dynamic.categories.${categoryRaw}`)
        ? t(`dynamic.categories.${categoryRaw}`)
        : categoryRaw
      : t("courses.general");
    const instructor = c.instructor || c.Instructor || t("courses.unknown");
    const percent = progressOf(enrollment);
    const done = percent >= 100;

    return (
      <button
        type="button"
        key={enrollment.id || enrollment.Id || index}
        onClick={() => setSelectedCourse(c)}
        title={t("courses.viewDetails")}
        className="group min-w-0 text-left bg-card border border-border hover:border-gold/60 transition-colors rounded-xl overflow-hidden shadow-sm flex flex-col"
      >
        <div className="w-full aspect-video relative overflow-hidden bg-muted">
          <img src={getCourseImage(c, index)} alt="" className="w-full h-full object-cover" />
          <span
            className={`absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-sm ${done ? "bg-gold text-night" : "bg-black/70 text-white"}`}
          >
            {done && <CheckCircle2 aria-hidden="true" className="size-3" />}
            {done ? t("myCourses.completedBadge") : t("dashboard.inProgress")}
          </span>
        </div>
        <div className="p-4 flex-1 flex flex-col gap-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold truncate">
            {category}
          </div>
          <h3 className="font-semibold break-words [overflow-wrap:anywhere] group-hover:text-gold transition-colors">
            {i18n.exists(`dynamic.courses.${title}`) ? t(`dynamic.courses.${title}`) : title}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {t("guest.instructor")}: {instructor}
          </p>
          <CourseProgressBar
            percent={percent}
            label={t("myCourses.lessonsDone", {
              done: enrollment.completedLessons ?? 0,
              total: enrollment.totalLessons ?? 0,
            })}
            className="mt-auto pt-3"
          />
          {done && enrollment.completedAt && (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t("myCourses.completedOn", {
                date: formatDate(enrollment.completedAt, i18n.language),
              })}
            </p>
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      <PageHeader crumb={t("sidebar.myCourses", "Kurslarım")} />

      <div className="p-4 md:p-8 animate-reveal">
        <h2 className="text-xl font-bold mb-6">{t("dashboard.myCourses")}</h2>
        {badges && (
          <div className="mb-10">
            <BadgeStrip badges={badges} />
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("courses.loading", "Yükleniyor...")}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-lg shadow-sm">
            <h3 className="text-lg font-medium mb-2">
              {t("dashboard.noMyCourses", "Henüz bir kursa kayıtlı değilsiniz.")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("guest.exploreNew", "Yeni kurslar keşfederek öğrenmeye başlayın.")}
            </p>
            <button
              onClick={() => navigate({ to: "/kurslar", search: { category: "" } })}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
              {t("guest.exploreCourses", "Kursları İncele")}
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {[
              { key: "ongoing", title: t("myCourses.ongoing"), list: ongoing },
              { key: "completed", title: t("myCourses.completed"), list: completed },
            ].map((section) => (
              <section key={section.key} aria-labelledby={`my-${section.key}`}>
                <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-border pb-2">
                  <h2 id={`my-${section.key}`} className="font-serif text-3xl leading-none">
                    {section.title}
                  </h2>
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                    {String(section.list.length).padStart(2, "0")}
                  </span>
                </div>
                {section.list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {section.key === "ongoing"
                      ? t("myCourses.noOngoing")
                      : t("myCourses.noCompleted")}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {section.list.map((enrollment, index) => renderCard(enrollment, index))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          canManage={false}
          enrollments={dbEnrollments}
          teachers={dbTeachers}
          categories={categories}
          onSaved={handleCourseSaved}
          isStudent={true}
          isEnrolled={true}
          onLeave={async () => {
            const token = localStorage.getItem("jwt_token");
            try {
              const res = await fetch(
                `${API_BASE}/api/enrollments/leave/${selectedCourse.id || selectedCourse.Id}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              if (res.ok) {
                toast.success(t("dashboard.alerts.leaveSuccess", "Kurstan başarıyla ayrıldınız."));
                setSelectedCourse(null);
                fetchMyCourses();
              } else {
                toast.error(t("dashboard.alerts.leaveError", "Bir hata oluştu."));
              }
            } catch (err) {
              console.error(err);
              toast.error(t("dashboard.alerts.leaveErrorGeneric", "Bir hata oluştu."));
            }
          }}
        />
      )}
    </>
  );
}
