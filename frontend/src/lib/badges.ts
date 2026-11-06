import type { TFunction } from "i18next";

/** GET /api/profile/achievements: raw counts; the badge rules live here. */
export interface AchievementStats {
  learning: {
    completedLessons: number;
    courses: {
      courseId: number;
      category: string;
      percent: number;
      completedAt: string | null;
      /** Sent by the public profile endpoint. */
      title?: string;
    }[];
  } | null;
  teaching: { joinedAt: string; courses: number; students: number; lessons: number } | null;
}

/** Rarity tiers, from the easiest to the hardest to earn. */
export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];
export const rarityRank = (r: Rarity) => RARITIES.indexOf(r);

export type BadgeKind =
  | "spark"
  | "explorer"
  | "graduate"
  | "trophy"
  | "specialist"
  | "polymath"
  | "scholar"
  | "author"
  | "senior"
  | "mentor"
  | "architect";

export interface Badge {
  id: string;
  kind: BadgeKind;
  rarity: Rarity;
  title: string;
  criteria: string;
  current: number;
  target: number;
  earned: boolean;
  earnedAt?: string;
}

/** earned, in progress (some progress) or locked (nothing yet). */
export const badgeState = (b: Badge) =>
  b.earned ? "earned" : b.current > 0 ? "progress" : ("locked" as const);

const DAY = 86_400_000;

/** The n-th earliest date (1-based), or undefined when there are fewer. */
const nth = (dates: string[], n: number) => [...dates].sort()[n - 1];

// [id (also the locale key), kind, rarity, target]; ids of the original badges are kept so pins survive
type Rule = readonly [string, BadgeKind, Rarity, number];
const ENROLLED: Rule[] = [
  ["explorer", "explorer", "common", 3],
  ["avidLearner", "explorer", "uncommon", 10],
];
const LESSONS: Rule[] = [
  ["firstLesson", "spark", "common", 1],
  ["scholar", "scholar", "uncommon", 15],
  ["devoted", "scholar", "rare", 50],
  ["sage", "scholar", "epic", 150],
];
const COMPLETED: Rule[] = [
  ["graduate", "graduate", "uncommon", 1],
  ["finisher", "trophy", "rare", 5],
  ["completionist", "trophy", "epic", 10],
  ["lifelong", "trophy", "legendary", 25],
];
const FIELDS: Rule[] = [
  ["polymath", "polymath", "rare", 3],
  ["renaissance", "polymath", "legendary", 5],
];
const SPECIALIST = 3;
const MASTER = 5;
/** Fields that get their own specialist and master badges, most completed first. */
const SPECIALIST_FIELDS = 3;

const COURSES: Rule[] = [
  ["firstChapter", "author", "common", 1],
  ["curator", "author", "rare", 5],
  ["prolific", "author", "epic", 10],
];
const STUDENTS: Rule[] = [
  ["firstStudent", "mentor", "common", 1],
  ["mentor", "mentor", "uncommon", 10],
  ["crowdFavourite", "mentor", "rare", 50],
  ["luminary", "mentor", "legendary", 250],
];
const LESSONS_TAUGHT: Rule[] = [
  ["architect", "architect", "uncommon", 20],
  ["masterBuilder", "architect", "epic", 100],
];
const DAYS: Rule[] = [
  ["senior", "senior", "rare", 180],
  ["veteran", "senior", "epic", 365],
  ["pillar", "senior", "legendary", 730],
];

export function buildBadges(stats: AchievementStats, t: TFunction, label: (cat: string) => string) {
  const out: Badge[] = [];
  const add = (
    [id, kind, rarity, target]: Rule,
    current: number,
    criteria: string,
    earnedAt?: (target: number) => string | undefined,
    title = t(`badges.${id}.title`),
  ) =>
    out.push({
      id,
      kind,
      rarity,
      title,
      criteria,
      current: Math.min(current, target),
      target,
      earned: current >= target,
      earnedAt: current >= target ? earnedAt?.(target) : undefined,
    });
  const ladder = (
    rules: Rule[],
    current: number,
    criteria: (id: string, count: number) => string,
    earnedAt?: (target: number) => string | undefined,
  ) => rules.forEach((r) => add(r, current, criteria(r[0], r[3]), earnedAt));

  const l = stats.learning;
  if (l) {
    const done = l.courses.filter((c) => c.percent >= 100 && c.completedAt);
    const dates = done.map((c) => c.completedAt!);

    ladder(ENROLLED, l.courses.length, (_, count) => t("badges.explorer.criteria", { count }));
    ladder(LESSONS, l.completedLessons, (id, count) =>
      t(id === "firstLesson" ? "badges.firstLesson.criteria" : "badges.scholar.criteria", {
        count,
      }),
    );
    ladder(
      COMPLETED,
      done.length,
      (id, count) =>
        t(id === "graduate" ? "badges.graduate.criteria" : "badges.finisher.criteria", { count }),
      (n) => nth(dates, n),
    );

    // the date each distinct field was first finished
    const firstPerField = new Map<string, string>();
    for (const c of [...done].sort((a, b) => a.completedAt!.localeCompare(b.completedAt!)))
      if (!firstPerField.has(c.category)) firstPerField.set(c.category, c.completedAt!);
    ladder(
      FIELDS,
      firstPerField.size,
      (_, count) => t("badges.polymath.criteria", { count }),
      (n) => nth([...firstPerField.values()], n),
    );

    // specialist and master per field the student studies; a generic pair until they enrol
    const fields = [...new Set(l.courses.map((c) => c.category).filter(Boolean))]
      .map((cat) => ({ cat, done: done.filter((c) => c.category === cat) }))
      .sort((a, b) => b.done.length - a.done.length || a.cat.localeCompare(b.cat))
      .slice(0, SPECIALIST_FIELDS);
    if (fields.length === 0) fields.push({ cat: "", done: [] });
    for (const { cat, done: inField } of fields) {
      const field = cat ? label(cat) : t("badges.anyField");
      const key = cat || "any";
      const fieldDates = inField.map((c) => c.completedAt!);
      for (const [id, rarity, target] of [
        [`specialist-${key}`, "rare", SPECIALIST],
        [`master-${key}`, "epic", MASTER],
      ] as const)
        add(
          [id, "specialist", rarity, target],
          inField.length,
          t("badges.specialist.criteria", { count: target, field }),
          (n) => nth(fieldDates, n),
          t(id.startsWith("master") ? "badges.master.title" : "badges.specialist.title", {
            field,
          }),
        );
    }
  }

  const te = stats.teaching;
  if (te) {
    const joined = new Date(te.joinedAt).getTime();
    const days = Math.max(0, Math.floor((Date.now() - joined) / DAY));
    ladder(COURSES, te.courses, (_, count) => t("badges.author.criteria", { count }));
    ladder(STUDENTS, te.students, (_, count) => t("badges.mentor.criteria", { count }));
    ladder(LESSONS_TAUGHT, te.lessons, (_, count) => t("badges.architect.criteria", { count }));
    ladder(
      DAYS,
      days,
      (_, count) => t("badges.senior.criteria", { count }),
      (n) => new Date(joined + n * DAY).toISOString(),
    );
  }
  return sortBadges(out);
}

/** Earned first (rarest on top), then the closest to unlocking (easiest tier first on ties). */
export const sortBadges = (badges: Badge[]) =>
  badges.sort(
    (a, b) =>
      Number(b.earned) - Number(a.earned) ||
      (a.earned
        ? rarityRank(b.rarity) - rarityRank(a.rarity)
        : b.current / b.target - a.current / a.target ||
          rarityRank(a.rarity) - rarityRank(b.rarity)),
  );

/** Most badges a profile showcases; the API enforces the same limit. */
export const MAX_FEATURED = 5;

/** The badges a profile shows off: the pinned earned ones in pin order, else the first earned ones. */
export function featuredBadges(badges: Badge[], pinned: string[] | null | undefined): Badge[] {
  const earned = badges.filter((b) => b.earned);
  const picked = (pinned ?? [])
    .map((id) => earned.find((b) => b.id === id))
    .filter((b): b is Badge => !!b);
  return (picked.length ? picked : earned).slice(0, MAX_FEATURED);
}
