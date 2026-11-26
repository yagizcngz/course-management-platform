import { test } from "node:test";
import assert from "node:assert/strict";

// just enough of window/document for the loader: it appends <script> tags we can fail or fire
type FakeScript = { src: string; onerror?: () => void; remove: () => void };
const scripts: FakeScript[] = [];
const g = globalThis as Record<string, unknown>;
g.window = {};
g.document = {
  createElement: () => ({ src: "", remove() {} }) as FakeScript,
  head: { appendChild: (s: FakeScript) => scripts.push(s) },
};
const { loadYouTube } = await import("../src/lib/youtubeApi.ts");

test("a blocked script rejects instead of hanging, and the next call tries again", async () => {
  const first = loadYouTube();
  assert.equal(scripts.length, 1);
  scripts[0].onerror!();
  await assert.rejects(first);

  const second = loadYouTube();
  assert.equal(scripts.length, 2, "a new script tag is added for the retry");
  const w = g.window as { YT?: unknown; onYouTubeIframeAPIReady?: () => void };
  w.YT = { Player: class {} };
  w.onYouTubeIframeAPIReady!();
  assert.equal(await second, w.YT);
});
