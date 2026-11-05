import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { API_BASE } from "../components/courseHelpers";
import { GuestCourseModal, PublicPage } from "../components/PublicPage";
import { matchesQuery } from "../components/landing/catalog";
import {
  type GuestStats,
  type LandingCourse,
  type LandingProps,
  type Variant,
} from "../components/landing/shared";
import { getJson, usePublicCatalog } from "../components/landing/usePublicCatalog";
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
  const lenis = useLenis();
  const { courses, categories, teachers, label, describe, extra } = usePublicCatalog();
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [popular, setPopular] = useState<LandingCourse[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<LandingCourse | null>(null);

  useEffect(() => {
    if (localStorage.getItem("jwt_token")) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    getJson<GuestStats>(`${API_BASE}/api/Dashboard/GuestStats`).then(setStats);
    getJson<LandingCourse[]>(`${API_BASE}/api/Courses/popular?count=4`).then((data) =>
      setPopular(Array.isArray(data) ? data : []),
    );
  }, [navigate]);

  // a link from another page (/#courses) arrives before its section has data to render;
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

  // the catalogue is small, so search runs in the browser: instant, and it also
  // matches translated titles, category names and instructors the API search skips
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
  const listMode: LandingProps["listMode"] = matches ? "results" : "popular";
  const list = matches ?? popularList;

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
    },
    onOpen: setSelected,
    label,
    describe,
  };
  const Page = PAGES[variant];

  return (
    <PublicPage>
      <Page {...props} />
      <GuestCourseModal course={selected} teachers={teachers} onClose={() => setSelected(null)} />
    </PublicPage>
  );
}
