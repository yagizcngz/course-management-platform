import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";
import { useThreeScene } from "./useThreeScene";

export interface CelestialProps {
  /** Filled sign-up steps; each one lights the next star of the constellation. */
  done: number;
  total: number;
  /** "student" turns the planets in one quiet plane; "teacher" opens the armillary rings. */
  mode: "student" | "teacher";
  /** Account created: the sun flares and the whole figure shines. */
  lit: boolean;
  /** Bumped on every failed attempt: the sky flickers ember-red and the orrery jolts. */
  shake: number;
}

const BRASS = 0xb8925a;
const GOLD = 0xd9b45f;
const EMBER = [0.86, 0.36, 0.28];
const CHAMPAGNE = [0.93, 0.85, 0.65];

// Two figures drawn as one continuous path; the instructor's has two more stars, like its form.
const FIGURES: Record<CelestialProps["mode"], [number, number][]> = {
  student: [
    [-2.6, 1.0],
    [-1.6, 2.0],
    [-0.4, 1.4],
    [0.7, 2.3],
    [1.9, 1.6],
    [2.8, 2.5],
  ],
  teacher: [
    [-3.0, 1.2],
    [-2.0, 2.2],
    [-0.9, 1.7],
    [0.1, 2.6],
    [1.1, 2.0],
    [2.2, 2.8],
    [2.9, 1.9],
    [2.3, 1.1],
  ],
};

const PLANETS = [
  { orbit: 1.0, size: 0.11, color: 0xbec0c6, speed: 1.6 },
  { orbit: 1.45, size: 0.15, color: 0xe8d6aa, speed: 1.15 },
  { orbit: 1.95, size: 0.16, color: 0x96b4cd, speed: 0.85, moon: true },
  { orbit: 2.5, size: 0.13, color: 0xcd9687, speed: 0.62 },
  { orbit: 3.15, size: 0.28, color: 0xdec8a0, speed: 0.4, ring: true },
];

/** Deterministic noise in -1..1. */
const rand = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

/**
 * The sign-up centrepiece: a brass orrery under a night sky. Each completed step lights a star
 * and draws the next line of a constellation above it; the instructor path opens the armillary
 * rings and tilts every orbit; a failed attempt flickers the sky ember-red; success flares the sun.
 */
export function CelestialScene(props: CelestialProps) {
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });

  const ref = useThreeScene(({ THREE, scene, pointer, reduce }) => {
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    scene.add(new THREE.AmbientLight(0xfff1dc, 0.35));
    const key = new THREE.DirectionalLight(0xffecd0, 1.2);
    key.position.set(5, 8, 6);
    scene.add(key);
    const cool = new THREE.DirectionalLight(0x8fa3c7, 0.5);
    cool.position.set(-6, 1, -4);
    scene.add(cool);
    const sunLight = new THREE.PointLight(0xffd9a0, 2.2, 14, 1.4);
    sunLight.position.y = -0.9; // at the orrery's sun
    scene.add(sunLight);

    // a soft round sprite for stars and the sun's halo
    const dot = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.25, "rgba(255,255,255,0.8)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    })();

    // --- background sky: twinkling stars on a shell ---------------------------------------------
    const SKY = 2400;
    const skyPos = new Float32Array(SKY * 3);
    const skyPhase = new Float32Array(SKY);
    const skySize = new Float32Array(SKY);
    for (let i = 0; i < SKY; i++) {
      const u = (rand(i, 1) + 1) / 2;
      const v = (rand(i, 2) + 1) / 2;
      const th = u * Math.PI * 2;
      const ph = Math.acos(2 * v - 1);
      const r = 40 + rand(i, 3) * 6;
      skyPos.set(
        [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)],
        i * 3,
      );
      skyPhase[i] = rand(i, 4) * Math.PI;
      skySize[i] = 1.6 + ((rand(i, 5) + 1) / 2) ** 3 * 4.5;
    }
    const skyGeo = new THREE.BufferGeometry();
    skyGeo.setAttribute("position", new THREE.BufferAttribute(skyPos, 3));
    skyGeo.setAttribute("phase", new THREE.BufferAttribute(skyPhase, 1));
    skyGeo.setAttribute("size", new THREE.BufferAttribute(skySize, 1));
    const skyMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uTint: { value: new THREE.Color(...CHAMPAGNE) },
        uGain: { value: 0.9 },
        uMap: { value: dot },
        uScale: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float phase;
        attribute float size;
        uniform float uTime;
        uniform float uScale;
        varying float vTwinkle;
        void main() {
          vTwinkle = 0.65 + 0.35 * sin(uTime * (0.6 + fract(phase) * 1.4) + phase * 3.0);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale * vTwinkle;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uTint;
        uniform float uGain;
        varying float vTwinkle;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a;
          gl_FragColor = vec4(uTint * uGain * vTwinkle, a * uGain * vTwinkle);
        }`,
    });
    const sky = new THREE.Points(skyGeo, skyMat);
    scene.add(sky);

    // --- the orrery ---------------------------------------------------------------------------
    const orrery = new THREE.Group();
    orrery.position.y = -0.9;
    orrery.scale.setScalar(0.82);
    scene.add(orrery);
    const brass = new THREE.MeshStandardMaterial({
      color: BRASS,
      metalness: 0.75,
      roughness: 0.32,
    });
    const darkBrass = new THREE.MeshStandardMaterial({
      color: 0x6b5332,
      metalness: 0.7,
      roughness: 0.45,
    });

    // pedestal: foot, column and a collar under the sun
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 0.18, 48), darkBrass);
    foot.position.y = -1.55;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.45, 24), brass);
    column.position.y = -0.78;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 12, 48), brass);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -0.1;
    orrery.add(foot, column, collar);

    // the sun and its halo
    const sunMat = new THREE.MeshStandardMaterial({
      color: 0xffe6ad,
      emissive: 0xffb84d,
      emissiveIntensity: 1.1,
      roughness: 0.4,
    });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.32, 48, 32), sunMat);
    orrery.add(sun);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dot,
        color: 0xffc66e,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.scale.setScalar(2.2);
    orrery.add(halo);

    // armillary: equator, ecliptic and a meridian ring with tick marks; they open for instructors
    const ringGeo = (r: number) => new THREE.TorusGeometry(r, 0.018, 10, 160);
    const armillary = [3.75, 3.55, 3.35].map((r, i) => {
      const pivot = new THREE.Group();
      const ring = new THREE.Mesh(ringGeo(r), i === 1 ? brass : darkBrass);
      pivot.add(ring);
      // engraved ticks every 15 degrees
      for (let k = 0; k < 24; k++) {
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.03), brass);
        const a = (k / 24) * Math.PI * 2;
        tick.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        tick.rotation.z = a;
        pivot.add(tick);
      }
      orrery.add(pivot);
      return pivot;
    });

    // planets on brass arms; each arm rises from the column at its own height
    const planets = PLANETS.map((p, i) => {
      const pivot = new THREE.Group(); // tilts the orbit plane
      const spin = new THREE.Group(); // turns the arm
      pivot.add(spin);
      orrery.add(pivot);
      const orbitLine = new THREE.Mesh(
        new THREE.TorusGeometry(p.orbit, 0.006, 6, 200),
        new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.22 }),
      );
      orbitLine.rotation.x = Math.PI / 2;
      pivot.add(orbitLine);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, p.orbit, 8), brass);
      arm.rotation.z = Math.PI / 2;
      arm.position.x = p.orbit / 2;
      spin.add(arm);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 8), brass);
      post.position.set(p.orbit, -0.08, 0);
      spin.add(post);
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(p.size, 32, 20),
        new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.55, metalness: 0.1 }),
      );
      body.position.x = p.orbit;
      spin.add(body);
      if (p.ring) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(p.size * 1.4, p.size * 2.1, 48),
          new THREE.MeshBasicMaterial({
            color: 0xe8d6aa,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.55,
          }),
        );
        ring.rotation.x = Math.PI / 2.4;
        body.add(ring);
      }
      let moon: THREE_NS.Object3D | null = null;
      if (p.moon) {
        moon = new THREE.Group();
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 16, 10),
          new THREE.MeshStandardMaterial({ color: 0xdcdce1 }),
        );
        m.position.x = 0.32;
        moon.add(m);
        body.add(moon);
      }
      spin.rotation.y = i * 1.3;
      spin.position.y = 0.04 * (i - 2); // arms clear one another at the column
      return { pivot, spin, moon, p };
    });

    // --- the constellation --------------------------------------------------------------------
    const sky3 = (x: number, y: number) =>
      new THREE.Vector3(x * 1.05, y + 1.6, -2.5 - Math.abs(x) * 0.25);
    const MAX = Math.max(...Object.values(FIGURES).map((f) => f.length));
    const starPos = new Float32Array(MAX * 3);
    const starCol = new Float32Array(MAX * 3);
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 0.42,
        map: dot,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(stars);
    const linePos = new Float32Array((MAX - 1) * 6);
    const lineCol = new Float32Array((MAX - 1) * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(lines);

    // per-star light (0 dim .. 1 lit) and per-line drawn length, eased every frame
    const starLight = new Float32Array(MAX);
    const lineDraw = new Float32Array(MAX);
    const points = Array.from({ length: MAX }, () => new THREE.Vector3());
    const targetPts = Array.from({ length: MAX }, () => new THREE.Vector3());

    let open = live.current.mode === "teacher" ? 1 : 0;
    let flare = 0;
    let ember = 0;
    let jolt = 0;
    let shakeSeen = live.current.shake;
    const col = new THREE.Color();
    const tmp = new THREE.Vector3();

    return {
      camera,
      resize(w, h) {
        camera.aspect = w / h;
        camera.position.set(0, 2.2, w / h < 0.9 ? 13.5 : 11);
        camera.lookAt(0, 0.6, 0);
        camera.updateProjectionMatrix();
        skyMat.uniforms.uScale.value = Math.min(window.devicePixelRatio, 2);
      },
      update(time, delta) {
        const { done, total, mode, lit, shake } = live.current;
        const k = reduce ? 1 : 1 - Math.exp(-delta * 3.2);
        const figure = FIGURES[mode];

        open += ((mode === "teacher" ? 1 : 0) - open) * (reduce ? 1 : 1 - Math.exp(-delta * 2));
        flare += ((lit ? 1 : 0) - flare) * k;
        if (shake !== shakeSeen) {
          shakeSeen = shake;
          ember = 1;
          jolt = 1;
        }
        ember = Math.max(0, ember - delta * 0.55);
        jolt = Math.max(0, jolt - delta * 2.4);

        // armillary rings: closed together in the learner's plane, fanned open for instructors
        armillary.forEach((pivot, i) => {
          const tilt = [Math.PI / 2, Math.PI / 2 - 0.41, 0][i];
          pivot.rotation.x = Math.PI / 2 + (tilt - Math.PI / 2) * open;
          pivot.rotation.y = reduce ? 0 : time * 0.05 * (i % 2 ? -1 : 1) * open;
        });
        // orbits: one plane for learners, each inclined on its own for instructors
        planets.forEach(({ pivot, spin, moon, p }, i) => {
          pivot.rotation.z = rand(i, 11) * 0.38 * open;
          pivot.rotation.x = rand(i, 12) * 0.22 * open;
          if (!reduce) spin.rotation.y += delta * p.speed * 0.35 * (1 + flare * 1.5);
          if (moon && !reduce) moon.rotation.y += delta * 2.4;
        });

        // the sun swells and the sky brightens on success
        sunMat.emissiveIntensity = 1.1 + flare * 1.6;
        sunLight.intensity = 2.2 + flare * 3;
        halo.scale.setScalar(2.2 + flare * 1.6 + (reduce ? 0 : Math.sin(time * 1.3) * 0.08));
        skyMat.uniforms.uTime.value = time;
        skyMat.uniforms.uGain.value = 0.9 + flare * 0.35 + ember * 0.3;
        skyMat.uniforms.uTint.value.setRGB(
          CHAMPAGNE[0] + (EMBER[0] - CHAMPAGNE[0]) * ember,
          CHAMPAGNE[1] + (EMBER[1] - CHAMPAGNE[1]) * ember,
          CHAMPAGNE[2] + (EMBER[2] - CHAMPAGNE[2]) * ember,
        );

        // constellation: lit stars and drawn lines follow the filled steps
        const n = figure.length;
        const lit0 = Math.min(n, Math.round((done / Math.max(1, total)) * n));
        for (let i = 0; i < MAX; i++) {
          const [x, y] = figure[Math.min(i, n - 1)];
          targetPts[i].copy(sky3(x, y));
          points[i].lerp(targetPts[i], reduce ? 1 : 1 - Math.exp(-delta * 2.5));
          const on = i < n ? (i < lit0 ? 1 : 0.18) : 0;
          starLight[i] += (Math.max(on, flare * (i < n ? 1 : 0)) - starLight[i]) * k;
          const draw = i < n - 1 && i + 1 < lit0 ? 1 : flare;
          lineDraw[i] += ((i < n - 1 ? draw : 0) - lineDraw[i]) * k;

          const twinkle = reduce ? 1 : 0.85 + 0.15 * Math.sin(time * 2.1 + i * 1.9);
          const b = starLight[i] * twinkle * (1 + flare * 0.4);
          col.setRGB(
            (CHAMPAGNE[0] + (EMBER[0] - CHAMPAGNE[0]) * ember) * b,
            (CHAMPAGNE[1] + (EMBER[1] - CHAMPAGNE[1]) * ember) * b,
            (CHAMPAGNE[2] + (EMBER[2] - CHAMPAGNE[2]) * ember) * b,
          );
          starPos.set([points[i].x, points[i].y, points[i].z], i * 3);
          starCol.set([col.r, col.g, col.b], i * 3);
        }
        for (let i = 0; i < MAX - 1; i++) {
          // each line grows from its star towards the next one
          tmp.copy(points[i]).lerp(points[i + 1], lineDraw[i]);
          linePos.set([points[i].x, points[i].y, points[i].z, tmp.x, tmp.y, tmp.z], i * 6);
          const a = 0.75 * Math.min(1, lineDraw[i] * 3);
          col.setRGB(
            (0.85 + (EMBER[0] - 0.85) * ember) * a,
            (0.7 + (EMBER[1] - 0.7) * ember) * a,
            (0.42 + (EMBER[2] - 0.42) * ember) * a,
          );
          lineCol.set([col.r, col.g, col.b, col.r * 0.6, col.g * 0.6, col.b * 0.6], i * 6);
        }
        starGeo.attributes.position.needsUpdate = true;
        starGeo.attributes.color.needsUpdate = true;
        lineGeo.attributes.position.needsUpdate = true;
        lineGeo.attributes.color.needsUpdate = true;

        // pointer parallax, slow drift, a jolt on errors
        orrery.rotation.y = pointer.x * 0.35 + (reduce ? 0 : time * 0.04);
        orrery.rotation.x = -pointer.y * 0.12 + 0.12;
        orrery.position.x = reduce ? 0 : Math.sin(time * 46) * 0.1 * jolt;
        sky.rotation.y = reduce ? 0 : time * 0.004 + pointer.x * 0.05;
        sky.rotation.x = pointer.y * 0.03;
      },
    };
  });

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
