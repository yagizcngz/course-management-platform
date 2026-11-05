import { readError } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  fetchCategories,
  getCourseImage,
  type CourseData,
  type TeacherLiteDto,
  type EnrollmentDto,
} from "@/components/courseHelpers";
import { CourseDetailModal } from "@/components/CourseDetailModal";

import { API_BASE } from "@/components/courseHelpers";
import { CourseTaxonomyFields } from "@/components/CourseTaxonomyFields";
import { teacherOnly } from "@/hooks/useAdminGuard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
export const Route = createFileRoute("/_authenticated/verdigim-kurslar")({
  component: teacherOnly(TaughtCoursesPage),
});

function TaughtCoursesPage() {
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState<CourseData[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [requests, setRequests] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSubCategory, setNewSubCategory] = useState("");
  const [newLevel, setNewLevel] = useState("");

  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [dbTeachers, setDbTeachers] = useState<TeacherLiteDto[]>([]);
  const [dbEnrollments, setDbEnrollments] = useState<EnrollmentDto[]>([]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        setLoading(false);
        return;
      }

      const profileRes = await fetch(`${API_BASE}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!profileRes.ok) return;
      const profile = await profileRes.json();

      const cRes = await fetch(`${API_BASE}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tRes = await fetch(`${API_BASE}/api/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const eRes = await fetch(`${API_BASE}/api/enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (eRes.ok) {
        setDbEnrollments(await eRes.json());
      }

      if (cRes.ok) {
        const allCourses = await cRes.json();
        let myTeacherId = null;

        if (tRes.ok) {
          const allTeachers = await tRes.json();
          setDbTeachers(allTeachers);
          // Find the teacher profile that belongs to the current user
          const me = allTeachers.find(
            (t: TeacherLiteDto) => t.email === profile.email || t.Email === profile.email,
          );
          if (me) {
            myTeacherId = me.id || me.Id;
          }
        }

        const myCourses = allCourses.filter((c: CourseData) => {
          // If we know the teacher ID, it's the safest match
          if (myTeacherId && (c.teacherId === myTeacherId || c.TeacherId === myTeacherId)) {
            return true;
          }

          // Fallback to name matching
          const instructorName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
          if (
            instructorName &&
            (c.instructor === instructorName || c.Instructor === instructorName)
          ) {
            return true;
          }

          return false;
        });
        setCourses(myCourses);
      }

      const rRes = await fetch(`${API_BASE}/api/teachingrequests/my-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rRes.ok) {
        setRequests(await rRes.json());
      }

      const cats = await fetchCategories(token);
      setCategories(cats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("jwt_token");

      const profileRes = await fetch(`${API_BASE}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = await profileRes.json();

      const teacherRes = await fetch(`${API_BASE}/api/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const teachers = await teacherRes.json();

      const meTeacher = teachers.find(
        (t: Record<string, unknown>) =>
          t.userId === profile.id ||
          t.UserId === profile.id ||
          t.email === profile.email ||
          t.Email === profile.email,
      );

      const response = await fetch(`${API_BASE}/api/courses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Title: newTitle,
          Category: newCategory,
          SubCategory: newSubCategory || null,
          Level: newLevel || null,
          Instructor: `${profile.firstName} ${profile.lastName}`.trim(),
          TeacherId: meTeacher ? meTeacher.id || meTeacher.Id : 0,
          MaxCapacity: Number(newCapacity) || 0,
          Price: Number(newPrice) || 0,
          Description: newDescription,
        }),
      });

      if (response.ok) {
        toast.success(t("courses.errors.createSuccess"));
        setIsModalOpen(false);
        // Reset form
        setNewTitle("");
        setNewCategory("");
        setNewSubCategory("");
        setNewLevel("");
        setNewCapacity("");
        setNewPrice("");
        setNewDescription("");
        fetchData();
      } else {
        toast.error(await readError(response, t("courses.errors.createFailed")));
      }
    } catch (error) {
      toast.error(t("courses.errors.serverError"));
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/teachingrequests/${requestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(t("requests.cancelSuccess", "İstek geri alındı."));
        fetchData();
      } else {
        toast.error(t("requests.cancelFailed", "İstek geri alınamadı."));
      }
    } catch (error) {
      toast.error(t("requests.serverError", "Sunucu hatası."));
    }
  };

  return (
    <>
      <PageHeader
        crumb={t("sidebar.taughtCourses")}
        action={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="size-4" /> {t("courses.newCourse")}
          </Button>
        }
      />

      <div className="p-4 md:p-8 animate-reveal space-y-12">
        <section>
          <h2 className="text-xl font-bold mb-6">{t("sidebar.taughtCourses")}</h2>
          {courses.length === 0 ? (
            <div className="text-center py-12 bg-card border rounded-lg shadow-sm">
              <p className="text-muted-foreground">{t("courses.noTaughtCourses")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((c, index) => {
                const currentId = c.id || c.Id;
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
                    key={currentId || index}
                    onClick={() => setSelectedCourse(c)}
                    className="group bg-card border border-border hover:border-accent transition-colors rounded-md overflow-hidden shadow-sm flex flex-col cursor-pointer"
                  >
                    <div className="w-full aspect-video relative overflow-hidden bg-muted">
                      <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-mono text-accent uppercase">
                          {i18n.exists(`dynamic.categories.${category}`)
                            ? t(`dynamic.categories.${category}`)
                            : category}
                        </span>
                        <span className="text-sm font-bold">
                          {price === "0" || price === 0
                            ? t("courses.free", "Ücretsiz")
                            : `₺${price}`}
                        </span>
                      </div>
                      <h4 className="font-bold mb-4 line-clamp-2 flex-1">
                        {i18n.exists(`dynamic.courses.${title}`)
                          ? t(`dynamic.courses.${title}`)
                          : title}
                      </h4>
                      <div className="flex justify-between items-center text-xs text-muted-foreground mt-auto">
                        <span>{t("courses.instructorPrefix", { name: instructor })}</span>
                        <span>
                          {t("courses.capacity")}: {c.maxCapacity || c.MaxCapacity || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-bold mb-6">{t("courses.myTeachingRequests")}</h2>
          {requests.length === 0 ? (
            <div className="text-center py-12 bg-card border rounded-lg shadow-sm">
              <p className="text-muted-foreground">{t("courses.noTeachingRequests")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {requests.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold line-clamp-2">
                        {i18n.exists(
                          `dynamic.courses.${(r.courseTitle || r.CourseTitle || "").trim()}`,
                        )
                          ? t(`dynamic.courses.${(r.courseTitle || r.CourseTitle || "").trim()}`)
                          : r.courseTitle || r.CourseTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(r.createdAt, i18n.language)}
                      </p>
                    </div>
                    <div className="mt-auto pt-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            r.status === "Pending" || r.Status === "Pending"
                              ? "outline"
                              : r.status === "Accepted" || r.Status === "Accepted"
                                ? "default"
                                : "destructive"
                          }
                          className={
                            r.status === "Accepted" || r.Status === "Accepted"
                              ? "bg-success hover:bg-success text-white border-transparent"
                              : ""
                          }
                        >
                          {r.status === "Pending" || r.Status === "Pending"
                            ? t("requests.pending", "Bekliyor")
                            : r.status === "Accepted" || r.Status === "Accepted"
                              ? t("requests.accepted", "Kabul Edildi")
                              : t("requests.rejected", "Reddedildi")}
                        </Badge>
                        {(r.status === "Pending" || r.Status === "Pending") && (
                          <ConfirmDialog
                            title={t("requests.cancelConfirmTitle")}
                            description={t("requests.cancelConfirmBody")}
                            confirmLabel={t("requests.cancel")}
                            onConfirm={() => handleCancelRequest(r.id)}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2 border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors"
                            >
                              {t("requests.cancel")}
                            </Button>
                          </ConfirmDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">{t("courses.newCourse")}</h3>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("courses.courseName")} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  className="w-full border border-border rounded-md px-3 py-2 bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder={t("courses.courseNamePlaceholder")}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("courses.category")} *</label>
                <select
                  required
                  className="w-full rounded-md border p-2 text-sm bg-background"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="" disabled>
                    {t("courses.selectCategory")}
                  </option>
                  {categories.map((b) => (
                    <option key={b} value={b}>
                      {i18n.exists(`dynamic.categories.${b}`) ? t(`dynamic.categories.${b}`) : b}
                    </option>
                  ))}
                </select>
              </div>
              <CourseTaxonomyFields
                category={newCategory}
                subCategory={newSubCategory}
                onSubCategoryChange={setNewSubCategory}
                level={newLevel}
                onLevelChange={setNewLevel}
                labelClassName="text-sm font-medium block"
                selectClassName="w-full rounded-md border p-2 text-sm bg-background"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("courses.capacity")}</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="w-full rounded-md border p-2 text-sm bg-background"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("courses.price")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border p-2 text-sm bg-background"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("courses.description")}</label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  className="w-full border border-border rounded-md px-3 py-2 bg-background focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                  placeholder={t("courses.descriptionPlaceholder")}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                  {t("courses.cancel")}
                </Button>
                <Button type="submit">{t("courses.save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          canManage={true}
          teachers={dbTeachers}
          enrollments={dbEnrollments}
          categories={categories}
          onSaved={() => {
            setSelectedCourse(null);
            fetchData();
          }}
          isStudent={false}
        />
      )}
    </>
  );
}
