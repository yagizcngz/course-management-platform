import { useRef } from "react";
import { glow, useCanvasLoop } from "./useCanvasLoop";

// Muted planet tones that sit well on the night-slate panel next to champagne gold.
const PLANETS = [
  { orbit: 0.16, size: 0.45, rgb: "190,192,198" },
  { orbit: 0.24, size: 0.6, rgb: "232,214,170" },
  { orbit: 0.32, size: 0.65, rgb: "150,180,205", moon: true },
  { orbit: 0.4, size: 0.5, rgb: "205,150,135" },
  { orbit: 0.53, size: 1.2, rgb: "222,200,160" },
  { orbit: 0.63, size: 1, rgb: "232,214,170", ring: true },
  { orbit: 0.72, size: 0.8, rgb: "170,205,210" },
  { orbit: 0.8, size: 0.75, rgb: "130,150,190" },
];
const TILT = 0.42;

// The learner's goal is the sun; each course category orbits it as a planet.
export function SolarSystem({ categories }: { categories: string[] }) {
  const labels = useRef<(HTMLSpanElement | null)[]>([]);

  const ref = useCanvasLoop(({ ctx, width, height, dpr, time, rgb }) => {
    const cx = width / 2;
    const cy = height * 0.4;
    const scale = width * 0.56;

    for (const p of PLANETS) {
      ctx.strokeStyle = `rgba(${rgb},0.16)`;
      ctx.lineWidth = dpr * 0.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, p.orbit * scale, p.orbit * scale * TILT, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const bodies: { z: number; draw: () => void }[] = [];
    PLANETS.forEach((p, i) => {
      const r = p.orbit * scale;
      const speed = 0.9 / Math.pow(p.orbit / 0.16, 1.5); // Kepler-ish: outer planets slower
      const a = time * speed * 0.6 + i * 1.3;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * TILT;
      const z = Math.sin(a);
      const label = labels.current[i];
      if (label) {
        label.style.transform = `translate(${x / dpr}px, ${y / dpr}px) translate(-50%, 70%)`;
        label.style.opacity = String(0.45 + 0.55 * ((1 + z) / 2));
      }
      bodies.push({
        z,
        draw: () => {
          const s = p.size * 7 * dpr * (0.85 + 0.15 * z);
          if (p.ring) {
            ctx.strokeStyle = `rgba(${p.rgb},0.7)`;
            ctx.lineWidth = 1.2 * dpr;
            ctx.beginPath();
            ctx.ellipse(x, y, s * 2.1, s * 0.6, -0.35, 0, Math.PI * 2);
            ctx.stroke();
          }
          const g = ctx.createRadialGradient(x - s * 0.35, y - s * 0.35, s * 0.1, x, y, s);
          const dark = p.rgb
            .split(",")
            .map((v) => Math.round(Number(v) * 0.55))
            .join(",");
          g.addColorStop(0, `rgb(${p.rgb})`);
          g.addColorStop(1, `rgb(${dark})`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, s, 0, Math.PI * 2);
          ctx.fill();
          if (p.moon) {
            const m = time * 3;
            ctx.fillStyle = "rgba(220,220,225,.9)";
            ctx.beginPath();
            ctx.arc(
              x + Math.cos(m) * s * 2.2,
              y + Math.sin(m) * s * 1.1,
              1.3 * dpr,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        },
      });
    });

    for (let i = 0; i < 130; i++) {
      const r = (0.445 + ((i * 37) % 100) / 4000) * scale;
      const a = time * 0.2 + i * 0.45;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * TILT;
      bodies.push({
        z: Math.sin(a),
        draw: () => {
          ctx.fillStyle = `rgba(${rgb},0.35)`;
          ctx.fillRect(x, y, dpr, dpr);
        },
      });
    }

    bodies.push({
      z: 0,
      draw: () => {
        glow(ctx, cx, cy, 52 * dpr, rgb, 0.55);
        const g = ctx.createRadialGradient(cx - 4 * dpr, cy - 4 * dpr, 2 * dpr, cx, cy, 15 * dpr);
        g.addColorStop(0, "#fff6dc");
        g.addColorStop(1, "#d9a948");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, 15 * dpr, 0, Math.PI * 2);
        ctx.fill();
      },
    });

    bodies.sort((a, b) => a.z - b.z).forEach((b) => b.draw());
  });

  return (
    <div className="absolute inset-0">
      <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      {categories.slice(0, PLANETS.length).map((name, i) => (
        <span
          key={name}
          ref={(el) => {
            labels.current[i] = el;
          }}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-[11px] text-[#f3efe6]/80"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
