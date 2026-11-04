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
      E-<span className="text-gold-shimmer italic">Kurs</span>
    </Link>
  );
}

export function PublicControls() {
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
      <button
        type="button"
        onClick={toggle}
        aria-label={t("header.toggleTheme")}
        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function PublicHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <PublicControls />
          {children}
        </div>
      </div>
    </header>
  );
}
