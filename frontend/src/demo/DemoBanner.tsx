import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { IS_DEMO } from "./install";

const REPO = "https://github.com/yagizcngz/course-management-platform";

/** Demo builds only: says the data is a snapshot and changes reset on reload. */
export function DemoBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  if (!IS_DEMO || !open) return null;
  return (
    <div
      role="note"
      className="fixed bottom-3 left-1/2 z-50 flex w-[min(40rem,calc(100%-2rem))] -translate-x-1/2 items-start gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 text-xs text-muted-foreground shadow-lg backdrop-blur"
    >
      <p className="flex-1">
        <span className="font-semibold text-foreground">{t("demoBanner.title")}</span>{" "}
        {t("demoBanner.text")}{" "}
        <a href={REPO} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
          {t("demoBanner.source")}
        </a>
      </p>
      <button
        type="button"
        aria-label={t("demoBanner.close")}
        onClick={() => setOpen(false)}
        className="rounded-full p-1 hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
