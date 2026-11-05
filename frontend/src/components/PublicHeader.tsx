import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageToggle, ThemeToggle } from "./DisplayToggles";

export function Logo({ className = "text-2xl" }: { className?: string }) {
  return (
    <Link to="/" className={`font-serif leading-none text-foreground ${className}`}>
      E-<span className="text-gold italic">Kurs</span>
    </Link>
  );
}

export function PublicControls() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}

/** The public site's own pages. */
export const PUBLIC_LINKS = [
  { key: "courses", to: "/kurslar" },
  { key: "categories", to: "/kategoriler" },
  { key: "teachers", to: "/egitmenler" },
  { key: "about", to: "/hakkimizda" },
] as const;

function PublicNav() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("publicNav.label")} className="hidden items-center gap-1 lg:flex">
      {PUBLIC_LINKS.map((l) => (
        <Link
          key={l.key}
          to={l.to}
          className="relative rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:font-medium data-[status=active]:text-foreground data-[status=active]:after:absolute data-[status=active]:after:inset-x-3 data-[status=active]:after:-bottom-px data-[status=active]:after:h-px data-[status=active]:after:bg-gold"
        >
          {t(`publicNav.${l.key}`)}
        </Link>
      ))}
    </nav>
  );
}

export function PublicHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <PublicNav />
        <div className="flex items-center gap-2 sm:gap-3">
          <PublicControls />
          {children}
        </div>
      </div>
    </header>
  );
}
