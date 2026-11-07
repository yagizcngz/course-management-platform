import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { GuestCourseModal, PageIntro, PublicPage } from "../components/PublicPage";
import { ProfileModal, type ProfileTarget } from "../components/ProfileModal";
import { Stagger, StaggerItem } from "../components/motion";
import { Portrait } from "../components/landing/VariantAtelier";
import { price } from "../components/landing/catalog";
import { matchesSearch } from "@/lib/search";
import { usePublicCatalog } from "../components/landing/usePublicCatalog";
import type { LandingCourse, LandingProps } from "../components/landing/shared";
import {
  getTeacherBranches,
  getTeacherFullName,
  type TeacherLiteDto,
} from "../components/courseHelpers";

interface FacultySearch {
  q?: string;
  branch?: string;
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : undefined;

export const Route = createFileRoute("/egitmenler")({
  validateSearch: (s: Record<string, unknown>): FacultySearch => ({
    q: text(s.q),
    branch: text(s.branch),
  }),
  head: () => ({
    meta: [
      { title: "Eğitmenler — E-Kurs" },
      {
        name: "description",
        content: "E-Kurs eğitmenleri: branşları, özgeçmişleri ve verdikleri kurslar.",
      },
    ],
  }),
  component: FacultyDirectory,
});

const COURSE_PREVIEW = 3;

function FacultyDirectory() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/egitmenler" });
  const { courses, categories, teachers, teachersLoaded, label } = usePublicCatalog();
  const [selected, setSelected] = useState<LandingCourse | null>(null);
  const [profile, setProfile] = useState<ProfileTarget | null>(null);
  const [query, setQuery] = useState(search.q ?? "");

  const set = (patch: Partial<FacultySearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false });

  const byId = useMemo(() => new Map((courses ?? []).map((c) => [c.id, c])), [courses]);
  const branches = useMemo(() => {
    const used = new Set(teachers.flatMap(getTeacherBranches));
    return [
      ...categories.filter((c) => used.has(c)),
      ...[...used].filter((b) => !categories.includes(b)),
    ];
  }, [teachers, categories]);

  const list = useMemo(() => {
    return (
      teachers
        .filter((tc) => {
          const own = getTeacherBranches(tc);
          if (search.branch && !own.includes(search.branch)) return false;
          return matchesSearch(
            search.q ?? "",
            getTeacherFullName(tc),
            tc.aboutMe ?? tc.AboutMe ?? "",
            ...own,
            ...own.map((b) => label("categories", b)),
          );
        })
        // teachers who give courses first; the sort is stable, so the API's A–Z order stays
        .sort((a, b) => Number(!!b.courses?.length) - Number(!!a.courses?.length))
    );
  }, [teachers, search.q, search.branch, label]);

  return (
    <PublicPage>
      <PageIntro eyebrow={t("faculty.eyebrow")} title={t("faculty.title")} lead={t("faculty.lead")}>
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="relative mt-10 max-w-2xl"
        >
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            autoComplete="off"
            aria-label={t("faculty.searchPlaceholder")}
            placeholder={t("faculty.searchPlaceholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              set({ q: e.target.value.trim() || undefined });
            }}
            className="w-full rounded-md border border-border bg-card py-4 pl-13 pr-4 text-base outline-none transition-[border-color,box-shadow] focus:border-gold focus:ring-4 focus:ring-gold/15 [&::-webkit-search-cancel-button]:hidden"
          />
        </form>
      </PageIntro>

      <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6">
        <div className="flex flex-col gap-4 border-b border-border py-6 md:flex-row md:items-center md:justify-between">
          <nav
            aria-label={t("faculty.branchFilter")}
            className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 lg:overflow-visible"
          >
            <ul className="flex gap-2 max-lg:min-w-max lg:flex-wrap">
              {[undefined, ...branches].map((b) => {
                const on = search.branch === b;
                return (
                  <li key={b ?? "all"}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ branch: b })}
                      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-gold hover:text-foreground"
                      }`}
                    >
                      {b ? label("categories", b) : t("faculty.allBranches")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <p
            role="status"
            aria-live="polite"
            className="shrink-0 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground"
          >
            {t("guest.teacherCount", { count: list.length })}
          </p>
        </div>

        {list.length === 0 && (
          <p role="status" className="py-24 text-center text-muted-foreground">
            {teachersLoaded ? t("faculty.empty") : t("common.loading")}
          </p>
        )}

        {/* keyed on the filter: a fresh list staggers in, so no card is left at opacity 0 */}
        <Stagger
          key={`${search.q ?? ""}|${search.branch ?? ""}|${list.length}`}
          className="mt-12 grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
        >
          {list.map((teacher) => (
            <StaggerItem key={String(teacher.id ?? teacher.Id)}>
              <FacultyCard
                teacher={teacher}
                courses={(teacher.courses ?? [])
                  .map((c) => byId.get(c.id))
                  .filter((c): c is LandingCourse => !!c)}
                label={label}
                onOpen={setSelected}
                onProfile={() =>
                  setProfile({ kind: "teacher", id: Number(teacher.id ?? teacher.Id) })
                }
              />
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      <GuestCourseModal course={selected} teachers={teachers} onClose={() => setSelected(null)} />
      <ProfileModal target={profile} onClose={() => setProfile(null)} />
    </PublicPage>
  );
}

function FacultyCard({
  teacher,
  courses,
  label,
  onOpen,
  onProfile,
}: {
  teacher: TeacherLiteDto;
  courses: LandingCourse[];
  label: LandingProps["label"];
  onOpen: (course: LandingCourse) => void;
  onProfile: () => void;
}) {
  const { t } = useTranslation();
  const [bioOpen, setBioOpen] = useState(false);
  const [allCourses, setAllCourses] = useState(false);
  const name = getTeacherFullName(teacher);
  const bio = teacher.aboutMe || teacher.AboutMe;
  const id = String(teacher.id ?? teacher.Id);
  const shown = allCourses ? courses : courses.slice(0, COURSE_PREVIEW);

  return (
    <article className="flex h-full flex-col">
      <div className="flex items-center gap-5">
        <Portrait
          teacher={teacher}
          name={name}
          className="h-20 w-20 shrink-0 rounded-full text-2xl"
        />
        <div className="min-w-0">
          <h2 className="font-serif text-2xl leading-tight">
            <button
              type="button"
              onClick={onProfile}
              title={t("community.viewProfile")}
              className="text-left underline-offset-4 hover:text-gold hover:underline"
            >
              {name}
            </button>
          </h2>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
            {getTeacherBranches(teacher)
              .map((b) => label("categories", b))
              .join(" · ")}
          </p>
        </div>
      </div>
      <p
        id={`bio-${id}`}
        className={`mt-4 text-pretty text-sm leading-relaxed text-muted-foreground ${bioOpen ? "" : "line-clamp-4"}`}
      >
        {bio || t("courseModal.noInstructorBio")}
      </p>
      {bio && bio.length > 220 && (
        <button
          type="button"
          aria-expanded={bioOpen}
          aria-controls={`bio-${id}`}
          onClick={() => setBioOpen((v) => !v)}
          className="mt-1 self-start text-sm text-foreground underline decoration-gold underline-offset-4 hover:text-gold"
        >
          {bioOpen ? t("faculty.less") : t("faculty.more")}
        </button>
      )}
      {courses.length > 0 && (
        <div className="mt-auto pt-6">
          <p className="border-t border-border pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {t("guest.teacherCourses")} · {courses.length}
          </p>
          <ul id={`courses-${id}`} className="mt-2 space-y-1">
            {shown.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpen(c)}
                  className="flex w-full items-baseline justify-between gap-3 text-left text-sm decoration-gold underline-offset-4 hover:underline"
                >
                  <span className="truncate">{label("courses", c.title)}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {price(c.price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {courses.length > COURSE_PREVIEW && (
            <button
              type="button"
              aria-expanded={allCourses}
              aria-controls={`courses-${id}`}
              onClick={() => setAllCourses((v) => !v)}
              className="mt-2 text-sm text-muted-foreground underline decoration-gold underline-offset-4 hover:text-foreground"
            >
              {allCourses
                ? t("faculty.fewerCourses")
                : t("faculty.moreCourses", { count: courses.length - COURSE_PREVIEW })}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
