import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { API_BASE } from "@/components/courseHelpers";
import { teacherOnly } from "@/hooks/useAdminGuard";
import { authHeaders, readError } from "@/lib/auth";
import { formatTry } from "@/lib/utils";

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
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function InstructorAnalyticsPage() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<CourseAnalytics[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/teachers/me/analytics`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(await readError(res, t("common.loadFailed")));
        const json = await res.json();
        if (!off) setRows(json);
      } catch (e) {
        if (!off) setError((e as Error).message);
      }
    })();
    return () => {
      off = true;
    };
  }, [t]);

  const sum = (key: keyof CourseAnalytics) => (rows ?? []).reduce((s, r) => s + Number(r[key]), 0);
  const label = (kind: string, value: string) =>
    i18n.exists(`dynamic.${kind}.${value}`) ? t(`dynamic.${kind}.${value}`) : value;
  const totals = [
    ["students", sum("students")],
    ["joinedLast30", sum("joinedLast30")],
    ["graduates", sum("graduates")],
    ["sales", sum("sales")],
    ["refunds", sum("refunds")],
  ] as const;

  return (
    <>
      <PageHeader crumb={t("sidebar.instructorAnalytics")} />
      <div className="mx-auto w-full max-w-6xl space-y-8 p-4 md:p-8">
        <div className="space-y-2">
          <h1 className="font-serif text-5xl leading-none">{t("instructor.title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("instructor.intro")}</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {rows === null && !error && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}

        {rows && (
          <>
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-6">
              {totals.map(([key, value]) => (
                <div key={key} className="rounded-xl border border-border bg-card p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t(`instructor.cols.${key}`)}
                  </dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
                </div>
              ))}
              <div className="rounded-xl border border-border bg-card p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("instructor.cols.earned")}
                </dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">
                  {formatTry(sum("earned"), 0)}
                </dd>
              </div>
            </dl>

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("instructor.empty")}{" "}
                <Link to="/verdigim-kurslar" className="underline underline-offset-4">
                  {t("sidebar.taughtCourses")}
                </Link>
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[760px] text-sm">
                  <caption className="sr-only">{t("instructor.title")}</caption>
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-border text-left">
                      <th scope="col" className="px-4 py-3">
                        {t("instructor.cols.course")}
                      </th>
                      {(
                        [
                          "students",
                          "joinedLast30",
                          "graduates",
                          "completionRate",
                          "sales",
                          "refundRate",
                          "earned",
                        ] as const
                      ).map((key) => (
                        <th key={key} scope="col" className="px-4 py-3 text-right">
                          {t(`instructor.cols.${key}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => (
                      <tr key={r.courseId}>
                        <th scope="row" className="px-4 py-3 text-left font-medium">
                          <Link
                            to="/kurs/$id"
                            params={{ id: String(r.courseId) }}
                            className="hover:underline underline-offset-4"
                          >
                            {label("courses", r.title)}
                          </Link>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {label("categories", r.category)} ·{" "}
                            {t("instructor.lessons", { count: r.lessons })}
                          </span>
                        </th>
                        <td className="px-4 py-3 text-right tabular-nums">{r.students}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.joinedLast30}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.graduates}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {pct(r.graduates, r.everEnrolled)}%
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.sales}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {pct(r.refunds, r.sales)}%
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatTry(r.earned, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t("instructor.notes")}</p>
          </>
        )}
      </div>
    </>
  );
}
