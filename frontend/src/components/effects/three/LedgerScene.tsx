import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";
import { useThreeScene } from "./useThreeScene";
import { SEALS, SEAL_RING, type SealKind } from "./sealEmblems";

export interface LedgerProps {
  /** The typed username, written in ink on the register page. */
  name: string;
  /** Only the length of the password is used: one ink dot per character. */
  secretLength: number;
  /** The focused field: the camera leans in and its line glows. */
  focus: "name" | "secret" | null;
  /** Sign-in request in flight: the pages rustle and the seal ring pulses. */
  busy: boolean;
  /** Signed in: the wax seal is stamped and the book glows. */
  lit: boolean;
  /**
   * Revealed by the token on success: a learner's seal carries a cap, an instructor's a lectern,
   * an administrator's a crown in blue wax.
   */
  seal: SealKind;
  /** Bumped on every failed attempt: the ink runs red, the book jolts and the top leaves lift. */
  shake: number;
  labels: {
    title: string;
    heading: string;
    name: string;
    secret: string;
    seal: string;
    welcome: string;
  };
}

const W = 2.1; // page width, spine to fore-edge
const D = 2.9; // page height (along z)
const T = 0.11; // text block thickness
const K = 6; // loose leaves that turn
const SEG_X = 36;
const SEG_Z = 10;
const TURN = 1.05; // seconds per leaf
const STAGGER = 0.13;
const EPS = 0.005; // leaf spacing in a stack
const SEAL = { x: 0.72 * W, z: -D / 2 + 0.8 * D, r: 0.3 };
const REBUFF = 0.75; // seconds the top leaves lift and fall back after a failed attempt
// The bookmark ribbon lies on the register page across one segment of its mesh, half a leaf
// spacing above it: every leaf, resting or turning, stays at least EPS above that page, so the
// leaves pass over the ribbon and never through it. Its end hangs over the tail edge.
const RIB_SEG = 1; // the page segment it covers, counted from the gutter
const RIB = 18; // ribbon rows: head and tail edge of the page, then the hanging end
const RIB_TAIL = 0.55; // how far it hangs past the tail edge
const RIB_DROP = 1.25; // angle of the hanging end, radians below the page plane
const RIB_CURL = 0.18; // length over which it bends from flat to RIB_DROP
const TABLE_Y = -0.055; // just above the contact shadow
/** Wax per seal: gradient highlight and shadow, the disc's side, the emblem's light edge. */
const WAX: Record<SealKind, { hi: string; lo: string; side: number; edge: string }> = {
  student: { hi: "#b5352b", lo: "#5e1410", side: 0x8c1f1a, edge: "rgba(255,190,170,0.45)" },
  teacher: { hi: "#b5352b", lo: "#5e1410", side: 0x8c1f1a, edge: "rgba(255,190,170,0.45)" },
  admin: { hi: "#36518f", lo: "#121a38", side: 0x1d2a55, edge: "rgba(240,205,130,0.75)" },
};

const PAPER = "#f2ead6";
const INK = "#2a1f17";
const EMBER_INK = "#a8321f";
const GILT = "#8a6a2f";
const SERIF = "Georgia, 'Times New Roman', serif";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** The open page's surface: it dips into the gutter and rises towards the fore-edge. */
const restY = (s: number) => T + 0.15 * (1 - Math.exp(-5 * s));
const rand = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

/**
 * The sign-in centrepiece: an open ledger. Its leaves are real bending sheets that curl from the
 * corner and fan over one another; focusing the form turns them to the register page, where the
 * username is inked as it is typed and the password appears as dots. A failed attempt runs the
 * ink red and lifts the top leaves once; success stamps the role's wax seal and gilds the air.
 */
export function LedgerScene(props: LedgerProps) {
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });

  const ref = useThreeScene(({ THREE, scene, renderer, pointer, reduce }) => {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);

    scene.add(new THREE.AmbientLight(0xffe9cc, 0.45));
    const key = new THREE.DirectionalLight(0xffe2bd, 1.9);
    key.position.set(-3.2, 6.5, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 16 });
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    key.shadow.camera.updateProjectionMatrix();
    scene.add(key);
    const candle = new THREE.PointLight(0xffb066, 1.2, 0, 0);
    candle.position.set(-3.4, 2.2, -1.6);
    scene.add(candle);
    const rim = new THREE.DirectionalLight(0x8fa3c7, 0.45);
    rim.position.set(3, 2, -5);
    scene.add(rim);
    const glow = new THREE.PointLight(0xd9b45f, 0, 0, 0);
    glow.position.set(SEAL.x, 1.1, SEAL.z);
    scene.add(glow);

    const book = new THREE.Group();
    scene.add(book);

    // --- textures -----------------------------------------------------------------------------
    const PW = 768;
    const PH = Math.round((PW * D) / W);
    const canvasTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d")!;
      draw(g);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return Object.assign(tex, { g });
    };
    /** Paper with fibres, a soft vignette and the gutter's shade on the given side. */
    const paper = (g: CanvasRenderingContext2D, gutter: "left" | "right", seed: number) => {
      g.fillStyle = PAPER;
      g.fillRect(0, 0, PW, PH);
      g.strokeStyle = "rgba(120,95,60,0.07)";
      for (let i = 0; i < 260; i++) {
        const x = ((rand(i, seed) + 1) / 2) * PW;
        const y = ((rand(i, seed + 1) + 1) / 2) * PH;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + rand(i, seed + 2) * 14, y + rand(i, seed + 3) * 14);
        g.stroke();
      }
      const v = g.createRadialGradient(PW / 2, PH / 2, PH * 0.25, PW / 2, PH / 2, PH * 0.75);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(120,85,40,0.22)");
      g.fillStyle = v;
      g.fillRect(0, 0, PW, PH);
      const gx = gutter === "left" ? 0 : PW;
      const sh = g.createLinearGradient(gx, 0, gutter === "left" ? 90 : PW - 90, 0);
      sh.addColorStop(0, "rgba(70,50,25,0.35)");
      sh.addColorStop(1, "rgba(70,50,25,0)");
      g.fillStyle = sh;
      g.fillRect(0, 0, PW, PH);
    };
    const smallCaps = (
      g: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      size: number,
      align: CanvasTextAlign = "left",
    ) => {
      g.font = `600 ${size}px ${SERIF}`;
      g.textAlign = align;
      g.fillStyle = GILT;
      if ("letterSpacing" in g) (g as { letterSpacing: string }).letterSpacing = `${size * 0.18}px`;
      g.fillText(text.toUpperCase(), x, y);
      if ("letterSpacing" in g) (g as { letterSpacing: string }).letterSpacing = "0px";
    };
    /** Pseudo-handwriting: rows of word strokes, for the pages that only set the mood. */
    const manuscript = (g: CanvasRenderingContext2D, gutter: "left" | "right", seed: number) => {
      paper(g, gutter, seed);
      g.fillStyle = "rgba(60,42,25,0.28)";
      for (let row = 0; row < 26; row++) {
        let x = 80 + (row === 0 ? 60 : 0);
        const y = 120 + row * 34;
        while (x < PW - 90) {
          const w = 18 + ((rand(row * 31 + x, seed) + 1) / 2) * 60;
          g.fillRect(x, y, Math.min(w, PW - 90 - x), 3);
          x += w + 12;
        }
      }
      g.font = `italic 22px ${SERIF}`;
      g.textAlign = "center";
      g.fillText(String(seed * 2 + 3), PW / 2, PH - 50);
    };

    const drawFront = (g: CanvasRenderingContext2D) => {
      paper(g, "left", 11);
      g.strokeStyle = GILT;
      g.lineWidth = 3;
      g.strokeRect(60, 60, PW - 120, PH - 120);
      g.lineWidth = 1;
      g.strokeRect(74, 74, PW - 148, PH - 148);
      // a sixteen-point star as the house emblem
      g.fillStyle = GILT;
      g.beginPath();
      for (let k = 0; k < 32; k++) {
        const r = k % 2 ? 18 : k % 4 === 0 ? 70 : 42;
        const a = (k / 32) * Math.PI * 2 - Math.PI / 2;
        g.lineTo(PW / 2 + r * Math.cos(a), 330 + r * Math.sin(a));
      }
      g.fill();
      g.fillStyle = INK;
      g.font = `56px ${SERIF}`;
      g.textAlign = "center";
      const words = live.current.labels.title.split(" ");
      const half = Math.ceil(words.length / 2);
      g.fillText(words.slice(0, half).join(" "), PW / 2, 540);
      g.fillText(words.slice(half).join(" "), PW / 2, 610);
      g.font = `40px ${SERIF}`;
      g.fillStyle = GILT;
      g.fillText("❦", PW / 2, 720);
    };
    const frontispiece = canvasTexture(PW, PH, drawFront);
    const endpaper = canvasTexture(PW, PH, (g) => {
      g.fillStyle = "#e9dfc6";
      g.fillRect(0, 0, PW, PH);
      for (let s = 0; s < 70; s++) {
        g.strokeStyle = ["#7a3b32", "#2f3f6a", "#b08d57", "#2f5a46"][s % 4];
        g.globalAlpha = 0.35;
        g.lineWidth = 3 + (s % 5) * 2;
        g.beginPath();
        for (let y = 0; y <= PH; y += 12) {
          const x = (s / 70) * PW + Math.sin(y * 0.012 + s) * 40 * rand(s, 1) + rand(s, 2) * 20;
          if (y === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
    });
    const drawWelcome = (g: CanvasRenderingContext2D) => {
      paper(g, "right", 21);
      g.fillStyle = INK;
      g.font = `italic 54px ${SERIF}`;
      g.textAlign = "center";
      g.fillText(live.current.labels.welcome, PW / 2, 190, PW - 160);
      g.font = `italic 24px ${SERIF}`;
      g.fillStyle = GILT;
      g.fillText(
        new Date().toLocaleDateString(document.documentElement.lang || undefined, {
          dateStyle: "long",
        }),
        PW / 2,
        240,
      );
      // a compass rose in sepia ink
      const cx = PW / 2;
      const cy = 560;
      g.strokeStyle = "rgba(60,42,25,0.75)";
      g.lineWidth = 2;
      for (const r of [170, 150, 60]) {
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.stroke();
      }
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const r = k % 4 === 0 ? 200 : k % 2 ? 110 : 150;
        g.fillStyle = k % 2 ? "rgba(60,42,25,0.5)" : "rgba(60,42,25,0.85)";
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        g.lineTo(cx + Math.cos(a + 0.2) * 22, cy + Math.sin(a + 0.2) * 22);
        g.lineTo(cx, cy);
        g.closePath();
        g.fill();
      }
      g.fillStyle = "rgba(60,42,25,0.22)";
      for (let row = 0; row < 6; row++)
        g.fillRect(110, 830 + row * 30, PW - 220 - (row % 3) * 70, 3);
    };
    const welcome = canvasTexture(PW, PH, drawWelcome);
    // the printed pages follow the UI language
    let printed = live.current.labels.title + live.current.labels.welcome;
    const reprint = () => {
      const sig = live.current.labels.title + live.current.labels.welcome;
      if (sig === printed) return;
      printed = sig;
      drawFront(frontispiece.g);
      drawWelcome(welcome.g);
      frontispiece.needsUpdate = welcome.needsUpdate = true;
    };
    welcome.wrapS = THREE.RepeatWrapping;
    welcome.repeat.x = -1; // seen from the leaf's back
    welcome.offset.x = 1;

    // the register page, redrawn whenever the form changes
    const register = canvasTexture(PW, PH, () => {});
    let drawn = "";
    const drawRegister = (ember: boolean) => {
      const { name, secretLength, focus, labels } = live.current;
      const sig = [name, secretLength, focus, ember, labels.heading].join("|");
      if (sig === drawn) return;
      drawn = sig;
      const g = register.g;
      paper(g, "left", 31);
      smallCaps(g, labels.heading, PW / 2, 120, 30, "center");
      g.strokeStyle = GILT;
      g.lineWidth = 1.5;
      for (const y of [140, 147]) {
        g.beginPath();
        g.moveTo(160, y);
        g.lineTo(PW - 160, y);
        g.stroke();
      }
      const ink = ember ? EMBER_INK : INK;
      const line = (label: string, y: number, on: boolean) => {
        smallCaps(g, label, 90, y - 80, 22);
        g.save();
        if (on) {
          g.shadowColor = "rgba(217,180,95,0.9)";
          g.shadowBlur = 14;
        }
        g.strokeStyle = on ? "#c99a3c" : "rgba(60,42,25,0.45)";
        g.lineWidth = on ? 3.5 : 1.5;
        g.beginPath();
        g.moveTo(90, y);
        g.lineTo(PW - 80, y);
        g.stroke();
        g.restore();
      };
      line(labels.name, 420, focus === "name");
      line(labels.secret, 620, focus === "secret");
      // the name in a flowing italic, shrunk to fit the line
      g.fillStyle = ink;
      g.textAlign = "left";
      let size = 62;
      g.font = `italic ${size}px ${SERIF}`;
      while (size > 26 && g.measureText(name).width > PW - 200)
        g.font = `italic ${(size -= 4)}px ${SERIF}`;
      g.fillText(name, 104, 405);
      for (let i = 0; i < Math.min(secretLength, 18); i++) {
        g.beginPath();
        g.arc(110 + i * 32, 596, 8 + rand(i, 4) * 1.2, 0, Math.PI * 2);
        g.fill();
      }
      // where the seal will land
      const sx = (SEAL.x / W) * PW;
      const sy = ((SEAL.z + D / 2) / D) * PH;
      const sr = (SEAL.r / W) * PW * 1.1;
      g.save();
      g.setLineDash([6, 8]);
      g.strokeStyle = "rgba(138,106,47,0.6)";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(sx, sy, sr, 0, Math.PI * 2);
      g.stroke();
      g.restore();
      smallCaps(g, labels.seal, sx, sy + sr + 40, 18, "center");
      g.font = `40px ${SERIF}`;
      g.fillStyle = GILT;
      g.textAlign = "center";
      g.fillText("❦", 170, sy + 10);
      register.needsUpdate = true;
    };
    drawRegister(false);
    const pages = [0, 1, 2, 3, 4].map((i) =>
      canvasTexture(PW, PH, (g) => manuscript(g, "left", i + 2)),
    );

    // leather grain for the boards
    const grain = canvasTexture(256, 256, (g) => {
      const img = g.createImageData(256, 256);
      for (let i = 0; i < 256 * 256; i++) {
        const v = 128 + rand(i, 3) * 40 + rand(i >> 3, 5) * 30;
        img.data.set([v, v, v, 255], i * 4);
      }
      g.putImageData(img, 0, 0);
    });
    grain.colorSpace = THREE.NoColorSpace;
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(3, 3);
    const edges = canvasTexture(256, 32, (g) => {
      g.fillStyle = "#d9c79c";
      g.fillRect(0, 0, 256, 32);
      g.strokeStyle = "rgba(90,70,40,0.35)";
      for (let y = 1; y < 32; y += 2) {
        g.beginPath();
        g.moveTo(0, y + rand(y, 1) * 0.5);
        g.lineTo(256, y + rand(y, 2) * 0.5);
        g.stroke();
      }
    });

    // --- the book -----------------------------------------------------------------------------
    const leather = new THREE.MeshStandardMaterial({
      color: 0x4a1f1c,
      roughness: 0.6,
      bumpMap: grain,
      bumpScale: 0.8,
    });
    const gilt = new THREE.MeshStandardMaterial({
      color: 0xd9b45f,
      metalness: 0.85,
      roughness: 0.3,
    });
    const edgeMat = new THREE.MeshStandardMaterial({ map: edges, roughness: 0.85 });
    const paperMat = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.9 });
    for (const side of [-1, 1]) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, 0.05, D + 0.16), leather);
      board.position.set(side * (W / 2 + 0.04), -0.025, 0);
      board.receiveShadow = true;
      board.castShadow = true;
      // gilt fillet along the board's edge
      const fillet = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.006, 0.02), gilt);
      for (const z of [-1, 1]) {
        const f = fillet.clone();
        f.position.set(side * (W / 2 + 0.04), 0.003, z * (D / 2 + 0.05));
        book.add(f);
      }
      const block = new THREE.Mesh(new THREE.BoxGeometry(W - 0.03, T, D - 0.02), [
        edgeMat,
        edgeMat,
        paperMat,
        paperMat,
        edgeMat,
        edgeMat,
      ]);
      block.position.set(side * (W / 2 - 0.01), T / 2, 0);
      block.receiveShadow = true;
      book.add(board, block);
    }
    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, D + 0.16, 24, 1, true, -Math.PI / 2, Math.PI),
      leather,
    );
    spine.rotation.x = Math.PI / 2;
    spine.position.y = 0.04;
    book.add(spine);
    const ribbonGeo = new THREE.PlaneGeometry(1, 1, 1, RIB);
    {
      const pos = ribbonGeo.attributes.position;
      const x0 = (RIB_SEG * W) / SEG_X;
      const x1 = ((RIB_SEG + 1) * W) / SEG_X;
      // both edges sit on mesh vertices of the page, so the strip is the page's own chord lifted
      const y0 = restY(x0) + EPS / 2;
      const y1 = restY(x1) + EPS / 2;
      const mid = (y0 + y1) / 2;
      // flat = 1 follows the page's slope, 0 lies level (the hanging end untwists)
      const row = (r: number, dx: number, y: number, z: number, flat: number) => {
        pos.setXYZ(r * 2, x0 + dx, y + mid + (y0 - mid) * flat, z);
        pos.setXYZ(r * 2 + 1, x1 + dx, y + mid + (y1 - mid) * flat, z);
      };
      row(0, 0, 0, -D / 2 + 0.12, 1);
      row(1, 0, 0, D / 2, 1);
      // over the tail edge: flat at first to clear the text block and the board, then falling
      // to the table
      const du = RIB_TAIL / (RIB - 1);
      let y = 0;
      let z = D / 2;
      for (let r = 2; r <= RIB; r++) {
        const u = clamp01(((r - 1.5) * du) / RIB_CURL);
        const a = RIB_DROP * u * u * (3 - 2 * u);
        const resting = mid + y - Math.sin(a) * du <= TABLE_Y;
        y = resting ? TABLE_Y - mid : y - Math.sin(a) * du;
        z += (resting ? 1 : Math.cos(a)) * du;
        const loose = (r - 1) / (RIB - 1);
        row(r, 0.1 * loose * loose, y, z, Math.max(0, 1 - (r - 1) / 5));
      }
      ribbonGeo.computeVertexNormals();
    }
    const ribbon = new THREE.Mesh(
      ribbonGeo,
      new THREE.MeshStandardMaterial({ color: 0x8c2f2f, roughness: 0.5, side: THREE.DoubleSide }),
    );
    ribbon.receiveShadow = true;
    book.add(ribbon);

    /** A page surface lying on one side of the gutter (side 1 right, -1 left). */
    const restPage = (side: 1 | -1, map: THREE_NS.Texture) => {
      const geo = new THREE.PlaneGeometry(W, D, SEG_X, 1);
      geo.rotateX(-Math.PI / 2);
      geo.translate((side * W) / 2, 0, 0);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, restY(Math.abs(pos.getX(i))));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 0.92 }));
      m.receiveShadow = true;
      book.add(m);
      return m;
    };
    restPage(1, register);
    restPage(-1, endpaper);

    // the loose leaves: leaf 0 lies on top of the right stack and turns first
    const leaves = Array.from({ length: K }, (_, i) => {
      const geo = new THREE.PlaneGeometry(W, D, SEG_X, SEG_Z);
      geo.rotateX(-Math.PI / 2);
      geo.translate(W / 2, 0, 0);
      const base = Float32Array.from(geo.attributes.position.array as Float32Array);
      const front = i === 0 ? frontispiece : pages[i % pages.length];
      const back = i === K - 1 ? welcome : pages[(i + 2) % pages.length];
      const mats = [
        new THREE.MeshStandardMaterial({ map: front, roughness: 0.9, side: THREE.FrontSide }),
        new THREE.MeshStandardMaterial({ map: back, roughness: 0.9, side: THREE.BackSide }),
      ];
      const meshes = mats.map((m) => {
        const mesh = new THREE.Mesh(geo, m);
        mesh.castShadow = true;
        book.add(mesh);
        return mesh;
      });
      return { geo, base, meshes, p: 0, from: 0, to: 0, start: 0, dir: 1 as 1 | -1 };
    });

    const ds = W / SEG_X;
    /** Bends leaf i to turn progress pe (0 right, 1 left) with its free edge trailing behind. */
    const shapeLeaf = (i: number, pe: number, dir: 1 | -1, flutter: number) => {
      const { geo, base } = leaves[i];
      const pos = geo.attributes.position;
      const theta = Math.PI * pe;
      const swing = Math.sin(Math.PI * pe);
      const wR = clamp01(1 - pe / 0.22) ** 2;
      const wL = clamp01(1 - (1 - pe) / 0.22) ** 2;
      const lift = (K - i) * EPS * (1 - pe) + (i + 1) * EPS * pe;
      for (let iz = 0; iz <= SEG_Z; iz++) {
        const z = base[iz * (SEG_X + 1) * 3 + 2];
        const zN = z / (D / 2);
        // the near corner is the one being lifted, so it leads and the far corner trails
        const lag = (swing * (0.95 - 0.35 * zN) + flutter * (1 + zN * 0.3)) * dir;
        let x = 0;
        let y = T + lift;
        for (let ix = 0; ix <= SEG_X; ix++) {
          const s = ix * ds;
          const idx = iz * (SEG_X + 1) + ix;
          const ry = restY(s) + lift;
          // the sheet keeps the page's curve while it lies flat-ish, and never sinks into a stack
          const cy = y + (restY(s) - T) * Math.abs(Math.cos(theta));
          const px = x * (1 - wR - wL) + s * wR - s * wL;
          const py = Math.max(cy * (1 - wR - wL) + ry * (wR + wL), restY(Math.abs(px)) + lift);
          pos.setXYZ(idx, px, py, z);
          const phi = theta - lag * (s / W) ** 1.6;
          x += ds * Math.cos(phi);
          y += ds * Math.sin(phi);
        }
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };

    // the wax seal: a disc with the role's emblem embossed on top
    const emblem = (kind: SealKind) =>
      canvasTexture(256, 256, (g) => {
        const { hi, lo, edge } = WAX[kind];
        const r = g.createRadialGradient(110, 100, 10, 128, 128, 128);
        r.addColorStop(0, hi);
        r.addColorStop(1, lo);
        g.fillStyle = r;
        g.fillRect(0, 0, 256, 256);
        const { strokes, dots = [] } = SEALS[kind];
        const stroke = (dx: number, color: string) => {
          g.strokeStyle = color;
          g.fillStyle = color;
          g.lineWidth = 6;
          g.lineJoin = "round";
          g.lineCap = "round";
          g.save();
          g.translate(dx, dx);
          g.beginPath();
          g.arc(SEAL_RING.cx, SEAL_RING.cy, SEAL_RING.r, 0, Math.PI * 2);
          g.stroke();
          g.beginPath();
          for (const [first, ...rest] of strokes) {
            g.moveTo(...first);
            for (const p of rest) g.lineTo(...p);
          }
          g.stroke();
          for (const [x, y] of dots) {
            g.beginPath();
            g.arc(x, y, 9, 0, Math.PI * 2);
            g.fill();
          }
          g.restore();
        };
        stroke(3, "rgba(10,5,5,0.6)");
        stroke(-2, edge);
      });
    const emblems = {
      student: emblem("student"),
      teacher: emblem("teacher"),
      admin: emblem("admin"),
    };
    const wax = new THREE.MeshStandardMaterial({
      color: 0x8c1f1a,
      roughness: 0.35,
      metalness: 0.05,
    });
    const sealTop = new THREE.MeshStandardMaterial({ map: emblems.student, roughness: 0.4 });
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(SEAL.r, SEAL.r * 1.07, 0.06, 48), [
      wax,
      sealTop,
      wax,
    ]);
    seal.castShadow = true;
    seal.visible = false;
    book.add(seal);
    const sealRestY = restY(SEAL.x) + 0.03;

    // contact shadow under the book
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 5),
      new THREE.MeshBasicMaterial({
        map: canvasTexture(128, 128, (g) => {
          const r = g.createRadialGradient(64, 64, 10, 64, 64, 64);
          r.addColorStop(0, "rgba(0,0,0,0.55)");
          r.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = r;
          g.fillRect(0, 0, 128, 128);
        }),
        transparent: true,
        depthWrite: false,
      }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = -0.06;
    book.add(contact);

    // dust motes drifting through the lamplight
    const MOTES = 180;
    const motePos = new Float32Array(MOTES * 3);
    const moteMat = new THREE.PointsMaterial({
      color: 0xffe0a8,
      size: 0.035,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
    const motes = new THREE.Points(moteGeo, moteMat);
    motes.frustumCulled = false;
    scene.add(motes);

    // --- state --------------------------------------------------------------------------------
    let spread = 0; // leaves turned to the left
    let clock = 0;
    let shakeSeen = live.current.shake;
    let jolt = 0;
    let ember = 0;
    let rebuffAt = -Infinity; // when the last failed attempt landed
    let warmth = 0;
    let stamp = -1; // seconds since the seal started to fall, -1 = not yet
    let typed = live.current.name.length + live.current.secretLength;
    let flick = 0;
    let aspect = 1;
    const look = new THREE.Vector3(0, 0, 0.5);
    const lookTo = new THREE.Vector3();
    const offset = new THREE.Vector3();

    const turnTo = (m: number) => {
      if (m === spread) return;
      const forward = m > spread;
      const order = forward
        ? [...leaves.keys()].slice(spread, m)
        : [...leaves.keys()].slice(m, spread).reverse();
      order.forEach((i, n) => {
        const leaf = leaves[i];
        leaf.from = leaf.p;
        leaf.to = forward ? 1 : 0;
        leaf.dir = forward ? 1 : -1;
        leaf.start = clock + (reduce ? 0 : n * STAGGER);
      });
      spread = m;
    };
    leaves.forEach((_, i) => shapeLeaf(i, 0, 1, 0));

    return {
      camera,
      resize(w, h) {
        aspect = w / h;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      },
      update(time, delta) {
        const { name, secretLength, focus, busy, lit, seal: kind, shake } = live.current;
        clock += delta;
        const k = reduce ? 1 : 1 - Math.exp(-delta * 3);

        if (shake !== shakeSeen) {
          shakeSeen = shake;
          jolt = 1;
          ember = 1;
          rebuffAt = clock;
        }
        jolt = Math.max(0, jolt - delta * 2.4);
        ember = Math.max(0, ember - delta * 0.7);
        const n = name.length + secretLength;
        if (n !== typed) {
          flick = Math.min(1, flick + 0.6);
          typed = n;
        }
        flick = Math.max(0, flick - delta * 2.5);

        // the register opens as soon as the form is touched and stays open through a failure:
        // no leaf turns back for it, the top two only lift and fall once (below)
        const open = !!(focus || name || secretLength || busy || lit);
        turnTo(open ? K : 0);
        const rebuff = clamp01((clock - rebuffAt) / REBUFF);
        drawRegister(ember > 0.3);
        reprint();

        leaves.forEach((leaf, i) => {
          const u = reduce ? 1 : clamp01((clock - leaf.start) / TURN);
          leaf.p = leaf.from + (leaf.to - leaf.from) * ease(u);
          // ambient life: the top leaf of each stack breathes; typing lifts the left one; a
          // request in flight makes the whole left stack rustle
          const topRight = i === spread && leaf.p === 0;
          const topLeft = i === spread - 1 && leaf.p === 1;
          let flutter = 0;
          let pe = leaf.p;
          if (!reduce) {
            if (topRight) pe += 0.006 * (1 + Math.sin(time * 1.4));
            if (topLeft) pe -= 0.006 * (1 + Math.sin(time * 1.2)) + flick * 0.035;
            // one phase for both, the upper further, so the stack never reorders
            if (rebuff < 1 && leaf.p === 1 && i >= spread - 2)
              pe -= (i === spread - 1 ? 0.14 : 0.07) * Math.sin(Math.PI * rebuff) ** 2;
            // higher leaves lift further in one phase, so the stack never reorders
            if (busy && leaf.p === 1) pe -= ((0.025 * (i + 1)) / K) * (1 + Math.sin(time * 9));
            if (leaf.p > 0 && leaf.p < 1) flutter = Math.sin(time * 7 + i) * 0.04;
          }
          shapeLeaf(i, clamp01(pe), leaf.dir, flutter);
        });

        // success: the seal drops, squashes and settles; the book glows
        warmth += ((lit ? 1 : 0) - warmth) * k;
        if (lit && stamp < 0) {
          stamp = 0;
          sealTop.map = emblems[kind];
          sealTop.needsUpdate = true;
          wax.color.setHex(WAX[kind].side);
          seal.visible = true;
        }
        if (stamp >= 0) {
          stamp += delta;
          const u = reduce ? 1 : clamp01(stamp / 0.55);
          const drop = (1 - ease(Math.min(1, u * 1.3))) * 1.2;
          const squash = u > 0.7 ? 1 - Math.sin(((u - 0.7) / 0.3) * Math.PI) * 0.25 : 1;
          seal.position.set(SEAL.x, sealRestY + drop, SEAL.z);
          seal.scale.set(1 + (1 - squash) * 0.5, squash, 1 + (1 - squash) * 0.5);
          seal.rotation.y = (1 - u) * 1.2;
        }
        glow.intensity = warmth * 2.4 + (busy && !reduce ? 0.5 + 0.5 * Math.sin(time * 6) : 0);

        // lamplight flicker; dust rises faster and gilds on success
        candle.intensity =
          1.2 +
          (reduce ? 0 : Math.sin(time * 7.3) * 0.06 + Math.sin(time * 13.1) * 0.04) +
          warmth * 0.6;
        for (let i = 0; i < MOTES; i++) {
          const speed = 0.05 + ((rand(i, 3) + 1) / 2) * 0.08 + warmth * 0.25;
          const y = ((((rand(i, 2) + 1) / 2) * 3.2 + (reduce ? 0 : time * speed)) % 3.2) + 0.15;
          motePos[i * 3] = rand(i, 1) * 3.4 + (reduce ? 0 : Math.sin(time * 0.4 + i) * 0.12);
          motePos[i * 3 + 1] = y;
          motePos[i * 3 + 2] =
            rand(i, 4) * 2.2 + (reduce ? 0 : Math.cos(time * 0.3 + i * 1.3) * 0.12);
        }
        moteGeo.attributes.position.needsUpdate = true;
        moteMat.opacity = 0.45 + warmth * 0.4;
        moteMat.color.setRGB(1, 0.88 - ember * 0.4, 0.66 - ember * 0.4);

        // camera: leans towards the focused line, pulls back while signing in, settles on the seal
        if (lit) lookTo.set(SEAL.x * 0.6, 0, SEAL.z * 0.6);
        else if (focus === "name") lookTo.set(0.7, 0, -0.3);
        else if (focus === "secret") lookTo.set(0.7, 0, 0.15);
        else lookTo.set(0, 0, 0.45);
        const closer = lit ? 0.9 : focus ? 0.88 : busy ? 1.04 : 1;
        look.lerp(lookTo, reduce ? 1 : 1 - Math.exp(-delta * 2));
        offset.set(0, 6.4, 5.6).multiplyScalar((aspect < 0.85 ? 1.25 : 1) * closer);
        camera.position.lerp(offset.add(look), reduce ? 1 : 1 - Math.exp(-delta * 2));
        camera.lookAt(look);

        book.rotation.y = -0.12 + pointer.x * 0.12 + (reduce ? 0 : Math.sin(time * 0.25) * 0.02);
        book.rotation.x = -pointer.y * 0.05;
        book.position.x = reduce ? 0 : Math.sin(time * 48) * 0.1 * jolt;
        book.position.y = warmth * 0.08;
      },
    };
  });

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
