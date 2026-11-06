// node --test scripts/ (Node 24 runs TypeScript directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import { SEALS, sealGraph } from "../src/components/effects/three/sealEmblems.ts";

test("a seal graph shares the stroke junctions and closes the ring", () => {
  const { nodes, edges } = sealGraph("teacher", 12);
  // book outline (10 points), spine and stand add the lectern foot, base adds its two ends
  assert.equal(nodes.length, 10 + 1 + 2 + 12);
  assert.equal(edges.length, 10 + 2 + 2 + 12);
  for (const [a, b] of edges) assert.notEqual(a, b);
  // the ring comes last and returns to its first star
  const ring = edges.slice(-12);
  assert.equal(ring[11][1], ring[0][0]);
});

test("every emblem point lies inside the ring", () => {
  for (const { strokes, dots = [] } of Object.values(SEALS))
    for (const [x, y] of [...strokes.flat(), ...dots])
      assert.ok(Math.hypot(x - 128, y - 128) < 100, `${x},${y}`);
});
