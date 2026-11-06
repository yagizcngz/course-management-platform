export const API_BASE = "http://localhost:5157";

// --- DİNAMİK KATEGORİ SİSTEMİ ---
// Artık kategoriler backend'den dinamik olarak çekiliyor.
export interface CategoryDto {
  id: number;
  Id?: number;
  name: string;
  Name?: string;
  description?: string;
  Description?: string;
}

/** Category name -> its sub-categories, from the fixed taxonomy the API serves with each category. */
export const fetchSubCategories = async (): Promise<Record<string, string[]>> => {
  try {
    const res = await fetch(`${API_BASE}/api/categories`);
    if (!res.ok) return {};
    const data: { name?: string; Name?: string; subCategories?: string[] }[] = await res.json();
    return Object.fromEntries(data.map((c) => [c.name || c.Name || "", c.subCategories ?? []]));
  } catch {
    return {};
  }
};

export const fetchCategories = async (token?: string): Promise<string[]> => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/categories`, { headers });
    if (!res.ok) return [];
    const data: CategoryDto[] = await res.json();
    return data.map((c) => c.name || c.Name || "");
  } catch (error) {
    console.error("Kategoriler çekilirken hata:", error);
    return [];
  }
};

export interface CourseData {
  id?: string | number;
  Id?: string | number;
  title?: string;
  Title?: string;
  category?: string;
  Category?: string;
  price?: string | number;
  Price?: string | number;
  instructor?: string;
  Instructor?: string;
  // --- YENİ EKLENEN ALANLAR ---
  teacherId?: string | number | null;
  TeacherId?: string | number | null;
  maxCapacity?: string | number;
  MaxCapacity?: string | number;
  image?: string;
  Image?: string;
  imageUrl?: string;
  ImageUrl?: string;
  thumbnail?: string;
  description?: string;
  Description?: string;
  subCategory?: string | null;
  SubCategory?: string | null;
  level?: string | null;
  Level?: string | null;
}

export interface EnrollmentDto {
  id?: string | number;
  Id?: string | number;
  studentFullName?: string;
  StudentFullName?: string;
  studentNumber?: string;
  StudentNumber?: string;
  courseTitle?: string;
  CourseTitle?: string;
  courseId?: string | number;
  CourseId?: string | number;
  course?: CourseData;
  Course?: CourseData;
  enrollmentDate?: string;
  EnrollmentDate?: string;
  status?: string;
  Status?: string;
  /** Only on the student's own list (/api/enrollments/my-courses). */
  progressPercent?: number;
  completedLessons?: number;
  totalLessons?: number;
  completedAt?: string | null;
}

export interface StudentLiteDto {
  name?: string;
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  profilePictureUrl?: string;
  ProfilePictureUrl?: string;
  aboutMe?: string;
  AboutMe?: string;
}

// --- YENİ EKLENEN TİP ---
// /api/teachers'tan dönen öğretmen listesini karşılıyor. Kurs düzenleme formundaki
// öğretmen seçim dropdown'ı ve "Eğitmen Profili" (foto + bio) eşleştirmesi bunu kullanır.
export interface TeacherLiteDto {
  id?: string | number;
  Id?: string | number;
  userId?: string | number;
  UserId?: string | number;
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  email?: string;
  Email?: string;
  branch?: string;
  Branch?: string;
  profilePictureUrl?: string;
  ProfilePictureUrl?: string;
  aboutMe?: string;
  AboutMe?: string;
  /** Only on /api/teachers/public: the courses this teacher gives. */
  courses?: { id: number; title: string; category: string }[];
}

/** A teacher's branches; `Branch` may hold several, comma-separated ("Yazılım, Matematik"). */
export const getTeacherBranches = (t: TeacherLiteDto) =>
  (t.branch || t.Branch || "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

/** Guest-safe teacher list (no e-mail), with each teacher's courses. [] on failure. */
export const fetchPublicTeachers = async (): Promise<TeacherLiteDto[]> => {
  try {
    const res = await fetch(`${API_BASE}/api/teachers/public`);
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
};

export const getTeacherFullName = (t: TeacherLiteDto) =>
  `${t.firstName || t.FirstName || ""} ${t.lastName || t.LastName || ""}`.trim();

// Bir kategoriyle aynı branştaki öğretmenleri döndürür. Branşı boş/tanımsız olan
// öğretmenler hiçbir kategoriyle eşleşmez — önce profillerinden branş seçmeleri gerekir.
export const getTeachersInBranch = (teachers: TeacherLiteDto[], category: string) => {
  const target = category.trim().toLowerCase();
  if (!target) return [];
  return teachers.filter((t) => getTeacherBranches(t).some((b) => b.toLowerCase() === target));
};

export const resolveImageSrc = (url: string) =>
  url.startsWith("http") || url.startsWith("data:") ? url : `${API_BASE}${url}`;

export const getCourseImage = (c: CourseData, index: number) => {
  const explicit = c.imageUrl || c.ImageUrl || c.image || c.Image || c.thumbnail;
  if (explicit) return resolveImageSrc(explicit);
  // the id keeps every course's stock photo distinct and the same on every page
  const id = c.id ?? c.Id;
  const title = (c.title || c.Title || "").toString().trim().toLowerCase().replace(/\s+/g, "-");
  const seed = id != null ? `ekurs-${id}` : title.slice(0, 40) || `ekurs-index-${index}`;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/450`;
};

export const getCourseEnrollments = (course: CourseData, enrollments: EnrollmentDto[]) => {
  const courseId = course.id ?? course.Id;
  const title = (course.title || course.Title || "").trim().toLowerCase();
  return enrollments.filter((e) => {
    const enrCourseId = e.courseId ?? e.CourseId;
    // Id ile eşleşme; enrollment'ta courseId yoksa başlığa düşülür.
    if (enrCourseId != null && courseId != null) {
      return String(enrCourseId) === String(courseId);
    }
    if (!title) return false;
    const enrTitle = (e.courseTitle || e.CourseTitle || "").trim().toLowerCase();
    return enrTitle === title;
  });
};

/** Where a student stands in a course; every view derives it from the enrollment's percent. */
export type CourseStatus = "completed" | "inProgress" | "notStarted";
export const courseStatus = (percent: number | undefined): CourseStatus =>
  (percent ?? 0) >= 100 ? "completed" : (percent ?? 0) > 0 ? "inProgress" : "notStarted";

/** The student's enrollment in a course, whatever id casing the API sent. */
export const findEnrollment = (list: EnrollmentDto[], courseId: unknown) =>
  courseId == null || courseId === ""
    ? undefined
    : list.find(
        (e) =>
          String(e.courseId ?? e.CourseId ?? e.course?.id ?? e.Course?.Id) === String(courseId),
      );
