import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { API_BASE, fetchCategories } from "../components/courseHelpers";
import { PublicPage } from "../components/PublicPage";
import { CountUp, Reveal, SplitHeadline } from "../components/motion";
import type { GuestStats } from "../components/landing/shared";

export const Route = createFileRoute("/hakkimizda")({
  component: AboutPage,
});

const PRINCIPLES = ["practice", "syllabus", "pace", "support"] as const;
const GUARANTEE = ["topUp", "buy", "refund"] as const;

function AboutPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/Dashboard/GuestStats`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null));
    fetchCategories().then(setCategories);
  }, []);

  return (
    <PublicPage>
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

      {/* call to action */}
      <section className="border-t border-border px-4 py-24 sm:px-6">
        <Reveal className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-2xl font-serif text-5xl leading-[1.02] sm:text-6xl">
            {t("about.ctaTitle")}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/kurslar"
              className="inline-flex items-center rounded-full border border-border px-6 py-3 font-medium transition-colors hover:border-gold"
            >
              {t("about.ctaBrowse")}
            </Link>
            <Link
              to="/egitmenler"
              className="inline-flex items-center rounded-full border border-border px-6 py-3 font-medium transition-colors hover:border-gold"
            >
              {t("about.ctaFaculty")}
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
    </PublicPage>
  );
}
