import { useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContourScene, type Peak } from "../effects/three/ContourScene";
import { CountUp, Reveal, SplitHeadline } from "../motion";
import { getCourseImage, type CourseData } from "../courseHelpers";
import { CategoryToken, HeroSearch, ListHeader, ListState, type LandingProps } from "./shared";
import { groupByCategory, price } from "./catalog";

const accent = (text: string) =>
  text
    .split(" ")
    .map((w) => `*${w}`)
    .join(" ");

const pad = (n: number) => String(n).padStart(2, "0");

/** Tick marks along a map frame, like the graticule on a survey sheet. */
function Ticks({ side }: { side: "top" | "bottom" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 flex justify-between px-[8%] ${side === "top" ? "top-0" : "bottom-0 items-end"}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`w-px bg-foreground/50 ${i % 2 ? "h-1.5" : "h-3"}`} />
      ))}
    </div>
  );
}

/**
 * C — Survey. The catalogue as a map sheet: categories are summits (height = course count),
 * the search lights the summits that hold matches, and a summit label filters the list.
 */
export function VariantSurvey(p: LandingProps) {
  return (
    <>
      <SurveyHero {...p} />
      <SurveyRoute />
      <SurveyCourses {...p} />
      <SurveyClose stats={p.stats} />
    </>
  );
}

function SurveyHero(p: LandingProps) {
  const { t } = useTranslation();
  const readout = useRef<HTMLSpanElement>(null);
  const groups = useMemo(
    () => groupByCategory(p.courses ?? [], p.categories).slice(0, 8),
    [p.courses, p.categories],
  );
  const searching = p.matches !== null;
  const peaks: Peak[] = useMemo(
    () =>
      groups.map((g) => ({
        name: g.name,
        label: p.label("categories", g.name),
        count: g.courses.length,
        match: g.courses.some((c) => p.matchIds?.has(c.id)),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- label follows the language via t
    [groups, p.matchIds, t],
  );

  return (
    <section className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
      {/* the neatline: a ruled frame with graticule ticks and the sheet's marginalia */}
      <div className="relative overflow-hidden border border-foreground/80">
        <Ticks side="top" />
        <Ticks side="bottom" />

        <div className="pointer-events-none relative grid gap-8 p-5 sm:p-8 lg:static lg:min-h-[calc(100svh-5.5rem)] lg:grid-rows-[auto_1fr_auto] lg:p-10">
          <div className="relative z-10 flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>{t("guest.sheet")} 01 — E-Kurs</span>
            {p.stats && (
              <span className="tabular-nums">
                {p.stats.totalCourses} {t("guest.stats.courses")} · {p.stats.totalTeachers}{" "}
                {t("guest.stats.teachers")} · {p.stats.totalStudents} {t("guest.stats.students")}
              </span>
            )}
          </div>

          <div className="pointer-events-auto relative z-10 max-w-xl self-start lg:self-center">
            <h1 className="font-serif text-[clamp(3rem,7vw,6.5rem)] italic leading-[0.9] tracking-tight">
              <SplitHeadline text={`${t("guest.heroTitle1")} ${accent(t("guest.heroTitle2"))}`} />
            </h1>
            <Reveal delay={0.4}>
              <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                {t("guest.heroSubtitle")}
              </p>
            </Reveal>
            <Reveal delay={0.5}>
              <HeroSearch
                p={p}
                className="mt-8 max-w-lg border border-foreground/80 bg-background"
                inputClass="bg-transparent py-4 pl-13 pr-24 text-base"
                buttonClass="absolute inset-y-0 right-0 border-l border-foreground/80 px-6 text-sm font-medium transition-colors hover:bg-foreground hover:text-background focus-visible:bg-foreground focus-visible:text-background"
                statusClass="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
              />
            </Reveal>
            <Reveal delay={0.6}>
              <CategoryToken
                p={p}
                className="mt-3 border border-gold px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gold transition-colors hover:bg-gold hover:text-background"
              />
            </Reveal>
          </div>

          {/* in flow on small screens; behind the text, right of it, on large ones */}
          <div className="relative -mx-5 h-[360px] sm:-mx-8 sm:h-[440px] lg:absolute lg:inset-y-0 lg:left-[34%] lg:right-0 lg:mx-0 lg:h-auto lg:[mask-image:linear-gradient(to_right,transparent,black_22%)]">
            <ContourScene
              peaks={peaks}
              searching={searching}
              onPick={(name) => p.setCategory(p.category === name ? null : name)}
              readout={readout}
            />
          </div>

          {/* legend block, bottom right, as on a printed sheet */}
          <div className="pointer-events-auto relative z-10 grid gap-4 justify-self-end border border-foreground/80 bg-background p-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground sm:w-80">
            <div className="text-foreground">{t("guest.legend")}</div>
            <ul className="grid gap-1.5">
              <li className="flex items-center gap-3">
                <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-foreground" />
                {t("guest.legendPeak")}
              </li>
              <li className="flex items-center gap-3">
                <span aria-hidden="true" className="h-px w-5 bg-gold" />
                {t("guest.legendMatch")}
              </li>
            </ul>
            <div className="flex items-end justify-between gap-4 border-t border-border pt-3">
              <div aria-hidden="true">
                <div className="flex h-1.5 w-28">
                  <span className="flex-1 bg-foreground" />
                  <span className="flex-1 border border-foreground" />
                  <span className="flex-1 bg-foreground" />
                  <span className="flex-1 border border-foreground" />
                </div>
                <div className="mt-1 flex w-28 justify-between">
                  <span>0</span>
                  <span>{t("guest.scale")}</span>
                </div>
              </div>
              <span ref={readout} aria-hidden="true" className="tabular-nums text-foreground">
                41°10′N 29°02′E
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SurveyRoute() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
      <div className="flex items-baseline justify-between border-b border-foreground/80 pb-4">
        <h2 className="font-serif text-5xl italic leading-none sm:text-6xl">
          <SplitHeadline text={t("guest.howTitle")} />
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {t("guest.route")}
        </span>
      </div>
      {/* a route between three waypoints; the dashed line is the path a learner walks */}
      <ol className="relative mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-[7px] top-0 border-l border-dashed border-foreground/50 md:bottom-auto md:left-0 md:right-0 md:top-[7px] md:border-l-0 md:border-t"
        />
        {[1, 2, 3].map((n) => (
          <li key={n} className="relative pl-10 md:pl-0 md:pt-12">
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 h-[15px] w-[15px] rotate-45 border border-foreground bg-background"
            />
            <Reveal delay={n * 0.08}>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                {t("guest.waypoint")} {pad(n)}
              </span>
              <h3 className="mt-2 font-serif text-3xl leading-tight">{t(`guest.step${n}Title`)}</h3>
              <p className="mt-3 max-w-sm text-pretty leading-relaxed text-muted-foreground">
                {t(`guest.step${n}Desc`)}
              </p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SurveyCourses(p: LandingProps) {
  const { t } = useTranslation();
  return (
    <section id="courses" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pb-24 sm:px-6">
      <div className="border-b border-foreground/80 pb-4">
        <ListHeader
          p={p}
          titleClass="font-serif text-5xl italic leading-none sm:text-6xl"
          metaClass="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
          actionClass="shrink-0 self-start border border-foreground/80 px-4 py-2 text-sm transition-colors hover:bg-foreground hover:text-background md:self-auto"
        />
      </div>
      <ListState p={p} className="py-16 text-center font-mono text-sm text-muted-foreground" />
      {p.list.length > 0 && (
        // hairline grid: cells share their borders like the squares of a map grid
        <ul className="mt-10 grid grid-cols-1 pl-px pt-px sm:grid-cols-2 lg:grid-cols-4">
          {p.list.map((c, i) => (
            <li key={c.id} className="-ml-px -mt-px border border-foreground/80">
              <button
                type="button"
                onClick={() => p.onOpen(c)}
                className="group flex h-full w-full flex-col p-4 text-left transition-colors hover:bg-secondary/60"
              >
                <span className="flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span>
                    {String.fromCharCode(65 + (i % 4))}
                    {Math.floor(i / 4) + 1}
                  </span>
                  <span className="truncate pl-3 text-gold">
                    {p.label("categories", c.category)}
                  </span>
                </span>
                <span className="mt-3 block aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={getCourseImage(c as unknown as CourseData, i)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover grayscale contrast-[1.05] transition-[filter,transform] duration-700 group-hover:scale-[1.03] group-hover:grayscale-0"
                  />
                </span>
                <span className="mt-4 line-clamp-2 font-serif text-2xl leading-tight decoration-gold decoration-1 underline-offset-4 group-hover:underline">
                  {p.label("courses", c.title)}
                </span>
                <span className="mt-auto flex justify-between gap-3 pt-4 font-mono text-[11px] text-muted-foreground">
                  <span className="truncate">{c.instructor}</span>
                  <span className="tabular-nums text-foreground">{price(c.price)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SurveyClose({ stats }: { stats: LandingProps["stats"] }) {
  const { t } = useTranslation();
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6">
      {/* the sheet's title block: figures on the left, the call to action on the right */}
      <div className="grid border border-foreground/80 md:grid-cols-[1fr_1.2fr]">
        {stats && (
          <dl className="grid grid-cols-3 border-b border-foreground/80 md:border-b-0 md:border-r">
            {(
              [
                [stats.totalStudents, t("guest.stats.students")],
                [stats.totalCourses, t("guest.stats.courses")],
                [stats.totalTeachers, t("guest.stats.teachers")],
              ] as const
            ).map(([value, text], i) => (
              <div
                key={text}
                className={`flex flex-col-reverse p-4 sm:p-6 ${i ? "border-l border-foreground/80" : ""}`}
              >
                <dt className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {text}
                </dt>
                <dd className="font-serif text-5xl leading-none sm:text-6xl">
                  <CountUp value={value} />
                </dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex flex-col justify-between gap-8 p-6 sm:p-8">
          <div>
            <h2 className="font-serif text-4xl italic leading-tight sm:text-5xl">
              {t("guest.ctaTitle")}
            </h2>
            <p className="mt-4 max-w-md text-pretty text-muted-foreground">{t("guest.ctaDesc")}</p>
          </div>
          <Link
            to="/register"
            className="group inline-flex items-center justify-between gap-6 self-start border border-foreground/80 bg-foreground px-6 py-3 font-medium text-background transition-colors hover:bg-gold hover:text-foreground"
          >
            {t("guest.ctaButton")}
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
