import { test } from "node:test";
import assert from "node:assert/strict";
import { isTaughtBy } from "../src/components/courseHelpers.ts";

test("a known teacher id decides ownership, a same-named colleague's course is not mine", () => {
  assert.equal(isTaughtBy({ teacherId: 3, instructor: "Ada Lovelace" }, 3, "Ada Lovelace"), true);
  assert.equal(isTaughtBy({ TeacherId: "3" }, 3, ""), true);
  assert.equal(isTaughtBy({ teacherId: 9, instructor: "Ada Lovelace" }, 3, "Ada Lovelace"), false);
});

test("without a teacher row the instructor name is the fallback", () => {
  assert.equal(isTaughtBy({ Instructor: "Ada Lovelace" }, null, "Ada Lovelace"), true);
  assert.equal(isTaughtBy({ instructor: "" }, null, ""), false);
});
