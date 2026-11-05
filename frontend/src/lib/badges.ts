import type { TFunction } from "i18next";

/** GET /api/profile/achievements: raw counts; the badge rules live here. */
export interface AchievementStats {
  learning: {
    completedLessons: number;
    courses: { courseId: number; category: string; percent: number; completedAt: string | null }[];
  } | null;
  teaching: { joinedAt: string; courses: number; students: number; lessons: number } | null;
}

export type BadgeKind =
  "graduate" | "specialist" | "polymath" | "scholar" | "senior" | "mentor" | "architect";

export interface Badge {
  id: string;
  kind: BadgeKind;
  /** 1 for the first tier, 2 for the higher one (specialist only). */
  tier: 1 | 2;
  title: string;
  criteria: string;
  current: number;
  target: number;
  earned: boolean;
  earnedAt?: string;
}

const DAY = 86_400_000;
const SPECIALIST = [3, 5] as const;
const POLYMATH = 3;
const SCHOLAR = 15;
const SENIOR_DAYS = 180;
const MENTOR = 10;
const ARCHITECT = 20;

const badge = (b: Omit<Badge, "earned">): Badge => ({
  ...b,
  current: Math.min(b.current, b.target),
  earned: b.current >= b.target,
});

/** The n-th earliest date (1-based), or undefined when there are fewer. */
const nth = (dates: string[], n: number) => [...dates].sort()[n - 1];

export function buildBadges(stats: AchievementStats, t: TFunction, label: (cat: string) => string) {
  const out: Badge[] = [];
  const l = stats.learning;
  if (l) {
    const done = l.courses.filter((c) => c.percent >= 100 && c.completedAt);
    const dates = done.map((c) => c.completedAt!);
    out.push(
      badge({
        id: "graduate",
        kind: "graduate",
        tier: 1,
        title: t("badges.graduate.title"),
        criteria: t("badges.graduate.criteria"),
        current: done.length,
        target: 1,
        earnedAt: nth(dates, 1),
      }),
    );

    // one specialist badge per field the student studies, most completed first
    const fields = [...new Set(l.courses.map((c) => c.category).filter(Boolean))]
      .map((cat) => ({ cat, done: done.filter((c) => c.category === cat) }))
      .sort((a, b) => b.done.length - a.done.length || a.cat.localeCompare(b.cat));
    for (const { cat, done: inField } of fields.slice(0, 3)) {
      // the highest tier reached, or the first one while still working towards it
      const tier = inField.length >= SPECIALIST[1] ? 2 : 1;
      const target = SPECIALIST[tier - 1];
      const field = label(cat);
      out.push(
        badge({
          id: `specialist-${cat}`,
          kind: "specialist",
          tier,
          title: t(tier === 2 ? "badges.master.title" : "badges.specialist.title", { field }),
          criteria: t("badges.specialist.criteria", { count: target, field }),
          current: inField.length,
          target,
          earnedAt: nth(
            inField.map((c) => c.completedAt!),
            target,
          ),
        }),
      );
    }

    // the date the third distinct field was finished
    const firstPerField = new Map<string, string>();
    for (const c of [...done].sort((a, b) => a.completedAt!.localeCompare(b.completedAt!)))
      if (!firstPerField.has(c.category)) firstPerField.set(c.category, c.completedAt!);
    out.push(
      badge({
        id: "polymath",
        kind: "polymath",
        tier: 1,
        title: t("badges.polymath.title"),
        criteria: t("badges.polymath.criteria", { count: POLYMATH }),
        current: firstPerField.size,
        target: POLYMATH,
        earnedAt: nth([...firstPerField.values()], POLYMATH),
      }),
      badge({
        id: "scholar",
        kind: "scholar",
        tier: 1,
        title: t("badges.scholar.title"),
        criteria: t("badges.scholar.criteria", { count: SCHOLAR }),
        current: l.completedLessons,
        target: SCHOLAR,
      }),
    );
  }

  const te = stats.teaching;
  if (te) {
    const joined = new Date(te.joinedAt).getTime();
    const days = Math.max(0, Math.floor((Date.now() - joined) / DAY));
    out.push(
      badge({
        id: "senior",
        kind: "senior",
        tier: 1,
        title: t("badges.senior.title"),
        criteria: t("badges.senior.criteria", { count: SENIOR_DAYS }),
        current: days,
        target: SENIOR_DAYS,
        earnedAt:
          days >= SENIOR_DAYS ? new Date(joined + SENIOR_DAYS * DAY).toISOString() : undefined,
      }),
      badge({
        id: "mentor",
        kind: "mentor",
        tier: 1,
        title: t("badges.mentor.title"),
        criteria: t("badges.mentor.criteria", { count: MENTOR }),
        current: te.students,
        target: MENTOR,
      }),
      badge({
        id: "architect",
        kind: "architect",
        tier: 1,
        title: t("badges.architect.title"),
        criteria: t("badges.architect.criteria", { count: ARCHITECT }),
        current: te.lessons,
        target: ARCHITECT,
      }),
    );
  }
  // earned first, then the closest to unlocking
  return out.sort(
    (a, b) => Number(b.earned) - Number(a.earned) || b.current / b.target - a.current / a.target,
  );
}
