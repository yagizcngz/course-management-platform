import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Clock, Lock, MessageSquare, UserPlus, UserMinus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { API_BASE, resolveImageSrc } from "@/components/courseHelpers";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CourseProgressBar } from "@/components/CourseProgressBar";
import { FeaturedBadgeRow, useBadgeBuilder } from "@/components/Badges";
import { authHeaders, getToken, readError } from "@/lib/auth";
import { featuredBadges, type AchievementStats } from "@/lib/badges";
import { fullName, roleLabel } from "@/lib/community";
import { cn, formatDate, initialsOf, pillButton } from "@/lib/utils";

/** The small card the API returns for forum authors, friends and conversation partners. */
export interface UserCard {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePictureUrl: string | null;
}

export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return src ? (
    <img
      src={resolveImageSrc(src)}
      alt=""
      className={cn("shrink-0 rounded-full bg-secondary object-cover", className)}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-serif text-primary-foreground",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Which profile to open: a login account, or a student/teacher record (admin lists). */
export type ProfileTarget = { kind: "user" | "student" | "teacher"; id: number };

interface PublicProfile {
  userId: number | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  aboutMe: string | null;
  profilePictureUrl: string | null;
  branch: string | null;
  joinedAt: string | null;
  isPrivate: boolean;
  featuredBadges: string[] | null;
  learning: AchievementStats["learning"];
  teaching: AchievementStats["teaching"];
  taughtCourses: { id: number; title: string; category: string }[] | null;
}

type FriendStatus = {
  status: "none" | "friends" | "outgoing" | "incoming";
  friendshipId: number | null;
  self: boolean;
};

/** A member's public card: badges, courses in progress and finished, and friend/message actions. */
export function ProfileModal({
  target,
  onClose,
}: {
  target: ProfileTarget | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, error } = usePublicProfile(target);
  const [friend, setFriend] = useState<FriendStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const authed = !!getToken();
  const userId = profile?.userId;

  useEffect(() => {
    setFriend(null);
    if (!authed || !userId) return;
    let off = false;
    fetch(`${API_BASE}/api/friends/status/${userId}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => !off && setFriend(f))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [authed, userId]);

  const friendAction = async (method: "POST" | "DELETE", path: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/friends/${path}`, {
        method,
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await readError(res, t("community.friendFailed")));
      const status = await fetch(`${API_BASE}/api/friends/status/${profile!.userId}`, {
        headers: authHeaders(),
      });
      if (status.ok) setFriend(await status.json());
      window.dispatchEvent(new Event("friends-changed"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const name = profile ? fullName(profile) : "";

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        {!profile ? (
          <>
            <DialogTitle className="sr-only">{t("community.profile")}</DialogTitle>
            <DialogDescription className="py-10 text-center text-sm text-muted-foreground">
              {error ?? t("common.loading")}
            </DialogDescription>
          </>
        ) : (
          <div className="min-w-0 space-y-6">
            <header className="flex min-w-0 items-start gap-4">
              <UserAvatar
                name={name}
                src={profile.profilePictureUrl}
                className="size-16 text-xl ring-2 ring-gold/40"
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                  {roleLabel(profile.role, t)}
                  {profile.joinedAt &&
                    ` · ${t("community.joined", { date: formatDate(profile.joinedAt, i18n.language) })}`}
                </p>
                <DialogTitle className="mt-1 font-serif text-3xl leading-tight break-words [overflow-wrap:anywhere]">
                  {name}
                </DialogTitle>
                {profile.username && (
                  <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
                )}
                {profile.branch && (
                  <p className="mt-1 text-xs text-muted-foreground break-words">
                    {profile.branch
                      .split(",")
                      .map((b) =>
                        i18n.exists(`dynamic.categories.${b.trim()}`)
                          ? t(`dynamic.categories.${b.trim()}`)
                          : b.trim(),
                      )
                      .join(", ")}
                  </p>
                )}
              </div>
            </header>

            <DialogDescription asChild>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
                {profile.aboutMe || t("community.noBio")}
              </p>
            </DialogDescription>

            {friend && !friend.self && (
              <div className="flex flex-wrap gap-2">
                {friend.status === "none" && (
                  <button
                    disabled={busy}
                    onClick={() => friendAction("POST", `requests/${profile.userId}`)}
                    className={pillButton.primary}
                  >
                    <UserPlus className="size-4" /> {t("community.addFriend")}
                  </button>
                )}
                {friend.status === "outgoing" && (
                  <button
                    disabled={busy}
                    onClick={() => friendAction("DELETE", `${friend.friendshipId}`)}
                    className={pillButton.outline}
                  >
                    <Clock className="size-4" /> {t("community.requestSent")}
                  </button>
                )}
                {friend.status === "incoming" && (
                  <button
                    disabled={busy}
                    onClick={() => friendAction("POST", `${friend.friendshipId}/accept`)}
                    className={pillButton.primary}
                  >
                    <Check className="size-4" /> {t("community.acceptRequest")}
                  </button>
                )}
                {friend.status === "friends" && (
                  <>
                    <button
                      onClick={() => {
                        onClose();
                        navigate({ to: "/mesajlar", search: { u: profile.userId! } });
                      }}
                      className={pillButton.primary}
                    >
                      <MessageSquare className="size-4" /> {t("community.message")}
                    </button>
                    <ConfirmDialog
                      title={t("community.removeConfirm", { name })}
                      description={t("community.removeConfirmBody")}
                      confirmLabel={t("community.removeFriend")}
                      onConfirm={() => friendAction("DELETE", `${friend.friendshipId}`)}
                    >
                      <button disabled={busy} className={pillButton.outline}>
                        <UserMinus className="size-4" /> {t("community.removeFriend")}
                      </button>
                    </ConfirmDialog>
                  </>
                )}
              </div>
            )}
            {!authed && profile.userId && (
              <p className="text-sm text-muted-foreground">
                <Link
                  to="/login"
                  className="font-medium text-gold underline-offset-4 hover:underline"
                >
                  {t("community.signIn")}
                </Link>{" "}
                {t("community.signInToConnect")}
              </p>
            )}

            <RecordSections profile={profile} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Badges, courses in progress, finished and taught: the part admins also see in their own panels. */
function RecordSections({ profile }: { profile: PublicProfile }) {
  const { t, i18n } = useTranslation();
  const build = useBadgeBuilder();
  const badges = useMemo(
    () => (profile ? build({ learning: profile.learning, teaching: profile.teaching }) : null),
    [build, profile],
  );
  const shown = badges ? featuredBadges(badges, profile?.featuredBadges) : [];
  const earned = badges?.filter((b) => b.earned).length ?? 0;
  const courses = profile?.learning?.courses ?? [];
  const ongoing = courses.filter((c) => c.percent < 100);
  const completed = courses.filter((c) => c.percent >= 100);
  const category = (c: string) =>
    i18n.exists(`dynamic.categories.${c}`) ? t(`dynamic.categories.${c}`) : c;

  return (
    <>
      {profile.isPrivate ? (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
          <Lock aria-hidden="true" className="size-4 shrink-0" /> {t("community.privateProfile")}
        </p>
      ) : (
        <>
          {shown.length > 0 && (
            <Section title={t("community.featuredBadges")}>
              <FeaturedBadgeRow badges={shown} total={earned} />
            </Section>
          )}
          {ongoing.length > 0 && (
            <Section title={t("community.ongoing", { count: ongoing.length })}>
              <ul className="space-y-3">
                {ongoing.map((c) => (
                  <li key={c.courseId} className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <CourseProgressBar
                      percent={c.percent}
                      label={category(c.category)}
                      className="mt-1"
                    />
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {completed.length > 0 && (
            <Section title={t("community.completed", { count: completed.length })}>
              <ul className="space-y-2">
                {completed.map((c) => (
                  <li key={c.courseId} className="flex min-w-0 items-center gap-2 text-sm">
                    <Check aria-hidden="true" className="size-4 shrink-0 text-gold" />
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    {c.completedAt && (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                        {formatDate(c.completedAt, i18n.language)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {!shown.length && !courses.length && !profile.taughtCourses?.length && (
            <p className="text-sm text-muted-foreground">{t("community.nothingYet")}</p>
          )}
        </>
      )}

      {!!profile.taughtCourses?.length && (
        <Section title={t("community.teaches", { count: profile.taughtCourses.length })}>
          <ul className="flex flex-wrap gap-2">
            {profile.taughtCourses.map((c) => (
              <li
                key={c.id}
                className="max-w-full truncate rounded-full border border-border bg-card px-3 py-1 text-xs"
              >
                {c.title}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

/** Fetches a profile and shows only its record (badges and courses); for admin detail panels. */
export function ProfileRecord({ target }: { target: ProfileTarget }) {
  const { t } = useTranslation();
  const { profile, error } = usePublicProfile(target);
  if (!profile)
    return <p className="text-sm text-muted-foreground">{error ?? t("common.loading")}</p>;
  return (
    <div className="w-full min-w-0 space-y-5 text-left">
      <RecordSections profile={profile} />
    </div>
  );
}

function usePublicProfile(target: ProfileTarget | null) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const kind = target?.kind;
  const id = target?.id;
  useEffect(() => {
    if (!kind || !id) return;
    let off = false;
    setProfile(null);
    setError(null);
    fetch(`${API_BASE}/api/profile/public/${kind}/${id}`, { headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) throw new Error(await readError(r, t("community.profileLoadFailed")));
        return r.json() as Promise<PublicProfile>;
      })
      .then((p) => !off && setProfile(p))
      .catch((e) => !off && setError((e as Error).message));
    return () => {
      off = true;
    };
  }, [kind, id, t]);
  return { profile, error };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-3 border-b border-border pb-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}
