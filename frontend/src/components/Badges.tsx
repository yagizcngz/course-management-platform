import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Pin, PinOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "@/components/courseHelpers";
import { CourseProgressBar } from "@/components/CourseProgressBar";
import { authHeaders } from "@/lib/auth";
import {
  MAX_FEATURED,
  buildBadges,
  type AchievementStats,
  type Badge,
  type BadgeKind,
} from "@/lib/badges";
import { cn, formatDate } from "@/lib/utils";

/** Turns raw stats (own or someone else's) into badges in the UI language. */
export function useBadgeBuilder() {
  const { t, i18n } = useTranslation();
  return useCallback(
    (stats: AchievementStats | null) => {
      if (!stats || (!stats.learning && !stats.teaching)) return null;
      const label = (cat: string) =>
        i18n.exists(`dynamic.categories.${cat}`) ? t(`dynamic.categories.${cat}`) : cat;
      return buildBadges(stats, t, label);
    },
    [t, i18n],
  );
}

/** The signed-in user's badges, or null while loading (and for accounts with no stats). */
export function useBadges() {
  const build = useBadgeBuilder();
  const [stats, setStats] = useState<AchievementStats | null>(null);
  useEffect(() => {
    let off = false;
    fetch(`${API_BASE}/api/profile/achievements`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => !off && setStats(json))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  return useMemo(() => build(stats), [build, stats]);
}

// stroke glyphs on a 24x24 grid, drawn at the medal's centre
const GLYPHS: Record<BadgeKind, string> = {
  graduate: "M12 5 22 9.5 12 14 2 9.5Z M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5 M22 9.5V15",
  specialist: "M5 13 12 8l7 5 M5 18 12 13l7 5",
  polymath:
    "M13.5 9.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0 M19.5 9.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0 M16.5 15a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0",
  scholar: "M3 6c3-1 6-.5 9 1.5 3-2 6-2.5 9-1.5v12c-3-1-6-.5-9 1.5-3-2-6-2.5-9-1.5Z M12 7.5v12",
  senior: "M7 4h10 M7 20h10 M8 4c0 5 4 6 4 8s-4 3-4 8 M16 4c0 5-4 6-4 8s4 3 4 8",
  mentor:
    "M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M3.5 19c0-4 2.5-6 5.5-6s5.5 2 5.5 6 M18.5 9a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0 M15 13.5c3.5-.5 5.5 1.5 5.5 5.5",
  architect: "M12 5 6 20 M12 5l6 15 M8.4 14h7.2 M12 3.2v1.8",
};

// a 16-point rosette edge around the medal
const ROSETTE = Array.from({ length: 32 }, (_, i) => {
  const r = i % 2 ? 22.5 : 25;
  const a = (i / 32) * Math.PI * 2 - Math.PI / 2;
  return `${(32 + r * Math.cos(a)).toFixed(2)},${(30 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

/** An engraved medal: rosette, ribbon tails and the badge's glyph; grey until earned. */
export function Medal({ badge, className }: { badge: Badge; className?: string }) {
  const metal = badge.earned ? "var(--gold)" : "var(--muted-foreground)";
  const ink = badge.earned ? "var(--gold)" : "var(--muted-foreground)";
  return (
    <svg
      viewBox="0 0 64 72"
      aria-hidden="true"
      className={cn("shrink-0", !badge.earned && "opacity-40", className)}
    >
      <path d="M21 44 13 70l8.5-5.5L27 71l5-24Z" fill={metal} opacity={0.75} />
      <path d="M43 44l8 26-8.5-5.5L37 71l-5-24Z" fill={metal} opacity={0.55} />
      <polygon points={ROSETTE} fill={metal} />
      <circle cx="32" cy="30" r="19" fill="var(--card)" />
      <circle
        cx="32"
        cy="30"
        r="16.5"
        fill="none"
        stroke={ink}
        strokeWidth="0.8"
        strokeDasharray={badge.earned ? undefined : "1.5 2"}
      />
      <g
        transform="translate(20 18)"
        fill="none"
        stroke={ink}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={GLYPHS[badge.kind]} />
      </g>
      {badge.tier === 2 && (
        <g fill={ink}>
          <circle cx="27" cy="44.5" r="1.3" />
          <circle cx="32" cy="45.5" r="1.3" />
          <circle cx="37" cy="44.5" r="1.3" />
        </g>
      )}
    </svg>
  );
}

/**
 * The full "Badges & Achievements" grid: every badge with its criteria and progress. With
 * `pinned` and `onTogglePin`, earned badges get a pin that features them on the public profile.
 */
export function BadgeShowcase({
  badges,
  pinned,
  onTogglePin,
}: {
  badges: Badge[];
  pinned?: string[];
  onTogglePin?: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const earned = badges.filter((b) => b.earned).length;
  const full = (pinned?.length ?? 0) >= MAX_FEATURED;
  return (
    <section aria-labelledby="badges-title" className="min-w-0">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h2 id="badges-title" className="font-serif text-3xl leading-none">
          {t("badges.title")}
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
          {t("badges.earnedCount", { earned, total: badges.length })}
        </span>
      </div>
      {pinned && (
        <p className="-mt-2 mb-5 text-sm text-muted-foreground">
          {t("badges.pinHint", { count: pinned.length, max: MAX_FEATURED })}
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {badges.map((b) => (
          <li
            key={b.id}
            className={cn(
              "flex min-w-0 gap-4 rounded-xl border bg-card p-4",
              b.earned ? "border-gold/50" : "border-border",
            )}
          >
            <Medal badge={b} className="h-[72px] w-16" />
            <div className="flex min-w-0 flex-1 flex-col">
              <p
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.16em]",
                  b.earned ? "text-gold" : "text-muted-foreground",
                )}
              >
                {b.earned
                  ? b.earnedAt
                    ? t("badges.earnedOn", { date: formatDate(b.earnedAt, i18n.language) })
                    : t("badges.earned")
                  : t("badges.locked")}
              </p>
              <div className="mt-1 flex items-start gap-2">
                <h3 className="min-w-0 flex-1 font-serif text-xl leading-tight break-words">
                  {b.title}
                </h3>
                {onTogglePin && b.earned && (
                  <button
                    type="button"
                    aria-pressed={pinned?.includes(b.id)}
                    disabled={!pinned?.includes(b.id) && full}
                    onClick={() => onTogglePin(b.id)}
                    title={
                      pinned?.includes(b.id)
                        ? t("badges.unpin")
                        : full
                          ? t("badges.pinFull", { max: MAX_FEATURED })
                          : t("badges.pin")
                    }
                    className={cn(
                      "shrink-0 rounded-full border p-1.5 transition-colors disabled:opacity-40",
                      pinned?.includes(b.id)
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {pinned?.includes(b.id) ? (
                      <PinOff aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Pin aria-hidden="true" className="size-3.5" />
                    )}
                    <span className="sr-only">
                      {pinned?.includes(b.id) ? t("badges.unpin") : t("badges.pin")}
                    </span>
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground break-words">{b.criteria}</p>
              {!b.earned && (
                <CourseProgressBar
                  percent={(b.current / b.target) * 100}
                  label={`${b.current} / ${b.target}`}
                  className="mt-auto pt-3"
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A one-line summary of the badges for the dashboard and "my courses". */
export function BadgeStrip({ badges }: { badges: Badge[] }) {
  const { t } = useTranslation();
  const earned = badges.filter((b) => b.earned).length;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
          {t("badges.title")}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {t("badges.earnedCount", { earned, total: badges.length })}
        </p>
      </div>
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {badges.map((b) => (
          <li
            key={b.id}
            title={`${b.title} · ${b.earned ? t("badges.earned") : `${b.current} / ${b.target}`}`}
          >
            <Medal badge={b} className="h-10 w-9" />
            <span className="sr-only">
              {b.title}: {b.earned ? t("badges.earned") : `${b.current} / ${b.target}`}
            </span>
          </li>
        ))}
      </ul>
      <Link
        to="/profil"
        className="group inline-flex shrink-0 items-center gap-1.5 text-sm underline decoration-gold decoration-1 underline-offset-4 hover:text-gold"
      >
        {t("badges.viewAll")}
        <ArrowRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

/** Up to five medals in a row with their titles; for profile cards. */
export function FeaturedBadgeRow({ badges, total }: { badges: Badge[]; total: number }) {
  const { t } = useTranslation();
  if (badges.length === 0) return null;
  return (
    <div className="min-w-0">
      <ul className="flex min-w-0 flex-wrap gap-3">
        {badges.map((b) => (
          <li key={b.id} className="flex w-16 flex-col items-center gap-1 text-center">
            <Medal badge={b} className="h-12 w-11" />
            <span className="line-clamp-2 w-full break-words text-[10px] leading-tight text-muted-foreground">
              {b.title}
            </span>
          </li>
        ))}
      </ul>
      {total > badges.length && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {t("badges.moreEarned", { count: total - badges.length })}
        </p>
      )}
    </div>
  );
}
