import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { API_BASE, refundNote, type ActivePurchase } from "@/components/courseHelpers";
import { notifyCoursesChanged } from "@/components/useMyCourses";
import { formatDate, formatDateTime, formatTry } from "@/lib/utils";
import { authHeaders, getRoleFromToken, isTeacherRole, readError } from "@/lib/auth";
import { participantOnly } from "@/hooks/useAdminGuard";

export const Route = createFileRoute("/_authenticated/cuzdan")({
  component: participantOnly(WalletPage),
});

interface WalletTransaction {
  id: number;
  amount: number;
  type: "TopUp" | "Purchase" | "Earning" | "Refund" | "EarningReversal";
  courseId: number | null;
  description: string | null;
  createdAt: string;
}

const QUICK_AMOUNTS = [100, 250, 500, 1000];

function WalletPage() {
  const { t, i18n } = useTranslation();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [purchases, setPurchases] = useState<ActivePurchase[]>([]);
  const [refundDays, setRefundDays] = useState(7);
  // all-time totals from the API (the history lists only the latest 100 entries)
  const [totals, setTotals] = useState({ spent: 0, earned: 0 });
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // simulated top-up is off outside development until a real payment provider is wired in
  const [topUpEnabled, setTopUpEnabled] = useState(false);
  const isTeacher = isTeacherRole(getRoleFromToken());

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/wallet/me`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await readError(res, "load failed"));
      const data = await res.json();
      setBalance(data.balance);
      setTransactions(data.transactions);
      setPurchases(data.purchases ?? []);
      setRefundDays(data.refundWindowDays ?? 7);
      setTopUpEnabled(data.topUpEnabled === true);
      setTotals({ spent: data.spent ?? 0, earned: data.earned ?? 0 });
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const topUp = async (value: number) => {
    if (!Number.isFinite(value) || value <= 0 || value > 10000) {
      toast.error(t("wallet.invalidAmount"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/wallet/top-up`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount: Math.round(value * 100) / 100 }),
      });
      if (!res.ok) throw new Error(await readError(res, t("wallet.topUpFailed")));
      toast.success(t("wallet.topUpSuccess"));
      setAmount("");
      window.dispatchEvent(new Event("wallet-changed"));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const refund = async (p: ActivePurchase) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/wallet/refund/${p.courseId}`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await readError(res, t("lessons.refundFailed")));
      toast.success(t("lessons.refundSuccess"));
      window.dispatchEvent(new Event("wallet-changed"));
      notifyCoursesChanged();
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Math.abs: never show -0
  const spent = Math.abs(totals.spent);
  const earnings = totals.earned;

  return (
    <>
      <PageHeader crumb={t("wallet.title")} />
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        {loadError && (
          <div className="border border-destructive/40 text-destructive text-sm rounded-md px-4 py-3">
            {t("wallet.loadFailed")}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("wallet.balance")}
              </p>
              <p className="text-4xl font-bold tracking-tight mt-2 tabular-nums">
                {balance === null ? "—" : formatTry(balance)}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("wallet.spent")}
                  </p>
                  <p className="font-semibold tabular-nums">{formatTry(spent)}</p>
                </div>
                {isTeacher && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("wallet.earnings")}
                    </p>
                    <p className="font-semibold tabular-nums">{formatTry(earnings)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {topUpEnabled && (
            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("wallet.topUp")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t("wallet.simulatedNote")}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {QUICK_AMOUNTS.map((v) => (
                    <Button
                      key={v}
                      variant="outline"
                      disabled={submitting}
                      onClick={() => topUp(v)}
                      className="tabular-nums"
                    >
                      +{formatTry(v)}
                    </Button>
                  ))}
                </div>
                <form
                  className="flex gap-2 mt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    topUp(Number(amount));
                  }}
                >
                  <label htmlFor="topup-amount" className="sr-only">
                    {t("wallet.amount")}
                  </label>
                  <Input
                    id="topup-amount"
                    type="number"
                    min={1}
                    max={10000}
                    step="0.01"
                    placeholder={t("wallet.amount")}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="max-w-48"
                  />
                  <Button type="submit" disabled={submitting || !amount}>
                    {t("wallet.addFunds")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {purchases.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("wallet.purchases")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("wallet.purchasesHint", { days: refundDays })}
                </p>
              </div>
              <ul className="divide-y">
                {[...purchases]
                  .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
                  .map((p) => {
                    const note = refundNote(p, refundDays, (d) => formatDate(d, i18n.language));
                    return (
                      <li
                        key={p.courseId}
                        className="px-6 py-3 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <Link
                            to="/kurs/$id"
                            params={{ id: String(p.courseId) }}
                            className="text-sm font-medium hover:underline underline-offset-4"
                          >
                            {p.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {t("wallet.boughtOn", {
                              date: formatDateTime(p.purchasedAt, i18n.language),
                            })}{" "}
                            · {t(note.key, note.values)}
                          </p>
                        </div>
                        {p.refundable && (
                          <ConfirmDialog
                            title={t("lessons.refund")}
                            description={t("wallet.refundConfirm", { course: p.title })}
                            confirmLabel={t("lessons.refund")}
                            onConfirm={() => refund(p)}
                            destructive
                          >
                            <Button variant="outline" size="sm" disabled={submitting}>
                              {t("lessons.refund")}
                            </Button>
                          </ConfirmDialog>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("wallet.history")}
              </p>
            </div>
            {transactions.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                {t("wallet.noTransactions")}
              </p>
            ) : (
              <ul className="divide-y">
                {transactions.map((x) => (
                  <li key={x.id} className="px-6 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t(`wallet.types.${x.type}`)}
                        {x.description && x.type !== "TopUp" ? ` · ${x.description}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(x.createdAt, i18n.language)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${x.amount < 0 ? "text-foreground" : "text-success"}`}
                    >
                      {x.amount > 0 ? "+" : ""}
                      {formatTry(x.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
