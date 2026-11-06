// Genuine-viewing tracker for lesson videos: counts the distinct seconds actually played, so
// dragging the scrubber to the end earns nothing. The API applies the same 85% rule.

/** Share of the video that must really be watched before a lesson can be completed. */
export const REQUIRED_SHARE = 0.85;
/** Faster playback is clamped to this rate and does not count while above it. */
export const MAX_RATE = 2;
/** How far past the furthest watched point a seek may land before it is pulled back. */
const SEEK_SLACK = 2;
/** Longest gap between two reports (at 1x) still read as continuous playback, not a seek. */
const MAX_STEP = 1.5;

export interface WatchState {
  /** Distinct whole seconds that were played, ascending. */
  watched: number[];
  /** Furthest point reached by continuous playback. */
  max: number;
}

export const emptyWatch = (): WatchState => ({ watched: [], max: 0 });

/** Records playback from `from` to `to`; returns the same object when nothing counted. */
export function advance(s: WatchState, from: number, to: number, rate: number): WatchState {
  const step = to - from;
  if (rate > MAX_RATE || step <= 0 || step > MAX_STEP * Math.max(1, rate)) return s;
  const seen = new Set(s.watched);
  const before = seen.size;
  for (let sec = Math.floor(from); sec <= Math.floor(to); sec++) seen.add(sec);
  const max = Math.max(s.max, to);
  if (seen.size === before && max === s.max) return s;
  return { watched: [...seen].sort((a, b) => a - b), max };
}

/** Whole seconds the API is told about: watched count against the rounded-up length. */
export const watchedSeconds = (s: WatchState, duration: number) =>
  Math.min(s.watched.length, Math.ceil(duration));

export const watchedShare = (s: WatchState, duration: number) =>
  duration > 0 ? watchedSeconds(s, duration) / Math.ceil(duration) : 0;

/** A forward seek is allowed only up to just past the furthest watched point. */
export const seekAllowed = (s: WatchState, target: number) => target <= s.max + SEEK_SLACK;

export function loadWatch(key: string): WatchState {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "null");
    if (raw && Array.isArray(raw.watched) && typeof raw.max === "number") return raw;
  } catch {
    // corrupt entry: start over
  }
  return emptyWatch();
}

export const saveWatch = (key: string, s: WatchState) => {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {
    // storage full or blocked: progress just is not kept across reloads
  }
};
