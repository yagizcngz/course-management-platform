import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  LineChart,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { API_BASE, resolveImageSrc } from "@/components/courseHelpers";
import { RatingSummary } from "@/components/StarRating";
import { teacherOnly } from "@/hooks/useAdminGuard";
import { authHeaders, readError } from "@/lib/auth";
import { chip, cn, formatDate, formatTry, initialsOf } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/egitmen-paneli")({
  component: teacherOnly(InstructorAnalyticsPage),
});

/** GET /api/teachers/me/analytics, one row per course. */
interface CourseAnalytics {
  courseId: number;
  title: string;
  category: string;
  price: number;
  students: number;
  joinedLast30: number;
  /** Everyone who ever enrolled, leavers and refunds included. */
  everEnrolled: number;
  graduates: number;
  lessons: number;
  sales: number;
  refunds: number;
  /** The teacher's share, refunds already taken back. */
  earned: number;
  ratingAverage: number;
  ratingCount: number;
  durationSeconds: number;
  /** Mean share of lessons finished by the course's current students (0-100). */
  averageProgress: number;
}

/** GET /api/teachers/me/analytics/{courseId}/students. */
interface StudentProgress {
  studentId: number;
  userId: number | null;
  name: string;
  studentNumber: string;
  profilePictureUrl: string | null;
  enrolledAt: string | null;
  completedLessons: number;
  totalLessons: number;
  percent: number;
  completedAt: string | null;
  lastActivity: string | null;
  /** Has an active enrolment; false means finished and left. */
  active: boolean;
}

type Stage = "notStarted" | "started" | "halfway" | "finished";
const STAGES: Stage[] = ["notStarted", "started", "halfway", "finished"];
const stageOf = (s: StudentProgress): Stage =>
  s.completedAt
    ? "finished"
    : s.percent >= 50
      ? "halfway"
      : s.percent > 0
        ? "started"
        : "notStarted";
// one hue, light to dark: further along reads darker
const STAGE_FILL: Record<Stage, string> = {
  notStarted: "bg-gold/20",
  started: "bg-gold/45",
  halfway: "bg-gold/70",
  finished: "bg-gold",
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
/** 47 -> "47%" in English, "%47" in Turkish. */
const fmtPct = (value: number, lang: string) =>
  (value / 100).toLocaleString(lang, { style: "percent", maximumFractionDigits: 0 });

function useJson<T>(url: string | null, fallback: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let off = false;
    setData(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) throw new Error(await readError(res, fallback));
        const json = (await res.json()) as T;
        if (!off) setData(json);
      } catch (e) {
        if (!off) setError((e as Error).message);
      }
    })();
    return () => {
      off = true;
    };
  }, [url, fallback]);
  return { data, error };
}

function InstructorAnalyticsPage() {
  const { t, i18n } = useTranslation();
  const { data: rows, error } = useJson<CourseAnalytics[]>(
    `${API_BASE}/api/teachers/me/analytics`,
    t("common.loadFailed"),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = rows?.find((r) => r.courseId === selectedId) ?? rows?.[0] ?? null;

  const label = (kind: string, value: string) =>
    i18n.exists(`dynamic.${kind}.${value}`) ? t(`dynamic.${kind}.${value}`) : value;

  const totals = useMemo(() => {
    const list = rows ?? [];
    const sum = (f: (r: CourseAnalytics) => number) => list.reduce((s, r) => s + f(r), 0);
    const ratings = sum((r) => r.ratingCount);
    const students = sum((r) => r.students);
    return {
      students,
      ever: sum((r) => r.everEnrolled),
      graduates: sum((r) => r.graduates),
      joined: sum((r) => r.joinedLast30),
      sales: sum((r) => r.sales),
      refunds: sum((r) => r.refunds),
      earned: sum((r) => r.earned),
      ratings,
      rating: ratings ? sum((r) => r.ratingAverage * r.ratingCount) / ratings : 0,
      // weighted by current students, so a one-student course does not swing the mean
      progress: students ? Math.round(sum((r) => r.averageProgress * r.students) / students) : 0,
    };
  }, [rows]);

  return (
    <>
      <PageHeader crumb={t("sidebar.instructorAnalytics")} />
      <div className="mx-auto w-full max-w-7xl space-y-10 p-4 md:p-8 animate-reveal">
        <header className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            {t("instructor.eyebrow")}
          </p>
          <h1 className="font-serif text-5xl leading-none">{t("instructor.title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("instructor.intro")}</p>
        </header>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {rows === null && !error && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}

        {rows && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("instructor.empty")}{" "}
            <Link to="/verdigim-kurslar" className="underline underline-offset-4">
              {t("sidebar.taughtCourses")}
            </Link>
          </p>
        )}

        {rows && rows.length > 0 && (
          <>
            <section aria-labelledby="kpi-title" className="space-y-4">
              <h2 id="kpi-title" className="sr-only">
                {t("instructor.summary")}
              </h2>
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Tile icon={<Users />} label={t("instructor.kpi.students")}>
                  {totals.students}
                  <Hint>{t("instructor.kpi.joined", { count: totals.joined })}</Hint>
                </Tile>
                <Tile icon={<BookOpen />} label={t("instructor.kpi.enrolments")}>
                  {totals.ever}
                  <Hint>{t("instructor.kpi.enrolmentsHint")}</Hint>
                </Tile>
                <Tile icon={<GraduationCap />} label={t("instructor.kpi.graduates")}>
                  {totals.graduates}
                  <Hint>
                    {t("instructor.kpi.completionRate", {
                      percent: fmtPct(pct(totals.graduates, totals.ever), i18n.language),
                    })}
                  </Hint>
                </Tile>
                <Tile icon={<TrendingUp />} label={t("instructor.kpi.progress")}>
                  {fmtPct(totals.progress, i18n.language)}
                  <Hint>{t("instructor.kpi.progressHint")}</Hint>
                </Tile>
                <Tile icon={<Star />} label={t("instructor.kpi.rating")}>
                  {totals.ratings
                    ? totals.rating.toLocaleString(i18n.language, {
                        maximumFractionDigits: 1,
                        minimumFractionDigits: 1,
                      })
                    : "—"}
                  <Hint>{t("rating.count", { count: totals.ratings })}</Hint>
                </Tile>
                <Tile icon={<LineChart />} label={t("instructor.cols.sales")}>
                  {totals.sales}
                  <Hint>
                    {t("instructor.kpi.refundRate", {
                      percent: fmtPct(pct(totals.refunds, totals.sales), i18n.language),
                    })}
                  </Hint>
                </Tile>
                <Tile icon={<Wallet />} label={t("instructor.cols.earned")} wide>
                  {formatTry(totals.earned, 0)}
                  <Hint>{t("instructor.kpi.earnedHint")}</Hint>
                </Tile>
              </dl>
            </section>

            <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <section aria-labelledby="courses-title" className="min-w-0 space-y-3">
                <h2 id="courses-title" className="font-serif text-2xl">
                  {t("instructor.courses", { count: rows.length })}
                </h2>
                <ul className="space-y-3">
                  {rows.map((r) => {
                    const on = selected?.courseId === r.courseId;
                    return (
                      <li key={r.courseId}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setSelectedId(r.courseId)}
                          className={cn(
                            "w-full rounded-xl border bg-card p-4 text-left transition-colors",
                            on
                              ? "border-gold ring-1 ring-gold"
                              : "border-border hover:border-gold/60",
                          )}
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
                            {label("categories", r.category)}
                          </p>
                          <p className="mt-1 font-semibold leading-snug">
                            {label("courses", r.title)}
                          </p>
                          <RatingSummary
                            average={r.ratingAverage}
                            count={r.ratingCount}
                            className="mt-1"
                          />
                          <Meter
                            label={t("instructor.meter.completion")}
                            value={pct(r.graduates, r.everEnrolled)}
                          />
                          <Meter label={t("instructor.meter.progress")} value={r.averageProgress} />
                          <p className="mt-3 text-xs text-muted-foreground">
                            {t("instructor.cardLine", {
                              students: r.students,
                              graduates: r.graduates,
                            })}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {selected && <CourseDetail key={selected.courseId} course={selected} label={label} />}
            </div>

            <p className="text-xs text-muted-foreground">{t("instructor.notes")}</p>
          </>
        )}
      </div>
    </>
  );
}

/** One course: its numbers, where its students are, and the student list. */
function CourseDetail({
  course: r,
  label,
}: {
  course: CourseAnalytics;
  label: (kind: string, value: string) => string;
}) {
  const { t, i18n } = useTranslation();
  const { data: students, error } = useJson<StudentProgress[]>(
    `${API_BASE}/api/teachers/me/analytics/${r.courseId}/students`,
    t("common.loadFailed"),
  );
  const [show, setShow] = useState<"all" | "progress" | "finished">("all");

  const byStage = useMemo(() => {
    const m: Record<Stage, number> = { notStarted: 0, started: 0, halfway: 0, finished: 0 };
    for (const s of students ?? []) m[stageOf(s)]++;
    return m;
  }, [students]);
  const list = (students ?? []).filter((s) =>
    show === "all" ? true : show === "finished" ? !!s.completedAt : !s.completedAt,
  );
  const hours = r.durationSeconds / 3600;

  return (
    <section aria-labelledby="detail-title" className="min-w-0 space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
          {label("categories", r.category)}
        </p>
        <h2 id="detail-title" className="mt-1 font-serif text-3xl leading-tight">
          <Link
            to="/kurs/$id"
            params={{ id: String(r.courseId) }}
            className="underline-offset-4 hover:underline"
          >
            {label("courses", r.title)}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("instructor.lessons", { count: r.lessons })}
          {hours > 0 &&
            ` · ${t("instructor.hours", { value: hours.toLocaleString(i18n.language, { maximumFractionDigits: 1 }) })}`}
          {" · "}
          {r.price > 0 ? formatTry(r.price, 0) : t("courses.free")}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {(
            [
              ["students", r.students],
              ["joinedLast30", r.joinedLast30],
              ["everEnrolled", r.everEnrolled],
              ["graduates", r.graduates],
              ["completionRate", fmtPct(pct(r.graduates, r.everEnrolled), i18n.language)],
              ["averageProgress", fmtPct(r.averageProgress, i18n.language)],
              ["sales", r.sales],
              ["refundRate", fmtPct(pct(r.refunds, r.sales), i18n.language)],
            ] as const
          ).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-muted-foreground">{t(`instructor.cols.${key}`)}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">{t("instructor.cols.earned")}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums">{formatTry(r.earned, 0)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">{t("rating.title")}</dt>
            <dd className="mt-1.5">
              <RatingSummary average={r.ratingAverage} count={r.ratingCount} className="text-sm" />
            </dd>
          </div>
        </dl>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {students === null && !error && (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      )}

      {students && (
        <>
          <StageBar counts={byStage} total={students.length} />

          <div className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <h3 className="font-semibold">
                {t("instructor.roster.title", { count: students.length })}
              </h3>
              <div role="group" aria-label={t("instructor.roster.show")} className="flex gap-2">
                {(["all", "progress", "finished"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={show === k}
                    onClick={() => setShow(k)}
                    className={chip(show === k)}
                  >
                    {t(`instructor.filter.${k}`)}
                  </button>
                ))}
              </div>
            </div>
            {list.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">{t("instructor.roster.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <caption className="sr-only">
                    {t("instructor.roster.title", { count: list.length })}
                  </caption>
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-border text-left">
                      <th scope="col" className="px-4 py-3">
                        {t("instructor.roster.student")}
                      </th>
                      <th scope="col" className="px-4 py-3">
                        {t("instructor.roster.status")}
                      </th>
                      <th scope="col" className="w-48 px-4 py-3">
                        {t("instructor.roster.progress")}
                      </th>
                      <th scope="col" className="px-4 py-3">
                        {t("instructor.roster.enrolled")}
                      </th>
                      <th scope="col" className="px-4 py-3">
                        {t("instructor.roster.lastActivity")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {list.map((s) => (
                      <StudentRow key={s.studentId} s={s} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function StudentRow({ s }: { s: StudentProgress }) {
  const { t, i18n } = useTranslation();
  const stage = stageOf(s);
  const date = (d: string | null) => (d ? formatDate(d, i18n.language) : "—");
  return (
    <tr>
      <th scope="row" className="px-4 py-3 text-left font-normal">
        <div className="flex items-center gap-3">
          {s.profilePictureUrl ? (
            <img
              src={resolveImageSrc(s.profilePictureUrl)}
              alt=""
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
            >
              {initialsOf(s.name)}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-medium">{s.name}</span>
            <span className="block font-mono text-[11px] text-muted-foreground">
              {s.studentNumber}
            </span>
          </span>
        </div>
      </th>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
          {stage === "finished" ? (
            <CheckCircle2 aria-hidden="true" className="size-3.5 text-gold" />
          ) : (
            <Clock aria-hidden="true" className="size-3.5 text-muted-foreground" />
          )}
          {t(`instructor.stage.${stage}`)}
          {!s.active && (
            <span className="text-muted-foreground">· {t("instructor.roster.left")}</span>
          )}
        </span>
        {s.completedAt && (
          <span className="block text-[11px] text-muted-foreground">{date(s.completedAt)}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={s.percent}
            aria-label={t("instructor.roster.progressOf", { name: s.name })}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-gold" style={{ width: `${s.percent}%` }} />
          </div>
          <span className="w-10 text-right tabular-nums">{fmtPct(s.percent, i18n.language)}</span>
        </div>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {t("instructor.roster.lessonsDone", { done: s.completedLessons, total: s.totalLessons })}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap tabular-nums">{date(s.enrolledAt)}</td>
      <td className="px-4 py-3 whitespace-nowrap tabular-nums">{date(s.lastActivity)}</td>
    </tr>
  );
}

/**
 * Where the course's students are: not started, under half, half or more, finished. One hue
 * from light to dark, 2px gaps between segments, each segment named in the legend with its
 * count, and the exact numbers on hover.
 */
function StageBar({ counts, total }: { counts: Record<Stage, number>; total: number }) {
  const { t, i18n } = useTranslation();
  if (total === 0) return null;
  return (
    <figure className="rounded-xl border border-border bg-card p-5">
      <figcaption className="text-sm font-semibold">{t("instructor.stages")}</figcaption>
      <div className="mt-3 flex h-3 gap-0.5" aria-hidden="true">
        {STAGES.filter((s) => counts[s] > 0).map((s) => (
          <div
            key={s}
            title={`${t(`instructor.stage.${s}`)}: ${counts[s]} (${fmtPct(pct(counts[s], total), i18n.language)})`}
            className={cn("h-full rounded-[4px]", STAGE_FILL[s])}
            style={{ width: `${(counts[s] / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {STAGES.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("size-2.5 rounded-sm", STAGE_FILL[s])} />
            <span className="text-muted-foreground">{t(`instructor.stage.${s}`)}</span>
            <span className="font-medium tabular-nums">
              {counts[s]} · {fmtPct(pct(counts[s], total), i18n.language)}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Tile({
  icon,
  label,
  children,
  wide,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-4",
        wide && "col-span-2 md:col-span-2",
      )}
    >
      <dt className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        <span aria-hidden="true" className="text-gold [&>svg]:size-4">
          {icon}
        </span>
      </dt>
      <dd className="mt-2 text-3xl font-bold tabular-nums">{children}</dd>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="mt-1 block text-xs font-normal text-muted-foreground">{children}</span>;
}

function Meter({ label, value }: { label: string; value: number }) {
  const { i18n } = useTranslation();
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{fmtPct(value, i18n.language)}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-gold" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
