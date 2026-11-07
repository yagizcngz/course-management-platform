import { createElement, useEffect, useState, type ComponentType } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getRoleFromToken, getToken, isAdminRole, isTeacherRole } from "@/lib/auth";

// Rolü uymayan kullanıcıyı ana sayfaya, oturumu olmayanı girişe yönlendirir.
// Kontrol geçince true döner; token yalnızca tarayıcıda okunabildiği için ilk render false'tur.
export function useRoleGuard(allowed: (role: string) => boolean) {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!allowed(getRoleFromToken())) {
      navigate({ to: "/", replace: true });
      return;
    }
    setOk(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return ok;
}

export const useAdminGuard = () => useRoleGuard(isAdminRole);

// Sayfayı rol kontrolü geçene kadar mount etmez; böylece yetkisiz kullanıcı için
// sayfanın veri istekleri hiç gönderilmez (önceden yönlendirmeden önce 403 alıyordu).
function withRoleGuard<P extends object>(
  Page: ComponentType<P>,
  allowed: (role: string) => boolean,
) {
  return function Guarded(props: P) {
    return useRoleGuard(allowed) ? createElement(Page, props) : null;
  };
}

export const adminOnly = <P extends object>(Page: ComponentType<P>) =>
  withRoleGuard(Page, isAdminRole);
/** Students and teachers: the roles that hold a wallet. */
export const participantOnly = <P extends object>(Page: ComponentType<P>) =>
  withRoleGuard(Page, (role) => !isAdminRole(role));
export const teacherOnly = <P extends object>(Page: ComponentType<P>) =>
  withRoleGuard(Page, isTeacherRole);
