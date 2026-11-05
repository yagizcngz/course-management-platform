import { useEffect, useRef } from "react";
import { useThreeScene } from "./useThreeScene";

export interface FolioProps {
  /** How much of the form is filled, 0..1: scattered books gather into place as it grows. */
  progress: number;
  /** "stack" lies the books flat (learner); "shelf" stands them up side by side (instructor). */
  arrangement: "stack" | "shelf";
  /** Signed in: the covers catch a warm glow and the stack rises a little. */
  lit: boolean;
  /** Bumped on every failed attempt; each bump shakes the books once. */
  shake: number;
}

// ink, gold, leather, paper, slate, brass, night: the landing page's palette as bindings
const COVERS = [0x2b3140, 0xc9a24f, 0x6b5340, 0xe6dcc3, 0x3d4659, 0xa8834a, 0x1d212b];
const PAPER = 0xf3ecdb;
const GOLD = 0xd9b45f;

type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number };

/** Deterministic noise in -1..1 so every visit draws the same scatter. */
const rand = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

/**
 * The sign-in and sign-up centrepiece: a small archive of bound volumes. Empty form, the
 * books drift apart; every filled field pulls them together into a neat stack (or, for an
 * instructor, a shelf); a successful sign-in lights them gold.
 */
export function FolioScene(props: FolioProps) {
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });

  const ref = useThreeScene(({ THREE, scene, pointer, reduce }) => {
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xfff1dc, 0.6));
    const key = new THREE.DirectionalLight(0xffecd0, 1.7);
    key.position.set(4, 7, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fa3c7, 0.35);
    fill.position.set(-6, 2, -3);
    scene.add(fill);
    const glow = new THREE.PointLight(GOLD, 0, 14, 1.6);
    glow.position.set(0, 1.5, 3.5);
    scene.add(glow);

    const group = new THREE.Group();
    scene.add(group);

    const books = COVERS.map((color, i) => {
      const w = 2.5 - (i % 3) * 0.22; // across the cover
      const h = 0.26 + (i % 2) * 0.1; // spine thickness
      const d = 1.8 - (i % 4) * 0.1; // cover height
      const book = new THREE.Group();
      // turn about y first (spine to the viewer), then stand up about z
      book.rotation.order = "ZYX";
      const cover = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: color === COVERS[1] || color === COVERS[5] ? 0.45 : 0.08,
        emissive: GOLD,
        emissiveIntensity: 0,
      });
      book.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cover));
      const pages = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.1, h * 0.76, d - 0.08),
        new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.92 }),
      );
      pages.position.x = 0.06; // the spine sits on the -x edge
      book.add(pages);
      // a gilt band across the spine
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, h * 1.02, d * 0.12),
        new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.7, roughness: 0.3 }),
      );
      band.position.set(-w / 2 - 0.005, 0, d * 0.28);
      book.add(band);
      group.add(book);
      return { book, cover, w, h, d };
    });

    // flat stack, bottom book first, each turned a little off the one below
    let y = -1.1;
    const stack: Pose[] = books.map((b, i) => {
      const pose = {
        x: rand(i, 1) * 0.18,
        y: y + b.h / 2,
        z: rand(i, 2) * 0.12,
        rx: 0,
        ry: rand(i, 3) * 0.28,
        rz: 0,
      };
      y += b.h + 0.015;
      return pose;
    });
    // upright on a shelf line, spines towards the viewer, the last two leaning (stand height = d)
    const width = books.reduce((sum, b) => sum + b.h + 0.06, 0);
    let x = -width / 2;
    const shelf: Pose[] = books.map((b, i) => {
      const lean = i >= books.length - 2 ? -0.22 * (i - books.length + 3) : 0;
      const pose = {
        x: x + b.h / 2,
        y: -1.15 + b.d / 2,
        z: 0,
        rx: 0,
        ry: Math.PI / 2,
        rz: Math.PI / 2 + lean,
      };
      x += b.h + 0.06;
      return pose;
    });
    const scatter: Pose[] = books.map((_, i) => {
      const a = (i / books.length) * Math.PI * 2 + rand(i, 4) * 0.4;
      return {
        x: Math.cos(a) * (2.2 + rand(i, 5) * 0.45),
        y: 0.2 + Math.sin(a) * 1.35 + rand(i, 6) * 0.25,
        z: rand(i, 7) * 1.2 - 0.4,
        rx: rand(i, 8) * 1.1,
        ry: rand(i, 9) * 1.6,
        rz: rand(i, 10) * 0.9,
      };
    });
    const cur: Pose[] = scatter.map((p) => ({ ...p }));

    let shakeSeen = live.current.shake;
    let shakeT = 0;
    let warmth = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const keys = ["x", "y", "z", "rx", "ry", "rz"] as const;

    return {
      camera,
      resize(w, h) {
        camera.aspect = w / h;
        // pull back on narrow panels so the scatter still fits
        camera.position.set(0, 1.3, w / h < 0.9 ? 13.5 : 10.5);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      },
      update(time, delta) {
        const { progress, arrangement, lit, shake } = live.current;
        const k = reduce ? 1 : 1 - Math.exp(-delta * 4.5);
        const p = ease(Math.max(0, Math.min(1, progress)));
        const arranged = arrangement === "shelf" ? shelf : stack;
        books.forEach((b, i) => {
          const from = scatter[i];
          const to = arranged[i];
          for (const key of keys) {
            const target = from[key] + (to[key] - from[key]) * p;
            cur[i][key] += (target - cur[i][key]) * k;
          }
          // loose books drift; a finished stack only breathes
          const drift = reduce ? 0 : Math.sin(time * 0.9 + i * 1.7) * 0.06 * (1 - p * 0.8);
          b.book.position.set(cur[i].x, cur[i].y + drift + warmth * 0.25, cur[i].z);
          b.book.rotation.set(cur[i].rx, cur[i].ry, cur[i].rz);
          b.cover.emissiveIntensity = warmth * 0.35;
        });

        warmth += ((lit ? 1 : 0) - warmth) * k;
        glow.intensity = warmth * 6;

        if (shake !== shakeSeen) {
          shakeSeen = shake;
          shakeT = 1;
        }
        shakeT = Math.max(0, shakeT - delta * 2.2);
        group.position.x = reduce ? 0 : Math.sin(time * 48) * 0.12 * shakeT;
        group.rotation.y = pointer.x * 0.3 + (reduce ? 0 : Math.sin(time * 0.2) * 0.12) - 0.25;
        group.rotation.x = -pointer.y * 0.12 + 0.18;
      },
    };
  });

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
