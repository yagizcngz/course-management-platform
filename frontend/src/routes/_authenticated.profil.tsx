import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionHeader } from "../components/PageHeader";
import { CheckCircle2, Edit2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { fetchCategories, type CourseData, type TeacherLiteDto } from "../components/courseHelpers";
import { toast } from "sonner";

import { parseJwt } from "@/lib/auth";
import { API_BASE } from "@/components/courseHelpers";
import { BadgeShowcase, useBadges } from "@/components/Badges";
export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Profilim — E-Kurs" },
      { name: "description", content: "Kullanıcı profilini görüntüle ve güncelle." },
    ],
  }),
  component: ProfilePage,
});

interface EnrollmentDto {
  id?: number;
  Id?: number;
  studentFullName?: string;
  StudentFullName?: string;
  studentNumber?: string;
  StudentNumber?: string;
  courseTitle?: string;
  CourseTitle?: string;
}

interface ProfileDto {
  source?: string;
  aboutMe?: string;
  AboutMe?: string;
  profilePictureUrl?: string;
  ProfilePictureUrl?: string;
  // BACKEND'DEN GELECEK İSİMLER İÇİN GÜVENLİK AĞI (BÜYÜK/KÜÇÜK HARF)
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  isProfilePublic?: boolean;
  IsProfilePublic?: boolean;
  branch?: string;
  Branch?: string;
}

const translateRole = (role: string, t: TFunction) => {
  const r = String(role).toLowerCase();
  if (r === "user") return t("profile.roles.student");
  if (r === "teacher") return t("profile.roles.teacher");
  if (r === "admin") return t("profile.roles.admin");
  return String(role).toUpperCase();
};

function ProfilePage() {
  const { t, i18n } = useTranslation();
  const badges = useBadges();
  const [name, setName] = useState("");
  const [role, setRole] = useState(t("profile.roles.student"));
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [branch, setBranch] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchCats = async () => {
      const token = localStorage.getItem("jwt_token");
      const cats = await fetchCategories(token || undefined);
      setCategories(cats);
    };
    fetchCats();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    let currentUserName = t("profile.defaultUser");

    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        const tokenName =
          payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
          payload.name ||
          payload.unique_name ||
          payload.sub;

        // YENİ KOD BURADA OLMALI (payload tanımlandıktan sonra)
        const tokenRole =
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
          payload.role ||
          "user";

        if (tokenName) {
          currentUserName = tokenName;
        }

        // Çeviri fonksiyonunu burada çağırıyoruz
        setRole(translateRole(tokenRole, t));
      }
    }

    setName(currentUserName);

    const loadProfile = async () => {
      if (!token) {
        setProfileLoaded(true);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data: ProfileDto = await res.json();
          setPhotoUrl(data.profilePictureUrl || data.ProfilePictureUrl || "");
          setBio(data.aboutMe || data.AboutMe || "");
          setIsPublic(data.isProfilePublic ?? data.IsProfilePublic ?? true);

          if (data.branch || data.Branch) {
            setBranch(
              (data.branch || data.Branch || "")
                .split(",")
                .map((b: string) => b.trim())
                .filter(Boolean),
            );
          }

          const fName = data.firstName || data.FirstName;
          const lName = data.lastName || data.LastName;

          const fullName = [fName, lName].filter(Boolean).join(" ");

          if (fullName) {
            setName(fullName);

            window.dispatchEvent(
              new CustomEvent("profile-updated", {
                detail: {
                  name: fullName,
                  photoUrl: data.profilePictureUrl || data.ProfilePictureUrl || "",
                },
              }),
            );
          }
        }
      } catch (err) {
        console.warn("Profil bilgisi alınamadı:", err);
      } finally {
        setProfileLoaded(true);
      }
    };

    loadProfile();
  }, [t]);

  const [taughtCourses, setTaughtCourses] = useState<CourseData[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (!token) return;

    const fetchData = async () => {
      try {
        const [enrRes, crsRes, tchRes] = await Promise.all([
          fetch(`${API_BASE}/api/enrollments/my-courses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/courses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/teachers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (enrRes.ok) {
          setEnrollments(await enrRes.json());
        }

        if (crsRes.ok && tchRes.ok) {
          const allCourses = await crsRes.json();
          const teachers = await tchRes.json();

          const payload = parseJwt(token);
          const email =
            payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
            payload?.email;
          const me = teachers.find(
            (t: TeacherLiteDto) => email && (t.email === email || t.Email === email),
          );
          const myTeacherId = me ? me.id || me.Id : null;

          const myTaughtCourses = allCourses.filter((c: CourseData) => {
            return myTeacherId && (c.teacherId === myTeacherId || c.TeacherId === myTeacherId);
          });
          setTaughtCourses(myTaughtCourses);
        }
      } catch (error) {
        console.error("Profil verileri yüklenirken hata:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { name?: string; photoUrl?: string } | undefined;
      if (detail?.name) setName(detail.name);
      if (detail?.photoUrl) setPhotoUrl(detail.photoUrl);
    };

    window.addEventListener("profile-updated", onProfileUpdated as EventListener);
    return () => window.removeEventListener("profile-updated", onProfileUpdated as EventListener);
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    type === "error" ? toast.error(message) : toast.success(message);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUserName = name.trim();
    if (!currentUserName) {
      showToast(t("profile.errors.nameRequired"), "error");
      return;
    }

    // Backend null alanları siler; ad/soyadı ilk boşluktan ayırıyoruz.
    const [firstName, ...lastParts] = currentUserName.split(" ");
    const lastName = lastParts.join(" ").trim();

    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`${API_BASE}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          FirstName: firstName,
          LastName: lastName,
          AboutMe: bio,
          ProfilePictureUrl: photoUrl,
          IsProfilePublic: isPublic,
          Branch: isTeacherRole ? branch.join(", ") : undefined,
        }),
      });

      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent("profile-updated", { detail: { name: currentUserName, photoUrl } }),
        );
        showToast(t("profile.errors.updateSuccess"));
      } else {
        const errorText = await response.text();
        showToast(errorText || t("profile.errors.updateFailed"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(t("profile.errors.serverError"), "error");
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("jwt_token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/uploads/profile-picture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const fullUrl = `${API_BASE}${data.url}`;
        // Backend AboutMe/ProfilePictureUrl null gelirse siler; mevcut değerleri de gönderiyoruz.
        const saveRes = await fetch(`${API_BASE}/api/profile/me`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            AboutMe: bio,
            ProfilePictureUrl: fullUrl,
            IsProfilePublic: isPublic,
            Branch: isTeacherRole ? branch.join(", ") : undefined,
          }),
        });

        if (saveRes.ok) {
          setPhotoUrl(fullUrl);
          window.dispatchEvent(
            new CustomEvent("profile-updated", { detail: { name, photoUrl: fullUrl } }),
          );
        } else {
          showToast(t("profile.errors.updateFailed"), "error");
        }
      } else {
        showToast(t("profile.errors.photoUploadFailed"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(t("profile.errors.serverError"), "error");
    }
  };

  const isTeacherRole =
    role === t("profile.roles.teacher") ||
    role.toLowerCase() === "eğitmen" ||
    role.toLowerCase() === "teacher";

  const displayedCourses = useMemo(() => {
    const taughtCourseTitles = isTeacherRole
      ? taughtCourses.map((c: CourseData) => (c.title || c.Title || "").toLowerCase())
      : [];

    const myCourseTitles = enrollments.map(
      (enrollment) => enrollment.courseTitle || enrollment.CourseTitle || "",
    );

    return [...new Set(myCourseTitles)].filter(
      (title) => title && !taughtCourseTitles.includes(title.toLowerCase()),
    );
  }, [enrollments, taughtCourses, isTeacherRole]);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <PageHeader crumb={t("profile.breadcrumb")} />

      <div className="p-8 space-y-6 animate-reveal">
        <SectionHeader title={t("profile.title")} />

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="min-w-0 bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profil fotoğrafı"
                    className="w-28 h-28 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-muted grid place-items-center text-3xl font-bold text-foreground border border-border">
                    {initials || "SU"}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold break-words [overflow-wrap:anywhere]">
                  {name || t("profile.defaultUser")}
                </h2>
                <p className="text-sm text-muted-foreground uppercase tracking-[0.2em]">{role}</p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-1">
                  {t("profile.aboutMe")}
                </h3>
                <p className="mt-2 text-sm text-foreground leading-6 break-words [overflow-wrap:anywhere] max-h-32 overflow-y-auto">
                  {!profileLoaded ? t("profile.loading") : bio || t("profile.noBio")}
                </p>
              </div>

              {isTeacherRole && branch.length > 0 && (
                <div className="bg-card border border-border p-5 rounded-2xl sm:col-span-2 mt-4">
                  <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1">
                    {t("profile.branches")}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {branch.map((b) => (
                      <span key={b} className="bg-muted text-sm px-2 py-1 rounded-md">
                        {i18n.exists(`dynamic.categories.${b}`) ? t(`dynamic.categories.${b}`) : b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isTeacherRole ? (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-muted-foreground mb-1">
                    {t("profile.taughtCourses", "Verdiği Dersler")}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {taughtCourses.length > 0 ? (
                      taughtCourses.map((course: CourseData) => (
                        <span
                          key={course.id || course.Id || course.title || course.Title}
                          className="rounded-full border border-primary text-primary bg-primary/5 px-3 py-1 text-xs font-bold"
                        >
                          {i18n.exists(`dynamic.courses.${course.title || course.Title}`)
                            ? t(`dynamic.courses.${course.title || course.Title}`)
                            : course.title || course.Title}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("profile.noCourses")}</p>
                    )}
                  </div>
                </div>
              ) : null}

              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-1">
                  {t("profile.enrolledCourses")}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {displayedCourses.length > 0 ? (
                    displayedCourses.map((course) => (
                      <span
                        key={course}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium"
                      >
                        {i18n.exists(`dynamic.courses.${course}`)
                          ? t(`dynamic.courses.${course}`)
                          : course}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("profile.noCourses")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-muted-foreground">
                  {t("profile.profileInfo")}
                </p>
                <h2 className="text-xl font-bold">{t("profile.updateProfile")}</h2>
              </div>
              <div className="rounded-full bg-foreground/5 p-3 text-foreground">
                <Edit2 className="w-4 h-4" />
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <label className="text-sm font-medium">{t("profile.photoUrl")}</label>
                <input
                  type="url"
                  value={photoUrl && photoUrl.startsWith("data:") ? "" : photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground transition-colors"
                />
                <div className="mt-2 text-xs text-muted-foreground">{t("profile.or")}</div>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-foreground/5 transition-colors"
                  >
                    <UploadCloud className="w-4 h-4 text-foreground" />
                    {t("profile.chooseFile")}
                  </button>
                  <div className="text-sm text-muted-foreground">
                    {fileInputRef.current &&
                    fileInputRef.current.files &&
                    fileInputRef.current.files.length > 0
                      ? fileInputRef.current.files[0].name
                      : t("profile.noFileChosen")}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">{t("profile.displayName")}</label>
                <input
                  type="text"
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t("profile.aboutMe")}</label>
                <textarea
                  rows={4}
                  value={bio}
                  maxLength={200}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground transition-colors resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/200</p>
              </div>

              {isTeacherRole && (
                <div className="pt-2">
                  <label className="text-sm font-medium">{t("profile.branchesLabel")}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {categories.map((c) => (
                      <label
                        key={c}
                        className="flex items-center gap-2 text-sm bg-background p-2 rounded-md cursor-pointer hover:bg-muted transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={branch.includes(c)}
                          onChange={(e) => {
                            if (e.target.checked) setBranch([...branch, c]);
                            else setBranch(branch.filter((b) => b !== c));
                          }}
                          className="rounded text-foreground focus:ring-foreground"
                        />
                        {i18n.exists(`dynamic.categories.${c}`) ? t(`dynamic.categories.${c}`) : c}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("profile.branchesHelper")}
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium block">
                  {t("profile.profileVisibility", "Profil Görünürlüğü")}
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                      className="accent-foreground"
                    />
                    <span className="text-sm">{t("profile.public", "Herkese Açık")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                      className="accent-foreground"
                    />
                    <span className="text-sm">{t("profile.hidden", "Gizli")}</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-semibold text-background hover:bg-accent transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t("profile.saveProfile")}
              </button>
            </form>
          </div>
        </div>

        {badges && <BadgeShowcase badges={badges} />}
      </div>
    </>
  );
}
