import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { API_BASE, fetchCategories } from "@/components/courseHelpers";
import { readError } from "@/lib/auth";
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from "@/components/AuthShell";
import { SolarSystem } from "@/components/effects/SolarSystem";
import { SplitHeadline } from "@/components/motion";
export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate({ from: "/register" });
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError(t("register.invalidEmail"));
        return;
      }
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          username,
          email,
          password,
          registrationCode: registrationCode.trim() || null,
          verificationCode: verificationCode.trim(),
        }),
      });

      if (response.ok) {
        navigate({ to: "/login" });
      } else {
        setError(await readError(response, t("register.registerError")));
      }
    } catch (err) {
      setError(t("register.serverError"));
    }
  };

  const handleSendVerificationEmail = async () => {
    setError("");
    setSuccessMsg("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("register.invalidEmail"));
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/send-verification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsEmailSent(true);
        setSuccessMsg(t("register.emailSentSuccess"));
      } else {
        setError(await readError(response, t("register.codeSendError")));
      }
    } catch (err) {
      setError(t("register.serverError"));
    } finally {
      setIsSending(false);
    }
  };

  const categoryLabels = categories.map((c) =>
    i18n.exists(`dynamic.categories.${c}`) ? t(`dynamic.categories.${c}`) : c,
  );

  return (
    <AuthShell
      caption={t("register.panelTitle")}
      panel={<SolarSystem categories={categoryLabels} />}
    >
      <h1 className="font-serif text-5xl leading-none">
        <SplitHeadline text={t("register.heading")} />
      </h1>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 items-end gap-3">
          <div>
            <label htmlFor="reg-first" className={authLabelClass}>
              {t("register.firstName")}
            </label>
            <input
              id="reg-first"
              type="text"
              required
              autoComplete="given-name"
              className={authInputClass}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="reg-last" className={authLabelClass}>
              {t("register.lastName")}
            </label>
            <input
              id="reg-last"
              type="text"
              required
              autoComplete="family-name"
              className={authInputClass}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className={authLabelClass}>
            {t("register.email")}
          </label>
          <div className="flex gap-2">
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              className={`${authInputClass} min-w-0 flex-1 disabled:opacity-60`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEmailSent}
            />
            <button
              type="button"
              onClick={handleSendVerificationEmail}
              disabled={isSending || isEmailSent || !email}
              className="whitespace-nowrap rounded-xl border border-border bg-secondary px-4 text-sm font-medium text-foreground transition-colors hover:border-gold/60 disabled:opacity-50"
            >
              {isSending
                ? t("register.sending")
                : isEmailSent
                  ? t("register.sent")
                  : t("register.sendCode")}
            </button>
          </div>
        </div>

        {isEmailSent && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label htmlFor="reg-code" className={authLabelClass}>
              {t("register.verificationCode")}
            </label>
            <input
              id="reg-code"
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("register.codePlaceholder")}
              className={`${authInputClass} tracking-[0.3em]`}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="rounded-xl border border-success/30 bg-success/10 p-3 text-center text-sm text-success animate-in fade-in duration-300"
          >
            {successMsg}
          </div>
        )}

        <div>
          <label htmlFor="reg-username" className={authLabelClass}>
            {t("register.username")}
          </label>
          <input
            id="reg-username"
            type="text"
            required
            autoComplete="username"
            className={authInputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 items-end gap-3">
          <div>
            <label htmlFor="reg-password" className={authLabelClass}>
              {t("register.password")}
            </label>
            <input
              id="reg-password"
              type="password"
              required
              autoComplete="new-password"
              className={authInputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="reg-teacher-code" className={authLabelClass}>
              {t("register.teacherCode")}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {t("register.optional")}
              </span>
            </label>
            <input
              id="reg-teacher-code"
              type="text"
              className={authInputClass}
              value={registrationCode}
              onChange={(e) => setRegistrationCode(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" disabled={!isEmailSent} className={`${authButtonClass} mt-2`}>
          {t("register.createAccountButton")}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("register.alreadyHaveAccount")}{" "}
        <Link to="/login" className="font-medium text-gold hover:underline">
          {t("register.login")}
        </Link>
      </p>
    </AuthShell>
  );
}
