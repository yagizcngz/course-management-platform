/**
 * The "reduce motion" setting (Settings → Preferences). Saved per browser; the root's
 * pre-hydration script sets `data-reduce-motion` on <html> from it, which stops CSS animations
 * (styles.css), motion components (MotionConfig in __root) and the canvas/three.js scenes.
 * The operating system's prefers-reduced-motion still applies on its own.
 */
const KEY = "reduceMotion";
export const REDUCE_MOTION_CHANGED = "reduce-motion-changed";

export function getReduceMotion(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setReduceMotion(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the setting still applies until the page reloads
  }
  document.documentElement.toggleAttribute("data-reduce-motion", on);
  window.dispatchEvent(new Event(REDUCE_MOTION_CHANGED));
}

/** True when either the OS or the in-app setting asks for less motion. */
export const prefersLessMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.hasAttribute("data-reduce-motion");
