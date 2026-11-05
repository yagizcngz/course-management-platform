import { useEffect, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";

/** Theme state shared by every header; the choice is stored in localStorage. */
function useThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const setDark = (dark: boolean) => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
    setIsDark(dark);
  };

  /** null until mounted: the server cannot know the visitor's theme. */
  return { isDark, setDark };
}

interface Option<T> {
  value: T;
  label: string;
  content: ReactNode;
}

/**
 * Two-segment pill with a thumb that slides to the active option. `value` is null before
 * hydration, so the server and the first client render match and the thumb appears in
 * place instead of sliding in.
 */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center rounded-full border border-border bg-secondary/70 p-0.5"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            aria-label={o.label}
            title={o.label}
            onClick={() => !on && onChange(o.value)}
            className={`relative flex h-8 min-w-9 items-center justify-center rounded-full px-2.5 text-xs tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
              on
                ? "font-bold text-primary-foreground"
                : "font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            {on && (
              <motion.span
                layoutId={id}
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-primary shadow-sm"
                transition={
                  reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }
                }
              />
            )}
            <span className="relative">{o.content}</span>
          </button>
        );
      })}
    </div>
  );
}

/** [ TR | EN ]: both languages are always visible, the active one sits on the thumb. */
export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const lang = i18n.language?.startsWith("en") ? "en" : "tr";
  return (
    <Segmented
      label={t("header.language")}
      value={mounted ? lang : null}
      onChange={(next) => {
        i18n.changeLanguage(next);
        localStorage.setItem("i18nextLng", next);
      }}
      options={[
        { value: "tr", label: "Türkçe", content: "TR" },
        { value: "en", label: "English", content: "EN" },
      ]}
    />
  );
}

/** [ ☀ | ☾ ]: light and dark side by side, the active mode sits on the thumb. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { isDark, setDark } = useThemeToggle();
  return (
    <Segmented
      label={t("header.toggleTheme")}
      value={isDark === null ? null : isDark ? "dark" : "light"}
      onChange={(mode) => setDark(mode === "dark")}
      options={[
        { value: "light", label: t("header.lightMode"), content: <Sun className="h-4 w-4" /> },
        { value: "dark", label: t("header.darkMode"), content: <Moon className="h-4 w-4" /> },
      ]}
    />
  );
}
