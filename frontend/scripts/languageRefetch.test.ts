import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// An effect that lists `t` or `i18n` from useTranslation re-runs on every language switch (react-i18next hands out
// new ones); on these pages that reloads the data and wipes what the user was typing. They call i18next.t instead.
const files = ["src/routes/_authenticated.profil.tsx", "src/components/ProfileModal.tsx"];

test("profile effects do not depend on t or i18n", () => {
  for (const f of files) {
    const deps = [
      ...readFileSync(new URL(`../${f}`, import.meta.url), "utf8").matchAll(/\}, \[([^\]]*)\]\);/g),
    ];
    for (const [line, list] of deps)
      assert.ok(
        !list
          .split(",")
          .map((d) => d.trim())
          .some((d) => d === "t" || d === "i18n"),
        `${f}: ${line}`,
      );
  }
});
