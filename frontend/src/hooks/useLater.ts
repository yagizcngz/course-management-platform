import { useCallback, useEffect, useRef } from "react";

/** setTimeout that is dropped when the component unmounts, so a late redirect cannot yank the user back. */
export function useLater() {
  const ids = useRef(new Set<number>());
  useEffect(() => {
    const pending = ids.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      ids.current.delete(id);
      fn();
    }, ms);
    ids.current.add(id);
  }, []);
}
