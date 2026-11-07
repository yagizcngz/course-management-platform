import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { API_BASE } from "./courseHelpers";
import { authHeaders, readError } from "@/lib/auth";
import { formatDate, pillButton } from "@/lib/utils";

interface BranchRequest {
  id: number;
  requestedBranch: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  createdAt: string;
  reviewedAt: string | null;
}

const split = (b?: string | null) =>
  (b ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * A teacher's branches change only with an admin's approval: pick the new set and send it,
 * see the pending request (or the last decision) and withdraw it while it waits.
 */
export function BranchRequestPanel({
  current,
  categories,
}: {
  current: string[];
  categories: string[];
}) {
  const { t, i18n } = useTranslation();
  const [request, setRequest] = useState<BranchRequest | null>(null);
  const [picked, setPicked] = useState<string[]>(current);
  const [busy, setBusy] = useState(false);
  const field = (b: string) =>
    i18n.exists(`dynamic.categories.${b}`) ? t(`dynamic.categories.${b}`) : b;

  const load = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/teachers/me/branch-request`, {
      headers: authHeaders(),
    }).catch(() => null);
    const r: BranchRequest | null = res?.status === 200 ? await res.json() : null;
    setRequest(r);
    return r;
  }, []);

  // the checkboxes start from the waiting request, else from the branches in force
  useEffect(() => {
    let off = false;
    load().then((r) => {
      if (!off) setPicked(r?.status === "Pending" ? split(r.requestedBranch) : current);
    });
    return () => {
      off = true;
    };
  }, [load, current]);

  const pending = request?.status === "Pending" ? request : null;
  const unchanged =
    same(picked, current) || (!!pending && same(picked, split(pending.requestedBranch)));

  const send = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/teachers/me/branch-request`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ branch: picked.join(", ") }),
      });
      if (!res.ok) throw new Error(await readError(res, t("profile.branchRequest.failed")));
      setRequest(await res.json());
      toast.success(t("profile.branchRequest.sent"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    const res = await fetch(`${API_BASE}/api/teachers/me/branch-request`, {
      method: "DELETE",
      headers: authHeaders(),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return toast.error(t("profile.branchRequest.failed"));
    toast.success(t("profile.branchRequest.withdrawn"));
    setPicked(current);
    load();
  };

  return (
    <fieldset className="min-w-0 pt-2">
      <legend className="text-sm font-medium">{t("profile.branchesLabel")}</legend>
      <p className="mt-1 text-xs text-muted-foreground">{t("profile.branchesHelper")}</p>

      {pending ? (
        <p
          role="status"
          className="mt-3 flex items-start gap-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm"
        >
          <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
          <span>
            {t("profile.branchRequest.pending", {
              branches: split(pending.requestedBranch).map(field).join(", "),
              date: formatDate(pending.createdAt, i18n.language),
            })}
          </span>
        </p>
      ) : (
        request &&
        request.status !== "Cancelled" &&
        request.reviewedAt && (
          <p
            role="status"
            className={`mt-3 rounded-md border px-3 py-2 text-sm ${
              request.status === "Approved"
                ? "border-success/40 bg-success/10"
                : "border-destructive/40 bg-destructive/10"
            }`}
          >
            {t(`profile.branchRequest.${request.status === "Approved" ? "approved" : "rejected"}`, {
              branches: split(request.requestedBranch).map(field).join(", "),
              date: formatDate(request.reviewedAt, i18n.language),
            })}
          </p>
        )
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {categories.map((c) => (
          <label
            key={c}
            className="flex cursor-pointer items-center gap-2 rounded-md bg-background p-2 text-sm transition-colors hover:bg-muted"
          >
            <input
              type="checkbox"
              checked={picked.includes(c)}
              onChange={(e) =>
                setPicked(e.target.checked ? [...picked, c] : picked.filter((b) => b !== c))
              }
              className="rounded text-foreground focus:ring-foreground"
            />
            {field(c)}
            {current.includes(c) && (
              <span className="sr-only">{t("profile.branchRequest.inForce")}</span>
            )}
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={busy || unchanged || picked.length === 0}
          className={pillButton.outline}
        >
          {t(pending ? "profile.branchRequest.update" : "profile.branchRequest.send")}
        </button>
        {pending && (
          <button
            type="button"
            onClick={withdraw}
            disabled={busy}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("profile.branchRequest.withdraw")}
          </button>
        )}
      </div>
    </fieldset>
  );
}
