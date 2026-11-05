import { useEffect, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useThreeScene } from "./useThreeScene";

export interface Peak {
  name: string;
  label: string;
  count: number;
  /** Shown on the summit tag instead of the count (e.g. a course price). */
  meta?: string;
  /** True when a search is active and this category has matches. */
  match: boolean;
}

const MAX = 8;
// fixed survey points, spread over the right of the sheet where no text sits
const SITES: [number, number][] = [
  [2.2, -3.0],
  [0.0, 0.6],
  [3.4, 0.8],
  [5.6, -2.2],
  [-0.6, -3.6],
  [4.4, -5.6],
  [1.6, -1.0],
  [7.0, -5.8],
];

const vertex = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec4 uPeaks[${MAX}]; // x, z, height, match
  varying float vHeight;
  varying float vGlow;
  varying float vFade;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 p = position;
    float h = fbm(p.xz * 0.3 + vec2(uTime * 0.02, uTime * 0.012)) * 1.1;
    float glow = 0.0;
    for (int i = 0; i < ${MAX}; i++) {
      vec2 d = p.xz - uPeaks[i].xy;
      float k = exp(-dot(d, d) / 2.6);
      h += uPeaks[i].z * k;
      glow = max(glow, uPeaks[i].w * exp(-dot(d, d) / 4.0));
    }
    vec2 dp = p.xz - uPointer;
    h += exp(-dot(dp, dp) * 0.5) * 0.45;
    p.y = h;
    vHeight = h;
    vGlow = glow;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vFade = smoothstep(28.0, 10.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uAccent;
  uniform float uDim;
  varying float vHeight;
  varying float vGlow;
  varying float vFade;

  float line(float v, float width) {
    float f = abs(fract(v - 0.5) - 0.5) / fwidth(v);
    return 1.0 - smoothstep(width - 0.5, width + 0.5, f);
  }

  void main() {
    float v = vHeight * 6.0;
    float minor = line(v, 0.7);
    float major = line(v / 5.0, 1.0);
    // gold is reserved for search matches, so the legend's "gold = match" stays true
    vec3 col = mix(uInk, uAccent, vGlow);
    // during a search, terrain away from matching peaks recedes
    float keep = mix(1.0, 0.35 + 0.65 * vGlow, uDim);
    float a = max(minor * 0.5, major * 0.9) * vFade * keep;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

/**
 * Variant C: the catalogue as a survey sheet. Every category is a summit whose height is
 * its course count; matching summits turn gold during a search. Summit labels are DOM
 * buttons pinned to projected positions, so they stay crisp and keyboard reachable.
 */
export function ContourScene({
  peaks,
  searching,
  onPick,
  readout,
}: {
  peaks: Peak[];
  searching: boolean;
  onPick: (name: string) => void;
  readout?: RefObject<HTMLElement | null>;
}) {
  const { t } = useTranslation();
  const live = useRef({ peaks, searching });
  useEffect(() => {
    live.current = { peaks, searching };
  }, [peaks, searching]);
  const tags = useRef<(HTMLButtonElement | null)[]>([]);

  const ref = useThreeScene(({ THREE, scene, renderer, pointer, raw, reduce }) => {
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    const target = new THREE.Vector3(2.6, 0.6, -1.6);

    const uniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(99, 99) },
      uPeaks: { value: Array.from({ length: MAX }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uInk: { value: new THREE.Color(0x2b303b) },
      uAccent: { value: new THREE.Color(0xb8913a) },
      uDim: { value: 0 },
    };
    SITES.forEach(([x, z], i) => uniforms.uPeaks.value[i].set(x, z, 0, 0));
    const geo = new THREE.PlaneGeometry(36, 28, 240, 190);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      transparent: true,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(geo, mat));

    const raycaster = new THREE.Raycaster();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6);
    const hit = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    const v = new THREE.Vector3();
    let size = { w: 1, h: 1 };
    let narrow = false;
    let lastReadout = "";

    return {
      camera,
      resize(w, h) {
        size = { w, h };
        narrow = w / h < 1.1;
        camera.aspect = w / h;
        camera.fov = narrow ? 52 : 38;
        // on narrow screens the text sits above the map, so centre the summits
        target.set(narrow ? 2.6 : 1.4, 0.6, narrow ? -2.2 : -1.6);
        camera.updateProjectionMatrix();
      },
      update(time) {
        const { peaks: data, searching: s } = live.current;
        const step = reduce ? 1 : 0.06;
        uniforms.uTime.value = reduce ? 0 : time;
        uniforms.uDim.value += ((s ? 1 : 0) - uniforms.uDim.value) * step;
        const dark = !!renderer.domElement.closest(".dark");
        uniforms.uInk.value.setHex(dark ? 0xefe9dc : 0x2b303b);
        uniforms.uAccent.value.setHex(dark ? 0xd9b45f : 0xb8913a);

        uniforms.uPeaks.value.forEach((pk, i) => {
          const d = data[i];
          const goalH = d ? Math.min(0.9 + d.count * 0.5, 3.4) : 0;
          pk.z += (goalH - pk.z) * step;
          pk.w += ((d && s && d.match ? 1 : 0) - pk.w) * step;
          const el = tags.current[i];
          if (!el) return;
          v.set(pk.x, pk.z + 0.75, pk.y).project(camera);
          const inView = d && Math.abs(v.x) < 0.95 && v.y < 0.9 && v.y > -0.95;
          el.style.transform = `translate(${((v.x + 1) / 2) * size.w}px, ${((1 - v.y) / 2) * size.h}px)`;
          el.style.opacity = inView ? (s && !d.match ? "0.4" : "1") : "0";
          el.style.visibility = inView ? "visible" : "hidden";
        });

        if (raw.inside) {
          ndc.set(raw.x, raw.y);
          raycaster.setFromCamera(ndc, camera);
          if (raycaster.ray.intersectPlane(ground, hit)) {
            uniforms.uPointer.value.set(hit.x, hit.z);
            if (readout?.current) {
              // a mock grid reference: the sheet is "drawn" over Istanbul
              const lat = 41 + (-hit.z + 10) / 60;
              const lon = 28.9 + (hit.x + 12) / 60;
              const fmt = (deg: number, pos: string) =>
                `${Math.floor(deg)}°${String(Math.floor((deg % 1) * 60)).padStart(2, "0")}′${pos}`;
              const text = `${fmt(lat, "N")} ${fmt(lon, "E")}`;
              if (text !== lastReadout) readout.current.textContent = lastReadout = text;
            }
          }
        } else {
          uniforms.uPointer.value.set(99, 99);
        }

        camera.position.set(target.x + pointer.x * 0.6, 7.6, target.z + 11);
        camera.lookAt(target);
      },
    };
  });

  return (
    <div className="absolute inset-0">
      <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: MAX }, (_, i) => {
          const pk = peaks[i];
          return (
            <button
              key={i}
              type="button"
              tabIndex={pk ? 0 : -1}
              aria-hidden={pk ? undefined : true}
              ref={(el) => {
                tags.current[i] = el;
              }}
              onClick={() => pk && onPick(pk.name)}
              aria-label={
                pk
                  ? pk.meta
                    ? `${pk.label}, ${pk.meta}`
                    : t("guest.peakAria", { name: pk.label, count: pk.count })
                  : undefined
              }
              className="group pointer-events-auto absolute left-0 top-0 flex -translate-x-1/2 -translate-y-full flex-col items-center opacity-0 transition-opacity duration-300 will-change-transform focus-visible:outline-none"
            >
              {pk && (
                <>
                  <span className="whitespace-nowrap border border-foreground/70 bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground transition-colors group-hover:border-gold group-hover:text-gold group-focus-visible:border-gold group-focus-visible:text-gold">
                    {pk.label}
                    <span className="ml-2 text-muted-foreground">{pk.meta ?? pk.count}</span>
                  </span>
                  <span aria-hidden="true" className="h-6 w-px bg-foreground/60" />
                  <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-foreground" />
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
