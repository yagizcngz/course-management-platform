import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import {
  API_BASE,
  fetchCategories,
  fetchPublicTeachers,
  getTeacherBranches,
  getTeacherFullName,
  resolveImageSrc,
  type TeacherLiteDto,
} from "../components/courseHelpers";
import { PublicHeader } from "../components/PublicHeader";
import { PublicFooter } from "../components/PublicFooter";
import { CountUp, Reveal, SplitHeadline, Stagger, StaggerItem } from "../components/motion";
import type { GuestStats } from "../components/landing/shared";

export const Route = createFileRoute("/hakkimizda")({
  component: AboutPage,
});

const PRINCIPLES = ["practice", "syllabus", "pace", "support"] as const;
const GUARANTEE = ["topUp", "buy", "refund"] as const;

function AboutPage() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<TeacherLiteDto[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/Dashboard/GuestStats`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null));
    fetchCategories().then(setCategories);
    fetchPublicTeachers().then(setTeachers);
  }, []);

  const label = (value: string) =>
    i18n.exists(`dynamic.categories.${value}`) ? t(`dynamic.categories.${value}`) : value;

  // the instructors with the most courses stand for the faculty
  const faculty = useMemo(
    () =>
      [...teachers].sort((a, b) => (b.courses?.length ?? 0) - (a.courses?.length ?? 0)).slice(0, 6),
    [teachers],
  );
  const courseCount = (name: string) =>
    teachers.reduce((n, tc) => n + (tc.courses ?? []).filter((c) => c.category === name).length, 0);

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
        {/* mission */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:pt-24">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
                {t("about.eyebrow")}
              </p>
              <h1 className="mt-6 font-serif text-[clamp(2.75rem,6vw,5.25rem)] leading-[0.95] tracking-tight">
                <SplitHeadline text={t("about.title")} />
              </h1>
            </div>
            <Reveal delay={0.4} className="self-end">
              <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
                {t("about.mission")}
              </p>
              <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
                {t("about.mission2")}
              </p>
            </Reveal>
          </div>
        </section>

        {/* numbers */}
        <section className="grid border-b border-border sm:grid-cols-4">
          {(
            [
              [stats?.totalCourses, t("guest.stats.courses")],
              [categories.length || undefined, t("about.disciplines")],
              [stats?.totalTeachers, t("guest.stats.teachers")],
              [stats?.totalStudents, t("guest.stats.students")],
            ] as const
          ).map(([value, text], i) => (
            <div
              key={text}
              className={`px-6 py-10 sm:px-8 ${i ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}
            >
              <div className="font-serif text-6xl leading-none">
                {value == null ? "—" : <CountUp value={value} />}
              </div>
              <div className="mt-3 text-sm text-muted-foreground">{text}</div>
            </div>
          ))}
        </section>

        {/* pedagogy */}
        <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <h2 className="font-serif text-5xl leading-none sm:text-6xl lg:sticky lg:top-28">
              <SplitHeadline text={t("about.approachTitle")} />
            </h2>
            <p className="mt-6 max-w-sm text-pretty text-muted-foreground">
              {t("about.approachDesc")}
            </p>
          </Reveal>
          <ol className="border-t border-gold">
            {PRINCIPLES.map((k, i) => (
              <li key={k}>
                <Reveal
                  delay={i * 0.06}
                  className="grid grid-cols-[4.5rem_1fr] gap-x-6 border-b border-border py-8 sm:grid-cols-[6rem_1fr_1.2fr]"
                >
                  <span className="row-span-2 font-serif text-6xl leading-none text-gold tabular-nums sm:row-span-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-serif text-3xl leading-tight">
                    {t(`about.principles.${k}.title`)}
                  </h3>
                  <p className="mt-2 text-pretty leading-relaxed text-muted-foreground sm:mt-1">
                    {t(`about.principles.${k}.desc`)}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* wallet & refund guarantee */}
        <section id="guarantee" className="scroll-mt-16 bg-night text-[hsl(40_30%_93%)]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
            <Reveal className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:items-end">
              <h2 className="font-serif text-5xl leading-none sm:text-6xl">
                {t("about.guaranteeTitle")}
              </h2>
              <p className="max-w-2xl text-pretty text-[hsl(222_8%_72%)]">
                {t("about.guaranteeDesc")}
              </p>
            </Reveal>
            <ol className="mt-14 grid gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10 md:grid-cols-3">
              {GUARANTEE.map((k, i) => (
                <li key={k} className="bg-night p-8">
                  <span className="font-mono text-xs tabular-nums text-gold-light">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-6 font-serif text-3xl leading-tight">
                    {t(`about.guarantee.${k}.title`)}
                  </h3>
                  <p className="mt-3 text-pretty text-sm leading-relaxed text-[hsl(222_8%_72%)]">
                    {t(`about.guarantee.${k}.desc`)}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-8 max-w-3xl text-pretty text-sm text-[hsl(222_8%_62%)]">
              {t("about.guaranteeNote")}
            </p>
          </div>
        </section>

        {/* disciplines */}
        {categories.length > 0 && (
          <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
            <Reveal className="mb-12 grid gap-6 border-b border-border pb-6 lg:grid-cols-[1fr_1.6fr] lg:items-end">
              <h2 className="font-serif text-5xl leading-none sm:text-6xl">
                {t("about.disciplinesTitle")}
              </h2>
              <p className="max-w-2xl text-pretty text-muted-foreground">
                {t("about.disciplinesDesc")}
              </p>
            </Reveal>
            <ol className="grid gap-x-12 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((name, i) => {
                const n = courseCount(name);
                return (
                  <li key={name} className="border-t border-border py-6">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs tabular-nums text-gold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="font-serif text-2xl leading-tight">{label(name)}</h3>
                    </div>
                    <p className="mt-2 line-clamp-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                      {t(`dynamic.categoryDescriptions.${name}`, "")}
                    </p>
                    {n > 0 && (
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {t("guest.courseCount", { count: n })}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* faculty */}
        {faculty.length > 0 && (
          <section id="faculty" className="scroll-mt-16 border-t border-border bg-card/40">
            <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
              <Reveal className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="font-serif text-5xl leading-none sm:text-6xl">
                    {t("about.facultyTitle")}
                  </h2>
                  <p className="mt-6 max-w-2xl text-pretty text-muted-foreground">
                    {t("about.facultyDesc")}
                  </p>
                </div>
                <Link
                  to="/"
                  hash="teachers"
                  className="group inline-flex shrink-0 items-center gap-2 font-serif text-xl italic decoration-gold underline-offset-4 hover:underline"
                >
                  {t("about.facultyAll")}
                  <ArrowRight className="h-4 w-4 text-gold transition-transform group-hover:translate-x-1" />
                </Link>
              </Reveal>
              <Stagger className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {faculty.map((m) => {
                  const name = getTeacherFullName(m);
                  const photo = m.profilePictureUrl || m.ProfilePictureUrl;
                  return (
                    <StaggerItem key={String(m.id ?? m.Id)}>
                      <article className="flex gap-5">
                        {photo ? (
                          <img
                            src={resolveImageSrc(photo)}
                            alt=""
                            loading="lazy"
                            className="h-20 w-20 shrink-0 rounded-full border border-border bg-gold-light object-cover"
                          />
                        ) : (
                          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gold-light font-serif text-2xl text-[hsl(222_16%_14%)]">
                            {name
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-serif text-2xl leading-tight">{name}</h3>
                          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                            {getTeacherBranches(m).map(label).join(" · ")}
                          </p>
                          <p className="mt-3 line-clamp-4 text-pretty text-sm leading-relaxed text-muted-foreground">
                            {m.aboutMe || m.AboutMe}
                          </p>
                        </div>
                      </article>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </div>
          </section>
        )}

        {/* call to action */}
        <section className="border-t border-border px-4 py-24 sm:px-6">
          <Reveal className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <h2 className="max-w-2xl font-serif text-5xl leading-[1.02] sm:text-6xl">
              {t("about.ctaTitle")}
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/"
                hash="courses"
                className="inline-flex items-center rounded-full border border-border px-6 py-3 font-medium transition-colors hover:border-gold"
              >
                {t("about.ctaBrowse")}
              </Link>
              <Link
                to="/register"
                className="group inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("guest.ctaButton")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
