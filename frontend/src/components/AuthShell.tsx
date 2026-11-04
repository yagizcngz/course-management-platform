import type { CSSProperties, ReactNode } from "react";
import { Logo, PublicControls } from "./PublicHeader";
import { SplitHeadline } from "./motion";

// The panel is always night slate, so its effect uses champagne in both themes.
const panelVars = {
  "--effect-rgb": "236, 217, 166",
  "--effect-ink-rgb": "243, 239, 230",
} as CSSProperties;

/** Split layout for sign-in and sign-up: form on the left, a themed night panel on the right. */
export function AuthShell({
  children,
  panel,
  caption,
}: {
  children: ReactNode;
  panel: ReactNode;
  caption: string;
}) {
  return (
    <div className="grid min-h-screen bg-background font-display text-foreground lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <PublicControls />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div
        className="relative m-3 hidden overflow-hidden rounded-3xl bg-[hsl(222_14%_16%)] text-[hsl(40_30%_93%)] lg:block"
        style={panelVars}
      >
        {panel}
        <div className="absolute inset-x-10 bottom-10">
          <p className="max-w-md font-serif text-4xl leading-[1.1]">
            <SplitHeadline text={caption} />
          </p>
        </div>
      </div>
    </div>
  );
}

/** Shared field and button styles for the auth forms. */
export const authInputClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-soft outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus:border-gold focus:ring-4 focus:ring-gold/15";

export const authLabelClass = "mb-1.5 block text-sm font-medium text-foreground";

export const authButtonClass =
  "w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft transition-[box-shadow,transform,opacity] hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--gold)_25%,transparent)] active:scale-[0.98] disabled:opacity-60";
