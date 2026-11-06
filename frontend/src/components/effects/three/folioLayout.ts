// Pure layout of FolioScene (no three.js), so the no-collision rules can be tested.

export const FLOOR = -1.3;
export const STACK_X = -2.0; // centre of the stack region
export const SHELF_X0 = 0.75; // left edge of the shelf region; the regions never overlap
/** A lane above everything, where a book turns between arrangements. */
export const STAGING_Y = 3.45;
export const STAGGER = 0.07; // lower (stack) / left (shelf) books settle first
/** Per-book bob of loose stack books; the loose lanes keep more air than twice this. */
export const STACK_BOB = 0.04;
/** The settled stack breathes as one, scaled by each book's own progress. */
export const STACK_BREATH = 0.012;
const STACK_GAP = 0.015;
const SHELF_GAP = 0.05;

/** Deterministic noise in -1..1 so every visit draws the same scatter. */
export const rand = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Across the cover (w), spine thickness (h), cover height (d) of book i. */
export const bookDims = (i: number) => ({
  w: 2.5 - (i % 3) * 0.22,
  h: 0.26 + (i % 2) * 0.1,
  d: 1.8 - (i % 4) * 0.1,
});

/** Gather progress of book i: non-increasing in i, so lanes can never cross while gathering. */
export const gatherT = (p: number, i: number, n: number) =>
  ease(clamp01((clamp01(p) - i * STAGGER) / (1 - (n - 1) * STAGGER)));

export function folioLayout(n: number) {
  const dims = Array.from({ length: n }, (_, i) => bookDims(i));

  // stack: bottom book first; loose, each book keeps its own (taller) height lane
  let y = FLOOR;
  const stack = dims.map((b, i) => {
    const settledY = y + b.h / 2;
    y += b.h + STACK_GAP;
    return {
      settled: {
        x: STACK_X + rand(i, 1) * 0.12,
        y: settledY,
        z: rand(i, 2) * 0.1,
        yaw: rand(i, 3) * 0.28,
      },
      loose: {
        x: STACK_X + 0.2 + rand(i, 4) * 0.65,
        y: settledY + 0.22 + i * 0.1, // the gap above every book only grows when loose
        z: rand(i, 5) * 0.9,
        yaw: rand(i, 6) * 1.5,
      },
    };
  });

  // shelf: left to right; the last two lean, so their footprint is h*cos + d*sin
  const leans = dims.map((_, i) => (i >= n - 2 ? -0.22 * (i - n + 3) : 0));
  const halfW = (i: number, lean: number) =>
    (dims[i].h * Math.cos(lean) + dims[i].d * Math.sin(Math.abs(lean))) / 2;
  const halfH = (i: number, lean: number) =>
    (dims[i].h * Math.sin(Math.abs(lean)) + dims[i].d * Math.cos(lean)) / 2;
  let xs = SHELF_X0;
  let xl = SHELF_X0;
  const shelf = dims.map((_, i) => {
    const settledX = xs + halfW(i, leans[i]);
    // loose lane: at least the settled spacing from the previous one, plus air
    const looseX = Math.max(xl + halfW(i, leans[i]), settledX) + (i ? 0.32 : 0);
    xs = settledX + halfW(i, leans[i]) + SHELF_GAP;
    xl = looseX + halfW(i, leans[i]);
    return {
      settled: { x: settledX, y: FLOOR + halfH(i, leans[i]), z: 0, lean: leans[i], pitch: 0 },
      loose: {
        x: looseX,
        y: FLOOR + halfH(i, 0) + 0.3 + (rand(i, 7) + 1) * 0.25,
        z: rand(i, 8) * 0.7,
        lean: 0,
        pitch: rand(i, 9) * 0.45,
      },
    };
  });

  return { dims, stack, shelf, halfW, shelfRight: xs };
}
