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
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import "../i18n"; // Import i18n setup
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          / hata / 404
        </div>
        <h1 className="mt-4 text-7xl font-bold tracking-tight">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Sayfa bulunamadı</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-accent transition-colors"
        >
          Panele dön
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Bu sayfa yüklenemedi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bir sorun oluştu. Sayfayı yenilemeyi deneyebilir veya panele dönebilirsiniz.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-accent transition-colors"
          >
            Tekrar dene
          </button>
          <a
            href="/"
            className="rounded border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5 transition-colors"
          >
            Panele dön
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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeInitScript = `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';r.lang=localStorage.getItem('i18nextLng')||'tr';}catch(e){}})();`;

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

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
