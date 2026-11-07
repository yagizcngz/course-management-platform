import { pillButton } from "@/lib/utils";
import { useTranslation } from "react-i18next";
// src/routes/__root.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { getReduceMotion, REDUCE_MOTION_CHANGED } from "@/lib/motionPref";

import appCss from "../styles.css?url";
import i18n from "../i18n";
import { Toaster } from "sonner";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
          {t("errorPage.notFoundEyebrow")}
        </div>
        <h1 className="mt-4 font-serif text-8xl leading-none">404</h1>
        <h2 className="mt-4 font-serif text-2xl">{t("errorPage.notFoundTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("errorPage.notFoundBody")}</p>
        <Link to="/" className={`${pillButton.primary} mt-6`}>
          {t("errorPage.home")}
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-4xl leading-tight">{t("errorPage.crashTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errorPage.crashBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className={pillButton.primary}
          >
            {t("errorPage.retry")}
          </button>
          <a href="/" className={pillButton.outline}>
            {t("errorPage.home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // 2. GÜVENLİK KALKANI — sadece tarayıcıda çalışır (SSR sırasında localStorage yok,
  // bu yüzden sayfa yenilenince kullanıcı yanlışlıkla /login'e atılıyordu).

  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "E-Kurs — Eğitim Teknolojileri Yönetim Sistemi" },
      {
        name: "description",
        content:
          "Öğrenci ve kurs yönetimi için modern, güvenli ve REST tabanlı EdTech yönetim paneli.",
      },
      { property: "og:title", content: "E-Kurs Yönetim Paneli" },
      {
        property: "og:description",
        content: "EdTech için ölçeklenebilir öğrenci, kurs ve kayıt yönetimi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeInitScript = `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';r.lang=localStorage.getItem('i18nextLng')||'tr';if(localStorage.getItem('reduceMotion')==='1')r.setAttribute('data-reduce-motion','');}catch(e){}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const saved = localStorage.getItem("i18nextLng");
    if (!saved || saved === i18n.language) return;
    // Code-split route components can hydrate after this root effect; switching now would hydrate
    // them in a language other than the server HTML's. Wait for their chunks, then for an idle
    // browser (React has finished hydrating by then).
    let off = false;
    const apply = () => !off && i18n.changeLanguage(saved);
    Promise.all(
      router.state.matches.map((m) => router.loadRouteChunk(router.routesById[m.routeId])),
    )
      .catch(() => {})
      .then(() =>
        "requestIdleCallback" in window ? requestIdleCallback(apply) : setTimeout(apply, 50),
      );
    return () => {
      off = true;
    };
  }, [router]);

  // motion components follow the in-app setting as well as the OS one
  const [lessMotion, setLessMotion] = useState(false);
  useEffect(() => {
    const sync = () => setLessMotion(getReduceMotion());
    sync();
    window.addEventListener(REDUCE_MOTION_CHANGED, sync);
    return () => window.removeEventListener(REDUCE_MOTION_CHANGED, sync);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion={lessMotion ? "always" : "user"}>
        <Outlet />
      </MotionConfig>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
