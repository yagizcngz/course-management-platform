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

import { API_BASE } from "@/components/courseHelpers";
export const Route = createFileRoute("/_authenticated/kurslarim")({
  component: MyCoursesPage,
});

function MyCoursesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<EnrollmentDto[]>([]);
  const [loading, setLoading] = useState(true);

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
            course: courseDetail || { title: env.courseTitle || env.CourseTitle },
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
  }, []);

  const handleCourseSaved = () => {
    fetchMyCourses();
  };

  return (
    <>
      <PageHeader crumb={t("sidebar.myCourses", "Kurslarım")} />

      <div className="p-4 md:p-8 animate-reveal">
        <h2 className="text-xl font-bold mb-6">{t("dashboard.myCourses")}</h2>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((enrollment, index) => {
              const c = (enrollment.course || enrollment.Course || enrollment) as CourseData;
              const currentId = c.id ?? c.Id;
              const title = c.title || c.Title || t("courses.unnamedCourse");
              const categoryRaw = c.category || c.Category || "";
              const category = categoryRaw
                ? i18n.exists(`dynamic.categories.${categoryRaw}`)
                  ? t(`dynamic.categories.${categoryRaw}`)
                  : categoryRaw
                : t("courses.general");
              const price = c.price || c.Price || "0";
              const instructor = c.instructor || c.Instructor || t("courses.unknown");
              const imageUrl = getCourseImage(c, index);

              return (
                <div
                  key={enrollment.id || enrollment.Id || index}
                  onClick={() => setSelectedCourse(c)}
                  title={t("courses.viewDetails")}
                  className="group bg-card border border-border hover:border-accent transition-colors rounded-md overflow-hidden shadow-sm flex flex-col cursor-pointer"
                >
                  <div className="w-full aspect-video relative overflow-hidden bg-muted">
                    <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider backdrop-blur-sm shadow-sm border border-border">
                      {t("dashboard.inProgress", "DEVAM EDİYOR")}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">
                      {i18n.exists(`dynamic.categories.${category}`)
                        ? t(`dynamic.categories.${category}`)
                        : category}
                    </div>
                    <h3 className="font-bold mb-1 group-hover:text-accent transition-colors">
                      {i18n.exists(`dynamic.courses.${title}`)
                        ? t(`dynamic.courses.${title}`)
                        : title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-auto">
                      {t("guest.instructor", "Eğitmen")}: {instructor}
                    </p>
                  </div>
                </div>
              );
            })}
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
