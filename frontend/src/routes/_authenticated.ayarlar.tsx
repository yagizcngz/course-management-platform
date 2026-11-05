import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { User as UserIcon, Lock, Mail, Database, List, Plus, Trash2, Palette } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LanguageToggle, ThemeToggle } from "@/components/DisplayToggles";
import { Switch } from "@/components/ui/switch";
import { chip, pillButton } from "@/lib/utils";
import { authHeaders, getRoleFromToken, isAdminRole, readError } from "@/lib/auth";
import { API_BASE } from "@/components/courseHelpers";
interface SystemSettingData {
  settingKey: string;
  settingValue: string;
  description?: string;
}

interface CategoryData {
  id: string | number;
  name: string;
  description?: string;
  subCategories?: string[];
}

export const Route = createFileRoute("/_authenticated/ayarlar")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<"account" | "preferences" | "system" | "categories">(
    "account",
  );

  const [isAdmin, setIsAdmin] = useState(false);

  // Profile State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [receiveEmail, setReceiveEmail] = useState(true);

  // Account State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  // System Settings State
  const [settings, setSettings] = useState<SystemSettingData[]>([]);
  const [newSettingKey, setNewSettingKey] = useState("");
  const [newSettingValue, setNewSettingValue] = useState("");
  const [newSettingDesc, setNewSettingDesc] = useState("");

  // Categories State
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");

  useEffect(() => {
    setIsAdmin(isAdminRole(getRoleFromToken()));
    fetchProfile();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchCategoriesList();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/systemsettings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSettings(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategoriesList = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setAboutMe(data.aboutMe || "");
        setProfilePic(data.profilePictureUrl || "");
        setIsPublic(data.isProfilePublic ?? true);
        setReceiveEmail(data.receiveEmailNotifications ?? true);
        setUsername(data.username || "");
        setEmail(data.email || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (type: "success" | "error", message: string) =>
    type === "error" ? toast.error(message) : toast.success(message);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/profile/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        showToast("success", t("settings.success"));
        setCurrentPassword("");
        setNewPassword("");
      } else {
        showToast("error", await readError(res, t("settings.errors.passwordFailed")));
      }
    } catch {
      showToast("error", t("courses.errors.serverError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/profile/change-email`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail: email }),
      });
      if (res.ok) {
        showToast("success", t("settings.success"));
      } else {
        showToast("error", await readError(res, t("settings.errors.emailFailed")));
      }
    } catch {
      showToast("error", t("courses.errors.serverError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/profile/change-username`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newUsername: username }),
      });
      if (res.ok) {
        showToast("success", t("settings.success"));
        setTimeout(() => {
          localStorage.removeItem("jwt_token");
          localStorage.removeItem("username");
          localStorage.removeItem("user_profile");
          window.location.href = "/login";
        }, 1500);
      } else {
        showToast("error", await readError(res, t("settings.errors.usernameFailed")));
      }
    } catch {
      showToast("error", t("courses.errors.serverError"));
    } finally {
      setIsSaving(false);
    }
  };

  // the switch saves at once; a failed save puts it back
  const savePreference = async (value: boolean) => {
    setReceiveEmail(value);
    const res = await fetch(`${API_BASE}/api/profile/me`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        firstName,
        lastName,
        aboutMe,
        profilePictureUrl: profilePic,
        isProfilePublic: isPublic,
        receiveEmailNotifications: value,
      }),
    }).catch(() => null);
    if (res?.ok) showToast("success", t("settings.success"));
    else {
      setReceiveEmail(!value);
      showToast("error", t("settings.system.updateFailed"));
    }
  };

  const saveSetting = async (setting: SystemSettingData, value: string) => {
    if (value === setting.settingValue) return;
    const res = await fetch(`${API_BASE}/api/systemsettings/${setting.settingKey}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ settingValue: value, description: setting.description }),
    }).catch(() => null);
    if (res?.ok) {
      showToast("success", t("settings.system.updateSuccess"));
      fetchSettings();
    } else showToast("error", t("settings.system.updateFailed"));
  };

  const addSetting = async () => {
    if (!newSettingKey || !newSettingValue) return;
    const res = await fetch(`${API_BASE}/api/systemsettings/${newSettingKey}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ settingValue: newSettingValue, description: newSettingDesc }),
    }).catch(() => null);
    if (res?.ok) {
      showToast("success", t("settings.system.addSuccess"));
      setNewSettingKey("");
      setNewSettingValue("");
      setNewSettingDesc("");
      fetchSettings();
    } else showToast("error", t("settings.system.addFailed"));
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const res = await fetch(`${API_BASE}/api/categories`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: newCategoryName, description: newCategoryDesc }),
    }).catch(() => null);
    if (res?.ok) {
      showToast("success", t("settings.categories.addSuccess"));
      setNewCategoryName("");
      setNewCategoryDesc("");
      fetchCategoriesList();
    } else
      showToast(
        "error",
        res
          ? await readError(res, t("settings.categories.addFailed"))
          : t("settings.categories.addFailed"),
      );
  };

  if (isLoading) {
    return (
      <>
        <PageHeader crumb={t("sidebar.settings")} />
        <div className="p-8 flex justify-center">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </>
    );
  }

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "account", label: t("settings.tabs.account") },
    { id: "preferences", label: t("settings.tabs.preferences") },
    ...(isAdmin
      ? [
          { id: "system" as const, label: t("settings.tabs.system") },
          { id: "categories" as const, label: t("settings.tabs.categories") },
        ]
      : []),
  ];
  const label = (key: string, ns: "categories" | "subCategories") =>
    i18n.exists(`dynamic.${ns}.${key}`) ? t(`dynamic.${ns}.${key}`) : key;

  const deleteAccount = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/profile/me`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await readError(res, t("settings.profile.deleteError")));
      localStorage.removeItem("jwt_token");
      window.location.href = "/";
    } catch (e) {
      showToast("error", (e as Error).message);
    }
  };

  const deleteSetting = async (key: string) => {
    const res = await fetch(`${API_BASE}/api/systemsettings/${key}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).catch(() => null);
    if (res?.ok) {
      showToast("success", t("settings.system.deleteSuccess"));
      fetchSettings();
    } else showToast("error", t("settings.system.deleteFailed"));
  };

  const deleteCategory = async (id: string | number) => {
    const res = await fetch(`${API_BASE}/api/categories/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).catch(() => null);
    if (res?.ok) {
      showToast("success", t("settings.categories.deleteSuccess"));
      fetchCategoriesList();
    } else
      showToast(
        "error",
        res
          ? await readError(res, t("settings.categories.deleteFailed"))
          : t("settings.categories.deleteFailed"),
      );
  };

  return (
    <>
      <PageHeader crumb={t("sidebar.settings")} />
      <div className="mx-auto w-full max-w-5xl space-y-8 p-4 md:p-8 animate-reveal">
        <div className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            {t("settings.eyebrow")}
          </p>
          <h1 className="font-serif text-5xl leading-none">{t("settings.title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("settings.intro")}</p>
        </div>

        <div role="tablist" aria-label={t("settings.title")} className="flex flex-wrap gap-2">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={chip(activeTab === tab.id)}
            >
              <span className="font-mono text-[10px] opacity-70">
                {String(i + 1).padStart(2, "0")}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "account" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Panel no="01" title={t("settings.account.identityTitle")} icon={<UserIcon />}>
              <p className="text-sm text-muted-foreground">{t("settings.account.description")}</p>
              <form onSubmit={handleUpdateUsername} className="space-y-1.5">
                <label htmlFor="set-username" className="text-sm font-medium">
                  {t("settings.account.username")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="set-username"
                    className={field}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <button type="submit" disabled={isSaving} className={pillButton.outline}>
                    {t("settings.account.updateUsername")}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("settings.account.usernameHint")}
                </p>
              </form>
              <form onSubmit={handleUpdateEmail} className="space-y-1.5">
                <label htmlFor="set-email" className="text-sm font-medium">
                  {t("settings.account.email")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="set-email"
                    type="email"
                    className={field}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button type="submit" disabled={isSaving} className={pillButton.outline}>
                    {t("settings.account.updateEmail")}
                  </button>
                </div>
              </form>
            </Panel>

            <Panel no="02" title={t("settings.account.changePassword")} icon={<Lock />}>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="set-current" className="text-sm font-medium">
                    {t("settings.account.currentPassword")}
                  </label>
                  <input
                    id="set-current"
                    type="password"
                    required
                    autoComplete="current-password"
                    className={field}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="set-new" className="text-sm font-medium">
                    {t("settings.account.newPassword")}
                  </label>
                  <input
                    id="set-new"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={field}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("backendErrors.passwordTooShort", { count: 8 })}
                  </p>
                </div>
                <button type="submit" disabled={isSaving} className={pillButton.primary}>
                  {t("settings.account.changePassword")}
                </button>
              </form>
            </Panel>

            <section className="md:col-span-2 min-w-0 rounded-xl border border-destructive/40 bg-card p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-destructive">
                03 · {t("settings.profile.manageAccount")}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <p className="max-w-xl text-sm text-muted-foreground">
                  {t("settings.profile.manageAccountDesc")}
                </p>
                <ConfirmDialog
                  title={t("settings.profile.deleteAccount")}
                  description={t("settings.profile.deleteConfirm")}
                  confirmLabel={t("settings.profile.deleteAccount")}
                  onConfirm={deleteAccount}
                >
                  <button className={pillButton.danger}>
                    <Trash2 className="size-4" />
                    {t("settings.profile.deleteAccount")}
                  </button>
                </ConfirmDialog>
              </div>
            </section>
          </div>
        )}

        {activeTab === "preferences" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Panel no="01" title={t("settings.preferences.emailNotifications")} icon={<Mail />}>
              <p className="text-sm text-muted-foreground">
                {t("settings.preferences.description")}
              </p>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                <span className="text-sm font-medium">
                  {t("settings.preferences.receiveNotifications")}
                </span>
                <Switch checked={receiveEmail} onCheckedChange={savePreference} />
              </label>
            </Panel>
            <Panel no="02" title={t("settings.preferences.displayTitle")} icon={<Palette />}>
              <p className="text-sm text-muted-foreground">
                {t("settings.preferences.displayDesc")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </Panel>
          </div>
        )}

        {isAdmin && activeTab === "system" && (
          <Panel no="01" title={t("settings.system.title")} icon={<Database />}>
            <p className="text-sm text-muted-foreground">{t("settings.system.description")}</p>
            <ul className="space-y-3">
              {settings.map((setting) => (
                <li
                  key={setting.settingKey}
                  className="flex min-w-0 items-start gap-4 rounded-lg border border-border p-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-mono text-xs uppercase tracking-[0.12em] text-gold">
                      {setting.settingKey}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {i18n.exists(`settings.system.keys.${setting.settingKey}`)
                        ? t(`settings.system.keys.${setting.settingKey}`)
                        : setting.description || "-"}
                    </p>
                    <input
                      aria-label={setting.settingKey}
                      className={field}
                      defaultValue={setting.settingValue}
                      onBlur={(e) => saveSetting(setting, e.target.value)}
                    />
                  </div>
                  <ConfirmDialog
                    title={t("settings.system.deleteTitle")}
                    description={`"${setting.settingKey}" ${t("settings.system.deleteConfirm")}`}
                    confirmLabel={t("settings.system.deleteBtn")}
                    onConfirm={() => deleteSetting(setting.settingKey)}
                  >
                    <button
                      aria-label={t("settings.system.deleteBtn")}
                      className="rounded-full p-2 text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </ConfirmDialog>
                </li>
              ))}
            </ul>

            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="font-serif text-xl">{t("settings.system.newSettingTitle")}</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  aria-label={t("settings.system.keyPlaceholder")}
                  className={field}
                  value={newSettingKey}
                  onChange={(e) => setNewSettingKey(e.target.value)}
                >
                  <option value="" disabled>
                    {t("settings.system.keyPlaceholder")}
                  </option>
                  {KNOWN_SETTINGS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <input
                  placeholder={t("settings.system.valuePlaceholder")}
                  className={field}
                  value={newSettingValue}
                  onChange={(e) => setNewSettingValue(e.target.value)}
                />
                <input
                  placeholder={t("settings.system.descPlaceholder")}
                  className={field}
                  value={newSettingDesc}
                  onChange={(e) => setNewSettingDesc(e.target.value)}
                />
              </div>
              {newSettingKey && (
                <p className="text-xs text-muted-foreground">
                  {t(`settings.system.keys.${newSettingKey}`)}
                </p>
              )}
              <button onClick={addSetting} className={pillButton.primary}>
                <Plus className="size-4" /> {t("settings.system.addBtn")}
              </button>
            </div>
          </Panel>
        )}

        {isAdmin && activeTab === "categories" && (
          <Panel no="01" title={t("settings.categories.title")} icon={<List />}>
            <p className="text-sm text-muted-foreground">{t("settings.categories.description")}</p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {categories.map((cat) => (
                <li key={cat.id} className="flex min-w-0 items-start gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-xl leading-tight">
                      {label(cat.name, "categories")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {i18n.exists(`dynamic.categoryDescriptions.${cat.name}`)
                        ? t(`dynamic.categoryDescriptions.${cat.name}`)
                        : cat.description || t("settings.categories.noDesc")}
                    </p>
                    {!!cat.subCategories?.length && (
                      <ul
                        aria-label={t("settings.categories.subCategories")}
                        className="mt-3 flex flex-wrap gap-1.5"
                      >
                        {cat.subCategories.map((s) => (
                          <li
                            key={s}
                            className="rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground"
                          >
                            {label(s, "subCategories")}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                    {t("settings.categories.subCount", { count: cat.subCategories?.length ?? 0 })}
                  </span>
                  <ConfirmDialog
                    title={t("settings.categories.deleteTitle")}
                    description={t("settings.categories.deleteConfirm")}
                    confirmLabel={t("settings.categories.deleteBtn")}
                    onConfirm={() => deleteCategory(cat.id)}
                  >
                    <button
                      aria-label={t("settings.categories.deleteBtn")}
                      className="rounded-full p-2 text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </ConfirmDialog>
                </li>
              ))}
            </ul>

            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="font-serif text-xl">{t("settings.categories.newCategoryTitle")}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  placeholder={t("settings.categories.namePlaceholder")}
                  className={field}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <input
                  placeholder={t("settings.categories.descPlaceholder")}
                  className={field}
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                />
              </div>
              <button onClick={addCategory} className={pillButton.primary}>
                <Plus className="size-4" /> {t("settings.categories.addBtn")}
              </button>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

const KNOWN_SETTINGS = ["TEACHER_CODE", "ADMIN_CODE", "TEACHER_SHARE_PERCENT"];

const field =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-gold focus:ring-4 focus:ring-gold/15";

/** A numbered settings card with a serif title. */
function Panel({
  no,
  title,
  icon,
  children,
}: {
  no: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-5 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {no}
          </p>
          <h2 className="mt-1 font-serif text-2xl leading-tight">{title}</h2>
        </div>
        <span className="text-gold [&>svg]:size-5" aria-hidden="true">
          {icon}
        </span>
      </div>
      {children}
    </section>
  );
}
