import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";

/** Theme toggle shared by the public pages; the choice is stored like PageHeader does. */
export function useThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return { isDark, toggle };
}

export function Logo({ className = "text-2xl" }: { className?: string }) {
  return (
    <Link to="/" className={`font-serif leading-none text-foreground ${className}`}>
      E-<span className="text-gold italic">Kurs</span>
    </Link>
  );
}

export function PublicControls({ hideThemeToggle = false }: { hideThemeToggle?: boolean }) {
  const { t, i18n } = useTranslation();
  const { isDark, toggle } = useThemeToggle();
  const next = i18n.language?.startsWith("tr") ? "en" : "tr";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          i18n.changeLanguage(next);
          localStorage.setItem("i18nextLng", next);
        }}
        aria-label={t("header.language")}
        className="h-10 min-w-10 rounded-full px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        {next}
      </button>
      {!hideThemeToggle && (
        <button
          type="button"
          onClick={toggle}
          aria-label={t("header.toggleTheme")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

/** Section links of the public site; the hash targets live on the landing page. */
export const PUBLIC_LINKS = [
  { key: "courses", to: "/", hash: "courses" },
  { key: "categories", to: "/", hash: "categories" },
  { key: "teachers", to: "/", hash: "teachers" },
  { key: "about", to: "/hakkimizda", hash: undefined },
] as const;

function PublicNav() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("publicNav.label")} className="hidden items-center gap-1 lg:flex">
      {PUBLIC_LINKS.map((l) => (
        <Link
          key={l.key}
          to={l.to}
          hash={l.hash}
          activeOptions={{ exact: true, includeHash: true }}
          className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
        >
          {t(`publicNav.${l.key}`)}
        </Link>
      ))}
    </nav>
  );
}

/** `hideThemeToggle` is for pages with a fixed palette, where the toggle would do nothing. */
export function PublicHeader({
  children,
  hideThemeToggle,
}: {
  children?: ReactNode;
  hideThemeToggle?: boolean;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <PublicNav />
        <div className="flex items-center gap-2 sm:gap-3">
          <PublicControls hideThemeToggle={hideThemeToggle} />
          {children}
        </div>
      </div>
    </header>
  );
}
