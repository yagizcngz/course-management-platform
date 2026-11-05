import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
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

const NAV_LINK =
  "relative rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:font-medium data-[status=active]:text-foreground";

function PublicNav() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("publicNav.label")} className="hidden items-center gap-1 lg:flex">
      {PUBLIC_LINKS.map((l) => (
        <Link
          key={l.key}
          to={l.to}
          // fixed slot width: switching TR/EN must not slide the other links around
          className={`${NAV_LINK} min-w-[6.75rem] text-center data-[status=active]:after:absolute data-[status=active]:after:inset-x-3 data-[status=active]:after:-bottom-px data-[status=active]:after:h-px data-[status=active]:after:bg-gold`}
        >
          {t(`publicNav.${l.key}`)}
        </Link>
      ))}
    </nav>
  );
}

const PRIMARY_CTA =
  "rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.97]";

/** Sign-in links for guests, a dashboard link for members. */
function AuthLinks({ authed, stacked = false }: { authed: boolean; stacked?: boolean }) {
  const { t } = useTranslation();
  if (authed)
    return (
      <Link to="/dashboard" className={PRIMARY_CTA}>
        {t("publicNav.dashboard")}
      </Link>
    );
  return (
    <>
      <Link
        to="/login"
        className={`rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground ${stacked ? "border border-border text-center" : ""}`}
      >
        {t("login.loginButton")}
      </Link>
      <Link to="/register" className={PRIMARY_CTA}>
        {t("login.register")}
      </Link>
    </>
  );
}

/**
 * Logo left, nav centred, account links then the language/theme toggles pinned to the right
 * edge, so a language switch never moves the toggles under the pointer. Below `lg` the nav
 * and account links move into a menu panel.
 */
export function PublicHeader() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // read after mount: the server cannot see the token, and the first render must match it
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(!!localStorage.getItem("jwt_token")), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Logo />
        <PublicNav />
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <AuthLinks authed={authed} />
          </div>
          <PublicControls />
          <button
            type="button"
            aria-expanded={open}
            aria-controls="public-menu"
            aria-label={t("publicNav.menu")}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary/70 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="public-menu"
          aria-label={t("publicNav.label")}
          className="border-t border-border/70 bg-background/95 px-4 pb-5 pt-3 backdrop-blur-md sm:px-6 lg:hidden"
        >
          <ul className="mx-auto flex max-w-7xl flex-col">
            {PUBLIC_LINKS.map((l) => (
              <li key={l.key}>
                <Link
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="block border-b border-border/60 py-3 font-serif text-xl text-foreground data-[status=active]:text-gold"
                >
                  {t(`publicNav.${l.key}`)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-4 grid max-w-7xl grid-cols-2 gap-2 sm:hidden" onClick={() => setOpen(false)}>
            <AuthLinks authed={authed} stacked />
          </div>
        </nav>
      )}
    </header>
  );
}
