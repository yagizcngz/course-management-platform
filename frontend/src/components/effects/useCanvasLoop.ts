import { useEffect, useRef } from "react";
import { prefersLessMotion } from "@/lib/motionPref";

export interface FrameInfo {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  /** Seconds since mount; frozen when the user prefers reduced motion. */
  time: number;
  /** Accent colour as "r,g,b", read from the --effect-rgb CSS variable. */
  rgb: string;
  /** Foreground colour as "r,g,b", read from --effect-ink-rgb. */
  ink: string;
}

// Shared canvas plumbing for the decorative effects: DPR sizing, pausing while
// off-screen, reduced motion and theme colours taken from CSS variables.
export function useCanvasLoop(draw: (f: FrameInfo) => void) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = prefersLessMotion();
    let dpr = 1;
    let visible = true;
    let raf = 0;
    let frame = 0;
    let rgb = "184,145,58";
    let ink = "43,48,59";
    const start = performance.now();

    const readColors = () => {
      const s = getComputedStyle(canvas);
      rgb = s.getPropertyValue("--effect-rgb").trim() || rgb;
      ink = s.getPropertyValue("--effect-ink-rgb").trim() || ink;
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, canvas.clientWidth * dpr);
      canvas.height = Math.max(1, canvas.clientHeight * dpr);
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // Theme can change at runtime (dark mode toggle), so re-read colours now and then.
      if (frame++ % 30 === 0) readColors();
      if (!visible && frame > 2) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawRef.current({
        ctx,
        width: canvas.width,
        height: canvas.height,
        dpr,
        time: reduced ? 4 : (now - start) / 1000,
        rgb,
        ink,
      });
    };

    resize();
    readColors();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return ref;
}

export function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: string,
  alpha: number,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Deterministic 0..1 generator so a category always gets the same shape. */
export function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
