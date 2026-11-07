/**
 * Length of a video in whole seconds, read from its metadata in the browser, or null when it
 * cannot be read (not a direct video link, network error, or no answer within `timeoutMs`).
 * The lesson form sends it so the catalogue can filter by course length.
 */
export function measureVideo(source: File | string, timeoutMs = 8000): Promise<number | null> {
  return new Promise((resolve) => {
    const url = typeof source === "string" ? source : URL.createObjectURL(source);
    const video = document.createElement("video");
    const done = (seconds: number | null) => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      if (typeof source !== "string") URL.revokeObjectURL(url);
      resolve(seconds);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      done(
        Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : null,
      );
    video.onerror = () => done(null);
    video.src = url;
  });
}
