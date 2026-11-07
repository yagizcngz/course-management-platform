// Demo builds (VITE_DEMO=true) answer every /api request in the browser from the recorded snapshot (./api.ts);
// nothing reaches a server. Imported first by router.tsx so the patch is in place before any component fetches.
import { createDemoApi, DEMO_ACCOUNTS, type Role, type Snapshot } from "./api";

export const IS_DEMO = import.meta.env.VITE_DEMO === "true";

if (IS_DEMO && typeof window !== "undefined") {
  // one lazily loaded chunk per role
  const files = import.meta.glob<Snapshot>("./snapshot/*.json", { import: "default" });
  const handle = createDemoApi((role: Role) => files[`./snapshot/${role}.json`]());
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== location.origin || !url.pathname.toLowerCase().startsWith("/api/"))
      return realFetch(input, init);
    const body = request.method === "GET" ? undefined : await request.text();
    const res = await handle(
      request.method,
      url.pathname + url.search,
      request.headers.get("Authorization"),
      body,
    );
    if (res.status === 204 || res.body == null)
      return new Response(null, { status: res.status === 200 ? 204 : res.status });
    const json = typeof res.body !== "string";
    return new Response(json ? JSON.stringify(res.body) : (res.body as string), {
      status: res.status,
      headers: { "Content-Type": json ? "application/json" : "text/plain; charset=utf-8" },
    });
  };

  // ?demo=student|teacher|admin signs in as that demo account (links in the README, screenshots)
  const params = new URLSearchParams(location.search);
  const account = Object.keys(DEMO_ACCOUNTS).find((u) => DEMO_ACCOUNTS[u] === params.get("demo"));
  if (account) {
    window
      .fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: account, password: "demo" }),
      })
      .then((r) => r.json())
      .then(({ token }) => {
        localStorage.setItem("jwt_token", token);
        params.delete("demo");
        const query = params.toString();
        location.replace(
          `${location.pathname === "/" || location.pathname === "/login" ? "/dashboard" : location.pathname}${query ? `?${query}` : ""}`,
        );
      });
  }
}
