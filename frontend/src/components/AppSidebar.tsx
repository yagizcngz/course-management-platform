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
  Menu,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import type { TFunction } from "i18next";

import { parseJwt, authHeaders, getToken, isAdminRole } from "@/lib/auth";
import { formatTry, initialsOf } from "@/lib/utils";
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
  { title: t("sidebar.courses"), url: "/katalog", icon: BookOpen },
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

      // Token'dan türetilen varsayılan kullanıcı (profil alınamazsa)
      const applyTokenFallback = () => {
        const initials = initialsOf(currentName);
        setCurrentUser({
          name: currentName,
          role: currentRole,
          initials,
          rawRole: currentRawRole,
        });
      };

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

            const initials = initialsOf(currentName);
            setCurrentUser({
              name: currentName,
              role: currentRole,
              initials,
              photo: photo || undefined,
              rawRole: currentRawRole,
            });
          } else {
            applyTokenFallback();
          }
        } catch (err) {
          applyTokenFallback();
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
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const visibleMenuItems = getMenuItems(t).filter((item) => {
    const role = currentUser.rawRole?.toLowerCase();

    // Everyone sees Home, Announcements, and Courses
    if (item.url === "/dashboard" || item.url === "/duyurular" || item.url === "/katalog") {
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

  const content = (
    <>
      <Link to="/dashboard" className="flex items-center gap-2 px-5 py-5 border-b">
        <span className="font-serif text-2xl leading-none">
          E-<span className="text-gold italic">Kurs</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {/* menuItems yerine visibleMenuItems map ediliyor */}
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname === item.url;
          const Icon = item.icon;
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-[background-color,color,box-shadow] duration-200 ${
                isActive
                  ? "bg-secondary text-foreground font-medium shadow-[inset_3px_0_0_var(--gold)]"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-colors ${isActive ? "text-gold" : "group-hover:text-gold"}`}
              />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-secondary transition-colors">
              {currentUser.photo ? (
                <img
                  src={currentUser.photo}
                  alt={currentUser.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground ring-2 ring-gold/40 flex items-center justify-center font-serif text-base">
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
                      ? "bg-secondary text-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-secondary hover:text-foreground"
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
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive transition-all hover:bg-foreground/5"
            >
              <LogOut className="h-4 w-4" />
              {t("sidebar.logout")}
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        {content}
      </aside>
      {/* below md the sidebar becomes a drawer so the page keeps the full width */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={t("sidebar.openMenu")}
            className="fixed bottom-4 left-4 z-40 rounded-full border bg-card p-3 shadow-lg md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          aria-describedby={undefined}
          className="flex w-64 flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground md:hidden"
        >
          <SheetTitle className="sr-only">{t("sidebar.openMenu")}</SheetTitle>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
}
