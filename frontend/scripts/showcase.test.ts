import { test } from "node:test";
import assert from "node:assert/strict";
import { showcaseRows, type CourseStats } from "../src/lib/showcase.ts";

const stat = (courseId: number, students: number, last7: number, prev7: number, last30: number) =>
  ({ courseId, students, last7, prev7, last30 }) satisfies CourseStats;

test("rows rank by students, recent joins, weekly rise and newness, skipping empty ones", () => {
  const courses = [
    { id: 1, createdAt: "2026-01-01T00:00:00Z" },
    { id: 2, createdAt: "2026-06-01T00:00:00Z" },
    { id: 3, createdAt: null },
  ];
  const rows = showcaseRows(courses, [stat(1, 50, 1, 4, 6), stat(2, 10, 5, 1, 9)]);
  const ids = Object.fromEntries(rows.map((r) => [r.kind, r.items.map((x) => x.course.id)]));
  assert.deepEqual(ids, {
    popular: [1, 2],
    hottest: [2, 1],
    trending: [2], // course 1 is falling, so it is not trending
    new: [2, 1], // no date, not in "new"
  });
});

test("no stats leaves only the new row, and rows are capped", () => {
  const courses = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    createdAt: `2026-01-${String(i + 1).padStart(2, "0")}`,
  }));
  const rows = showcaseRows(courses, [], 5);
  assert.deepEqual(
    rows.map((r) => r.kind),
    ["new"],
  );
  assert.deepEqual(
    rows[0].items.map((x) => x.course.id),
    [11, 10, 9, 8, 7],
  );
});
