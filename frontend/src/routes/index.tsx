import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import {
  fetchCategories,
  fetchPublicTeachers,
  API_BASE,
  type CourseData,
  type TeacherLiteDto,
} from "../components/courseHelpers";
import { CourseDetailModal } from "../components/CourseDetailModal";
import { PublicHeader } from "../components/PublicHeader";
import { PublicFooter } from "../components/PublicFooter";
import { matchesQuery } from "../components/landing/catalog";
import {
  type GuestStats,
  type LandingCourse,
  type LandingProps,
  type Variant,
} from "../components/landing/shared";
import { VariantAtelier } from "../components/landing/VariantAtelier";
import { VariantIndex } from "../components/landing/VariantIndex";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { v?: Variant } => ({
    v: search.v === "a" || search.v === "b" ? search.v : undefined,
  }),
  component: GuestHomepage,
});

// Atelier is the production landing page; the Index view stays reachable at `/?v=b`.
const PAGES = { a: VariantAtelier, b: VariantIndex };

/** Fetches JSON and returns null on any failure, so one bad endpoint cannot crash the page. */
async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

function GuestHomepage() {
  const variant: Variant = Route.useSearch().v ?? "a";
  return (
    <ReactLenis root options={{ lerp: 0.12 }}>
      <Landing variant={variant} />
    </ReactLenis>
  );
}

function Landing({ variant }: { variant: Variant }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lenis = useLenis();
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [courses, setCourses] = useState<LandingCourse[] | null>(null);
  const [popular, setPopular] = useState<LandingCourse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<TeacherLiteDto[]>([]);
  const [outline, setOutline] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<LandingCourse | null>(null);

  useEffect(() => {
    if (localStorage.getItem("jwt_token")) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    getJson<GuestStats>(`${API_BASE}/api/Dashboard/GuestStats`).then(setStats);
    // the catalogue is small, so search runs in the browser: instant, and it also
    // matches translated titles, category names and instructors the API search skips
    getJson<LandingCourse[]>(`${API_BASE}/api/Courses`).then((data) =>
      setCourses(Array.isArray(data) ? data : []),
    );
    getJson<LandingCourse[]>(`${API_BASE}/api/Courses/popular?count=4`).then((data) =>
      setPopular(Array.isArray(data) ? data : []),
    );
    fetchCategories().then(setCategories);
    fetchPublicTeachers().then(setTeachers);
    getJson<Record<string, string[]>>(`${API_BASE}/api/lessons/outline`).then(
      (data) => data && setOutline(data),
    );
  }, [navigate]);

  // a link from another page (/#teachers) arrives before its section has data to render;
  // scroll to it once it exists
  const hashDone = useRef(false);
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const el = id ? document.getElementById(id) : null;
    if (hashDone.current || !el) return;
    hashDone.current = true;
    if (lenis) lenis.scrollTo(el, { offset: -64 });
    else el.scrollIntoView();
  }, [courses, teachers, lenis]);

  const label = useCallback(
    (kind: "categories" | "courses", value: string) =>
      i18n.exists(`dynamic.${kind}.${value}`) ? t(`dynamic.${kind}.${value}`) : value,
    [i18n, t],
  );

  // search also reads each course's lesson titles and its teacher's branch and bio
  const extra = useMemo(() => {
    const byTeacher = new Map(
      teachers.map((m) => [
        String(m.id ?? m.Id),
        `${m.branch ?? m.Branch ?? ""} ${m.aboutMe ?? m.AboutMe ?? ""}`,
      ]),
    );
    return (c: LandingCourse) =>
      `${(outline[c.id] ?? []).join(" ")} ${byTeacher.get(String(c.teacherId)) ?? ""}`;
  }, [teachers, outline]);

  const filtering = query.trim() !== "" || category !== null;
  const matches = useMemo(
    () =>
      filtering && courses
        ? courses.filter(
            (c) =>
              (!category || c.category === category) && matchesQuery(c, query, label, extra(c)),
          )
        : null,
    [filtering, courses, category, query, label, extra],
  );
  const matchIds = useMemo(() => (matches ? new Set(matches.map((c) => c.id)) : null), [matches]);
  // when the popular endpoint fails, the first courses stand in
  const popularList = popular.length ? popular : (courses ?? []).slice(0, 4);
  const listMode: LandingProps["listMode"] = matches ? "results" : showAll ? "all" : "popular";
  const list = matches ?? (showAll ? (courses ?? []) : popularList);

  const scrollToCourses = () => {
    const el = document.getElementById("courses");
    if (!el) return;
    // Lenis owns the scroll position; a native smooth scroll would fight its easing
    if (lenis) lenis.scrollTo(el, { offset: -72 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const props: LandingProps = {
    courses,
    popular: popularList,
    categories,
    teachers,
    stats,
    list,
    listMode,
    matches,
    matchIds,
    query,
    setQuery,
    category,
    setCategory,
    onSubmit: (e: FormEvent) => {
      e.preventDefault();
      scrollToCourses();
    },
    scrollToCourses,
    onClear: () => {
      setQuery("");
      setCategory(null);
      setShowAll(false);
    },
    showAll: () => setShowAll(true),
    onOpen: setSelected,
    label,
  };
  const Page = PAGES[variant];

  return (
    <div className="flex min-h-screen flex-col bg-background font-display text-foreground">
      <PublicHeader>
        <Link
          to="/login"
          className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
        >
          {t("login.loginButton")}
        </Link>
        <Link
          to="/register"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.97]"
        >
          {t("login.register")}
        </Link>
      </PublicHeader>

      <main className="flex-1 pt-16">
        <Page {...props} />
      </main>

      {selected && (
        <CourseDetailModal
          course={selected as unknown as CourseData}
          onClose={() => setSelected(null)}
          canManage={false}
          enrollments={[]}
          teachers={teachers}
          categories={[]}
          onSaved={() => setSelected(null)}
          isStudent={false}
          isEnrolled={false}
          onJoin={() => navigate({ to: "/login" })}
        />
      )}

      <PublicFooter />
    </div>
  );
}
