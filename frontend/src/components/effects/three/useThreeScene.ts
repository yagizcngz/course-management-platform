import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";

type Three = typeof THREE_NS;

export interface SceneContext {
  THREE: Three;
  scene: THREE_NS.Scene;
  renderer: THREE_NS.WebGLRenderer;
  /** Pointer in -1..1, eased toward the real position each frame. */
  pointer: { x: number; y: number };
  /** Raw pointer in -1..1 and whether it is over the canvas; for hover picking. */
  raw: { x: number; y: number; inside: boolean };
  /** True under prefers-reduced-motion: skip ambient motion, jump transitions. */
  reduce: boolean;
}

export interface SceneHandle {
  camera: THREE_NS.Camera;
  resize(width: number, height: number): void;
  update(time: number, delta: number): void;
}

/**
 * Mounts a three.js scene on a canvas. three is imported on the client only, so the
 * page still renders on the server. The loop pauses off-screen and on hidden tabs, and
 * every GPU resource is disposed on unmount. Under reduced motion time stands still, but
 * frames keep rendering so the scene can still answer hover and data changes.
 */
export function useThreeScene(setup: (ctx: SceneContext) => SceneHandle) {
  const ref = useRef<HTMLCanvasElement>(null);
  const setupRef = useRef(setup);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (cancelled) return;
      let renderer: THREE_NS.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      } catch {
        return; // no WebGL: the page reads fine without the scene
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const pointer = { x: 0, y: 0 };
      const raw = { x: 0, y: 0, inside: false };
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const handle = setupRef.current({ THREE, scene, renderer, pointer, raw, reduce });
      let last = performance.now();
      let elapsed = 0;

      let visible = true;
      let raf = 0;
      const frame = () => {
        raf = 0;
        const now = performance.now();
        // clamp so a resumed tab does not jump the animation forward
        const delta = Math.min((now - last) / 1000, 0.05);
        last = now;
        elapsed += delta;
        pointer.x += (raw.x - pointer.x) * 0.06;
        pointer.y += (raw.y - pointer.y) * 0.06;
        handle.update(reduce ? 2 : elapsed, delta);
        renderer.render(scene, handle.camera);
        if (visible && !document.hidden) raf = requestAnimationFrame(frame);
      };
      const start = () => {
        if (!raf) raf = requestAnimationFrame(frame);
      };

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = canvas;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        handle.resize(w, h);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      resize();

      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      });
      io.observe(canvas);

      const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 2 - 1;
        const y = -((e.clientY - r.top) / r.height) * 2 + 1;
        raw.inside = Math.abs(x) <= 1 && Math.abs(y) <= 1;
        raw.x = Math.max(-1, Math.min(1, x));
        raw.y = Math.max(-1, Math.min(1, y));
      };
      const onVisibility = () => !document.hidden && start();
      const onLeave = () => (raw.inside = false);
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      document.addEventListener("visibilitychange", onVisibility);
      start();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("visibilitychange", onVisibility);
        scene.traverse((obj) => {
          const mesh = obj as THREE_NS.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            if (!m) continue;
            for (const value of Object.values(m)) {
              if (value instanceof THREE.Texture) value.dispose();
            }
            m.dispose();
          }
        });
        renderer.dispose();
      };
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return ref;
}
