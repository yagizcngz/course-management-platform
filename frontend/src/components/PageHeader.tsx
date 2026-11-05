import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageToggle, ThemeToggle } from "./DisplayToggles";

// Arama kutusu için dışarıdan alacağımız özellikleri (props) tanımlıyoruz
interface PageHeaderProps {
  crumb: string;
  action?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function PageHeader({ crumb, action, searchValue, onSearchChange }: PageHeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="min-h-16 border-b border-border bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 flex flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-8 sticky top-0 z-40">
      <div className="min-w-0 truncate font-serif text-2xl text-foreground first-letter:uppercase">
        {crumb.replace(/^\/\s*/, "")}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
        {onSearchChange && (
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchValue || ""} // Kutudaki yazı
            onChange={(e) => onSearchChange(e.target.value)} // Yazı değiştikçe haber ver
            className="h-9 bg-card border border-border text-sm px-4 rounded-full w-32 sm:w-64 transition-[box-shadow,border-color] focus:border-gold focus:ring-4 focus:ring-gold/15 outline-none"
          />
        )}
        {action}
        {/* last, so a longer or shorter action label in the other language cannot move them */}
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between border-b border-border pb-2">
      <h2 className="font-serif text-2xl">{title}</h2>
      {right}
    </div>
  );
}
