import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { AppSidebar } from "../components/AppSidebar";

import { parseJwt } from "@/lib/auth";
export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

// Token'ın süresinin dolup dolmadığını kontrol eder.
// JWT'nin "exp" alanı UNIX timestamp'tir (saniye), Date.now() ise milisaniye döner.
const isTokenExpired = (token: string) => {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true; // decode edilemiyorsa güvenli tarafta kal
  const nowInSeconds = Date.now() / 1000;
  return payload.exp < nowInSeconds;
};

// Kontrolü tek bir yerden yapıp gerekirse login'e atan yardımcı fonksiyon
const checkAndHandleExpiry = (navigate: ReturnType<typeof useNavigate>) => {
  const token = localStorage.getItem("jwt_token");

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("username");
    navigate({ to: "/login", replace: true });
    return false;
  }
  return true;
};

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  const reduceMotion = useReducedMotion();

  // "idle" -> henüz kontrol edilmedi (ilk render)
  // "authed" -> token var ve süresi dolmamış, sayfayı göster
  // "unauthed" -> token yok veya süresi dolmuş, login'e yönlendiriliyor
  const [authState, setAuthState] = useState<"idle" | "authed" | "unauthed">("idle");

  useEffect(() => {
    // GÜVENLİK KALKANI — sadece tarayıcıda çalışır (SSR sırasında localStorage
    // yok, bu yüzden bu kontrolü beforeLoad'da değil, component mount olduktan
    // sonra client-side'da yapıyoruz).

    // 1) Layout ilk mount olduğunda hemen kontrol et
    const stillValid = checkAndHandleExpiry(navigate);
    setAuthState(stillValid ? "authed" : "unauthed");

    // 2) ÖNEMLİ: _authenticated layout'u, /ogrenciler, /kurslar, /kayitlar gibi
    // sayfalar arasında sidebar'dan gezinirken yeniden mount OLMUYOR — sadece
    // Outlet içeriği değişiyor. Bu yüzden tek seferlik kontrol yeterli değil;
    // token süresi uygulama açıkken dolarsa da yakalamak için periyodik olarak
    // (her 15 saniyede bir) tekrar kontrol ediyoruz.
    const intervalId = setInterval(() => {
      checkAndHandleExpiry(navigate);
    }, 15_000);

    return () => clearInterval(intervalId);
  }, [navigate]);

  // Kontrol tamamlanana kadar veya yönlendirme gerçekleşene kadar
  // korumalı içeriği asla göstermiyoruz.
  if (authState !== "authed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground animate-pulse">
          Yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-display text-foreground flex w-full">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        {/* keyed on the path so each page fades in; no exit animation to keep navigation instant */}
        <motion.div
          key={pathname}
          className="flex flex-1 flex-col min-w-0"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
