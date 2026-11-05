import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { GuestCourseModal, PageIntro, PublicPage } from "../components/PublicPage";
import { Reveal } from "../components/motion";
import { CategoryMotif } from "../components/landing/CategoryMotif";
import { groupByCategory, price } from "../components/landing/catalog";
import { usePublicCatalog } from "../components/landing/usePublicCatalog";
import type { LandingCourse } from "../components/landing/shared";
import { getTeacherBranches } from "../components/courseHelpers";

export const Route = createFileRoute("/kategoriler")({
  head: () => ({
    meta: [
      { title: "Kategoriler — E-Kurs" },
      {
        name: "description",
        content: "E-Kurs'taki tüm alanlar, kapsamları, kursları ve eğitmenleri.",
      },
    ],
  }),
  component: CategoriesDirectory,
});

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const SAMPLE = 3;

/** Every discipline: what it covers, how deep it goes, who teaches it and a few of its courses. */
function CategoriesDirectory() {
  const { t } = useTranslation();
  const { courses, categories, teachers, label } = usePublicCatalog();
  const [selected, setSelected] = useState<LandingCourse | null>(null);
  const groups = groupByCategory(courses ?? [], categories);

  return (
    <PublicPage>
      <PageIntro
        eyebrow={t("directory.eyebrow")}
        title={t("directory.title")}
        lead={t("directory.lead")}
      >
        {groups.length > 0 && (
          <nav aria-label={t("directory.jump")} className="mt-10 flex flex-wrap gap-x-5 gap-y-2">
            {groups.map((g) => (
              <a
                key={g.name}
                href={`#${slug(g.name)}`}
                className="text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-gold"
              >
                {label("categories", g.name)}
              </a>
            ))}
          </nav>
        )}
      </PageIntro>

      <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6">
        {courses === null && (
          <p role="status" className="py-24 text-center text-muted-foreground">
            {t("common.loading")}
          </p>
        )}
        <ol>
          {groups.map((g, i) => {
            const teacherCount = teachers.filter((tc) =>
              getTeacherBranches(tc).some((b) => b.toLowerCase() === g.name.toLowerCase()),
            ).length;
            const levels = LEVELS.map(
              (lv) => [lv, g.courses.filter((c) => c.level === lv).length] as const,
            ).filter(([, n]) => n > 0);
            const subs = [
              ...g.courses.reduce(
                (m, c) =>
                  c.subCategory ? m.set(c.subCategory, (m.get(c.subCategory) ?? 0) + 1) : m,
                new Map<string, number>(),
              ),
            ].sort((a, b) => b[1] - a[1]);
            return (
              <li key={g.name} id={slug(g.name)} className="scroll-mt-20 border-b border-border">
                <Reveal className="grid gap-8 py-12 lg:grid-cols-[3rem_14rem_1fr_1fr] lg:gap-10">
                  <span className="font-mono text-xs tabular-nums text-gold lg:pt-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <CategoryMotif
                    name={g.name}
                    className="h-28 w-full max-w-[14rem] text-gold lg:h-32"
                  />
                  <div>
                    <h2 className="font-serif text-4xl leading-tight">
                      {label("categories", g.name)}
                    </h2>
                    <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                      {t(`dynamic.categoryDescriptions.${g.name}`, "")}
                    </p>
                    <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {t("guest.courseCount", { count: g.courses.length })}
                      {teacherCount > 0 && ` · ${t("guest.teacherCount", { count: teacherCount })}`}
                    </p>
                    {levels.length > 0 && (
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {levels.map(([lv, n]) => `${n} ${t(`catalog.levels.${lv}`)}`).join(" · ")}
                      </p>
                    )}
                    {subs.length > 0 && (
                      <ul
                        aria-label={t("directory.subCategories")}
                        className="mt-5 flex flex-wrap gap-2"
                      >
                        {subs.map(([sub, n]) => (
                          <li key={sub}>
                            <Link
                              to="/kurslar"
                              search={{ category: g.name, subCategory: sub }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
                            >
                              {label("subCategories", sub)}
                              <span className="font-mono text-[11px] tabular-nums opacity-70">
                                {n}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <p className="border-b border-foreground/70 pb-2 font-serif text-lg italic">
                      {t("directory.sample")}
                    </p>
                    <ul>
                      {g.courses.slice(0, SAMPLE).map((c) => (
                        <li key={c.id} className="border-b border-border">
                          <button
                            type="button"
                            onClick={() => setSelected(c)}
                            className="group flex w-full items-baseline justify-between gap-4 py-2.5 text-left"
                          >
                            <span className="decoration-gold underline-offset-4 group-hover:underline">
                              {label("courses", c.title)}
                            </span>
                            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                              {price(c.price)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/kurslar"
                      search={{ category: g.name }}
                      className="group mt-4 inline-flex items-center gap-2 self-start text-sm font-medium underline decoration-gold underline-offset-[6px] transition-colors hover:text-gold"
                    >
                      {t("directory.seeCourses", { count: g.courses.length })}
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>

      <GuestCourseModal course={selected} teachers={teachers} onClose={() => setSelected(null)} />
    </PublicPage>
  );
}

/** URL-safe anchor for a category name ("Türk Dili ve Edebiyatı" → "turk-dili-ve-edebiyati"). */
const slug = (name: string) =>
  name
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
