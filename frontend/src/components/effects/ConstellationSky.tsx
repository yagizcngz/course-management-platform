import { useMemo, useRef } from "react";
import { glow, seeded, useCanvasLoop } from "./useCanvasLoop";

// Slots keep constellations apart and clear of the caption at the bottom.
const SLOTS: [number, number][] = [
  [0.25, 0.2],
  [0.72, 0.17],
  [0.5, 0.42],
  [0.2, 0.58],
  [0.78, 0.55],
];

const BACKGROUND = Array.from({ length: 170 }, (_, i) => {
  const r = seeded(`bg${i}`);
  return { x: r(), y: r() * 0.85, size: r() * 1.1 + 0.3, phase: r() * 6, speed: 0.5 + r() * 1.5 };
});

interface Constellation {
  name: string;
  stars: [number, number][];
  links: [number, number][];
  labelX: number;
  labelY: number;
}

// Each course category becomes a constellation with a stable, seeded shape:
// a winding path of stars plus one branch, like the classic star figures.
function build(names: string[]): Constellation[] {
  return names.slice(0, SLOTS.length).map((name, i) => {
    const rand = seeded(name);
    const [cx, cy] = SLOTS[i];
    const count = 4 + Math.floor(rand() * 3);
    const stars: [number, number][] = [];
    let angle = rand() * Math.PI * 2;
    let x = cx - 0.08;
    let y = cy;
    for (let s = 0; s < count; s++) {
      stars.push([x, y]);
      angle += (rand() - 0.5) * 1.8;
      x += Math.cos(angle) * 0.055;
      y += Math.sin(angle) * 0.06;
    }
    const links: [number, number][] = stars.slice(1).map((_, s) => [s, s + 1]);
    const branchFrom = 1 + Math.floor(rand() * (count - 2));
    stars.push([stars[branchFrom][0] + 0.03, stars[branchFrom][1] + 0.07]);
    links.push([branchFrom, stars.length - 1]);

    // Fit the random walk into a fixed box around its slot so shapes never leave the panel.
    const xs = stars.map((s) => s[0]);
    const ys = stars.map((s) => s[1]);
    const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
    const k = Math.min(
      0.24 / (Math.max(...xs) - minX || 1),
      0.16 / (Math.max(...ys) - minY || 1),
      1.6,
    );
    const w = (Math.max(...xs) - minX) * k;
    const h = (Math.max(...ys) - minY) * k;
    for (const s of stars) {
      s[0] = cx - w / 2 + (s[0] - minX) * k;
      s[1] = cy - h / 2 + (s[1] - minY) * k;
    }
    return {
      name,
      stars,
      links,
      labelX: stars.reduce((a, s) => a + s[0], 0) / stars.length,
      labelY: Math.max(...stars.map((s) => s[1])) + 0.05,
    };
  });
}

const LINE_DELAY = 0.1;
const HOLD = 2.6;

export function ConstellationSky({
  categories,
  lit = false,
}: {
  categories: string[];
  /** Lights every constellation at once, e.g. after a successful sign-in. */
  lit?: boolean;
}) {
  const litRef = useRef(lit);
  litRef.current = lit;
  const shapes = useMemo(
    () => build(categories.length ? categories : ["a", "b", "c", "d"]),
    [categories],
  );
  const totalLines = shapes.reduce((n, c) => n + c.links.length, 0);
  const drawn = 0.4 + totalLines * LINE_DELAY;

  const ref = useCanvasLoop(({ ctx, width, height, dpr, time, rgb }) => {
    for (const s of BACKGROUND) {
      const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(time * s.speed * 2 + s.phase));
      ctx.fillStyle = `rgba(243,239,230,${a})`;
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * height, s.size * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // After all are drawn, highlight one category at a time, as if choosing a path.
    const active = time > drawn ? Math.floor((time - drawn) / HOLD) % shapes.length : -1;
    let index = 0;
    shapes.forEach((c, ci) => {
      const pts = c.stars.map(([x, y]) => [x * width, y * height]);
      const lit = litRef.current || ci === active;
      for (const [a, b] of c.links) {
        const q = Math.max(0, Math.min(1, (time - 0.4 - index++ * LINE_DELAY) / 0.5));
        if (q <= 0) continue;
        const [x1, y1] = pts[a];
        const [x2, y2] = pts[b];
        ctx.strokeStyle = `rgba(${rgb},${lit ? 0.95 : 0.45})`;
        ctx.lineWidth = (lit ? 1.5 : 1) * dpr;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q);
        ctx.stroke();
      }
      pts.forEach(([x, y], i) => {
        const twinkle = 0.75 + 0.25 * Math.sin(time * 3 + i + ci * 2);
        glow(ctx, x, y, (lit ? 14 : 9) * dpr, rgb, 0.35 * twinkle);
        ctx.fillStyle = `rgba(255,248,230,${twinkle})`;
        ctx.beginPath();
        ctx.arc(x, y, (i % 3 ? 1.8 : 2.4) * dpr, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    const shoot = (time % 7) / 7;
    if (shoot < 0.12) {
      const p = shoot / 0.12;
      const x = (0.9 - p * 0.35) * width;
      const y = (0.05 + p * 0.2) * height;
      const g = ctx.createLinearGradient(x, y, x + 60 * dpr, y - 36 * dpr);
      g.addColorStop(0, "rgba(255,248,230,.9)");
      g.addColorStop(1, "rgba(255,248,230,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.4 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 60 * dpr, y - 36 * dpr);
      ctx.stroke();
    }
  });

  return (
    <div className="absolute inset-0">
      <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      {categories.length > 0 &&
        shapes.map((c, i) => (
          <span
            key={c.name}
            aria-hidden="true"
            className="animate-in fade-in fill-mode-both absolute -translate-x-1/2 font-serif text-sm italic text-[var(--gold-light)] duration-1000"
            style={{
              left: `${c.labelX * 100}%`,
              top: `${c.labelY * 100}%`,
              animationDelay: `${(0.4 + shapes.slice(0, i + 1).reduce((n, s) => n + s.links.length, 0) * LINE_DELAY) * 1000}ms`,
            }}
          >
            {c.name}
          </span>
        ))}
    </div>
  );
}
