import { formatDate, pillButton } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Trash, Trash2, Edit2 } from "lucide-react";

import { API_BASE } from "@/components/courseHelpers";
import { adminOnly } from "@/hooks/useAdminGuard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
export const Route = createFileRoute("/_authenticated/istekler")({
  component: adminOnly(RequestsPage),
});

interface TeachingRequest {
  id: number;
  courseId: number;
  courseTitle: string;
  teacherId: number;
  teacherName: string;
  status: string;
  createdAt: string;
}

interface SupportRequest {
  id: number;
  userId: number | null;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  createdAt: string;
  isResolved: boolean;
  replyMessage: string | null;
  repliedAt: string | null;
  userRole: string;
}

function RequestsPage() {
  const { t, i18n } = useTranslation();
  const [teachingRequests, setTeachingRequests] = useState<TeachingRequest[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTeachingIds, setSelectedTeachingIds] = useState<number[]>([]);
  const [selectedSupportIds, setSelectedSupportIds] = useState<number[]>([]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        setLoading(false);
        return;
      }

      const [trRes, srRes] = await Promise.all([
        fetch(`${API_BASE}/api/teachingrequests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/supportrequests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (trRes.ok) setTeachingRequests(await trRes.json());
      if (srRes.ok) setSupportRequests(await srRes.json());
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/teachingrequests/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Request approved.");
        fetchRequests();
      } else {
        toast.error(t("requests.serverError", "Sunucu hatası."));
      }
    } catch {
      toast.error("Error occurred.");
    }
  };

  const handleReject = async (id: number) => {
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/teachingrequests/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Request rejected.");
        fetchRequests();
      } else {
        toast.error(t("requests.serverError", "Sunucu hatası."));
      }
    } catch {
      toast.error("Error occurred.");
    }
  };

  const handleReplySupport = async (id: number) => {
    if (!replyText[id]) return toast.error(t("requests.emptyReply", "Yanıt boş olamaz."));

    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/supportrequests/${id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ replyMessage: replyText[id] }),
      });

      if (res.ok) {
        toast.success(t("requests.replySent", "Yanıt gönderildi."));
        setReplyText((prev) => ({ ...prev, [id]: "" }));
        fetchRequests();
      } else {
        toast.error(t("requests.replyFailed", "Yanıt gönderilemedi."));
      }
    } catch {
      toast.error(t("requests.serverError", "Sunucu hatası."));
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setSelectedTeachingIds([]);
    setSelectedSupportIds([]);
  };

  const handleSelectTeaching = (id: number) => {
    setSelectedTeachingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSelectSupport = (id: number) => {
    setSelectedSupportIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedTeachingIds.length === 0 && selectedSupportIds.length === 0) return;

    try {
      const token = localStorage.getItem("jwt_token");
      const headers = { Authorization: `Bearer ${token}` };

      const teachingDeleted = (
        await Promise.all(
          selectedTeachingIds.map((id) =>
            fetch(`${API_BASE}/api/teachingrequests/${id}`, {
              method: "DELETE",
              headers,
            })
              .then((res) => (res.ok ? id : null))
              .catch(() => null),
          ),
        )
      ).filter((id): id is number => id !== null);
      const supportDeleted = (
        await Promise.all(
          selectedSupportIds.map((id) =>
            fetch(`${API_BASE}/api/supportrequests/${id}`, { method: "DELETE", headers })
              .then((res) => (res.ok ? id : null))
              .catch(() => null),
          ),
        )
      ).filter((id): id is number => id !== null);

      const failedCount =
        selectedTeachingIds.length -
        teachingDeleted.length +
        selectedSupportIds.length -
        supportDeleted.length;
      if (failedCount > 0) {
        toast.error(t("requests.serverError", "Sunucu hatası."));
      } else {
        toast.success(t("requests.deleted", "Seçili öğeler silindi."));
        setIsEditMode(false);
      }
      setSelectedTeachingIds((prev) => prev.filter((id) => !teachingDeleted.includes(id)));
      setSelectedSupportIds((prev) => prev.filter((id) => !supportDeleted.includes(id)));
      fetchRequests();
    } catch {
      toast.error(t("requests.serverError", "Sunucu hatası."));
    }
  };

  const sortedTeachingRequests = [...teachingRequests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const sortedSupportRequests = [...supportRequests].sort((a, b) => {
    const dateA = a.isResolved ? a.repliedAt || a.createdAt : a.createdAt;
    const dateB = b.isResolved ? b.repliedAt || b.createdAt : b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const totalSelected = selectedTeachingIds.length + selectedSupportIds.length;

  return (
    <>
      <PageHeader
        crumb={t("sidebar.pendingRequests", "İstekler")}
        action={
          <div className="flex gap-2">
            {isEditMode && totalSelected > 0 && (
              <ConfirmDialog
                title={t("requests.deleteConfirmTitle", { count: totalSelected })}
                description={t("requests.deleteConfirmBody")}
                confirmLabel={t("requests.deleteSelected", { count: totalSelected })}
                onConfirm={handleDeleteSelected}
              >
                <button className={pillButton.danger}>
                  <Trash2 className="size-4" />
                  {t("requests.deleteSelected", { count: totalSelected })}
                </button>
              </ConfirmDialog>
            )}

            <button onClick={toggleEditMode} className={pillButton.outline}>
              {isEditMode
                ? t("requests.cancelEdit", "İptal")
                : t("requests.editRequests", "İstekleri Düzenle")}
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-8 animate-reveal max-w-5xl mx-auto w-full">
        <Tabs defaultValue="teaching" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="teaching">
              {t("requests.teachingRequests", "Ders Verme İstekleri")}
            </TabsTrigger>
            <TabsTrigger value="applications">{t("requests.applications")}</TabsTrigger>
            <TabsTrigger value="support">
              {t("requests.supportRequests", "Yardım Talepleri")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <InstructorApplications />
          </TabsContent>

          <TabsContent value="teaching">
            {loading ? (
              <div className="text-center text-muted-foreground p-8">
                {t("requests.loading", "Yükleniyor...")}
              </div>
            ) : teachingRequests.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">
                {t("requests.noTeaching", "Bekleyen istek bulunmuyor.")}
              </div>
            ) : (
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-3">
                  <TabsTrigger value="pending">
                    {t("requests.pendingTab", "Bekleyenler")}
                  </TabsTrigger>
                  <TabsTrigger value="accepted">
                    {t("requests.acceptedTab", "Kabul Edilenler")}
                  </TabsTrigger>
                  <TabsTrigger value="rejected">
                    {t("requests.rejectedTab", "Reddedilenler")}
                  </TabsTrigger>
                </TabsList>

                {["Pending", "Accepted", "Rejected"].map((status) => (
                  <TabsContent key={status} value={status.toLowerCase()}>
                    <div className="grid gap-4">
                      {sortedTeachingRequests.filter((r) => r.status === status).length === 0 ? (
                        <div className="text-center text-muted-foreground p-8 text-sm">
                          {t("requests.emptyTab", "Bu kategoride kayıt bulunmuyor.")}
                        </div>
                      ) : (
                        sortedTeachingRequests
                          .filter((r) => r.status === status)
                          .map((request) => (
                            <Card
                              key={request.id}
                              className={`transition-colors ${selectedTeachingIds.includes(request.id) ? "border-destructive bg-destructive/10" : ""}`}
                            >
                              <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  {isEditMode && (
                                    <input
                                      type="checkbox"
                                      className="size-4 rounded border-border text-foreground focus:ring-foreground cursor-pointer shrink-0"
                                      checked={selectedTeachingIds.includes(request.id)}
                                      onChange={() => handleSelectTeaching(request.id)}
                                    />
                                  )}
                                  <div>
                                    <div className="font-semibold text-lg">
                                      {request.teacherName}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {t("requests.courseLabel", "Kurs:")}{" "}
                                      <span className="font-medium text-foreground">
                                        {i18n.exists(
                                          `dynamic.courses.${(request.courseTitle || "").trim()}`,
                                        )
                                          ? t(
                                              `dynamic.courses.${(request.courseTitle || "").trim()}`,
                                            )
                                          : request.courseTitle}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {t("requests.dateLabel", "Tarih:")}{" "}
                                      {formatDate(request.createdAt, i18n.language)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {request.status === "Pending" ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="bg-success hover:bg-success/90"
                                        onClick={() => handleApprove(request.id)}
                                      >
                                        <Check className="h-4 w-4 mr-1" />{" "}
                                        {t("requests.approve", "Kabul Et")}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleReject(request.id)}
                                      >
                                        <X className="h-4 w-4 mr-1" />{" "}
                                        {t("requests.reject", "Reddet")}
                                      </Button>
                                    </>
                                  ) : (
                                    <Badge
                                      variant={
                                        request.status === "Accepted" ? "default" : "destructive"
                                      }
                                    >
                                      {request.status === "Accepted"
                                        ? t("requests.accepted", "Kabul Edildi")
                                        : t("requests.rejected", "Reddedildi")}
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="support">
            {loading ? (
              <div className="text-center text-muted-foreground p-8">
                {t("requests.loading", "Yükleniyor...")}
              </div>
            ) : supportRequests.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">
                {t("requests.noSupport", "Yardım talebi bulunmuyor.")}
              </div>
            ) : (
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-2">
                  <TabsTrigger value="pending">
                    {t("requests.pendingTab", "Bekleyenler")}
                  </TabsTrigger>
                  <TabsTrigger value="resolved">
                    {t("requests.resolvedTab", "Yanıtlanmış")}
                  </TabsTrigger>
                </TabsList>

                {[false, true].map((isResolved) => (
                  <TabsContent
                    key={isResolved.toString()}
                    value={isResolved ? "resolved" : "pending"}
                  >
                    <div className="grid gap-6">
                      {sortedSupportRequests.filter((r) => r.isResolved === isResolved).length ===
                      0 ? (
                        <div className="text-center text-muted-foreground p-8 text-sm">
                          {t("requests.emptyTab", "Bu kategoride kayıt bulunmuyor.")}
                        </div>
                      ) : (
                        sortedSupportRequests
                          .filter((r) => r.isResolved === isResolved)
                          .map((request) => (
                            <Card
                              key={request.id}
                              className={`overflow-hidden transition-colors ${selectedSupportIds.includes(request.id) ? "border-destructive" : ""}`}
                            >
                              <div
                                className={`p-4 border-b border-border flex items-center justify-between ${selectedSupportIds.includes(request.id) ? "bg-destructive/10" : "bg-muted/50"}`}
                              >
                                <div className="flex items-center gap-4">
                                  {isEditMode && (
                                    <input
                                      type="checkbox"
                                      className="size-4 rounded border-border text-foreground focus:ring-foreground cursor-pointer shrink-0"
                                      checked={selectedSupportIds.includes(request.id)}
                                      onChange={() => handleSelectSupport(request.id)}
                                    />
                                  )}
                                  <div>
                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                      {request.name}
                                      <Badge variant="outline" className="text-xs">
                                        {request.userRole === "User"
                                          ? t("profile.roles.student", "Öğrenci")
                                          : request.userRole}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {request.email} {request.phone && `| ${request.phone}`}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant={request.isResolved ? "default" : "secondary"}>
                                    {request.isResolved
                                      ? t("requests.statusResolved", "Yanıtlandı")
                                      : t("requests.statusPending", "Bekliyor")}
                                  </Badge>
                                  <div className="text-xs text-muted-foreground mt-2">
                                    {new Date(request.createdAt).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <CardContent className="p-6">
                                <div className="text-foreground whitespace-pre-wrap">
                                  {request.message}
                                </div>

                                {request.isResolved && request.replyMessage ? (
                                  <div className="mt-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
                                    <div className="text-xs font-bold text-primary mb-2 flex items-center justify-between">
                                      <span>{t("requests.yourReply", "Sizin Yanıtınız")}</span>
                                      <span>
                                        {request.repliedAt
                                          ? new Date(request.repliedAt).toLocaleString()
                                          : ""}
                                      </span>
                                    </div>
                                    <div className="text-sm text-foreground">
                                      {request.replyMessage}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-6 flex items-end gap-3">
                                    <div className="flex-1">
                                      <Input
                                        placeholder={t(
                                          "requests.replyPlaceholder",
                                          "Yanıtınızı yazın...",
                                        )}
                                        value={replyText[request.id] || ""}
                                        onChange={(e) =>
                                          setReplyText((prev) => ({
                                            ...prev,
                                            [request.id]: e.target.value,
                                          }))
                                        }
                                        className="w-full"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleReplySupport(request.id)}
                                      className="shrink-0 gap-2"
                                    >
                                      <Send className="h-4 w-4" />{" "}
                                      {t("requests.replyBtn", "Yanıtla")}
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

interface InstructorApplication {
  id: number;
  username: string;
  fullName: string;
  email: string;
  branch: string;
  aboutMe: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

/** Instructor applications sent from the sign-up form without an invite code. */
function InstructorApplications() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<InstructorApplication[] | null>(null);

  const load = async () => {
    const res = await fetch(`${API_BASE}/api/TeacherApplications`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("jwt_token")}` },
    }).catch(() => null);
    setItems(res?.ok ? await res.json() : []);
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: number, action: "approve" | "reject") => {
    const res = await fetch(`${API_BASE}/api/TeacherApplications/${id}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("jwt_token")}` },
    }).catch(() => null);
    if (res?.ok) {
      toast.success(
        t(action === "approve" ? "requests.applicationApproved" : "requests.applicationRejected"),
      );
      load();
    } else toast.error(t("requests.serverError"));
  };

  if (items === null)
    return <div className="p-8 text-center text-muted-foreground">{t("requests.loading")}</div>;
  if (items.length === 0)
    return (
      <div className="p-8 text-center text-muted-foreground">{t("requests.noApplications")}</div>
    );

  return (
    <div className="grid gap-4">
      {items.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-lg font-semibold">{a.fullName}</div>
              <div className="text-sm text-muted-foreground">
                @{a.username} · {a.email}
              </div>
              <div className="mt-2 text-sm">
                {t("register.branch")}:{" "}
                <span className="font-medium">
                  {i18n.exists(`dynamic.categories.${a.branch}`)
                    ? t(`dynamic.categories.${a.branch}`)
                    : a.branch}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {a.aboutMe}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                {t("requests.dateLabel")} {formatDate(a.createdAt, i18n.language)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {a.status === "Pending" ? (
                <>
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90"
                    onClick={() => decide(a.id, "approve")}
                  >
                    <Check className="mr-1 h-4 w-4" /> {t("requests.approve")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(a.id, "reject")}>
                    <X className="mr-1 h-4 w-4" /> {t("requests.reject")}
                  </Button>
                </>
              ) : (
                <Badge variant={a.status === "Approved" ? "default" : "destructive"}>
                  {a.status === "Approved" ? t("requests.accepted") : t("requests.rejected")}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
