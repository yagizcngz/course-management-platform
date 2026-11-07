// node --test scripts/ (Node 24 runs TypeScript directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  badgeState,
  buildBadges,
  featuredBadges,
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

// community ladders every participant has: 2 discussion, 3 joined, 4 friend badges
const SOCIAL = 9;

test("a new student sees every learner badge, locked, with a generic specialist pair", () => {
  const badges = buildBadges(
    { learning: { completedLessons: 0, courses: [] }, teaching: null },
    t,
    String,
  );
  assert.equal(badges.length, 14 + SOCIAL);
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
  assert.equal(byId.size, 14 + SOCIAL);
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
  assert.equal(badges.length, 12 + SOCIAL);
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
  assert.equal(badges.length, 12 + SOCIAL);
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
