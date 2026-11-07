import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PlayCircle, Lock, Trash2, Upload, CheckCircle2, Circle } from "lucide-react";
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
import { API_BASE, refundNote, type ActivePurchase } from "@/components/courseHelpers";
import { CourseProgressBar } from "@/components/CourseProgressBar";
import { authHeaders, getToken, parseJwt, readError } from "@/lib/auth";
import { TrackedVideo } from "@/components/TrackedVideo";
import { REQUIRED_SHARE, watchedSeconds, watchedShare, type WatchState } from "@/lib/watchProgress";
import { formatDate, formatTry } from "@/lib/utils";
import { measureVideo } from "@/lib/videoDuration";
import { CourseRatingCard } from "@/components/CourseRatingCard";

// development and testing: "Mark complete" works at once, whatever the video did (the API honours
// devOverride only in its Development environment)
const DEV_COMPLETE = import.meta.env.DEV;

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
  isEnrolled: boolean;
  completedLessonIds: number[];
  progressPercent: number;
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
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<CourseLessons | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  // bought (not refunded) or finished earlier: rejoining is free and buying again is blocked
  const [owned, setOwned] = useState(false);
  // this course's unrefunded purchase and the refund window, both from /api/wallet/me
  const [purchase, setPurchase] = useState<ActivePurchase | null>(null);
  const [refundDays, setRefundDays] = useState(7);
  const [refundOpen, setRefundOpen] = useState(false);
  // genuine viewing of the open lesson's video; reset whenever another lesson opens
  const [watch, setWatch] = useState<{ state: WatchState; duration: number } | null>(null);
  useEffect(() => setWatch(null), [activeId]);

  // `stale` turns true once the page has moved to another course, so a slow answer for the
  // previous one cannot overwrite it
  const load = async (stale = () => false) => {
    try {
      const res = await fetch(`${API_BASE}/api/courses/${id}/lessons`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await readError(res, t("lessons.loadFailed")));
      const json: CourseLessons = await res.json();
      if (stale()) return;
      setData(json);
      // keep the open lesson only if it belongs to this course; otherwise resume at the first
      // unfinished one
      const resume =
        json.lessons.find((l) => !json.completedLessonIds?.includes(l.id)) ?? json.lessons[0];
      setActiveId((cur) => (json.lessons.some((l) => l.id === cur) ? cur : (resume?.id ?? null)));
      setError(null);
    } catch (e) {
      if (stale()) return;
      setError((e as Error).message);
    }
    const w = await fetch(`${API_BASE}/api/wallet/me`, { headers: authHeaders() }).catch(
      () => null,
    );
    if (w?.ok) {
      const wallet = await w.json();
      if (stale()) return;
      setBalance(wallet.balance);
      setOwned(wallet.ownedCourseIds.includes(Number(id)));
      setPurchase(
        (wallet.purchases as ActivePurchase[] | undefined)?.find(
          (p) => p.courseId === Number(id),
        ) ?? null,
      );
      setRefundDays(wallet.refundWindowDays ?? 7);
    }
  };

  useEffect(() => {
    let off = false;
    load(() => off);
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const enroll = async () => {
    if (!data) return;
    setBusy(true);
    try {
      // Ücretsiz veya sahip olunan kurs: katıl; değilse satın al
      const paid = data.course.price > 0 && !owned;
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

  // a lesson counts as done from its button or when its video ends; a video lesson only once
  // REQUIRED_SHARE of it was really watched (the API checks the same numbers)
  const complete = async (
    lessonId: number,
    viewed?: { state: WatchState; duration: number },
    devOverride = false,
  ) => {
    if (!data?.isEnrolled || data.completedLessonIds.includes(lessonId)) return;
    // a video that never loaded has no duration; NaN would not even parse on the API
    const measured = viewed && Number.isFinite(viewed.duration) && viewed.duration > 0;
    try {
      const res = await fetch(`${API_BASE}/api/courses/${id}/lessons/${lessonId}/complete`, {
        method: "POST",
        headers: authHeaders(),
        body:
          measured || devOverride
            ? JSON.stringify({
                ...(measured && {
                  watchedSeconds: watchedSeconds(viewed.state, viewed.duration),
                  durationSeconds: Math.ceil(viewed.duration),
                }),
                ...(devOverride && { devOverride: true }),
              })
            : undefined,
      });
      if (!res.ok) throw new Error(await readError(res, t("lessons.completeFailed")));
      const p: { progressPercent: number; completed: boolean } = await res.json();
      setData((d) =>
        d
          ? {
              ...d,
              completedLessonIds: [...d.completedLessonIds, lessonId],
              progressPercent: p.progressPercent,
            }
          : d,
      );
      if (p.completed) toast.success(t("lessons.courseCompleted"));
    } catch (e) {
      toast.error((e as Error).message);
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

  const { course, lessons, hasAccess, canEdit, isEnrolled } = data;
  const active = lessons.find((l) => l.id === activeId) ?? null;
  const done = new Set(data.completedLessonIds ?? []);
  const needsPurchase = course.price > 0 && !owned;
  const viewer = parseJwt(getToken() ?? "")?.sub ?? "";
  const tracked = isEnrolled && !!active?.videoUrl && hasAccess;
  const share = watch ? watchedShare(watch.state, watch.duration) : 0;
  const canComplete = DEV_COMPLETE || !active?.videoUrl || share >= REQUIRED_SHARE;
  const insufficient = needsPurchase && balance !== null && balance < course.price;

  return (
    <>
      <PageHeader crumb={course.title} />
      <div className="p-4 md:p-8 max-w-6xl mx-auto w-full grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 min-w-0">
          <div className="aspect-video w-full bg-night rounded-xl overflow-hidden flex items-center justify-center">
            {hasAccess && active?.videoUrl ? (
              (() => {
                const p = toPlayable(active.videoUrl);
                return (
                  <TrackedVideo
                    key={p.src}
                    kind={p.kind}
                    src={p.src}
                    title={active.title}
                    storageKey={tracked ? `watch:${viewer}:${active.id}` : null}
                    guard={!done.has(active.id)}
                    onProgress={(state, duration) => setWatch({ state, duration })}
                    onEnded={(state, duration) => {
                      if (watchedShare(state, duration) >= REQUIRED_SHARE)
                        complete(active.id, { state, duration });
                    }}
                  />
                );
              })()
            ) : (
              <div className="text-white/70 text-sm flex flex-col items-center gap-2 px-6 text-center">
                {hasAccess ? <PlayCircle className="size-8" /> : <Lock className="size-8" />}
                {hasAccess
                  ? lessons.length === 0
                    ? t("lessons.empty")
                    : t("lessons.noVideo")
                  : t("lessons.locked")}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {course.category} · {course.instructor}
            </p>
            <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
              <h1 className="min-w-0 flex-1 text-2xl font-bold tracking-tight break-words [overflow-wrap:anywhere]">
                {active && hasAccess ? active.title : course.title}
              </h1>
              {isEnrolled && active && (
                <Button
                  size="sm"
                  variant={done.has(active.id) ? "secondary" : "default"}
                  disabled={done.has(active.id) || !canComplete}
                  title={
                    canComplete
                      ? undefined
                      : t("lessons.watchNeed", { percent: REQUIRED_SHARE * 100 })
                  }
                  onClick={() =>
                    complete(active.id, active.videoUrl && watch ? watch : undefined, DEV_COMPLETE)
                  }
                  className="shrink-0 rounded-full"
                >
                  <CheckCircle2 className="size-4" />
                  {done.has(active.id) ? t("lessons.completed") : t("lessons.markComplete")}
                </Button>
              )}
            </div>
            {tracked && active && !done.has(active.id) && <WatchMeter share={share} />}
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line break-words [overflow-wrap:anywhere]">
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
                      : owned
                        ? t("courseModal.rejoinFree")
                        : t("courseModal.joinCourse")}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {hasAccess && purchase && !canEdit && (
            <p className="text-xs text-muted-foreground">
              {(() => {
                const note = refundNote(purchase, refundDays, (d) => formatDate(d, i18n.language));
                return t(note.key, note.values);
              })()}{" "}
              {purchase.refundable && (
                <button
                  onClick={() => setRefundOpen(true)}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {t("lessons.refund")}
                </button>
              )}
            </p>
          )}

          {/* re-read on joining, so a new student can rate right away */}
          <CourseRatingCard key={String(isEnrolled)} courseId={course.id} />

          {canEdit && (
            <LessonEditor courseId={id} onChanged={load} nextOrder={lessons.length + 1} />
          )}
        </div>

        <Card className="h-fit">
          <CardContent className="p-0">
            {isEnrolled && (
              <CourseProgressBar
                percent={data.progressPercent}
                label={t("lessons.progress", { done: done.size, total: lessons.length })}
                className="px-4 py-4 border-b"
              />
            )}
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
                      <span className="flex-1 min-w-0 break-words">{l.title}</span>
                      {!hasAccess && <Lock className="size-3.5 text-muted-foreground mt-0.5" />}
                      {isEnrolled &&
                        (done.has(l.id) ? (
                          <CheckCircle2
                            aria-label={t("lessons.completed")}
                            className="size-4 shrink-0 text-gold mt-0.5"
                          />
                        ) : (
                          <Circle
                            aria-hidden="true"
                            className="size-4 shrink-0 text-border mt-0.5"
                          />
                        ))}
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
    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons/${lesson.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) return toast.error(await readError(res, t("lessons.deleteFailed")));
      toast.success(t("lessons.deleted"));
      onDeleted();
    } catch {
      toast.error(t("lessons.deleteFailed"));
    }
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
      // the catalogue filters by course length; a link that cannot be measured stays unknown
      // until a student first watches it
      const durationSeconds = file
        ? await measureVideo(file)
        : url
          ? await measureVideo(url)
          : null;
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title,
          description: description || null,
          videoUrl: url,
          order: nextOrder,
          durationSeconds,
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

/** Live share of the video really watched, with the completion mark drawn on the track. */
function WatchMeter({ share }: { share: number }) {
  const { t } = useTranslation();
  const pct = Math.round(share * 100);
  const need = REQUIRED_SHARE * 100;
  const ready = share >= REQUIRED_SHARE;
  return (
    <div className="mt-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>{t("lessons.watched", { percent: pct })}</span>
        <span className={ready ? "text-gold" : undefined}>
          {ready ? t("lessons.watchReady") : t("lessons.watchNeed", { percent: need })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={t("lessons.watched", { percent: pct })}
        className="relative mt-2 h-1.5 rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-1 h-3.5 w-px bg-foreground/60"
          style={{ left: `${need}%` }}
        />
      </div>
    </div>
  );
}
