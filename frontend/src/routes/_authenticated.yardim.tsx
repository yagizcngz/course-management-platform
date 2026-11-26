import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { HelpContent } from "@/components/HelpContent";

export const Route = createFileRoute("/_authenticated/yardim")({
  component: HelpPage,
});

function HelpPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 w-full flex-col">
      <PageHeader crumb={t("help.title")} />
      <HelpContent />
    </div>
  );
}
