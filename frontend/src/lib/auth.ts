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

// Backend hata gövdesi düz metin ya da { error } / { message } olabilir
export const readError = async (res: Response, fallback: string) => {
  const text = await res.text().catch(() => "");
  try {
    const data = JSON.parse(text);
    return data.error || data.message || data.title || fallback;
  } catch {
    return text || fallback;
  }
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
