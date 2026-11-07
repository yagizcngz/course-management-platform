import { startTransition, useOptimistic } from "react";

/**
 * URL search state that answers a pick at once. The router commits a new URL a few frames after
 * `navigate`, so a radio or select bound straight to the URL snaps back to the old value until
 * then (the filter flicker); the optimistic copy shows the pick while the navigation is pending.
 */
export function useOptimisticSearch<S extends object>(
  search: S,
  commit: (patch: Partial<S>) => Promise<unknown>,
) {
  const [shown, apply] = useOptimistic(search, (s: S, patch: Partial<S>) => ({ ...s, ...patch }));
  const set = (patch: Partial<S>) =>
    startTransition(async () => {
      apply(patch);
      await commit(patch);
    });
  return [shown, set] as const;
}
