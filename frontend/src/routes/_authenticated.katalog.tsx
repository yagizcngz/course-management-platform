import { pillButton, chip, formatTry } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { Plus, X, Trash2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CourseDetailModal } from "../components/CourseDetailModal";
import { CourseShowcase } from "../components/CourseShowcase";
import { CourseFilterPanel } from "../components/CourseFilterPanel";
import { CatalogCrumbs, CatalogMeta } from "../components/CatalogHeading";
import { useCatalogHeading } from "../components/useCatalogHeading";
import { RatingSummary } from "../components/StarRating";
import { useCourseStats } from "../components/useCourseStats";
import {
  SORTS,
  activeFilterCount,
  clearedFilters,
  filterCourses,
  inScope,
  parseCourseSearch,
  sortCourses,
  type CourseSearch,
  type FacetCourse,
} from "@/lib/courseFilters";
import { useNavigate } from "@tanstack/react-router";
import {
  emptyExtras,
  extrasBody,
  getCourseImage,
  getTeacherFullName,
  getTeachersInBranch,
  fetchCategories,
  type CourseData,
  type EnrollmentDto,
  type TeacherLiteDto,
} from "../components/courseHelpers";

import {
  authHeaders,
  getRoleFromToken,
  parseJwt,
  isAdminRole,
  isStudentRole,
  isTeacherRole,
  readError,
} from "@/lib/auth";
import { API_BASE } from "@/components/courseHelpers";
import { CourseTaxonomyFields } from "@/components/CourseTaxonomyFields";
import { CourseStatusPill } from "@/components/CourseProgressBar";
import { rankBy, searchRank } from "@/lib/search";
import { joinCourse, useMyCourses } from "@/components/useMyCourses";
import { useOptimisticSearch } from "@/components/useOptimisticSearch";
export const Route = createFileRoute("/_authenticated/katalog")({
  component: CoursesPage,
  // scope, filters and sort live in the URL (q stays in the header's search box)
  validateSearch: (search: Record<string, unknown>): Omit<CourseSearch, "q"> => {
    const { q: _q, ...rest } = parseCourseSearch(search);
    return rest;
  },
});

/** A course with the facet fields read once from the API's mixed-case shape. */
type Row = CourseData & FacetCourse;
const toRow = (c: CourseData): Row => ({
  ...c,
  id: Number(c.id ?? c.Id),
  category: c.category || c.Category || "",
  subCategory: c.subCategory ?? c.SubCategory ?? null,
  level: c.level ?? c.Level ?? null,
  price: Number(c.price ?? c.Price ?? 0) || 0,
  createdAt: c.createdAt ?? c.CreatedAt,
});
const self = (c: Row) => c;

function CoursesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate({ from: "/katalog" });
  const [search, set] = useOptimisticSearch(Route.useSearch(), (patch: Partial<CourseSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false }),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dbCourses, setDbCourses] = useState<CourseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { byId: stats } = useCourseStats();
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const [newExtras, setNewExtras] = useState(emptyExtras);
  // newTeacherId: teachers listesinden seçilen öğretmenin id'si (string olarak, select
  // elemanının value'su için). Boş string = "henüz öğretmen seçilmedi".
  const [newTeacherId, setNewTeacherId] = useState("");

  // KURS DETAY MODALI İÇİN STATE'LER (düzenleme formu artık CourseDetailModal içinde)
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [dbEnrollments, setDbEnrollments] = useState<EnrollmentDto[]>([]);
  const { relation } = useMyCourses();
  // Kurs düzenleme formundaki öğretmen seçim dropdown'ı ve "Eğitmen Profili" (foto+bio)
  // eşleştirmesi için /api/teachers'tan çekilen liste.
  const [dbTeachers, setDbTeachers] = useState<TeacherLiteDto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

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
      const response = await fetch(`${API_BASE}/api/courses`, { headers: authHeaders() });

      if (response.ok) {
        const data = await response.json();
        setDbCourses(data);
      } else {
        showToast(t("courses.errors.serverError"), "error");
      }
    } catch (error) {
      console.error("Kurslar yüklenirken hata:", error);
      toast.error(t("common.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();

    if (localStorage.getItem("jwt_token")) {
      setCurrentUser({ role: getRoleFromToken() || t("courses.student") });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the language changes
  }, [t]);

  // Kurs detay modalında kayıtlı öğrenci sayısını göstermek ve öğretmen seçim
  // dropdown'ını / eğitmen profilini doldurmak için gerekli listeler.
  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    const headers = authHeaders();

    const fetchEnrollments = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/enrollments`, { headers });
        if (res.ok) setDbEnrollments(await res.json());
        else toast.error(t("common.loadFailed"));
      } catch (error) {
        console.error("Kayıtlar yüklenirken hata:", error);
        toast.error(t("common.loadFailed"));
      }
    };

    const fetchTeachers = async () => {
      try {
        const [res, meRes] = await Promise.all([
          fetch(`${API_BASE}/api/teachers`, { headers }),
          fetch(`${API_BASE}/api/profile/me`, { headers }),
        ]);
        if (meRes.ok) setMyTeacherId((await meRes.json()).teacherId ?? null);
        if (res.ok) {
          setDbTeachers(await res.json());
        } else {
          toast.error(t("common.loadFailed"));
        }
      } catch (error) {
        console.error("Öğretmen listesi alınamadı:", error);
        toast.error(t("common.loadFailed"));
      }
    };

    const fetchCats = async () => {
      const cats = await fetchCategories(token || undefined);
      setCategories(cats);
    };

    fetchEnrollments();
    fetchTeachers();
    fetchCats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
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
    setNewExtras(emptyExtras);
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
      const response = await fetch(`${API_BASE}/api/courses`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          Title: newTitle,
          Category: newCategory,
          SubCategory: newSubCategory || null,
          Level: newLevel || null,
          ...extrasBody(newExtras),
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
      const response = await fetch(`${API_BASE}/api/teachingrequests`, {
        method: "POST",
        headers: authHeaders(),
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

  // the enrolment counts in the open modal change too, so the full list is refetched
  const handleJoinCourse = async (courseId: number | string) => {
    if (!(await joinCourse(courseId, t))) return;
    const res = await fetch(`${API_BASE}/api/enrollments`, { headers: authHeaders() });
    if (res.ok) setDbEnrollments(await res.json());
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
      setSelectedCourseIds(filteredCourses.map((c) => c.id));
    }
  };

  // TOPLU SİLME ONAY İŞLEMİ
  const handleConfirmBulkDelete = async () => {
    if (selectedCourseIds.length === 0) return;

    setIsDeleting(true);
    try {
      const headers = authHeaders();

      const responses = await Promise.all(
        selectedCourseIds.map((id) =>
          fetch(`${API_BASE}/api/courses/${id}`, {
            method: "DELETE",
            headers,
          }).catch(() => null),
        ),
      );

      // one failed request must not hide the ones that did delete: the list is always refreshed
      if (responses.some((res) => !res?.ok)) {
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
  const isStudent = isStudentRole(currentUser.role);

  // stored (Turkish) and translated names both match, so "Data Law" finds "KVKK ve Bilişim Hukuku"
  const both = (kind: string, value?: string | null) =>
    value
      ? ["tr", "en"].map((lng) => t(`dynamic.${kind}.${value}`, { lng, defaultValue: value }))
      : [];
  const label = (kind: string, value: string) =>
    i18n.exists(`dynamic.${kind}.${value}`) ? t(`dynamic.${kind}.${value}`) : value;
  const rows = useMemo(() => dbCourses.map(toRow), [dbCourses]);
  // the header follows the scope; the curated rankings rank the whole catalogue
  const scoped = useMemo(() => rows.filter((c) => inScope(c, search)), [rows, search]);
  const filteredCourses = useMemo(() => {
    const ranked = rankBy(filterCourses(rows, self, stats, search), (c) => {
      const title = c.title || c.Title || "";
      return searchRank(
        searchTerm,
        [title, ...both("courses", title)],
        [
          c.instructor || c.Instructor || "",
          ...both("categories", c.category),
          ...both("subCategories", c.subCategory),
          c.topic ?? "",
          c.description || c.Description || "",
          ...both("descriptions", title),
        ],
      );
    });
    // a search keeps its relevance order until a sort is picked
    if (searchTerm.trim() && !search.sort) return ranked;
    return sortCourses(ranked, self, stats, search.sort ?? "popular", (c) =>
      label("courses", c.title || c.Title || ""),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- both/label only read t, which i18n.language covers
  }, [rows, stats, search, searchTerm, i18n.language]);

  const showcaseOn = !isLoading && !searchTerm.trim() && !isEditMode;
  const heading = useCatalogHeading(search, label, {
    title: t("courses.catalogTitle"),
    lead: t("courses.catalogLead"),
  });
  const refinements = activeFilterCount(search);

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
        <header className="mb-8 space-y-4">
          {heading.crumbs.length > 0 ? (
            <CatalogCrumbs
              crumbs={heading.crumbs}
              current={heading.title}
              onPick={(patch) => set(patch)}
            />
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
              {heading.eyebrow}
            </p>
          )}
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">{heading.title}</h1>
          <p className="max-w-3xl text-muted-foreground">{heading.lead}</p>
          <CatalogMeta courses={scoped} stats={stats} />
        </header>

        {showcaseOn && (
          <CourseShowcase
            courses={rows}
            titleOf={(c) => label("courses", c.title || c.Title || t("courses.unnamedCourse"))}
            categoryOf={(c) => label("categories", c.category)}
            imageOf={(c, i) => getCourseImage(c, i)}
            onOpen={setSelectedCourse}
          />
        )}

        <h2 className="font-bold">{t("showcase.allCourses")}</h2>
        <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="catalog-filters"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`${chip(filtersOpen || refinements > 0)} lg:hidden`}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              {t("catalog.facets.title")}
              {refinements > 0 && <span className="font-mono">{refinements}</span>}
            </button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              {t("catalog.sort")}
              <select
                value={search.sort ?? (searchTerm.trim() ? "" : "popular")}
                onChange={(e) => {
                  const v = e.target.value;
                  set({ sort: v ? SORTS.find((s) => s === v) : undefined });
                }}
                className="h-8 rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-foreground"
              >
                {searchTerm.trim() && <option value="">{t("catalog.sorts.relevance")}</option>}
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`catalog.sorts.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            {refinements > 0 && (
              <button
                type="button"
                onClick={() => set(clearedFilters)}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
                {t("catalog.clearFilters")}
              </button>
            )}
          </div>
          <p role="status" aria-live="polite" className="font-mono text-xs text-muted-foreground">
            {isLoading
              ? t("courses.loading")
              : t("guest.courseCount", { count: filteredCourses.length })}
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
          <aside
            id="catalog-filters"
            aria-label={t("catalog.facets.title")}
            className={`${filtersOpen ? "block" : "hidden"} mb-6 lg:mb-0 lg:block`}
          >
            <CourseFilterPanel
              search={search}
              set={set}
              courses={rows}
              categories={categories}
              stats={stats}
              label={label}
            />
          </aside>
          <div className="grid min-w-0 grid-cols-1 content-start gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
                    // a div (it holds buttons), so keyboard users get Enter/Space like a button
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " "))
                        return;
                      e.preventDefault();
                      setSelectedCourse(c);
                    }}
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
                      {isStudent && <CourseStatusPill status={relation(currentId)} />}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-mono text-accent uppercase">
                          {i18n.exists(`dynamic.categories.${category}`)
                            ? t(`dynamic.categories.${category}`)
                            : category}
                        </span>
                        {/* an enrolled or owned course is not for sale to this student */}
                        {(!isStudent || relation(currentId) === "none") && (
                          <span className="text-sm font-bold">{formatTry(Number(price), 0)}</span>
                        )}
                      </div>
                      <h4 className="font-bold line-clamp-2">
                        {i18n.exists(`dynamic.courses.${title}`)
                          ? t(`dynamic.courses.${title}`)
                          : title}
                      </h4>
                      <RatingSummary
                        average={stats.get(c.id)?.ratingAverage ?? 0}
                        count={stats.get(c.id)?.ratingCount ?? 0}
                        className="mt-1.5 mb-4 flex-1 items-start"
                      />
                      <div className="flex justify-between items-center text-xs text-muted-foreground mt-auto">
                        <span>{t("courses.instructorPrefix", { name: instructor })}</span>
                        {isTeacherRole(currentUser.role) &&
                          myTeacherId &&
                          String(c.teacherId || c.TeacherId) !== String(myTeacherId) &&
                          relation(currentId) === "none" && (
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
          isStudent={isStudent}
          relation={relation(selectedCourse.id ?? selectedCourse.Id)}
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
              aria-label={t("common.close")}
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
                extras={newExtras}
                onExtrasChange={setNewExtras}
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
