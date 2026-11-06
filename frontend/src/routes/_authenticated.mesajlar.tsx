import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, MessageSquare, Search, Send, UserMinus, UserPlus, Users, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { API_BASE } from "@/components/courseHelpers";
import {
  ProfileModal,
  UserAvatar,
  type ProfileTarget,
  type UserCard,
} from "@/components/ProfileModal";
import { authHeaders, readError } from "@/lib/auth";
import { TOPICS, fullName, roleLabel } from "@/lib/community";
import { cn, formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mesajlar")({
  validateSearch: (s: Record<string, unknown>): { u?: number } => ({
    u: Number(s.u) > 0 ? Number(s.u) : undefined,
  }),
  head: () => ({ meta: [{ title: "Mesajlar — E-Kurs" }] }),
  component: MessagesPage,
});

interface Conversation {
  user: UserCard;
  isFriend: boolean;
  lastMessage: string | null;
  lastAt: string | null;
  lastFromMe: boolean;
  unread: number;
}
interface Message {
  id: number;
  body: string;
  createdAt: string;
  readAt: string | null;
  fromMe: boolean;
}
interface FriendRow {
  id: number;
  status: string;
  createdAt: string;
  outgoing: boolean;
  user: UserCard;
}
interface Friends {
  friends: FriendRow[];
  incoming: FriendRow[];
  outgoing: FriendRow[];
}

const POLL_MS = 10_000;

async function api<T>(path: string, fallback: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/${path}`, { headers: authHeaders(), ...init });
  if (!res.ok) throw new Error(await readError(res, fallback));
  return res.status === 204 ? (undefined as T) : res.json();
}

function MessagesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/mesajlar" });
  const { u: partnerId } = Route.useSearch();
  const [tab, setTab] = useState<"chats" | "friends">("chats");
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [friends, setFriends] = useState<Friends | null>(null);
  const [profile, setProfile] = useState<ProfileTarget | null>(null);

  const loadConversations = useCallback(
    () =>
      api<Conversation[]>("messages/conversations", t("community.loadFailed"))
        .then(setConversations)
        .catch((e) => toast.error((e as Error).message)),
    [t],
  );
  const loadFriends = useCallback(
    () =>
      api<Friends>("friends", t("community.loadFailed"))
        .then(setFriends)
        .catch((e) => toast.error((e as Error).message)),
    [t],
  );

  useEffect(() => {
    loadConversations();
    loadFriends();
    const id = window.setInterval(loadConversations, POLL_MS * 2);
    const onChange = () => {
      loadFriends();
      loadConversations();
    };
    window.addEventListener("friends-changed", onChange);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("friends-changed", onChange);
    };
  }, [loadConversations, loadFriends]);

  const open = (id: number) => navigate({ search: { u: id } });
  const partner =
    conversations?.find((c) => c.user.id === partnerId)?.user ??
    friends?.friends.find((f) => f.user.id === partnerId)?.user ??
    null;
  const isFriend = !!friends?.friends.some((f) => f.user.id === partnerId);

  const act = async (path: string, method: "POST" | "DELETE") => {
    try {
      await api(`friends/${path}`, t("community.friendFailed"), { method });
      // the page and the sidebar badge both reload on this event
      window.dispatchEvent(new Event("friends-changed"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader crumb={t("community.messagesTitle")} />
      <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <div className="grid min-h-[70vh] overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className={cn(
              "flex min-w-0 flex-col border-border md:border-r",
              partnerId && "hidden md:flex",
            )}
          >
            <div role="tablist" className="grid grid-cols-2 gap-1 border-b border-border p-2">
              {(["chats", "friends"] as const).map((k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    tab === k
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k === "chats" ? (
                    <MessageSquare className="size-4" />
                  ) : (
                    <Users className="size-4" />
                  )}
                  {t(k === "chats" ? "community.chats" : "community.friends")}
                  {k === "friends" && !!friends?.incoming.length && (
                    <span className="rounded-full bg-gold px-1.5 font-mono text-[10px] text-night">
                      {friends.incoming.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === "chats" ? (
                <ConversationList items={conversations} active={partnerId} onOpen={open} />
              ) : (
                <FriendsPanel
                  friends={friends}
                  onOpen={open}
                  onAct={act}
                  onProfile={(id) => setProfile({ kind: "user", id })}
                />
              )}
            </div>

            <div className="border-t border-border p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {t("community.channels")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map(({ slug, icon: Icon }) => (
                  <Link
                    key={slug}
                    to="/topluluk"
                    search={{ konu: slug }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-gold/60 hover:text-foreground"
                  >
                    <Icon className="size-3" /> {t(`community.topics.${slug}.name`)}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <section className={cn("min-w-0 flex-col", partnerId ? "flex" : "hidden md:flex")}>
            {partnerId && partner ? (
              <Chat
                key={partnerId}
                partner={partner}
                canSend={isFriend}
                onBack={() => navigate({ search: {} })}
                onProfile={() => setProfile({ kind: "user", id: partner.id })}
                onActivity={loadConversations}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
                <MessageSquare className="size-10 text-gold/60" aria-hidden="true" />
                <p className="font-serif text-2xl">{t("community.pickConversation")}</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {t("community.pickConversationHint")}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
      <ProfileModal target={profile} onClose={() => setProfile(null)} />
    </>
  );
}

function ConversationList({
  items,
  active,
  onOpen,
}: {
  items: Conversation[] | null;
  active?: number;
  onOpen: (id: number) => void;
}) {
  const { t, i18n } = useTranslation();
  if (!items) return <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!items.length)
    return <p className="p-4 text-sm text-muted-foreground">{t("community.noConversations")}</p>;
  return (
    <ul>
      {items.map((c) => {
        const name = fullName(c.user);
        return (
          <li key={c.user.id}>
            <button
              onClick={() => onOpen(c.user.id)}
              className={cn(
                "flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors",
                c.user.id === active
                  ? "bg-secondary shadow-[inset_3px_0_0_var(--gold)]"
                  : "hover:bg-secondary/50",
              )}
            >
              <UserAvatar name={name} src={c.user.profilePictureUrl} className="size-10 text-sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}
                  >
                    {name}
                  </span>
                  {c.lastAt && (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                      {formatDateTime(c.lastAt, i18n.language)}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-xs",
                      c.unread ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {c.lastMessage
                      ? `${c.lastFromMe ? `${t("community.you")}: ` : ""}${c.lastMessage}`
                      : t("community.sayHello")}
                  </span>
                  {c.unread > 0 && (
                    <span className="shrink-0 rounded-full bg-gold px-1.5 font-mono text-[10px] text-night tabular-nums">
                      {c.unread}
                      <span className="sr-only"> {t("community.unread")}</span>
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function FriendsPanel({
  friends,
  onOpen,
  onAct,
  onProfile,
}: {
  friends: Friends | null;
  onOpen: (id: number) => void;
  onAct: (path: string, method: "POST" | "DELETE") => void;
  onProfile: (userId: number) => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserCard[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    let stale = false; // an older, slower response must not overwrite a newer query's results
    const id = window.setTimeout(() => {
      api<UserCard[]>(`friends/search?q=${encodeURIComponent(q.trim())}`, t("community.loadFailed"))
        .then((r) => !stale && setResults(r))
        .catch(() => !stale && setResults([]));
    }, 250);
    return () => {
      stale = true;
      window.clearTimeout(id);
    };
  }, [q, t]);

  const clearSearch = () => {
    setQ("");
    setResults([]);
    searchRef.current?.focus();
  };

  if (!friends) return <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>;
  const known = new Set(
    [...friends.friends, ...friends.incoming, ...friends.outgoing].map((f) => f.user.id),
  );

  const row = (u: UserCard, actions: React.ReactNode) => (
    <li key={u.id} className="flex min-w-0 items-center gap-3 px-4 py-2.5">
      <button
        onClick={() => onProfile(u.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        title={t("community.viewProfile")}
      >
        <UserAvatar name={fullName(u)} src={u.profilePictureUrl} className="size-9 text-xs" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium hover:text-gold">{fullName(u)}</span>
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {roleLabel(u.role, t)}
          </span>
        </span>
      </button>
      <span className="flex shrink-0 gap-1">{actions}</span>
    </li>
  );
  const iconBtn =
    "rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:border-gold/60 hover:text-foreground";

  return (
    <div className="space-y-4 py-3">
      <div className="px-4">
        <label className="relative block">
          <span className="sr-only">{t("community.findPeople")}</span>
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && q && (e.preventDefault(), clearSearch())}
            placeholder={t("community.findPeople")}
            className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-9 text-sm outline-none focus:border-gold focus:ring-4 focus:ring-gold/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label={t("community.clearSearch")}
              title={t("community.clearSearch")}
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              <X className="size-3.5" />
            </button>
          )}
        </label>
        {results.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-xl border border-border">
            {results.map((u) =>
              row(
                u,
                known.has(u.id) ? null : (
                  <button
                    aria-label={t("community.addFriend")}
                    title={t("community.addFriend")}
                    className={iconBtn}
                    onClick={() => onAct(`requests/${u.id}`, "POST")}
                  >
                    <UserPlus className="size-3.5" />
                  </button>
                ),
              ),
            )}
          </ul>
        )}
      </div>

      {friends.incoming.length > 0 && (
        <Group title={t("community.incoming", { count: friends.incoming.length })}>
          {friends.incoming.map((f) =>
            row(
              f.user,
              <>
                <button
                  aria-label={t("community.acceptRequest")}
                  title={t("community.acceptRequest")}
                  className={iconBtn}
                  onClick={() => onAct(`${f.id}/accept`, "POST")}
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  aria-label={t("community.decline")}
                  title={t("community.decline")}
                  className={iconBtn}
                  onClick={() => onAct(`${f.id}`, "DELETE")}
                >
                  <X className="size-3.5" />
                </button>
              </>,
            ),
          )}
        </Group>
      )}

      <Group title={t("community.friendsCount", { count: friends.friends.length })}>
        {friends.friends.length === 0 && (
          <li className="px-4 text-sm text-muted-foreground">{t("community.noFriends")}</li>
        )}
        {friends.friends.map((f) =>
          row(
            f.user,
            <>
              <button
                aria-label={t("community.message")}
                title={t("community.message")}
                className={iconBtn}
                onClick={() => onOpen(f.user.id)}
              >
                <MessageSquare className="size-3.5" />
              </button>
              <button
                aria-label={t("community.removeFriend")}
                title={t("community.removeFriend")}
                className={iconBtn}
                onClick={() =>
                  window.confirm(t("community.removeConfirm", { name: fullName(f.user) })) &&
                  onAct(`${f.id}`, "DELETE")
                }
              >
                <UserMinus className="size-3.5" />
              </button>
            </>,
          ),
        )}
      </Group>

      {friends.outgoing.length > 0 && (
        <Group title={t("community.outgoing", { count: friends.outgoing.length })}>
          {friends.outgoing.map((f) =>
            row(
              f.user,
              <button
                aria-label={t("community.cancelRequest")}
                title={t("community.cancelRequest")}
                className={iconBtn}
                onClick={() => onAct(`${f.id}`, "DELETE")}
              >
                <X className="size-3.5" />
              </button>,
            ),
          )}
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="px-4 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>
      <ul>{children}</ul>
    </section>
  );
}

function Chat({
  partner,
  canSend,
  onBack,
  onProfile,
  onActivity,
}: {
  partner: UserCard;
  canSend: boolean;
  onBack: () => void;
  onProfile: () => void;
  onActivity: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const name = fullName(partner);

  const load = useCallback(async () => {
    try {
      const rows = await api<Message[]>(`messages/${partner.id}`, t("community.loadFailed"));
      setMessages((prev) =>
        prev && prev.length === rows.length && prev.at(-1)?.id === rows.at(-1)?.id ? prev : rows,
      );
      window.dispatchEvent(new Event("messages-read"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [partner.id, t]);

  useEffect(() => {
    load().then(onActivity);
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
    // onActivity only refreshes the unread counts after the first read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      const msg = await api<Message>(`messages/${partner.id}`, t("community.sendFailed"), {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setMessages((m) => [...(m ?? []), msg]);
      setDraft("");
      onActivity();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="flex min-w-0 items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary md:hidden"
          aria-label={t("common.back")}
        >
          <X className="size-4" />
        </button>
        <button
          onClick={onProfile}
          className="flex min-w-0 items-center gap-3 text-left"
          title={t("community.viewProfile")}
        >
          <UserAvatar name={name} src={partner.profilePictureUrl} className="size-10 text-sm" />
          <span className="min-w-0">
            <span className="block truncate font-serif text-xl leading-tight hover:text-gold">
              {name}
            </span>
            <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {roleLabel(partner.role, t)} ·{" "}
              <span className="normal-case">@{partner.username}</span>
            </span>
          </span>
        </button>
      </header>

      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-background/40 px-4 py-5"
        aria-live="polite"
      >
        {!messages && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
        {messages?.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("community.sayHelloTo", { name })}
          </p>
        )}
        {messages?.map((m) => (
          <div key={m.id} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-soft",
                m.fromMe
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md border border-border bg-card",
              )}
            >
              <p className="whitespace-pre-line break-words [overflow-wrap:anywhere]">{m.body}</p>
              <p
                className={cn(
                  "mt-1 text-right font-mono text-[10px] tabular-nums",
                  m.fromMe ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {formatDateTime(m.createdAt, i18n.language)}
                {m.fromMe && m.readAt && ` · ${t("community.seen")}`}
              </p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>

      {canSend ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 border-t border-border p-3"
        >
          <label htmlFor="dm-draft" className="sr-only">
            {t("community.writeMessage")}
          </label>
          <textarea
            id="dm-draft"
            rows={1}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("community.writeMessage")}
            className="max-h-40 min-h-10 flex-1 resize-y rounded-2xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-4 focus:ring-gold/15"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={t("community.send")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </form>
      ) : (
        <p className="border-t border-border p-4 text-center text-sm text-muted-foreground">
          {t("community.friendsOnly")}
        </p>
      )}
    </>
  );
}
