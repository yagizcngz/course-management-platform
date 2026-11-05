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

  const titleRaw = (c.title || c.Title || "").toString();
  const categoryRaw = (c.category || c.Category || "").toString();
  const titleLower = (titleRaw + " " + categoryRaw).toLowerCase();

  const mappingSeeds: { keywords: string[]; seed: string }[] = [
    { keywords: ["matematik", "mat"], seed: "mathematics" },
    { keywords: ["fizik"], seed: "physics" },
    { keywords: ["kimya"], seed: "chemistry" },
    { keywords: ["biyoloji", "molekul", "biyo"], seed: "biology" },
    { keywords: ["react", "frontend", "javascript", "typescript"], seed: "programming" },
    { keywords: ["c#", "csharp", "dotnet", "backend"], seed: "code" },
    { keywords: ["coğrafya", "jeomorfoloji", "harita", "cbs"], seed: "geography" },
    { keywords: ["tarih"], seed: "history" },
    { keywords: ["sanat", "tasar", "tasarım"], seed: "art" },
    { keywords: ["ekonomi"], seed: "economics" },
    { keywords: ["psikoloji"], seed: "psychology" },
    { keywords: ["spor", "yoga"], seed: "fitness" },
  ];

  for (const m of mappingSeeds) {
    for (const kw of m.keywords) {
      if (titleLower.includes(kw)) {
        return `https://picsum.photos/seed/${encodeURIComponent(m.seed)}/800/450`;
      }
    }
  }

  const fallbackPool = [
    "education",
    "books",
    "city",
    "nature",
    "technology",
    "abstract",
    "coffee",
    "architecture",
    "ocean",
    "mountains",
  ];
  const titleSeed = titleRaw.trim()
    ? titleRaw.trim().slice(0, 40)
    : fallbackPool[index % fallbackPool.length];
  const seed = encodeURIComponent(titleSeed.replace(/\s+/g, "-").toLowerCase());
  return `https://picsum.photos/seed/${seed}/800/450`;
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
