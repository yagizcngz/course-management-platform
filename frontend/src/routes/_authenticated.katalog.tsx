import { pillButton, chip } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { Plus, X, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CourseDetailModal } from "../components/CourseDetailModal";
import { CategoryBanner } from "../components/CategoryBanner";
import { useNavigate } from "@tanstack/react-router";
import {
  getCourseImage,
  getTeacherFullName,
  getTeachersInBranch,
  fetchCategories,
  type CourseData,
  type EnrollmentDto,
  type TeacherLiteDto,
} from "../components/courseHelpers";

import { parseJwt, isAdminRole, isStudentRole, isTeacherRole, readError } from "@/lib/auth";
import { API_BASE } from "@/components/courseHelpers";
import { CourseTaxonomyFields } from "@/components/CourseTaxonomyFields";
export const Route = createFileRoute("/_authenticated/katalog")({
  component: CoursesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    category: (search.category as string) || "",
  }),
});

function CoursesPage() {
  const { t, i18n } = useTranslation();
  const { category: categoryFromUrl } = Route.useSearch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || "");
  const [dbCourses, setDbCourses] = useState<CourseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync category from URL when navigating from dashboard
  useEffect(() => {
    setSelectedCategory(categoryFromUrl || "");
  }, [categoryFromUrl]);

  const [currentUser, setCurrentUser] = useState({
    role: t("courses.student"),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myTeacherId, setMyTeacherId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSubCategory, setNewSubCategory] = useState("");
  const [newLevel, setNewLevel] = useState("");
  // newTeacherId: teachers listesinden seçilen öğretmenin id'si (string olarak, select
  // elemanının value'su için). Boş string = "henüz öğretmen seçilmedi".
  const [newTeacherId, setNewTeacherId] = useState("");

  // KURS DETAY MODALI İÇİN STATE'LER (düzenleme formu artık CourseDetailModal içinde)
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [dbEnrollments, setDbEnrollments] = useState<EnrollmentDto[]>([]);
  const [myCourses, setMyCourses] = useState<EnrollmentDto[]>([]);
  // Kurs düzenleme formundaki öğretmen seçim dropdown'ı ve "Eğitmen Profili" (foto+bio)
  // eşleştirmesi için /api/teachers'tan çekilen liste.
  const [dbTeachers, setDbTeachers] = useState<TeacherLiteDto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(!!categoryFromUrl);

  // ÇOKLU SEÇİM VE DÜZENLEME MODU STATE'LERİ
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<(string | number)[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    type === "error" ? toast.error(message) : toast.success(message);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`${API_BASE}/api/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDbCourses(data);
      } else {
        showToast(t("courses.errors.serverError"), "error");
      }
    } catch (error) {
      console.error("Kurslar yüklenirken hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();

    const token = localStorage.getItem("jwt_token");
    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        const role =
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
          payload.role ||
          t("courses.student");

        setCurrentUser({ role });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the language changes
  }, [t]);

  // Kurs detay modalında kayıtlı öğrenci sayısını göstermek ve öğretmen seçim
  // dropdown'ını / eğitmen profilini doldurmak için gerekli listeler.
  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const fetchEnrollments = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/enrollments`, { headers });
        if (res.ok) setDbEnrollments(await res.json());
      } catch (error) {
        console.error("Kayıtlar yüklenirken hata:", error);
      }
    };

    const fetchTeachers = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/teachers`, { headers });
        if (res.ok) {
          const teachers = await res.json();
          setDbTeachers(teachers);

          const token = localStorage.getItem("jwt_token");
          const payload = token ? parseJwt(token) : null;
          const email =
            payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
            payload?.email;
          const selfTeacher = teachers.find(
            (t: TeacherLiteDto) => email && (t.email === email || t.Email === email),
          );
          if (selfTeacher) {
            setMyTeacherId(selfTeacher.id || selfTeacher.Id);
          }
        }
      } catch (error) {
        console.error("Öğretmen listesi alınamadı:", error);
      }
    };

    const fetchCats = async () => {
      const cats = await fetchCategories(token || undefined);
      setCategories(cats);
    };

    const fetchMyCourses = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/enrollments/my-courses`, { headers });
        if (res.ok) setMyCourses(await res.json());
      } catch (error) {
        console.error("Öğrenci kursları yüklenirken hata:", error);
      }
    };

    fetchEnrollments();
    fetchTeachers();
    fetchCats();
    fetchMyCourses();
  }, []);

  const handleCloseDetailModal = () => {
    setSelectedCourse(null);
  };

  // Modal içinde bir kurs güncellendiğinde, hem açık olan detay görünümünü hem de
  // arkadaki kart listesini (dbCourses) güncel tutuyoruz.
  const handleCourseSaved = (updated: CourseData) => {
    setSelectedCourse(updated);
    setDbCourses((prev) =>
      prev.map((c) => ((c.id ?? c.Id) === (updated.id ?? updated.Id) ? { ...c, ...updated } : c)),
    );
  };

  const handleCloseModal = () => {
    setNewTitle("");
    setNewCapacity("");
    setNewPrice("");
    setNewDescription("");
    setNewCategory("");
    setNewSubCategory("");
    setNewLevel("");
    setNewTeacherId("");
    setIsModalOpen(false);
  };

  // "Yeni Kurs" modalını açarken, giriş yapan kullanıcı bir öğretmense (dbTeachers
  // listesinde adı eşleşen bir kayıt varsa) formu onun branşı ve kendisiyle önceden
  // dolduruyoruz; admin dilerse değiştirebilir.
  const handleOpenAddModal = () => {
    const selfTeacher = dbTeachers.find((t) => (t.id || t.Id) === myTeacherId);
    if (selfTeacher) {
      const branch = selfTeacher.branch || selfTeacher.Branch || "";
      setNewCategory(branch);
      setNewTeacherId(String(selfTeacher.id ?? selfTeacher.Id ?? ""));
    }
    setIsModalOpen(true);
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategory) {
      showToast(t("courses.errors.categoryRequired"), "error");
      return;
    }
    if (!newTeacherId) {
      showToast(t("courses.errors.instructorRequired"), "error");
      return;
    }

    const selectedTeacher = dbTeachers.find((t) => String(t.id ?? t.Id) === newTeacherId);
    const instructorName = getTeacherFullName(selectedTeacher || {});

    try {
      const token = localStorage.getItem("jwt_token");
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
          Instructor: instructorName,
          TeacherId: Number(newTeacherId),
          MaxCapacity: Number(newCapacity) || 0,
          Price: Number(newPrice) || 0,
          Description: newDescription,
        }),
      });

      if (response.ok) {
        showToast(t("courses.errors.createSuccess"));
        handleCloseModal();
        fetchCourses();
      } else {
        showToast(await readError(response, t("courses.errors.createFailed")), "error");
      }
    } catch (error) {
      showToast(t("courses.errors.serverError"), "error");
    }
  };

  const handleTeachCourseRequest = async (e: React.MouseEvent, courseId: number | string) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`${API_BASE}/api/teachingrequests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ CourseId: courseId }),
      });

      if (response.ok) {
        showToast(t("requests.sentSuccess", "Ders verme isteği gönderildi."), "success");
      } else {
        showToast(await readError(response, t("requests.sentFailed")), "error");
      }
    } catch (error) {
      showToast(t("courses.errors.serverError", "Sunucuya bağlanılamadı."), "error");
    }
  };

  const handleJoinCourse = async (courseId: number | string) => {
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`${API_BASE}/api/enrollments/join/${courseId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        showToast(t("dashboard.alerts.joinSuccess", "Kursa başarıyla katıldınız."), "success");
        // Update myCourses
        const myRes = await fetch(`${API_BASE}/api/enrollments/my-courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (myRes.ok) setMyCourses(await myRes.json());
      } else {
        showToast(await readError(response, t("dashboard.alerts.joinError")), "error");
      }
    } catch (error) {
      showToast(t("courses.errors.serverError", "Sunucuya bağlanılamadı."), "error");
    }
  };

  // YENİ: DÜZENLEME MODU VE SEÇİM FONKSİYONLARI
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setSelectedCourseIds([]);
  };

  const handleSelectCourse = (id: string | number | undefined) => {
    if (!id) return;
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((courseId) => courseId !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedCourseIds.length === filteredCourses.length && filteredCourses.length > 0) {
      // Tümü seçiliyse temizle
      setSelectedCourseIds([]);
    } else {
      // Tümünü seç
      const allFilteredIds = filteredCourses
        .map((c) => c.id ?? c.Id)
        .filter((id): id is string | number => id !== undefined);
      setSelectedCourseIds(allFilteredIds);
    }
  };

  // TOPLU SİLME ONAY İŞLEMİ
  const handleConfirmBulkDelete = async () => {
    if (selectedCourseIds.length === 0) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const responses = await Promise.all(
        selectedCourseIds.map((id) =>
          fetch(`${API_BASE}/api/courses/${id}`, {
            method: "DELETE",
            headers,
          }),
        ),
      );

      if (responses.some((res) => !res.ok)) {
        showToast(t("courses.errors.deleteFailed"), "error");
      } else {
        showToast(t("courses.errors.deleteSuccess", { count: selectedCourseIds.length }));
      }
      setIsConfirmOpen(false);
      setSelectedCourseIds([]);
      setIsEditMode(false);
      fetchCourses();
    } catch (error) {
      console.error("Silme hatası:", error);
      showToast(t("courses.errors.deleteFailed"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Katalogda toplu düzenleme yöneticiye ait; öğretmenler kendi kurslarını "Verdiğim Kurslar"dan yönetir
  const canManage = isAdminRole(currentUser.role);

  const searchLower = searchTerm.toLowerCase();
  const filteredCourses = dbCourses.filter((c) => {
    const fTitle = c.title || c.Title || "";
    const fInstructor = c.instructor || c.Instructor || "";
    const fCategory = c.category || c.Category || "";

    const matchesSearch =
      fTitle.toLowerCase().includes(searchLower) ||
      fInstructor.toLowerCase().includes(searchLower) ||
      fCategory.toLowerCase().includes(searchLower);

    const matchesCategory = !selectedCategory || fCategory === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleCategorySelect = (cat: string) => {
    const newCat = cat === selectedCategory ? "" : cat;
    setSelectedCategory(newCat);
    navigate({
      to: "/katalog",
      search: { category: newCat || "" },
      replace: true,
    });
  };

  return (
    <>
      <PageHeader
        crumb={t("courses.breadcrumb")}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        action={
          canManage && (
            <div className="flex gap-2">
              {/* Sadece seçim yapıldığında görünen silme butonu */}
              {isEditMode && selectedCourseIds.length > 0 && (
                <button onClick={() => setIsConfirmOpen(true)} className={pillButton.danger}>
                  <Trash2 className="size-4" />
                  {t("courses.deleteSelected", { count: selectedCourseIds.length })}
                </button>
              )}

              {/* Tümünü Seç Butonu (Sadece düzenleme modunda) */}
              {isEditMode && (
                <button onClick={handleSelectAll} className={pillButton.outline}>
                  {selectedCourseIds.length === filteredCourses.length && filteredCourses.length > 0
                    ? t("courses.clearSelection")
                    : t("courses.selectAll")}
                </button>
              )}

              {/* Düzenleme modunu açıp kapatan buton */}
              <button onClick={toggleEditMode} className={pillButton.outline}>
                {isEditMode ? t("courses.cancel") : t("courses.editCourses")}
              </button>

              <button onClick={handleOpenAddModal} className={pillButton.primary}>
                <Plus className="size-4" />
                {t("courses.newCourse")}
              </button>
            </div>
          )
        }
      />

      <div className="p-8 animate-reveal">
        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={chip(isFilterOpen || !!selectedCategory)}
            >
              <Filter className="size-3.5" />
              {selectedCategory
                ? i18n.exists(`dynamic.categories.${selectedCategory}`)
                  ? t(`dynamic.categories.${selectedCategory}`)
                  : selectedCategory
                : t("courses.filter", "Filtrele")}
            </button>

            {isFilterOpen && (
              <div className="flex items-center gap-2 mt-3 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => handleCategorySelect("")}
                  className={chip(!selectedCategory)}
                >
                  {t("courses.allCategories", "Tumu")}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className={chip(selectedCategory === cat)}
                  >
                    {i18n.exists(`dynamic.categories.${cat}`)
                      ? t(`dynamic.categories.${cat}`)
                      : cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedCategory && !isLoading && (
          <CategoryBanner
            key={selectedCategory}
            category={selectedCategory}
            courses={dbCourses.filter((c) => (c.category || c.Category) === selectedCategory)}
            onOpen={setSelectedCourse}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-muted-foreground animate-pulse font-mono text-xs uppercase tracking-widest">
              {t("courses.loading")}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground text-xs">
              {t("courses.notFound")}
            </div>
          ) : (
            filteredCourses.map((c, index) => {
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
              const isSelected = selectedCourseIds.includes(currentId as string | number);

              const imageUrl = getCourseImage(c, index);

              return (
                <div
                  key={currentId || index}
                  onClick={() => setSelectedCourse(c)}
                  title={t("courses.viewDetails")}
                  // Seçim yapıldıysa karta ekstra çerçeve ve arka plan rengi ekliyoruz
                  className={`group bg-card border transition-colors rounded-md overflow-hidden shadow-sm flex flex-col cursor-pointer ${
                    isSelected
                      ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
                      : "border-border hover:border-accent"
                  }`}
                >
                  <div className="w-full aspect-video relative overflow-hidden bg-muted">
                    <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                    {(() => {
                      const isStudent =
                        isStudentRole(currentUser.role) ||
                        currentUser.role === t("courses.student");
                      if (isStudent) {
                        const isEnrolled = myCourses.some((enc) => {
                          const cId =
                            enc.courseId ?? enc.CourseId ?? enc.course?.id ?? enc.Course?.Id;
                          return String(cId) === String(currentId);
                        });
                        if (isEnrolled) {
                          return (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded-sm font-bold uppercase z-10">
                              {t("dashboard.inProgress", "Devam Ediyor")}
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono text-accent uppercase">
                        {i18n.exists(`dynamic.categories.${category}`)
                          ? t(`dynamic.categories.${category}`)
                          : category}
                      </span>
                      <span className="text-sm font-bold">₺{price}</span>
                    </div>
                    <h4 className="font-bold mb-4 line-clamp-2 flex-1">
                      {i18n.exists(`dynamic.courses.${title}`)
                        ? t(`dynamic.courses.${title}`)
                        : title}
                    </h4>
                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-auto">
                      <span>{t("courses.instructorPrefix", { name: instructor })}</span>
                      {isTeacherRole(currentUser.role) &&
                        myTeacherId &&
                        String(c.teacherId || c.TeacherId) !== String(myTeacherId) &&
                        !myCourses.some((enc) => (enc.courseId || enc.CourseId) === currentId) && (
                          <button
                            onClick={(e) =>
                              handleTeachCourseRequest(e, currentId as string | number)
                            }
                            className="bg-primary text-primary-foreground px-3 py-1 rounded hover:opacity-90 shadow-sm transition-all font-medium text-xs"
                          >
                            {t("courseModal.teachCourse", "Ders Ver")}
                          </button>
                        )}
                    </div>

                    {/* SADECE DÜZENLEME MODUNDAYKEN GÖRÜNECEK ONAY KUTUSU (Sil Butonu Yerine) */}
                    {canManage && isEditMode && (
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-mono uppercase bg-background border border-border hover:bg-muted rounded-md cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="size-4 rounded border-border text-foreground focus:ring-foreground cursor-pointer"
                          checked={isSelected}
                          onChange={() => handleSelectCourse(currentId)}
                        />
                        {isSelected ? t("courses.selected") : t("courses.select")}
                      </label>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={handleCloseDetailModal}
          canManage={canManage}
          enrollments={dbEnrollments}
          teachers={dbTeachers}
          categories={categories}
          onSaved={handleCourseSaved}
          isStudent={isStudentRole(currentUser.role) || currentUser.role === t("courses.student")}
          isEnrolled={myCourses.some(
            (e) =>
              String(e.courseId || e.CourseId) === String(selectedCourse.id || selectedCourse.Id),
          )}
          onJoin={() => handleJoinCourse(selectedCourse.id || selectedCourse.Id || "")}
        />
      )}

      {isModalOpen && (
        <div
          onClick={handleCloseModal}
          className="fixed inset-0 z-200 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>

            <h2 className="text-xl font-bold mb-6 tracking-tight">
              {t("courses.createCourseTitle")}
            </h2>

            <form onSubmit={handleAddCourse} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("courses.courseName")}</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("courses.category")}</label>
                  <select
                    required
                    value={newCategory}
                    onChange={(e) => {
                      const category = e.target.value;
                      setNewCategory(category);
                      const stillValid = getTeachersInBranch(dbTeachers, category).some(
                        (t) => String(t.id ?? t.Id) === newTeacherId,
                      );
                      if (!stillValid) setNewTeacherId("");
                    }}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
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
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("courses.instructor")}</label>
                  <select
                    required
                    value={newTeacherId}
                    onChange={(e) => setNewTeacherId(e.target.value)}
                    disabled={!newCategory}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors disabled:opacity-60"
                  >
                    <option value="" disabled>
                      {!newCategory
                        ? t("courses.selectCategoryFirst")
                        : t("courses.selectInstructor")}
                    </option>
                    {getTeachersInBranch(dbTeachers, newCategory).map((t) => {
                      const id = t.id ?? t.Id;
                      return (
                        <option key={id} value={id}>
                          {getTeacherFullName(t)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <CourseTaxonomyFields
                category={newCategory}
                subCategory={newSubCategory}
                onSubCategoryChange={setNewSubCategory}
                level={newLevel}
                onLevelChange={setNewLevel}
                selectClassName="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("courses.capacity")}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("courses.price")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("courses.description")}</label>
                <textarea
                  rows={3}
                  className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors resize-none"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 px-4 bg-muted text-muted-foreground text-sm font-bold hover:bg-muted/80 rounded-md transition-colors"
                >
                  {t("courses.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-foreground text-background text-sm font-bold hover:opacity-90 rounded-md transition-opacity"
                >
                  {t("courses.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODALI - ÇOKLU SİLME İÇİN GÜNCELLENDİ */}
      {isConfirmOpen && (
        <div
          onClick={() => !isDeleting && setIsConfirmOpen(false)}
          className="fixed inset-0 z-200 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-full bg-destructive/10 grid place-items-center shrink-0">
                <Trash2 className="size-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg tracking-tight">
                  {t("courses.deleteConfirmTitle")}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("courses.deleteConfirmText1")} <strong>{selectedCourseIds.length}</strong>{" "}
                  {t("courses.deleteConfirmText2")}
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  {t("courses.deleteConfirmWarning")}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={handleConfirmBulkDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-destructive text-white rounded-md text-sm font-bold hover:bg-destructive/90 transition-colors disabled:opacity-60"
              >
                {isDeleting ? t("courses.deleting") : t("courses.yes")}
              </button>
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
              >
                {t("courses.no")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
