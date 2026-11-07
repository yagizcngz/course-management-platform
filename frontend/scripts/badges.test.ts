// node --test scripts/ (Node 24 runs TypeScript directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  badgeState,
  buildBadges,
  featuredBadges,
  streakDays,
  type AchievementStats,
} from "../src/lib/badges.ts";

// echoes the key so assertions need no locale files
const t = ((key: string) => key) as never;
const course = (courseId: number, category: string, completedAt: string | null) => ({
  courseId,
  category,
  percent: completedAt ? 100 : 40,
  completedAt,
});

// community ladders every participant has: 2 discussion, 3 joined, 4 friend, 3 like badges
const SOCIAL = 12;
// learner and teacher ladders; both roles have the same total
const LEARNER = 19;
const TEACHER = 19;

test("a new student sees every learner badge, locked, with a generic specialist pair", () => {
  const badges = buildBadges(
    { learning: { completedLessons: 0, courses: [] }, teaching: null },
    t,
    String,
  );
  assert.equal(badges.length, LEARNER + SOCIAL);
  assert.ok(badges.every((b) => badgeState(b) === "locked"));
  assert.equal(badges.find((b) => b.id === "specialist")?.title, "badges.specialist.anyTitle");
  assert.ok(badges.some((b) => b.id === "master"));
});

test("ladders unlock by target and date the earning course", () => {
  const stats: AchievementStats = {
    learning: {
      completedLessons: 20,
      courses: [
        course(1, "web", "2026-03-01"),
        course(2, "web", "2026-01-01"),
        course(3, "web", "2026-02-01"),
        course(4, "data", null),
      ],
    },
    teaching: null,
  };
  const byId = new Map(buildBadges(stats, t, String).map((b) => [b.id, b]));
  assert.equal(byId.get("graduate")?.earnedAt, "2026-01-01");
  assert.equal(byId.get("specialist")?.earnedAt, "2026-03-01");
  assert.equal(badgeState(byId.get("master")!), "progress");
  assert.equal(byId.get("master")?.current, 3);
  assert.equal(byId.get("explorer")?.earned, true);
  assert.equal(byId.get("scholar")?.earned, true);
  assert.equal(byId.get("devoted")?.current, 20);
  assert.equal(byId.size, LEARNER + SOCIAL);
});

test("every student has the same total, however many fields they study", () => {
  const fields = ["a", "b", "c", "d", "e"].map((f, i) => course(i, f, "2026-01-0" + (i + 1)));
  const one = buildBadges(
    { learning: { completedLessons: 3, courses: fields.slice(0, 1) }, teaching: null },
    t,
    String,
  );
  const five = buildBadges(
    { learning: { completedLessons: 9, courses: fields }, teaching: null },
    t,
    String,
  );
  assert.equal(one.length, five.length);
});

test("a teacher who also studies gets the teaching catalogue only", () => {
  const joinedAt = new Date().toISOString();
  const badges = buildBadges(
    {
      learning: { completedLessons: 40, courses: [course(1, "web", "2026-01-01")] },
      teaching: { joinedAt, courses: 1, students: 0, lessons: 3 },
    },
    t,
    String,
  );
  assert.equal(badges.length, TEACHER + SOCIAL);
  assert.ok(!badges.some((b) => b.id === "graduate" || b.id === "firstLesson"));
});

test("a profile features pinned earned badges only, never a fallback", () => {
  const badges = buildBadges(
    {
      learning: { completedLessons: 20, courses: [course(1, "web", "2026-01-01")] },
      teaching: null,
    },
    t,
    String,
  );
  assert.deepEqual(featuredBadges(badges, []), []);
  assert.deepEqual(featuredBadges(badges, null), []);
  // a pin on a locked or unknown badge shows nothing
  assert.deepEqual(
    featuredBadges(badges, ["sage", "gone", "graduate"]).map((b) => b.id),
    ["graduate"],
  );
});

test("teacher ladders cap progress at the target and sort earned rarest first", () => {
  const joinedAt = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const badges = buildBadges(
    { learning: null, teaching: { joinedAt, courses: 2, students: 60, lessons: 30 } },
    t,
    String,
  );
  assert.equal(badges.length, TEACHER + SOCIAL);
  const veteran = badges.find((b) => b.id === "veteran")!;
  assert.equal(veteran.earned, true);
  assert.equal(veteran.current, 365);
  const earned = badges.filter((b) => b.earned).map((b) => b.rarity);
  assert.deepEqual(earned.slice(0, 1), ["epic"]);
  assert.ok(badges.findIndex((b) => !b.earned) === earned.length);
});

test("community badges unlock from discussions started, joined and friends, retroactively", () => {
  const badges = buildBadges(
    {
      learning: null,
      teaching: { joinedAt: new Date().toISOString(), courses: 0, students: 0, lessons: 0 },
      social: {
        threads: ["2026-03-02", "2026-01-05"],
        joined: Array.from({ length: 10 }, (_, i) => `2026-02-${String(i + 10)}`),
        friends: 5,
      },
    },
    t,
    String,
  );
  const get = (id: string) => badges.find((b) => b.id === id)!;
  assert.equal(get("icebreaker").earned, true);
  assert.equal(get("icebreaker").earnedAt, "2026-01-05"); // the first discussion, not the latest
  assert.equal(get("discussionLeader").current, 2);
  assert.equal(get("contributor").earned, true);
  assert.equal(get("regular").earned, true);
  assert.equal(get("regular").earnedAt, "2026-02-19");
  assert.equal(get("communityPillar").earned, false);
  assert.equal(get("socialCircle").earned, true); // five friends
  assert.equal(get("socialCircle").earnedAt, undefined);
  assert.equal(get("networker").current, 5);
});

test("admins (no learning or teaching) get no badges, social activity or not", () => {
  const badges = buildBadges(
    { learning: null, teaching: null, social: { threads: ["2026-01-01"], joined: [], friends: 9 } },
    t,
    String,
  );
  assert.equal(badges.length, 0);
});

test("streaks count consecutive days and date the day each length was first reached", () => {
  assert.deepEqual(streakDays([]), []);
  // a 2-day run, a gap, then a 3-day run (duplicates and order don't matter)
  const days = ["2026-01-05", "2026-01-01", "2026-01-02", "2026-01-04", "2026-01-06", "2026-01-06"];
  assert.deepEqual(streakDays(days), ["2026-01-01", "2026-01-02", "2026-01-06"]);
  assert.deepEqual(streakDays(["2026-02-28", "2026-03-01", "bad"]), ["2026-02-28", "2026-03-01"]);
});

test("streak and sprint ladders unlock for learners", () => {
  const badges = buildBadges(
    {
      learning: {
        completedLessons: 3,
        lessonDays: ["2026-01-01", "2026-01-02", "2026-01-03"],
        courses: [
          { ...course(1, "web", "2026-01-03T10:00:00Z"), startedAt: "2026-01-01T10:00:00Z" },
          { ...course(2, "web", "2026-03-20T10:00:00Z"), startedAt: "2026-03-01T10:00:00Z" },
        ],
      },
      teaching: null,
    },
    t,
    String,
  );
  const get = (id: string) => badges.find((b) => b.id === id)!;
  assert.equal(get("steady").earnedAt, "2026-01-03");
  assert.equal(get("consistent").current, 3);
  assert.equal(get("sprinter").earned, true); // 2 days; the 19-day course is too slow
  assert.equal(get("speedrunner").current, 1);
});

test("a finished course keeps counting when a later lesson drops its progress", () => {
  const badges = buildBadges(
    {
      learning: {
        completedLessons: 4,
        courses: [{ ...course(1, "web", "2026-01-03"), percent: 80 }],
      },
      teaching: null,
    },
    t,
    String,
  );
  assert.equal(badges.find((b) => b.id === "graduate")?.earned, true);
});

test("teacher sales, graduates and fields ladders read the teaching stats", () => {
  const badges = buildBadges(
    {
      learning: null,
      teaching: {
        joinedAt: new Date().toISOString(),
        courses: 3,
        students: 5,
        lessons: 9,
        fields: 3,
        sales: 30,
        graduates: 4,
      },
      social: { threads: [], joined: [], friends: 0, likes: 25 },
    },
    t,
    String,
  );
  const get = (id: string) => badges.find((b) => b.id === id)!;
  assert.equal(get("bestseller").earned, true);
  assert.equal(get("blockbuster").current, 30);
  assert.equal(get("firstGraduate").earned, true);
  assert.equal(get("graduateMaker").current, 4);
  assert.equal(get("versatile").earned, true);
  assert.equal(get("helpful").earned, true);
});
