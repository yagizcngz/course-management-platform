/**
 * The role seals stamped on the sign-in ledger, as point paths on a 256 x 256 canvas (y down)
 * inside a ring of radius 100 around the centre. The sign-up sky draws the same points as a
 * constellation, so the figure a new account traces is the seal its role is stamped with.
 */
export type SealKind = "student" | "teacher" | "admin";
type Pt = readonly [number, number];

export const SEAL_RING = { cx: 128, cy: 128, r: 100 } as const;

export const SEALS: Record<SealKind, { strokes: Pt[][]; dots?: Pt[] }> = {
  // mortarboard with its tassel
  student: {
    strokes: [
      [
        [128, 70],
        [200, 108],
        [128, 146],
        [56, 108],
        [128, 70],
      ],
      [
        [84, 124],
        [84, 160],
        [128, 173],
        [172, 160],
        [172, 124],
      ],
      [
        [200, 108],
        [200, 160],
      ],
    ],
  },
  // an open book on a lectern
  teacher: {
    strokes: [
      [
        [128, 92],
        [95, 82],
        [60, 86],
        [60, 146],
        [95, 142],
        [128, 152],
        [161, 142],
        [196, 146],
        [196, 86],
        [161, 82],
        [128, 92],
      ],
      [
        [128, 92],
        [128, 152],
        [128, 196],
      ],
      [
        [100, 196],
        [128, 196],
        [156, 196],
      ],
    ],
  },
  // a crown over a band, jewels on its three tips
  admin: {
    strokes: [
      [
        [70, 166],
        [60, 96],
        [100, 128],
        [128, 74],
        [156, 128],
        [196, 96],
        [186, 166],
        [70, 166],
      ],
      [
        [74, 184],
        [182, 184],
      ],
    ],
    dots: [
      [60, 96],
      [128, 74],
      [196, 96],
    ],
  },
};

/**
 * The seal as a graph: unique nodes and the edges between them, emblem first and then the ring
 * (as `ringStars` nodes from the top, clockwise), in the order a constellation should draw them.
 */
export function sealGraph(kind: SealKind, ringStars: number) {
  const nodes: Pt[] = [];
  const edges: [number, number][] = [];
  const id = (p: Pt) => {
    let i = nodes.findIndex((q) => q[0] === p[0] && q[1] === p[1]);
    if (i < 0) i = nodes.push(p) - 1;
    return i;
  };
  for (const s of SEALS[kind].strokes)
    for (let k = 1; k < s.length; k++) edges.push([id(s[k - 1]), id(s[k])]);
  const { cx, cy, r } = SEAL_RING;
  const ring = Array.from({ length: ringStars }, (_, k) => {
    const a = (k / ringStars) * Math.PI * 2;
    return id([cx + r * Math.sin(a), cy - r * Math.cos(a)]);
  });
  ring.forEach((n, k) => edges.push([n, ring[(k + 1) % ringStars]]));
  return { nodes, edges };
}
