import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { API_BASE } from "./courseHelpers";
import { authHeaders, readError } from "@/lib/auth";
import { RatingSummary, StarInput } from "./StarRating";

interface Summary {
  average: number;
  count: number;
  mine: number | null;
  canRate: boolean;
}

/**
 * The course's average rating; a student who is enrolled in it or finished it also picks or
 * changes their own 1-5 stars here (GET/PUT/DELETE /api/courses/{id}/rating).
 */
export function CourseRatingCard({
  courseId,
  className,
}: {
  courseId: number | string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    fetch(`${API_BASE}/api/courses/${courseId}/rating`, { headers: authHeaders() })
      .then((r) => (r.ok ? (r.json() as Promise<Summary>) : null))
      .then((s) => !off && setSummary(s))
      .catch(() => !off && setSummary(null));
    return () => {
      off = true;
    };
  }, [courseId]);

  const send = async (method: "PUT" | "DELETE", stars?: number) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/rating`, {
        method,
        headers: authHeaders(),
        body: stars ? JSON.stringify({ stars }) : undefined,
      });
      if (!res.ok) throw new Error(await readError(res, t("rating.saveFailed")));
      setSummary(await res.json());
      toast.success(t(method === "PUT" ? "rating.saved" : "rating.removed"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!summary) return null;
  return (
    <section
      aria-label={t("rating.title")}
      className={`rounded-xl border border-border bg-card p-4 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("rating.title")}
        </p>
        <RatingSummary average={summary.average} count={summary.count} className="text-sm" />
      </div>
      {summary.canRate && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <span className="text-sm">{summary.mine ? t("rating.yours") : t("rating.rateThis")}</span>
          <StarInput value={summary.mine} onChange={(n) => send("PUT", n)} disabled={busy} />
          {summary.mine && (
            <button
              type="button"
              onClick={() => send("DELETE")}
              disabled={busy}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t("rating.remove")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
