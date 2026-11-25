#!/usr/bin/env node
// Records the API's answers for the static demo (VITE_DEMO=true): logs into the local API as a guest and as
// demo_student, demo_teacher and demo_admin, calls every GET the frontend makes and writes
// src/demo/snapshot/<role>.json. The snapshot is published with the site, so capture from a freshly seeded
// database that holds only the generated demo data, never from one with real or hand-typed accounts. E.g. run the API
// with ConnectionStrings__DefaultConnection pointing at a new database (Development migrates and seeds it), then:
//   npm run demo:capture
// The demo password is read from DEMO_PASSWORD or backend/EdTechApi.API/appsettings.Development.json.
// Uploaded images the answers point at (/uploads/...) are copied to public/uploads; files already there are kept,
// so a copy shrunk for the web is not overwritten by the original.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = process.env.API ?? "http://localhost:5157";
const password =
  process.env.DEMO_PASSWORD ??
  JSON.parse(
    readFileSync(
      join(root, "../backend/EdTechApi.API/appsettings.Development.json"),
      "utf8",
    ).replace(/^﻿/, ""),
  ).Seed.DemoPassword;
const ROLES = {
  guest: null,
  student: "demo_student",
  teacher: "demo_teacher",
  admin: "demo_admin",
};

const key = (path) => `GET ${path.toLowerCase()}`;

async function capture(role, username) {
  let token = null;
  if (username) {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(`login ${username}: ${res.status}`);
    token = (await res.json()).token;
  }
  const out = {};
  const get = async (path) => {
    if (key(path) in out) return out[key(path)][1];
    const res = await fetch(API + path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const text = await res.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      // plain-text error message
    }
    out[key(path)] = [res.status, body];
    return res.ok ? body : null;
  };
  const list = (x) => (Array.isArray(x) ? x : []);

  // public pages
  await get("/api/Dashboard/GuestStats");
  const courses = list(await get("/api/Courses"));
  await get("/api/Courses/popular?count=4");
  await get("/api/lessons/outline");
  await get("/api/categories");
  await get("/api/teachers/public");
  await get("/api/courses/stats");
  for (const c of courses) {
    await get(`/api/courses/${c.id}/lessons`);
    await get(`/api/courses/${c.id}/rating`);
  }
  for (const topic of list(await get("/api/forum/topics"))) {
    for (const thread of list(await get(`/api/forum/topics/${topic.slug}/threads`)))
      await get(`/api/forum/threads/${thread.id}`);
  }

  if (token) {
    // unread count before the conversations are opened (opening marks them read)
    await get("/api/messages/unread-count");
    for (const p of [
      "/api/auth/me",
      "/api/profile/me",
      "/api/profile/achievements",
      "/api/wallet/me",
      "/api/courses/recommended",
      "/api/enrollments",
      "/api/enrollments/my-courses",
      "/api/students",
      "/api/teachers",
      "/api/announcements",
      "/api/friends",
      "/api/wallet/summary",
      "/api/students/deleted",
      "/api/teachers/deleted",
      "/api/courses/deleted",
      "/api/enrollments/deleted",
      "/api/teachers/me/branch-request",
      "/api/teachingrequests",
      "/api/teachingrequests/my-requests",
      "/api/TeacherApplications",
      "/api/teachers/branch-requests",
      "/api/supportrequests",
      "/api/supportrequests/my-requests",
      "/api/systemsettings",
      "/api/dashboard/pending-requests",
    ])
      await get(p);
    const analytics = await get("/api/teachers/me/analytics");
    for (const c of list(analytics?.courses ?? analytics))
      if (c?.courseId) await get(`/api/teachers/me/analytics/${c.courseId}/students`);
    for (const conv of list(await get("/api/messages/conversations")))
      if (conv?.user?.id) await get(`/api/messages/${conv.user.id}`);
  }
  return { token, out };
}

// every account a profile card can open: user ids from all captured answers, plus student and teacher rows
function collectIds(snapshots) {
  const ids = { user: new Set(), student: new Set(), teacher: new Set() };
  const walk = (v, parentKey) => {
    if (Array.isArray(v)) return v.forEach((x) => walk(x, parentKey));
    if (!v || typeof v !== "object") return;
    for (const [k, x] of Object.entries(v)) {
      if (
        /^(userId|authorId|requesterId|addresseeId|senderId|recipientId)$/i.test(k) &&
        Number.isInteger(x)
      )
        ids.user.add(x);
      if (
        /^id$/i.test(k) &&
        Number.isInteger(x) &&
        /^(author|user|partner)$/i.test(parentKey ?? "")
      )
        ids.user.add(x);
      walk(x, k);
    }
  };
  for (const { out } of snapshots) for (const [, body] of Object.values(out)) walk(body);
  const admin = snapshots.at(-1).out;
  for (const s of admin[key("/api/students")]?.[1] ?? []) ids.student.add(s.id);
  for (const t of admin[key("/api/teachers")]?.[1] ?? []) ids.teacher.add(t.id);
  return ids;
}

const results = {};
for (const [role, username] of Object.entries(ROLES)) results[role] = await capture(role, username);
const ids = collectIds(Object.values(results));

const dir = join(root, "src/demo/snapshot");
mkdirSync(dir, { recursive: true });
for (const [role, { token, out }] of Object.entries(results)) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  for (const [kind, set] of Object.entries(ids))
    for (const id of set) {
      const path = `/api/profile/public/${kind}/${id}`;
      const res = await fetch(API + path, { headers });
      out[key(path)] = [res.status, await res.json().catch(() => null)];
    }
  if (token)
    for (const id of ids.user) {
      for (const path of [`/api/friends/status/${id}`]) {
        const res = await fetch(API + path, { headers });
        if (res.status !== 404) out[key(path)] = [res.status, await res.json().catch(() => null)];
      }
    }
  // the token's claims (not its signature) let the demo answer logins with the same identity
  const claims = token
    ? JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
    : null;
  writeFileSync(join(dir, `${role}.json`), JSON.stringify({ claims, responses: out }));
  console.log(`${role}: ${Object.keys(out).length} answers`);
}

const uploads = new Set();
for (const role of Object.keys(ROLES))
  for (const m of readFileSync(join(dir, `${role}.json`), "utf8").matchAll(/\/uploads\/[\w\-./]+/g))
    uploads.add(m[0]);
for (const path of uploads) {
  const target = join(root, "public", path);
  if (existsSync(target)) continue;
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, "../backend/EdTechApi.API/wwwroot", path), target);
}
console.log(`uploads: ${uploads.size} referenced`);
