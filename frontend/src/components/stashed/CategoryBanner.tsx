/*
 * STASHED, not in use. Until 2026-11-07 the logged-in catalogue (/katalog) drew this banner above
 * the course grid whenever a category filter was on. It was taken out because a category with many
 * courses crowds the scene (one peak, orbit, bar or page per course) and the three.js/canvas scene
 * cost a lot of rendering next to the grid. The catalogue now shows the curated rows of
 * components/CourseShowcase.tsx instead.
 *
 * How it works: KIND maps a category to a scene (map summits for Coğrafya, orbiting planets for
 * Fen Bilimleri, a bar field for Yazılım/Matematik/Veri Bilimi/Ekonomi, a turning book for the
 * rest). Each scene plots that category's courses; arrows or a click on a course call onOpen.
 * three.js is imported lazily inside effects/three/useThreeScene.ts, so the bundle only grows when
 * the banner is rendered.
 *
 * To bring it back, in routes/_authenticated.katalog.tsx above the course grid:
 *   import { CategoryBanner } from "@/components/stashed/CategoryBanner";
 *   {selectedCategory && !isLoading && (
 *     <CategoryBanner
 *       key={selectedCategory}
 *       category={selectedCategory}
 *       courses={dbCourses.filter((c) => (c.category || c.Category) === selectedCategory)}
 *       onOpen={setSelectedCourse}
 *     />
 *   )}
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CourseData } from "../courseHelpers";
import { ContourScene, type Peak } from "../effects/three/ContourScene";
import { FieldScene, type FieldRow } from "../effects/three/FieldScene";
import { BookScene, useBookStrings, type BookPage } from "../effects/three/BookScene";
import { SolarSystem } from "../effects/SolarSystem";
import { price as formatPrice } from "../landing/catalog";

type Kind = "map" | "sky" | "field" | "book";

/** Which scene a category gets; categories not listed get the book. */
const KIND: Record<string, Kind> = {
  Coğrafya: "map",
  "Fen Bilimleri": "sky",
  Yazılım: "field",
  Matematik: "field",
  "Veri Bilimi & Yapay Zeka": "field",
  "Ekonomi & Finans": "field",
};

const idOf = (c: CourseData) => Number(c.id ?? c.Id);
const priceOf = (c: CourseData) => Number(c.price ?? c.Price ?? 0);

/**
 * The header of a filtered course list: a scene that draws that category's courses
 * (map summits for Coğrafya, orbits for Fen Bilimleri, a bar field for Yazılım and
 * Matematik, a turning book otherwise). Clicking a course in the scene opens it.
 */
export function CategoryBanner({
  category,
  courses,
  onOpen,
}: {
  category: string;
  courses: CourseData[];
  onOpen: (course: CourseData) => void;
}) {
  const { t, i18n } = useTranslation();
  const kind = KIND[category] ?? "book";
  const name = i18n.exists(`dynamic.categories.${category}`)
    ? t(`dynamic.categories.${category}`)
    : category;
  const courseTitle = useCallback(
    (c: CourseData) => {
      const raw = c.title || c.Title || "";
      return i18n.exists(`dynamic.courses.${raw}`) ? t(`dynamic.courses.${raw}`) : raw;
    },
    [i18n, t],
  );
  const byId = (id: number) => courses.find((c) => idOf(c) === id);
  const dark = kind === "sky"; // the orbit canvas is drawn for a night panel

  return (
    <section
      aria-label={name}
      className={`relative mb-8 overflow-hidden rounded-md border border-border ${dark ? "bg-night text-[hsl(40_30%_93%)]" : "bg-card"}`}
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="relative z-10 flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div>
            <p
              className={`font-mono text-[10px] uppercase tracking-[0.2em] ${dark ? "text-gold-light" : "text-gold"}`}
            >
              {t(`courses.banner.${kind}`)}
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-none sm:text-5xl">{name}</h2>
            <p
              className={`mt-4 max-w-md text-pretty text-sm leading-relaxed ${dark ? "text-[hsl(222_8%_72%)]" : "text-muted-foreground"}`}
            >
              {t(`dynamic.categoryDescriptions.${category}`, "")}
            </p>
          </div>
          <p
            className={`font-mono text-[11px] uppercase tracking-[0.14em] ${dark ? "text-[hsl(222_8%_72%)]" : "text-muted-foreground"}`}
          >
            {t("guest.courseCount", { count: courses.length })} · {t("courses.banner.hint")}
          </p>
        </div>
        <div className="relative h-[300px] sm:h-[340px]">
          {courses.length === 0 ? null : kind === "map" ? (
            <MapScene courses={courses} title={courseTitle} onOpen={(id) => onOpenId(id)} />
          ) : kind === "sky" ? (
            <SolarSystem categories={courses.slice(0, 8).map(courseTitle)} />
          ) : kind === "field" ? (
            <Field
              name={name}
              courses={courses}
              title={courseTitle}
              onOpen={(id) => onOpenId(id)}
            />
          ) : (
            <Book category={name} courses={courses} title={courseTitle} onOpen={onOpen} />
          )}
        </div>
      </div>
      {kind === "sky" && (
        // the orbits are not clickable, so the courses they name are listed as links
        <ul className="relative z-10 flex flex-wrap gap-2 border-t border-white/10 px-6 py-4 sm:px-8">
          {courses.map((c) => (
            <li key={idOf(c)}>
              <button
                type="button"
                onClick={() => onOpen(c)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs transition-colors hover:border-gold-light hover:text-gold-light"
              >
                {courseTitle(c)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  function onOpenId(id: number) {
    const c = byId(id);
    if (c) onOpen(c);
  }
}

function MapScene({
  courses,
  title,
  onOpen,
}: {
  courses: CourseData[];
  title: (c: CourseData) => string;
  onOpen: (id: number) => void;
}) {
  const readout = useRef<HTMLSpanElement>(null);
  const peaks: Peak[] = useMemo(() => {
    const list = courses.slice(0, 8);
    const prices = list.map(priceOf);
    const min = Math.min(...prices);
    const span = Math.max(...prices) - min || 1;
    // summit height follows price; the tag names the course and its price
    return list.map((c) => ({
      name: String(idOf(c)),
      label: title(c),
      count: 1 + Math.round(((priceOf(c) - min) / span) * 4),
      meta: formatPrice(priceOf(c)),
      match: false,
    }));
  }, [courses, title]);
  return (
    <>
      <ContourScene
        peaks={peaks}
        searching={false}
        onPick={(id) => onOpen(Number(id))}
        readout={readout}
      />
      <span
        ref={readout}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-4 font-mono text-[10px] uppercase tabular-nums tracking-[0.14em] text-muted-foreground"
      >
        41°10′N 29°02′E
      </span>
    </>
  );
}

function Field({
  name,
  courses,
  title,
  onOpen,
}: {
  name: string;
  courses: CourseData[];
  title: (c: CourseData) => string;
  onOpen: (id: number) => void;
}) {
  // one category, so its courses are folded into rows of four
  const rows: FieldRow[] = useMemo(() => {
    const out: FieldRow[] = [];
    for (let i = 0; i < Math.min(courses.length, 32); i += 4)
      out.push({
        name: String(i),
        label: name,
        items: courses.slice(i, i + 4).map((c) => ({
          id: idOf(c),
          title: title(c),
          price: priceOf(c),
          priceLabel: formatPrice(priceOf(c)),
          match: false,
        })),
      });
    return out;
  }, [courses, name, title]);
  return <FieldScene rows={rows} active={null} onPick={onOpen} />;
}

function Book({
  category,
  courses,
  title,
  onOpen,
}: {
  category: string;
  courses: CourseData[];
  title: (c: CourseData) => string;
  onOpen: (c: CourseData) => void;
}) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const i = Math.min(index, courses.length - 1);
  const pages: BookPage[] = useMemo(
    () =>
      courses.map((c, n) => ({
        key: String(idOf(c)),
        no: n + 1,
        total: courses.length,
        title: title(c),
        category,
        instructor: c.instructor || c.Instructor || "",
        subCategory: (c.subCategory ?? c.SubCategory) || undefined,
        level: (c.level ?? c.Level) ? t(`catalog.levels.${c.level ?? c.Level}`) : undefined,
        description: c.description || c.Description,
        capacity: Number(c.maxCapacity ?? c.MaxCapacity) || undefined,
        price: formatPrice(priceOf(c)),
      })),
    [courses, category, title, t],
  );
  const strings = useBookStrings();
  const go = (step: number) => setIndex((n) => (n + step + courses.length) % courses.length);
  return (
    <>
      <BookScene
        pages={pages}
        index={i}
        strings={strings}
        onActivate={() => onOpen(courses[i])}
        onTurn={courses.length > 1 ? go : undefined}
      />
      {courses.length > 1 && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("guest.prevCourse")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="min-w-12 text-center font-mono text-xs tabular-nums text-muted-foreground">
            {i + 1} / {courses.length}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("guest.nextCourse")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
