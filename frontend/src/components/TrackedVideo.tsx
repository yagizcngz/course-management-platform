import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  MAX_RATE,
  advance,
  emptyWatch,
  loadWatch,
  saveWatch,
  seekAllowed,
  type WatchState,
} from "@/lib/watchProgress";

export interface TrackedVideoProps {
  src: string;
  title: string;
  /** "embed" is a YouTube player, "video" a file the browser plays itself. */
  kind: "embed" | "video";
  /** localStorage key for this viewer and lesson; null turns tracking off (not enrolled). */
  storageKey: string | null;
  /** Lesson not completed yet: forward seeks past the watched part are pulled back. */
  guard: boolean;
  onProgress: (state: WatchState, duration: number) => void;
  onEnded: (state: WatchState, duration: number) => void;
}

/** Shared bookkeeping for both players: restore, count playback, block skips, warn once in a while. */
function useTracker({ storageKey, guard, onProgress, onEnded }: TrackedVideoProps) {
  const { t } = useTranslation();
  const state = useRef<WatchState | null>(null);
  state.current ??= storageKey ? loadWatch(storageKey) : emptyWatch();
  const live = useRef({ guard, onProgress, onEnded });
  useEffect(() => {
    live.current = { guard, onProgress, onEnded };
  });
  const lastNotice = useRef(0);

  const notify = (key: string) => {
    if (Date.now() - lastNotice.current < 4000) return;
    lastNotice.current = Date.now();
    toast.info(t(key, { rate: MAX_RATE }));
  };

  return {
    played(from: number, to: number, rate: number, duration: number) {
      if (!storageKey) return;
      const next = advance(state.current!, from, to, rate);
      if (next === state.current) return;
      state.current = next;
      saveWatch(storageKey, next);
      live.current.onProgress(next, duration);
    },
    /** The time a seek to `target` must be pulled back to, or null when it may stand. */
    clampSeek(target: number) {
      if (!storageKey || !live.current.guard || seekAllowed(state.current!, target)) return null;
      notify("lessons.noSkip");
      return state.current!.max;
    },
    rateTooHigh: () => notify("lessons.rateCapped"),
    ready: (duration: number) => storageKey && live.current.onProgress(state.current!, duration),
    ended: (duration: number) => live.current.onEnded(state.current!, duration),
  };
}

export function TrackedVideo(props: TrackedVideoProps) {
  return props.kind === "embed" ? <TrackedYouTube {...props} /> : <TrackedFile {...props} />;
}

/** Holds a player; a source that fails gets a message over it instead of a silent black frame. */
function Frame({ failed, children }: { failed: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="relative h-full w-full">
      {children}
      {failed && (
        <p
          role="alert"
          className="absolute inset-0 flex items-center justify-center bg-night/90 px-6 text-center text-sm text-white/80"
        >
          {t("lessons.videoFailed")}
        </p>
      )}
    </div>
  );
}

function TrackedFile(props: TrackedVideoProps) {
  const tracker = useTracker(props);
  const last = useRef(0);
  const [failed, setFailed] = useState(false);

  const video = (
    <video
      src={props.src}
      controls
      preload="metadata"
      className="h-full w-full"
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        last.current = 0;
        tracker.ready(v.duration);
      }}
      onRateChange={(e) => {
        const v = e.currentTarget;
        if (v.playbackRate > MAX_RATE) {
          v.playbackRate = MAX_RATE;
          tracker.rateTooHigh();
        }
      }}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (!v.seeking && !v.paused)
          tracker.played(last.current, v.currentTime, v.playbackRate, v.duration);
        last.current = v.currentTime;
      }}
      onSeeking={(e) => {
        const v = e.currentTarget;
        const back = tracker.clampSeek(v.currentTime);
        if (back !== null) v.currentTime = back;
        last.current = v.currentTime;
      }}
      onEnded={(e) => tracker.ended(e.currentTarget.duration)}
      onError={() => setFailed(true)}
    />
  );
  return <Frame failed={failed}>{video}</Frame>;
}

// --- YouTube: the IFrame API is loaded once, on demand -----------------------------------------

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApi: Promise<YTNamespace> | null = null;
const loadYouTube = () =>
  (ytApi ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  }));

const PLAYING = 1;
const ENDED = 0;

function TrackedYouTube(props: TrackedVideoProps) {
  const host = useRef<HTMLDivElement>(null);
  const tracker = useTracker(props);
  const trackerRef = useRef(tracker);
  trackerRef.current = tracker;
  const [failed, setFailed] = useState(false);
  const videoId = props.src.match(/embed\/([\w-]{11})/)?.[1] ?? "";

  useEffect(() => {
    let player: YTPlayer | null = null;
    let poll = 0;
    let cancelled = false;
    let last = 0;
    loadYouTube().then((YT) => {
      if (cancelled || !host.current) return;
      const mount = document.createElement("div");
      host.current.appendChild(mount);
      player = new YT.Player(mount, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            trackerRef.current.ready(player!.getDuration());
            // the API has no time event: sample twice a second
            poll = window.setInterval(() => {
              const p = player!;
              const now = p.getCurrentTime();
              const rate = p.getPlaybackRate();
              if (rate > MAX_RATE) {
                p.setPlaybackRate(MAX_RATE);
                trackerRef.current.rateTooHigh();
              }
              const back = trackerRef.current.clampSeek(now);
              if (back !== null) {
                p.seekTo(back, true);
                last = back;
                return;
              }
              if (p.getPlayerState() === PLAYING)
                trackerRef.current.played(last, now, rate, p.getDuration());
              last = now;
            }, 500);
          },
          onStateChange: (e) => {
            if (e.data === ENDED) trackerRef.current.ended(player!.getDuration());
          },
          onError: () => setFailed(true),
        },
      });
    });
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      player?.destroy();
    };
  }, [videoId]);

  const frame = (
    <div
      ref={host}
      title={props.title}
      className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
    />
  );
  return <Frame failed={failed}>{frame}</Frame>;
}
