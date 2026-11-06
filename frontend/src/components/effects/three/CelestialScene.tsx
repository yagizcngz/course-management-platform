import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";
import { useThreeScene } from "./useThreeScene";
import { sealGraph } from "./sealEmblems";

export interface CelestialProps {
  /** Filled sign-up steps; each one draws the next stretch of the active role's seal. */
  done: number;
  total: number;
  /**
   * "student": a cool, low view across one calm orbital plane under the mortarboard seal.
   * "teacher": the camera rises, the light warms, orbits fan out and quicken under the lectern.
   */
  mode: "student" | "teacher";
  /** Account created: the sun flares, a shock ring rolls out and the figure shines. */
  lit: boolean;
  /** Bumped on every failed attempt: the sky flickers ember-red and the system jolts. */
  shake: number;
}

type Mode = CelestialProps["mode"];
type RGB = readonly [number, number, number];

// colour temperature per role: [cool learner, warm instructor]
const ORBIT_TINT: Record<Mode, RGB> = { student: [0.45, 0.72, 0.95], teacher: [0.95, 0.74, 0.4] };
const STAR_TINT: Record<Mode, RGB> = { student: [0.78, 0.88, 1.0], teacher: [1.0, 0.86, 0.62] };
const EMBER: RGB = [0.95, 0.36, 0.26];

// The constellations are the role seals stamped on sign-in (sealEmblems), so filling the form
// traces the seal the new account will carry: the emblem first, then the ring that closes it.
const FIGURE_AT: Record<Mode, [number, number]> = { student: [-3.4, 4.3], teacher: [3.2, 4.4] };
const FIGURE_SCALE = 0.0145; // camera-space units per seal canvas pixel: the ring is ~2.9 across
const RING_STARS = 12;
const DRAW_SPEED = 4; // edges per second; a step's edges are drawn one after another
const MODES: Mode[] = ["student", "teacher"];

// semi-major axis, eccentricity, radius, surface, axial tilt; speed follows Kepler (a^-1.5)
const PLANETS = [
  { a: 1.25, e: 0.12, r: 0.09, look: "rock", c: ["#8f8379", "#5f564f"], tilt: 0.05 },
  { a: 1.75, e: 0.03, r: 0.15, look: "cloud", c: ["#e6c995", "#c49a5e"], tilt: 0.04 },
  { a: 2.35, e: 0.04, r: 0.16, look: "earth", c: ["#2c6aa6", "#6f8f4b"], tilt: 0.41, moon: true },
  { a: 2.95, e: 0.08, r: 0.12, look: "rock", c: ["#b5583c", "#7d3523"], tilt: 0.44 },
  { a: 4.45, e: 0.05, r: 0.38, look: "gas", c: ["#c9a27a", "#efdcbb", "#9c6d4b"], tilt: 0.05 },
  {
    a: 5.45,
    e: 0.05,
    r: 0.31,
    look: "gas",
    c: ["#e3cc93", "#f4e7c4", "#b99a62"],
    tilt: 0.47,
    ring: true,
  },
  { a: 6.3, e: 0.03, r: 0.2, look: "ice", c: ["#86c3dc", "#5e9fc0"], tilt: 0.5 },
] as const;
const KEPLER = 1.1; // angular speed at a = 1 (rad/s)
const ORBIT_SEG = 160;
const BELT = 900;

/** Deterministic noise in -1..1. */
const rand = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};
const mix = (a: RGB, b: RGB, t: number) =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as const;

/** Eccentric anomaly for mean anomaly m (Newton's method; converges in a few steps for e < 0.2). */
const eccentric = (m: number, e: number) => {
  let E = m;
  for (let k = 0; k < 4; k++) E -= (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
  return E;
};

/**
 * The sign-up centrepiece: a living solar system under two constellations. Planets keep true
 * elliptical orbits at Kepler speeds, each trailing a fading arc; an asteroid belt turns between
 * the rocky and the giant worlds. Each completed step draws the next stretch of the role's seal
 * as a constellation; switching role eases the camera, colour temperature, orbital fan and speed to
 * the other state. A failed attempt flickers the sky ember-red; success flares the sun.
 */
export function CelestialScene(props: CelestialProps) {
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });

  const ref = useThreeScene(({ THREE, scene, pointer, reduce }) => {
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    scene.add(camera); // the constellations ride in camera space so they stay framed
    scene.add(new THREE.AmbientLight(0x8fa3c7, 0.38));
    const sunLight = new THREE.PointLight(0xfff0d6, 2.4, 0, 0);
    scene.add(sunLight);

    const canvasTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      draw(c.getContext("2d")!);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };
    const dot = canvasTexture(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.22, "rgba(255,255,255,0.75)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    });
    const additive = {
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    } as const;

    // --- deep sky: a starfield with a milky band, star colours by temperature, and nebulae -----
    const SKY = 3200;
    const skyPos = new Float32Array(SKY * 3);
    const skyCol = new Float32Array(SKY * 3);
    const skyPhase = new Float32Array(SKY);
    const skySize = new Float32Array(SKY);
    const band = new THREE.Euler(0.5, 0, 0.35);
    const v = new THREE.Vector3();
    for (let i = 0; i < SKY; i++) {
      const r = 70 + rand(i, 3) * 18;
      if (i % 3 === 0) {
        // the milky band: a thick ring of stars on a tilted great circle
        const th = ((rand(i, 1) + 1) / 2) * Math.PI * 2;
        v.set(Math.cos(th), rand(i, 2) * 0.12, Math.sin(th))
          .normalize()
          .applyEuler(band);
      } else {
        const th = ((rand(i, 1) + 1) / 2) * Math.PI * 2;
        const ph = Math.acos(rand(i, 2));
        v.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      }
      skyPos.set([v.x * r, v.y * r, v.z * r], i * 3);
      // blue-white to amber
      const temp = (rand(i, 6) + 1) / 2;
      skyCol.set(mix([1.0, 0.78, 0.58], [0.7, 0.82, 1.0], temp), i * 3);
      skyPhase[i] = rand(i, 4) * Math.PI;
      skySize[i] = 1.2 + ((rand(i, 5) + 1) / 2) ** 4 * 5;
    }
    const skyGeo = new THREE.BufferGeometry();
    skyGeo.setAttribute("position", new THREE.BufferAttribute(skyPos, 3));
    skyGeo.setAttribute("color", new THREE.BufferAttribute(skyCol, 3));
    skyGeo.setAttribute("phase", new THREE.BufferAttribute(skyPhase, 1));
    skyGeo.setAttribute("size", new THREE.BufferAttribute(skySize, 1));
    const skyMat = new THREE.ShaderMaterial({
      ...additive,
      uniforms: {
        uTime: { value: 0 },
        uTint: { value: new THREE.Color(1, 1, 1) },
        uGain: { value: 0.9 },
        uMap: { value: dot },
        uScale: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float phase;
        attribute float size;
        attribute vec3 color;
        uniform float uTime;
        uniform float uScale;
        varying float vTwinkle;
        varying vec3 vColor;
        void main() {
          vTwinkle = 0.6 + 0.4 * sin(uTime * (0.5 + fract(phase) * 1.6) + phase * 3.0);
          vColor = color;
          gl_PointSize = size * uScale * vTwinkle;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uTint;
        uniform float uGain;
        varying float vTwinkle;
        varying vec3 vColor;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a * uGain * vTwinkle;
          gl_FragColor = vec4(vColor * uTint * a, a);
        }`,
    });
    const sky = new THREE.Points(skyGeo, skyMat);
    scene.add(sky);

    const cloud = canvasTexture(256, 256, (g) => {
      for (let k = 0; k < 26; k++) {
        const x = 128 + rand(k, 1) * 70;
        const y = 128 + rand(k, 2) * 70;
        const r = 40 + ((rand(k, 3) + 1) / 2) * 70;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(255,255,255,0.16)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, 256, 256);
      }
    });
    const nebulae = (
      [
        [0x5a7fd6, -40, 22, -60, 70, "student"],
        [0x8a5ad6, 46, 6, -58, 60, null],
        [0xd69a5a, 20, 30, -64, 80, "teacher"],
      ] as const
    ).map(([color, x, y, z, s, role]) => {
      const m = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: cloud, color, opacity: 0.3, ...additive }),
      );
      m.position.set(x, y, z);
      m.scale.setScalar(s);
      scene.add(m);
      return { m, role };
    });

    // --- the system ---------------------------------------------------------------------------
    const system = new THREE.Group();
    scene.add(system);

    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFlare: { value: 0 },
        uWarm: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vP;
        varying vec3 vV;
        void main() {
          vN = normalize(normalMatrix * normal);
          vP = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uFlare;
        uniform float uWarm;
        varying vec3 vN;
        varying vec3 vP;
        varying vec3 vV;
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float noise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
                mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
            mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
        }
        float fbm(vec3 p) {
          float a = 0.5, s = 0.0;
          for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
          return s;
        }
        void main() {
          vec3 p = normalize(vP) * 3.2;
          // granulation: two layers of boiling cells drifting against each other
          float n = fbm(p + vec3(0.0, uTime * 0.12, uTime * 0.05));
          float m = fbm(p * 2.6 - vec3(uTime * 0.09));
          float limb = pow(max(dot(vN, vV), 0.0), 0.5);
          vec3 deep = mix(vec3(0.95, 0.42, 0.12), vec3(0.98, 0.5, 0.1), uWarm);
          vec3 hot = mix(vec3(1.0, 0.93, 0.78), vec3(1.0, 0.86, 0.55), uWarm);
          vec3 col = mix(deep, hot, smoothstep(0.25, 0.85, n * 0.75 + m * 0.45));
          col *= 0.5 + 0.7 * limb;
          gl_FragColor = vec4(col * (1.0 + uFlare * 0.9), 1.0);
        }`,
    });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.55, 64, 40), sunMat);
    system.add(sun);
    const glowMat = (color: number, opacity: number) =>
      new THREE.SpriteMaterial({ map: dot, color, opacity, ...additive });
    const corona = new THREE.Sprite(glowMat(0xffc46e, 0.75));
    const aura = new THREE.Sprite(glowMat(0xff9d4a, 0.28));
    system.add(corona, aura);

    // success: a shock ring rolls out across the ecliptic
    const shock = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 1, 128),
      new THREE.MeshBasicMaterial({
        color: 0xffd9a0,
        side: THREE.DoubleSide,
        opacity: 0,
        ...additive,
      }),
    );
    shock.rotation.x = -Math.PI / 2;
    system.add(shock);

    // procedural surfaces on an equirectangular canvas
    const surface = (look: string, c: readonly string[], seed: number) =>
      canvasTexture(256, 128, (g) => {
        g.fillStyle = c[0];
        g.fillRect(0, 0, 256, 128);
        if (look === "gas") {
          // latitude bands with wavy edges and a storm eye
          for (let y = 0; y < 128; y += 2) {
            const t = Math.sin(y * 0.19 + seed) * 0.5 + Math.sin(y * 0.47 + seed * 2) * 0.5;
            g.fillStyle = c[t > 0.25 ? 1 : t < -0.35 ? 2 : 0];
            g.globalAlpha = 0.55;
            for (let x = 0; x < 256; x += 8) g.fillRect(x, y + Math.sin(x * 0.05 + y) * 1.5, 8, 2);
          }
          g.globalAlpha = 0.7;
          g.fillStyle = c[2];
          g.beginPath();
          g.ellipse(170, 78, 14, 7, 0, 0, Math.PI * 2);
          g.fill();
        } else {
          // blotches: craters / maria for rock, continents for earth, ice sheets for ice
          const n = look === "earth" ? 22 : 60;
          for (let k = 0; k < n; k++) {
            g.globalAlpha = look === "earth" ? 0.9 : 0.35;
            g.fillStyle = c[1];
            g.beginPath();
            const r =
              look === "earth"
                ? 8 + ((rand(k, seed) + 1) / 2) * 16
                : 2 + ((rand(k, seed) + 1) / 2) * 7;
            g.ellipse(
              128 + rand(k, seed + 1) * 128,
              64 + rand(k, seed + 2) * 46,
              r * 1.4,
              r,
              rand(k, 9),
              0,
              Math.PI * 2,
            );
            g.fill();
          }
          if (look === "earth" || look === "cloud" || look === "ice") {
            g.globalAlpha = look === "cloud" ? 0.5 : 0.35;
            g.fillStyle = "#ffffff";
            for (let k = 0; k < 40; k++)
              g.fillRect(
                128 + rand(k, seed + 3) * 128,
                64 + rand(k, seed + 4) * 56,
                20 + rand(k, 5) * 14,
                2,
              );
          }
          if (look === "earth" || look === "ice") {
            g.globalAlpha = 0.85;
            g.fillStyle = "#f4f7fb";
            g.fillRect(0, 0, 256, 7);
            g.fillRect(0, 121, 256, 7);
          }
        }
        g.globalAlpha = 1;
      });

    const atmosphere = (r: number, color: RGB) =>
      new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.14, 32, 20),
        new THREE.ShaderMaterial({
          ...additive,
          uniforms: { uColor: { value: new THREE.Color(...color) } },
          vertexShader: /* glsl */ `
            varying vec3 vN;
            varying vec3 vV;
            void main() {
              vN = normalize(normalMatrix * normal);
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vV = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            varying vec3 vN;
            varying vec3 vV;
            void main() {
              float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.5);
              gl_FragColor = vec4(uColor * f, f);
            }`,
        }),
      );

    const planets = PLANETS.map((p, i) => {
      const pivot = new THREE.Group(); // orbit plane: periapsis direction and inclination
      system.add(pivot);
      const holder = new THREE.Group();
      pivot.add(holder);
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(p.r, 48, 28),
        new THREE.MeshStandardMaterial({ map: surface(p.look, p.c, i + 1), roughness: 0.85 }),
      );
      body.rotation.z = p.tilt;
      holder.add(body);
      if (p.look !== "rock")
        holder.add(
          atmosphere(
            p.r,
            p.look === "earth"
              ? [0.35, 0.6, 1]
              : p.look === "ice"
                ? [0.5, 0.85, 1]
                : [1, 0.8, 0.55],
          ),
        );
      if ("ring" in p) {
        const ringTex = canvasTexture(256, 4, (g) => {
          for (let x = 0; x < 256; x++) {
            const a = 0.15 + 0.6 * Math.abs(Math.sin(x * 0.11) * Math.sin(x * 0.037 + 1));
            g.fillStyle = `rgba(236,214,170,${x < 30 || (x > 150 && x < 162) ? 0.04 : a})`;
            g.fillRect(x, 0, 1, 4);
          }
        });
        const ringGeo = new THREE.RingGeometry(p.r * 1.35, p.r * 2.3, 96, 1);
        // map the texture radially: u runs from the inner to the outer edge
        const pos = ringGeo.attributes.position;
        const uv = ringGeo.attributes.uv;
        for (let k = 0; k < pos.count; k++) {
          const d = Math.hypot(pos.getX(k), pos.getY(k));
          uv.setXY(k, (d - p.r * 1.35) / (p.r * 0.95), 0.5);
        }
        const ring = new THREE.Mesh(
          ringGeo,
          new THREE.MeshStandardMaterial({
            map: ringTex,
            transparent: true,
            side: THREE.DoubleSide,
            roughness: 1,
          }),
        );
        ring.rotation.x = Math.PI / 2;
        body.add(ring);
      }
      let moon: THREE_NS.Group | null = null;
      if ("moon" in p) {
        moon = new THREE.Group();
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 20, 12),
          new THREE.MeshStandardMaterial({ color: 0xcfd0d6, roughness: 0.9 }),
        );
        m.position.x = 0.32;
        moon.add(m);
        moon.rotation.z = 0.2;
        holder.add(moon);
      }

      // the orbit as a closed ellipse with the sun at a focus; colours make a fading trail
      const b = p.a * Math.sqrt(1 - p.e * p.e);
      const oPos = new Float32Array(ORBIT_SEG * 3);
      for (let j = 0; j < ORBIT_SEG; j++) {
        const E = (j / ORBIT_SEG) * Math.PI * 2;
        oPos.set([p.a * (Math.cos(E) - p.e), 0, b * Math.sin(E)], j * 3);
      }
      const oGeo = new THREE.BufferGeometry();
      oGeo.setAttribute("position", new THREE.BufferAttribute(oPos, 3));
      oGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(ORBIT_SEG * 3), 3));
      pivot.add(
        new THREE.LineLoop(oGeo, new THREE.LineBasicMaterial({ vertexColors: true, ...additive })),
      );

      return {
        p,
        b,
        pivot,
        holder,
        body,
        moon,
        oGeo,
        mean: ((rand(i, 8) + 1) / 2) * Math.PI * 2,
        periapsis: rand(i, 7) * Math.PI,
      };
    });

    // asteroid belt: positions advance on the GPU at each rock's own Kepler speed
    const beltR = new Float32Array(BELT);
    const beltA = new Float32Array(BELT);
    const beltPos = new Float32Array(BELT * 3);
    const beltSize = new Float32Array(BELT);
    for (let i = 0; i < BELT; i++) {
      beltR[i] = 3.35 + ((rand(i, 1) + 1) / 2) * 0.55 + rand(i, 2) * 0.05;
      beltA[i] = ((rand(i, 3) + 1) / 2) * Math.PI * 2;
      beltPos[i * 3 + 1] = rand(i, 4) * 0.06;
      beltSize[i] = 0.6 + ((rand(i, 5) + 1) / 2) ** 3 * 2.2;
    }
    const beltGeo = new THREE.BufferGeometry();
    beltGeo.setAttribute("position", new THREE.BufferAttribute(beltPos, 3));
    beltGeo.setAttribute("radius", new THREE.BufferAttribute(beltR, 1));
    beltGeo.setAttribute("angle", new THREE.BufferAttribute(beltA, 1));
    beltGeo.setAttribute("size", new THREE.BufferAttribute(beltSize, 1));
    const beltMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uTint: { value: new THREE.Color() } },
      vertexShader: /* glsl */ `
        attribute float radius;
        attribute float angle;
        attribute float size;
        uniform float uTime;
        uniform float uScale;
        varying float vLight;
        void main() {
          float a = angle + uTime * ${KEPLER.toFixed(3)} * pow(radius, -1.5);
          vec3 p = vec3(cos(a) * radius, position.y, sin(a) * radius);
          vLight = 0.55 + 0.45 * fract(angle * 7.3);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = size * uScale * (14.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTint;
        varying float vLight;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(uTint * vLight, 0.85 * (1.0 - d * 1.6));
        }`,
    });
    const belt = new THREE.Points(beltGeo, beltMat);
    belt.frustumCulled = false; // its real positions come from the shader
    system.add(belt);

    // --- constellations in camera space -------------------------------------------------------
    const figures = MODES.map((mode) => {
      const [ax, ay] = FIGURE_AT[mode];
      const { nodes, edges } = sealGraph(mode, RING_STARS);
      const n = nodes.length;
      const pts = nodes.map(
        ([x, y]) =>
          new THREE.Vector3(ax + (x - 128) * FIGURE_SCALE, ay - (y - 128) * FIGURE_SCALE, -22),
      );
      const sPos = new Float32Array(n * 3);
      pts.forEach((pt, i) => sPos.set([pt.x, pt.y, pt.z], i * 3));
      const sGeo = new THREE.BufferGeometry();
      sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
      sGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const starMat = new THREE.PointsMaterial({
        size: 0.7,
        map: dot,
        vertexColors: true,
        ...additive,
      });
      const e = edges.length;
      const lGeo = new THREE.BufferGeometry();
      lGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(e * 6), 3));
      lGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(e * 6), 3));
      const group = new THREE.Group();
      group.add(
        new THREE.Points(sGeo, starMat),
        new THREE.LineSegments(
          lGeo,
          new THREE.LineBasicMaterial({ vertexColors: true, ...additive }),
        ),
      );
      camera.add(group);
      return {
        mode,
        n,
        pts,
        edges,
        sGeo,
        lGeo,
        group,
        light: new Float32Array(n),
        reached: new Uint8Array(n),
        draw: new Float32Array(e),
      };
    });

    // --- state --------------------------------------------------------------------------------
    let role = live.current.mode === "teacher" ? 1 : 0; // eased 0 learner .. 1 instructor
    let flare = 0;
    let ember = 0;
    let jolt = 0;
    let wave = 1; // shock ring progress; 1 = idle
    let wasLit = live.current.lit;
    let shakeSeen = live.current.shake;
    let simTime = 0;
    let aspect = 1;
    const col = new THREE.Color();
    const tmp = new THREE.Vector3();
    const target = new THREE.Vector3(0, -0.3, 0);

    return {
      camera,
      resize(w, h) {
        aspect = w / h;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        // narrow panels shrink the two seals towards the centre so neither is cut off; uniformly,
        // so the rings stay round
        for (const f of figures) f.group.scale.setScalar(Math.min(1, aspect / 0.95));
        const dpr = Math.min(window.devicePixelRatio, 2);
        skyMat.uniforms.uScale.value = dpr;
        beltMat.uniforms.uScale.value = dpr;
      },
      update(time, delta) {
        const { done, total, mode, lit, shake } = live.current;
        const k = reduce ? 1 : 1 - Math.exp(-delta * 3.2);
        role += ((mode === "teacher" ? 1 : 0) - role) * (reduce ? 1 : 1 - Math.exp(-delta * 1.6));
        flare += ((lit ? 1 : 0) - flare) * k;
        if (lit && !wasLit) wave = 0;
        wasLit = lit;
        if (shake !== shakeSeen) {
          shakeSeen = shake;
          ember = 1;
          jolt = 1;
        }
        ember = Math.max(0, ember - delta * 0.55);
        jolt = Math.max(0, jolt - delta * 2.4);
        const ease = role * role * (3 - 2 * role);

        // instructors run the system faster; success spins it up briefly
        if (!reduce) simTime += delta * (1 + ease * 0.45 + flare * 1.2);
        const t = reduce ? 2 : simTime;

        // camera: a low, close learner's view vs a high, wider instructor's survey
        const elev = 0.32 + ease * 0.55;
        const azim =
          -0.35 + ease * 0.55 + pointer.x * 0.18 + (reduce ? 0 : Math.sin(time * 0.05) * 0.06);
        const dist = (aspect < 0.9 ? 19 : 16) + ease * 3 - flare * 1.2;
        camera.position.set(
          Math.sin(azim) * Math.cos(elev) * dist,
          Math.sin(elev) * dist + pointer.y * 0.6,
          Math.cos(azim) * Math.cos(elev) * dist,
        );
        target.set(0, -0.3 - ease * 0.6, 0);
        camera.lookAt(target);
        system.position.x = reduce ? 0 : Math.sin(time * 46) * 0.12 * jolt;

        const orbitTint = mix(
          mix(ORBIT_TINT.student, ORBIT_TINT.teacher, ease),
          EMBER,
          ember * 0.8,
        );
        const starTint = mix(mix(STAR_TINT.student, STAR_TINT.teacher, ease), EMBER, ember);

        // sun
        sunMat.uniforms.uTime.value = time;
        sunMat.uniforms.uFlare.value = flare;
        sunMat.uniforms.uWarm.value = ease;
        const pulse = reduce ? 0 : Math.sin(time * 1.3) * 0.08;
        corona.scale.setScalar(2.6 + ease * 0.5 + flare * 1.8 + pulse);
        aura.scale.setScalar(6 + ease * 1.5 + flare * 4 + pulse * 3);
        sunLight.intensity = 2.4 + flare * 2 + ease * 0.4;
        if (wave < 1 && !reduce) {
          wave = Math.min(1, wave + delta * 0.45);
          shock.scale.setScalar(0.6 + wave * 7.5);
          (shock.material as THREE_NS.MeshBasicMaterial).opacity = (1 - wave) * 0.7;
        } else (shock.material as THREE_NS.MeshBasicMaterial).opacity = 0;

        // planets on Keplerian ellipses; orbits fan out of the plane for instructors
        for (const [i, o] of planets.entries()) {
          const { p, b } = o;
          o.pivot.rotation.set(rand(i, 11) * 0.22 * ease, o.periapsis, rand(i, 12) * 0.18 * ease);
          const E = eccentric(o.mean + t * KEPLER * p.a ** -1.5, p.e);
          o.holder.position.set(p.a * (Math.cos(E) - p.e), 0, b * Math.sin(E));
          if (!reduce) o.body.rotation.y += delta * (1.4 - i * 0.12);
          if (o.moon && !reduce) o.moon.rotation.y += delta * 2.2;
          // trail: brightest just behind the planet, fading around the ellipse
          const cAttr = o.oGeo.attributes.color as THREE_NS.BufferAttribute;
          const Ep = ((E % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          for (let j = 0; j < ORBIT_SEG; j++) {
            const behind = (Ep - (j / ORBIT_SEG) * Math.PI * 2 + Math.PI * 4) % (Math.PI * 2);
            const s = 0.1 + 0.85 * (1 - behind / (Math.PI * 2)) ** 7 + flare * 0.25;
            cAttr.setXYZ(j, orbitTint[0] * s, orbitTint[1] * s, orbitTint[2] * s);
          }
          cAttr.needsUpdate = true;
        }
        beltMat.uniforms.uTime.value = t;
        beltMat.uniforms.uTint.value.setRGB(...mix([0.62, 0.58, 0.54], orbitTint, 0.25));

        // sky: colour temperature, twinkle, ember flicker; nebulae follow the role
        skyMat.uniforms.uTime.value = time;
        skyMat.uniforms.uGain.value = 0.85 + flare * 0.35 + ember * 0.3;
        skyMat.uniforms.uTint.value.setRGB(...starTint);
        sky.rotation.y = reduce ? 0 : time * 0.003;
        for (const { m, role: r } of nebulae) {
          const want = r === "student" ? 1 - ease : r === "teacher" ? ease : 0.5;
          (m.material as THREE_NS.SpriteMaterial).opacity = 0.08 + want * 0.32 + flare * 0.1;
        }

        // constellations: the active seal draws its share of edges, one after another, and lights
        // the stars they reach; going back (a cleared field) unwinds them from the end. The other
        // seal dims to a faint ghost.
        for (const f of figures) {
          const active = f.mode === mode;
          const weight = f.mode === "teacher" ? ease : 1 - ease;
          const e = f.edges.length;
          const on = active ? Math.min(e, Math.round((done / Math.max(1, total)) * e)) : 0;
          const step = reduce ? 1 : delta * DRAW_SPEED;
          f.reached.fill(0);
          for (let i = 0; i < e; i++) {
            const want = (active && i < on) || (active && flare > 0.5) ? 1 : 0;
            // grow only after the previous edge is complete, shrink only after the next is gone
            const free = want ? i === 0 || f.draw[i - 1] >= 1 : i === e - 1 || f.draw[i + 1] <= 0;
            if (free)
              f.draw[i] = want ? Math.min(1, f.draw[i] + step) : Math.max(0, f.draw[i] - step);
            const [a, b] = f.edges[i];
            if (f.draw[i] > 0) f.reached[a] = 1;
            if (f.draw[i] >= 1) f.reached[b] = 1;
          }
          const sCol = f.sGeo.attributes.color as THREE_NS.BufferAttribute;
          for (let i = 0; i < f.n; i++) {
            const want = active ? (f.reached[i] ? 1 : 0.22) : 0.1;
            f.light[i] += (Math.max(want, active ? flare : 0) - f.light[i]) * k;
            const tw = reduce ? 1 : 0.82 + 0.18 * Math.sin(time * 2.1 + i * 1.9);
            const bgt = f.light[i] * tw * (1 + flare * 0.5) * (0.35 + 0.65 * weight);
            col.setRGB(starTint[0] * bgt, starTint[1] * bgt, starTint[2] * bgt);
            sCol.setXYZ(i, col.r, col.g, col.b);
          }
          sCol.needsUpdate = true;
          const lPos = f.lGeo.attributes.position as THREE_NS.BufferAttribute;
          const lCol = f.lGeo.attributes.color as THREE_NS.BufferAttribute;
          for (let i = 0; i < e; i++) {
            const [a, b] = f.edges[i];
            // each line grows from its first star towards the second
            tmp.copy(f.pts[a]).lerp(f.pts[b], f.draw[i]);
            lPos.setXYZ(i * 2, f.pts[a].x, f.pts[a].y, f.pts[a].z);
            lPos.setXYZ(i * 2 + 1, tmp.x, tmp.y, tmp.z);
            const al = 0.7 * Math.min(1, f.draw[i] * 3) * (0.4 + 0.6 * weight);
            lCol.setXYZ(i * 2, orbitTint[0] * al, orbitTint[1] * al, orbitTint[2] * al);
            lCol.setXYZ(
              i * 2 + 1,
              orbitTint[0] * al * 0.5,
              orbitTint[1] * al * 0.5,
              orbitTint[2] * al * 0.5,
            );
          }
          lPos.needsUpdate = true;
          lCol.needsUpdate = true;
          // a gentle drift; the active figure leans forward a little
          f.group.position.set(
            -pointer.x * 0.3,
            -pointer.y * 0.2 + (active ? 0 : 0.15),
            active ? 0.6 : 0,
          );
        }
      },
    };
  });

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
