import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getRoleFromToken, getToken, isAdminRole, isTeacherRole } from "@/lib/auth";

// Rolü uymayan kullanıcıyı ana sayfaya, oturumu olmayanı girişe yönlendirir.
export function useRoleGuard(allowed: (role: string) => boolean) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!allowed(getRoleFromToken())) {
      navigate({ to: "/", replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);
}

export const useAdminGuard = () => useRoleGuard(isAdminRole);
export const useTeacherGuard = () => useRoleGuard(isTeacherRole);
