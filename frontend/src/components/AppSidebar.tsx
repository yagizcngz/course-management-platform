import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
  MessageSquare,
  MessagesSquare,
  UserPlus,
  Award,
  LineChart,
  LifeBuoy,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import type { TFunction } from "i18next";

import {
  parseJwt,
  authHeaders,
  getToken,
  getRoleFromToken,
  isAdminRole,
  isTeacherRole,
} from "@/lib/auth";
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
type MenuRole = "student" | "teacher" | "admin";
const ALL: MenuRole[] = ["student", "teacher", "admin"];
const LEARNERS: MenuRole[] = ["student", "teacher"];

/** The side panel, in order; each item lists the roles that see it (teachers also learn). */
const getMenuItems = (t: TFunction) => [
  { title: t("sidebar.home"), url: "/dashboard", icon: LayoutDashboard, roles: ALL },
  { title: t("sidebar.myCourses"), url: "/kurslarim", icon: GraduationCap, roles: LEARNERS },
  {
    title: t("sidebar.taughtCourses"),
    url: "/verdigim-kurslar",
    icon: BookOpen,
    roles: ["teacher"] as MenuRole[],
  },
  {
    title: t("sidebar.instructorAnalytics"),
    url: "/egitmen-paneli",
    icon: LineChart,
    roles: ["teacher"] as MenuRole[],
  },
  { title: t("sidebar.students"), url: "/ogrenciler", icon: Users, roles: ["admin"] as MenuRole[] },
  {
    title: t("sidebar.teachers"),
    url: "/ogretmenler",
    icon: UserCog,
    roles: ["admin"] as MenuRole[],
  },
  { title: t("sidebar.courses"), url: "/katalog", icon: BookOpen, roles: ALL },
  { title: t("sidebar.achievements"), url: "/basarimlar", icon: Award, roles: LEARNERS },
  {
    title: t("sidebar.pendingRequests"),
    url: "/istekler",
    icon: CheckCircle,
    roles: ["admin"] as MenuRole[],
  },
  {
    title: t("sidebar.enrollments"),
    url: "/kayitlar",
    icon: ClipboardList,
    roles: ["admin"] as MenuRole[],
  },
  {
    title: t("sidebar.reports"),
    url: "/raporlar",
    icon: BarChart3,
    roles: ["admin"] as MenuRole[],
  },
  { title: t("sidebar.announcements"), url: "/duyurular", icon: Bell, roles: ALL },
  // teachers keep their earnings here, students their purchases and refunds
  { title: t("sidebar.wallet"), url: "/cuzdan", icon: Wallet, roles: LEARNERS },
  { title: t("sidebar.messages"), url: "/mesajlar", icon: MessageSquare, roles: ALL },
  { title: t("sidebar.community"), url: "/topluluk", icon: MessagesSquare, roles: ALL },
  {
    title: t("sidebar.mySupportRequests", "Yardım Taleplerim"),
    url: "/yardim-taleplerim",
    icon: HelpCircle,
    roles: LEARNERS,
  },
  { title: t("sidebar.helpCenter"), url: "/yardim", icon: LifeBuoy, roles: ALL },
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
    name: t("common.user"),
    role: t("profile.roles.student"),
    initials: initialsOf(t("common.user")),
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

    let currentName = storedUsername || t("common.user");
    let currentRole = t("profile.roles.student");
    let currentRawRole = "user";

    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        const rawRole = getRoleFromToken(token);

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
            headers: authHeaders(),
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
        name: t("common.user"),
        role: t("profile.roles.student"),
        initials: initialsOf(t("common.user")),
        rawRole: "user",
      });
    }
  }, [location.pathname, t]);

  // Cüzdan bakiyesi (yönetici hariç); satın alma/yükleme sonrası "wallet-changed" olayıyla yenilenir
  const [balance, setBalance] = useState<number | null>(null);
  const showBalance = !!currentUser.rawRole && !isAdminRole(currentUser.rawRole);
  useEffect(() => {
    if (!showBalance || !getToken()) return;
    // only the latest request may set the balance: a slow older answer must not overwrite a newer one
    let seq = 0;
    const load = () => {
      const mine = ++seq;
      fetch(`${API_BASE}/api/wallet/me`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && mine === seq && setBalance(d.balance))
        .catch(() => {});
    };
    load();
    window.addEventListener("wallet-changed", load);
    return () => window.removeEventListener("wallet-changed", load);
  }, [showBalance]);

  // unread direct messages, refreshed on navigation, after a conversation is read and every 20 s (the conversation list's rate)
  // plus pending incoming friend requests; a rise since the last check shows a toast
  const [unread, setUnread] = useState(0);
  const [requests, setRequests] = useState(0);
  const lastRequests = useRef<number | null>(null);
  useEffect(() => {
    if (!getToken()) return;
    let alive = true;
    const load = () =>
      fetch(`${API_BASE}/api/messages/unread-count`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d || !alive) return;
          setUnread(d.count);
          const n: number = d.friendRequests ?? 0;
          const prev = lastRequests.current;
          lastRequests.current = n;
          setRequests(n);
          if (prev !== null && n > prev && location.pathname !== "/mesajlar")
            toast(t("community.newFriendRequests", { count: n - prev }), {
              id: "friend-requests",
              action: {
                label: t("community.viewRequests"),
                onClick: () => navigate({ to: "/mesajlar" }),
              },
            });
        })
        .catch(() => {});
    load();
    const id = window.setInterval(load, 20_000);
    window.addEventListener("messages-read", load);
    window.addEventListener("friends-changed", load);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("messages-read", load);
      window.removeEventListener("friends-changed", load);
    };
    // t and navigate are stable enough; reload only on navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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

  const menuRole: MenuRole = isAdminRole(currentUser.rawRole)
    ? "admin"
    : isTeacherRole(currentUser.rawRole)
      ? "teacher"
      : "student";
  const visibleMenuItems = getMenuItems(t).filter((item) => item.roles.includes(menuRole));

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
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              {item.url === "/mesajlar" && unread > 0 && (
                <span className="rounded-full bg-gold px-1.5 font-mono text-[10px] text-night tabular-nums">
                  {unread}
                  <span className="sr-only"> {t("community.unread")}</span>
                </span>
              )}
              {item.url === "/mesajlar" && requests > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full border border-gold/60 px-1.5 font-mono text-[10px] text-gold tabular-nums"
                  title={t("community.incoming", { count: requests })}
                >
                  <UserPlus className="size-2.5" aria-hidden="true" />
                  {requests}
                  <span className="sr-only"> {t("community.incoming", { count: requests })}</span>
                </span>
              )}
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
