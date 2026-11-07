import type { TFunction } from "i18next";

/** GET /api/profile/achievements: raw counts; the badge rules live here. */
export interface AchievementStats {
  learning: {
    completedLessons: number;
    /** Distinct UTC days (yyyy-mm-dd) with at least one finished lesson, for the streak badges. */
    lessonDays?: string[];
    courses: {
      courseId: number;
      category: string;
      /** Current progress; a finished course can drop below 100 when a lesson is added later. */
      percent: number;
      /** When the first lesson of the course was finished. */
      startedAt?: string | null;
      /** Set once the course is finished and kept for good (leaving, refunds and new lessons don't clear it). */
      completedAt: string | null;
      /** Sent by the public profile endpoint. */
      title?: string;
    }[];
  } | null;
  teaching: {
    joinedAt: string;
    courses: number;
    students: number;
    lessons: number;
    /** Distinct fields the teacher's courses are in. */
    fields?: number;
    /** Course sales, refunded ones excluded. */
    sales?: number;
    /** Times a student finished one of the teacher's courses. */
    graduates?: number;
  } | null;
  /**
   * Community activity: when each discussion the user started was opened, when they first replied
   * to each discussion someone else started, how many accepted friends they have and how many likes
   * other people gave their posts.
   */
  social?: { threads: string[]; joined: string[]; friends: number; likes?: number } | null;
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
  | "architect"
  | "discussion"
  | "voice"
  | "friends"
  | "streak"
  | "sprint"
  | "helpful"
  | "sales";

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

/**
 * Consecutive-day runs over yyyy-mm-dd days: entry n-1 is the first day a run of n days was
 * reached, so the length is the longest streak.
 */
export function streakDays(days: string[]): string[] {
  const reached: string[] = [];
  let run = 0;
  let prev = Number.NaN;
  for (const d of [...new Set(days)].sort()) {
    const at = Date.parse(d);
    if (Number.isNaN(at)) continue;
    run = at - prev === DAY ? run + 1 : 1;
    prev = at;
    if (run > reached.length) reached.push(d);
  }
  return reached;
}

/** A course finished within this many days of its first lesson counts for the sprint badges. */
export const SPRINT_DAYS = 7;

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
// one pair for the student's strongest field, so every student has the same catalogue
const FIELD_RANKS: Rule[] = [
  ["specialist", "specialist", "rare", 3],
  ["master", "specialist", "epic", 5],
];
const STREAK: Rule[] = [
  ["steady", "streak", "common", 3],
  ["consistent", "streak", "rare", 7],
  ["unstoppable", "streak", "epic", 30],
];
const SPRINT: Rule[] = [
  ["sprinter", "sprint", "uncommon", 1],
  ["speedrunner", "sprint", "epic", 5],
];

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
const SALES: Rule[] = [
  ["firstSale", "sales", "common", 1],
  ["bestseller", "sales", "rare", 25],
  ["blockbuster", "sales", "legendary", 100],
];
const GRADUATES: Rule[] = [
  ["firstGraduate", "graduate", "uncommon", 1],
  ["graduateMaker", "graduate", "rare", 10],
  ["almaMater", "graduate", "epic", 50],
];
const TEACHING_FIELDS: Rule[] = [["versatile", "polymath", "rare", 3]];
const DAYS: Rule[] = [
  ["senior", "senior", "rare", 180],
  ["veteran", "senior", "epic", 365],
  ["pillar", "senior", "legendary", 730],
];

// community badges, in every role's catalogue
const THREADS: Rule[] = [
  ["icebreaker", "discussion", "common", 1],
  ["discussionLeader", "discussion", "rare", 10],
];
const JOINED: Rule[] = [
  ["contributor", "voice", "common", 1],
  ["regular", "voice", "uncommon", 10],
  ["communityPillar", "voice", "epic", 50],
];
const LIKES: Rule[] = [
  ["appreciated", "helpful", "common", 1],
  ["helpful", "helpful", "rare", 25],
  ["beloved", "helpful", "epic", 100],
];
const FRIENDS: Rule[] = [
  ["firstFriend", "friends", "common", 1],
  ["socialCircle", "friends", "uncommon", 5],
  ["networker", "friends", "rare", 15],
  ["connector", "friends", "epic", 30],
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

  // One catalogue per role: an instructor earns teaching badges only, so every account of a role
  // has the same total and courses a teacher studies (often in their own field) never mix in.
  const te = stats.teaching;
  const l = te ? null : stats.learning;
  if (l) {
    const done = l.courses.filter((c) => c.completedAt);
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

    // specialist and master: the most courses finished in a single field, titled after it
    const perField = new Map<string, string[]>();
    for (const c of done)
      perField.set(c.category, [...(perField.get(c.category) ?? []), c.completedAt!]);
    const best = [...perField].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
    )[0];
    for (const rule of FIELD_RANKS) {
      const [id, , , target] = rule;
      // the earliest date any field reached the target
      const at = [...perField.values()]
        .map((d) => nth(d, target))
        .filter(Boolean)
        .sort()[0];
      add(
        rule,
        best?.[1].length ?? 0,
        // named after the strongest field once there is one, like the title
        best?.[0]
          ? t("badges.specialist.criteria", { count: target, field: label(best[0]) })
          : t("badges.specialist.anyCriteria", { count: target }),
        () => at,
        best?.[0] ? t(`badges.${id}.title`, { field: label(best[0]) }) : t(`badges.${id}.anyTitle`),
      );
    }

    const streak = streakDays(l.lessonDays ?? []);
    ladder(
      STREAK,
      streak.length,
      (_, count) => t("badges.steady.criteria", { count }),
      (n) => streak[n - 1],
    );
    const sprints = done
      .filter(
        (c) =>
          c.startedAt && Date.parse(c.completedAt!) - Date.parse(c.startedAt) <= SPRINT_DAYS * DAY,
      )
      .map((c) => c.completedAt!);
    ladder(
      SPRINT,
      sprints.length,
      (_, count) => t("badges.sprinter.criteria", { count, days: SPRINT_DAYS }),
      (n) => nth(sprints, n),
    );
  }

  if (te) {
    const joined = new Date(te.joinedAt).getTime();
    const days = Math.max(0, Math.floor((Date.now() - joined) / DAY));
    ladder(COURSES, te.courses, (_, count) => t("badges.author.criteria", { count }));
    ladder(STUDENTS, te.students, (_, count) => t("badges.mentor.criteria", { count }));
    ladder(LESSONS_TAUGHT, te.lessons, (_, count) => t("badges.architect.criteria", { count }));
    ladder(SALES, te.sales ?? 0, (_, count) => t("badges.firstSale.criteria", { count }));
    ladder(GRADUATES, te.graduates ?? 0, (_, count) =>
      t("badges.firstGraduate.criteria", { count }),
    );
    ladder(TEACHING_FIELDS, te.fields ?? 0, (_, count) =>
      t("badges.versatile.criteria", { count }),
    );
    ladder(
      DAYS,
      days,
      (_, count) => t("badges.senior.criteria", { count }),
      (n) => new Date(joined + n * DAY).toISOString(),
    );
  }
  // every participant (student or teacher) gets the same community ladders; a profile whose
  // activity is hidden counts as none
  if (l || te) {
    const so = stats.social ?? { threads: [], joined: [], friends: 0 };
    ladder(
      THREADS,
      so.threads.length,
      (_, count) => t("badges.icebreaker.criteria", { count }),
      (n) => nth(so.threads, n),
    );
    ladder(
      JOINED,
      so.joined.length,
      (_, count) => t("badges.contributor.criteria", { count }),
      (n) => nth(so.joined, n),
    );
    // friendships keep no acceptance date, so these carry none
    ladder(FRIENDS, so.friends, (_, count) => t("badges.firstFriend.criteria", { count }));
    ladder(LIKES, so.likes ?? 0, (_, count) => t("badges.appreciated.criteria", { count }));
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

/** The badges a profile shows off: only the pinned ones still earned, in pin order. */
export function featuredBadges(badges: Badge[], pinned: string[] | null | undefined): Badge[] {
  return (pinned ?? [])
    .map((id) => badges.find((b) => b.id === id && b.earned))
    .filter((b): b is Badge => !!b)
    .slice(0, MAX_FEATURED);
}
