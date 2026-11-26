import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrice } from "../src/components/courseHelpers.ts";

test("a valid price passes through, 0 means free", () => {
  assert.equal(parsePrice("399.99"), 399.99);
  assert.equal(parsePrice(" 0 "), 0);
});

test("blank, non-numeric and negative prices are rejected instead of becoming 0", () => {
  for (const bad of ["", "  ", "abc", "-5", "Infinity"]) assert.equal(parsePrice(bad), null, bad);
});
