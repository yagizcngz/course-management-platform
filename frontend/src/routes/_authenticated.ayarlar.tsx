import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Settings,
  Globe,
  User as UserIcon,
  Lock,
  Mail,
  AlertCircle,
  Database,
  List,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { parseJwt, isAdminRole } from "@/lib/auth";
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
}

export const Route = createFileRoute("/_authenticated/ayarlar")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    "account" | "profile" | "preferences" | "system" | "categories"
  >("account");

  const [isAdmin, setIsAdmin] = useState(false);

  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "tr");

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

  const [deleteSettingConfirm, setDeleteSettingConfirm] = useState<string | null>(null);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

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
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        const role =
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role;
        setIsAdmin(isAdminRole(role));
      }
    }
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

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);
    setCurrentLanguage(lang);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          aboutMe,
          profilePictureUrl: profilePic,
          isProfilePublic: isPublic,
          receiveEmailNotifications: receiveEmail,
        }),
      });
      if (res.ok) {
        showToast("success", t("settings.success"));
        const currentName = [firstName, lastName].filter(Boolean).join(" ");
        window.dispatchEvent(
          new CustomEvent("profile-updated", {
            detail: { name: currentName, photoUrl: profilePic },
          }),
        );
      } else {
        const errText = await res.text();
        showToast("error", errText || t("settings.saving"));
      }
    } catch (err) {
      showToast("error", "Error saving profile");
    } finally {
      setIsSaving(false);
    }
  };

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
        const errText = await res.text();
        showToast("error", errText);
      }
    } catch (err) {
      showToast("error", "Error updating password");
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
        const errText = await res.text();
        showToast("error", errText);
      }
    } catch (err) {
      showToast("error", "Error updating email");
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
        const errText = await res.text();
        showToast("error", errText);
      }
    } catch (err) {
      showToast("error", "Error updating username");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          {t("settings.title")}
        </h2>
      </div>

      <div className="flex gap-8 border-b border-border pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("account")}
          className={`pb-4 text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === "account" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t("settings.tabs.account")}
        </button>

        <button
          onClick={() => setActiveTab("preferences")}
          className={`pb-4 text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === "preferences" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t("settings.tabs.preferences")}
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab("system")}
              className={`pb-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === "system"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {t("settings.tabs.system")}
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`pb-4 text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === "categories" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("settings.tabs.categories")}
            </button>
          </>
        )}
      </div>

      <div className="mt-6 max-w-4xl">
        {activeTab === "account" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <UserIcon className="size-5 text-primary" />
                {t("settings.account.username")} / {t("settings.account.email")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("settings.account.description")}
              </p>

              <form onSubmit={handleUpdateUsername} className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium">{t("settings.account.username")}</label>
                  <div className="flex gap-3 mt-1.5">
                    <input
                      type="text"
                      className="flex-1 p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-primary transition-colors"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-semibold rounded-md"
                    >
                      {isSaving ? "..." : t("settings.account.updateUsername")}
                    </button>
                  </div>
                </div>
              </form>

              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("settings.account.email")}</label>
                  <div className="flex gap-3 mt-1.5">
                    <input
                      type="email"
                      className="flex-1 p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-primary transition-colors"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-semibold rounded-md"
                    >
                      {isSaving ? "..." : t("settings.account.updateEmail")}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Lock className="size-5 text-primary" />
                {t("settings.account.changePassword")}
              </h3>
              <form onSubmit={handleUpdatePassword} className="space-y-4 mt-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {t("settings.account.currentPassword")}
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-primary transition-colors"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("settings.account.newPassword")}</label>
                  <input
                    type="password"
                    required
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-primary transition-colors"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full mt-2 py-2.5 bg-foreground hover:bg-foreground/90 text-background font-semibold rounded-md transition-colors"
                >
                  {isSaving ? "..." : t("settings.account.changePassword")}
                </button>
              </form>
            </div>
            <div className="rounded-xl border border-red-200 bg-card text-card-foreground shadow p-6 mt-6 max-w-2xl">
              <h3 className="font-bold text-lg text-red-600 flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5" /> {t("settings.profile.manageAccount")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("settings.profile.manageAccountDesc")}
              </p>

              <div className="space-y-5">
                <button
                  onClick={() =>
                    setPendingConfirm({
                      message: t("settings.profile.deleteConfirm"),
                      onConfirm: async () => {
                        const token =
                          localStorage.getItem("jwt_token") || localStorage.getItem("token");
                        if (token) {
                          const payload = parseJwt(token);
                          const userId = payload?.nameid || payload?.sub || payload?.id;
                          const userRole =
                            payload?.role ||
                            payload?.[
                              "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
                            ] ||
                            "user";

                          if (userId) {
                            try {
                              const isTeacher = userRole.toString().toLowerCase() === "teacher";
                              const endpoint = isTeacher
                                ? `${API_BASE}/api/Teachers/${userId}`
                                : `${API_BASE}/api/Students/${userId}`;

                              const res = await fetch(endpoint, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` },
                              });

                              if (res.ok) {
                                localStorage.removeItem("jwt_token");
                                localStorage.removeItem("token");
                                window.location.href = "/";
                              } else {
                                showToast("error", t("settings.profile.deleteError"));
                              }
                            } catch (e) {
                              console.error(e);
                              showToast("error", t("settings.profile.deleteError"));
                            }
                          }
                        }
                      },
                    })
                  }
                  className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("settings.profile.deleteAccount")}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "preferences" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2 text-lg mb-2">
                <Mail className="h-5 w-5 text-primary" />
                {t("settings.preferences.emailNotifications")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("settings.preferences.description")}
              </p>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={receiveEmail}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    setReceiveEmail(newValue);
                    // auto save preference
                    const token = localStorage.getItem("jwt_token");
                    await fetch(`${API_BASE}/api/profile/me`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        firstName,
                        lastName,
                        aboutMe,
                        profilePictureUrl: profilePic,
                        isProfilePublic: isPublic,
                        receiveEmailNotifications: newValue,
                      }),
                    });
                    showToast("success", t("settings.success"));
                  }}
                  className="size-5 rounded accent-primary cursor-pointer"
                />
                <span className="text-sm font-medium">
                  {t("settings.preferences.receiveNotifications")}
                </span>
              </label>
            </div>
          </div>
        )}

        {isAdmin && activeTab === "system" && (
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6 max-w-4xl">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Database className="size-5 text-primary" />
              {t("settings.system.title")}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">{t("settings.system.description")}</p>

            <div className="space-y-4 mb-8">
              {settings.map((setting) => (
                <div
                  key={setting.settingKey}
                  className="flex gap-4 items-start p-4 border border-border rounded-md"
                >
                  <div className="flex-1 space-y-2">
                    <div>
                      <span className="font-semibold">{setting.settingKey}</span>
                      <p className="text-xs text-muted-foreground">{setting.description || "-"}</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 p-2 bg-background border border-border rounded-md text-sm outline-none focus:border-primary"
                        defaultValue={setting.settingValue}
                        onBlur={async (e) => {
                          const val = e.target.value;
                          if (val === setting.settingValue) return;
                          const token = localStorage.getItem("jwt_token");
                          const res = await fetch(
                            `${API_BASE}/api/systemsettings/${setting.settingKey}`,
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                settingValue: val,
                                description: setting.description,
                              }),
                            },
                          );
                          if (res.ok) {
                            showToast("success", t("settings.system.updateSuccess"));
                            fetchSettings();
                          } else {
                            showToast("error", t("settings.system.updateFailed"));
                          }
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteSettingConfirm(setting.settingKey)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-border">
              <h4 className="font-semibold mb-4">{t("settings.system.newSettingTitle")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <select
                  className={`p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-primary ${!newSettingKey ? "text-muted-foreground" : "text-foreground"}`}
                  value={newSettingKey}
                  onChange={(e) => setNewSettingKey(e.target.value)}
                >
                  <option value="" disabled>
                    {t("settings.system.keyPlaceholder")}
                  </option>
                  <option value="TEACHER_CODE">TEACHER_CODE</option>
                  <option value="ADMIN_CODE">ADMIN_CODE</option>
                  <option value="ENABLE_GUEST_HOME_FEATURED">ENABLE_GUEST_HOME_FEATURED</option>
                  <option value="ENABLE_GUEST_HOME_POPULAR">ENABLE_GUEST_HOME_POPULAR</option>
                  <option value="ENABLE_STUDENT_HOME_RECOMMENDATIONS">
                    ENABLE_STUDENT_HOME_RECOMMENDATIONS
                  </option>
                  <option value="ENABLE_STUDENT_HOME_ANNOUNCEMENTS">
                    ENABLE_STUDENT_HOME_ANNOUNCEMENTS
                  </option>
                  <option value="ENABLE_TEACHER_HOME_NOTIFICATIONS">
                    ENABLE_TEACHER_HOME_NOTIFICATIONS
                  </option>
                  <option value="ENABLE_ADMIN_HOME_CAPACITY_ALERTS">
                    ENABLE_ADMIN_HOME_CAPACITY_ALERTS
                  </option>
                  <option value="ENABLE_ADMIN_HOME_ACTIVITY_LOG">
                    ENABLE_ADMIN_HOME_ACTIVITY_LOG
                  </option>
                </select>
                <input
                  placeholder={t("settings.system.valuePlaceholder")}
                  className="p-2.5 bg-background border border-border rounded-md text-sm"
                  value={newSettingValue}
                  onChange={(e) => setNewSettingValue(e.target.value)}
                />
                <input
                  placeholder={t("settings.system.descPlaceholder")}
                  className="p-2.5 bg-background border border-border rounded-md text-sm"
                  value={newSettingDesc}
                  onChange={(e) => setNewSettingDesc(e.target.value)}
                />
              </div>
              <button
                onClick={async () => {
                  if (!newSettingKey || !newSettingValue) return;
                  const token = localStorage.getItem("jwt_token");
                  const res = await fetch(`${API_BASE}/api/systemsettings/${newSettingKey}`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      settingValue: newSettingValue,
                      description: newSettingDesc,
                    }),
                  });
                  if (res.ok) {
                    showToast("success", t("settings.system.addSuccess"));
                    setNewSettingKey("");
                    setNewSettingValue("");
                    setNewSettingDesc("");
                    fetchSettings();
                  } else {
                    showToast("error", t("settings.system.addFailed"));
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-semibold rounded-md text-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="size-4" /> {t("settings.system.addBtn")}
              </button>
            </div>
          </div>
        )}

        {isAdmin && activeTab === "categories" && (
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6 max-w-4xl">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <List className="size-5 text-primary" />
              {t("settings.categories.title")}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t("settings.categories.description")}
            </p>

            <div className="space-y-4 mb-8">
              {categories.map((cat: CategoryData) => (
                <div
                  key={cat.id}
                  className="flex gap-4 items-center p-4 border border-border rounded-md"
                >
                  <div className="flex-1">
                    <div className="font-semibold">
                      {i18n.exists(`dynamic.categories.${cat.name}`)
                        ? t(`dynamic.categories.${cat.name}`)
                        : cat.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {i18n.exists(`dynamic.categoryDescriptions.${cat.name}`)
                        ? t(`dynamic.categoryDescriptions.${cat.name}`)
                        : cat.description || t("settings.categories.noDesc")}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteCategoryConfirm(String(cat.id))}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-border">
              <h4 className="font-semibold mb-4">{t("settings.categories.newCategoryTitle")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  placeholder={t("settings.categories.namePlaceholder")}
                  className="p-2.5 bg-background border border-border rounded-md text-sm"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <input
                  placeholder={t("settings.categories.descPlaceholder")}
                  className="p-2.5 bg-background border border-border rounded-md text-sm"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                />
              </div>
              <button
                onClick={async () => {
                  if (!newCategoryName) return;
                  const token = localStorage.getItem("jwt_token");
                  const res = await fetch(`${API_BASE}/api/categories`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ name: newCategoryName, description: newCategoryDesc }),
                  });
                  if (res.ok) {
                    showToast("success", t("settings.categories.addSuccess"));
                    setNewCategoryName("");
                    setNewCategoryDesc("");
                    fetchCategoriesList();
                  } else {
                    showToast("error", t("settings.categories.addFailed"));
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-semibold rounded-md text-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="size-4" /> {t("settings.categories.addBtn")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Setting Confirmation Modal */}
      {deleteSettingConfirm && (
        <div className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-2xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex gap-4">
                <div className="size-10 rounded-full bg-red-100 grid place-items-center shrink-0">
                  <Trash2 className="size-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg tracking-tight">
                    {t("courses.deleteConfirmTitle") || "Silme Onayı"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    "{deleteSettingConfirm}" {t("settings.system.deleteConfirm")}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/50 border-t flex justify-end gap-3">
              <button
                onClick={() => setDeleteSettingConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 font-semibold text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {t("students.no") || "İptal"}
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const token = localStorage.getItem("jwt_token");
                    const res = await fetch(
                      `${API_BASE}/api/systemsettings/${deleteSettingConfirm}`,
                      {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                      },
                    );
                    if (res.ok) {
                      showToast("success", t("settings.system.deleteSuccess"));
                      fetchSettings();
                    } else {
                      showToast("error", t("settings.system.deleteFailed"));
                    }
                  } catch (err) {
                    showToast("error", t("settings.system.deleteFailed"));
                  } finally {
                    setIsDeleting(false);
                    setDeleteSettingConfirm(null);
                  }
                }}
                className="px-4 py-2 font-semibold text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {t("students.yes") || "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deleteCategoryConfirm && (
        <div className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-background rounded-2xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex gap-4">
                <div className="size-10 rounded-full bg-red-100 grid place-items-center shrink-0">
                  <Trash2 className="size-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg tracking-tight">
                    {t("courses.deleteConfirmTitle") || "Silme Onayı"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("settings.categories.deleteConfirm")}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/50 border-t flex justify-end gap-3">
              <button
                onClick={() => setDeleteCategoryConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 font-semibold text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {t("students.no") || "İptal"}
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const token = localStorage.getItem("jwt_token");
                    const res = await fetch(`${API_BASE}/api/categories/${deleteCategoryConfirm}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                      showToast("success", t("settings.categories.deleteSuccess"));
                      fetchCategoriesList();
                    } else {
                      showToast("error", t("settings.categories.deleteFailed"));
                    }
                  } catch (err) {
                    showToast("error", t("settings.categories.deleteFailed"));
                  } finally {
                    setIsDeleting(false);
                    setDeleteCategoryConfirm(null);
                  }
                }}
                className="px-4 py-2 font-semibold text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {t("students.yes") || "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm", "Onayla")}</AlertDialogTitle>
            <AlertDialogDescription>{pendingConfirm?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const run = pendingConfirm?.onConfirm;
                setPendingConfirm(null);
                run?.();
              }}
            >
              {t("common.confirm", "Onayla")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
