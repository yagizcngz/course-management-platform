import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Signing out used to be copied into five places and some left `username` behind; only clearSession() may do it now.
const src = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  );

test("only lib/auth.ts removes the session token", () => {
  const offenders = files(src).filter(
    (f) =>
      !f.endsWith(join("lib", "auth.ts")) &&
      /removeItem\(\s*["']jwt_token["']\s*\)/.test(readFileSync(f, "utf8")),
  );
  assert.deepEqual(offenders, []);
});

test("clearSession lists every account key", () => {
  const auth = readFileSync(join(src, "lib", "auth.ts"), "utf8");
  const body = auth.slice(
    auth.indexOf("export const clearSession"),
    auth.indexOf("export const authHeaders"),
  );
  for (const key of ["jwt_token", "username", "user_profile"])
    assert.ok(body.includes(`"${key}"`), key);
});
