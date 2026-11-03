import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  BarChart3,
  ChevronUp,
  User,
  Settings,
  HelpCircle,
  GraduationCap,
  UserCog,
  LogOut,
  Bell,
  CheckCircle,
  Wallet,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { TFunction } from "i18next";

import { parseJwt, authHeaders, getToken, isAdminRole } from "@/lib/auth";
import { formatTry } from "@/lib/utils";
import { API_BASE } from "@/components/courseHelpers";
const translateRole = (role: string, t: TFunction) => {
  const r = String(role).toLowerCase();
  if (r === "user" || r === "student") return t("profile.roles.student");
  if (r === "teacher") return t("profile.roles.teacher");
  if (r === "admin") return t("profile.roles.admin");
  return role;
};

interface ProfileMeDto {
  profilePictureUrl?: string;
  ProfilePictureUrl?: string;
  firstName?: string;
  lastName?: string;
}

// Tüm menü listesi (Henüz filtrelenmemiş hali)
const getMenuItems = (t: TFunction) => [
  { title: t("sidebar.home"), url: "/dashboard", icon: LayoutDashboard },
  { title: t("sidebar.myCourses"), url: "/kurslarim", icon: GraduationCap },
  { title: t("sidebar.taughtCourses"), url: "/verdigim-kurslar", icon: BookOpen },
  { title: t("sidebar.students"), url: "/ogrenciler", icon: Users },
  { title: t("sidebar.teachers"), url: "/ogretmenler", icon: UserCog },
  { title: t("sidebar.courses"), url: "/kurslar", icon: BookOpen },
  { title: t("sidebar.pendingRequests"), url: "/istekler", icon: CheckCircle },
  { title: t("sidebar.enrollments"), url: "/kayitlar", icon: ClipboardList },
  { title: t("sidebar.reports"), url: "/raporlar", icon: BarChart3 },
  { title: t("sidebar.announcements"), url: "/duyurular", icon: Bell },
  { title: t("sidebar.wallet"), url: "/cuzdan", icon: Wallet },
  {
    title: t("sidebar.mySupportRequests", "Yardım Taleplerim"),
    url: "/yardim-taleplerim",
    icon: HelpCircle,
  },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: string;
    initials: string;
    photo?: string;
    rawRole?: string;
  }>({
    name: "Kullanıcı",
    role: t("profile.roles.student"),
    initials: "K",
    rawRole: "user",
  });

  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    const storedUsername = localStorage.getItem("username");

    if (token === lastTokenRef.current) {
      return;
    }

    lastTokenRef.current = token;

    let currentName = storedUsername || "Kullanıcı";
    let currentRole = t("profile.roles.student");
    let currentRawRole = "user";

    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        const rawRole =
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
          payload.role ||
          "";

        currentRawRole = rawRole || "user";
        currentRole = translateRole(rawRole || "user", t);

        if (!storedUsername) {
          currentName = payload.name || payload.unique_name || payload.sub || currentName;
        }
      }

      const loadProfileData = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/profile/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const data: ProfileMeDto = await res.json();
            const photo = data.profilePictureUrl || data.ProfilePictureUrl;

            const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
            if (fullName) {
              currentName = fullName;
            }

            const initials = currentName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase();
            setCurrentUser({
              name: currentName,
              role: currentRole,
              initials,
              photo: photo || undefined,
              rawRole: currentRawRole,
            });
          }
        } catch (err) {
          const initials = currentName
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase();
          setCurrentUser({
            name: currentName,
            role: currentRole,
            initials,
            rawRole: currentRawRole,
          });
        }
      };

      loadProfileData();
    } else {
      setCurrentUser({
        name: "Kullanıcı",
        role: t("profile.roles.student"),
        initials: "K",
        rawRole: "user",
      });
    }
  }, [location.pathname, t]);

  // Cüzdan bakiyesi (yönetici hariç); satın alma/yükleme sonrası "wallet-changed" olayıyla yenilenir
  const [balance, setBalance] = useState<number | null>(null);
  const showBalance = !!currentUser.rawRole && !isAdminRole(currentUser.rawRole);
  useEffect(() => {
    if (!showBalance || !getToken()) return;
    const load = () =>
      fetch(`${API_BASE}/api/wallet/me`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setBalance(d.balance))
        .catch(() => {});
    load();
    window.addEventListener("wallet-changed", load);
    return () => window.removeEventListener("wallet-changed", load);
  }, [showBalance]);

  useEffect(() => {
    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { name?: string; photoUrl?: string } | undefined;

      setCurrentUser((prev) => ({
        ...prev,
        name: detail?.name || prev.name,
        photo: detail?.photoUrl !== undefined ? detail.photoUrl : prev.photo,
      }));
    };

    window.addEventListener("profile-updated", onProfileUpdated as EventListener);
    return () => window.removeEventListener("profile-updated", onProfileUpdated as EventListener);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("username");
    localStorage.removeItem("user_profile");
    navigate({ to: "/" });
  };

  const menuLinks = [
    { label: t("sidebar.profile"), icon: User, to: "/profil" },
    { label: t("sidebar.settings"), icon: Settings, to: "/ayarlar" },
    { label: t("sidebar.help"), icon: HelpCircle, to: "/yardim" },
  ];

  // YENİ EKLENEN KISIM: Rol tabanlı menü filtreleme
  const visibleMenuItems = getMenuItems(t).filter((item) => {
    const role = currentUser.rawRole?.toLowerCase();

    // Everyone sees Home, Announcements, and Courses
    if (item.url === "/dashboard" || item.url === "/duyurular" || item.url === "/kurslar") {
      return true;
    }

    if (role === "admin" || role === "superadmin") {
      // Admins don't teach courses usually, but they can see everything else
      if (item.url === "/verdigim-kurslar") return false;
      if (item.url === "/kurslarim") return false;
      if (item.url === "/yardim-taleplerim") return false;
      if (item.url === "/cuzdan") return false;
      return true;
    }

    if (role === "teacher") {
      if (item.url === "/verdigim-kurslar") return true;
      if (item.url === "/kurslarim") return true;
      if (item.url === "/yardim-taleplerim") return true;
    }

    // Default for user/student or unrecognized role
    if (item.url === "/cuzdan") return true;
    if (item.url === "/kurslarim") return true;
    if (item.url === "/yardim-taleplerim") return true;

    return false;
  });

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <BookOpen className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">E-Kurs</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* menuItems yerine visibleMenuItems map ediliyor */}
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname === item.url;
          const Icon = item.icon;
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all ${
                isActive
                  ? "bg-neutral-900 text-white font-medium shadow-[0_4px_10px_-2px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.12),inset_0_-2px_0_0_rgba(0,0,0,0.5)] ring-1 ring-black/60"
                  : "text-sidebar-foreground hover:bg-neutral-900/5 hover:text-neutral-900 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),inset_0_-1px_0_0_rgba(0,0,0,0.08)] dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent transition-colors">
              {currentUser.photo ? (
                <img
                  src={currentUser.photo}
                  alt={currentUser.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {currentUser.initials}
                </div>
              )}
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-medium truncate">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {translateRole(currentUser.rawRole || "user", t)}
                  {showBalance && balance !== null && (
                    <span className="tabular-nums"> · {formatTry(balance)}</span>
                  )}
                </p>
              </div>
              <ChevronUp
                className={`h-4 w-4 transition-transform ${menuOpen ? "" : "rotate-180"}`}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-56 p-1">
            {menuLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-all ${
                    isActive
                      ? "bg-black text-white dark:bg-white dark:text-black font-medium"
                      : "text-sidebar-foreground hover:bg-neutral-900/5 hover:text-neutral-900 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="my-1 h-px bg-border" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive transition-all hover:bg-neutral-900/5 dark:hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              {t("sidebar.logout")}
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
