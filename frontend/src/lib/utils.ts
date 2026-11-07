import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** First letters of the first two words, upper-cased the Turkish way ("ilker" -> "İ"). */
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toLocaleUpperCase("tr");

/** Turkish lira; pass 0 for whole-lira prices on cards ("₺899"). */
export const formatTry = (value: number, fractionDigits = 2) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

/** Date and time in the UI language's format, or "-" when missing or unparseable. */
export const formatDateTime = (raw: unknown, lang: string) => {
  const d = raw ? new Date(raw as string) : null;
  return d && !isNaN(d.getTime())
    ? d.toLocaleString(lang.startsWith("en") ? "en-GB" : "tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";
};

/** A date in the UI language's format, or "-" when it is missing or unparseable. */
export const formatDate = (raw: unknown, lang: string) => {
  const d = raw ? new Date(raw as string) : null;
  return d && !isNaN(d.getTime())
    ? d.toLocaleDateString(lang.startsWith("en") ? "en-GB" : "tr-TR")
    : "-";
};

const pill =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 disabled:pointer-events-none disabled:opacity-50";

/** Page-header actions share the pill shape and height of the search box and display toggles. */
export const pillButton = {
  outline: `${pill} border border-border bg-card text-foreground hover:bg-secondary`,
  primary: `${pill} bg-primary text-primary-foreground hover:bg-primary/90`,
  danger: `${pill} bg-destructive text-white hover:bg-destructive/90 animate-in fade-in`,
};

/**
 * Approve / reject on review cards: approving is the filled primary pill of the app's other main
 * actions, rejecting a quiet outline that only turns red on hover, so a list of pending requests
 * does not read as a wall of green and red.
 */
export const decisionButton = {
  approve: cn(
    pill,
    "h-8 px-3.5 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
  ),
  reject: cn(
    pill,
    "h-8 px-3.5 border border-border bg-card text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15",
  ),
};

/** A filter chip; the active one is filled. */
export const chip = (active: boolean) =>
  `inline-flex h-8 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
  }`;
