import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { API_BASE } from "@/components/courseHelpers";
import { readError } from "@/lib/auth";
export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/register" });

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

  return (
    <div className="fixed inset-0 z-100 bg-background flex flex-col items-center justify-center p-4">
      {/* Container yüksekliğini artırmak için max-w-md kullandık */}
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-foreground text-background font-bold text-xl mb-4">
            EK
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("register.title")}</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-md mb-6 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("register.firstName")}
              </label>
              <input
                type="text"
                required
                className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("register.lastName")}
              </label>
              <input
                type="text"
                required
                className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("register.email")}</label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                className="flex-1 p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors disabled:opacity-50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isEmailSent}
              />
              <button
                type="button"
                onClick={handleSendVerificationEmail}
                disabled={isSending || isEmailSent || !email}
                className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 whitespace-nowrap"
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
            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-medium text-foreground">
                {t("register.verificationCode")}
              </label>
              <input
                type="text"
                required
                placeholder={t("register.codePlaceholder")}
                className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-50/50 border border-green-200/50 rounded-lg text-sm text-green-600 text-center animate-in fade-in zoom-in duration-300">
              {successMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("register.username")}</label>
            <input
              type="text"
              required
              className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("register.password")}
              </label>
              <input
                type="password"
                required
                className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("register.teacherCode")}{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  {t("register.optional")}
                </span>
              </label>
              <input
                type="text"
                className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                value={registrationCode}
                onChange={(e) => setRegistrationCode(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!isEmailSent}
            className="w-full py-3 bg-foreground text-background font-medium rounded-md hover:bg-foreground/90 transition-all duration-300 disabled:opacity-50"
          >
            {t("register.createAccountButton")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {t("register.alreadyHaveAccount")}{" "}
          <Link to="/login" className="font-semibold text-foreground hover:underline">
            {t("register.login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
