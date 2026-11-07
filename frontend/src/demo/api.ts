// The API of the static demo (VITE_DEMO=true): answers the app's requests from recorded API answers
// (scripts/capture-demo.mjs) so the site runs with no server or database. Logins for the three demo accounts
// accept any password; buying, refunding, topping up, joining or leaving a course, finishing a lesson and the
// forum's threads, replies and likes change an in-memory copy that resets on reload. Any other change is
// refused with DEMO_READ_ONLY. Pure: no window, so node tests can drive it.

export type Role = "guest" | "student" | "teacher" | "admin";
export type Snapshot = {
  claims: Record<string, unknown> | null;
  responses: Record<string, [number, unknown]>;
};
export type DemoResponse = { status: number; body: unknown };

export const DEMO_ACCOUNTS: Record<string, Exclude<Role, "guest">> = {
  demo_student: "student",
  demo_teacher: "teacher",
  demo_admin: "admin",
};
export const DEMO_READ_ONLY = "Demo modunda değişiklikler kaydedilmez.";

const b64url = (text: string) => {
  let bin = "";
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (part: string) => {
  const bin = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

/** An unsigned token with the recorded claims; only the browser reads it. */
export const demoToken = (claims: Record<string, unknown>) =>
  [
    b64url(JSON.stringify({ alg: "none", typ: "JWT" })),
    b64url(
      JSON.stringify({
        ...claims,
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        jti: String(Math.random()).slice(2),
      }),
    ),
    "demo",
  ].join(".");

export const roleOf = (authorization: string | null): Role => {
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return "guest";
  try {
    return DEMO_ACCOUNTS[JSON.parse(fromB64url(token.split(".")[1])).username] ?? "guest";
  } catch {
    return "guest";
  }
};

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function createDemoApi(load: (role: Role) => Promise<Snapshot>) {
  // one live copy per role for the page's lifetime: the demo's "database"
  const copies = new Map<Role, Promise<Snapshot>>();
  const snapshot = (role: Role) => {
    if (!copies.has(role))
      copies.set(
        role,
        load(role).then((s) => structuredClone(s)),
      );
    return copies.get(role)!;
  };
  let nextId = 900_000;

  return async function handle(
    method: string,
    pathWithQuery: string,
    authorization: string | null,
    rawBody?: string,
  ): Promise<DemoResponse> {
    const path = pathWithQuery.toLowerCase();
    method = method.toUpperCase();
    const ok = (body: unknown = {}) => ({ status: 200, body });
    const bad = (message: string, status = 400) => ({ status, body: message });
    let body: Json = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      // form data (uploads) carries no JSON
    }

    if (method === "POST" && path === "/api/auth/login") {
      const name = String(body.username ?? "")
        .trim()
        .toLowerCase();
      const account = Object.keys(DEMO_ACCOUNTS).find(
        (u) => u === name || `${u}@example.test` === name,
      );
      if (!account) return bad("Geçersiz kullanıcı adı veya şifre.", 401);
      const { claims } = await snapshot(DEMO_ACCOUNTS[account]);
      return ok({ token: demoToken(claims ?? {}) });
    }

    const role = roleOf(authorization);
    const s = await snapshot(role);
    const r = s.responses;
    const get = (p: string): Json | undefined => {
      const hit = r[`GET ${p}`];
      return hit && hit[0] < 300 ? (hit[1] as Json) : undefined;
    };

    if (method === "GET" && path.startsWith("/api/friends/search?")) {
      // free text cannot be recorded: search the recorded profile cards like the API does (2+ letters, max 20)
      const term = (new URLSearchParams(pathWithQuery.split("?")[1]).get("q") ?? "")
        .trim()
        .toLowerCase();
      if (term.length < 2) return ok([]);
      const me = get("/api/profile/me")?.id;
      const cards = Object.entries(r)
        .filter(([k, [status]]) => status === 200 && k.startsWith("GET /api/profile/public/user/"))
        .map(([, [, p]]) => p as Json)
        .filter(
          (p) =>
            p.userId !== me &&
            `${p.username} ${p.firstName} ${p.lastName}`.toLowerCase().includes(term),
        )
        .sort((a, b) => a.username.localeCompare(b.username))
        .slice(0, 20)
        .map((p) => ({
          id: p.userId,
          username: p.username,
          firstName: p.firstName,
          lastName: p.lastName,
          role: p.role,
          profilePictureUrl: p.profilePictureUrl ?? null,
        }));
      return ok(cards);
    }
    if (method === "GET") {
      const hit = r[`GET ${path}`];
      // a copy: callers must not hold the live state
      if (hit) return { status: hit[0], body: structuredClone(hit[1]) };
      // a signed-in endpoint asked without a token: the real API answers 401
      if (role === "guest") return bad("", 401);
      console.warn(`[demo] no recorded answer for GET ${pathWithQuery}`);
      return bad("Not in the demo snapshot.", 404);
    }
    if (role === "guest") return bad(DEMO_READ_ONLY, 403);

    const me = get("/api/profile/me") ?? {};
    const card = () => ({
      id: me.id,
      username: me.username,
      firstName: me.firstName,
      lastName: me.lastName,
      role: (s.claims ?? {})["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
      profilePictureUrl: me.profilePictureUrl ?? null,
    });
    const now = () => new Date().toISOString();
    const wallet = get("/api/wallet/me");
    const course = (id: number) =>
      (get("/api/courses") as Json[] | undefined)?.find((c) => c.id === id);
    const lessonsOf = (id: number) => get(`/api/courses/${id}/lessons`);
    const myCourses = () => (get("/api/enrollments/my-courses") as Json[] | undefined) ?? [];

    const enroll = (id: number) => {
      const c = course(id);
      const page = lessonsOf(id);
      if (!c || !page) return;
      Object.assign(page, { isEnrolled: true, hasAccess: true });
      if (!myCourses().some((e) => e.courseId === id))
        myCourses().unshift({
          id: nextId++,
          studentId: myCourses()[0]?.studentId ?? 0,
          studentFullName: `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim(),
          studentNumber: myCourses()[0]?.studentNumber ?? "",
          courseTitle: c.title,
          courseId: id,
          enrollmentDate: now(),
          status: "Devam Ediyor",
          completedLessons: page.completedLessonIds?.length ?? 0,
          totalLessons: page.lessons?.length ?? 0,
          progressPercent: page.progressPercent ?? 0,
          completedAt: null,
        });
    };
    const leave = (id: number) => {
      const page = lessonsOf(id);
      if (page) Object.assign(page, { isEnrolled: false, hasAccess: false });
      const list = myCourses();
      const at = list.findIndex((e) => e.courseId === id);
      if (at >= 0) list.splice(at, 1);
    };

    let m: RegExpMatchArray | null;

    // --- wallet ---
    if (method === "POST" && path === "/api/wallet/top-up" && wallet) {
      const amount = Number(body.amount);
      if (!(amount > 0 && amount <= 10000))
        return bad("Yükleme tutarı 0 ile 10.000 TL arasında, en fazla 2 ondalıklı olmalı.");
      wallet.balance += amount;
      wallet.transactions.unshift({
        id: nextId++,
        amount,
        type: "TopUp",
        description: "Bakiye yükleme",
        createdAt: now(),
      });
      return ok({ balance: wallet.balance });
    }
    if (method === "POST" && (m = path.match(/^\/api\/wallet\/purchase\/(\d+)$/)) && wallet) {
      const id = Number(m[1]);
      const c = course(id);
      if (!c) return bad("Kurs bulunamadı.");
      if (wallet.ownedCourseIds.includes(id))
        return bad(
          "Bu kursa zaten sahipsiniz. Kurs sayfasından ücretsiz olarak tekrar katılabilirsiniz.",
        );
      if (wallet.balance < c.price)
        return bad("Yetersiz bakiye. Lütfen cüzdanınıza bakiye yükleyin.");
      wallet.balance -= c.price;
      wallet.spent += c.price;
      wallet.ownedCourseIds.push(id);
      wallet.refundableCourseIds.push(id);
      const purchasedAt = now();
      wallet.transactions.unshift({
        id: nextId++,
        amount: -c.price,
        type: "Purchase",
        courseId: id,
        description: c.title,
        createdAt: purchasedAt,
      });
      wallet.purchases.unshift({
        courseId: id,
        title: c.title,
        purchasedAt,
        refundableUntil: new Date(Date.now() + wallet.refundWindowDays * 86_400_000).toISOString(),
        refundable: true,
        refundedBefore: false,
      });
      enroll(id);
      return ok({ balance: wallet.balance, message: "Kurs satın alındı." });
    }
    if (method === "POST" && (m = path.match(/^\/api\/wallet\/refund\/(\d+)$/)) && wallet) {
      const id = Number(m[1]);
      const purchase = wallet.purchases.find((p: Json) => p.courseId === id && p.refundable);
      if (!purchase) return bad("Bu kurs için iade edilebilir bir satın alma yok.");
      const price = course(id)?.price ?? 0;
      wallet.balance += price;
      wallet.spent -= price;
      Object.assign(purchase, { refundable: false, refundedBefore: true });
      wallet.ownedCourseIds = wallet.ownedCourseIds.filter((x: number) => x !== id);
      wallet.refundableCourseIds = wallet.refundableCourseIds.filter((x: number) => x !== id);
      wallet.transactions.unshift({
        id: nextId++,
        amount: price,
        type: "Refund",
        courseId: id,
        description: purchase.title,
        createdAt: now(),
      });
      leave(id);
      return ok({ balance: wallet.balance, message: "İade edildi." });
    }

    // --- enrollment and lessons ---
    if (method === "POST" && (m = path.match(/^\/api\/enrollments\/join\/(\d+)$/))) {
      const id = Number(m[1]);
      if ((course(id)?.price ?? 0) > 0 && !wallet?.ownedCourseIds.includes(id))
        return bad("Bu kurs ücretli. Lütfen satın alın.");
      enroll(id);
      return ok({ message: "Kursa başarıyla katıldınız!" });
    }
    if (method === "DELETE" && (m = path.match(/^\/api\/enrollments\/leave\/(\d+)$/))) {
      leave(Number(m[1]));
      return ok({ message: "Kurstan başarıyla ayrıldınız." });
    }
    if (
      method === "POST" &&
      (m = path.match(/^\/api\/courses\/(\d+)\/lessons\/(\d+)\/complete$/))
    ) {
      const id = Number(m[1]);
      const page = lessonsOf(id);
      if (!page?.isEnrolled) return bad("Bu kursa kayıtlı değilsiniz.", 403);
      const done: number[] = page.completedLessonIds;
      if (!done.includes(Number(m[2]))) done.push(Number(m[2]));
      const total = page.lessons.length;
      page.progressPercent = total ? Math.round((done.length / total) * 100) : 0;
      const complete = total > 0 && done.length >= total;
      const row = myCourses().find((e) => e.courseId === id);
      if (row)
        Object.assign(row, {
          completedLessons: done.length,
          totalLessons: total,
          progressPercent: page.progressPercent,
          ...(complete && !row.completedAt && { completedAt: now(), status: "Tamamlandı" }),
        });
      return ok({
        completedLessons: done.length,
        totalLessons: total,
        progressPercent: page.progressPercent,
        completed: complete,
      });
    }

    // --- forum ---
    const topics = () => (get("/api/forum/topics") as Json[] | undefined) ?? [];
    const threadsOf = (slug: string) =>
      get(`/api/forum/topics/${slug}/threads`) as Json[] | undefined;
    if (method === "POST" && (m = path.match(/^\/api\/forum\/topics\/([\w-]+)\/threads$/))) {
      const list = threadsOf(m[1]);
      const title = String(body.title ?? "").trim();
      const text = String(body.body ?? "").trim();
      if (!list || !title || !text) return bad("Başlık bulunamadı.", 404);
      const id = nextId++;
      const at = now();
      list.unshift({
        id,
        title,
        createdAt: at,
        lastActivityAt: at,
        replies: 0,
        excerpt: text.slice(0, 200),
        author: card(),
      });
      r[`GET /api/forum/threads/${id}`] = [
        200,
        {
          id,
          topic: m[1],
          title,
          createdAt: at,
          posts: [
            { id: nextId++, body: text, createdAt: at, likes: 0, likedByMe: false, author: card() },
          ],
        },
      ];
      const topic = topics().find((t) => t.slug === m![1]);
      if (topic)
        Object.assign(topic, {
          threads: topic.threads + 1,
          posts: topic.posts + 1,
          lastActivityAt: at,
        });
      return ok({ id });
    }
    if (method === "POST" && (m = path.match(/^\/api\/forum\/threads\/(\d+)\/posts$/))) {
      const thread = get(`/api/forum/threads/${m[1]}`);
      const text = String(body.body ?? "").trim();
      if (!thread || !text) return bad("Başlık bulunamadı.", 404);
      const at = now();
      const id = nextId++;
      thread.posts.push({
        id,
        body: text,
        createdAt: at,
        likes: 0,
        likedByMe: false,
        author: card(),
      });
      const item = threadsOf(thread.topic)?.find((t) => t.id === thread.id);
      if (item) Object.assign(item, { replies: item.replies + 1, lastActivityAt: at });
      const topic = topics().find((t) => t.slug === thread.topic);
      if (topic) Object.assign(topic, { posts: topic.posts + 1, lastActivityAt: at });
      return ok({ id });
    }
    const findPost = (postId: number) => {
      for (const [k, [status, v]] of Object.entries(r)) {
        if (status !== 200 || !k.startsWith("GET /api/forum/threads/")) continue;
        const thread = v as Json;
        const index = thread.posts?.findIndex((p: Json) => p.id === postId) ?? -1;
        if (index >= 0) return { key: k, thread, index };
      }
      return null;
    };
    if (method === "POST" && (m = path.match(/^\/api\/forum\/posts\/(\d+)\/like$/))) {
      const hit = findPost(Number(m[1]));
      if (!hit) return bad("", 404);
      const post = hit.thread.posts[hit.index];
      post.likedByMe = !post.likedByMe;
      post.likes += post.likedByMe ? 1 : -1;
      return ok({ liked: post.likedByMe, likes: post.likes });
    }
    if (method === "DELETE" && (m = path.match(/^\/api\/forum\/posts\/(\d+)$/))) {
      const hit = findPost(Number(m[1]));
      if (!hit) return bad("", 404);
      const post = hit.thread.posts[hit.index];
      if (post.author?.id !== me.id && role !== "admin") return bad(DEMO_READ_ONLY, 403);
      const opening = hit.index === 0;
      const list = threadsOf(hit.thread.topic);
      if (opening) {
        delete r[hit.key];
        const at = list?.findIndex((t) => t.id === hit.thread.id) ?? -1;
        if (list && at >= 0) list.splice(at, 1);
      } else {
        hit.thread.posts.splice(hit.index, 1);
        const item = list?.find((t) => t.id === hit.thread.id);
        if (item) item.replies -= 1;
      }
      return ok({ threadDeleted: opening });
    }

    return bad(DEMO_READ_ONLY, 403);
  };
}
