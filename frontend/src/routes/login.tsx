import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

import { API_BASE, fetchCategories } from "@/components/courseHelpers";
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from "@/components/AuthShell";
import { ConstellationSky } from "@/components/effects/ConstellationSky";
import { SplitHeadline } from "@/components/motion";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate({ from: "/login" });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isHappy, setIsHappy] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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

        setIsHappy(true);
        playSuccess();

        setTimeout(() => {
          navigate({ to: "/dashboard" });
        }, 800);
      } else {
        triggerError(t("login.invalidCredentials"));
      }
    } catch (err) {
      triggerError(t("login.serverError"));
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    playError();
    setTimeout(() => setIsShaking(false), 500);
  };

  const categoryLabels = categories.map((c) =>
    i18n.exists(`dynamic.categories.${c}`) ? t(`dynamic.categories.${c}`) : c,
  );

  return (
    <AuthShell
      caption={t("login.panelTitle")}
      panel={<ConstellationSky categories={categoryLabels} lit={isHappy} />}
    >
      <motion.div
        animate={isShaking ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
      >
        <h1 className="font-serif text-5xl leading-none">
          <SplitHeadline text={t("login.welcomeBack")} />
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("login.pleaseEnterDetails")}</p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label htmlFor="login-username" className={authLabelClass}>
              {t("login.usernameOrEmail")}
            </label>
            <input
              id="login-username"
              type="text"
              required
              autoComplete="username"
              className={authInputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="login-password" className={authLabelClass}>
              {t("login.password")}
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={passwordVisible ? "text" : "password"}
                required
                autoComplete="current-password"
                className={`${authInputClass} pr-12`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>

          <button type="submit" disabled={isHappy} className={`${authButtonClass} mt-2`}>
            {t("login.loginButton")}
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
