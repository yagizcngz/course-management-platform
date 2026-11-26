import { test } from "node:test";
import assert from "node:assert/strict";
import { EMAIL_PATTERN } from "../src/lib/utils.ts";

// how the browser applies an input's pattern attribute
const matches = (value: string) => new RegExp(`^(?:${EMAIL_PATTERN})$`, "v").test(value);

test("capital letters are accepted", () => {
  assert.equal(matches("Ali.Veli@Mail.com"), true);
  assert.equal(matches("ali_veli+kurs@ogrenci.example"), true);
});

test("addresses without a domain ending are refused", () => {
  for (const bad of ["ali@mail", "ali.mail.com", "@mail.com", "ali@.c"])
    assert.equal(matches(bad), false, bad);
});
