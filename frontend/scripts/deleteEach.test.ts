import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteEach } from "../src/lib/utils.ts";

test("a partial failure reports which ids went and how many did not", async () => {
  const result = await deleteEach([1, 2, 3, 4], async (id) => {
    if (id === 3) throw new TypeError("network down");
    return new Response(null, { status: id === 2 ? 403 : 200 });
  });
  assert.deepEqual(result, { deleted: [1, 4], failed: 2 });
});

test("all deleted means no failures", async () => {
  assert.deepEqual(await deleteEach([7], async () => new Response(null, { status: 204 })), {
    deleted: [7],
    failed: 0,
  });
});
