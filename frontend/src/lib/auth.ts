import { translateBackendError } from "./errorTranslator";
// JWT çözme ve rol kontrolleri tek yerde. Backend rolleri: "User" (öğrenci), "Teacher", "Admin".
const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export const parseJwt = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("jwt_token");

export const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

// Backend hata gövdesi düz metin, { error } / { message } ya da doğrulama hatası ({ errors: { Alan: [..] } })
// olabilir; mesaj arayüz diline çevrilir
export const readError = async (res: Response, fallback: string) => {
  const text = await res.text().catch(() => "");
  let message = text;
  try {
    const data = JSON.parse(text);
    const firstFieldError = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
    message =
      typeof data === "string"
        ? data
        : String(firstFieldError || data?.error || data?.message || data?.title || "");
  } catch {
    // plain-text body
  }
  return message.trim() ? translateBackendError(message.trim()) : fallback;
};

export const getRoleFromToken = (token = getToken()): string => {
  if (!token) return "";
  const payload = parseJwt(token);
  return String(payload?.[ROLE_CLAIM] || payload?.role || "");
};

export const isAdminRole = (role?: string | null) => {
  const r = (role || "").toLowerCase();
  return r === "admin" || r === "superadmin";
};

export const isTeacherRole = (role?: string | null) => {
  const r = (role || "").toLowerCase();
  return r === "teacher" || r === "eğitmen";
};

export const isStudentRole = (role?: string | null) => {
  const r = (role || "").toLowerCase();
  return r === "user" || r === "student" || r === "öğrenci";
};
