import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FieldScene, type FieldRow } from "../effects/three/FieldScene";
import { CountUp, Reveal, SplitHeadline } from "../motion";
import { getCourseImage, type CourseData } from "../courseHelpers";
import { HeroSearch, ListHeader, ListState, type LandingProps } from "./shared";
import { groupByCategory, price } from "./catalog";

const accent = (text: string) =>
  text
    .split(" ")
    .map((w) => `*${w}`)
    .join(" ");

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/**
 * B — Index. Graphite, a Swiss grid and mono figures. The hero field is the catalogue
 * drawn as data: rows are the numbered categories beside it, columns are courses.
 */
export function VariantIndex(p: LandingProps) {
  return (
    <>
      <IndexHero {...p} />
      <IndexHow />
      <IndexCourses {...p} />
      <IndexClose stats={p.stats} />
    </>
  );
}

function IndexHero(p: LandingProps) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<string | null>(null);
  const groups = useMemo(
    () => groupByCategory(p.courses ?? [], p.categories).slice(0, 8),
    [p.courses, p.categories],
  );
  const rows: FieldRow[] = useMemo(
    () =>
      groups.map((g) => ({
        name: g.name,
        label: p.label("categories", g.name),
        items: g.courses.slice(0, 8).map((c) => ({
          id: c.id,
          title: p.label("courses", c.title),
          price: c.price,
          priceLabel: price(c.price),
          match: !!p.matchIds?.has(c.id),
        })),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- label follows the language via t
    [groups, p.matchIds, t],
  );
  const prices = (p.courses ?? []).map((c) => c.price);
  const byId = (id: number) => p.courses?.find((c) => c.id === id);

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6">
        <div className="flex justify-between border-b border-border pb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>E-Kurs / {t("guest.indexTitle")}</span>
          {p.courses && (
            <span className="tabular-nums">
              {pad(p.courses.length, 3)} {t("guest.stats.courses")} · {pad(groups.length)}{" "}
              {t("guest.indexTitle")}
            </span>
          )}
        </div>

        <div className="grid gap-10 pt-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:pt-14">
          <div>
            <h1 className="text-[clamp(2.75rem,5.6vw,5.25rem)] font-semibold leading-[0.92] tracking-[-0.045em]">
              <SplitHeadline text={`${t("guest.heroTitle1")} ${accent(t("guest.heroTitle2"))}`} />
            </h1>
            <Reveal delay={0.4}>
              <p className="mt-6 max-w-md text-pretty leading-relaxed text-muted-foreground">
                {t("guest.heroSubtitle")}
              </p>
            </Reveal>
            <Reveal delay={0.5}>
              <HeroSearch
                p={p}
                icon={false}
                className="mt-8 max-w-lg border-b border-foreground/70 focus-within:border-gold"
                inputClass="bg-transparent py-3 pr-20 font-mono text-sm placeholder:text-muted-foreground"
                buttonClass="absolute right-0 font-mono text-xs uppercase tracking-[0.16em] text-gold transition-colors hover:text-foreground"
                statusClass="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
              />
            </Reveal>

            {/* the numbered index: each row here is the row with the same number in the field */}
            {groups.length > 0 && (
              <Reveal delay={0.3} className="mt-10">
                <nav aria-label={t("guest.categoriesAria")} onPointerLeave={() => setHover(null)}>
                  <ol className="border-t border-border">
                    {groups.map((g, i) => {
                      const on = p.category === g.name;
                      return (
                        <li key={g.name}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onPointerEnter={() => setHover(g.name)}
                            onFocus={() => setHover(g.name)}
                            onBlur={() => setHover(null)}
                            onClick={() => p.setCategory(on ? null : g.name)}
                            className={`group grid w-full grid-cols-[3rem_1fr_auto_1.5rem] items-baseline gap-2 border-b border-border py-2.5 text-left transition-colors ${on ? "text-gold" : ""}`}
                          >
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                              {pad(i + 1)}
                            </span>
                            <span className="text-lg transition-colors group-hover:text-gold">
                              {p.label("categories", g.name)}
                            </span>
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                              {pad(g.courses.length)}
                            </span>
                            <ArrowUpRight
                              aria-hidden="true"
                              className={`h-4 w-4 justify-self-end transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${on ? "rotate-45 text-gold" : "text-muted-foreground group-hover:text-gold"}`}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </nav>
              </Reveal>
            )}
          </div>

          <div className="relative min-h-[380px] border-t border-border sm:min-h-[480px] lg:min-h-0 lg:border-l lg:border-t-0">
            <FieldScene
              rows={rows}
              active={hover ?? p.category}
              onPick={(id) => {
                const c = byId(id);
                if (c) p.onOpen(c);
              }}
            />
            {prices.length > 0 && (
              <p className="pointer-events-none absolute bottom-3 left-4 max-w-64 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground lg:left-6">
                {t("guest.fieldLegend", {
                  min: price(Math.min(...prices)),
                  max: price(Math.max(...prices)),
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function IndexHow() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
      <div className="flex items-end justify-between border-b border-foreground/70 pb-4">
        <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          {t("guest.howTitle").replace(/\*/g, "")}
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          03 {t("guest.stepsLabel")}
        </span>
      </div>
      <ol>
        {[1, 2, 3].map((n) => (
          <li key={n}>
            <Reveal
              delay={n * 0.06}
              className="grid gap-x-8 gap-y-2 border-b border-border py-8 md:grid-cols-[8rem_1fr_1.4fr]"
            >
              <span className="font-mono text-sm tabular-nums text-gold">{pad(n)} —</span>
              <h3 className="text-2xl font-semibold tracking-[-0.02em]">
                {t(`guest.step${n}Title`)}
              </h3>
              <p className="max-w-xl text-pretty leading-relaxed text-muted-foreground">
                {t(`guest.step${n}Desc`)}
              </p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

function IndexCourses(p: LandingProps) {
  const { t } = useTranslation();
  return (
    <section id="courses" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pb-24 sm:px-6">
      <div className="border-b border-foreground/70 pb-4">
        <ListHeader
          p={p}
          titleClass="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl"
          metaClass="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
          actionClass="shrink-0 self-start font-mono text-xs uppercase tracking-[0.16em] text-gold transition-colors hover:text-foreground md:self-auto"
        />
      </div>
      <ListState p={p} className="py-16 font-mono text-sm text-muted-foreground" />
      {p.list.length > 0 && (
        <>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[3rem_4.5rem_1fr_10rem_10rem_6rem] gap-4 border-b border-border py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:grid"
          >
            <span>No</span>
            <span />
            <span>{t("guest.colCourse")}</span>
            <span>{t("guest.colCategory")}</span>
            <span>{t("guest.instructor")}</span>
            <span className="text-right">{t("guest.colPrice")}</span>
          </div>
          <ol>
            {p.list.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => p.onOpen(c)}
                  className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-4 border-b border-border py-3 text-left transition-colors hover:bg-secondary/60 md:grid-cols-[3rem_4.5rem_1fr_10rem_10rem_6rem]"
                >
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {pad(i + 1)}
                  </span>
                  <img
                    src={getCourseImage(c as unknown as CourseData, i)}
                    alt=""
                    loading="lazy"
                    className="hidden aspect-[4/3] w-full object-cover grayscale transition-[filter] duration-500 group-hover:grayscale-0 md:block"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-medium transition-colors group-hover:text-gold">
                      {p.label("courses", c.title)}
                    </span>
                    <span className="block truncate font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground md:hidden">
                      {p.label("categories", c.category)} · {c.instructor}
                    </span>
                  </span>
                  <span className="hidden truncate font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground md:block">
                    {p.label("categories", c.category)}
                  </span>
                  <span className="hidden truncate text-sm text-muted-foreground md:block">
                    {c.instructor}
                  </span>
                  <span className="flex items-center justify-end gap-2 font-mono text-sm tabular-nums">
                    {price(c.price)}
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold"
                    />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function IndexClose({ stats }: { stats: LandingProps["stats"] }) {
  const { t } = useTranslation();
  return (
    <>
      {stats && (
        <section className="border-y border-border">
          <dl className="mx-auto grid max-w-7xl px-4 sm:grid-cols-3 sm:px-6">
            {(
              [
                [stats.totalStudents, t("guest.stats.students")],
                [stats.totalCourses, t("guest.stats.courses")],
                [stats.totalTeachers, t("guest.stats.teachers")],
              ] as const
            ).map(([value, text], i) => (
              <div
                key={text}
                className={`flex flex-col-reverse py-10 sm:px-6 ${i ? "border-t border-border sm:border-l sm:border-t-0" : "sm:pl-0"}`}
              >
                <dt className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {pad(i + 1)} / {text}
                </dt>
                <dd className="text-7xl font-semibold tabular-nums tracking-[-0.05em]">
                  <CountUp value={value} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("guest.ctaDesc")}
        </p>
        <Link
          to="/register"
          className="group mt-6 flex items-end justify-between gap-6 border-b border-foreground/70 pb-4 transition-colors hover:border-gold"
        >
          <span className="text-[clamp(2.5rem,7vw,6rem)] font-semibold leading-[0.95] tracking-[-0.045em] transition-colors group-hover:text-gold">
            {t("guest.ctaButton")}
          </span>
          <ArrowRight
            aria-hidden="true"
            className="mb-3 h-10 w-10 shrink-0 transition-transform duration-300 group-hover:translate-x-2 group-hover:text-gold"
          />
        </Link>
      </section>
    </>
  );
}
