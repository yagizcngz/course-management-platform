import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createDemoApi,
  roleOf,
  DEMO_READ_ONLY,
  type Role,
  type Snapshot,
} from "../src/demo/api.ts";

// the recorded snapshot drives the demo exactly as in the browser
const load = async (role: Role) =>
  JSON.parse(
    readFileSync(new URL(`../src/demo/snapshot/${role}.json`, import.meta.url), "utf8"),
  ) as Snapshot;

const signIn = async (api: ReturnType<typeof createDemoApi>, username: string) => {
  const res = await api(
    "POST",
    "/api/auth/login",
    null,
    JSON.stringify({ username, password: "anything" }),
  );
  assert.equal(res.status, 200);
  return `Bearer ${(res.body as { token: string }).token}`;
};

test("demo accounts sign in with any password; anyone else is refused", async () => {
  const api = createDemoApi(load);
  const student = await signIn(api, "demo_student");
  assert.equal(roleOf(student), "student");
  assert.equal(roleOf(await signIn(api, "demo_admin")), "admin");
  const exp = JSON.parse(atob(student.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp;
  assert.ok(exp * 1000 > Date.now() + 7 * 86_400_000, "the token must not expire during a visit");
  assert.equal((await api("POST", "/api/auth/login", null, '{"username":"someone"}')).status, 401);
});

test("reads come from the role's snapshot, paths are case-insensitive", async () => {
  const api = createDemoApi(load);
  const admin = await signIn(api, "demo_admin");
  const student = await signIn(api, "demo_student");
  assert.equal((await api("GET", "/api/Courses", null)).status, 200);
  assert.equal((await api("GET", "/api/students", admin)).status, 200);
  assert.equal((await api("GET", "/api/students", student)).status, 403); // as the real API answers
});

test("buying a course takes the price, enrolls, and a refund undoes it", async () => {
  const api = createDemoApi(load);
  const auth = await signIn(api, "demo_student");
  const wallet = async () =>
    (await api("GET", "/api/wallet/me", auth)).body as {
      balance: number;
      ownedCourseIds: number[];
    };
  const courses = (await api("GET", "/api/courses", auth)).body as { id: number; price: number }[];
  const before = await wallet();
  const target = courses.find(
    (c) => !before.ownedCourseIds.includes(c.id) && c.price <= before.balance,
  )!;

  const bought = await api("POST", `/api/wallet/purchase/${target.id}`, auth);
  assert.equal(bought.status, 200);
  assert.equal((await wallet()).balance, before.balance - target.price);
  const page = (await api("GET", `/api/courses/${target.id}/lessons`, auth)).body as {
    isEnrolled: boolean;
    lessons: { id: number }[];
  };
  assert.equal(page.isEnrolled, true);
  const mine = (await api("GET", "/api/enrollments/my-courses", auth)).body as {
    courseId: number;
  }[];
  assert.ok(mine.some((e) => e.courseId === target.id));

  const done = await api(
    "POST",
    `/api/courses/${target.id}/lessons/${page.lessons[0].id}/complete`,
    auth,
    "{}",
  );
  assert.equal((done.body as { completedLessons: number }).completedLessons, 1);

  assert.equal((await api("POST", `/api/wallet/refund/${target.id}`, auth)).status, 200);
  assert.equal((await wallet()).balance, before.balance);
  assert.equal(
    ((await api("GET", `/api/courses/${target.id}/lessons`, auth)).body as { isEnrolled: boolean })
      .isEnrolled,
    false,
  );
});

test("a new forum thread and reply show up in the topic, and likes toggle", async () => {
  const api = createDemoApi(load);
  const auth = await signIn(api, "demo_student");
  const created = await api(
    "POST",
    "/api/forum/topics/software/threads",
    auth,
    JSON.stringify({ title: "Hello", body: "First post" }),
  );
  const id = (created.body as { id: number }).id;
  await api("POST", `/api/forum/threads/${id}/posts`, auth, JSON.stringify({ body: "A reply" }));
  const list = (await api("GET", "/api/forum/topics/software/threads", auth)).body as {
    id: number;
    replies: number;
  }[];
  assert.equal(list[0].id, id);
  assert.equal(list[0].replies, 1);
  const thread = (await api("GET", `/api/forum/threads/${id}`, auth)).body as {
    posts: { id: number }[];
  };
  const like = await api("POST", `/api/forum/posts/${thread.posts[1].id}/like`, auth);
  assert.deepEqual(like.body, { liked: true, likes: 1 });
});

test("other changes, and every change by a guest, are refused with the demo message", async () => {
  const api = createDemoApi(load);
  const auth = await signIn(api, "demo_admin");
  assert.deepEqual(await api("DELETE", "/api/courses/9", auth), {
    status: 403,
    body: DEMO_READ_ONLY,
  });
  assert.equal((await api("POST", "/api/forum/topics/software/threads", null, "{}")).status, 403);
  // a reload starts from the snapshot again
  const fresh = createDemoApi(load);
  const s = await signIn(fresh, "demo_student");
  const original = (await load("student")).responses["GET /api/wallet/me"][1] as {
    balance: number;
  };
  assert.equal(
    ((await fresh("GET", "/api/wallet/me", s)).body as { balance: number }).balance,
    original.balance,
  );
});
