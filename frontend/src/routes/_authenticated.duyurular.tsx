import { readError } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

import { parseJwt, isAdminRole } from "@/lib/auth";
import { API_BASE } from "@/components/courseHelpers";
interface AnnouncementData {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

export const Route = createFileRoute("/_authenticated/duyurular")({
  head: () => ({
    meta: [
      {
        title: "Duyurular - E-Kurs",
      },
    ],
  }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { t, i18n } = useTranslation();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const fetchAnnouncements = async () => {
    const token = localStorage.getItem("jwt_token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const res = await fetch(`${API_BASE}/api/announcements`, { headers });
      if (res.ok) {
        setAnnouncements(await res.json());
      }
    } catch (err) {
      console.error("Duyuru çekme hatası:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        const role =
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role;
        if (isAdminRole(role)) {
          setIsAdmin(true);
        }
      }
    }
    fetchAnnouncements();
  }, [t]);

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error(t("backendErrors.announcementFieldsRequired"));
      return;
    }

    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/announcements`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Title: newTitle, Content: newContent }),
      });

      if (res.ok) {
        toast.success(t("dashboard.announcementCreated"));
        setIsModalOpen(false);
        setNewTitle("");
        setNewContent("");
        fetchAnnouncements();
      } else {
        toast.error(await readError(res, t("dashboard.announcementCreateFailed")));
      }
    } catch {
      toast.error(t("courses.errors.serverError"));
    }
  };

  return (
    <>
      <PageHeader
        crumb={t("dashboard.announcements")}
        action={
          isAdmin ? (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="size-4" /> {t("dashboard.newAnnouncement", "Yeni Duyuru")}
            </Button>
          ) : undefined
        }
      />
      <div className="p-4 md:p-8 animate-reveal">
        <section className="space-y-4">
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="py-4 text-center text-muted-foreground text-xs border border-border bg-card animate-pulse">
                Yükleniyor...
              </div>
            ) : announcements.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm border border-border bg-card rounded-lg">
                {t("dashboard.noAnnouncements")}
              </div>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-5 border border-border bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-accent flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg">{ann.title}</h4>
                    <span className="text-[11px] font-mono bg-muted text-muted-foreground px-2 py-1 rounded">
                      {formatDate(ann.createdAt, i18n.language)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg p-6 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-6">
              {t("dashboard.newAnnouncement", "Yeni Duyuru Oluştur")}
            </h3>
            <form onSubmit={handleAddAnnouncement} className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  {t("dashboard.announcementTitle", "Başlık")} *
                </label>
                <input
                  required
                  type="text"
                  maxLength={150}
                  className="w-full rounded-md border border-border px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  {t("dashboard.announcementContent", "İçerik")} *
                </label>
                <textarea
                  required
                  maxLength={1000}
                  className="w-full rounded-md border border-border px-3 py-2.5 text-sm h-32 resize-none bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">{t("dashboard.create", "Oluştur")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
