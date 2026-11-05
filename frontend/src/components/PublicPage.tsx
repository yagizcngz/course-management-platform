import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CourseDetailModal } from "./CourseDetailModal";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import { Reveal, SplitHeadline } from "./motion";
import type { CourseData, TeacherLiteDto } from "./courseHelpers";
import type { LandingCourse } from "./landing/shared";

/** Header, main and footer of every public page; signed-in visitors get a dashboard link. */
export function PublicPage({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  // read after mount: the server cannot see the token, and the first render must match it
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(!!localStorage.getItem("jwt_token")), []);

  return (
    <div className="flex min-h-screen flex-col bg-background font-display text-foreground">
      <PublicHeader>
        {authed ? (
          <Link
            to="/dashboard"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.97]"
          >
            {t("publicNav.dashboard")}
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              {t("login.loginButton")}
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.97]"
            >
              {t("login.register")}
            </Link>
          </>
        )}
      </PublicHeader>
      <main className="flex-1 pt-16">{children}</main>
      <PublicFooter />
    </div>
  );
}

/** Title block of a public page: eyebrow, headline, lead and optional controls under it. */
export function PageIntro({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 lg:pt-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
        <h1 className="mt-5 max-w-4xl font-serif text-[clamp(2.75rem,6vw,5rem)] leading-[0.95] tracking-tight">
          <SplitHeadline text={title} />
        </h1>
        <Reveal delay={0.3}>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {lead}
          </p>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

/** Course details for visitors; joining sends guests to sign in and members to the course page. */
export function GuestCourseModal({
  course,
  teachers,
  onClose,
}: {
  course: LandingCourse | null;
  teachers: TeacherLiteDto[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  if (!course) return null;
  return (
    <CourseDetailModal
      course={course as unknown as CourseData}
      onClose={onClose}
      canManage={false}
      enrollments={[]}
      teachers={teachers}
      categories={[]}
      onSaved={onClose}
      isStudent={false}
      isEnrolled={false}
      onJoin={() =>
        localStorage.getItem("jwt_token")
          ? navigate({ to: "/kurs/$id", params: { id: String(course.id) } })
          : navigate({ to: "/login" })
      }
    />
  );
}
