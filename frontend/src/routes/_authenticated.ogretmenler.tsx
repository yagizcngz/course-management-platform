import { authHeaders, readError } from "@/lib/auth";
import { initialsOf, formatDate, pillButton } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
import { Plus, X, Edit2, Trash2, Upload, Link2, Search } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { adminOnly } from "../hooks/useAdminGuard";
import { fetchCategories } from "../components/courseHelpers";

import { API_BASE } from "@/components/courseHelpers";
export const Route = createFileRoute("/_authenticated/ogretmenler")({
  component: adminOnly(TeachersPage),
});

interface TeacherData {
  id?: string | number;
  Id?: string | number;
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  email?: string;
  Email?: string;
  branch?: string;
  Branch?: string;
  date?: string;
  Date?: string;
  createdAt?: string;
  CreatedAt?: string;
  profilePictureUrl?: string;
  ProfilePictureUrl?: string;
  aboutMe?: string;
  AboutMe?: string;
  teacherNumber?: string;
  TeacherNumber?: string;
}

interface CourseData {
  id?: string | number;
  Id?: string | number;
  title?: string;
  Title?: string;
  instructor?: string;
  Instructor?: string;
}

function TeachersPage() {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [dbTeachers, setDbTeachers] = useState<TeacherData[]>([]);
  const [dbCourses, setDbCourses] = useState<CourseData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newBranch, setNewBranch] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ÇOKLU SEÇİM VE DÜZENLEME MODU STATE'LERİ
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<(string | number)[]>([]);

  // PROFİL GÖRÜNTÜLEME İÇİN STATE
  const [selectedProfileTeacher, setSelectedProfileTeacher] = useState<TeacherData | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBranch, setEditBranch] = useState<string[]>([]);
  const [editAboutMe, setEditAboutMe] = useState("");
  const [editProfilePictureUrl, setEditProfilePictureUrl] = useState("");
  const [profileImageMode, setProfileImageMode] = useState<"upload" | "link">("upload");
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    type === "error" ? toast.error(message) : toast.success(message);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/teachers`, {
        headers: authHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setDbTeachers(data);
      } else {
        const errorText = await response.text();
        console.error(`Öğretmenler alınamadı (status ${response.status}):`, errorText);
        showToast(t("common.loadFailed"), "error");
      }
    } catch (error) {
      console.error("Öğretmenler yüklenirken hata:", error);
      showToast(t("common.loadFailed"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();

    const fetchCourses = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/courses`, { headers: authHeaders() });
        if (res.ok) {
          setDbCourses(await res.json());
        }
      } catch (error) {
        console.error("Kurslar çekilirken hata:", error);
      }
    };

    const fetchCats = async () => {
      try {
        const token = localStorage.getItem("jwt_token");
        const cats = await fetchCategories(token || undefined);
        setCategories(cats);
      } catch (error) {
        console.error("Kategoriler yüklenirken hata:", error);
      }
    };

    fetchCourses();
    fetchCats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load; showToast/t change every render
  }, []);

  const currentTeacherId = selectedProfileTeacher?.id ?? selectedProfileTeacher?.Id;

  useEffect(() => {
    setIsEditingProfile(false);
  }, [currentTeacherId]);

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setSelectedTeacherIds([]);
  };

  const handleSelectTeacher = (id: string | number | undefined) => {
    if (!id) return;
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((teacherId) => teacherId !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allFilteredIds = filteredTeachers
        .map((t) => t.id || t.Id)
        .filter((id): id is string | number => id !== undefined);
      setSelectedTeacherIds(allFilteredIds);
    } else {
      setSelectedTeacherIds([]);
    }
  };

  const confirmDelete = async () => {
    if (selectedTeacherIds.length === 0) return;

    try {
      // Backend'de bunun için ayrı bir toplu silme uç noktası var, tek tek istek atmaya gerek yok.
      const response = await fetch(`${API_BASE}/api/teachers/bulk-delete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(selectedTeacherIds),
      });

      if (!response.ok) {
        showToast(await readError(response, t("teachers.errors.deleteFailed")), "error");
        return;
      }

      setDbTeachers((prevTeachers) =>
        prevTeachers.filter((t) => !selectedTeacherIds.includes(t.id || (t.Id as string | number))),
      );

      showToast(t("teachers.errors.deleteSuccess", { count: selectedTeacherIds.length }));
      setIsDeleteModalOpen(false);
      setSelectedTeacherIds([]);
      setIsEditMode(false);
    } catch (error) {
      console.error("Silme hatası:", error);
      showToast(t("teachers.errors.deleteFailed"), "error");
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newFirstName.trim() || !newLastName.trim()) {
      showToast(t("teachers.errors.nameRequired"), "error");
      return;
    }

    const firstName = newFirstName.trim();
    const lastName = newLastName.trim();
    const email = newEmail.trim();

    setIsSubmitting(true);
    try {
      // yönetici uç noktası giriş hesabını ve eğitmen profilini (branşıyla) birlikte açar
      const res = await fetch(`${API_BASE}/api/auth/admin-create`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          firstName,
          lastName,
          username: newUsername.trim(),
          email,
          password: newPassword,
          role: "Teacher",
          branch: newBranch.length > 0 ? newBranch.join(", ") : null,
        }),
      });

      if (!res.ok) {
        showToast(await readError(res, t("teachers.errors.registerFailed")), "error");
        return;
      }

      showToast(t("teachers.errors.registerSuccess"));
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewUsername("");
      setNewPassword("");
      setNewBranch([]);
      setIsModalOpen(false);
      fetchTeachers();
    } catch (error) {
      console.error(error);
      showToast(t("teachers.errors.serverError"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchLower = searchTerm.toLowerCase();
  const filteredTeachers = dbTeachers.filter((teacher) => {
    const fName = `${teacher.firstName || teacher.FirstName || ""} ${teacher.lastName || teacher.LastName || ""}`;
    const fEmail = teacher.email || teacher.Email || "";
    const fBranch = teacher.branch || teacher.Branch || "";
    return (
      fName.toLowerCase().includes(searchLower) ||
      fEmail.toLowerCase().includes(searchLower) ||
      fBranch.toLowerCase().includes(searchLower)
    );
  });

  // Öğretmenin güncel olarak bir kursta eğitmen olarak görünüp görünmediğine göre
  // aktif/pasif durumunu hesaplar (kurs listesindeki "instructor" alanına göre eşleştirme)
  const getTeacherStatus = (teacher: TeacherData) => {
    const fullName =
      `${teacher.firstName || teacher.FirstName || ""} ${teacher.lastName || teacher.LastName || ""}`
        .trim()
        .toLowerCase();
    if (!fullName) return t("teachers.inactive");

    const isTeaching = dbCourses.some((c) => {
      const instructor = String(c.instructor || c.Instructor || "").toLowerCase();
      return instructor && instructor.includes(fullName);
    });

    return isTeaching ? t("teachers.active") : t("teachers.inactive");
  };

  const handleStartEditProfile = () => {
    if (!selectedProfileTeacher) return;
    setEditFirstName(selectedProfileTeacher.firstName || selectedProfileTeacher.FirstName || "");
    setEditLastName(selectedProfileTeacher.lastName || selectedProfileTeacher.LastName || "");
    setEditEmail(selectedProfileTeacher.email || selectedProfileTeacher.Email || "");
    const branchVal = selectedProfileTeacher.branch || selectedProfileTeacher.Branch || "";
    setEditBranch(
      branchVal
        .split(",")
        .map((b: string) => b.trim())
        .filter(Boolean),
    );
    setEditAboutMe(selectedProfileTeacher.aboutMe || selectedProfileTeacher.AboutMe || "");
    setEditProfilePictureUrl(
      selectedProfileTeacher.profilePictureUrl || selectedProfileTeacher.ProfilePictureUrl || "",
    );
    setProfileImageMode("upload");
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => setIsEditingProfile(false);

  const handleProfileFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProfileImage(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/api/uploads/profile-picture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setEditProfilePictureUrl(`${API_BASE}${data.url}`);
        showToast(t("teachers.errors.updateSuccess"));
      } else {
        showToast(await readError(response, t("teachers.errors.updateFailed")), "error");
      }
    } catch (error) {
      console.error(error);
      showToast(t("teachers.errors.serverError"), "error");
    } finally {
      setIsUploadingProfileImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveProfileImage = () => setEditProfilePictureUrl("");

  const handleSaveTeacherEdit = async () => {
    if (!selectedProfileTeacher) return;
    const teacherId = selectedProfileTeacher.id ?? selectedProfileTeacher.Id;
    if (!teacherId) {
      showToast(t("teachers.errors.idNotFound"), "error");
      return;
    }
    if (!editFirstName.trim() || !editLastName.trim()) {
      showToast(t("teachers.errors.nameRequired"), "error");
      return;
    }
    if (editBranch.length === 0) {
      showToast(t("teachers.errors.branchRequired"), "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await fetch(`${API_BASE}/api/teachers/${teacherId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          Id: teacherId,
          FirstName: editFirstName,
          LastName: editLastName,
          Email: editEmail,
          Branch: editBranch.join(", "),
          AboutMe: editAboutMe,
          ProfilePictureUrl: editProfilePictureUrl,
          Date: selectedProfileTeacher.date || selectedProfileTeacher.Date,
        }),
      });

      if (response.ok) {
        const updatedTeacher: TeacherData = {
          ...selectedProfileTeacher,
          firstName: editFirstName,
          FirstName: editFirstName,
          lastName: editLastName,
          LastName: editLastName,
          email: editEmail,
          Email: editEmail,
          branch: editBranch.join(", "),
          Branch: editBranch.join(", "),
          aboutMe: editAboutMe,
          AboutMe: editAboutMe,
          profilePictureUrl: editProfilePictureUrl,
          ProfilePictureUrl: editProfilePictureUrl,
        };
        setSelectedProfileTeacher(updatedTeacher);
        setDbTeachers((prev) =>
          prev.map((teacher) =>
            (teacher.id ?? teacher.Id) === teacherId ? updatedTeacher : teacher,
          ),
        );
        setIsEditingProfile(false);
        showToast(t("teachers.errors.updateSuccess"));
      } else {
        showToast(await readError(response, t("teachers.errors.updateFailed")), "error");
      }
    } catch (error) {
      console.error(error);
      showToast(t("teachers.errors.serverError"), "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <>
      <PageHeader
        crumb={t("teachers.breadcrumb")}
        searchValue={searchTerm}
        onSearchChange={(v) => {
          // a hidden row must never stay selected for bulk delete
          setSearchTerm(v);
          setSelectedTeacherIds([]);
        }}
        action={
          <div className="flex gap-2">
            {isEditMode && selectedTeacherIds.length > 0 && (
              <button onClick={() => setIsDeleteModalOpen(true)} className={pillButton.danger}>
                <Trash2 className="size-4" />
                {t("teachers.deleteSelected", { count: selectedTeacherIds.length })}
              </button>
            )}

            <button onClick={toggleEditMode} className={pillButton.outline}>
              {isEditMode ? t("teachers.cancel") : t("teachers.editTeachers")}
            </button>

            <button onClick={() => setIsModalOpen(true)} className={pillButton.primary}>
              <Plus className="size-4" />
              {t("teachers.newTeacher")}
            </button>
          </div>
        }
      />

      <div className="p-8 animate-reveal">
        <div className="flex items-end justify-between border-b border-foreground/10 pb-2 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            {t("teachers.allTeachers")}
          </h2>
        </div>

        <div className="bg-card border border-border overflow-x-auto rounded-md shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-foreground/2 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-mono uppercase text-muted-foreground">
                  {t("teachers.teacher")}
                </th>
                <th className="px-6 py-4 text-[10px] font-mono uppercase text-muted-foreground">
                  {t("teachers.email")}
                </th>
                <th className="px-6 py-4 text-[10px] font-mono uppercase text-muted-foreground">
                  {t("teachers.branch")}
                </th>
                <th className="px-6 py-4 text-[10px] font-mono uppercase text-muted-foreground text-right">
                  {t("teachers.registrationDate")}
                </th>
                <th className="px-6 py-4 text-[10px] font-mono uppercase text-muted-foreground text-right">
                  {t("teachers.status")}
                </th>
                {isEditMode && (
                  <th className="px-6 py-4 text-[10px] font-mono uppercase text-muted-foreground text-right">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border text-foreground focus:ring-foreground cursor-pointer"
                      onChange={handleSelectAll}
                      checked={
                        selectedTeacherIds.length === filteredTeachers.length &&
                        filteredTeachers.length > 0
                      }
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-muted-foreground animate-pulse font-mono text-xs uppercase tracking-widest"
                  >
                    {t("teachers.loading")}
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-xs">
                    {t("teachers.notFound")}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, index) => {
                  const fullName =
                    `${teacher.firstName || teacher.FirstName || ""} ${teacher.lastName || teacher.LastName || ""}`.trim() ||
                    t("teachers.unnamedTeacher");
                  const email = teacher.email || teacher.Email || "-";
                  const rawBranch = teacher.branch || teacher.Branch;
                  const branch = rawBranch
                    ? i18n.exists(`dynamic.categories.${rawBranch}`)
                      ? t(`dynamic.categories.${rawBranch}`)
                      : rawBranch
                    : "-";
                  const initialsText = initialsOf(fullName);
                  const dateRaw =
                    teacher.createdAt || teacher.CreatedAt || teacher.date || teacher.Date;
                  const date = formatDate(dateRaw, i18n.language);
                  const currentId = teacher.id || teacher.Id;
                  const calculatedStatus = getTeacherStatus(teacher);

                  return (
                    <tr
                      key={currentId || index}
                      className={`hover:bg-foreground/2 transition-colors ${
                        selectedTeacherIds.includes(currentId as string | number)
                          ? "bg-foreground/5"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        {/* TIKLANABİLİR PROFİL ALANI */}
                        <div
                          className="flex items-center gap-3 cursor-pointer group w-fit"
                          onClick={() => setSelectedProfileTeacher(teacher)}
                          title={t("teachers.viewProfile")}
                        >
                          <div className="size-10 rounded bg-muted grid place-items-center text-[10px] font-mono text-muted-foreground shrink-0 uppercase group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                            {initialsText}
                          </div>
                          <div>
                            <div className="font-semibold group-hover:underline">{fullName}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {teacher.teacherNumber || teacher.TeacherNumber || currentId || "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{email}</td>
                      <td className="px-6 py-4 text-muted-foreground">{branch}</td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground text-right">
                        {date}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`px-2 py-1 text-[10px] font-bold rounded-sm ${
                            calculatedStatus === t("teachers.active")
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {calculatedStatus}
                        </span>
                      </td>
                      {isEditMode && (
                        <td className="px-6 py-4 text-right">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-border text-foreground focus:ring-foreground cursor-pointer"
                            checked={selectedTeacherIds.includes(currentId as string | number)}
                            onChange={() => handleSelectTeacher(currentId)}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground font-mono">
          <div>{t("teachers.totalTeachers", { count: filteredTeachers.length })}</div>
        </div>
      </div>

      {/* PROFİL MODALI */}
      {selectedProfileTeacher && (
        <div
          onClick={() => setSelectedProfileTeacher(null)}
          className="fixed inset-0 z-200 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl shadow-lg w-full max-w-sm max-h-[90vh] overflow-y-auto p-8 relative flex flex-col items-center animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setSelectedProfileTeacher(null)}
              aria-label={t("common.close")}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>

            {!isEditingProfile && (
              <button
                onClick={handleStartEditProfile}
                className="absolute top-4 right-14 flex items-center gap-1.5 text-xs font-bold border border-border rounded-md px-3 py-1.5 hover:bg-foreground/5 transition-colors"
              >
                <Edit2 className="size-3.5" />
                {t("teachers.edit")}
              </button>
            )}

            {isEditingProfile ? (
              <div className="w-full space-y-4">
                <h2 className="text-lg font-bold text-center mb-2">{t("teachers.editTeacher")}</h2>

                <div className="flex flex-col items-center gap-3">
                  {editProfilePictureUrl ? (
                    <img
                      src={
                        editProfilePictureUrl.startsWith("http") ||
                        editProfilePictureUrl.startsWith("data:")
                          ? editProfilePictureUrl
                          : `${API_BASE}${editProfilePictureUrl}`
                      }
                      alt={t("common.preview")}
                      className="size-20 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="size-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-mono uppercase">
                      {initialsOf(`${editFirstName || ""} ${editLastName || ""}`) || "?"}
                    </div>
                  )}

                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => setProfileImageMode("upload")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md border transition-colors ${
                        profileImageMode === "upload"
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:bg-foreground/5"
                      }`}
                    >
                      <Upload className="size-3.5" />
                      {t("teachers.uploadFile")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileImageMode("link")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md border transition-colors ${
                        profileImageMode === "link"
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:bg-foreground/5"
                      }`}
                    >
                      <Link2 className="size-3.5" />
                      {t("teachers.pasteLink")}
                    </button>
                  </div>

                  {profileImageMode === "upload" ? (
                    <label className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold border border-dashed border-border rounded-md cursor-pointer hover:bg-foreground/5 transition-colors">
                      {isUploadingProfileImage
                        ? t("teachers.uploading")
                        : t("teachers.chooseFromPc")}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        disabled={isUploadingProfileImage}
                        onChange={handleProfileFileChange}
                      />
                    </label>
                  ) : (
                    <input
                      type="text"
                      value={editProfilePictureUrl}
                      onChange={(e) => setEditProfilePictureUrl(e.target.value)}
                      placeholder="https://ornek.com/fotograf.jpg"
                      className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                    />
                  )}

                  {editProfilePictureUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveProfileImage}
                      className="text-[11px] font-mono text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {t("teachers.removePhoto")}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("teachers.firstName")}</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("teachers.lastName")}</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("teachers.email")}</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("teachers.branch")}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {categories.map((c) => (
                      <label
                        key={c}
                        className="flex items-center gap-2 text-sm bg-background p-2 rounded-md cursor-pointer hover:bg-muted transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={editBranch.includes(c)}
                          onChange={(e) => {
                            if (e.target.checked) setEditBranch([...editBranch, c]);
                            else setEditBranch(editBranch.filter((b) => b !== c));
                          }}
                          className="rounded text-foreground focus:ring-foreground"
                        />
                        {i18n.exists(`dynamic.categories.${c}`) ? t(`dynamic.categories.${c}`) : c}
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t("teachers.branchWarning")}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("teachers.aboutMe")}</label>
                  <textarea
                    rows={3}
                    value={editAboutMe}
                    onChange={(e) => setEditAboutMe(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelEditProfile}
                    disabled={isSavingProfile}
                    className="flex-1 py-2.5 px-4 bg-muted text-muted-foreground text-sm font-bold hover:bg-muted/80 rounded-md transition-colors disabled:opacity-60"
                  >
                    {t("teachers.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTeacherEdit}
                    disabled={isSavingProfile || isUploadingProfileImage}
                    className="flex-1 py-2.5 px-4 bg-foreground text-background text-sm font-bold hover:opacity-90 rounded-md transition-opacity disabled:opacity-60"
                  >
                    {isSavingProfile ? t("teachers.saving") : t("teachers.save")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative mb-4 mt-2">
                  {selectedProfileTeacher.profilePictureUrl ||
                  selectedProfileTeacher.ProfilePictureUrl ? (
                    <img
                      src={
                        selectedProfileTeacher.profilePictureUrl ||
                        selectedProfileTeacher.ProfilePictureUrl
                      }
                      alt={t("profile.photoAlt")}
                      className="size-24 rounded-full object-cover shadow-md border border-border"
                    />
                  ) : (
                    <div className="size-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-mono uppercase shadow-md">
                      {initialsOf(
                        `${selectedProfileTeacher.firstName || selectedProfileTeacher.FirstName || ""} ${selectedProfileTeacher.lastName || selectedProfileTeacher.LastName || ""}`,
                      )}
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-bold text-foreground mb-1 text-center">
                  {`${selectedProfileTeacher.firstName || selectedProfileTeacher.FirstName || ""} ${selectedProfileTeacher.lastName || selectedProfileTeacher.LastName || ""}`.trim() ||
                    t("teachers.unnamedTeacher")}
                </h2>
                <p className="text-[11px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-2">
                  {t("teachers.teacherRole")}
                </p>
                <span
                  className={`mb-8 inline-block px-2 py-1 text-[10px] font-bold rounded-sm ${
                    getTeacherStatus(selectedProfileTeacher) === t("teachers.active")
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {getTeacherStatus(selectedProfileTeacher)}
                </span>

                <div className="w-full space-y-6 text-left">
                  <div>
                    <h3 className="text-sm font-bold text-foreground/80 mb-2">
                      {t("teachers.aboutMe")}
                    </h3>
                    <p className="text-sm text-foreground wrap-break-words whitespace-pre-wrap break-all">
                      {selectedProfileTeacher.aboutMe ||
                        selectedProfileTeacher.AboutMe ||
                        t("teachers.noBio")}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground/80 mb-2">
                      {t("teachers.branch")}
                    </h3>
                    <p className="text-sm text-foreground">
                      {(() => {
                        const b = selectedProfileTeacher.branch || selectedProfileTeacher.Branch;
                        return b
                          ? i18n.exists(`dynamic.categories.${b}`)
                            ? t(`dynamic.categories.${b}`)
                            : b
                          : "-";
                      })()}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* YENİ ÖĞRETMEN EKLEME MODALI */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-200 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-6 relative animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              aria-label={t("common.close")}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>

            <h2 className="text-xl font-bold mb-6 tracking-tight">
              {t("teachers.addTeacherTitle")}
            </h2>

            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("teachers.firstName")}</label>
                  <input
                    type="text"
                    required
                    onInvalid={(e) =>
                      (e.target as HTMLInputElement).setCustomValidity(t("validation.required"))
                    }
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("teachers.lastName")}</label>
                  <input
                    type="text"
                    required
                    onInvalid={(e) =>
                      (e.target as HTMLInputElement).setCustomValidity(t("validation.required"))
                    }
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("teachers.email")}</label>
                <input
                  type="email"
                  required
                  onInvalid={(e) =>
                    (e.target as HTMLInputElement).setCustomValidity(t("validation.required"))
                  }
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  title={t("teachers.emailTitle")}
                  className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("teachers.usernameLabel")}</label>
                <input
                  type="text"
                  required
                  onInvalid={(e) =>
                    (e.target as HTMLInputElement).setCustomValidity(t("validation.required"))
                  }
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                  className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("teachers.password")}</label>
                <input
                  type="password"
                  required
                  onInvalid={(e) =>
                    (e.target as HTMLInputElement).setCustomValidity(t("validation.required"))
                  }
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                  className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("teachers.branch")}</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {categories.map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-2 text-sm bg-background p-2 rounded-md cursor-pointer hover:bg-muted transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={newBranch.includes(c)}
                        onChange={(e) => {
                          if (e.target.checked) setNewBranch([...newBranch, c]);
                          else setNewBranch(newBranch.filter((b) => b !== c));
                        }}
                        className="rounded text-foreground focus:ring-foreground"
                      />
                      {i18n.exists(`dynamic.categories.${c}`) ? t(`dynamic.categories.${c}`) : c}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{t("teachers.branchWarning")}</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-muted text-muted-foreground text-sm font-bold hover:bg-muted/80 rounded-md transition-colors disabled:opacity-50"
                >
                  {t("teachers.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-foreground text-background text-sm font-bold hover:opacity-90 rounded-md transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? t("teachers.saving") : t("teachers.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODALI */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="size-10 shrink-0 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <Trash2 className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">{t("teachers.deleteConfirmTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("teachers.deleteConfirmText1")} <strong>{selectedTeacherIds.length}</strong>{" "}
                  {t("teachers.deleteConfirmText2")}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {t("teachers.deleteConfirmWarning")}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 text-sm font-semibold bg-destructive text-white hover:bg-destructive/90 rounded-md transition-colors"
                  >
                    {t("teachers.yesDelete")}
                  </button>
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 text-sm font-semibold border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                  >
                    {t("teachers.noCancel")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
