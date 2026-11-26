import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/PublicPage";
import { HelpContent } from "@/components/HelpContent";

// help for people who can't sign in; signed-in users use /yardim inside the app
export const Route = createFileRoute("/destek")({
  component: () => (
    <PublicPage>
      <HelpContent guest />
    </PublicPage>
  ),
});
