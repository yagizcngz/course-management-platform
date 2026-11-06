import type { ComponentType } from "react";
import type { TFunction } from "i18next";
import { Briefcase, Code2, FlaskConical, MessagesSquare, Palette, Sigma } from "lucide-react";

/** Forum channels; the slugs match the API's ForumTopics, names live under community.topics. */
export const TOPICS: { slug: string; icon: ComponentType<{ className?: string }> }[] = [
  { slug: "software", icon: Code2 },
  { slug: "math", icon: Sigma },
  { slug: "science", icon: FlaskConical },
  { slug: "design", icon: Palette },
  { slug: "career", icon: Briefcase },
  { slug: "general", icon: MessagesSquare },
];

export const fullName = (u: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) => [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || "";

export const roleLabel = (role: string | null | undefined, t: TFunction) => {
  const r = (role ?? "").toLowerCase();
  if (r === "teacher") return t("profile.roles.teacher");
  if (r === "admin" || r === "superadmin") return t("profile.roles.admin");
  return t("profile.roles.student");
};
