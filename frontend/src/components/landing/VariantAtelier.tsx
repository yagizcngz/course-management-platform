import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "motion/react";
import { BookScene, useBookStrings, type BookPage } from "../effects/three/BookScene";
import { CountUp, Reveal, SplitHeadline, Stagger, StaggerItem } from "../motion";
import {
  getCourseImage,
  getTeacherBranches,
  getTeacherFullName,
  resolveImageSrc,
  type CourseData,
  type TeacherLiteDto,
} from "../courseHelpers";
import { getToken } from "../../lib/auth";
import { HeroSearch, ListHeader, ListState, type LandingCourse, type LandingProps } from "./shared";
import { groupByCategory, price } from "./catalog";

const AUTO_TURN_MS = 7000;
const FACULTY_PREVIEW = 9;
const CATEGORY_PREVIEW = 8;
// the book is a showcase, not the catalogue: a few spreads are enough and keep it light
const BOOK_LIMIT = 10;
// the course whose spread holds the ribbon, kept across visits
const RIBBON_KEY = "ekurs_book_ribbon_course";

const accent = (text: string) =>
  text
    .split(" ")
    .map((w) => `*${w}`)
    .join(" ");

/**
 * A — Atelier. The catalogue is a notebook: every spread is a whole course page. The book
 * always shows the top courses; the search filters the course list below the hero.
 */
export function VariantAtelier(p: LandingProps) {
  return (
    <>
      <AtelierHero {...p} />
      <AtelierHow />
      <AtelierCategories {...p} />
      <AtelierCourses {...p} />
      <AtelierTeachers {...p} />
      <AtelierClose stats={p.stats} />
    </>
  );
}

function AtelierHero(p: LandingProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  // the ten most popular courses (the API sorts by enrolment); search never changes them
  const book = (p.courses ?? []).slice(0, BOOK_LIMIT);
  const bookKey = book.map((c) => c.id).join(",");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacted, setInteracted] = useState(0);

  // a new set of pages (first load) opens at its first course
  const [seenKey, setSeenKey] = useState(bookKey);
  if (seenKey !== bookKey) {
    setSeenKey(bookKey);
    setIndex(0);
  }

  useEffect(() => {
    if (reduce || paused || book.length < 2) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % book.length);
    }, AUTO_TURN_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused, book.length, interacted]);

  // each spread is a whole course page: dossier on the left, syllabus and price on the right
  const pages: BookPage[] = useMemo(
    () =>
      book.map((c, i) => {
        const teacher = p.teachers.find((m) => String(m.id ?? m.Id) === String(c.teacherId));
        const photo = teacher?.profilePictureUrl || teacher?.ProfilePictureUrl;
        return {
          key: String(c.id),
          no: i + 1,
          total: book.length,
          title: p.label("courses", c.title),
          category: p.label("categories", c.category),
          subCategory: c.subCategory ? p.label("subCategories", c.subCategory) : undefined,
          level: c.level ? t(`catalog.levels.${c.level}`) : t("catalog.allLevels"),
          description: p.describe(c),
          instructor: c.instructor,
          instructorNote: teacher
            ? getTeacherBranches(teacher)
                .map((b) => p.label("categories", b))
                .join(" · ")
            : undefined,
          instructorBio: teacher?.aboutMe || teacher?.AboutMe || undefined,
          instructorPhoto: photo ? resolveImageSrc(photo) : undefined,
          capacity: c.maxCapacity || undefined,
          lessons: p.outline[c.id] ?? [],
          price: price(c.price),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- label/describe change with language, tracked by t
    [bookKey, t, p.outline, p.teachers],
  );
  const strings = useBookStrings();

  const current: LandingCourse | undefined = book[Math.min(index, book.length - 1)];
  const go = (step: number) => {
    if (!book.length) return;
    setIndex((i) => (i + step + book.length) % book.length);
    setInteracted((n) => n + 1);
  };
  const jump = (n: number) => {
    setIndex(n);
    setInteracted((k) => k + 1);
  };
  // the printed "join" button: straight to the course for a member, to sign-in for a guest
  const join = () => {
    if (!current) return;
    if (getToken()) navigate({ to: "/kurs/$id", params: { id: String(current.id) } });
    else navigate({ to: "/login" });
  };

  // one ribbon for the whole book; first visit marks the most popular course. Read after
  // hydration, since the server has no localStorage.
  const [marked, setMarked] = useState<string | null>(null);
  const firstId = p.courses?.[0]?.id;
  useEffect(() => {
    if (firstId == null) return;
    let id = localStorage.getItem(RIBBON_KEY);
    if (!id) localStorage.setItem(RIBBON_KEY, (id = String(firstId)));
    setMarked(id);
  }, [firstId]);
  // -1 when the marked course is not in the book: no ribbon then
  const ribbonAt = book.findIndex((c) => String(c.id) === marked);
  const mark = () => {
    if (!current) return;
    localStorage.setItem(RIBBON_KEY, String(current.id));
    setMarked(String(current.id));
    setInteracted((k) => k + 1);
  };

  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pb-20 lg:pt-20">
        <div className="flex flex-col lg:justify-center lg:pb-16">
          <h1 className="font-serif text-[clamp(3rem,6.6vw,5.5rem)] leading-[0.95] tracking-tight">
            <SplitHeadline text={`${t("guest.heroTitle1")} ${accent(t("guest.heroTitle2"))}`} />
          </h1>
          <Reveal delay={0.4}>
            <p className="mt-7 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
              {t("guest.heroSubtitle")}
            </p>
          </Reveal>
          <Reveal delay={0.5}>
            <HeroSearch
              p={p}
              className="mt-9 max-w-xl"
              inputClass="rounded-md border border-border bg-card py-4 pl-13 pr-28 text-base transition-[border-color,box-shadow] focus:border-gold focus:ring-4 focus:ring-gold/15"
              buttonClass="absolute inset-y-2 right-2 rounded bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            />
          </Reveal>
        </div>

        <div
          className="flex flex-col"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === "ArrowLeft") go(-1);
            else if (e.key === "ArrowRight") go(1);
            else if (e.key === "Enter") join();
            else return;
            e.preventDefault();
          }}
          tabIndex={0}
          role="group"
          aria-roledescription={t("guest.bookRole")}
          aria-label={t("guest.bookLabel")}
        >
          <div className="mx-auto flex w-full max-w-lg items-baseline justify-between gap-4 border-b border-border pb-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
              {t("guest.bookTop", { count: BOOK_LIMIT })}
            </span>
            <Link
              to="/kurslar"
              search={{ q: p.query.trim() || undefined, category: p.category ?? undefined }}
              className="group inline-flex shrink-0 items-center gap-1.5 text-sm underline decoration-gold decoration-1 underline-offset-4 transition-colors hover:text-gold"
            >
              {t("guest.fullCatalog")}
              {p.courses && ` (${p.courses.length})`}
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <div className="relative h-[320px] sm:h-[460px] lg:h-[540px]">
            <BookScene
              pages={pages}
              index={Math.min(index, Math.max(0, pages.length - 1))}
              strings={strings}
              bookmark={ribbonAt}
              onActivate={current ? join : undefined}
              onTurn={go}
            />
          </div>
          {current ? (
            <div className="mx-auto flex w-full max-w-lg items-center justify-center gap-3">
              {book.length > 1 && (
                <ol
                  aria-label={t("guest.bookPages")}
                  className="flex flex-wrap justify-center gap-1"
                >
                  {book.map((c, n) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => jump(n)}
                        aria-current={n === index ? "page" : undefined}
                        aria-label={`${t("guest.bookGoTo", {
                          no: n + 1,
                          title: p.label("courses", c.title),
                        })}${n === ribbonAt ? ` · ${t("guest.bookmarked")}` : ""}`}
                        className="relative h-7 min-w-8 rounded-full px-1.5 font-mono text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                      >
                        {String(n + 1).padStart(2, "0")}
                        {n === ribbonAt && (
                          <span
                            aria-hidden="true"
                            className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold"
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <button
                type="button"
                onClick={mark}
                aria-pressed={ribbonAt === index}
                title={ribbonAt === index ? t("guest.bookmarked") : t("guest.bookmarkPage")}
                aria-label={ribbonAt === index ? t("guest.bookmarked") : t("guest.bookmarkPage")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground aria-pressed:text-gold"
              >
                <Bookmark
                  aria-hidden="true"
                  className={`h-4 w-4 ${ribbonAt === index ? "fill-current" : ""}`}
                />
              </button>
            </div>
          ) : (
            <p className="mx-auto w-full max-w-lg border-t border-border py-3 text-sm text-muted-foreground">
              {p.courses === null ? t("common.loading") : t("guest.noCourses")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function AtelierHow() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const steps = [1, 2, 3].map((n) => ({
    title: t(`guest.step${n}Title`),
    desc: t(`guest.step${n}Desc`),
  }));
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
      <Reveal>
        <h2 className="font-serif text-5xl leading-none sm:text-6xl lg:sticky lg:top-28">
          <SplitHeadline text={t("guest.howTitle")} />
        </h2>
      </Reveal>
      <div className="relative">
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px origin-left bg-gold"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        />
        <ol>
          {steps.map((s, i) => (
            <li key={i}>
              <Reveal
                delay={i * 0.08}
                className="grid grid-cols-[4.5rem_1fr] gap-x-6 border-b border-border py-8 sm:grid-cols-[6rem_1fr_1.2fr]"
              >
                <span className="row-span-2 font-serif text-6xl leading-none text-gold tabular-nums sm:row-span-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-3xl leading-tight">{s.title}</h3>
                <p className="mt-2 text-pretty leading-relaxed text-muted-foreground sm:mt-1">
                  {s.desc}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function AtelierCourses(p: LandingProps) {
  const { t } = useTranslation();
  return (
    <section id="courses" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pb-24 sm:px-6">
      <div className="mb-10 border-b border-border pb-6">
        <ListHeader
          p={p}
          titleClass="font-serif text-5xl leading-none sm:text-6xl"
          metaClass="mt-4 max-w-2xl text-pretty text-muted-foreground"
          actionClass="shrink-0 self-start text-sm font-medium underline decoration-gold decoration-1 underline-offset-[6px] transition-colors hover:text-gold md:self-auto"
        />
      </div>
      <ListState p={p} className="py-16 text-center text-muted-foreground" />
      {p.list.length > 0 && (
        <Stagger
          key={p.listMode + p.list.length}
          className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
        >
          {p.list.map((course, i) => (
            <StaggerItem key={course.id}>
              <CourseCard
                course={course}
                index={i}
                teachers={p.teachers}
                label={p.label}
                description={p.describe(course)}
                onOpen={p.onOpen}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}

/** A course as a catalogue card: cover, category, price, title, summary and teacher. */
export function CourseCard({
  course,
  index,
  teachers,
  label,
  description,
  onOpen,
  meta,
}: {
  course: LandingCourse;
  index: number;
  teachers: TeacherLiteDto[];
  label: LandingProps["label"];
  description: string;
  onOpen: (course: LandingCourse) => void;
  /** Extra line under the category, such as the level. */
  meta?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(course)}
      className="group flex h-full w-full flex-col text-left"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={getCourseImage(course as unknown as CourseData, index)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover grayscale-[35%] transition-[transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-hover:grayscale-0"
        />
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4 text-[11px] font-medium uppercase tracking-[0.14em]">
        <span className="truncate text-gold">{label("categories", course.category)}</span>
        <span className="shrink-0 text-sm normal-case tracking-normal tabular-nums">
          {price(course.price)}
        </span>
      </div>
      {meta}
      <h3 className="mt-2 line-clamp-2 font-serif text-2xl leading-tight decoration-gold decoration-1 underline-offset-4 group-hover:underline">
        {label("courses", course.title)}
      </h3>
      {description && (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <CardInstructor course={course} teachers={teachers} />
    </button>
  );
}

/** Finds a course's teacher by id, falling back to the instructor name for older courses. */
function teacherOf(course: LandingCourse, teachers: TeacherLiteDto[]) {
  const byId = teachers.find(
    (t) => course.teacherId != null && String(t.id ?? t.Id) === String(course.teacherId),
  );
  const name = course.instructor.trim().toLowerCase();
  return byId ?? teachers.find((t) => getTeacherFullName(t).toLowerCase() === name);
}

export function Portrait({
  teacher,
  name,
  className,
}: {
  teacher?: TeacherLiteDto;
  name: string;
  className: string;
}) {
  const src = teacher?.profilePictureUrl || teacher?.ProfilePictureUrl;
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return src ? (
    <img
      src={resolveImageSrc(src)}
      alt=""
      loading="lazy"
      className={`bg-muted object-cover ${className}`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center bg-secondary font-serif text-foreground ${className}`}
    >
      {initials}
    </span>
  );
}

function CardInstructor({
  course,
  teachers,
}: {
  course: LandingCourse;
  teachers: TeacherLiteDto[];
}) {
  const { t } = useTranslation();
  const teacher = teacherOf(course, teachers);
  const branches = teacher ? getTeacherBranches(teacher) : [];
  return (
    <div className="mt-auto flex items-center gap-3 pt-4">
      <Portrait
        teacher={teacher}
        name={course.instructor}
        className="h-9 w-9 shrink-0 rounded-full text-sm"
      />
      <span className="min-w-0 text-sm leading-tight">
        <span className="block truncate text-foreground">{course.instructor || "—"}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {branches.length
            ? t("guest.teacherOf", {
                branch: branches.map((b) => t(`dynamic.categories.${b}`, b)).join(", "),
              })
            : t("guest.instructor")}
        </span>
      </span>
    </div>
  );
}

/**
 * The largest categories as a ruled index: name, what it covers, how many courses and
 * teachers. Each opens the catalogue filtered to it; the full directory is /kategoriler.
 */
function AtelierCategories(p: LandingProps) {
  const { t } = useTranslation();
  const all = groupByCategory(p.courses ?? [], p.categories);
  if (!all.length) return null;
  const groups = [...all]
    .sort((a, b) => b.courses.length - a.courses.length)
    .slice(0, CATEGORY_PREVIEW);
  return (
    <section id="categories" className="scroll-mt-16 border-y border-border bg-card/40">
      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
        <Reveal className="mb-12 grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:items-end">
          <h2 className="font-serif text-5xl leading-none sm:text-6xl">
            {t("guest.categoriesTitle")}
          </h2>
          <p className="max-w-2xl text-pretty text-muted-foreground">{t("guest.categoriesDesc")}</p>
        </Reveal>
        <ol className="grid gap-x-12 md:grid-cols-2">
          {groups.map((g, i) => {
            const teacherCount = p.teachers.filter((tc) =>
              getTeacherBranches(tc).some((b) => b.toLowerCase() === g.name.toLowerCase()),
            ).length;
            return (
              <li key={g.name} className="border-t border-border">
                <Link
                  to="/kurslar"
                  search={{ category: g.name }}
                  className="group grid w-full grid-cols-[3rem_1fr] gap-x-4 py-6 text-left"
                >
                  <span className="pt-2 font-mono text-xs tabular-nums text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="flex items-baseline justify-between gap-4">
                      <span className="font-serif text-3xl leading-tight decoration-gold decoration-1 underline-offset-4 group-hover:underline">
                        {p.label("categories", g.name)}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold"
                      />
                    </span>
                    <span className="mt-2 block text-pretty text-sm leading-relaxed text-muted-foreground">
                      {t(`dynamic.categoryDescriptions.${g.name}`, "")}
                    </span>
                    <span className="mt-3 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {t("guest.courseCount", { count: g.courses.length })}
                      {teacherCount > 0 && ` · ${t("guest.teacherCount", { count: teacherCount })}`}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <SeeAll to="/kategoriler">{t("guest.allCategoriesLink", { count: all.length })}</SeeAll>
      </div>
    </section>
  );
}

/** Ruled "see all" link that closes a preview section and opens its full page. */
function SeeAll({
  to,
  children,
}: {
  to: "/kurslar" | "/kategoriler" | "/egitmenler";
  children: ReactNode;
}) {
  return (
    <div className="mt-14 flex items-center gap-6">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <Link
        to={to}
        className="group inline-flex items-center gap-2 font-serif text-xl italic decoration-gold underline-offset-4 hover:underline"
      >
        {children}
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 text-gold transition-transform group-hover:translate-x-1"
        />
      </Link>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

/** A few teachers with a short biography and their courses; all of them are on /egitmenler. */
function AtelierTeachers(p: LandingProps) {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map((p.courses ?? []).map((c) => [c.id, c])), [p.courses]);
  // teachers who give courses first; sort is stable, so the API's alphabetical order stays
  const sorted = [...p.teachers].sort(
    (a, b) => Number(!!b.courses?.length) - Number(!!a.courses?.length),
  );
  if (!sorted.length) return null;
  const list = sorted.slice(0, FACULTY_PREVIEW);
  return (
    <section id="teachers" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pb-24 sm:px-6">
      <Reveal className="mb-12 grid gap-6 border-b border-border pb-6 lg:grid-cols-[1fr_1.6fr] lg:items-end">
        <h2 className="font-serif text-5xl leading-none sm:text-6xl">{t("guest.teachersTitle")}</h2>
        <p className="max-w-2xl text-pretty text-muted-foreground">{t("guest.teachersDesc")}</p>
      </Reveal>
      <Stagger className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((teacher) => {
          const name = getTeacherFullName(teacher);
          const branches = getTeacherBranches(teacher);
          const bio = teacher.aboutMe || teacher.AboutMe;
          const courses = (teacher.courses ?? [])
            .map((c) => byId.get(c.id))
            .filter((c): c is LandingCourse => !!c);
          return (
            <StaggerItem key={String(teacher.id ?? teacher.Id)}>
              <article className="flex h-full flex-col">
                <div className="flex items-center gap-4">
                  <Portrait
                    teacher={teacher}
                    name={name}
                    className="h-16 w-16 shrink-0 rounded-full text-xl"
                  />
                  <div className="min-w-0">
                    <h3 className="font-serif text-2xl leading-tight">{name}</h3>
                    {branches.length > 0 && (
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                        {branches.map((b) => p.label("categories", b)).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-4 line-clamp-5 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {bio || t("courseModal.noInstructorBio")}
                </p>
                {courses.length > 0 && (
                  <div className="mt-auto pt-5">
                    <p className="border-t border-border pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {t("guest.teacherCourses")}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {courses.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => p.onOpen(c)}
                            className="flex w-full items-baseline justify-between gap-3 text-left text-sm decoration-gold underline-offset-4 hover:underline"
                          >
                            <span className="truncate">{p.label("courses", c.title)}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {price(c.price)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            </StaggerItem>
          );
        })}
      </Stagger>
      <SeeAll to="/egitmenler">{t("guest.allTeachersLink", { count: sorted.length })}</SeeAll>
    </section>
  );
}

function AtelierClose({ stats }: { stats: LandingProps["stats"] }) {
  const { t } = useTranslation();
  return (
    <>
      {stats && (
        <section className="grid border-y border-border sm:grid-cols-3">
          {(
            [
              [stats.totalStudents, t("guest.stats.students")],
              [stats.totalCourses, t("guest.stats.courses")],
              [stats.totalTeachers, t("guest.stats.teachers")],
            ] as const
          ).map(([value, text], i) => (
            <div
              key={text}
              className={`px-6 py-12 sm:px-10 ${i ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}
            >
              <div className="font-serif text-7xl leading-none">
                <CountUp value={value} />
              </div>
              <div className="mt-3 text-sm text-muted-foreground">{text}</div>
            </div>
          ))}
        </section>
      )}
      <section className="bg-night px-4 py-28 text-[hsl(40_30%_93%)] sm:px-6">
        <Reveal className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-serif text-5xl leading-[1.02] sm:text-7xl">
              {t("guest.ctaTitle")}
            </h2>
            <p className="mt-6 max-w-xl text-pretty text-[hsl(222_8%_72%)]">{t("guest.ctaDesc")}</p>
          </div>
          <Link
            to="/register"
            className="group inline-flex shrink-0 items-center gap-3 self-start rounded-full bg-gold-light px-8 py-4 font-medium text-[hsl(222_16%_14%)] transition-colors hover:bg-[hsl(43_70%_86%)] md:self-auto"
          >
            {t("guest.ctaButton")}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
