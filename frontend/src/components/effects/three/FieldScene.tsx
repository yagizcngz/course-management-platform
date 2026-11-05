import { useEffect, useRef, useState } from "react";
import type * as THREE_NS from "three";
import { useThreeScene } from "./useThreeScene";

export interface FieldItem {
  id: number;
  title: string;
  price: number;
  priceLabel: string;
  match: boolean;
}

export interface FieldRow {
  name: string;
  label: string;
  items: FieldItem[];
}

const GAP = 0.62;
// plinth, dim, column, lit — per theme
const DARK = [0x2a2f38, 0x1f232a, 0x8a93a6, 0xd9b45f];
const LIGHT = [0xd9d3c4, 0xe9e4d8, 0x5b6170, 0xb8913a];
const BOX = 0.4;

/**
 * Variant B: the catalogue as an isometric bar field. Each row is a category, each column
 * a course, its height its price; empty cells are low plinths. Hover reads a course,
 * click opens it. One InstancedMesh, so the whole field is one draw call.
 */
export function FieldScene({
  rows,
  active,
  onPick,
}: {
  rows: FieldRow[];
  /** Category to bring forward (hovered or filtered in the index list). */
  active: string | null;
  onPick: (id: number) => void;
}) {
  const live = useRef({ rows, active, onPick });
  useEffect(() => {
    live.current = { rows, active, onPick };
  }, [rows, active, onPick]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const tip = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ item: FieldItem; row: string } | null>(null);
  const hoveredRef = useRef<number | null>(null);

  const ref = useThreeScene(({ THREE, scene, renderer, raw, reduce }) => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.set(12, 11, 12);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xfff1d6, 2.3);
    key.position.set(-6, 10, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8090b0, 0.6);
    rim.position.set(8, 3, -6);
    scene.add(rim);

    const ROWS = 8;
    const COLS = 8;
    const geo = new THREE.BoxGeometry(BOX, 1, BOX);
    geo.translate(0, 0.5, 0); // grow from the floor up
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.15 });
    const mesh = new THREE.InstancedMesh(geo, mat, ROWS * COLS);
    scene.add(mesh);

    const plinth = new THREE.Color(0x2a2f38);
    const dim = new THREE.Color(0x1f232a);
    const column = new THREE.Color(0x8a93a6);
    const gold = new THREE.Color(0xd9b45f);
    const heights = new Float32Array(ROWS * COLS).fill(0.06);
    const colors = Array.from({ length: ROWS * COLS }, () => plinth.clone());
    const goal = new THREE.Color();
    const m = new THREE.Matrix4();
    const v = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let size = { w: 1, h: 1 };
    // the field is sized to the data: one row per category, as many columns as the
    // fullest category (at least 4, so a thin catalogue still reads as a field)
    let R = 1;
    let C = 4;
    const cell = (r: number, c: number) => ({
      x: (c - (C - 1) / 2) * GAP,
      z: (r - (R - 1) / 2) * GAP,
    });
    const TALL = 0.55 + 2.2;
    const look = new THREE.Vector3();
    const fit = () => {
      const aspect = size.w / size.h;
      // iso projection: footprint width ~ (R + C) * GAP * cos45, column height ~ 0.82 per unit
      const wide = ((R + C) * GAP * 0.71) / 2;
      const tall = (TALL * 0.82 + (R + C) * GAP * 0.41) / 2;
      const s = Math.max(wide / aspect, tall) * 1.18;
      camera.left = -s * aspect;
      camera.right = s * aspect;
      camera.top = s;
      camera.bottom = -s;
      look.set(0, TALL * 0.32, 0);
      camera.position.set(12, 11 + look.y, 12);
      camera.lookAt(look);
      camera.updateProjectionMatrix();
    };

    return {
      camera,
      resize(w, h) {
        size = { w, h };
        fit();
      },
      update(time) {
        const { rows: data, active: act } = live.current;
        const dark = !!renderer.domElement.closest(".dark");
        (dark ? DARK : LIGHT).forEach((hex, k) => [plinth, dim, column, gold][k].setHex(hex));
        const nextR = Math.min(ROWS, Math.max(1, data.length));
        const nextC = Math.min(COLS, Math.max(4, ...data.map((r) => r.items.length)));
        if (nextR !== R || nextC !== C) {
          R = nextR;
          C = nextC;
          fit();
        }
        const anyMatch = data.some((r) => r.items.some((i) => i.match));
        let max = 0;
        let min = Infinity;
        for (const r of data)
          for (const i of r.items) {
            max = Math.max(max, i.price);
            min = Math.min(min, i.price);
          }

        // hover picking runs before the layout pass so the hovered column can rise
        let hit: number | null = null;
        if (raw.inside) {
          ndc.set(raw.x, raw.y);
          raycaster.setFromCamera(ndc, camera);
          const found = raycaster.intersectObject(mesh)[0];
          if (found?.instanceId !== undefined) {
            const r = Math.floor(found.instanceId / COLS);
            const c = found.instanceId % COLS;
            const item = data[r]?.items[c];
            if (item) hit = r * COLS + c;
          }
        }
        const hitItem = hit === null ? null : data[Math.floor(hit / COLS)].items[hit % COLS];
        if ((hitItem?.id ?? null) !== hoveredRef.current) {
          hoveredRef.current = hitItem?.id ?? null;
          setHovered(hitItem ? { item: hitItem, row: data[Math.floor(hit! / COLS)].label } : null);
          renderer.domElement.style.cursor = hitItem ? "pointer" : "";
        }

        for (let r = 0; r < ROWS; r++) {
          const row = data[r];
          const rowOn = !act || row?.name === act;
          for (let c = 0; c < COLS; c++) {
            const i = r * COLS + c;
            const item = row?.items[c];
            if (r >= R || c >= C) {
              // outside the data's footprint: collapse the instance
              m.makeScale(0, 0, 0);
              mesh.setMatrixAt(i, m);
              continue;
            }
            const { x, z } = cell(r, c);
            const wave = reduce
              ? 0
              : Math.sin(x * 0.9 + time * 1.1) * Math.cos(z * 0.8 - time * 0.7);
            let h = 0.06 + wave * 0.03 + 0.03;
            if (item) {
              const span = max - min || 1;
              h = 0.55 + ((item.price - min) / span) * 2.2 + (i === hit ? 0.35 : 0);
              const lit = i === hit || (anyMatch ? item.match : act ? row.name === act : false);
              goal.copy(lit ? gold : rowOn && !anyMatch ? column : dim);
            } else {
              goal.copy(rowOn && row ? plinth : dim);
            }
            heights[i] += (h - heights[i]) * (reduce ? 1 : 0.12);
            colors[i].lerp(goal, reduce ? 1 : 0.15);
            m.makeScale(1, heights[i], 1).setPosition(x, 0, z);
            mesh.setMatrixAt(i, m);
            mesh.setColorAt(i, colors[i]);
          }
          // row numbers sit at the near end of each row, projected into screen space
          const el = labels.current[r];
          if (el) {
            const { x, z } = cell(r, C - 1);
            v.set(x + GAP * 0.9, 0, z).project(camera);
            el.style.transform = `translate(${((v.x + 1) / 2) * size.w}px, ${((1 - v.y) / 2) * size.h}px)`;
            el.style.opacity = row ? (rowOn ? "1" : "0.35") : "0";
          }
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor!.needsUpdate = true;

        if (tip.current && hit !== null) {
          const { x, z } = cell(Math.floor(hit / COLS), hit % COLS);
          v.set(x, heights[hit], z).project(camera);
          tip.current.style.transform = `translate(${((v.x + 1) / 2) * size.w}px, ${((1 - v.y) / 2) * size.h}px)`;
        }
        scene.rotation.y = reduce ? 0 : Math.sin(time * 0.12) * 0.05;
      },
    };
  });

  return (
    <div className="absolute inset-0">
      <canvas
        ref={ref}
        aria-hidden="true"
        onClick={() => hoveredRef.current !== null && live.current.onPick(hoveredRef.current)}
        className="absolute inset-0 h-full w-full"
      />
      {/* row numbers and the hover readout are DOM, so they stay crisp at any DPR */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 8 }, (_, r) => (
          <span
            key={r}
            ref={(el) => {
              labels.current[r] = el;
            }}
            className="absolute left-0 top-0 -translate-y-1/2 font-mono text-[10px] tabular-nums text-muted-foreground opacity-0 transition-opacity duration-300 will-change-transform"
          >
            {String(r + 1).padStart(2, "0")}
          </span>
        ))}
        <div ref={tip} className="absolute left-0 top-0 will-change-transform">
          {hovered && (
            <div className="-translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground">
              <div className="uppercase tracking-[0.16em] text-gold">{hovered.row}</div>
              <div className="mt-1 max-w-64 truncate font-display text-sm">
                {hovered.item.title}
              </div>
              <div className="mt-0.5 text-muted-foreground">{hovered.item.priceLabel}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
