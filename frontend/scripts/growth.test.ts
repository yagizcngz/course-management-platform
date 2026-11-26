import { test } from "node:test";
import assert from "node:assert/strict";
import { growthPercent, thisAndLastMonth } from "../src/lib/growth.ts";

test("new students this month are compared with last month's, not with everyone who joined earlier", () => {
  const now = new Date(2026, 10, 20); // 20 November 2026
  const dates = [
    ...Array(3).fill("2026-11-05T10:00:00"), // this month
    ...Array(6).fill("2026-10-12T10:00:00"), // last month
    ...Array(10).fill("2025-03-01T10:00:00"), // long ago
    undefined,
  ];
  const { current, previous } = thisAndLastMonth(dates, now);
  assert.deepEqual({ current, previous }, { current: 3, previous: 6 });
  assert.equal(growthPercent(current, previous), -50); // the old formula said +18.75% (3 / 16)
});

test("January compares with the previous December", () => {
  const { current, previous } = thisAndLastMonth(
    ["2027-01-02T09:00:00", "2026-12-31T09:00:00"],
    new Date(2027, 0, 15),
  );
  assert.deepEqual({ current, previous }, { current: 1, previous: 1 });
});

test("growth from zero is 100% for any rise and 0 otherwise", () => {
  assert.equal(growthPercent(4, 0), 100);
  assert.equal(growthPercent(0, 0), 0);
  assert.equal(growthPercent(15, 10), 50);
});
