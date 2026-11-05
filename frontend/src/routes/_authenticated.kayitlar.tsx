import { readError } from "@/lib/auth";
import { formatDate, pillButton } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, X, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminOnly } from "../hooks/useAdminGuard";

import { API_BASE } from "@/components/courseHelpers";
export const Route = createFileRoute("/_authenticated/kayitlar")({
  head: () => ({
    meta: [
      { title: "Kayıt Yönetimi — E-Kurs" },
      { name: "description", content: "Öğrenci kayıtlarını görüntüle ve yönet." },
    ],
  }),
  component: adminOnly(EnrollmentsPage),
});

const API = `${API_BASE}/api`;

interface EnrollmentDto {
  id?: number;
  Id?: number;
  studentFullName?: string;
  StudentFullName?: string;
  studentNumber?: string;
  StudentNumber?: string;
  courseTitle?: string;
  CourseTitle?: string;
  enrollmentDate?: string;
  EnrollmentDate?: string;
}

interface StudentLite {
  id?: number;
  Id?: number;
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  studentNumber?: string;
  StudentNumber?: string;
}

interface CourseLite {
  id?: number;
  Id?: number;
  title?: string;
  Title?: string;
}

const pick = <T,>(...vals: (T | undefined | null)[]) =>
  vals.find((v) => v !== undefined && v !== null);

function EnrollmentsPage() {
  const { t, i18n } = useTranslation();
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // ÇOKLU SEÇİM VE DÜZENLEME MODU STATE'LERİ
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<number[]>([]);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    type === "error" ? toast.error(message) : toast.success(message);

  const authHeaders = () => {
    const token = localStorage.getItem("jwt_token");

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const fetchEnrollments = useCallback(async () => {
    try {
      const res = await fetch(`${API}/enrollments`, {
        headers: authHeaders(),
      });

      if (res.ok) {
        setEnrollments(await res.json());
      }
    } catch (err) {
      console.error("Kayıtlar yüklenirken hata:", err);
    }
  }, []);

  const fetchStudentsAndCourses = useCallback(async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`${API}/students`, { headers: authHeaders() }),
        fetch(`${API}/courses`, { headers: authHeaders() }),
      ]);

      if (sRes.ok) {
        setStudents(await sRes.json());
      }

      if (cRes.ok) {
        setCourses(await cRes.json());
      }
    } catch (err) {
      console.error("Öğrenci/kurs listesi yüklenirken hata:", err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchEnrollments(), fetchStudentsAndCourses()]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchEnrollments, fetchStudentsAndCourses]);

  const handleOpenModal = () => {
    setSelectedStudent("");
    setSelectedCourse("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // YENİ: DÜZENLEME MODU VE SEÇİM FONKSİYONLARI
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setSelectedEnrollmentIds([]);
  };

  const handleSelectEnrollment = (id: number | undefined) => {
    if (!id) return;
    setSelectedEnrollmentIds((prev) =>
      prev.includes(id) ? prev.filter((enrollmentId) => enrollmentId !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allFilteredIds = filteredEnrollments
        .map((enr) => pick(enr.id, enr.Id) as number)
        .filter((id) => id !== undefined);
      setSelectedEnrollmentIds(allFilteredIds);
    } else {
      setSelectedEnrollmentIds([]);
    }
  };

  const handleEnroll = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedStudent || !selectedCourse) {
      showToast(t("enrollments.errors.selectionRequired"), "error");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${API}/enrollments/student/${selectedStudent}/course/${selectedCourse}`,
        {
          method: "POST",
          headers: authHeaders(),
        },
      );

      if (res.ok) {
        showToast(t("enrollments.errors.enrollSuccess"));
        handleCloseModal();
        fetchEnrollments();
      } else {
        showToast(await readError(res, t("enrollments.errors.enrollFailed")), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(t("enrollments.errors.serverError"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  // TOPLU SİLME ONAY İŞLEMİ
  const confirmDeleteEnrollment = async () => {
    if (selectedEnrollmentIds.length === 0) return;

    setIsConfirmOpen(false);

    try {
      const results = await Promise.all(
        selectedEnrollmentIds.map((id) =>
          fetch(`${API}/enrollments/${id}`, {
            method: "DELETE",
            headers: authHeaders(),
          })
            .then((res) => (res.ok ? id : null))
            .catch(() => null),
        ),
      );
      const deletedIds = results.filter((id): id is number => id !== null);

      if (deletedIds.length < results.length) {
        showToast(t("enrollments.errors.serverError"), "error");
      } else {
        showToast(t("enrollments.errors.deleteSuccess", { count: deletedIds.length }));
        setIsEditMode(false);
      }
      fetchEnrollments();
      setSelectedEnrollmentIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
    } catch (err) {
      console.error(err);
      showToast(t("enrollments.errors.serverError"), "error");
    }
  };

  const cancelDeleteEnrollment = () => {
    setIsConfirmOpen(false);
  };

  const filteredEnrollments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return enrollments;

    return enrollments.filter((enrollment) => {
      const studentName = pick(enrollment.studentFullName, enrollment.StudentFullName) || "";
      const studentNumber = pick(enrollment.studentNumber, enrollment.StudentNumber) || "";
      const courseTitle = pick(enrollment.courseTitle, enrollment.CourseTitle) || "";

      return (
        studentName.toLowerCase().includes(query) ||
        studentNumber.toLowerCase().includes(query) ||
        courseTitle.toLowerCase().includes(query)
      );
    });
  }, [enrollments, searchTerm]);

  return (
    <>
      <PageHeader
        crumb={t("enrollments.breadcrumb")}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        action={
          <div className="flex items-center gap-2">
            {/* Sadece seçim yapıldığında görünen silme butonu */}
            {isEditMode && selectedEnrollmentIds.length > 0 && (
              <button onClick={() => setIsConfirmOpen(true)} className={pillButton.danger}>
                <Trash2 className="h-4 w-4" />
                {t("enrollments.deleteSelected", { count: selectedEnrollmentIds.length })}
              </button>
            )}

            {/* Düzenleme modunu açıp kapatan buton */}
            <button onClick={toggleEditMode} className={pillButton.outline}>
              {isEditMode ? t("enrollments.cancel") : t("enrollments.editEnrollments")}
            </button>

            <button type="button" onClick={handleOpenModal} className={pillButton.primary}>
              <Plus className="h-4 w-4" />
              {t("enrollments.newEnrollment")}
            </button>
          </div>
        }
      />

      <div className="p-8">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">{t("enrollments.enrollmentNo")}</th>
                  <th className="px-6 py-3 font-medium">{t("enrollments.studentNo")}</th>
                  <th className="px-6 py-3 font-medium">{t("enrollments.student")}</th>
                  <th className="px-6 py-3 font-medium">{t("enrollments.course")}</th>
                  <th className="px-6 py-3 font-medium">{t("enrollments.enrollmentDate")}</th>
                  {/* SADECE DÜZENLEME MODUNDAYKEN GÖRÜNECEK BAŞLIK */}
                  {isEditMode && (
                    <th className="px-6 py-3 text-right font-medium">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border text-foreground focus:ring-foreground cursor-pointer"
                        onChange={handleSelectAll}
                        checked={
                          selectedEnrollmentIds.length === filteredEnrollments.length &&
                          filteredEnrollments.length > 0
                        }
                      />
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      {t("enrollments.loading")}
                    </td>
                  </tr>
                ) : filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      {t("enrollments.notFound")}
                    </td>
                  </tr>
                ) : (
                  filteredEnrollments.map((e) => {
                    const id = pick(e.id, e.Id);
                    const studentNumber = pick(e.studentNumber, e.StudentNumber) || "-";
                    const studentName = pick(e.studentFullName, e.StudentFullName) || "-";
                    const rawCourseTitle = pick(e.courseTitle, e.CourseTitle) || "-";
                    const courseTitle =
                      rawCourseTitle !== "-" && i18n.exists(`dynamic.courses.${rawCourseTitle}`)
                        ? t(`dynamic.courses.${rawCourseTitle}`)
                        : rawCourseTitle;

                    const rawDate = pick(e.enrollmentDate, e.EnrollmentDate);
                    const dateText = formatDate(rawDate, i18n.language);

                    return (
                      <tr
                        key={id}
                        className={`transition-colors hover:bg-muted/40 ${
                          selectedEnrollmentIds.includes(Number(id)) ? "bg-muted/60" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                          #{String(id).padStart(4, "0")}
                        </td>

                        <td className="px-6 py-4">{studentNumber}</td>

                        <td className="px-6 py-4 font-medium">{studentName}</td>

                        <td className="px-6 py-4">{courseTitle}</td>

                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                          {dateText}
                        </td>

                        {/* SADECE DÜZENLEME MODUNDAYKEN GÖRÜNECEK HÜCRE */}
                        {isEditMode && (
                          <td className="px-6 py-4 text-right">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-border text-foreground focus:ring-foreground cursor-pointer"
                              checked={selectedEnrollmentIds.includes(Number(id))}
                              onChange={() => handleSelectEnrollment(Number(id))}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          onClick={handleCloseModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("enrollments.createEnrollmentTitle")}</h2>

              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t("enrollments.student")}</label>

                <select
                  value={selectedStudent}
                  onChange={(ev) => setSelectedStudent(ev.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t("enrollments.selectStudent")}</option>

                  {students.map((s) => {
                    const id = pick(s.id, s.Id);
                    const firstName = pick(s.firstName, s.FirstName) || "";
                    const lastName = pick(s.lastName, s.LastName) || "";
                    const studentNumber = pick(s.studentNumber, s.StudentNumber) || "";

                    return (
                      <option key={id} value={id}>
                        {firstName} {lastName}
                        {studentNumber ? ` (${studentNumber})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{t("enrollments.course")}</label>

                <select
                  value={selectedCourse}
                  onChange={(ev) => setSelectedCourse(ev.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t("enrollments.selectCourse")}</option>

                  {courses.map((c) => {
                    const id = pick(c.id, c.Id);
                    const title = pick(c.title, c.Title) || t("enrollments.unnamedCourse");

                    return (
                      <option key={id} value={id}>
                        {title !== t("enrollments.unnamedCourse") &&
                        i18n.exists(`dynamic.courses.${title}`)
                          ? t(`dynamic.courses.${title}`)
                          : title}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  {t("enrollments.cancel")}
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting ? t("enrollments.saving") : t("enrollments.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODALI - ÇOKLU SİLME İÇİN GÜNCELLENDİ */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-lg font-semibold">{t("enrollments.deleteConfirmTitle")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("enrollments.deleteConfirmText1")}{" "}
                  <strong>{selectedEnrollmentIds.length}</strong>{" "}
                  {t("enrollments.deleteConfirmText2")}
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
              {t("enrollments.deleteConfirmWarning")}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={confirmDeleteEnrollment}
                className="px-4 py-2 text-sm font-semibold bg-destructive text-white hover:bg-destructive/90 rounded-md transition-colors"
              >
                {t("enrollments.yes")}
              </button>
              <button
                onClick={cancelDeleteEnrollment}
                className="px-4 py-2 text-sm font-semibold border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
              >
                {t("enrollments.no")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
