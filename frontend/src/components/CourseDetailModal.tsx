import { initialsOf, formatDate, formatTry } from "@/lib/utils";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  BookOpen,
  Edit2,
  Upload,
  Link2,
  MoreVertical,
  ListOrdered,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useEffect, useState } from "react";
import { CourseTaxonomyFields } from "./CourseTaxonomyFields";
import { CourseRatingCard } from "./CourseRatingCard";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLenis } from "lenis/react";
import {
  authHeaders,
  getRoleFromToken,
  getToken,
  isAdminRole as isAdmin,
  isTeacherRole as isTeacher,
  parseJwt,
  readError,
} from "@/lib/auth";

type SyllabusLesson = { id: number; title: string; description?: string | null; order: number };

import {
  API_BASE,
  resolveImageSrc,
  getCourseImage,
  getCourseEnrollments,
  getTeacherFullName,
  getTeachersInBranch,
  getTeacherBranches,
  isEnrolledIn,
  type CourseData,
  type CourseRelation,
  type EnrollmentDto,
  type TeacherLiteDto,
} from "./courseHelpers";

interface CourseDetailModalProps {
  course: CourseData;
  onClose: () => void;
  canManage: boolean;
  enrollments: EnrollmentDto[];
  teachers: TeacherLiteDto[];
  categories: string[];
  onSaved: (updated: CourseData) => void;
  isStudent?: boolean;
  /** The viewer's standing on the course (`courseRelation`); decides buy, join, rejoin or watch. */
  relation?: CourseRelation;
  onJoin?: () => void;
  onLeave?: () => void;
}

export function CourseDetailModal({
  course,
  onClose,
  canManage,
  enrollments,
  teachers,
  categories,
  onSaved,
  isStudent = false,
  relation = "none",
  onJoin,
  onLeave,
}: CourseDetailModalProps) {
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSubCategory, setEditSubCategory] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  // editTeacherId: teachers listesinden seçilen öğretmenin id'si (string olarak, select
  // elemanının value'su için). Boş string = "henüz öğretmen seçilmedi".
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [imageMode, setImageMode] = useState<"upload" | "link">("upload");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [expandedParticipantIdx, setExpandedParticipantIdx] = useState<number | null>(null);

  const courseId = course.id ?? course.Id;
  useEffect(() => {
    setIsEditing(false);
    setStatusMessage(null);
  }, [courseId]);

  const originalTitle = course.title || course.Title || t("courseModal.unnamedCourse");
  const originalCategory = course.category || course.Category || t("courseModal.general");
  const originalInstructor =
    course.instructor || course.Instructor || t("courseModal.unknownInstructor");

  const title = i18n.exists(`dynamic.courses.${originalTitle}`)
    ? t(`dynamic.courses.${originalTitle}`)
    : originalTitle;
  const category = i18n.exists(`dynamic.categories.${originalCategory}`)
    ? t(`dynamic.categories.${originalCategory}`)
    : originalCategory;
  const instructor = originalInstructor;
  const subCategory = course.subCategory ?? course.SubCategory;
  const level = course.level ?? course.Level;
  // "Kategori · Alt kategori · Seviye" line over the cover
  const kicker = [
    category,
    subCategory &&
      (i18n.exists(`dynamic.subCategories.${subCategory}`)
        ? t(`dynamic.subCategories.${subCategory}`)
        : subCategory),
    level && t(`catalog.levels.${level}`, level),
  ]
    .filter(Boolean)
    .join(" · ");

  const price = course.price || course.Price || "0";
  const navigate = useNavigate();
  const openCoursePage = () => navigate({ to: "/kurs/$id", params: { id: String(courseId) } });
  const needsPurchase = Number(price) > 0 && relation !== "owned";
  const teacherId = course.teacherId ?? course.TeacherId;
  const capacity = course.maxCapacity || course.MaxCapacity;

  const description = course.description || course.Description;

  const imageUrl = getCourseImage(course, 0);

  // the viewer, from the token (lib/auth): decides the teacher and admin controls
  const payload = parseJwt(getToken() ?? "") ?? {};
  const currentUserRole = getRoleFromToken();
  const currentUserId: string =
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
    payload.sub ||
    "";
  const currentUserEmail: string =
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
    payload.email ||
    "";
  const currentUserName: string =
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
    payload.name ||
    payload.unique_name ||
    payload.sub ||
    "";

  const isTeacherRole = isTeacher(currentUserRole);
  const isAdminRole = isAdmin(currentUserRole);

  const myTeacherProfile = teachers.find((t) => {
    const idMatch =
      currentUserId &&
      (t.userId ?? t.UserId) &&
      String(t.userId ?? t.UserId) === String(currentUserId);
    const emailMatch =
      currentUserEmail &&
      (t.email?.toLowerCase() === currentUserEmail.toLowerCase() ||
        t.Email?.toLowerCase() === currentUserEmail.toLowerCase());
    const nameMatch =
      currentUserName && getTeacherFullName(t).toLowerCase() === currentUserName.toLowerCase();
    return idMatch || emailMatch || nameMatch;
  });
  const myTeacherId = myTeacherProfile ? (myTeacherProfile.id ?? myTeacherProfile.Id) : null;

  const isTeacherOfThisCourse =
    isTeacherRole &&
    teacherId !== undefined &&
    teacherId !== null &&
    String(teacherId) === String(myTeacherId);

  const canViewParticipants = isAdminRole || isTeacherOfThisCourse;

  const teacherBranches =
    myTeacherProfile && (myTeacherProfile.branch || myTeacherProfile.Branch)
      ? (myTeacherProfile.branch || myTeacherProfile.Branch)
          ?.split(",")
          .map((b: string) => b.trim()) || []
      : [];
  const hasMatchingBranch = teacherBranches.includes(course.category || course.Category || "");

  const handleTeachRequest = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/teachingrequests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ CourseId: courseId }),
      });
      if (res.ok) {
        showStatusToast("success", t("requests.sentSuccess", "Ders verme isteği gönderildi."));
      } else {
        showStatusToast("error", await readError(res, t("requests.sentFailed")));
      }
    } catch {
      showStatusToast("error", t("courses.errors.serverError"));
    }
  };

  useEffect(() => {
    // Escape in a confirmation closes only the confirmation
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && !document.querySelector('[role="alertdialog"]') && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // freeze the page behind the dialog: Lenis (landing page) would otherwise keep
  // consuming wheel/touch events and move the background instead of the dialog
  const lenis = useLenis();
  useEffect(() => {
    lenis?.stop();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
      lenis?.start();
    };
  }, [lenis]);

  // public syllabus: lesson titles are visible to everyone, video links only to students
  const [lessons, setLessons] = useState<SyllabusLesson[] | null>(null);
  useEffect(() => {
    if (courseId == null) return;
    let alive = true;
    setLessons(null);
    fetch(`${API_BASE}/api/courses/${courseId}/lessons`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setLessons(Array.isArray(d?.lessons) ? d.lessons : []))
      .catch(() => alive && setLessons([]));
    return () => {
      alive = false;
    };
  }, [courseId]);

  const courseEnrollments = getCourseEnrollments(course, enrollments);

  // Eğitmen profili (fotoğraf + bio): önce TeacherId ile kesin eşleşme deneniyor.
  // TeacherId'si olmayan eski kurslar için isimle eşleştirme geriye dönük uyumluluk
  // amacıyla hâlâ deneniyor, ama artık ikincil (fallback) yöntem.
  const profileOf = (m: TeacherLiteDto) => ({
    photoUrl: m.profilePictureUrl || m.ProfilePictureUrl || "",
    bio: m.aboutMe || m.AboutMe || "",
    branches: getTeacherBranches(m),
    // the teacher's other courses; only the public endpoint returns them
    courses: (m.courses ?? []).filter((c) => String(c.id) !== String(courseId)),
  });
  const instructorProfile = (() => {
    if (teacherId !== undefined && teacherId !== null && teacherId !== "") {
      const match = teachers.find((t) => String(t.id ?? t.Id) === String(teacherId));
      if (match) {
        return profileOf(match);
      }
    }

    const target = instructor.trim().toLowerCase();
    if (!target) return null;
    const nameMatch = teachers.find((t) => getTeacherFullName(t).trim().toLowerCase() === target);
    if (!nameMatch) return null;
    return profileOf(nameMatch);
  })();

  const instructorInitials = initialsOf(instructor) || "E";

  const handleStartEdit = () => {
    setEditTitle(course.title || course.Title || "");
    const currentCategory = course.category || course.Category || "";
    setEditCategory(currentCategory);
    setEditSubCategory(subCategory ?? "");
    setEditLevel(level ?? "");
    setEditPrice(String(course.price ?? course.Price ?? ""));
    setEditCapacity(String(course.maxCapacity ?? course.MaxCapacity ?? ""));

    const currentTeacherIdStr =
      teacherId !== undefined && teacherId !== null && teacherId !== "" ? String(teacherId) : "";
    // Kursa kayıtlı öğretmenin branşı, başka bir yerden (Öğretmenler sayfasından) değiştirilmiş
    // olabilir. Bu durumda id artık bu kategori için geçersizdir; formda "stale" (eskimiş)
    // haliyle taşımak yerine seçimi sıfırlıyoruz — aksi halde <select> görsel olarak listedeki
    // tek/başka bir öğretmeni gösterirken, state hâlâ eski (artık geçersiz) öğretmeni tutar ve
    // kullanıcı hiç dokunmadan Kaydet'e basarsa yanlış öğretmen gönderilir.
    const stillValidTeacher = getTeachersInBranch(teachers, currentCategory).some(
      (t) => String(t.id ?? t.Id) === currentTeacherIdStr,
    );
    setEditTeacherId(stillValidTeacher ? currentTeacherIdStr : "");

    setEditDescription(course.description || course.Description || "");
    setEditImageUrl(course.imageUrl || course.ImageUrl || course.image || course.Image || "");
    setImageMode("upload");
    setStatusMessage(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setStatusMessage(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20_000_000) {
      showStatusToast("error", t("courseModal.errors.uploadFailed"));
      return;
    }

    setIsUploadingImage(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem("jwt_token");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/api/uploads/course-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setEditImageUrl(data.url);
      } else {
        const errText = await response.text();
        console.error("Fotoğraf yüklenemedi:", errText);
        setStatusMessage({ type: "error", text: t("courseModal.errors.uploadFailed") });
      }
    } catch (error) {
      console.error(error);
      showStatusToast("error", t("courseModal.errors.serverError"));
    } finally {
      setIsUploadingImage(false);
      // Aynı dosyayı tekrar seçebilmek için input'u sıfırla
      e.target.value = "";
    }
  };

  const showStatusToast = (type: "success" | "error", text: string) =>
    setStatusMessage({ type, text });
  // each new message restarts the 3 s timer, so an older timer cannot hide a newer message
  useEffect(() => {
    if (!statusMessage) return;
    const id = window.setTimeout(() => setStatusMessage(null), 3000);
    return () => window.clearTimeout(id);
  }, [statusMessage]);

  const handleRemoveImage = () => setEditImageUrl("");

  const handleSave = async () => {
    const courseId = course.id ?? course.Id;
    if (!courseId) {
      showStatusToast("error", t("courseModal.errors.courseIdMissing"));
      return;
    }
    if (!editTitle.trim()) {
      showStatusToast("error", t("courseModal.errors.titleEmpty"));
      return;
    }
    if (!editCategory) {
      showStatusToast("error", t("courseModal.errors.categoryEmpty"));
      return;
    }
    if (!editTeacherId) {
      showStatusToast("error", t("courseModal.errors.instructorEmpty"));
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem("jwt_token");

      // Instructor metnini backend zaten senkronize edecek
      // (CourseService.SyncInstructorFromTeacherAsync), ama burada da doğru değeri
      // gönderiyoruz ki UI, sunucu yanıtı dönene kadar da tutarlı görünsün.
      const selectedTeacher = teachers.find((t) => String(t.id ?? t.Id) === editTeacherId);
      const instructorToSend = getTeacherFullName(selectedTeacher || {});
      const teacherIdToSend = Number(editTeacherId);

      const response = await fetch(`${API_BASE}/api/courses/${courseId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Title: editTitle,
          Category: editCategory,
          SubCategory: editSubCategory || null,
          Level: editLevel || null,
          Instructor: instructorToSend,
          TeacherId: teacherIdToSend,
          MaxCapacity: Number(editCapacity) || 0,
          Price: Number(editPrice) || 0,
          Description: editDescription,
          ImageUrl: editImageUrl,
        }),
      });

      if (response.ok) {
        const updated: CourseData = {
          ...course,
          title: editTitle,
          Title: editTitle,
          category: editCategory,
          Category: editCategory,
          subCategory: editSubCategory || null,
          SubCategory: editSubCategory || null,
          level: editLevel || null,
          Level: editLevel || null,
          instructor: instructorToSend,
          Instructor: instructorToSend,
          teacherId: teacherIdToSend,
          TeacherId: teacherIdToSend,
          maxCapacity: Number(editCapacity) || 0,
          MaxCapacity: Number(editCapacity) || 0,
          price: Number(editPrice) || 0,
          Price: Number(editPrice) || 0,
          description: editDescription,
          Description: editDescription,
          imageUrl: editImageUrl,
          ImageUrl: editImageUrl,
        };
        onSaved(updated);
        setIsEditing(false);
        showStatusToast("success", t("courseModal.errors.updateSuccess"));
      } else {
        showStatusToast("error", await readError(response, t("courseModal.errors.updateFailed")));
      }
    } catch (error) {
      console.error(error);
      showStatusToast("error", t("courseModal.errors.serverError"));
    } finally {
      setIsSaving(false);
    }
  };

  const editPreviewSrc = editImageUrl ? resolveImageSrc(editImageUrl) : getCourseImage(course, 0);
  // Eğitmen dropdown'ı sadece seçili kategoriyle aynı branştaki öğretmenleri gösterir.
  const teachersInCategory = getTeachersInBranch(teachers, editCategory);

  const handleCategoryChange = (newCategory: string) => {
    setEditCategory(newCategory);
    // Yeni kategoride mevcut seçili öğretmen artık uygun değilse seçimi sıfırla.
    const stillValid = getTeachersInBranch(teachers, newCategory).some(
      (t) => String(t.id ?? t.Id) === editTeacherId,
    );
    if (!stillValid) setEditTeacherId("");
  };

  return (
    <div
      data-lenis-prevent
      onClick={onClose}
      className="fixed inset-0 z-200 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain relative animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          autoFocus
          aria-label={t("common.close", "Kapat")}
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1.5 text-foreground hover:bg-background transition-colors"
        >
          <X className="size-5" />
        </button>

        <div className="w-full aspect-video relative overflow-hidden bg-muted">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)",
            }}
          />
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-90">
              {kicker}
            </span>
            <h2 id="course-modal-title" className="text-2xl font-bold leading-tight">
              {title}
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-xs font-bold">
                ₺{price}
              </div>
              {canViewParticipants ? (
                <button
                  type="button"
                  disabled={courseEnrollments.length === 0}
                  onClick={() =>
                    document
                      .getElementById("participants-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-xs font-bold hover:bg-foreground/5 cursor-pointer disabled:cursor-default transition-colors"
                >
                  <Users className="size-3.5" />
                  {capacity
                    ? t("courseModal.capacityFull", {
                        enrolled: courseEnrollments.length,
                        capacity,
                      })
                    : t("courseModal.capacityRegistered", { enrolled: courseEnrollments.length })}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-xs font-bold">
                  <Users className="size-3.5" />
                  {/* guests get no enrollment list, so a count would always read 0 */}
                  {!currentUserRole && capacity
                    ? t("courseModal.capacityOnly", { capacity })
                    : capacity
                      ? t("courseModal.capacityFull", {
                          enrolled: courseEnrollments.length,
                          capacity,
                        })
                      : t("courseModal.capacityRegistered", { enrolled: courseEnrollments.length })}
                </div>
              )}
            </div>

            {(isAdminRole || (isTeacherRole && String(teacherId) === String(myTeacherId))) &&
              !isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 text-xs font-bold bg-accent text-accent-foreground rounded-md px-3 py-1.5 hover:opacity-90 shadow-sm transition-all"
                >
                  <Edit2 className="size-3.5" />
                  {t("courseModal.editCourse")}
                </button>
              )}

            {(isAdminRole || isTeacherOfThisCourse) && !isEditing && (
              <button
                onClick={openCoursePage}
                className="text-xs font-bold border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
              >
                {t("lessons.manage")}
              </button>
            )}

            {!isAdminRole &&
              !isTeacherOfThisCourse &&
              (isEnrolledIn(relation) ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold border border-accent text-accent rounded-md px-3 py-1.5 bg-accent/5">
                    <CheckCircle2 className="size-3.5" />
                    {relation === "completed"
                      ? t("myCourses.completedBadge")
                      : t("courseModal.enrolled", "Kayıtlısınız")}
                  </div>
                  <button
                    onClick={openCoursePage}
                    className="text-xs font-bold bg-primary text-primary-foreground rounded-md px-4 py-1.5 hover:opacity-90 transition-opacity"
                  >
                    {t("lessons.watch")}
                  </button>
                  {onLeave && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center justify-center size-8 border border-border rounded-md hover:bg-muted transition-colors">
                            <MoreVertical className="size-4 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-2 z-300" align="end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeaveOpen(true);
                            }}
                            className="flex w-full items-center gap-1.5 text-xs font-bold text-destructive rounded-md px-3 py-2 hover:bg-destructive/10 transition-colors"
                          >
                            {t("courseModal.leaveCourse", "Kursu Bırak")}
                          </button>
                        </PopoverContent>
                      </Popover>
                      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("courseModal.leaveConfirmTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("courseModal.leaveConfirmBody", { course: title })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onLeave()}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              {t("courseModal.leaveCourse")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {/* Ücretli kurslar kurs sayfasında satın alınır; sahip olunan kursa ücretsiz dönülür */}
                  <button
                    onClick={needsPurchase || !onJoin ? openCoursePage : onJoin}
                    className="flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-md px-4 py-1.5 hover:opacity-90 transition-opacity"
                  >
                    {needsPurchase
                      ? t("lessons.buyFor", { price: formatTry(Number(price)) })
                      : relation === "owned"
                        ? t("courseModal.rejoinFree")
                        : t("courseModal.joinCourse", "Kursa Katıl")}
                  </button>
                  {isTeacherRole && !isEditing && hasMatchingBranch && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center justify-center size-8 border border-border rounded-md hover:bg-muted transition-colors">
                            <MoreVertical className="size-4 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-2 z-300" align="end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTeachRequest();
                            }}
                            className="flex w-full items-center gap-1.5 text-xs font-bold text-primary rounded-md px-3 py-2 hover:bg-primary hover:text-primary-foreground active:bg-primary/90 transition-all"
                          >
                            <BookOpen className="size-3.5" />
                            {t("courseModal.teachCourse", "Ders Ver")}
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {isEditing ? (
            <div className="space-y-4 border-t border-border pt-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("courseModal.photoLabel")}</label>
                <div className="flex gap-4">
                  <div className="size-20 rounded-md overflow-hidden bg-muted border border-border shrink-0">
                    <img
                      src={editPreviewSrc}
                      alt={t("courseModal.preview")}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setImageMode("upload")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md border transition-colors ${
                          imageMode === "upload"
                            ? "border-foreground bg-foreground/5"
                            : "border-border hover:bg-foreground/5"
                        }`}
                      >
                        <Upload className="size-3.5" />
                        {t("courseModal.uploadFile")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageMode("link")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md border transition-colors ${
                          imageMode === "link"
                            ? "border-foreground bg-foreground/5"
                            : "border-border hover:bg-foreground/5"
                        }`}
                      >
                        <Link2 className="size-3.5" />
                        {t("courseModal.pasteLink")}
                      </button>
                    </div>

                    {imageMode === "upload" ? (
                      <label className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold border border-dashed border-border rounded-md cursor-pointer hover:bg-foreground/5 transition-colors">
                        {isUploadingImage
                          ? t("courseModal.uploading")
                          : t("courseModal.chooseFromPc")}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          disabled={isUploadingImage}
                          onChange={handleFileChange}
                        />
                      </label>
                    ) : (
                      <input
                        type="text"
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        placeholder="https://ornek.com/fotograf.jpg"
                        className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                      />
                    )}

                    {editImageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-[11px] font-mono text-muted-foreground hover:text-destructive transition-colors"
                      >
                        {t("courseModal.removePhoto")}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("courseModal.courseName")}</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("courseModal.category")}</label>
                  <select
                    value={editCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                  >
                    <option value="" disabled>
                      {t("courses.selectCategory")}
                    </option>
                    {/* Eğer kursun mevcut kategorisi silinmişse ve hala ondaysa, onu da göster */}
                    {editCategory && !categories.includes(editCategory) && (
                      <option value={editCategory}>{editCategory}</option>
                    )}
                    {categories.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("courseModal.instructor")}</label>
                  <select
                    value={editTeacherId}
                    onChange={(e) => setEditTeacherId(e.target.value)}
                    disabled={!editCategory}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors disabled:opacity-60"
                  >
                    <option value="" disabled>
                      {!editCategory
                        ? t("courseModal.firstSelectCategory")
                        : teachersInCategory.length === 0
                          ? t("courseModal.noTeacherInBranch")
                          : t("courseModal.selectInstructor")}
                    </option>
                    {teachersInCategory.map((t) => {
                      const id = t.id ?? t.Id;
                      return (
                        <option key={id} value={id}>
                          {getTeacherFullName(t)}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    {t("courseModal.onlyTeachersInBranch", {
                      category: editCategory || t("courseModal.selectCategory"),
                    })}
                  </p>
                </div>
              </div>

              <CourseTaxonomyFields
                category={editCategory}
                subCategory={editSubCategory}
                onSubCategoryChange={setEditSubCategory}
                level={editLevel}
                onLevelChange={setEditLevel}
                selectClassName="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("courseModal.capacity")}</label>
                  <input
                    type="number"
                    min="1"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("courseModal.price")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("courseModal.courseContent")}</label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t("courseModal.courseContentPlaceholder")}
                  className="w-full p-2.5 bg-background border border-border rounded-md text-sm outline-none focus:border-foreground transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 bg-muted text-muted-foreground text-sm font-bold hover:bg-muted/80 rounded-md transition-colors disabled:opacity-60"
                >
                  {t("courseModal.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isUploadingImage}
                  className="flex-1 py-2.5 px-4 bg-foreground text-background text-sm font-bold hover:opacity-90 rounded-md transition-opacity disabled:opacity-60"
                >
                  {isSaving ? t("courseModal.saving") : t("courseModal.save")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-bold text-foreground/80 mb-2 flex items-center gap-2">
                  <BookOpen className="size-4" />
                  {t("courseModal.contentTitle")}
                </h3>
                <p className="text-sm text-muted-foreground leading-6 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                  {description || t("courseModal.noDescription", { category })}
                </p>
              </div>

              {courseId && <CourseRatingCard key={relation} courseId={courseId} />}

              <div>
                <h3 className="text-sm font-bold text-foreground/80 mb-3 flex items-center gap-2">
                  <ListOrdered className="size-4" />
                  {t("courseModal.syllabus")}
                  {lessons && lessons.length > 0 && (
                    <span className="ml-auto font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {t("courseModal.lessonCount", { count: lessons.length })}
                    </span>
                  )}
                </h3>
                {lessons === null ? (
                  <div className="space-y-2" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : lessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("lessons.empty")}</p>
                ) : (
                  <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                    {lessons.map((l, i) => (
                      <li key={l.id} className="flex gap-4 px-4 py-3">
                        <span className="pt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground break-words [overflow-wrap:anywhere]">
                            {l.title}
                          </p>
                          {l.description && (
                            <p className="mt-0.5 text-sm leading-6 text-muted-foreground break-words [overflow-wrap:anywhere]">
                              {l.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground/80 mb-3 flex items-center gap-2">
                  <User className="size-4" />
                  {t("courseModal.instructorProfile")}
                </h3>
                <div className="flex items-start gap-4 bg-background border border-border rounded-xl p-4">
                  {instructorProfile?.photoUrl ? (
                    <img
                      src={resolveImageSrc(instructorProfile.photoUrl)}
                      alt={instructor}
                      className="size-14 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="size-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-mono uppercase shrink-0">
                      {instructorInitials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="font-bold break-words [overflow-wrap:anywhere]">{instructor}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-2">
                      {instructorProfile?.branches.length
                        ? instructorProfile.branches
                            .map((b) =>
                              i18n.exists(`dynamic.categories.${b}`)
                                ? t(`dynamic.categories.${b}`)
                                : b,
                            )
                            .join(" · ")
                        : t("courseModal.instructorRole")}
                    </p>
                    <p className="text-sm text-muted-foreground leading-6 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                      {instructorProfile?.bio || t("courseModal.noInstructorBio")}
                    </p>
                    {!!instructorProfile?.courses.length && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
                          {t("courseModal.otherCourses")}
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {instructorProfile.courses.map((c) => (
                            <li
                              key={c.id}
                              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground"
                            >
                              {i18n.exists(`dynamic.courses.${c.title}`)
                                ? t(`dynamic.courses.${c.title}`)
                                : c.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {canViewParticipants && courseEnrollments.length > 0 && (
                <div id="participants-section">
                  <h3 className="text-sm font-bold text-foreground/80 mb-2 flex items-center gap-2">
                    <Users className="size-4" />
                    {t("courseModal.enrolledStudents")}
                  </h3>
                  <ul className="text-sm text-foreground space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {courseEnrollments.map((enr, idx) => (
                      <li key={idx} className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedParticipantIdx(expandedParticipantIdx === idx ? null : idx)
                          }
                          className="flex items-center gap-2 text-left hover:text-primary transition-colors focus:outline-none w-full"
                        >
                          <span className="size-1.5 rounded-full bg-foreground/50 shrink-0"></span>
                          <span className="font-medium">
                            {enr.studentFullName || enr.StudentFullName}
                          </span>
                        </button>

                        {expandedParticipantIdx === idx && (
                          <div className="pl-[14px] flex flex-col gap-1 mt-0.5 animate-reveal">
                            <div className="text-[11px] text-muted-foreground border-l-2 border-primary/20 pl-2.5 py-0.5 space-y-1">
                              <p>
                                <span className="font-semibold text-foreground/70">
                                  {t("courseModal.studentNumber", "Öğrenci No")}:
                                </span>{" "}
                                {enr.studentNumber || enr.StudentNumber || "-"}
                              </p>
                              <p>
                                <span className="font-semibold text-foreground/70">
                                  {t("courseModal.enrollmentDate", "Kayıt Tarihi")}:
                                </span>{" "}
                                {formatDate(
                                  enr.enrollmentDate || enr.EnrollmentDate,
                                  i18n.language,
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-300 flex items-center gap-3 rounded-lg px-5 py-3.5 text-sm font-bold text-white shadow-lg ${
            statusMessage.type === "success" ? "bg-success" : "bg-destructive"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
