import { useEffect, useMemo, useRef, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import type * as THREE_NS from "three";
import { useThreeScene } from "./useThreeScene";

/** One spread of the book: the course dossier on the left page, its syllabus on the right. */
export interface BookPage {
  key: string;
  no: number;
  total: number;
  title: string;
  category: string;
  subCategory?: string;
  /** Already translated, e.g. "Başlangıç". */
  level?: string;
  description?: string;
  instructor: string;
  /** A line under the instructor's name: their branches. */
  instructorNote?: string;
  /** The instructor's biography. */
  instructorBio?: string;
  /** Absolute URL of the instructor's photo; their initials stand in until it loads. */
  instructorPhoto?: string;
  capacity?: number;
  lessons?: { title: string; description?: string | null }[];
  price: string;
}

export interface BookStrings {
  instructor: string;
  catalog: string;
  syllabus: string;
  lessons: (count: number) => string;
  capacity: string;
  refund: string;
  cta: string;
  soon: string;
}

/** The book's printed labels in the current language. */
export function useBookStrings(): BookStrings {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      instructor: t("guest.instructor"),
      catalog: t("guest.bookCatalog"),
      syllabus: t("guest.bookSyllabus"),
      lessons: (count: number) => t("guest.bookLessons", { count }),
      capacity: t("guest.bookCapacity"),
      refund: t("guest.bookRefund"),
      cta: t("guest.bookCta"),
      soon: t("guest.bookSoon"),
    }),
    [t],
  );
}

type Pick = "prev" | "next" | "open" | null;

const SEG = 28;
const W = 1.6; // page width, spine to edge
const H = 2.2;
const CW = 1024; // canvas size keeps the page's 1.6 : 2.2 ratio
const CH = 1408;
const FLIP = 0.9; // seconds for one unhurried turn
const STAGGER = 0.075; // seconds between sheets launched together (a jump or fast clicks)
const FACE_CAP = 8; // page textures kept on the GPU; hidden ones beyond this are freed
// Heights: static pages < every sheet. Sheets rest SHEET apart, so the right stack thins and
// the left one thickens as the reader moves through the book. Every sheet hinges at x = 0.
const PAGE_Y = 0.018;
const SHEET = 0.004;
// The one bookmark ribbon lies on the recto of its spread b (the front of sheet b, or the last
// page), beside the hinge, RIB_UP off the paper: half way to the next sheet, so the sheets that
// close over spread b cover it and only the end hanging past the tail edge (z > H / 2) shows.
// It sits inside the sheet's first segment, so it follows that segment through a turn exactly.
const RIB_W = 0.044;
const RIB_GAP = 0.008; // from the hinge to the ribbon's near edge
const RIB_UP = SHEET / 2;
const RIB_DROP = 0.7; // seconds it takes to settle into a newly marked spread
const RIB = 24; // ribbon rows: head of the page, tail edge of the page, then the hanging end
const TAIL = 0.5; // how far the ribbon hangs past the tail edge
const DROP = 1.2; // angle of the hanging end, radians below the page plane
const CURL_LEN = 0.16; // length over which it bends from flat to DROP, clearing the cover
const TABLE_Y = -0.116; // just above the contact shadow: the end comes to rest there
const SPRING = 26; // tail swing stiffness, ~0.8 Hz
const DAMP = 5.6; // damping ratio ~0.55: one soft overshoot, then still
const DRAG = 3; // how hard turning sheets pull the tail along
console.assert(
  RIB_GAP + RIB_W < W / SEG && RIB_UP < SHEET,
  "BookScene: the ribbon must lie on the first segment of its sheet, under the next sheet",
);

const INK = "#262a33";
const MUTED = "#6f6a5f";
const GOLD = "#9c7a30";
const PAPER = "#f6f1e6";
const SANS = '"Inter", system-ui, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';
const MONO = '"JetBrains Mono", monospace';
const M = 84; // page margin, canvas px
const IN = M + 24; // margin on the spine side
// the "join" button printed on the right page; a click inside it starts enrolment
const CTA = { x: CW - M - 360, y: CH - 214, w: 360, h: 92 };

/** Cubic in-out: the sheet peels off slowly, sweeps across, then settles. */
const ease = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

const pad = (n: number) => String(n).padStart(2, "0");

function wrap(g: CanvasRenderingContext2D, text: string, max: number, lines: number) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > max && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  if (lines > 0 && out.length > lines) {
    out.length = lines;
    let last = out[lines - 1];
    while (last && g.measureText(`${last}…`).width > max) last = last.replace(/\s*\S+$/, "");
    out[lines - 1] = `${last}…`;
  }
  return lines > 0 ? out : [];
}

function paper(g: CanvasRenderingContext2D, spineAtLeft: boolean) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.textAlign = "left";
  g.globalAlpha = 1;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, CW, CH);
  // the gutter darkens toward the spine, with a tight crease where the two pages meet; that
  // shading is what makes two flat planes read as one bound spread
  const grad = g.createLinearGradient(spineAtLeft ? 0 : CW, 0, spineAtLeft ? 160 : CW - 160, 0);
  grad.addColorStop(0, "rgba(50,40,22,0.34)");
  grad.addColorStop(0.12, "rgba(60,50,30,0.14)");
  grad.addColorStop(1, "rgba(60,50,30,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, CW, CH);
}

function rule(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, alpha: number) {
  g.strokeStyle = INK;
  g.globalAlpha = alpha;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x0, y);
  g.lineTo(x1, y);
  g.stroke();
  g.globalAlpha = 1;
}

function caps(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 22,
  max = CW,
) {
  g.font = `500 ${size}px ${MONO}`;
  g.fillStyle = color;
  if ("letterSpacing" in g) (g as { letterSpacing: string }).letterSpacing = "3px";
  const [line = ""] = wrap(g, text.toLocaleUpperCase("tr"), max, 1);
  g.fillText(line, x, y);
  if ("letterSpacing" in g) (g as { letterSpacing: string }).letterSpacing = "0px";
}

// instructor photos, shared by every book: loaded once, CORS-clean so the canvas stays usable
// as a WebGL texture (a tainted canvas cannot be uploaded)
const photos = new Map<string, HTMLImageElement>();
const photoReady = new Set<string>();
function photo(url?: string) {
  if (!url) return undefined;
  if (!photos.has(url)) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    // a face's signature includes this, so it redraws on the next frame that shows it
    img.onload = () => photoReady.add(url);
    img.src = url;
    photos.set(url, img);
  }
  return photoReady.has(url) ? photos.get(url) : undefined;
}

/**
 * Wraps `text` at the first of `sizes` whose lines all fit in `height`; at the smallest size
 * the overflow is cut with an ellipsis. Leaves `g.font` set to the chosen size.
 */
function fit(
  g: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  sizes: number[],
  max: number,
  height: number,
  leading = 1.42,
) {
  for (const size of sizes) {
    g.font = font(size);
    const lines = wrap(g, text, max, Infinity);
    if (lines.length * size * leading <= height) return { lines, lh: size * leading };
  }
  const lh = sizes[sizes.length - 1] * leading;
  return { lines: wrap(g, text, max, Math.floor(height / lh)), lh };
}

function avatar(g: CanvasRenderingContext2D, page: BookPage, cx: number, cy: number, r: number) {
  const img = photo(page.instructorPhoto);
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fillStyle = img ? "#ece4d2" : INK;
  g.fill();
  if (img) {
    g.clip();
    g.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    const initials = page.instructor
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toLocaleUpperCase("tr");
    g.font = `${Math.round(r * 0.85)}px ${SERIF}`;
    g.fillStyle = PAPER;
    g.textAlign = "center";
    g.fillText(initials || "—", cx, cy + r * 0.3);
  }
  g.restore();
  g.strokeStyle = GOLD;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, r + 5, 0, Math.PI * 2);
  g.stroke();
}

/** Left page: the course dossier, then the instructor's card with photo, branches and bio. */
function drawVerso(g: CanvasRenderingContext2D, page: BookPage | undefined, s: BookStrings) {
  paper(g, false);
  const x0 = M;
  const x1 = CW - IN;
  if (!page) {
    for (let y = 140; y < CH - 80; y += 52) rule(g, x0, x1, y, 0.08);
    return;
  }
  caps(g, `E-Kurs — ${s.catalog}`, x0, 100, MUTED, 20, 520);
  g.font = `500 24px ${MONO}`;
  g.fillStyle = GOLD;
  g.textAlign = "right";
  g.fillText(`${pad(page.no)} / ${pad(page.total)}`, x1, 100);
  g.textAlign = "left";
  rule(g, x0, x1, 128, 0.5);

  // field on the left, level as an outlined badge on the right
  let badge = 0;
  if (page.level) {
    g.font = `500 20px ${MONO}`;
    const label = page.level.toLocaleUpperCase("tr");
    badge = g.measureText(label).width + 44;
    g.strokeStyle = GOLD;
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(x1 - badge, 158, badge, 40, 20);
    g.stroke();
    g.fillStyle = GOLD;
    g.fillText(label, x1 - badge + 22, 185);
  }
  const field = page.subCategory ? `${page.category} · ${page.subCategory}` : page.category;
  caps(g, field, x0, 188, GOLD, 22, x1 - x0 - badge - 24);

  g.font = `72px ${SERIF}`;
  g.fillStyle = INK;
  let y = 290;
  const title = wrap(g, page.title, x1 - x0, 2);
  title.forEach((l, k) => g.fillText(l, x0, y + k * 78));
  y += (title.length - 1) * 78;
  g.fillStyle = GOLD;
  g.fillRect(x0, y + 32, 96, 4);

  // the whole description, at the largest size that fits above the instructor card
  y += 104;
  const desc = fit(
    g,
    page.description ?? "",
    (n) => `${n}px ${SANS}`,
    [40, 36, 33, 30, 27, 25, 23],
    x1 - x0,
    CH - 500 - y + 24,
  );
  g.fillStyle = INK;
  g.globalAlpha = 0.86;
  desc.lines.forEach((l, k) => g.fillText(l, x0, y + k * desc.lh));
  g.globalAlpha = 1;

  // the instructor, as the course page introduces them
  rule(g, x0, x1, CH - 468, 0.6);
  caps(g, s.instructor, x0, CH - 424, MUTED, 20);
  avatar(g, page, x0 + 62, CH - 326, 62);
  const tx = x0 + 160;
  g.font = `50px ${SERIF}`;
  g.fillStyle = INK;
  g.fillText(wrap(g, page.instructor || "—", x1 - tx, 1)[0] ?? "", tx, CH - 336);
  if (page.instructorNote) {
    g.font = `24px ${SANS}`;
    g.fillStyle = GOLD;
    g.fillText(wrap(g, page.instructorNote, x1 - tx, 1)[0] ?? "", tx, CH - 292);
  }
  if (page.instructorBio) {
    const bio = fit(
      g,
      page.instructorBio,
      (n) => `${n}px ${SANS}`,
      [26, 24, 22],
      x1 - x0,
      CH - 132 - (CH - 230) + 26,
    );
    g.fillStyle = MUTED;
    bio.lines.forEach((l, k) => g.fillText(l, x0, CH - 220 + k * bio.lh));
  }

  rule(g, x0, x1, CH - 112, 0.2);
  if (page.capacity) caps(g, `${s.capacity} · ${page.capacity}`, x0, CH - 66, MUTED, 20);
  g.font = `600 30px ${SANS}`;
  const w = g.measureText(page.price).width + 48;
  g.strokeStyle = GOLD;
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(x1 - w, CH - 98, w, 52, 26);
  g.stroke();
  g.fillStyle = INK;
  g.fillText(page.price, x1 - w + 24, CH - 61);
}

type Lesson = NonNullable<BookPage["lessons"]>[number];
// title size, description size, description lines: tried in order until the syllabus fits
const SYLLABUS: [number, number, number][] = [
  [44, 26, 3],
  [40, 24, 2],
  [36, 22, 2],
  [33, 21, 1],
  [30, 20, 0],
];
const LESSON_GAP = 48; // between lessons, a hairline rule in the middle

/** Lays out one lesson from `top`; draws it when `draw`, and returns its height either way. */
function lesson(
  g: CanvasRenderingContext2D,
  n: number,
  l: Lesson,
  [ts, ds, dl]: [number, number, number],
  x0: number,
  x1: number,
  top: number,
  draw: boolean,
) {
  const tx = x0 + 84;
  g.font = `${ts}px ${SERIF}`;
  const title = wrap(g, l.title, x1 - tx, 2);
  const tlh = ts * 1.12;
  g.font = `${ds}px ${SANS}`;
  const desc = dl && l.description ? wrap(g, l.description, x1 - tx, dl) : [];
  const dlh = ds * 1.42;
  if (draw) {
    let y = top + ts * 0.82;
    g.font = `500 ${Math.round(ts * 0.56)}px ${MONO}`;
    g.fillStyle = GOLD;
    g.fillText(pad(n), x0, y);
    g.font = `${ts}px ${SERIF}`;
    g.fillStyle = INK;
    title.forEach((t, k) => g.fillText(t, tx, y + k * tlh));
    y += (title.length - 1) * tlh + 10 + dlh;
    g.font = `${ds}px ${SANS}`;
    g.fillStyle = MUTED;
    desc.forEach((t, k) => g.fillText(t, tx, y + k * dlh));
  }
  return title.length * tlh + (desc.length ? 10 + desc.length * dlh : 0);
}

/** Right page: the numbered syllabus with each lesson's summary, then price and enrolment. */
function drawRecto(g: CanvasRenderingContext2D, page: BookPage | undefined, s: BookStrings) {
  paper(g, true);
  const x0 = IN;
  const x1 = CW - M;
  if (!page) {
    for (let y = 140; y < CH - 80; y += 52) rule(g, x0, x1, y, 0.08);
    return;
  }
  const lessons = page.lessons ?? [];
  caps(g, s.syllabus, x0, 100, GOLD, 22, 520);
  if (lessons.length) {
    g.font = `500 22px ${MONO}`;
    g.fillStyle = MUTED;
    g.textAlign = "right";
    g.fillText(s.lessons(lessons.length).toLocaleUpperCase("tr"), x1, 100);
    g.textAlign = "left";
  }
  rule(g, x0, x1, 128, 0.5);

  const top = 172;
  const bottom = CH - 336;
  if (!lessons.length) {
    g.font = `italic 44px ${SERIF}`;
    g.fillStyle = MUTED;
    g.fillText(s.soon, x0, top + 44);
  }
  // the largest type at which every lesson fits; past the smallest, the rest are counted
  const cfg =
    SYLLABUS.find(
      (c) =>
        lessons.reduce((h, l, i) => h + lesson(g, i + 1, l, c, x0, x1, 0, false), 0) +
          LESSON_GAP * (lessons.length - 1) <=
        bottom - top,
    ) ?? SYLLABUS[SYLLABUS.length - 1];
  let y = top;
  for (let i = 0; i < lessons.length; i++) {
    const h = lesson(g, i + 1, lessons[i], cfg, x0, x1, y, false);
    if (y + h > bottom) {
      caps(g, `+ ${s.lessons(lessons.length - i)}`, x0 + 84, y + 24, MUTED, 20);
      break;
    }
    lesson(g, i + 1, lessons[i], cfg, x0, x1, y, true);
    y += h + LESSON_GAP / 2;
    if (i < lessons.length - 1) rule(g, x0, x1, y, 0.12);
    y += LESSON_GAP / 2;
  }

  rule(g, x0, x1, CH - 300, 0.6);
  g.font = `96px ${SERIF}`;
  g.fillStyle = INK;
  g.fillText(page.price, x0, CH - 176);
  g.font = `24px ${SANS}`;
  g.fillStyle = MUTED;
  wrap(g, s.refund, CTA.x - x0 - 32, 2).forEach((l, k) => g.fillText(l, x0, CH - 118 + k * 34));
  g.fillStyle = INK;
  g.beginPath();
  g.roundRect(CTA.x, CTA.y, CTA.w, CTA.h, CTA.h / 2);
  g.fill();
  g.font = `600 30px ${SANS}`;
  g.fillStyle = PAPER;
  g.textAlign = "center";
  g.fillText(
    `${wrap(g, s.cta, CTA.w - 90, 1)[0] ?? ""} →`,
    CTA.x + CTA.w / 2,
    CTA.y + CTA.h / 2 + 11,
  );
  g.textAlign = "left";
}

/**
 * The catalogue as an open book. Spread k shows course k: its dossier on the left page and
 * its syllabus on the right. Between spreads lie real sheets, one per turn, each with its own
 * progress (0 = resting on the right stack, 1 = on the left). Moving to spread m sends every
 * sheet below m left and the rest right, launched a beat apart in physical order, so a jump
 * or quick clicks fan several pages through the air at once instead of skipping them.
 */
export function BookScene({
  pages,
  index,
  strings,
  bookmark = 0,
  onActivate,
  onTurn,
}: {
  pages: BookPage[];
  index: number;
  strings: BookStrings;
  /** The spread the ribbon marks; out of range hides it. */
  bookmark?: number;
  /** The button printed on the right page (join the current course). */
  onActivate?: () => void;
  /** Clicking the left or right page turns one spread back or forward. */
  onTurn?: (step: -1 | 1) => void;
}) {
  const live = useRef({ pages, index, strings, bookmark });
  useEffect(() => {
    live.current = { pages, index, strings, bookmark };
  }, [pages, index, strings, bookmark]);
  const pickRef = useRef<(x: number, y: number) => Pick>(() => null);

  const ref = useThreeScene(({ THREE, scene, renderer, pointer, raw, reduce }) => {
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    // high enough that both pages read almost face-on
    const eye = new THREE.Vector3(0, 6.2, 2.3).normalize();
    const look = new THREE.Vector3(0, 0, 0.06);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a998, 1.9));
    const sun = new THREE.DirectionalLight(0xfff8ee, 1.1);
    sun.position.set(-2.5, 5, 3);
    scene.add(sun);

    const book = new THREE.Group();
    scene.add(book);

    // a soft contact shadow grounds the book on the page
    const sc = document.createElement("canvas");
    sc.width = sc.height = 128;
    const sg = sc.getContext("2d")!;
    const rg = sg.createRadialGradient(64, 64, 4, 64, 64, 64);
    rg.addColorStop(0, "rgba(40,32,20,0.35)");
    rg.addColorStop(1, "rgba(40,32,20,0)");
    sg.fillStyle = rg;
    sg.fillRect(0, 0, 128, 128);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(sc),
      transparent: true,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.9, H * 1.5), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.12;
    book.add(shadow);

    const cover = new THREE.MeshStandardMaterial({ color: 0x2b303b, roughness: 0.7 });
    const blockMat = new THREE.MeshStandardMaterial({ color: 0xece4d2, roughness: 0.95 });
    const BLOCK_W = W - 0.01;
    const BLOCK_BOTTOM = -0.035;
    // the page blocks under each stack; their tops follow the stacks (see update)
    const blocks = [-1, 1].map((side) => {
      const board = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, 0.05, H + 0.1), cover);
      board.position.set(side * (W / 2 + 0.03), -0.06, 0);
      book.add(board);
      const b = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_W, 1, H - 0.04), blockMat);
      b.position.x = (side * BLOCK_W) / 2;
      book.add(b);
      return b;
    });
    const setBlock = (b: THREE_NS.Mesh, top: number) => {
      b.scale.y = top - BLOCK_BOTTOM;
      b.position.y = (top + BLOCK_BOTTOM) / 2;
    };

    // ---- page faces: canvases drawn on demand, at most FACE_CAP kept when hidden
    const anisotropy = renderer.capabilities.getMaxAnisotropy();
    type Face = {
      g: CanvasRenderingContext2D;
      tex: THREE_NS.CanvasTexture;
      sig: string;
      used: number;
    };
    const faces = new Map<string, Face>();
    let frame = 0;
    let fontEpoch = 0;
    // pages and strings are memoised by the caller, so object identity says when text changed;
    // a face is redrawn only then, when the fonts arrive, or when its instructor photo loads
    const ids = new WeakMap<object, number>();
    let nextId = 0;
    const idOf = (o: object) => {
      if (!ids.has(o)) ids.set(o, nextId++);
      return ids.get(o)!;
    };
    const sigOf = (page?: BookPage) =>
      page
        ? `${idOf(page)}:${idOf(live.current.strings)}:${fontEpoch}:${photoReady.has(page.instructorPhoto ?? "")}`
        : `blank${fontEpoch}`;
    /** Texture of the left ("v") or right ("r") page of spread i, drawn if stale. */
    const face = (kind: "v" | "r", i: number, mirror: boolean) => {
      const id = `${kind}${i}${mirror ? "m" : ""}`;
      let f = faces.get(id);
      if (!f) {
        const c = document.createElement("canvas");
        c.width = CW;
        c.height = CH;
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = anisotropy;
        if (mirror) {
          // a back face shows its texture mirrored; flip u so the page reads correctly
          tex.wrapS = THREE.RepeatWrapping;
          tex.repeat.x = -1;
        }
        f = { g: c.getContext("2d")!, tex, sig: "", used: 0 };
      }
      faces.delete(id); // re-insert: the map stays in least-recently-used order
      faces.set(id, f);
      f.used = frame;
      const page = live.current.pages[i];
      const sig = sigOf(page);
      if (f.sig !== sig) {
        (kind === "v" ? drawVerso : drawRecto)(f.g, page, live.current.strings);
        f.tex.needsUpdate = true;
        f.sig = sig;
      }
      return f.tex;
    };
    const mats: THREE_NS.MeshStandardMaterial[] = [];
    const show = (mat: THREE_NS.MeshStandardMaterial, tex: THREE_NS.Texture | null) => {
      if (mat.map === tex) return;
      mat.map = tex;
      mat.needsUpdate = true;
    };
    const evict = () => {
      for (const [id, f] of faces) {
        if (faces.size <= FACE_CAP) break;
        if (f.used === frame) continue;
        for (const m of mats) if (m.map === f.tex) show(m, null);
        f.tex.dispose();
        faces.delete(id);
      }
    };
    const dropFaces = () => {
      for (const m of mats) show(m, null);
      for (const f of faces.values()) f.tex.dispose();
      faces.clear();
    };

    const pageMat = (side: THREE_NS.Side = THREE.FrontSide, colors = false) => {
      const m = new THREE.MeshStandardMaterial({
        roughness: 0.92,
        side,
        vertexColors: colors,
        color: 0xffffff,
      });
      mats.push(m);
      return m;
    };
    // the first spread's left page and the last spread's right page never turn
    const staticPage = (x: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), pageMat());
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, PAGE_Y, 0);
      book.add(m);
      return m;
    };
    const firstVerso = staticPage(-W / 2);
    const lastRecto = staticPage(W / 2);

    // ---- sheets
    interface Sheet {
      geo: THREE_NS.PlaneGeometry;
      shade: Float32Array;
      front: THREE_NS.Mesh<THREE_NS.PlaneGeometry, THREE_NS.MeshStandardMaterial>;
      back: THREE_NS.Mesh<THREE_NS.PlaneGeometry, THREE_NS.MeshStandardMaterial>;
      p: number;
      from: number;
      to: number;
      start: number;
      dur: number;
      motion: 1 | -1;
      speed: number;
    }
    let sheets: Sheet[] = [];
    let shownKeys = "";
    let shownIndex = 0;
    let lastLaunch = -Infinity;
    let clock = 0;

    const makeSheet = (): Sheet => {
      const geo = new THREE.PlaneGeometry(W, H, SEG, 1);
      const shade = new Float32Array(geo.attributes.position.count * 3).fill(1);
      geo.setAttribute("color", new THREE.BufferAttribute(shade, 3));
      // the shape changes every frame; one sphere around the whole sweep keeps picking and
      // frustum culling right without recomputing it
      geo.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(0, 0, 0),
        Math.hypot(W, W, H / 2) + 0.1,
      );
      const front = new THREE.Mesh(geo, pageMat(THREE.FrontSide, true));
      const back = new THREE.Mesh(geo, pageMat(THREE.BackSide, true));
      book.add(front, back);
      return {
        geo,
        shade,
        front,
        back,
        p: 0,
        from: 0,
        to: 0,
        start: 0,
        dur: FLIP,
        motion: 1,
        speed: 0,
      };
    };
    const disposeSheet = (s: Sheet) => {
      book.remove(s.front, s.back);
      s.geo.dispose();
      for (const m of [s.front.material, s.back.material]) {
        mats.splice(mats.indexOf(m), 1);
        m.dispose();
      }
    };

    // resting heights: sheet 0 tops the right stack, the last sheet tops the left one
    const restRight = (j: number) => PAGE_Y + (sheets.length - j) * SHEET;
    const restLeft = (j: number) => PAGE_Y + (j + 1) * SHEET;

    const xs = new Float32Array(SEG + 1);
    const ys = new Float32Array(SEG + 1);
    /**
     * Lays a sheet along a curve hinged at height `yh`: `p` is how far it has turned, `motion`
     * the way it is moving and `speed` (0..1) how fast. The free edge trails the spine more
     * the faster it moves, which is what reads as paper.
     */
    const bend = (s: Sheet, yh: number) => {
      const pos = s.geo.attributes.position as THREE_NS.BufferAttribute;
      const base = s.p * Math.PI;
      const lift = Math.sin(base);
      const curl = Math.min(1.15, lift * 0.45 + s.speed * 0.55 * lift + s.speed * 0.12);
      const ds = W / SEG;
      xs[0] = 0;
      ys[0] = yh;
      for (let k = 1; k <= SEG; k++) {
        const f = k / SEG;
        // clamped to the half circle so the paper never dips below its hinge
        const theta = Math.min(Math.PI, Math.max(0, base - s.motion * curl * f ** 1.6));
        xs[k] = xs[k - 1] + Math.cos(theta) * ds;
        ys[k] = ys[k - 1] + Math.sin(theta) * ds;
      }
      for (let v = 0; v < pos.count; v++) {
        const col = v % (SEG + 1);
        pos.setXYZ(v, xs[col], ys[col], v <= SEG ? -H / 2 : H / 2);
        // darker where the sheet leaves the spine and where it curls the most
        const f = col / SEG;
        const shade = 1 - lift * (0.22 * Math.exp(-f * 7) + 0.1 * curl * f);
        s.shade[v * 3] = s.shade[v * 3 + 1] = s.shade[v * 3 + 2] = shade;
      }
      pos.needsUpdate = true;
      (s.geo.attributes.color as THREE_NS.BufferAttribute).needsUpdate = true;
      s.geo.computeVertexNormals();
    };

    /** New set of pages (first data, search, category): rebuild the sheets, open at `index`. */
    const rebuild = () => {
      const { pages: list, index: m } = live.current;
      for (const s of sheets) disposeSheet(s);
      dropFaces();
      sheets = Array.from({ length: Math.max(0, list.length - 1) }, makeSheet);
      sheets.forEach((s, j) => {
        s.p = s.from = s.to = j < m ? 1 : 0;
      });
      shownKeys = list.map((p) => p.key).join(",");
      shownIndex = m;
      rib.at = live.current.bookmark; // a new book opens with its ribbon already in place
      rib.lift = 0;
    };

    /** Sends every sheet toward the side spread `m` needs, in the order a hand would turn them. */
    const turnTo = (m: number) => {
      const forward = m > shownIndex;
      const order = sheets
        .map((s, j) => ({ s, j, to: j < m ? 1 : 0 }))
        .filter(({ s, to }) => s.to !== to)
        .sort((a, b) => (forward ? a.j - b.j : b.j - a.j));
      const many = order.length > 1;
      for (const { s, to } of order) {
        if (reduce) {
          s.p = s.from = s.to = to;
          continue;
        }
        const start = Math.max(clock, lastLaunch + STAGGER);
        lastLaunch = start;
        s.from = s.p;
        s.to = to;
        s.start = start;
        // a sheet already half way over needs only half a turn; a fan of sheets moves briskly
        s.dur = FLIP * (0.45 + 0.55 * Math.abs(to - s.p)) * (many ? 0.8 : 1);
        s.motion = to > s.p ? 1 : -1;
      }
      shownIndex = m;
    };

    // ---- the bookmark ribbon: it lies down the recto of its spread beside the hinge and
    // drapes over the tail edge onto the table. It moves with the sheet it lies on; the
    // hanging end swings on a damped spring, pulled along by turning sheets and the book's tilt.
    const rib = { sway: 0, swayV: 0, drag: 0, at: 0, lift: 0 };
    rebuild();
    // canvas text needs the web fonts; draw again once they are in
    document.fonts?.ready.then(() => fontEpoch++);

    const ribbonGeo = new THREE.PlaneGeometry(RIB_W, 1, 1, RIB);
    const ribbon = new THREE.Mesh(
      ribbonGeo,
      new THREE.MeshStandardMaterial({
        color: 0xb8913a,
        metalness: 0.35,
        roughness: 0.45,
        side: THREE.DoubleSide,
      }),
    );
    ribbon.frustumCulled = false; // it rides on turning sheets; its first bounds would go stale
    book.add(ribbon);
    // the hinge end and direction of the page the ribbon lies on
    const anchor = { x: 0, y: PAGE_Y, tx: 1, ty: 0 };
    const placeAnchor = (b: number) => {
      const s = sheets[b];
      anchor.x = 0;
      anchor.ty = 0;
      if (!s) {
        // the last recto never turns
        anchor.y = PAGE_Y;
        anchor.tx = 1;
      } else if (s.p === 0 || s.p === 1) {
        anchor.y = s.p ? restLeft(b) : restRight(b);
        anchor.tx = s.p ? -1 : 1;
      } else {
        // in the air, so bent this frame: follow its first segment
        const pos = s.geo.attributes.position as THREE_NS.BufferAttribute;
        const dx = pos.getX(1) - pos.getX(0);
        const dy = pos.getY(1) - pos.getY(0);
        const len = Math.hypot(dx, dy) || 1;
        anchor.x = pos.getX(0);
        anchor.y = pos.getY(0);
        anchor.tx = dx / len;
        anchor.ty = dy / len;
      }
    };
    const shapeRibbon = () => {
      const pos = ribbonGeo.attributes.position as THREE_NS.BufferAttribute;
      const row = (r: number, x: number, y: number, z: number, tx: number, ty: number) => {
        pos.setXYZ(r * 2, x - (tx * RIB_W) / 2, y - (ty * RIB_W) / 2, z);
        pos.setXYZ(r * 2 + 1, x + (tx * RIB_W) / 2, y + (ty * RIB_W) / 2, z);
      };
      const { tx, ty } = anchor;
      const d = RIB_GAP + RIB_W / 2;
      // centre line: along the page from the hinge, lifted off it along the face normal
      const cx = anchor.x + tx * d - ty * RIB_UP;
      const cy = anchor.y + ty * d + tx * RIB_UP + 0.3 * smooth(rib.lift);
      row(0, cx, cy, -H / 2, tx, ty);
      row(1, cx, cy, H / 2, tx, ty);
      const du = TAIL / (RIB - 1);
      let y = cy;
      let z = H / 2;
      const flat = tx >= 0 ? 1 : -1;
      for (let r = 2; r <= RIB; r++) {
        // flat at first so it clears the cover's lip, then falling, then lying on the table
        const a = DROP * smooth(((r - 1.5) * du) / CURL_LEN);
        const fall = Math.sin(a) * du;
        const resting = y - fall <= TABLE_Y;
        y = resting ? TABLE_Y : y - fall;
        z += (resting ? 1 : Math.cos(a)) * du;
        const loose = (r - 1) / (RIB - 1);
        // the hanging end untwists from the page's slope to lie flat
        const k = smooth((r - 1) / 6);
        const rx = tx + (flat - tx) * k;
        const ry = ty * (1 - k);
        const n = Math.hypot(rx, ry) || 1;
        row(r, cx + rib.sway * loose * loose, y, z, rx / n, ry / n);
      }
      pos.needsUpdate = true;
      ribbonGeo.computeVertexNormals();
    };
    shapeRibbon();

    // ---- clicks: the right page's button opens the course, otherwise a page turns
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    pickRef.current = (x, y) => {
      const list = live.current.pages;
      if (!list.length) return null;
      ndc.set(x, y);
      raycaster.setFromCamera(ndc, camera);
      const targets = [firstVerso, lastRecto, ...sheets.flatMap((s) => [s.front, s.back])];
      const hit = raycaster.intersectObjects(
        targets.filter((o) => o.visible),
        false,
      )[0];
      if (!hit) return null;
      const resting = sheets.find((s) => s.front === hit.object);
      const recto = hit.object === lastRecto || (resting && resting.p === 0 && resting.to === 0);
      if (recto && hit.uv) {
        const cx = hit.uv.x * CW;
        const cy = (1 - hit.uv.y) * CH;
        const padding = 24;
        if (
          cx > CTA.x - padding &&
          cx < CTA.x + CTA.w + padding &&
          cy > CTA.y - padding &&
          cy < CTA.y + CTA.h + padding
        )
          return "open";
      }
      return book.worldToLocal(hit.point.clone()).x < 0 ? "prev" : "next";
    };
    // read-only probe for automated checks: each sheet's turn progress
    (renderer.domElement as HTMLCanvasElement & { bookState?: () => number[] }).bookState = () =>
      sheets.map((s) => Math.round(s.p * 1000) / 1000);

    return {
      camera,
      resize(w, h) {
        camera.aspect = w / h;
        // fit the open book (about 3.5 x 2.4 units) with a small margin, whatever the aspect
        const tan = Math.tan(THREE.MathUtils.degToRad(16));
        camera.position.copy(eye).multiplyScalar(Math.max(1.34 / tan, 1.8 / (tan * camera.aspect)));
        camera.lookAt(look);
        camera.updateProjectionMatrix();
      },
      update(time, rawDelta) {
        const delta = Math.min(rawDelta, 0.05); // a background tab must not teleport a sheet
        clock += delta;
        frame++;
        const { pages: list, index: m, bookmark: b } = live.current;
        const keys = list.map((p) => p.key).join(",");
        if (keys !== shownKeys) rebuild();
        else if (m !== shownIndex) turnTo(m);
        if (b !== rib.at) {
          // a newly marked spread: the ribbon drops into it with a little swing
          rib.at = b;
          rib.lift = reduce ? 0 : 1;
          rib.swayV += reduce ? 0 : 1.2;
        }
        rib.lift = Math.max(0, rib.lift - delta / RIB_DROP);

        rib.drag = 0;
        let topLeft = -1; // highest sheet resting on the left
        let topRight = sheets.length; // lowest-numbered sheet resting on the right
        sheets.forEach((s, j) => {
          const before = s.p;
          const u = (clock - s.start) / s.dur;
          s.p =
            s.from === s.to || u >= 1 ? s.to : u <= 0 ? s.from : s.from + (s.to - s.from) * ease(u);
          if (s.p === s.to) s.from = s.to;
          s.speed = Math.min(1, ((Math.abs(s.p - before) / Math.max(delta, 1e-4)) * FLIP) / 3);
          if (s.p === 1) topLeft = j;
          if (s.p === 0 && j < topRight) topRight = j;
          rib.drag -= s.motion * s.speed;
        });
        rib.drag = Math.max(-1, Math.min(1, rib.drag));

        // only the top of each stack and the sheets in the air are drawn; the rest are covered
        sheets.forEach((s, j) => {
          const moving = s.p > 0 && s.p < 1;
          const visible = moving || j === topLeft || j === topRight;
          s.front.visible = s.back.visible = visible;
          if (!visible) return;
          bend(s, restRight(j) + (restLeft(j) - restRight(j)) * s.p);
          // a face lying on the table is hidden by the paper over it
          show(s.front.material, s.p < 1 ? face("r", j, false) : null);
          show(s.back.material, s.p > 0 ? face("v", j + 1, true) : null);
        });
        firstVerso.visible = topLeft < 0;
        lastRecto.visible = topRight >= sheets.length;
        if (firstVerso.visible)
          show(firstVerso.material as THREE_NS.MeshStandardMaterial, face("v", 0, false));
        if (lastRecto.visible)
          show(
            lastRecto.material as THREE_NS.MeshStandardMaterial,
            face("r", Math.max(0, list.length - 1), false),
          );
        evict();
        // each page block rises to just under the top sheet of its stack
        setBlock(blocks[0], (topLeft >= 0 ? restLeft(topLeft) : PAGE_Y) - 0.003);
        setBlock(blocks[1], (topRight < sheets.length ? restRight(topRight) : PAGE_Y) - 0.003);

        // fixed 1/120 s substeps keep the swing the same at any frame rate
        const sag = -book.rotation.z * 1.6 - book.rotation.y * 0.8;
        for (let left = delta; left > 1e-6; left -= 1 / 120) {
          const h = Math.min(left, 1 / 120);
          rib.swayV += (-(rib.sway - sag) * SPRING - rib.swayV * DAMP + rib.drag * DRAG) * h;
          rib.sway += rib.swayV * h;
        }
        ribbon.visible = b >= 0 && b < list.length;
        if (ribbon.visible) {
          placeAnchor(b);
          shapeRibbon();
        }

        // the graphite cover would vanish on the dark theme, so it lifts a shade there
        const dark = !!renderer.domElement.closest(".dark");
        cover.color.setHex(dark ? 0x4a505e : 0x2b303b);
        shadowMat.opacity = dark ? 0.5 : 1;
        const hover = raw.inside ? 1 : 0;
        // gentle: the pages carry text, so the book only leans toward the pointer
        book.rotation.x = -pointer.y * 0.05;
        book.rotation.z = pointer.x * 0.03;
        book.rotation.y = (reduce ? 0 : Math.sin(time * 0.25) * 0.025) + pointer.x * 0.06;
        book.position.y +=
          ((reduce ? 0 : Math.sin(time * 0.8) * 0.02) + hover * 0.04 - book.position.y) * 0.1;
      },
    };
  });

  const pickAt = (e: MouseEvent<HTMLCanvasElement>): Pick => {
    const r = e.currentTarget.getBoundingClientRect();
    return pickRef.current(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
  };
  const interactive = !!(onActivate || onTurn);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      onClick={(e) => {
        const hit = pickAt(e);
        if (hit === "open" || (hit && !onTurn)) onActivate?.();
        else if (hit) onTurn?.(hit === "prev" ? -1 : 1);
      }}
      onPointerMove={(e) => {
        if (interactive) e.currentTarget.style.cursor = pickAt(e) ? "pointer" : "";
      }}
      className="absolute inset-0 h-full w-full touch-pan-y"
    />
  );
}
