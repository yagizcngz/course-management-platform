import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { BadgeShowcase, Medal, useBadgeBuilder } from "@/components/Badges";
import { API_BASE } from "@/components/courseHelpers";
import { participantOnly } from "@/hooks/useAdminGuard";
import { authHeaders } from "@/lib/auth";
import type { AchievementStats } from "@/lib/badges";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/basarimlar")({
  component: participantOnly(AchievementsPage),
});

/**
 * Badges in one place: what is closest to unlocking, every badge of the role's catalogue, and
 * (for learners) the permanent list of finished courses that badges count.
 */
function AchievementsPage() {
  const { t, i18n } = useTranslation();
  const build = useBadgeBuilder();
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let off = false;
    fetch(`${API_BASE}/api/profile/achievements`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => !off && setStats(json))
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, []);
  const badges = useMemo(() => build(stats), [build, stats]);
  const next = (badges ?? [])
    .filter((b) => !b.earned && b.current > 0)
    .sort((a, b) => b.current / b.target - a.current / a.target)
    .slice(0, 3);
  const finished = (stats?.learning?.courses ?? [])
    .filter((c) => c.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
  const label = (kind: string, value: string) =>
    i18n.exists(`dynamic.${kind}.${value}`) ? t(`dynamic.${kind}.${value}`) : value;

  return (
    <>
      <PageHeader crumb={t("sidebar.achievements")} />
      <div className="mx-auto w-full max-w-5xl space-y-10 p-4 md:p-8">
        <div className="space-y-2">
          <h1 className="font-serif text-5xl leading-none">{t("achievements.title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("achievements.intro")}</p>
          <Link to="/profil" className="text-sm underline underline-offset-4">
            {t("achievements.pinOnProfile")}
          </Link>
        </div>

        {failed && <p className="text-sm text-destructive">{t("common.loadFailed")}</p>}

        {next.length > 0 && (
          <section aria-labelledby="next-title" className="space-y-3">
            <h2 id="next-title" className="font-bold">
              {t("achievements.next")}
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {next.map((b) => (
                <li key={b.id} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                  <Medal badge={b} className="size-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.criteria}</p>
                    <div
                      className="mt-2 h-1.5 rounded-full bg-muted"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={b.target}
                      aria-valuenow={b.current}
                      aria-label={b.title}
                    >
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${(b.current / b.target) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {b.current} / {b.target}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {badges && <BadgeShowcase badges={badges} />}

        {stats?.learning && (
          <section aria-labelledby="finished-title" className="space-y-3">
            <h2 id="finished-title" className="font-bold">
              {t("achievements.finished", { count: finished.length })}
            </h2>
            <p className="text-sm text-muted-foreground">{t("achievements.finishedHint")}</p>
            {finished.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("achievements.noneFinished")}</p>
            ) : (
              <ul className="divide-y rounded-xl border border-border bg-card">
                {finished.map((c) => (
                  <li
                    key={c.courseId}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                  >
                    <span className="font-medium">{label("courses", c.title ?? "")}</span>
                    <span className="text-xs text-muted-foreground">
                      {label("categories", c.category)} · {formatDate(c.completedAt, i18n.language)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
