import { test } from "node:test";
import assert from "node:assert/strict";
import { sitemapXml } from "../src/lib/sitemap.ts";

test("every <loc> is an absolute URL on the requesting host, community page included", () => {
  const locs = [...sitemapXml("https://ekurs.example").matchAll(/<loc>([^<]*)<\/loc>/g)].map(
    (m) => m[1],
  );
  assert.ok(locs.length > 0);
  for (const loc of locs) assert.match(loc, /^https:\/\/ekurs\.example\//);
  assert.ok(locs.includes("https://ekurs.example/topluluk"));
});
