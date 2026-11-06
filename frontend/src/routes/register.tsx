import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { API_BASE, fetchCategories } from "@/components/courseHelpers";
import { readError } from "@/lib/auth";
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from "@/components/AuthShell";
import { FolioScene } from "@/components/effects/three/FolioScene";
import { GraduationCap, Presentation } from "lucide-react";
import { motion } from "motion/react";
import { SplitHeadline } from "@/components/motion";
import { toast } from "sonner";

const MIN_BIO = 40;
const MIN_PASSWORD = 8; // AuthController.MinPasswordLength
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL_MS = 5 * 60 * 1000; // AuthController keeps the e-mail code for five minutes
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
  const [asTeacher, setAsTeacher] = useState(false);
  const [branch, setBranch] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // ticks once a second only while a code is waiting to be used
  useEffect(() => {
    if (!isEmailSent) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isEmailSent]);
  const codeLeft = codeSentAt ? Math.max(0, CODE_TTL_MS - (now - codeSentAt)) : 0;
  const codeClock = `${Math.floor(codeLeft / 60000)}:${String(Math.floor((codeLeft % 60000) / 1000)).padStart(2, "0")}`;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (!EMAIL_RE.test(email.trim())) {
        setError(t("register.invalidEmail"));
        return;
      }
      // checked here too so a missing field never costs a round trip
      if (password.length < MIN_PASSWORD) {
        setError(t("register.passwordTooShort", { count: MIN_PASSWORD }));
        return;
      }
      if (asTeacher && !branch) {
        setError(t("register.branchRequired"));
        return;
      }
      if (asTeacher && aboutMe.trim().length < MIN_BIO) {
        setError(t("register.bioTooShort", { count: MIN_BIO }));
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
          verificationCode: verificationCode.trim(),
          applyAsTeacher: asTeacher,
          branch: asTeacher ? branch : null,
          aboutMe: asTeacher ? aboutMe.trim() : null,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.teacherApplication === "Pending") toast.success(t("register.applicationSent"));
        navigate({ to: "/login" });
      } else {
        // the email code stays valid after a failed attempt, so the user only fixes the field
        const raw = await readError(response, t("register.registerError"));
        const keepsCode = response.status === 400 && raw !== t("backendErrors.invalidCode");
        setError(raw + (keepsCode ? ` ${t("register.codeStillValid")}` : ""));
      }
    } catch (err) {
      setError(t("register.serverError"));
    }
  };

  const handleSendVerificationEmail = async () => {
    setError("");
    setSuccessMsg("");
    if (!EMAIL_RE.test(email.trim())) {
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
        setCodeSentAt(Date.now());
        setNow(Date.now());
        setVerificationCode("");
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

  // entering the address and confirming its code are separate steps, so filling every visible
  // field leaves exactly one tick open and the panel names it
  const steps: [boolean, string][] = [
    [!!firstName.trim(), t("register.firstName")],
    [!!lastName.trim(), t("register.lastName")],
    [EMAIL_RE.test(email.trim()), t("register.email")],
    [isEmailSent && verificationCode.trim().length === 6, t("register.stepVerify")],
    [!!username.trim(), t("register.username")],
    [password.length >= MIN_PASSWORD, t("register.password")],
    ...(asTeacher
      ? ([
          [!!branch, t("register.branch")],
          [aboutMe.trim().length >= MIN_BIO, t("register.bio")],
        ] as [boolean, string][])
      : []),
  ];
  const done = steps.filter(([ok]) => ok).length;
  const next = steps.find(([ok]) => !ok)?.[1];

  return (
    <AuthShell
      caption={t("register.panelTitle")}
      eyebrow={t(asTeacher ? "register.panelEyebrowTeacher" : "register.panelEyebrow")}
      steps={{ done, total: steps.length, next }}
      panel={
        <FolioScene
          progress={done / steps.length}
          arrangement={asTeacher ? "shelf" : "stack"}
          lit={false}
          shake={0}
        />
      }
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
              onClick={
                isEmailSent
                  ? () => {
                      // lets a mistyped address be corrected without reloading the page
                      setIsEmailSent(false);
                      setVerificationCode("");
                    }
                  : handleSendVerificationEmail
              }
              disabled={isSending || (!isEmailSent && !email)}
              className="whitespace-nowrap rounded-xl border border-border bg-secondary px-4 text-sm font-medium text-foreground transition-colors hover:border-gold/60 disabled:opacity-50"
            >
              {isSending
                ? t("register.sending")
                : isEmailSent
                  ? t("register.changeEmail")
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
            {codeLeft > 0 ? (
              <div className="mt-2" role="timer" aria-live="off">
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gold transition-[width] duration-1000 ease-linear"
                    style={{ width: `${(codeLeft / CODE_TTL_MS) * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                  {t("register.codeExpiresIn", { time: codeClock })}
                </p>
              </div>
            ) : (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive">
                {t("register.codeExpired")}
                <button
                  type="button"
                  onClick={handleSendVerificationEmail}
                  disabled={isSending}
                  className="font-medium text-gold underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {t("register.resendCode")}
                </button>
              </p>
            )}
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

        <div>
          <label htmlFor="reg-password" className={authLabelClass}>
            {t("register.password")}
          </label>
          <input
            id="reg-password"
            type="password"
            required
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            className={authInputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <fieldset>
          <legend className={authLabelClass}>{t("register.roleLabel")}</legend>
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-secondary/60 p-1">
            {([false, true] as const).map((teacher) => {
              const Icon = teacher ? Presentation : GraduationCap;
              const active = asTeacher === teacher;
              return (
                <button
                  key={String(teacher)}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAsTeacher(teacher)}
                  className="relative rounded-xl px-3 py-2.5 text-left transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId="role-pill"
                      className="absolute inset-0 rounded-xl border border-gold/50 bg-card shadow-sm"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2 text-sm font-medium">
                    <Icon
                      aria-hidden="true"
                      className={`size-4 ${active ? "text-gold" : "text-muted-foreground"}`}
                    />
                    <span className={active ? "text-foreground" : "text-muted-foreground"}>
                      {t(teacher ? "register.roleTeacher" : "register.roleStudent")}
                    </span>
                  </span>
                  <span className="relative mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    {t(teacher ? "register.roleTeacherDesc" : "register.roleStudentDesc")}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {asTeacher && (
          <div className="space-y-4 rounded-xl border border-gold/30 bg-gold/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("register.applyIntro")}
            </p>
            <div>
              <label htmlFor="reg-branch" className={authLabelClass}>
                {t("register.branch")}
              </label>
              <select
                id="reg-branch"
                required
                className={authInputClass}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="">{t("register.branchPlaceholder")}</option>
                {categories.map((c, i) => (
                  <option key={c} value={c}>
                    {categoryLabels[i]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reg-bio" className={authLabelClass}>
                {t("register.bio")}
              </label>
              <textarea
                id="reg-bio"
                required
                rows={4}
                minLength={MIN_BIO}
                maxLength={2000}
                aria-describedby="reg-bio-hint"
                placeholder={t("register.bioPlaceholder")}
                className={`${authInputClass} resize-y`}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
              />
              <p id="reg-bio-hint" className="mt-1 text-xs text-muted-foreground">
                {t("register.bioHint", { count: MIN_BIO, length: aboutMe.trim().length })}
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!isEmailSent || codeLeft === 0}
          className={`${authButtonClass} mt-2`}
        >
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
