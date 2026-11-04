import type { ReactNode } from "react";
import { glow, useCanvasLoop } from "./useCanvasLoop";

const POINTS = 620;
const SPHERE: [number, number, number][] = Array.from({ length: POINTS }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / POINTS;
  const r = Math.sqrt(1 - y * y);
  const a = i * 2.39996; // golden angle: even spread
  return [Math.cos(a) * r, y, Math.sin(a) * r];
});

// Arcs between points stand for students reaching teachers across the platform.
const ARCS = Array.from({ length: 7 }, (_, i) => ({
  from: (i * 97) % POINTS,
  to: (i * 211 + 140) % POINTS,
  offset: i * 1.3,
}));

const TILT = 0.4;

function rotate([x, y, z]: [number, number, number], angle: number) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const rx = x * ca - z * sa;
  const rz = x * sa + z * ca;
  return [rx, y * Math.cos(TILT) - rz * Math.sin(TILT), y * Math.sin(TILT) + rz * Math.cos(TILT)];
}

export function GlobeHero({ children }: { children?: ReactNode }) {
  const ref = useCanvasLoop(({ ctx, width, height, dpr, time, rgb }) => {
    const R = Math.min(width, height) * 0.36;
    const cx = width / 2;
    const cy = height / 2;
    const angle = time * 0.18;
    const project = (p: [number, number, number]) => {
      const [x, y, z] = rotate(p, angle);
      const k = 2.6 / (2.6 + z);
      return { x: cx + x * R * k, y: cy + y * R * k, z, k };
    };

    glow(ctx, cx, cy, R * 1.7, rgb, 0.22);

    for (const p of SPHERE) {
      const q = project(p);
      const depth = (1 - q.z) / 2;
      ctx.fillStyle = `rgba(${rgb},${0.07 + 0.7 * depth})`;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 1.4 * dpr * q.k * (0.5 + depth), 0, Math.PI * 2);
      ctx.fill();
    }

    for (const arc of ARCS) {
      const a = SPHERE[arc.from];
      const b = SPHERE[arc.to];
      const phase = ((time * 0.35 + arc.offset) % 3) / 3; // 0..1 travel, then pause
      if (phase > 0.75) continue;
      const head = Math.min(1, phase / 0.5);
      const tail = Math.max(0, (phase - 0.25) / 0.5);
      const steps = 28;
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = tail + ((head - tail) * s) / steps;
        const lift = 1 + Math.sin(t * Math.PI) * 0.28;
        const m: [number, number, number] = [
          (a[0] + (b[0] - a[0]) * t) * lift,
          (a[1] + (b[1] - a[1]) * t) * lift,
          (a[2] + (b[2] - a[2]) * t) * lift,
        ];
        const q = project(m);
        if (s === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      ctx.strokeStyle = `rgba(${rgb},0.75)`;
      ctx.lineWidth = 1.3 * dpr;
      ctx.stroke();
      if (head < 1) {
        const lift = 1 + Math.sin(head * Math.PI) * 0.28;
        const q = project([
          (a[0] + (b[0] - a[0]) * head) * lift,
          (a[1] + (b[1] - a[1]) * head) * lift,
          (a[2] + (b[2] - a[2]) * head) * lift,
        ]);
        glow(ctx, q.x, q.y, 7 * dpr, rgb, 0.9);
      }
    }
  });

  return (
    <div className="relative h-full w-full">
      <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      {children}
    </div>
  );
}
