import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => ({
  // `vite build --mode demo`: the static demo, no API server (src/demo)
  define: mode === "demo" ? { "import.meta.env.VITE_DEMO": JSON.stringify("true") } : {},
  server: { host: "::", port: 8080 },
  css: { transformer: "lightningcss" },
  resolve: {
    tsconfigPaths: true,
    alias: { "@": `${process.cwd()}/src` },
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // src/server.ts is our SSR error wrapper
      server: { entry: "server" },
    }),
    ...(command === "build"
      ? // the demo is hosted on Vercel: *.workers.dev is blocked on some networks (e.g. in Turkey)
        [nitro(mode === "demo" ? { preset: "vercel" } : { defaultPreset: "cloudflare-module" })]
      : []),
    viteReact(),
  ],
}));
