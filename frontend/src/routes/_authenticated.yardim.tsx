import { readError } from "@/lib/auth";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MapPin, Mail } from "lucide-react";
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

  const handleEstimateClick = () => {
    document.getElementById("contact-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col min-w-0 bg-background w-full">
      <PageHeader crumb={t("help.title", "Yardım")} />

      {/* 1. HERO SECTION */}
      <section className="relative w-full bg-primary/10 dark:bg-primary/5 py-32 px-6 flex items-center overflow-hidden border-b border-border">
        <div className="container mx-auto max-w-7xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1">
            <h1 className="text-foreground text-6xl md:text-8xl font-bold tracking-tight">
              {t("help.heroTitle", "S.S.S.")}
            </h1>
          </div>
          <div className="flex-1 max-w-md flex flex-col gap-6">
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t(
                "help.heroSubtitle",
                "Sıkça Sorulan Sorular bölümünde cevabını bulamadığınız sorular için uzman destek ekibimize ulaşabilirsiniz.",
              )}
            </p>
            <div>
              <button
                onClick={handleEstimateClick}
                className="rounded-full bg-primary text-primary-foreground px-8 py-3 text-sm font-semibold tracking-wider hover:bg-primary/90 transition-colors shadow-sm"
              >
                {t("help.freeEstimate", "DESTEK İSTE")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FAQ SECTION (Facts & Questions) */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-center">
            {t("help.faqTitle", "Sıkça Sorulan Sorular")}
          </h2>
          <p className="text-muted-foreground mb-12 text-center max-w-2xl">
            {t(
              "help.faqDesc",
              "Aşağıdaki sorulardan birine tıklayarak cevabı görüntüleyebilirsiniz.",
            )}
          </p>

          <Accordion
            type="single"
            collapsible
            className="w-full bg-card rounded-2xl shadow-sm border border-border p-2 md:p-6"
          >
            <AccordionItem value="item-1" className="border-b-border px-4">
              <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary hover:no-underline py-6">
                {t("help.questions.q1", "Kursa nasıl kayıt olabilirim?")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                {t(
                  "help.questions.a1",
                  "Platforma üye olduktan sonra 'Kurslar' sayfasından dilediğiniz kursa girip 'Kayıt Ol' butonuna tıklayabilirsiniz.",
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-b-border px-4">
              <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary hover:no-underline py-6">
                {t("help.questions.q2", "Öğretmen olmak için başvuru sürecim nedir?")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                {t(
                  "help.questions.a2",
                  "Öğretmen olarak kayıt olduğunuzda, yetkinliklerinize uygun branşları seçerek admin onayına sunulursunuz.",
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-b-border px-4">
              <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary hover:no-underline py-6">
                {t("help.questions.q3", "Şifremi unuttum, ne yapmalıyım?")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                {t(
                  "help.questions.a3",
                  "Giriş ekranındaki 'Şifremi Unuttum' bağlantısına tıklayarak kayıtlı e-posta adresinize sıfırlama bağlantısı gönderebilirsiniz.",
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-b-transparent px-4">
              <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-primary hover:no-underline py-6">
                {t("help.questions.q4", "Sertifika alabiliyor muyum?")}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                {t(
                  "help.questions.a4",
                  "Evet, kursları %100 başarıyla tamamladığınızda profilinize tanımlanmış dijital sertifikanızı alabilirsiniz.",
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* 3. CONTACT SECTION */}
      <section id="contact-section" className="py-24 px-6 bg-primary">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          {/* Left Box: Offices */}
          <div className="bg-card rounded-3xl p-10 md:p-14 shadow-lg flex flex-col border border-border">
            <h3 className="text-3xl font-bold text-foreground mb-10">
              {t("help.offices", "İletişim Bilgileri")}
            </h3>

            <div className="flex flex-col gap-10 flex-1">
              {/* HQ */}
              <div>
                <h4 className="text-xl font-bold text-foreground mb-2">
                  {t("help.hq", "Merkez Ofis")}
                </h4>
                <p className="text-muted-foreground flex items-start gap-2">
                  <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
                  {t("help.hqAddr", "Teknopark İstanbul, Pendik, Türkiye")}
                </p>
              </div>

              {/* Branch */}
              <div>
                <h4 className="text-xl font-bold text-foreground mb-2">
                  {t("help.branch", "Şube")}
                </h4>
                <p className="text-muted-foreground flex items-start gap-2">
                  <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
                  {t("help.branchAddr", "Bilişim Vadisi, Gebze, Türkiye")}
                </p>
              </div>

              {/* Contact Direct */}
              <div className="flex flex-col gap-3 mt-auto pt-8 border-t border-border">
                <a
                  href="mailto:support@ekurs.com"
                  className="text-foreground flex items-center gap-3 hover:text-primary transition-colors font-medium"
                >
                  <Mail className="h-5 w-5" />
                  support@ekurs.com
                </a>
              </div>
            </div>
          </div>

          {/* Right Box: Contact Us Form */}
          <div className="bg-card rounded-3xl p-10 md:p-14 shadow-lg border border-border">
            <h3 className="text-3xl font-bold text-foreground mb-8">
              {t("help.contactUs", "Bize Ulaşın")}
            </h3>

            <form onSubmit={handleContactSubmit} className="flex flex-col gap-6">
              {/* Ad, soyad ve e-posta arka uçtan otomatik çekiliyor. */}
              {/* Telefon alanı kaldırıldı. */}

              <textarea
                name="message"
                placeholder={t("help.formMessage", "Mesajınız...")}
                className="w-full bg-transparent border-b border-border py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none h-24 mt-4"
                required
              />

              <label className="flex items-center gap-3 cursor-pointer mt-4 group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" required className="peer sr-only" />
                  <div className="h-5 w-5 rounded border-2 border-border peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                    <svg
                      className="h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {t("help.formTerms", "Hizmet Şartlarını kabul ediyorum")}
                </span>
              </label>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-xl mt-6 hover:bg-primary/90 transition-colors tracking-wide shadow-sm"
              >
                {t("help.sendMessage", "MESAJ GÖNDER")}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
