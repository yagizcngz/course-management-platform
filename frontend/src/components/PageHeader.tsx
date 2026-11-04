import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Globe } from "lucide-react";

// Arama kutusu için dışarıdan alacağımız özellikleri (props) tanımlıyoruz
interface PageHeaderProps {
  crumb: string;
  action?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function PageHeader({ crumb, action, searchValue, onSearchChange }: PageHeaderProps) {
  const { t, i18n } = useTranslation();
  const [isDark, setIsDark] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    let dark: boolean;

    if (saved) {
      dark = saved === "dark";
    } else {
      dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return (
    <header className="min-h-16 border-b border-border bg-card flex flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-8 sticky top-0 z-40">
      <div className="min-w-0 truncate text-xs font-mono text-muted-foreground tracking-widest uppercase">
        {crumb}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
        {onSearchChange && (
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchValue || ""} // Kutudaki yazı
            onChange={(e) => onSearchChange(e.target.value)} // Yazı değiştikçe haber ver
            className="bg-foreground/5 border-none text-xs px-4 py-2 rounded-full w-32 sm:w-64 focus:ring-1 focus:ring-accent outline-none"
          />
        )}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            aria-label={t("header.language")}
            aria-expanded={langMenuOpen}
            className="flex items-center gap-1 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Globe className="h-5 w-5" />
            <span className="text-xs font-bold uppercase hidden sm:inline-block">
              {i18n.language}
            </span>
          </button>
          {langMenuOpen && (
            <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden flex flex-col w-20 z-50">
              <button
                onClick={() => {
                  i18n.changeLanguage("tr");
                  localStorage.setItem("i18nextLng", "tr");
                  setLangMenuOpen(false);
                }}
                className={`px-4 py-2 text-sm font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                  i18n.language === "tr" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                TR
              </button>
              <button
                onClick={() => {
                  i18n.changeLanguage("en");
                  localStorage.setItem("i18nextLng", "en");
                  setLangMenuOpen(false);
                }}
                className={`px-4 py-2 text-sm font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                  i18n.language === "en" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                EN
              </button>
            </div>
          )}
        </div>
        <button
          onClick={toggleTheme}
          aria-label={t("header.toggleTheme")}
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        {action}
      </div>
    </header>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between border-b border-foreground/10 pb-2">
      <h2 className="text-sm font-bold uppercase tracking-widest">{title}</h2>
      {right}
    </div>
  );
}
