import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { motion } from "motion/react";

import { API_BASE } from "@/components/courseHelpers";
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from "@/components/AuthShell";
import { LedgerScene } from "@/components/effects/three/LedgerScene";
import { getRoleFromToken, isAdminRole, isTeacherRole } from "@/lib/auth";
import type { SealKind } from "@/components/effects/three/sealEmblems";
import { SplitHeadline } from "@/components/motion";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

// development only: frontend/.env.development.local sets the seeded demo password
// (Seed:DemoPassword); production builds never show the pills
const DEMO_PASSWORD: string | undefined = import.meta.env.DEV
  ? import.meta.env.VITE_DEMO_PASSWORD
  : undefined;
const DEMO_ACCOUNTS = [
  { username: "demo_student", label: "login.demo.student" },
  { username: "demo_teacher", label: "login.demo.teacher" },
  { username: "demo_admin", label: "login.demo.admin" },
] as const;

// Singleton AudioContext to prevent "too many contexts" error
let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch((e) => {
      void e;
    });
  }
  return audioCtx;
};

const playError = () => {
  try {
    const ctx = getAudioContext();
    [0, 0.15].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "square";
      o.frequency.value = 200 - i * 40;
      g.gain.setValueAtTime(0.05, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.13);
    });
  } catch (e) {
    void e;
  }
};

const playSuccess = () => {
  try {
    const ctx = getAudioContext();
    [523, 659, 784].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.1 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
      o.start(ctx.currentTime + i * 0.1);
      o.stop(ctx.currentTime + i * 0.1 + 0.31);
    });
  } catch (e) {
    void e;
  }
};

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/login" });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isHappy, setIsHappy] = useState(false);
  const [failures, setFailures] = useState(0);
  // revealed by the token on success: the seal the ledger is stamped with
  const [seal, setSeal] = useState<SealKind>("student");
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<"name" | "secret" | null>(null);
  const [capsLock, setCapsLock] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || isHappy) return;
    setError("");
    setBusy(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("jwt_token", data.token);
        localStorage.setItem("username", username);

        const role = getRoleFromToken(data.token);
        setSeal(isAdminRole(role) ? "admin" : isTeacherRole(role) ? "teacher" : "student");
        setIsHappy(true);
        playSuccess();

        // long enough for the seal to land before the dashboard opens
        setTimeout(() => {
          navigate({ to: "/dashboard" });
        }, 1200);
      } else {
        triggerError(t("login.invalidCredentials"));
      }
    } catch {
      triggerError(t("login.serverError"));
    } finally {
      setBusy(false);
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setFailures((n) => n + 1);
    setIsShaking(true);
    playError();
    setTimeout(() => setIsShaking(false), 500);
  };

  const filled = Number(!!username.trim()) + Number(!!password);
  const onCaps = (e: React.KeyboardEvent) => setCapsLock(e.getModifierState("CapsLock"));

  return (
    <AuthShell
      caption={t("login.panelTitle")}
      eyebrow={t("login.panelEyebrow")}
      steps={{ done: filled, total: 2 }}
      panel={
        <LedgerScene
          name={username.trim()}
          secretLength={password.length}
          focus={focus}
          busy={busy}
          lit={isHappy}
          seal={seal}
          shake={failures}
          labels={{
            title: t("login.ledger.title"),
            heading: t("login.ledger.heading"),
            name: t("login.usernameOrEmail"),
            secret: t("login.password"),
            seal: t("login.ledger.seal"),
            welcome: t("login.welcomeBack"),
          }}
        />
      }
    >
      <motion.div
        animate={isShaking ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
      >
        <p className="mb-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
          <span aria-hidden="true" className="h-px w-6 bg-gold" />
          {t("login.eyebrow")}
        </p>
        <h1 className="font-serif text-5xl leading-none">
          <SplitHeadline text={t("login.welcomeBack")} />
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("login.pleaseEnterDetails")}</p>

        {DEMO_PASSWORD && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {t("login.demo.title")}
            </span>
            {DEMO_ACCOUNTS.map((d) => (
              <button
                key={d.username}
                type="button"
                aria-pressed={username === d.username}
                onClick={() => {
                  setUsername(d.username);
                  setPassword(DEMO_PASSWORD);
                  setError("");
                }}
                className="h-7 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-gold/60 hover:text-foreground aria-pressed:border-gold aria-pressed:text-foreground"
              >
                {t(d.label)}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label htmlFor="login-username" className={authLabelClass}>
              {t("login.usernameOrEmail")}
            </label>
            <div className="group relative">
              <User
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-gold"
              />
              <input
                id="login-username"
                type="text"
                required
                autoComplete="username"
                className={`${authInputClass} pl-11`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocus("name")}
                onBlur={() => setFocus(null)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className={authLabelClass}>
              {t("login.password")}
            </label>
            <div className="group relative">
              <Lock
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-gold"
              />
              <input
                id="login-password"
                type={passwordVisible ? "text" : "password"}
                required
                autoComplete="current-password"
                aria-describedby={capsLock ? "login-caps" : undefined}
                className={`${authInputClass} pl-11 pr-12`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onCaps}
                onKeyUp={onCaps}
                onFocus={() => setFocus("secret")}
                onBlur={() => {
                  setFocus(null);
                  setCapsLock(false);
                }}
              />
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                aria-label={passwordVisible ? t("login.hidePassword") : t("login.showPassword")}
              >
                {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {capsLock && (
              <p id="login-caps" role="status" className="mt-1.5 text-xs font-medium text-gold">
                {t("login.capsLock")}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={busy || isHappy}
            aria-busy={busy}
            className={`${authButtonClass} group mt-2 inline-flex items-center justify-center gap-2`}
          >
            {busy ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                {t("login.signingIn")}
              </>
            ) : (
              <>
                {t("login.loginButton")}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t("login.noAccount")}{" "}
          <Link to="/register" className="font-medium text-gold hover:underline">
            {t("login.registerNow")}
          </Link>
        </p>
        <p className="mt-3 text-center text-xs">
          <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
            {t("login.returnHome")}
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}
