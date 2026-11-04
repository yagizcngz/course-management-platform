import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Search, Wallet, Compass, PlayCircle, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction, i18n } from "i18next";
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { motion, useReducedMotion } from "motion/react";
import { getCourseImage, fetchCategories, API_BASE } from "../components/courseHelpers";
import { CourseDetailModal } from "../components/CourseDetailModal";
import { PublicHeader, Logo } from "../components/PublicHeader";
import { GlobeHero } from "../components/effects/GlobeHero";
import { CountUp, Reveal, SplitHeadline, Stagger, StaggerItem } from "../components/motion";

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

const accentWords = (text: string) =>
  text
    .split(" ")
    .map((w) => `*${w}`)
    .join(" ");

function GuestHomepage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [popularCourses, setPopularCourses] = useState<CourseData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CourseData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    const token = localStorage.getItem("jwt_token");
    if (token) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }

    fetch(`${API_BASE}/api/Dashboard/GuestStats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(console.error);

    fetch(`${API_BASE}/api/Courses/popular?count=4`)
      .then((res) => res.json())
      .then((data) => setPopularCourses(data))
      .catch(console.error);

    fetchCategories().then(setCategories);
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

  const label = (kind: "categories" | "courses", value: string) =>
    i18n.exists(`dynamic.${kind}.${value}`) ? t(`dynamic.${kind}.${value}`) : value;
  const featured = popularCourses[0];
  const steps = [
    { icon: Compass, title: t("guest.step1Title"), desc: t("guest.step1Desc") },
    { icon: Wallet, title: t("guest.step2Title"), desc: t("guest.step2Desc") },
    { icon: PlayCircle, title: t("guest.step3Title"), desc: t("guest.step3Desc") },
  ];
  const marquee = categories.map((c) => label("categories", c));

  return (
    <ReactLenis root options={{ lerp: 0.12 }}>
      <div className="min-h-screen bg-background font-display text-foreground flex flex-col">
        <PublicHeader>
          <Link
            to="/login"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            {t("login.loginButton")}
          </Link>
          <Link
            to="/register"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-[box-shadow,transform] hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--gold)_25%,transparent)] active:scale-[0.97]"
          >
            {t("login.register")}
          </Link>
        </PublicHeader>

        <main className="flex-1 pt-16">
          {/* Hero: the globe stands for the platform, its arcs for students reaching teachers */}
          <section className="relative overflow-hidden border-b border-border">
            <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
              <div className="relative z-10">
                <h1 className="font-serif text-5xl leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
                  <SplitHeadline
                    text={`${t("guest.heroTitle1")} ${accentWords(t("guest.heroTitle2"))}`}
                  />
                </h1>
                <Reveal delay={0.5}>
                  <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {t("guest.heroSubtitle")}
                  </p>
                </Reveal>
                <Reveal delay={0.65}>
                  <form
                    onSubmit={handleSearch}
                    className="relative mt-8 flex max-w-xl items-center"
                  >
                    <Search className="pointer-events-none absolute left-5 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      aria-label={t("guest.searchPlaceholder")}
                      placeholder={t("guest.searchPlaceholder")}
                      className="w-full rounded-full border border-border bg-card py-4 pl-13 pr-32 text-base shadow-soft outline-none transition-[box-shadow,border-color] focus:border-gold focus:ring-4 focus:ring-gold/15"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="absolute bottom-2 right-2 top-2 flex min-w-24 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
                    >
                      {isSearching ? (
                        <span className="animate-pulse">{t("guest.searching")}</span>
                      ) : (
                        t("guest.searchButton")
                      )}
                    </button>
                  </form>
                </Reveal>
                {stats && (
                  <Reveal delay={0.8}>
                    <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex">
                        {["bg-gold-light", "bg-gold", "bg-primary"].map((c, i) => (
                          <span
                            key={c}
                            className={`h-8 w-8 rounded-full border-2 border-background ${c} ${i ? "-ml-2" : ""}`}
                          />
                        ))}
                      </div>
                      <span>{t("guest.learnersNow", { count: stats.totalStudents })}</span>
                    </div>
                  </Reveal>
                )}
              </div>

              <div className="relative hidden h-[460px] lg:block">
                <GlobeHero>
                  {featured && (
                    <motion.button
                      type="button"
                      onClick={() => setSelectedCourse(featured)}
                      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 top-14 w-60 text-left"
                    >
                      <div className="animate-float rounded-2xl border border-border bg-card/85 p-4 shadow-lift backdrop-blur-md transition-colors hover:border-gold/60">
                        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                          {t("guest.featured")}
                        </div>
                        <div className="mt-1 line-clamp-2 font-serif text-xl leading-tight">
                          {label("courses", featured.title)}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate">{label("categories", featured.category)}</span>
                          <span className="font-medium tabular-nums text-foreground">
                            ₺{featured.price}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  )}
                  {stats && (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute bottom-14 right-4"
                    >
                      <div className="animate-float flex items-center gap-3 rounded-2xl border border-border bg-card/85 p-3 pr-5 shadow-lift backdrop-blur-md [animation-delay:-3s]">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-gold-light">
                          <Users className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {t("guest.stats.teachers")}
                          </div>
                          <div className="font-serif text-2xl leading-none tabular-nums">
                            {stats.totalTeachers}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </GlobeHero>
              </div>
            </div>
          </section>

          {/* Real categories scrolling past, alternating outline and fill */}
          {marquee.length > 0 && (
            <section
              aria-label={t("guest.categoriesAria")}
              className="overflow-hidden border-b border-border py-5"
            >
              <div className="flex w-max animate-marquee items-center gap-10 font-serif text-4xl hover:[animation-play-state:paused]">
                {[...marquee, ...marquee].map((c, i) => (
                  <span key={i} className="flex items-center gap-10 whitespace-nowrap">
                    <span
                      className={
                        i % 2
                          ? "text-transparent [-webkit-text-stroke:1px_var(--gold)]"
                          : "text-foreground"
                      }
                    >
                      {c}
                    </span>
                    <span aria-hidden="true" className="text-xl text-gold">
                      ✦
                    </span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* How it works: the gold rule fills as the section comes into view */}
          <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
            <Reveal>
              <h2 className="font-serif text-4xl sm:text-5xl">
                <SplitHeadline text={t("guest.howTitle")} />
              </h2>
            </Reveal>
            <div className="relative mt-10 h-px bg-border">
              <motion.div
                className="absolute inset-y-[-1px] left-0 right-0 origin-left rounded-full bg-gold"
                initial={reduceMotion ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 1 }}
                transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <Stagger className="mt-10 grid gap-10 md:grid-cols-3">
              {steps.map((s, i) => (
                <StaggerItem key={s.title}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border font-serif text-lg">
                      {i + 1}
                    </span>
                    <s.icon className="h-5 w-5 text-gold" />
                  </div>
                  <h3 className="mt-5 font-serif text-2xl">{s.title}</h3>
                  <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
                    {s.desc}
                  </p>
                </StaggerItem>
              ))}
            </Stagger>
          </section>

          {/* Search results or popular courses */}
          <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
            {searchResults.length > 0 ? (
              <>
                <div className="mb-8 flex items-end justify-between gap-4">
                  <h2 className="font-serif text-4xl">{t("guest.searchResults")}</h2>
                  <button
                    onClick={() => setSearchResults([])}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("guest.clearSearch")}
                  </button>
                </div>
                <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {searchResults.map((course, idx) =>
                    renderCourseCard(course, idx, t, setSelectedCourse, i18n),
                  )}
                </Stagger>
              </>
            ) : (
              <>
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <div>
                    <h2 className="font-serif text-4xl sm:text-5xl">{t("guest.popularCourses")}</h2>
                    <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
                      {t("guest.popularCoursesDesc")}
                    </p>
                  </div>
                  <Link
                    to="/login"
                    className="group inline-flex items-center gap-2 text-sm font-medium"
                  >
                    <span className="bg-[linear-gradient(var(--gold),var(--gold))] bg-[length:0_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">
                      {t("guest.viewAllCourses")}
                    </span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
                {popularCourses.length > 0 ? (
                  <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {popularCourses.map((course, idx) =>
                      renderCourseCard(course, idx, t, setSelectedCourse, i18n),
                    )}
                  </Stagger>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-80 animate-pulse rounded-2xl border border-border bg-card"
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {stats && (
            <section className="grid border-y border-border sm:grid-cols-3">
              {[
                [stats.totalStudents, t("guest.stats.students")],
                [stats.totalCourses, t("guest.stats.courses")],
                [stats.totalTeachers, t("guest.stats.teachers")],
              ].map(([value, text], i) => (
                <div
                  key={String(text)}
                  className={`px-6 py-10 sm:px-10 ${i ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}
                >
                  <div className="font-serif text-6xl leading-none">
                    <CountUp value={Number(value)} />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{text}</div>
                </div>
              ))}
            </section>
          )}

          <section className="relative overflow-hidden bg-night px-4 py-24 text-center text-[hsl(40_30%_93%)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 h-80 w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(236_217_166/0.18),transparent)]"
            />
            <Reveal className="relative mx-auto max-w-3xl">
              <h2 className="font-serif text-5xl leading-[1.02] sm:text-6xl">
                {t("guest.ctaTitle")}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-pretty text-[hsl(222_8%_72%)]">
                {t("guest.ctaDesc")}
              </p>
              <Link
                to="/register"
                className="mt-10 inline-flex items-center gap-2 rounded-full bg-gold-light px-8 py-4 font-medium text-[hsl(222_16%_14%)] transition-[box-shadow,transform] hover:shadow-[0_0_0_6px_rgb(236_217_166/0.2)] active:scale-[0.97]"
              >
                {t("guest.ctaButton")} <ArrowRight className="h-5 w-5" />
              </Link>
            </Reveal>
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

        <footer className="border-t border-border py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
            <Logo className="text-xl" />
            <p>
              © {new Date().getFullYear()} {t("guest.footerDesc")}
            </p>
          </div>
        </footer>
      </div>
    </ReactLenis>
  );
}

function renderCourseCard(
  course: CourseData,
  index: number,
  t: TFunction,
  onSelect: (c: CourseData) => void,
  i18n: i18n,
) {
  const imgUrl = getCourseImage(
    course as unknown as import("../components/courseHelpers").CourseData,
    index,
  );
  const title = i18n.exists(`dynamic.courses.${course.title}`)
    ? t(`dynamic.courses.${course.title}`)
    : course.title;

  return (
    <StaggerItem key={course.id}>
      <button
        type="button"
        onClick={() => onSelect(course)}
        className="group card-hover flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-soft"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <img
            src={imgUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/5 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop";
            }}
          />
          <div className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gold backdrop-blur-sm">
            {i18n.exists(`dynamic.categories.${course.category}`)
              ? t(`dynamic.categories.${course.category}`)
              : course.category}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="line-clamp-2 font-serif text-2xl leading-tight">{title}</h3>
          <p className="mt-auto pt-4 text-sm text-muted-foreground">
            {t("guest.instructor")}{" "}
            <span className="font-medium text-foreground">{course.instructor}</span>
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <div className="text-lg font-medium tabular-nums">₺{course.price}</div>
            <span className="flex items-center gap-1 text-sm font-medium text-gold">
              {t("guest.review")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </button>
    </StaggerItem>
  );
}
