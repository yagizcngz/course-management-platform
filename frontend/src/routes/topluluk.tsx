import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Heart, Lock, MessageSquare, Plus, Trash2 } from "lucide-react";
import { TOPICS, fullName, roleLabel } from "@/lib/community";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageIntro, PublicPage } from "@/components/PublicPage";
import { API_BASE } from "@/components/courseHelpers";
import {
  ProfileModal,
  UserAvatar,
  type ProfileTarget,
  type UserCard,
} from "@/components/ProfileModal";
import {
  authHeaders,
  getRoleFromToken,
  getToken,
  isAdminRole,
  parseJwt,
  readError,
} from "@/lib/auth";
import { cn, formatDateTime, pillButton } from "@/lib/utils";

interface CommunitySearch {
  konu?: string;
  baslik?: number;
}

export const Route = createFileRoute("/topluluk")({
  validateSearch: (s: Record<string, unknown>): CommunitySearch => ({
    konu: TOPICS.some((x) => x.slug === s.konu) ? (s.konu as string) : undefined,
    baslik: Number(s.baslik) > 0 ? Number(s.baslik) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Topluluk — E-Kurs" },
      {
        name: "description",
        content: "E-Kurs topluluğu: konu kanallarında sorular, kaynaklar ve çalışma grupları.",
      },
    ],
  }),
  component: CommunityPage,
});

interface TopicStat {
  slug: string;
  threads: number;
  posts: number;
  lastActivityAt: string | null;
}
interface ThreadRow {
  id: number;
  title: string;
  createdAt: string;
  lastActivityAt: string;
  replies: number;
  excerpt: string | null;
  author: UserCard | null;
}
interface Post {
  id: number;
  body: string;
  createdAt: string;
  likes: number;
  likedByMe: boolean;
  author: UserCard | null;
}
interface ThreadDetail {
  id: number;
  topic: string;
  title: string;
  createdAt: string;
  posts: Post[];
}

/** Who is reading: read after mount, since the server cannot see the token. */
function useViewer() {
  const [viewer, setViewer] = useState<{ username: string; admin: boolean } | null>(null);
  useEffect(() => {
    const token = getToken();
    if (token)
      setViewer({
        username: parseJwt(token)?.sub ?? "",
        admin: isAdminRole(getRoleFromToken(token)),
      });
  }, []);
  return viewer;
}

function CommunityPage() {
  const { t } = useTranslation();
  const { konu, baslik } = Route.useSearch();
  const topic = konu ?? "software";
  const [stats, setStats] = useState<TopicStat[]>([]);
  const [profile, setProfile] = useState<ProfileTarget | null>(null);
  const viewer = useViewer();
  const openProfile = useCallback(
    (u: UserCard | null) => u && setProfile({ kind: "user", id: u.id }),
    [],
  );

  const loadStats = useCallback(() => {
    fetch(`${API_BASE}/api/forum/topics`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setStats)
      .catch(() => {});
  }, []);
  useEffect(loadStats, [loadStats]);

  return (
    <PublicPage>
      <PageIntro
        eyebrow={t("community.eyebrow")}
        title={t("community.title")}
        lead={t("community.lead")}
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {t("community.channels")}
          </p>
          <nav
            aria-label={t("community.channels")}
            className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
          >
            {TOPICS.map(({ slug, icon: Icon }) => {
              const active = slug === topic && !baslik;
              const stat = stats.find((s) => s.slug === slug);
              return (
                <Link
                  key={slug}
                  to="/topluluk"
                  search={{ konu: slug }}
                  aria-current={slug === topic ? "page" : undefined}
                  className={cn(
                    "group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    slug === topic
                      ? "bg-secondary font-medium text-foreground shadow-[inset_3px_0_0_var(--gold)]"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    active && "ring-1 ring-gold/30",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      slug === topic ? "text-gold" : "group-hover:text-gold",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {t(`community.topics.${slug}.name`)}
                  </span>
                  {stat && (
                    <span className="hidden font-mono text-[10px] tabular-nums text-muted-foreground lg:inline">
                      {stat.threads}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          {viewer && (
            <Link
              to="/mesajlar"
              className="mt-4 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:border-gold/60 lg:flex"
            >
              <MessageSquare className="size-4 text-gold" /> {t("community.toMessages")}
            </Link>
          )}
        </aside>

        <div className="min-w-0">
          {baslik ? (
            <ThreadView id={baslik} viewer={viewer} onAuthor={openProfile} onChanged={loadStats} />
          ) : (
            <TopicView topic={topic} viewer={viewer} onAuthor={openProfile} onChanged={loadStats} />
          )}
        </div>
      </div>
      <ProfileModal target={profile} onClose={() => setProfile(null)} />
    </PublicPage>
  );
}

type Viewer = ReturnType<typeof useViewer>;

/** Clickable author line: avatar, name and role; a removed account shows as such. */
function AuthorButton({
  author,
  onAuthor,
  size = "sm",
}: {
  author: UserCard | null;
  onAuthor: (u: UserCard | null) => void;
  size?: "sm" | "md";
}) {
  const { t } = useTranslation();
  if (!author)
    return (
      <span className="text-sm italic text-muted-foreground">{t("community.deletedAccount")}</span>
    );
  const name = fullName(author);
  return (
    <button
      type="button"
      onClick={() => onAuthor(author)}
      className="group flex min-w-0 items-center gap-2.5 text-left"
      title={t("community.viewProfile")}
    >
      <UserAvatar
        name={name}
        src={author.profilePictureUrl}
        className={size === "md" ? "size-9 text-sm" : "size-6 text-[10px]"}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium group-hover:text-gold group-hover:underline group-hover:underline-offset-4">
          {name}
        </span>
        {size === "md" && (
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {roleLabel(author.role, t)}
          </span>
        )}
      </span>
    </button>
  );
}

/** Shown to guests where members get a composer. */
function SignInPrompt() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-gold/50 bg-gold/5 p-6 sm:flex-row sm:items-center">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold">
        <Lock className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-xl leading-tight">{t("community.lockedTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("community.lockedBody")}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link to="/login" className={pillButton.outline}>
          {t("login.loginButton")}
        </Link>
        <Link to="/register" className={pillButton.primary}>
          {t("login.register")}
        </Link>
      </div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-gold focus:ring-4 focus:ring-gold/15";

function TopicView({
  topic,
  viewer,
  onAuthor,
  onChanged,
}: {
  topic: string;
  viewer: Viewer;
  onAuthor: (u: UserCard | null) => void;
  onChanged: () => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    setThreads(null);
    setError(null);
    fetch(`${API_BASE}/api/forum/topics/${topic}/threads`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await readError(r, t("community.loadFailed")));
        return r.json();
      })
      .then((rows) => !off && setThreads(rows))
      .catch((e) => !off && setError((e as Error).message));
    return () => {
      off = true;
    };
  }, [topic, t]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/forum/topics/${topic}/threads`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) throw new Error(await readError(res, t("community.postFailed")));
      const { id } = await res.json();
      onChanged();
      navigate({ to: "/topluluk", search: { konu: topic, baslik: id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="topic-title" className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <h2 id="topic-title" className="font-serif text-4xl leading-none">
            {t(`community.topics.${topic}.name`)}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t(`community.topics.${topic}.description`)}
          </p>
        </div>
        {viewer && !composing && (
          <button onClick={() => setComposing(true)} className={pillButton.primary}>
            <Plus className="size-4" /> {t("community.newThread")}
          </button>
        )}
      </header>

      {!viewer && <SignInPrompt />}
      {viewer && composing && (
        <form onSubmit={create} className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <label className="sr-only" htmlFor="thread-title">
            {t("community.threadTitle")}
          </label>
          <input
            id="thread-title"
            required
            minLength={4}
            maxLength={160}
            placeholder={t("community.threadTitle")}
            className={fieldClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="sr-only" htmlFor="thread-body">
            {t("community.message")}
          </label>
          <textarea
            id="thread-body"
            required
            minLength={2}
            maxLength={4000}
            rows={5}
            placeholder={t("community.firstPost")}
            className={`${fieldClass} resize-y`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={pillButton.primary}>
              {t("community.publish")}
            </button>
            <button
              type="button"
              onClick={() => setComposing(false)}
              className={pillButton.outline}
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!threads && !error && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {threads?.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("community.noThreads")}</p>
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {threads?.map((th) => (
          <li key={th.id} className="min-w-0 p-5 transition-colors hover:bg-secondary/40">
            <Link to="/topluluk" search={{ konu: topic, baslik: th.id }} className="block min-w-0">
              <h3 className="font-serif text-2xl leading-tight break-words [overflow-wrap:anywhere] hover:text-gold">
                {th.title}
              </h3>
              {th.excerpt && (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground break-words [overflow-wrap:anywhere]">
                  {th.excerpt}
                </p>
              )}
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <AuthorButton author={th.author} onAuthor={onAuthor} />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                {t("community.replies", { count: th.replies })} ·{" "}
                {formatDateTime(th.lastActivityAt, i18n.language)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ThreadView({
  id,
  viewer,
  onAuthor,
  onChanged,
}: {
  id: number;
  viewer: Viewer;
  onAuthor: (u: UserCard | null) => void;
  onChanged: () => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/forum/threads/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await readError(res, t("community.loadFailed")));
      setThread(await res.json());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, t]);
  useEffect(() => {
    load();
  }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/forum/threads/${id}/posts`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ body: reply }),
      });
      if (!res.ok) throw new Error(await readError(res, t("community.postFailed")));
      setReply("");
      await load();
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const like = async (post: Post) => {
    const res = await fetch(`${API_BASE}/api/forum/posts/${post.id}/like`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) return toast.error(await readError(res, t("community.postFailed")));
    const { liked, likes } = await res.json();
    setThread(
      (th) =>
        th && {
          ...th,
          posts: th.posts.map((p) => (p.id === post.id ? { ...p, likedByMe: liked, likes } : p)),
        },
    );
  };

  const remove = async (post: Post) => {
    const res = await fetch(`${API_BASE}/api/forum/posts/${post.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).catch(() => null);
    if (!res) return toast.error(t("community.postFailed"));
    if (!res.ok) return toast.error(await readError(res, t("community.postFailed")));
    const { threadDeleted } = await res.json();
    onChanged();
    if (threadDeleted) navigate({ to: "/topluluk", search: { konu: thread?.topic } });
    else load();
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!thread) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  return (
    <article aria-labelledby="thread-title" className="min-w-0 space-y-6">
      <Link
        to="/topluluk"
        search={{ konu: thread.topic }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t(`community.topics.${thread.topic}.name`)}
      </Link>
      <h2
        id="thread-title"
        className="font-serif text-4xl leading-tight break-words [overflow-wrap:anywhere]"
      >
        {thread.title}
      </h2>
      <ol className="space-y-4">
        {thread.posts.map((p, i) => {
          const mine = !!viewer && p.author?.username === viewer.username;
          return (
            <li
              key={p.id}
              className={cn(
                "min-w-0 rounded-2xl border bg-card p-5",
                i === 0 ? "border-gold/40" : "border-border",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <AuthorButton author={p.author} onAuthor={onAuthor} size="md" />
                <time
                  dateTime={p.createdAt}
                  className="font-mono text-[10px] text-muted-foreground tabular-nums"
                >
                  {formatDateTime(p.createdAt, i18n.language)}
                </time>
              </div>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed break-words [overflow-wrap:anywhere]">
                {p.body}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!viewer}
                  aria-pressed={p.likedByMe}
                  onClick={() => like(p)}
                  title={viewer ? undefined : t("community.lockedTitle")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs tabular-nums transition-colors disabled:cursor-not-allowed",
                    p.likedByMe
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-border text-muted-foreground enabled:hover:text-foreground",
                  )}
                >
                  <Heart
                    className={cn("size-3.5", p.likedByMe && "fill-current")}
                    aria-hidden="true"
                  />
                  {p.likes}
                  <span className="sr-only">{t("community.like")}</span>
                </button>
                {(mine || viewer?.admin) && (
                  <ConfirmDialog
                    title={t("community.deleteConfirm")}
                    confirmLabel={t("community.delete")}
                    onConfirm={() => remove(p)}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" /> {t("community.delete")}
                    </button>
                  </ConfirmDialog>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {viewer ? (
        <form onSubmit={send} className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <label
            htmlFor="reply"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            {t("community.reply")}
          </label>
          <textarea
            id="reply"
            required
            minLength={2}
            maxLength={4000}
            rows={4}
            className={`${fieldClass} resize-y`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || reply.trim().length < 2}
            className={pillButton.primary}
          >
            {t("community.send")}
          </button>
        </form>
      ) : (
        <SignInPrompt />
      )}
    </article>
  );
}
