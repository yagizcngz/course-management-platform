import { pillButton } from "@/lib/utils";
import { readError } from "@/lib/auth";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/PageHeader";

import { API_BASE } from "@/components/courseHelpers";
export const Route = createFileRoute("/_authenticated/yardim")({
  component: HelpPage,
});

function HelpPage() {
  const { t } = useTranslation();

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: "", // Arka uç otomatik dolduracak
      email: "", // Arka uç otomatik dolduracak
      phone: "", // Telefon numarası kaldırıldı
      message: formData.get("message")?.toString(),
    };

    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE}/api/supportrequests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(t("help.successMessage", "Mesajınız başarıyla gönderildi."));
        form.reset();
      } else {
        toast.error(await readError(res, t("help.sendFailed")));
      }
    } catch {
      toast.error(t("courses.errors.serverError"));
    }
  };

  const faq = [1, 2, 3, 4, 5].map((n) => ({
    q: t(`help.questions.q${n}`),
    a: t(`help.questions.a${n}`),
  }));

  return (
    <div className="flex min-w-0 w-full flex-col">
      <PageHeader crumb={t("help.title")} />

      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
              {t("help.eyebrow")}
            </p>
            <h1 className="mt-4 font-serif text-[clamp(2.75rem,6vw,4.75rem)] leading-[0.95] tracking-tight">
              {t("help.heroTitle")} <em className="text-gold">{t("help.heroAccent")}</em>
            </h1>
          </div>
          <div className="flex flex-col justify-end gap-6">
            <p className="text-lg leading-relaxed text-muted-foreground">
              {t("help.heroSubtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  document
                    .getElementById("contact-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className={pillButton.primary}
              >
                {t("help.freeEstimate")}
              </button>
              <Link to="/yardim-taleplerim" className={pillButton.outline}>
                {t("help.myRequests")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_1.6fr] lg:py-24">
        <div>
          <h2 className="font-serif text-4xl leading-none sm:text-5xl lg:sticky lg:top-28">
            {t("help.faqTitle")}
          </h2>
          <p className="mt-4 max-w-sm text-muted-foreground">{t("help.faqDesc")}</p>
        </div>
        <Accordion type="single" collapsible className="border-t border-border">
          {faq.map((item, i) => (
            <AccordionItem key={i} value={`q${i + 1}`} className="border-b border-border">
              <AccordionTrigger className="gap-4 py-6 text-left hover:no-underline [&[data-state=open]>span:last-of-type]:text-gold">
                <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 font-serif text-xl leading-snug sm:text-2xl">{item.q}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pl-12 text-base leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section id="contact-section" className="scroll-mt-20 border-t border-border bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
              {t("help.contactEyebrow")}
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-none sm:text-5xl">
              {t("help.contactUs")}
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">{t("help.contactDesc")}</p>
            <dl className="mt-10 divide-y divide-border border-y border-border">
              {[
                {
                  k: t("help.emailLabel"),
                  v: "support@ekurs.com",
                  href: "mailto:support@ekurs.com",
                },
                { k: t("help.hq"), v: t("help.hqAddr") },
                { k: t("help.branch"), v: t("help.branchAddr") },
                { k: t("help.responseLabel"), v: t("help.responseTime") },
              ].map((row) => (
                <div key={row.k} className="grid grid-cols-[8rem_1fr] gap-4 py-4">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {row.k}
                  </dt>
                  <dd className="text-sm">
                    {row.href ? (
                      <a
                        href={row.href}
                        className="underline decoration-gold decoration-1 underline-offset-4 hover:text-gold"
                      >
                        {row.v}
                      </a>
                    ) : (
                      row.v
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <form
            onSubmit={handleContactSubmit}
            className="flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-card p-6 sm:p-8"
          >
            <label htmlFor="help-message" className="font-serif text-2xl">
              {t("help.formMessageLabel")}
            </label>
            <textarea
              id="help-message"
              name="message"
              required
              rows={6}
              placeholder={t("help.formMessage")}
              className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-gold focus:ring-4 focus:ring-gold/15"
            />
            <label className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground">
              <input type="checkbox" required className="size-4 accent-[var(--gold)]" />
              {t("help.formTerms")}
            </label>
            <button type="submit" className={`${pillButton.primary} self-start`}>
              {t("help.sendMessage")}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
