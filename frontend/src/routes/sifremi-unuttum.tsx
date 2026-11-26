import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useLater } from "@/hooks/useLater";

import { API_BASE } from "@/components/courseHelpers";
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from "@/components/AuthShell";
import { LedgerScene } from "@/components/effects/three/LedgerScene";
import { readError } from "@/lib/auth";
import { SplitHeadline } from "@/components/motion";

export const Route = createFileRoute("/sifremi-unuttum")({
  component: ForgotPasswordPage,
});

const MIN_PASSWORD = 8; // AuthController.MinPasswordLength

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/sifremi-unuttum" });
  const later = useLater();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [failures, setFailures] = useState(0);
  const [focus, setFocus] = useState<"name" | "secret" | null>(null);

  const fail = (msg: string) => {
    setError(msg);
    setFailures((n) => n + 1);
  };

  // one POST per step; both answer with readError's translated API message on failure
  const post = async (path: string, body: object, onOk: () => void) => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onOk();
      else fail(await readError(res, t("forgot.failed")));
    } catch {
      fail(t("login.serverError"));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    void post("forgot-password", { email: email.trim() }, () => {
      setSent(true);
      setCode("");
    });
  };

  const resetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || done) return;
    if (password.length < MIN_PASSWORD) {
      fail(t("register.passwordTooShort", { count: MIN_PASSWORD }));
      return;
    }
    void post(
      "reset-password",
      { email: email.trim(), code: code.trim(), newPassword: password },
      () => {
        setDone(true);
        later(() => navigate({ to: "/login" }), 1600);
      },
    );
  };

  return (
    <AuthShell
      caption={t("forgot.panelTitle")}
      eyebrow={t("forgot.panelEyebrow")}
      steps={{ done: Number(sent) + Number(done), total: 2 }}
      panel={
        <LedgerScene
          name={email.trim()}
          secretLength={password.length}
          focus={focus}
          busy={busy}
          lit={done}
          seal="student"
          shake={failures}
          labels={{
            title: t("login.ledger.title"),
            heading: t("login.ledger.heading"),
            name: t("register.email"),
            secret: t("forgot.newPassword"),
            seal: t("login.ledger.seal"),
            welcome: t("forgot.done"),
          }}
        />
      }
    >
      <p className="mb-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
        <span aria-hidden="true" className="h-px w-6 bg-gold" />
        {t("forgot.eyebrow")}
      </p>
      <h1 className="font-serif text-5xl leading-none">
        <SplitHeadline text={t("forgot.title")} />
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{t("forgot.subtitle")}</p>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}
      {(sent || done) && !error && (
        <div
          role="status"
          className="mt-6 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success"
        >
          {done ? t("forgot.done") : t("forgot.codeSent")}
        </div>
      )}

      <form onSubmit={sent ? resetPassword : sendCode} className="mt-8 space-y-5">
        <div>
          <label htmlFor="forgot-email" className={authLabelClass}>
            {t("register.email")}
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            readOnly={sent}
            className={authInputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocus("name")}
            onBlur={() => setFocus(null)}
          />
        </div>

        {sent && (
          <>
            <div>
              <label htmlFor="forgot-code" className={authLabelClass}>
                {t("register.verificationCode")}
              </label>
              <input
                id="forgot-code"
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t("register.codePlaceholder")}
                className={`${authInputClass} tracking-[0.3em]`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                type="button"
                onClick={() => sendCode()}
                disabled={busy}
                className="mt-2 text-xs font-medium text-gold underline-offset-4 hover:underline disabled:opacity-50"
              >
                {t("register.resendCode")}
              </button>
            </div>
            <div>
              <label htmlFor="forgot-password" className={authLabelClass}>
                {t("forgot.newPassword")}
              </label>
              <input
                id="forgot-password"
                type="password"
                required
                minLength={MIN_PASSWORD}
                autoComplete="new-password"
                className={authInputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocus("secret")}
                onBlur={() => setFocus(null)}
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={busy || done}
          aria-busy={busy}
          className={`${authButtonClass} group mt-2 inline-flex items-center justify-center gap-2`}
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <>
              {sent ? t("forgot.submit") : t("register.sendCode")}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-gold hover:underline">
          {t("forgot.backToLogin")}
        </Link>
      </p>
      <p className="mt-3 text-center text-xs">
        <Link
          to="/destek"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("login.cantSignIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
