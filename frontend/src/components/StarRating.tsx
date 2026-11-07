import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Five stars filled to `value` (0-5, fractions shown as a partly filled star). Decorative. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 text-gold", className)} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block size-[1em]">
            <Star className="absolute inset-0 size-full opacity-30" strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="size-[1em] fill-current" strokeWidth={1.5} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** "4.6 ★★★★★ (128)"; muted "No ratings yet" when nobody rated. */
export function RatingSummary({
  average,
  count,
  className,
}: {
  average: number;
  count: number;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  if (!count)
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>{t("rating.none")}</span>
    );
  const avg = average.toLocaleString(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", className)}
      aria-label={t("rating.summary", { average: avg, count })}
    >
      <span className="font-semibold tabular-nums text-foreground">{avg}</span>
      <Stars value={average} className="text-[0.85rem]" />
      <span className="tabular-nums text-muted-foreground">
        ({count.toLocaleString(i18n.language)})
      </span>
    </span>
  );
}

/** Pick 1-5 stars; arrow keys move within the group like any radio group. */
export function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (stars: number) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div
      role="radiogroup"
      aria-label={t("rating.rateThis")}
      className="inline-flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t("rating.stars", { count: n })}
          // roving focus: only the chosen star (or the first) is a tab stop
          tabIndex={(value ?? 1) === n ? 0 : -1}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(null)}
          onClick={() => onChange(n)}
          onKeyDown={(e) => {
            const next =
              e.key === "ArrowRight" || e.key === "ArrowUp"
                ? Math.min(5, n + 1)
                : e.key === "ArrowLeft" || e.key === "ArrowDown"
                  ? Math.max(1, n - 1)
                  : null;
            if (next === null) return;
            e.preventDefault();
            onChange(next);
            (e.currentTarget.parentElement?.children[next - 1] as HTMLElement | undefined)?.focus();
          }}
          className="rounded p-0.5 text-gold transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <Star className={cn("size-6", n <= shown && "fill-current")} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
