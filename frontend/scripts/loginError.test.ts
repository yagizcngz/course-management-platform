import { test } from "node:test";
import assert from "node:assert/strict";
import { loginFailureKey } from "../src/lib/loginError.ts";

test("only a 401 means wrong credentials; rate limits and server errors say so", () => {
  assert.equal(loginFailureKey(401), "login.invalidCredentials");
  assert.equal(loginFailureKey(429), "login.tooManyRequests");
  assert.equal(loginFailureKey(500), "backendErrors.unexpected");
  assert.equal(loginFailureKey(502), "backendErrors.unexpected");
});
