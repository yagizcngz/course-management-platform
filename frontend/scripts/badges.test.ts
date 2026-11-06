// node --test scripts/ (Node 24 runs TypeScript directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import { badgeState, buildBadges, type AchievementStats } from "../src/lib/badges.ts";

// echoes the key so assertions need no locale files
const t = ((key: string) => key) as never;
const course = (courseId: number, category: string, completedAt: string | null) => ({
  courseId,
  category,
  percent: completedAt ? 100 : 40,
  completedAt,
});

test("a new student sees every learner badge, locked, with a generic specialist pair", () => {
  const badges = buildBadges(
    { learning: { completedLessons: 0, courses: [] }, teaching: null },
    t,
    String,
  );
  assert.equal(badges.length, 14);
  assert.ok(badges.every((b) => badgeState(b) === "locked"));
  assert.ok(badges.some((b) => b.id === "specialist-any"));
  assert.ok(badges.some((b) => b.id === "master-any"));
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
  assert.equal(byId.get("specialist-web")?.earnedAt, "2026-03-01");
  assert.equal(badgeState(byId.get("master-web")!), "progress");
  assert.equal(byId.get("master-web")?.current, 3);
  assert.equal(badgeState(byId.get("master-data")!), "locked");
  assert.equal(byId.get("explorer")?.earned, true);
  assert.equal(byId.get("scholar")?.earned, true);
  assert.equal(byId.get("devoted")?.current, 20);
  assert.equal(byId.has("specialist-any"), false);
});

test("teacher ladders cap progress at the target and sort earned rarest first", () => {
  const joinedAt = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const badges = buildBadges(
    { learning: null, teaching: { joinedAt, courses: 2, students: 60, lessons: 30 } },
    t,
    String,
  );
  assert.equal(badges.length, 12);
  const veteran = badges.find((b) => b.id === "veteran")!;
  assert.equal(veteran.earned, true);
  assert.equal(veteran.current, 365);
  const earned = badges.filter((b) => b.earned).map((b) => b.rarity);
  assert.deepEqual(earned.slice(0, 1), ["epic"]);
  assert.ok(badges.findIndex((b) => !b.earned) === earned.length);
});
