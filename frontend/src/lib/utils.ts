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

export const formatTry = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

/** A date in the UI language's format, or "-" when it is missing or unparseable. */
export const formatDate = (raw: unknown, lang: string) => {
  const d = raw ? new Date(raw as string) : null;
  return d && !isNaN(d.getTime())
    ? d.toLocaleDateString(lang.startsWith("en") ? "en-GB" : "tr-TR")
    : "-";
};
