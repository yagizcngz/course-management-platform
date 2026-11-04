import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PlayCircle, Lock, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { API_BASE } from "@/components/courseHelpers";
import { authHeaders, getToken, readError } from "@/lib/auth";
import { formatTry } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/kurs/$id")({
  component: CoursePage,
});

interface Lesson {
  id: number;
  title: string;
  description: string | null;
  order: number;
  videoUrl: string | null;
}

interface CourseLessons {
  hasAccess: boolean;
  canEdit: boolean;
  course: {
    id: number;
    title: string;
    description: string;
    instructor: string;
    imageUrl: string | null;
    price: number;
    category: string;
  };
  lessons: Lesson[];
}

// YouTube bağlantısını gömülebilir adrese çevirir; yüklenen dosyalar API sunucusundan gelir
const toPlayable = (url: string) => {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return { kind: "embed" as const, src: `https://www.youtube.com/embed/${yt[1]}` };
  return { kind: "video" as const, src: url.startsWith("/") ? `${API_BASE}${url}` : url };
};

function CoursePage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const [data, setData] = useState<CourseLessons | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [refundable, setRefundable] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/courses/${id}/lessons`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await readError(res, t("lessons.loadFailed")));
      const json: CourseLessons = await res.json();
      setData(json);
      setActiveId((cur) => cur ?? json.lessons[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    const w = await fetch(`${API_BASE}/api/wallet/me`, { headers: authHeaders() }).catch(
      () => null,
    );
    if (w?.ok) {
      const wallet = await w.json();
      setBalance(wallet.balance);
      setPurchased(wallet.purchasedCourseIds.includes(Number(id)));
      setRefundable(wallet.refundableCourseIds.includes(Number(id)));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const enroll = async () => {
    if (!data) return;
    setBusy(true);
    try {
      // Ücretsiz veya daha önce satın alınmış kurs: katıl; değilse satın al
      const paid = data.course.price > 0 && !purchased;
      const url = paid
        ? `${API_BASE}/api/wallet/purchase/${id}`
        : `${API_BASE}/api/enrollments/join/${id}`;
      const res = await fetch(url, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error(await readError(res, t("lessons.enrollFailed")));
      toast.success(paid ? t("lessons.purchaseSuccess") : t("dashboard.alerts.joinSuccess"));
      window.dispatchEvent(new Event("wallet-changed"));
      setConfirmOpen(false);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const refund = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/wallet/refund/${id}`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await readError(res, t("lessons.refundFailed")));
      toast.success(t("lessons.refundSuccess"));
      window.dispatchEvent(new Event("wallet-changed"));
      setRefundOpen(false);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <>
        <PageHeader crumb={t("lessons.title")} />
        <div className="p-8 text-sm text-destructive">{error}</div>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader crumb={t("lessons.title")} />
        <div className="p-8 text-sm text-muted-foreground">{t("common.loading")}</div>
      </>
    );
  }

  const { course, lessons, hasAccess, canEdit } = data;
  const active = lessons.find((l) => l.id === activeId) ?? null;
  const needsPurchase = course.price > 0 && !purchased;
  const insufficient = needsPurchase && balance !== null && balance < course.price;

  return (
    <>
      <PageHeader crumb={course.title} />
      <div className="p-4 md:p-8 max-w-6xl mx-auto w-full grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 min-w-0">
          <div className="aspect-video w-full bg-primary rounded-lg overflow-hidden flex items-center justify-center">
            {hasAccess && active?.videoUrl ? (
              (() => {
                const p = toPlayable(active.videoUrl);
                return p.kind === "embed" ? (
                  <iframe
                    key={p.src}
                    src={p.src}
                    title={active.title}
                    className="w-full h-full"
                    allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <video key={p.src} src={p.src} controls className="w-full h-full" />
                );
              })()
            ) : (
              <div className="text-muted-foreground text-sm flex flex-col items-center gap-2 px-6 text-center">
                {hasAccess ? <PlayCircle className="size-8" /> : <Lock className="size-8" />}
                {hasAccess
                  ? lessons.length === 0
                    ? t("lessons.empty")
                    : t("lessons.noVideo")
                  : t("lessons.locked")}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {course.category} · {course.instructor}
            </p>
            <h1 className="text-2xl font-bold tracking-tight mt-1">
              {active && hasAccess ? active.title : course.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">
              {active && hasAccess ? active.description || "" : course.description}
            </p>
          </div>

          {!hasAccess && (
            <Card>
              <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {course.price > 0 ? formatTry(course.price) : t("courses.free")}
                  </p>
                  {needsPurchase && balance !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("lessons.yourBalance", { balance: formatTry(balance) })}
                    </p>
                  )}
                </div>
                {insufficient ? (
                  <Button asChild>
                    <Link to="/cuzdan">{t("lessons.topUpFirst")}</Link>
                  </Button>
                ) : (
                  <Button
                    disabled={busy}
                    onClick={() => (needsPurchase ? setConfirmOpen(true) : enroll())}
                  >
                    {needsPurchase
                      ? t("lessons.buyFor", { price: formatTry(course.price) })
                      : t("courseModal.joinCourse")}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {hasAccess && refundable && !canEdit && (
            <p className="text-xs text-muted-foreground">
              {t("lessons.refundHint")}{" "}
              <button
                onClick={() => setRefundOpen(true)}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {t("lessons.refund")}
              </button>
            </p>
          )}

          {canEdit && (
            <LessonEditor courseId={id} onChanged={load} nextOrder={lessons.length + 1} />
          )}
        </div>

        <Card className="h-fit">
          <CardContent className="p-0">
            <p className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("lessons.list", { count: lessons.length })}
            </p>
            {lessons.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">{t("lessons.empty")}</p>
            ) : (
              <ol className="divide-y">
                {lessons.map((l, i) => (
                  <li key={l.id} className="flex items-center">
                    <button
                      onClick={() => setActiveId(l.id)}
                      disabled={!hasAccess}
                      className={`flex-1 text-left px-4 py-3 text-sm flex gap-3 items-start disabled:cursor-not-allowed ${l.id === activeId && hasAccess ? "bg-muted font-semibold" : "hover:bg-muted/60"}`}
                    >
                      <span className="text-xs text-muted-foreground tabular-nums w-5 pt-0.5">
                        {i + 1}
                      </span>
                      <span className="flex-1">{l.title}</span>
                      {!hasAccess && <Lock className="size-3.5 text-muted-foreground mt-0.5" />}
                    </button>
                    {canEdit && <DeleteLessonButton courseId={id} lesson={l} onDeleted={load} />}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lessons.refund")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("lessons.refundBody", { course: course.title, price: formatTry(course.price) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                refund();
              }}
            >
              {t("lessons.refund")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lessons.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("lessons.confirmBody", { course: course.title, price: formatTry(course.price) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                enroll();
              }}
            >
              {t("lessons.confirmBuy")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DeleteLessonButton({
  courseId,
  lesson,
  onDeleted,
}: {
  courseId: string;
  lesson: Lesson;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const remove = async () => {
    const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons/${lesson.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) return toast.error(await readError(res, t("lessons.deleteFailed")));
    toast.success(t("lessons.deleted"));
    onDeleted();
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          aria-label={t("lessons.delete")}
          className="px-3 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("lessons.delete")}</AlertDialogTitle>
          <AlertDialogDescription>{lesson.title}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={remove}>{t("lessons.delete")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LessonEditor({
  courseId,
  onChanged,
  nextOrder,
}: {
  courseId: string;
  onChanged: () => void;
  nextOrder: number;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error(t("lessons.titleRequired"));
    setSaving(true);
    try {
      let url = videoUrl.trim() || null;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        const up = await fetch(`${API_BASE}/api/uploads/video`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: form,
        });
        if (!up.ok) throw new Error(await readError(up, t("lessons.uploadFailed")));
        url = (await up.json()).url;
      }
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title,
          description: description || null,
          videoUrl: url,
          order: nextOrder,
        }),
      });
      if (!res.ok) throw new Error(await readError(res, t("lessons.saveFailed")));
      toast.success(t("lessons.added"));
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setFile(null);
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          {t("lessons.addLesson")}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Input
            aria-label={t("lessons.lessonTitle")}
            placeholder={t("lessons.lessonTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            aria-label={t("lessons.lessonDescription")}
            placeholder={t("lessons.lessonDescription")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 border border-dashed rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-muted">
              <Upload className="size-4 shrink-0" />
              <span className="truncate">{file ? file.name : t("lessons.chooseVideo")}</span>
              <input
                type="file"
                accept="video/mp4,video/webm"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Input
              aria-label={t("lessons.videoUrl")}
              placeholder={t("lessons.videoUrl")}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={!!file}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? t("lessons.saving") : t("lessons.addLesson")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
