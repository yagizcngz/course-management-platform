import { test } from "node:test";
import assert from "node:assert/strict";
import { tabOrDefault, tabsFor } from "../src/lib/settingsTabs.ts";

test("each role sees only its own sections", () => {
  assert.deepEqual(tabsFor(false), ["account", "security", "preferences", "privacy", "purchases"]);
  assert.deepEqual(tabsFor(true), [
    "account",
    "security",
    "preferences",
    "privacy",
    "system",
    "categories",
  ]);
});

test("a tab the role lacks falls back to account", () => {
  assert.equal(tabOrDefault("system", false), "account");
  assert.equal(tabOrDefault("purchases", true), "account");
  assert.equal(tabOrDefault(undefined, false), "account");
  assert.equal(tabOrDefault("purchases", false), "purchases");
  assert.equal(tabOrDefault("categories", true), "categories");
});
