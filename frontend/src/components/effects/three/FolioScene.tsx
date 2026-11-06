import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";
import { useThreeScene } from "./useThreeScene";
import {
  STACK_BOB,
  STAGING_Y,
  STACK_BREATH,
  STACK_X,
  SHELF_X0,
  bookDims,
  ease,
  folioLayout,
  gatherT,
  rand,
} from "./folioLayout";

export interface FolioProps {
  /** How much of the form is filled, 0..1: loose books settle into place as it grows. */
  progress: number;
  /** "stack" lays the books flat (learner); "shelf" stands them side by side (instructor). */
  arrangement: "stack" | "shelf";
  /** Signed in: the covers catch a warm glow and the books rise a little. */
  lit: boolean;
  /** Bumped on every failed attempt; each bump shakes the books once. */
  shake: number;
}

// ink, gold, leather, paper, slate, brass, night: the landing page's palette as bindings
const COVERS = [0x2b3140, 0x8a6a2f, 0x6b5340, 0xb9ab8a, 0x3d4659, 0x7a3b32, 0x1d212b];
const LABELS = [0x7a3b32, 0x1d212b, 0x2b3140, 0x6b5340, 0x8a6a2f, 0x1d212b, 0x7a3b32];
const RIBBONS = [0x8c2f2f, 0x2f5a46, 0xb08d57, 0x8c2f2f, 0x2f3f6a, 0xb08d57, 0x2f5a46];
const EDGES = ["gilt", "marbled", "sprinkled", "gilt", "deckle", "marbled", "sprinkled"] as const;
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];
const PAPER = 0xf3ecdb;
const GOLD = 0xd9b45f;

const SWITCH_DUR = 1.25;
const SWITCH_STAGGER = 0.5;
const STAGGER = 0.07; // lower (stack) / left (shelf) books settle first

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Family = "stack" | "shelf";

/**
 * The sign-in centrepiece: a small archive of bound volumes. With an empty form the books
 * float loose; every filled field settles them into a stack (or, for an instructor, onto a
 * shelf); a successful sign-in lights them gold.
 *
 * Books never pass through one another. Loose stack books keep to their own height lanes and
 * loose shelf books to their own x-lanes, and lanes only ever shrink towards the settled
 * spacing (lower / left books settle first, so the order of the lanes cannot invert). Moving
 * between the two arrangements, each book lifts straight up into a staging lane above both,
 * turns there and descends into the other region, in an order that keeps every vertical path
 * clear.
 */
export function FolioScene(props: FolioProps) {
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });

  const ref = useThreeScene(({ THREE, scene, pointer, reduce }) => {
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xfff1dc, 0.55));
    const key = new THREE.DirectionalLight(0xffecd0, 1.8);
    key.position.set(4, 7, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fa3c7, 0.4);
    fill.position.set(-6, 2, -3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd9a0, 0.5);
    rim.position.set(-2, 4, -6);
    scene.add(rim);
    const glow = new THREE.PointLight(GOLD, 0, 14, 1.6);
    glow.position.set(0, 1.5, 3.5);
    scene.add(glow);

    const world = new THREE.Group(); // tilts with the pointer and shakes
    const group = new THREE.Group(); // pans to centre the active arrangement
    world.add(group);
    scene.add(world);

    // --- procedural textures ------------------------------------------------------------------
    const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      draw(canvas.getContext("2d")!);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    };
    const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

    // leather / book-cloth grain, shared as a bump map by every cover
    const grain = canvasTexture(256, 256, (c) => {
      const img = c.createImageData(256, 256);
      for (let i = 0; i < 256 * 256; i++) {
        const v = 128 + rand(i, 3) * 40 + rand(i >> 3, 5) * 30;
        img.data.set([v, v, v, 255], i * 4);
      }
      c.putImageData(img, 0, 0);
    });
    grain.colorSpace = THREE.NoColorSpace;
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(2, 2);

    // spine: raised-band panels, a gold-stamped label with the volume number, an emblem
    const spineTexture = (i: number) =>
      canvasTexture(512, 128, (c) => {
        c.fillStyle = hex(COVERS[i]);
        c.fillRect(0, 0, 512, 128);
        const gold = "#d9b45f";
        const bands = [62, 168, 344, 450];
        for (const x of bands) {
          const g = c.createLinearGradient(x - 10, 0, x + 10, 0);
          g.addColorStop(0, "rgba(0,0,0,0.35)");
          g.addColorStop(0.5, "rgba(255,255,255,0.18)");
          g.addColorStop(1, "rgba(0,0,0,0.35)");
          c.fillStyle = g;
          c.fillRect(x - 10, 0, 20, 128);
          c.strokeStyle = gold;
          c.lineWidth = 2;
          for (const dx of [-14, 14]) {
            c.beginPath();
            c.moveTo(x + dx, 6);
            c.lineTo(x + dx, 122);
            c.stroke();
          }
        }
        // title label between the first two bands
        c.fillStyle = hex(LABELS[i]);
        c.fillRect(186, 22, 140, 84);
        c.strokeStyle = gold;
        c.lineWidth = 3;
        c.strokeRect(192, 28, 128, 72);
        c.fillStyle = gold;
        c.font = "bold 40px Georgia, serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(NUMERALS[i], 256, 66);
        // emblem near the tail: a ringed star
        c.beginPath();
        c.arc(397, 64, 18, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? 6 : 13;
          const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
          c.lineTo(397 + r * Math.cos(a), 64 + r * Math.sin(a));
        }
        c.closePath();
        c.fill();
      });

    // page edges: fine leaves plus the book's finish (gilt, marbled, sprinkled, deckle)
    const edgeTexture = (i: number) =>
      canvasTexture(256, 64, (c) => {
        const kind = EDGES[i];
        c.fillStyle = kind === "gilt" ? "#caa24e" : "#efe6d0";
        c.fillRect(0, 0, 256, 64);
        if (kind === "gilt") {
          const g = c.createLinearGradient(0, 0, 0, 64);
          g.addColorStop(0, "rgba(255,240,190,0.55)");
          g.addColorStop(0.5, "rgba(0,0,0,0)");
          g.addColorStop(1, "rgba(90,60,10,0.35)");
          c.fillStyle = g;
          c.fillRect(0, 0, 256, 64);
        } else if (kind === "marbled") {
          for (let s = 0; s < 26; s++) {
            c.strokeStyle = ["#7a3b32", "#2f3f6a", "#b08d57"][s % 3];
            c.globalAlpha = 0.45;
            c.lineWidth = 2 + (s % 4);
            c.beginPath();
            for (let x = 0; x <= 256; x += 8) {
              const y = 32 + Math.sin(x * 0.05 + s * 1.7) * 20 * rand(s, 1) + rand(s, 2) * 24;
              if (x === 0) c.moveTo(x, y);
              else c.lineTo(x, y);
            }
            c.stroke();
          }
          c.globalAlpha = 1;
        } else if (kind === "sprinkled") {
          c.fillStyle = "#9a3b32";
          for (let s = 0; s < 420; s++)
            c.fillRect(((rand(s, 4) + 1) / 2) * 256, ((rand(s, 5) + 1) / 2) * 64, 1.5, 1.5);
        }
        // the leaves themselves
        c.strokeStyle = "rgba(60,45,25,0.18)";
        c.lineWidth = 1;
        for (let y = 2; y < 64; y += 3) {
          c.beginPath();
          c.moveTo(0, y + rand(y, 6));
          c.lineTo(256, y + rand(y, 7));
          c.stroke();
        }
        if (kind === "deckle") {
          // torn, uneven leaf ends
          c.fillStyle = "rgba(120,100,70,0.25)";
          for (let x = 0; x < 256; x += 4) c.fillRect(x, 0, 2, 3 + ((rand(x, 8) + 1) / 2) * 6);
        }
      });

    const headband = canvasTexture(32, 8, (c) => {
      for (let x = 0; x < 32; x += 4) {
        c.fillStyle = (x / 4) % 2 ? "#e8dcc0" : "#8c2f2f";
        c.fillRect(x, 0, 4, 8);
      }
    });

    // --- shared parts -------------------------------------------------------------------------
    const goldMat = new THREE.MeshStandardMaterial({
      color: GOLD,
      metalness: 0.85,
      roughness: 0.28,
      side: THREE.DoubleSide,
    });
    const paperMat = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.92 });
    const bandMat = new THREE.MeshStandardMaterial({ map: headband, roughness: 0.7 });
    const cornerShape = new THREE.Shape();
    cornerShape.moveTo(0, 0);
    cornerShape.lineTo(-0.2, 0);
    cornerShape.lineTo(0, -0.2);
    cornerShape.closePath();
    const cornerGeo = new THREE.ExtrudeGeometry(cornerShape, { depth: 0.01, bevelEnabled: false });
    cornerGeo.rotateX(-Math.PI / 2); // lie flat on the board

    const box = (w: number, h: number, d: number, mat: THREE_NS.Material | THREE_NS.Material[]) =>
      new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

    // Built flat: across the cover along x, thickness along y, height along z, spine on -x.
    const books = COVERS.map((color, i) => {
      const { w, h, d } = bookDims(i);
      const board = 0.034;
      const book = new THREE.Group();
      const cover = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.62,
        metalness: color === COVERS[1] || color === COVERS[5] ? 0.25 : 0.06,
        bumpMap: grain,
        bumpScale: 0.6,
        emissive: GOLD,
        emissiveIntensity: 0,
      });
      const panel = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).multiplyScalar(0.72),
        roughness: 0.7,
        bumpMap: grain,
        bumpScale: 0.4,
      });
      const spine = new THREE.MeshStandardMaterial({
        map: spineTexture(i),
        roughness: 0.55,
        bumpMap: grain,
        bumpScale: 0.5,
        emissive: GOLD,
        emissiveIntensity: 0,
      });
      const edge = new THREE.MeshStandardMaterial({
        map: edgeTexture(i),
        roughness: EDGES[i] === "gilt" ? 0.35 : 0.9,
        metalness: EDGES[i] === "gilt" ? 0.6 : 0,
      });

      // boards overhang the pages a little ("squares"), the spine closes the -x side
      for (const side of [1, -1]) {
        const b = box(w - 0.04, board, d + 0.05, cover);
        b.position.set(0.02, side * (h / 2 - board / 2), 0);
        book.add(b);
        // recessed panel framed by gilt fillets
        const top = side * (h / 2 + 0.0015);
        const p = box(w - 0.5, 0.003, d - 0.38, panel);
        p.position.set(0.06, top, 0);
        book.add(p);
        for (const z of [-1, 1]) {
          const f = box(w - 0.34, 0.004, 0.016, goldMat);
          f.position.set(0.06, top + side * 0.001, z * (d / 2 - 0.15));
          book.add(f);
        }
        for (const x of [-w / 2 + 0.23, w / 2 - 0.11]) {
          const f = box(0.016, 0.004, d - 0.3, goldMat);
          f.position.set(x, top + side * 0.001, 0);
          book.add(f);
        }
        // gilded corners on the fore-edge
        for (const z of [-1, 1]) {
          const c = new THREE.Mesh(cornerGeo, goldMat);
          // legs point inwards along -x and towards the middle along z
          c.position.set(w / 2, side > 0 ? h / 2 : -h / 2, z * (d / 2 + 0.025));
          c.rotation.y = z > 0 ? -Math.PI / 2 : 0;
          if (side < 0) c.scale.y = -1; // mirrored below the bottom board (goldMat is double-sided)
          book.add(c);
        }
      }
      // spine: textured outer face, raised bands (hubs) standing proud of it
      const back = box(0.05, h, d + 0.05, [cover, spine, cover, cover, cover, cover]);
      back.position.x = -w / 2 + 0.025;
      book.add(back);
      for (const z of [-0.36, -0.15, 0.19, 0.4]) {
        const r = box(0.022, h + 0.008, 0.04, cover);
        r.position.set(-w / 2 - 0.006, 0, z * d);
        book.add(r);
      }
      // text block with finished edges, head and tail bands, a ribbon out of the tail
      const pages = box(w - 0.13, h - 2 * board, d - 0.03, [
        edge,
        paperMat,
        paperMat,
        paperMat,
        edge,
        edge,
      ]);
      pages.position.x = -w / 2 + 0.05 + (w - 0.13) / 2;
      book.add(pages);
      for (const z of [1, -1]) {
        const hb = box(0.035, h - 2 * board, 0.03, bandMat);
        hb.position.set(-w / 2 + 0.07, 0, z * (d / 2 - 0.02));
        book.add(hb);
      }
      const ribbon = box(
        0.05,
        0.004,
        0.32,
        new THREE.MeshStandardMaterial({ color: RIBBONS[i], roughness: 0.5 }),
      );
      ribbon.position.set(w * 0.12, h / 2 - board - 0.004, -d / 2 - 0.12);
      ribbon.rotation.x = -0.12;
      book.add(ribbon);

      group.add(book);
      return { book, mats: [cover, spine], w, h, d };
    });
    const N = books.length;

    // --- arrangements -------------------------------------------------------------------------
    const Y = new THREE.Vector3(0, 1, 0);
    const X = new THREE.Vector3(1, 0, 0);
    const Z = new THREE.Vector3(0, 0, 1);
    // flat book stood upright: height along y, thickness along x, spine to the viewer
    const UPRIGHT = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, Math.PI / 2, Math.PI / 2, "ZYX"),
    );
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();
    const stackQuat = (yaw: number, out: THREE_NS.Quaternion) => out.setFromAxisAngle(Y, yaw);
    // pitch about world x is applied last, so it never widens the book along x
    const shelfQuat = (lean: number, pitch: number, out: THREE_NS.Quaternion) =>
      out
        .copy(qb.setFromAxisAngle(X, pitch))
        .multiply(qa.setFromAxisAngle(Z, lean))
        .multiply(UPRIGHT);

    const { stack, shelf, shelfRight } = folioLayout(N);
    const regionCentre = {
      stack: -STACK_X - 0.2,
      shelf: -(SHELF_X0 + (shelfRight - SHELF_X0) / 2),
    };

    /** Where book i rests in an arrangement at gather progress t (0 loose, 1 settled). */
    const pose = (
      family: Family,
      i: number,
      t: number,
      time: number,
      outPos: THREE_NS.Vector3,
      outQuat: THREE_NS.Quaternion,
    ) => {
      const loose = 1 - t;
      if (family === "stack") {
        const { settled: s, loose: l } = stack[i];
        // per-book bob stays inside the extra lane height; a settled stack breathes as one
        const bob = reduce
          ? 0
          : Math.sin(time * 0.9 + i * 1.7) * STACK_BOB * loose +
            Math.sin(time * 0.8) * STACK_BREATH * t;
        outPos.set(lerp(s.x, l.x, loose), lerp(s.y, l.y, loose) + bob, lerp(s.z, l.z, loose));
        stackQuat(lerp(s.yaw, l.yaw, loose), outQuat);
      } else {
        const { settled: s, loose: l } = shelf[i];
        // shelf books may bob and sway in y/z only: their x-lanes stay clear
        const bob = reduce ? 0 : Math.sin(time * 0.9 + i * 1.7) * 0.06 * loose;
        outPos.set(lerp(s.x, l.x, loose), lerp(s.y, l.y, loose) + bob, lerp(s.z, l.z, loose));
        shelfQuat(lerp(s.lean, l.lean, loose), lerp(s.pitch, l.pitch, loose), outQuat);
      }
    };

    // --- state --------------------------------------------------------------------------------
    type Move = { start: number; fromPos: THREE_NS.Vector3; fromQuat: THREE_NS.Quaternion };
    let shown: Family = live.current.arrangement;
    const fam: Family[] = books.map(() => shown);
    const moves: (Move | null)[] = books.map(() => null);
    const curPos = books.map(() => new THREE.Vector3());
    const curQuat = books.map(() => new THREE.Quaternion());
    const tgtPos = new THREE.Vector3();
    const tgtQuat = new THREE.Quaternion();
    books.forEach((_, i) => pose(shown, i, 0, 0, curPos[i], curQuat[i]));
    let pan = regionCentre[shown];
    let clock = 0;

    let shakeSeen = live.current.shake;
    let shakeT = 0;
    let warmth = 0;

    /** Starts the lift - turn - descend route for every book not yet in `to`. */
    const reschedule = (to: Family) => {
      // stack -> shelf: top book leaves first; shelf -> stack: bottom slot fills first
      const order = [...books.keys()];
      if (to === "shelf") order.reverse();
      let n = 0;
      for (const i of order) {
        if (fam[i] === to && !moves[i]) continue;
        fam[i] = to;
        if (reduce) {
          moves[i] = null;
          continue;
        }
        moves[i] = {
          start: clock + n++ * SWITCH_STAGGER,
          fromPos: curPos[i].clone(),
          fromQuat: curQuat[i].clone(),
        };
      }
    };

    return {
      camera,
      resize(w, h) {
        camera.aspect = w / h;
        camera.position.set(0, 1.9, w / h < 0.9 ? 15 : 12.5);
        camera.lookAt(0, 0.7, 0);
        camera.updateProjectionMatrix();
      },
      update(time, delta) {
        const { progress, arrangement, lit, shake } = live.current;
        clock += delta;
        if (arrangement !== shown) {
          shown = arrangement;
          reschedule(shown);
        }
        const k = reduce ? 1 : 1 - Math.exp(-delta * 4.5);
        const p = clamp01(progress);

        books.forEach((b, i) => {
          // lower / left books settle first, so lanes never invert while gathering
          const t = gatherT(p, i, N);
          pose(fam[i], i, t, time, tgtPos, tgtQuat);
          const move = moves[i];
          if (move && clock >= move.start) {
            const u = clamp01((clock - move.start) / SWITCH_DUR);
            const { fromPos: f, fromQuat: fq } = move;
            if (u < 0.3) {
              const e = ease(u / 0.3);
              curPos[i].set(f.x, lerp(f.y, Math.max(f.y, STAGING_Y), e), f.z);
              curQuat[i].copy(fq);
            } else if (u < 0.7) {
              const e = ease((u - 0.3) / 0.4);
              curPos[i].set(
                lerp(f.x, tgtPos.x, e),
                Math.max(f.y, STAGING_Y),
                lerp(f.z, tgtPos.z, e),
              );
              curQuat[i].slerpQuaternions(fq, tgtQuat, e);
            } else {
              const e = ease((u - 0.7) / 0.3);
              curPos[i].set(tgtPos.x, lerp(Math.max(f.y, STAGING_Y), tgtPos.y, e), tgtPos.z);
              curQuat[i].copy(tgtQuat);
            }
            if (u >= 1) moves[i] = null;
          } else if (!move) {
            curPos[i].lerp(tgtPos, k);
            curQuat[i].slerp(tgtQuat, k);
          }
          b.book.position.copy(curPos[i]);
          b.book.quaternion.copy(curQuat[i]);
          for (const m of b.mats) m.emissiveIntensity = warmth * 0.3;
        });

        pan += (regionCentre[shown] - pan) * (reduce ? 1 : 1 - Math.exp(-delta * 1.6));
        group.position.x = pan;
        group.position.y = warmth * 0.25;

        warmth += ((lit ? 1 : 0) - warmth) * k;
        glow.intensity = warmth * 6;

        if (shake !== shakeSeen) {
          shakeSeen = shake;
          shakeT = 1;
        }
        shakeT = Math.max(0, shakeT - delta * 2.2);
        world.position.x = reduce ? 0 : Math.sin(time * 48) * 0.12 * shakeT;
        world.rotation.y = pointer.x * 0.25 + (reduce ? 0 : Math.sin(time * 0.2) * 0.1) - 0.2;
        world.rotation.x = -pointer.y * 0.1 + 0.16;
      },
    };
  });

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
