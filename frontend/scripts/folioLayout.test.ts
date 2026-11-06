// The FolioScene promise: books never pass through one another while gathering or resting.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SHELF_X0,
  STACK_BOB,
  STACK_BREATH,
  STAGING_Y,
  folioLayout,
  gatherT,
} from "../src/components/effects/three/folioLayout.ts";

const N = 7;
const { dims, stack, shelf, halfW } = folioLayout(N);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const progresses = Array.from({ length: 401 }, (_, k) => k / 400);
// a book turning in the staging lane stays inside this sphere
const radius = Math.max(...dims.map((b) => Math.hypot(b.w, b.h, b.d) / 2));

test("stacked books keep clear vertically at every progress, bob included", () => {
  for (const p of progresses)
    for (let i = 0; i + 1 < N; i++) {
      const [ta, tb] = [gatherT(p, i, N), gatherT(p, i + 1, N)];
      const ya = lerp(stack[i].settled.y, stack[i].loose.y, 1 - ta);
      const yb = lerp(stack[i + 1].settled.y, stack[i + 1].loose.y, 1 - tb);
      const worstBob = STACK_BOB * (2 - ta - tb) + STACK_BREATH * Math.abs(ta - tb);
      const gap = yb - ya - worstBob - (dims[i].h + dims[i + 1].h) / 2;
      assert.ok(gap > 0, `stack ${i}/${i + 1} at p=${p}: gap ${gap}`);
    }
});

test("shelved books keep clear horizontally at every progress, leaning ones too", () => {
  for (const p of progresses)
    for (let i = 0; i + 1 < N; i++) {
      const [ta, tb] = [gatherT(p, i, N), gatherT(p, i + 1, N)];
      const [a, b] = [shelf[i], shelf[i + 1]];
      const xa = lerp(a.settled.x, a.loose.x, 1 - ta);
      const xb = lerp(b.settled.x, b.loose.x, 1 - tb);
      const need =
        halfW(i, lerp(a.settled.lean, 0, 1 - ta)) + halfW(i + 1, lerp(b.settled.lean, 0, 1 - tb));
      assert.ok(xb - xa > need, `shelf ${i}/${i + 1} at p=${p}: ${xb - xa} <= ${need}`);
    }
});

test("the two regions never overlap and the staging lane clears everything", () => {
  for (const p of progresses)
    for (let i = 0; i < N; i++) {
      const t = gatherT(p, i, N);
      const s = stack[i];
      const sx = lerp(s.settled.x, s.loose.x, 1 - t);
      const footprint = Math.hypot(dims[i].w, dims[i].d) / 2;
      assert.ok(sx + footprint < SHELF_X0, `stack book ${i} reaches the shelf region`);
      const stackTop =
        lerp(s.settled.y, s.loose.y, 1 - t) + dims[i].h / 2 + STACK_BOB + STACK_BREATH;
      // upright book: lean widens its height to halfH, pitch about x tips the cover depth up
      const b = shelf[i];
      const lean = Math.abs(lerp(b.settled.lean, 0, 1 - t));
      const pitch = Math.abs(lerp(0, b.loose.pitch, 1 - t));
      const halfH = (dims[i].h * Math.sin(lean) + dims[i].d * Math.cos(lean)) / 2;
      const shelfTop =
        lerp(b.settled.y, b.loose.y, 1 - t) +
        halfH * Math.cos(pitch) +
        (dims[i].w / 2) * Math.sin(pitch) +
        0.06;
      assert.ok(
        STAGING_Y - radius > Math.max(stackTop, shelfTop),
        `book ${i} reaches the staging lane`,
      );
    }
});
