// node --test scripts/ (Node 24 runs TypeScript directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  emptyWatch,
  seekAllowed,
  watchedShare,
  REQUIRED_SHARE,
} from "../src/lib/watchProgress.ts";

/** Plays from `from` to `to` in timeupdate-sized steps. */
const play = (s = emptyWatch(), from: number, to: number, rate = 1, step = 0.25) => {
  for (let t = from; t < to; t += step * rate)
    s = advance(s, t, Math.min(t + step * rate, to), rate);
  return s;
};

test("scrubbing to the end earns nothing", () => {
  let s = play(undefined, 0, 5);
  s = advance(s, 5, 99, 1); // a seek is one huge step
  assert.ok(watchedShare(s, 100) < 0.1);
  assert.equal(seekAllowed(s, 99), false);
  assert.equal(seekAllowed(s, 6), true);
});

test("watching most of the video reaches the threshold, rewatching does not double count", () => {
  let s = play(undefined, 0, 90);
  s = play(s, 0, 30);
  assert.ok(watchedShare(s, 100) >= REQUIRED_SHARE);
  assert.ok(watchedShare(s, 100) <= 0.92);
});

test("2x counts, faster rates do not", () => {
  assert.ok(watchedShare(play(undefined, 0, 100, 2), 100) >= REQUIRED_SHARE);
  assert.equal(watchedShare(play(undefined, 0, 100, 4), 100), 0);
});
