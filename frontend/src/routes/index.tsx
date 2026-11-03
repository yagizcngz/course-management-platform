import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  UserCheck,
  Search,
  ArrowRight,
  PlayCircle,
  Star,
  Moon,
  Sun,
  Globe,
  Eye,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction, i18n } from "i18next";
import { getCourseImage } from "../components/courseHelpers";
import { CourseDetailModal } from "../components/CourseDetailModal";

import { API_BASE } from "@/components/courseHelpers";
export const Route = createFileRoute("/")({
  component: GuestHomepage,
});

interface GuestStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
}

interface CourseData {
  id: number;
  title: string;
  category: string;
  instructor: string;
  price: number;
  imageUrl: string;
  enrollments: unknown[];
}

function GuestHomepage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [popularCourses, setPopularCourses] = useState<CourseData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CourseData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    let dark: boolean;
    if (saved === "dark") dark = true;
    else if (saved === "light") dark = false;
    else dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem("i18nextLng", newLang);
  };

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    const token = localStorage.getItem("jwt_token");
    if (token) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }

    // Fetch Guest Stats
    fetch(`${API_BASE}/api/Dashboard/GuestStats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(console.error);

    // Fetch Popular Courses
    fetch(`${API_BASE}/api/Courses/popular?count=4`)
      .then((res) => res.json())
      .then((data) => setPopularCourses(data))
      .catch(console.error);
  }, [navigate]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/Courses?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-display text-slate-900 dark:text-slate-50 transition-colors duration-300 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-black dark:bg-zinc-800 p-2 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">E-Kurs</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 rounded-full px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <Globe className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-bold uppercase">{i18n.language}</span>
              </button>
              {langMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden flex flex-col w-20 z-50">
                  <button
                    onClick={() => {
                      i18n.changeLanguage("tr");
                      localStorage.setItem("i18nextLng", "tr");
                      setLangMenuOpen(false);
                    }}
                    className={`px-4 py-2 text-sm font-bold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors ${
                      i18n.language === "tr" ? "text-indigo-600 dark:text-indigo-400" : ""
                    }`}
                  >
                    TR
                  </button>
                  <button
                    onClick={() => {
                      i18n.changeLanguage("en");
                      localStorage.setItem("i18nextLng", "en");
                      setLangMenuOpen(false);
                    }}
                    className={`px-4 py-2 text-sm font-bold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors ${
                      i18n.language === "en" ? "text-indigo-600 dark:text-indigo-400" : ""
                    }`}
                  >
                    EN
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link
              to="/login"
              className="text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hidden sm:block"
            >
              {t("login.loginButton")}
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-full transition-all shadow-md hover:shadow-lg ml-2"
            >
              {t("login.register")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-32">
          {/* Background decorations */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-indigo-500/10 dark:bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute top-20 right-20 w-100 h-100 bg-purple-500/10 dark:bg-purple-500/20 blur-[80px] rounded-full pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
            <h1
              className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight animate-fade-in-up"
              style={{ animationDelay: "100ms" }}
            >
              {t("guest.heroTitle1")}{" "}
              <span className="text-black dark:text-white">{t("guest.heroTitle2")}</span>
            </h1>

            <p
              className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto animate-fade-in-up"
              style={{ animationDelay: "200ms" }}
            >
              {t("guest.heroSubtitle")}
            </p>

            {/* Search Bar */}
            <div
              className="max-w-2xl mx-auto mb-8 animate-fade-in-up"
              style={{ animationDelay: "300ms" }}
            >
              <form onSubmit={handleSearch} className="relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t("guest.searchPlaceholder")}
                  className="w-full pl-12 pr-32 py-4 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 bottom-2 bg-black hover:bg-zinc-800 text-white px-6 rounded-full font-medium transition-colors flex items-center justify-center min-w-25"
                >
                  {isSearching ? (
                    <span className="animate-pulse">{t("guest.searching")}</span>
                  ) : (
                    t("guest.searchButton")
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white dark:bg-zinc-900 border-y border-slate-200 dark:border-zinc-800">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-zinc-800">
              <div className="p-6">
                <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-4xl font-extrabold mb-2">
                  {stats ? stats.totalStudents : "..."}
                </div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("guest.stats.students", "Kayıtlı Öğrenci")}
                </div>
              </div>
              <div className="p-6">
                <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="text-4xl font-extrabold mb-2">
                  {stats ? stats.totalCourses : "..."}
                </div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("guest.stats.courses", "Aktif Kurs")}
                </div>
              </div>
              <div className="p-6">
                <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div className="text-4xl font-extrabold mb-2">
                  {stats ? stats.totalTeachers : "..."}
                </div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("guest.stats.teachers", "Uzman Eğitmen")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search Results OR Popular Courses */}
        <section className="py-24 bg-slate-50 dark:bg-zinc-950">
          <div className="container mx-auto px-6">
            {searchResults.length > 0 ? (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold">
                    {t("guest.searchResults", "Arama Sonuçları")}
                  </h2>
                  <button
                    onClick={() => setSearchResults([])}
                    className="text-sm text-slate-500 hover:text-indigo-600"
                  >
                    {t("guest.clearSearch", "Aramayı Temizle")}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {searchResults.map((course, idx) =>
                    renderCourseCard(course, idx, t, setSelectedCourse, i18n),
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                      <Star className="h-6 w-6 text-yellow-400" fill="currentColor" />
                      {t("guest.popularCourses")}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
                      {t(
                        "guest.popularCoursesDesc",
                        "Öğrencilerimiz tarafından en çok ilgi gören ve yüksek puan alan popüler kurslarımızı keşfedin.",
                      )}
                    </p>
                  </div>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-black dark:text-white font-medium hover:underline"
                  >
                    {t("guest.viewAllCourses", "Tüm Kursları Gör")}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {popularCourses.length > 0
                    ? popularCourses.map((course, idx) =>
                        renderCourseCard(course, idx, t, setSelectedCourse, i18n),
                      )
                    : Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="animate-pulse bg-white dark:bg-zinc-900 rounded-2xl h-72 border border-slate-200 dark:border-zinc-800"
                        />
                      ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 bg-black dark:bg-zinc-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-125 h-125 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-125 h-125 bg-white/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3" />

          <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t("guest.ctaTitle", "Öğrenme Yolculuğuna Hemen Başla")}
            </h2>
            <p className="text-slate-300 text-lg mb-10">
              {t(
                "guest.ctaDesc",
                "Bugün platformumuza katıl, hayallerindeki kariyere giden yolda ilk adımı at. Ücretsiz kayıt olabilir ve dilediğin kursu seçebilirsin.",
              )}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-slate-200 font-bold rounded-full transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
              >
                {t("guest.ctaButton", "Hemen Ücretsiz Kayıt Ol")} <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {selectedCourse && (
          <CourseDetailModal
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
            canManage={false}
            enrollments={[]}
            teachers={[]}
            categories={[]}
            onSaved={() => {}}
            isStudent={false}
            isEnrolled={false}
            onJoin={() => navigate({ to: "/login" })}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 py-12">
        <div className="container mx-auto px-6 text-center text-slate-500 dark:text-slate-400 text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-5 w-5" />
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
              {t("guest.footerTitle", "E-Kurs Platformu")}
            </span>
          </div>
          <p>
            © {new Date().getFullYear()} {t("guest.footerDesc", "E-Kurs Tüm Hakları Saklıdır.")}
          </p>
        </div>
      </footer>
    </div>
  );
}

// Helper to render a course card aesthetically

function renderCourseCard(
  course: CourseData,
  index: number,
  t: TFunction,
  onSelect: (c: CourseData) => void,
  i18n: i18n,
) {
  // Use a fallback or the provided image URL (make sure it's valid)
  const imgUrl = getCourseImage(
    course as unknown as import("../components/courseHelpers").CourseData,
    index,
  );

  return (
    <div
      key={course.id}
      className="group bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-zinc-800">
        <img
          src={imgUrl}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop";
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={() => onSelect(course)}
            className="bg-white/20 backdrop-blur-sm text-white rounded-full p-3 hover:bg-white/30 transition-colors cursor-pointer"
          >
            <Eye className="h-6 w-6" />
          </button>
        </div>
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-slate-900 dark:text-white shadow-sm uppercase tracking-wider">
          {i18n.exists(`dynamic.categories.${course.category}`)
            ? t(`dynamic.categories.${course.category}`)
            : course.category}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {i18n.exists(`dynamic.courses.${course.title}`)
            ? t(`dynamic.courses.${course.title}`)
            : course.title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 mt-auto">
          {t("guest.instructor", "Eğitmen:")}{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {course.instructor}
          </span>
        </p>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
          <div className="font-bold text-lg text-slate-900 dark:text-white">₺{course.price}</div>
          <Link
            to="/login"
            className="text-sm font-medium text-black dark:text-white hover:underline flex items-center gap-1"
          >
            {t("guest.review", "İncele")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
