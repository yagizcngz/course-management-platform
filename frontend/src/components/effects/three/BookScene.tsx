import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";
import { useThreeScene } from "./useThreeScene";

export interface BookPage {
  key: string;
  no: number;
  total: number;
  title: string;
  category: string;
  instructor: string;
  price: string;
}

export interface BookStrings {
  instructor: string;
  catalog: string;
}

const SEG = 28;
const W = 1.6; // page width, spine to edge
const H = 2.2;
const CW = 512; // canvas size keeps the page's 1.6 : 2.2 ratio
const CH = 704;
const FLIP = 0.95; // seconds for one unhurried turn
// stacked heights: page < ribbon < leaf shadow < turning leaf, far enough apart that
// the depth buffer always keeps them in order (no z-fighting)
const PAGE_Y = 0.018;
const RIB_Y = PAGE_Y + 0.0025; // flush on the open pages, so the leaf's shadow falls on it
const SHADOW_Y = 0.022;
const LEAF_Y = 0.034;
// The ribbon lies in the gutter (|x| < RIB_W / 2) and the turning leaf starts GUTTER from
// the hinge. The leaf only ever rises (y >= LEAF_Y > RIB_Y), so it passes over the ribbon
// and never cuts it; lying flat on either side it stops short of the gutter, so it never
// hides the ribbon at the start or end of a turn either.
const RIB_W = 0.044;
const GUTTER = 0.03; // must stay below one leaf segment (W / SEG) and above RIB_W / 2
const RIB = 24; // ribbon rows: head, tail edge of the page, then the hanging end
const TAIL = 0.5; // how far the ribbon hangs past the tail edge
const DROP = 1.2; // angle of the hanging end, radians below the page plane
const CURL_LEN = 0.16; // length over which it bends from flat to DROP, clearing the cover
const TABLE_Y = -0.116; // just above the contact shadow: the end comes to rest there
const SPRING = 26; // tail swing stiffness, ~0.8 Hz
const DAMP = 5.6; // damping ratio ~0.55: one soft overshoot, then still
const DRAG = 3; // how hard a turning leaf pulls the tail along
console.assert(
  RIB_W / 2 < GUTTER && GUTTER < W / SEG && RIB_Y < LEAF_Y,
  "BookScene: the ribbon must fit in the gutter, under the leaf",
);
const INK = "#262a33";
const MUTED = "#6f6a5f";
const GOLD = "#9c7a30";
const PAPER = "#f6f1e6";

/** Cubic in-out: the sheet peels off slowly, sweeps across, then settles. */
const ease = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

function wrap(g: CanvasRenderingContext2D, text: string, max: number, lines: number) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > max && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = `${out[lines - 1].replace(/\s+\S*$/, "")}…`;
  }
  return out;
}

function paper(g: CanvasRenderingContext2D, spineAtLeft: boolean) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = PAPER;
  g.fillRect(0, 0, CW, CH);
  // the gutter darkens toward the spine, which is what makes a flat plane read as paper
  const grad = g.createLinearGradient(spineAtLeft ? 0 : CW, 0, spineAtLeft ? 70 : CW - 70, 0);
  grad.addColorStop(0, "rgba(60,50,30,0.16)");
  grad.addColorStop(1, "rgba(60,50,30,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, CW, CH);
}

function rules(g: CanvasRenderingContext2D, from: number) {
  g.strokeStyle = INK;
  g.globalAlpha = 0.1;
  g.lineWidth = 1;
  for (let y = from; y < CH - 70; y += 26) {
    g.beginPath();
    g.moveTo(56, y);
    g.lineTo(CW - 56, y);
    g.stroke();
  }
  g.globalAlpha = 1;
}

function caps(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  g.font = '500 17px "JetBrains Mono", monospace';
  g.fillStyle = color;
  if ("letterSpacing" in g) (g as { letterSpacing: string }).letterSpacing = "3px";
  g.fillText(text.toLocaleUpperCase("tr"), x, y);
  if ("letterSpacing" in g) (g as { letterSpacing: string }).letterSpacing = "0px";
}

/** Left page: the catalogue number, set large, over ruled paper. */
function drawVerso(g: CanvasRenderingContext2D, page: BookPage | undefined, s: BookStrings) {
  paper(g, false);
  if (!page) return rules(g, 90);
  caps(g, `E-Kurs — ${s.catalog}`, 56, 84, MUTED);
  g.fillStyle = GOLD;
  g.font = 'italic 230px "Instrument Serif", Georgia, serif';
  g.fillText(String(page.no).padStart(2, "0"), 44, 330);
  g.fillStyle = MUTED;
  g.font = '28px "Instrument Serif", Georgia, serif';
  g.fillText(`/ ${String(page.total).padStart(2, "0")}`, 56, 380);
  rules(g, 452);
}

/** Right page: the course itself, laid out like a catalogue entry. */
function drawRecto(g: CanvasRenderingContext2D, page: BookPage | undefined, s: BookStrings) {
  paper(g, true);
  if (!page) return rules(g, 90);
  caps(g, page.category, 56, 84, GOLD);
  g.fillStyle = INK;
  g.font = '62px "Instrument Serif", Georgia, serif';
  const lines = wrap(g, page.title, CW - 112, 4);
  lines.forEach((l, i) => g.fillText(l, 56, 168 + i * 64));
  const y = 168 + lines.length * 64 + 8;
  g.strokeStyle = INK;
  g.globalAlpha = 0.6;
  g.beginPath();
  g.moveTo(56, y);
  g.lineTo(CW - 56, y);
  g.stroke();
  g.globalAlpha = 1;
  caps(g, s.instructor, 56, y + 46, MUTED);
  g.fillStyle = INK;
  g.font = '30px "Instrument Serif", Georgia, serif';
  g.fillText(page.instructor, 56, y + 86);
  g.font = '56px "Instrument Serif", Georgia, serif';
  g.fillText(page.price, 56, CH - 72);
  g.font = '500 16px "JetBrains Mono", monospace';
  g.fillStyle = MUTED;
  g.textAlign = "right";
  g.fillText(String(page.no).padStart(2, "0"), CW - 56, CH - 72);
  g.textAlign = "left";
}

/**
 * Variant A: the catalogue as an open notebook. Each spread is one real course; when
 * `index` changes, one leaf turns (forward or back) and lands on that course. The leaf
 * is bent on the CPU, and its two faces carry the outgoing and incoming pages.
 */
export function BookScene({
  pages,
  index,
  strings,
  onActivate,
}: {
  pages: BookPage[];
  index: number;
  strings: BookStrings;
  onActivate?: () => void;
}) {
  const live = useRef({ pages, index, strings });
  useEffect(() => {
    live.current = { pages, index, strings };
  }, [pages, index, strings]);

  const ref = useThreeScene(({ THREE, scene, renderer, pointer, raw, reduce }) => {
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    const eye = new THREE.Vector3(0, 6.2, 3.1).normalize();
    const look = new THREE.Vector3(0, 0, 0.12);

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
    const shadowTex = new THREE.CanvasTexture(sc);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.9, H * 1.5), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.12;
    book.add(shadow);

    const cover = new THREE.MeshStandardMaterial({ color: 0x2b303b, roughness: 0.7 });
    const block = new THREE.MeshStandardMaterial({ color: 0xece4d2, roughness: 0.95 });
    for (const side of [-1, 1]) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, 0.05, H + 0.1), cover);
      board.position.set(side * (W / 2 + 0.03), -0.06, 0);
      book.add(board);
      const stack = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.05, H - 0.04), block);
      stack.position.set(side * (W / 2), -0.01, 0);
      book.add(stack);
    }

    const surface = (mirror = false) => {
      const c = document.createElement("canvas");
      c.width = CW;
      c.height = CH;
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      if (mirror) {
        // a back face shows its texture mirrored; flip u so the verso reads correctly
        tex.wrapS = THREE.RepeatWrapping;
        tex.repeat.x = -1;
      }
      return { g: c.getContext("2d")!, tex };
    };
    const left = surface();
    const right = surface();
    const leafFront = surface();
    const leafBack = surface(true);

    const flat = (s: { tex: THREE_NS.Texture }, x: number) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(W, H),
        new THREE.MeshStandardMaterial({ map: s.tex, roughness: 0.92 }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, PAGE_Y, 0);
      book.add(m);
    };
    flat(left, -W / 2);
    flat(right, W / 2);

    // the shadow a lifted leaf casts on the page below it: darkest at the crease
    const gc = document.createElement("canvas");
    gc.width = 256;
    gc.height = 4;
    const gg = gc.getContext("2d")!;
    const lg = gg.createLinearGradient(0, 0, 256, 0);
    lg.addColorStop(0, "rgba(40,30,15,0.85)");
    lg.addColorStop(0.35, "rgba(40,30,15,0.35)");
    lg.addColorStop(1, "rgba(40,30,15,0)");
    gg.fillStyle = lg;
    gg.fillRect(0, 0, 256, 4);
    const creaseMat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(gc),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0,
    });
    const crease = new THREE.Mesh(new THREE.PlaneGeometry(1, H), creaseMat);
    crease.rotation.x = -Math.PI / 2;
    crease.position.y = SHADOW_Y;
    crease.visible = false;
    book.add(crease);

    const leafGeo = new THREE.PlaneGeometry(W, H, SEG, 1);
    // the first column starts GUTTER from the hinge; its texture starts there too, so the
    // leaf shows exactly the part of the page it covers (the back face samples 1 - u)
    const leafUv = leafGeo.attributes.uv as THREE_NS.BufferAttribute;
    for (let v = 0; v < leafUv.count; v += SEG + 1) leafUv.setX(v, GUTTER / W);
    const shade = new Float32Array(leafGeo.attributes.position.count * 3).fill(1);
    leafGeo.setAttribute("color", new THREE.BufferAttribute(shade, 3));
    const leafMat = (map: THREE_NS.Texture, side: THREE_NS.Side) =>
      new THREE.MeshStandardMaterial({ map, roughness: 0.92, side, vertexColors: true });
    const leaf = new THREE.Group();
    leaf.add(
      new THREE.Mesh(leafGeo, leafMat(leafFront.tex, THREE.FrontSide)),
      new THREE.Mesh(leafGeo, leafMat(leafBack.tex, THREE.BackSide)),
    );
    leaf.visible = false;
    book.add(leaf);

    const xs = new Float32Array(SEG + 1);
    const ys = new Float32Array(SEG + 1);
    /**
     * Lays the leaf along a curve: `p` is how far it has turned (0 = flat on the right,
     * 1 = flat on the left), `motion` the way it is moving and `speed` (0..1) how fast.
     * The free edge trails the spine more the faster it moves, which is what reads as paper.
     */
    const bend = (p: number, motion: number, speed: number) => {
      const pos = leafGeo.attributes.position as THREE_NS.BufferAttribute;
      const base = p * Math.PI;
      const lift = Math.sin(base);
      const curl = Math.min(1.15, lift * 0.45 + speed * 0.55 * lift + speed * 0.12);
      const ds = W / SEG;
      xs[0] = 0;
      ys[0] = LEAF_Y;
      for (let s = 1; s <= SEG; s++) {
        const f = s / SEG;
        // clamped to the half circle so the paper never dips into the page block
        const theta = Math.min(Math.PI, Math.max(0, base - motion * curl * f ** 1.6));
        xs[s] = xs[s - 1] + Math.cos(theta) * ds;
        ys[s] = ys[s - 1] + Math.sin(theta) * ds;
      }
      // the visible edge sits GUTTER along the first segment, leaving the spine to the ribbon
      const k0 = GUTTER / ds;
      const x0 = xs[1] * k0;
      const y0 = LEAF_Y + (ys[1] - LEAF_Y) * k0;
      for (let v = 0; v < pos.count; v++) {
        const col = v % (SEG + 1);
        const z = v <= SEG ? -H / 2 : H / 2;
        if (col === 0) pos.setXYZ(v, x0, y0, z);
        else pos.setXYZ(v, xs[col], ys[col], z);
        // darker where the sheet leaves the spine and where it curls the most
        const f = col / SEG;
        const k = 1 - lift * (0.22 * Math.exp(-f * 7) + 0.1 * curl * f);
        shade[v * 3] = shade[v * 3 + 1] = shade[v * 3 + 2] = k;
      }
      pos.needsUpdate = true;
      (leafGeo.attributes.color as THREE_NS.BufferAttribute).needsUpdate = true;
      leafGeo.computeVertexNormals();

      const tip = xs[SEG];
      crease.visible = leaf.visible;
      crease.scale.x = Math.abs(tip) < 0.001 ? 0.001 : tip;
      crease.position.x = tip / 2;
      creaseMat.opacity = 0.3 * lift * (1 - Math.abs(tip) / W) + 0.12 * lift;
    };

    // the bookmark ribbon: tied at the head of the spine, lying flat down the gutter and
    // draping over the tail edge onto the table. Only the hanging end moves: it swings on a
    // damped spring, pulled along by a turning leaf and by the book's tilt.
    const ribbonGeo = new THREE.PlaneGeometry(RIB_W, 1, 1, RIB);
    const ribbon = new THREE.Mesh(
      ribbonGeo,
      new THREE.MeshStandardMaterial({
        color: 0xb8913a,
        metalness: 0.35,
        roughness: 0.45,
        side: THREE.DoubleSide,
        // pulled a hair toward the camera so it never flickers against the page under it
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    book.add(ribbon);
    const rib = { sway: 0, swayV: 0, drag: 0 };
    const shapeRibbon = () => {
      const pos = ribbonGeo.attributes.position as THREE_NS.BufferAttribute;
      const row = (r: number, x: number, y: number, z: number) => {
        pos.setXYZ(r * 2, x - RIB_W / 2, y, z);
        pos.setXYZ(r * 2 + 1, x + RIB_W / 2, y, z);
      };
      row(0, 0, RIB_Y, -H / 2);
      row(1, 0, RIB_Y, H / 2);
      const du = TAIL / (RIB - 1);
      let y = RIB_Y;
      let z = H / 2;
      for (let r = 2; r <= RIB; r++) {
        // flat at first so it clears the cover's lip, then falling, then lying on the table
        const a = DROP * smooth(((r - 1.5) * du) / CURL_LEN);
        const fall = Math.sin(a) * du;
        const resting = y - fall <= TABLE_Y;
        y = resting ? TABLE_Y : y - fall;
        z += (resting ? 1 : Math.cos(a)) * du;
        const loose = (r - 1) / (RIB - 1);
        row(r, rib.sway * loose * loose, y, z);
      }
      pos.needsUpdate = true;
      ribbonGeo.computeVertexNormals();
    };
    shapeRibbon();

    const draw = (
      s: { g: CanvasRenderingContext2D; tex: THREE_NS.Texture },
      fn: typeof drawVerso,
      page: BookPage | undefined,
    ) => {
      fn(s.g, page, live.current.strings);
      s.tex.needsUpdate = true;
    };

    // what the static pages show, by content, so a language change redraws them too
    let shown = "";
    let shownPage: BookPage | undefined;
    let shownIndex = 0;
    let flip: {
      t: number;
      dir: 1 | -1;
      page: BookPage;
      from: BookPage;
      fromIndex: number;
    } | null = null;
    const sig = (page?: BookPage) =>
      page ? `${page.key}|${page.title}|${page.category}|${live.current.strings.instructor}` : "";

    const settle = () => {
      const { pages: list, index: i } = live.current;
      draw(left, drawVerso, list[i]);
      draw(right, drawRecto, list[i]);
      shown = sig(list[i]);
      shownPage = list[i];
      shownIndex = i;
    };
    settle();
    // canvas text needs the web fonts; draw again once they are in
    document.fonts?.ready.then(() => !flip && settle());

    const endFlip = () => {
      flip = null;
      leaf.visible = false;
      crease.visible = false;
    };

    return {
      camera,
      resize(w, h) {
        camera.aspect = w / h;
        // vertical fov is fixed, so narrow canvases need more distance to keep the book in frame
        camera.position.copy(eye).multiplyScalar(Math.max(5.4, 6.4 / (w / h)));
        camera.lookAt(look);
        camera.updateProjectionMatrix();
      },
      update(time, rawDelta) {
        const delta = Math.min(rawDelta, 0.05); // a background tab must not teleport the leaf
        const { pages: list, index: i } = live.current;
        const target = list[i];
        if (!flip && sig(target) !== shown) {
          // same course in another language, first data, or reduced motion: no page turn
          if (reduce || !shownPage || !target || shownPage.key === target.key) {
            settle();
          } else {
            const wrapped = shownIndex === list.length - 1 && i === 0;
            const dir: 1 | -1 = i > shownIndex || wrapped ? 1 : -1;
            if (dir === 1) {
              // the leaf lifts the old right page and lays the new left page down
              draw(leafFront, drawRecto, shownPage);
              draw(leafBack, drawVerso, target);
              draw(right, drawRecto, target);
            } else {
              draw(leafBack, drawVerso, shownPage);
              draw(leafFront, drawRecto, target);
              draw(left, drawVerso, target);
            }
            flip = { t: 0, dir, page: target, from: shownPage, fromIndex: shownIndex };
            shown = sig(target);
            shownPage = target;
            shownIndex = i;
            leaf.visible = true;
            bend(dir === 1 ? 0 : 1, dir, 0);
          }
        }
        rib.drag = 0;
        if (flip) {
          // clicking back mid-turn reverses the leaf; clicking on speeds it up so the
          // next turn starts sooner. Either way no click is lost.
          const back = target?.key === flip.from.key;
          const ahead = !back && target?.key !== flip.page.key;
          const rate = (delta / FLIP) * (back || ahead ? 2.2 : 1);
          const before = ease(flip.t);
          flip.t = Math.min(1, Math.max(0, flip.t + (back ? -rate : rate)));
          const e = ease(flip.t);
          const speed = Math.min(1, Math.abs(e - before) / Math.max(rate, 1e-4) / 3);
          const motion = back ? -flip.dir : flip.dir;
          bend(flip.dir === 1 ? e : 1 - e, motion, speed);
          // the sheet sweeping over the gutter pulls the loose end its way, hardest mid-turn
          rib.drag = -motion * speed;
          if (flip.t >= 1) {
            if (flip.dir === 1) draw(left, drawVerso, flip.page);
            else draw(right, drawRecto, flip.page);
            endFlip();
          } else if (flip.t <= 0 && back) {
            // turned all the way back: the spread is the one we started from
            draw(left, drawVerso, flip.from);
            draw(right, drawRecto, flip.from);
            shown = sig(flip.from);
            shownPage = flip.from;
            shownIndex = flip.fromIndex;
            endFlip();
          }
        }

        // fixed 1/120 s substeps keep the swing the same at any frame rate
        const sag = -book.rotation.z * 1.6 - book.rotation.y * 0.8;
        for (let left = delta; left > 1e-6; left -= 1 / 120) {
          const h = Math.min(left, 1 / 120);
          rib.swayV += (-(rib.sway - sag) * SPRING - rib.swayV * DAMP + rib.drag * DRAG) * h;
          rib.sway += rib.swayV * h;
        }
        shapeRibbon();

        // the graphite cover would vanish on the dark theme, so it lifts a shade there
        const dark = !!renderer.domElement.closest(".dark");
        cover.color.setHex(dark ? 0x4a505e : 0x2b303b);
        shadowMat.opacity = dark ? 0.5 : 1;
        const hover = raw.inside ? 1 : 0;
        book.rotation.x = -pointer.y * 0.08;
        book.rotation.z = pointer.x * 0.05;
        book.rotation.y = (reduce ? 0 : Math.sin(time * 0.25) * 0.04) + pointer.x * 0.1;
        book.position.y +=
          ((reduce ? 0 : Math.sin(time * 0.8) * 0.03) + hover * 0.06 - book.position.y) * 0.1;
      },
    };
  });

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      onClick={onActivate}
      className={`absolute inset-0 h-full w-full ${onActivate ? "cursor-pointer" : ""}`}
    />
  );
}
