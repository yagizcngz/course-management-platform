import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Logo, PUBLIC_LINKS } from "./PublicHeader";

const linkClass = "text-sm text-muted-foreground transition-colors hover:text-foreground";

/** Multi-column footer shared by the public pages (landing, about). */
export function PublicFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo className="text-3xl" />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("footer.tagline")}</p>
        </div>

        <FooterColumn title={t("footer.explore")}>
          {PUBLIC_LINKS.filter((l) => l.key !== "about").map((l) => (
            <li key={l.key}>
              <Link to={l.to} className={linkClass}>
                {t(`publicNav.${l.key}`)}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title={t("footer.platform")}>
          <li>
            <Link to="/hakkimizda" className={linkClass}>
              {t("publicNav.about")}
            </Link>
          </li>
          <li>
            <Link to="/hakkimizda" hash="guarantee" className={linkClass}>
              {t("footer.guarantee")}
            </Link>
          </li>
          <li>
            <Link to="/egitmenler" className={linkClass}>
              {t("footer.faculty")}
            </Link>
          </li>
        </FooterColumn>

        <FooterColumn title={t("footer.account")}>
          <li>
            <Link to="/login" className={linkClass}>
              {t("login.loginButton")}
            </Link>
          </li>
          <li>
            <Link to="/register" className={linkClass}>
              {t("login.register")}
            </Link>
          </li>
        </FooterColumn>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <span>
            © {year} {t("guest.footerDesc")}
          </span>
          <span>{t("footer.colophon")}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      <ul className="mt-4 space-y-3">{children}</ul>
    </div>
  );
}
