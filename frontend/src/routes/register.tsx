import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { API_BASE, fetchCategories } from "@/components/courseHelpers";
import { readError } from "@/lib/auth";
import { translateBackendError } from "@/lib/errorTranslator";
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from "@/components/AuthShell";
import { SolarSystem } from "@/components/effects/SolarSystem";
import { SplitHeadline } from "@/components/motion";
import { toast } from "sonner";

const MIN_BIO = 40;
const MIN_PASSWORD = 8; // AuthController.MinPasswordLength
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
  const [asTeacher, setAsTeacher] = useState(false);
  const [branch, setBranch] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [showCode, setShowCode] = useState(false);
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
      const code = asTeacher ? registrationCode.trim() : "";
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          username,
          email,
          password,
          registrationCode: code || null,
          verificationCode: verificationCode.trim(),
          applyAsTeacher: asTeacher,
          branch: asTeacher ? branch : null,
          aboutMe: asTeacher ? aboutMe.trim() : null,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.teacherApplication === "Pending") toast.success(t("register.applicationSent"));
        else if (data?.role === "Teacher") toast.success(t("register.teacherReady"));
        navigate({ to: "/login" });
      } else {
        // the email code stays valid after a failed attempt, so the user only fixes the field
        const raw = await readError(response, t("register.registerError"));
        const keepsCode = response.status === 400 && !raw.toLowerCase().includes("doğrulama kodu");
        setError(
          translateBackendError(raw, t) + (keepsCode ? ` ${t("register.codeStillValid")}` : ""),
        );
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
        setError(translateBackendError(await readError(response, t("register.codeSendError")), t));
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
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-secondary/60 p-1">
            {([false, true] as const).map((teacher) => (
              <button
                key={String(teacher)}
                type="button"
                aria-pressed={asTeacher === teacher}
                onClick={() => setAsTeacher(teacher)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
              >
                {t(teacher ? "register.roleTeacher" : "register.roleStudent")}
              </button>
            ))}
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
            <div>
              <button
                type="button"
                aria-expanded={showCode}
                aria-controls="reg-invite"
                onClick={() => setShowCode((v) => !v)}
                className="text-sm font-medium text-gold underline-offset-4 hover:underline"
              >
                {t("register.haveInviteCode")}
              </button>
              {showCode && (
                <div id="reg-invite" className="mt-2">
                  <label htmlFor="reg-teacher-code" className={authLabelClass}>
                    {t("register.inviteCode")}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("register.optional")}
                    </span>
                  </label>
                  <input
                    id="reg-teacher-code"
                    type="text"
                    autoComplete="off"
                    className={authInputClass}
                    value={registrationCode}
                    onChange={(e) => setRegistrationCode(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{t("register.inviteHint")}</p>
                </div>
              )}
            </div>
          </div>
        )}

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
