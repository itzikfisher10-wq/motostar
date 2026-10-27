/**
 * MotoStar 3D helmet (home page hero).
 *
 * A generic full-face helmet built from primitives: it is MotoStar's own illustration,
 * not a model of any manufacturer's product, and the page labels it as such.
 * Framework-agnostic: HelmetHero.tsx creates it on a <canvas> after the page has painted.
 *
 * Motion:
 *   entrance  – rises into frame with a turn and settles (eased)
 *   scroll    – setProgress(0..1): turns to the side, visor opens, camera moves in
 *   pointer   – setPointer(-1..1, -1..1): small parallax tilt (desktop)
 *   idle      – slow float for a moment after the last input, then it holds still
 * Renders only while something moves (no endless loop); pauses when off screen.
 */
import {
  ACESFilmicToneMapping,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Shape,
  SphereGeometry,
  SpotLight,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type HelmetSceneOptions = { reducedMotion: boolean; lowPower: boolean };
export type HelmetScene = {
  setProgress(p: number): void;
  setPointer(x: number, y: number): void;
  resize(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
};

// Brand colours (match --color-ink / --color-signal in globals.css).
const SHELL = new Color("#0c0c0e");
const SIGNAL = new Color("#e10600");

/** Shell proportions: a helmet is longer front-to-back than it is wide. */
const SX = 0.9;
const SY = 1.0;
const SZ = 1.1;

/**
 * Bottom edge of the shell: a plane that is low at the chin (front, +z) and high at the
 * nape (back). Points below it are pressed onto it.
 */
const cutY = (z: number) => -0.62 - 0.26 * z;

/** Eye port window, in yaw (0 = straight ahead) and pitch, radians. */
const PORT = { yaw: 0.98, pitchTop: 0.34, pitchBottom: -0.2 };

function inPort(yaw: number, pitch: number, grow = 0) {
  return Math.abs(yaw) < PORT.yaw + grow && pitch < PORT.pitchTop + grow && pitch > PORT.pitchBottom - grow;
}

/** Maps a unit-sphere point onto the helmet surface at radius r. */
function shellPoint(v: Vector3, r: number) {
  const pitch = Math.asin(MathUtils.clamp(v.y, -1, 1));
  // Chin bar: the lower front pushes forward, blending in smoothly below the eye port.
  const below = 1 - MathUtils.smoothstep(pitch, PORT.pitchBottom - 0.22, PORT.pitchBottom);
  const k = r * (1 + 0.07 * below * MathUtils.smoothstep(v.z, 0.25, 0.9));
  v.set(v.x * SX * k, v.y * SY * k, v.z * SZ * k);
  const floor = cutY(v.z);
  if (v.y < floor) v.y = floor;
  return v;
}

function deform(geometry: BufferGeometry, r: number) {
  const pos = geometry.attributes.position!;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    shellPoint(v, r);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Outer shell with a real eye port cut out of it. Grid vertices next to the port edge are
 * snapped onto it (in yaw/pitch), so the opening has clean straight edges, then the faces
 * inside the port are dropped.
 */
function shellGeometry(segments: number) {
  const rows = Math.round(segments * 0.75);
  const g = new SphereGeometry(1, segments, rows);
  const pos = g.attributes.position!;
  const halfCol = Math.PI / segments;
  const halfRow = Math.PI / rows / 2;
  const v = new Vector3();
  const yp: [number, number][] = [];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let yaw = Math.atan2(v.x, v.z);
    let pitch = Math.asin(MathUtils.clamp(v.y, -1, 1));
    const inYaw = Math.abs(yaw) < PORT.yaw + halfCol;
    const inPitch = pitch < PORT.pitchTop + halfRow && pitch > PORT.pitchBottom - halfRow;
    if (inYaw && Math.abs(pitch - PORT.pitchTop) < halfRow) pitch = PORT.pitchTop;
    else if (inYaw && Math.abs(pitch - PORT.pitchBottom) < halfRow) pitch = PORT.pitchBottom;
    if (inPitch && Math.abs(Math.abs(yaw) - PORT.yaw) < halfCol) yaw = Math.sign(yaw) * PORT.yaw;
    v.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    yp.push([yaw, pitch]);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  const index = g.index!;
  const kept: number[] = [];
  for (let f = 0; f < index.count; f += 3) {
    const a = index.getX(f), b = index.getX(f + 1), c = index.getX(f + 2);
    const yaw = (yp[a]![0] + yp[b]![0] + yp[c]![0]) / 3;
    const pitch = (yp[a]![1] + yp[b]![1] + yp[c]![1]) / 3;
    const inside = Math.abs(yaw) < PORT.yaw && pitch < PORT.pitchTop && pitch > PORT.pitchBottom;
    if (!inside) kept.push(a, b, c);
  }
  g.setIndex(kept);
  return deform(g, 1);
}

/** Closed path around the eye port edge, at radius r. */
function portEdge(r: number) {
  const pts: Vector3[] = [];
  const at = (yaw: number, pitch: number) => shellPoint(new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)), r);
  const n = 24;
  for (let i = 0; i < n; i++) pts.push(at(MathUtils.lerp(-PORT.yaw, PORT.yaw, i / n), PORT.pitchTop));
  for (let i = 0; i < 8; i++) pts.push(at(PORT.yaw, MathUtils.lerp(PORT.pitchTop, PORT.pitchBottom, i / 8)));
  for (let i = 0; i < n; i++) pts.push(at(MathUtils.lerp(PORT.yaw, -PORT.yaw, i / n), PORT.pitchBottom));
  for (let i = 0; i < 8; i++) pts.push(at(-PORT.yaw, MathUtils.lerp(PORT.pitchBottom, PORT.pitchTop, i / 8)));
  return pts;
}

/** SphereGeometry segment covering a yaw/pitch window (front = +z). */
function windowSphere(yaw: number, pitchTop: number, pitchBottom: number, segments: number) {
  return new SphereGeometry(1, segments, Math.round(segments / 3), Math.PI / 2 - yaw, yaw * 2, Math.PI / 2 - pitchTop, pitchTop - pitchBottom);
}

function buildHelmet(segments: number) {
  const helmet = new Group();
  const disposables: (BufferGeometry | Material)[] = [];
  const keep = <T extends BufferGeometry | Material>(x: T) => (disposables.push(x), x);

  const shellMat = keep(new MeshPhysicalMaterial({ color: SHELL, metalness: 0.4, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.03 }));
  const rubberMat = keep(new MeshStandardMaterial({ color: "#060606", roughness: 0.9, metalness: 0 }));
  const trimMat = keep(new MeshPhysicalMaterial({ color: "#303338", metalness: 0.85, roughness: 0.3 }));
  const stripeMat = keep(new MeshPhysicalMaterial({ color: SIGNAL, metalness: 0.15, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04 }));
  const visorMat = keep(new MeshPhysicalMaterial({ color: "#0d1117", metalness: 1, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.6 }));
  const innerMat = keep(new MeshStandardMaterial({ color: "#0a0a0a", roughness: 1, side: DoubleSide }));

  const shell = new Mesh(keep(shellGeometry(segments)), shellMat);
  helmet.add(shell);

  // Liner: the dark padded interior seen through the eye port when the visor opens.
  const inner = new Mesh(keep(deform(new SphereGeometry(1, segments, Math.round(segments * 0.6)), 0.93)), innerMat);
  helmet.add(inner);

  // Rubber gasket around the eye port.
  helmet.add(new Mesh(keep(new TubeGeometry(new CatmullRomCurve3(portEdge(0.995), true, "catmullrom", 0.1), 160, 0.032, 10, true)), rubberMat));

  // Visor: follows the shell just outside it; hinged on the side pivots.
  const pivotY = 0.04;
  const pivotZ = 0.02;
  const visorPivot = new Group();
  visorPivot.position.set(0, pivotY, pivotZ);
  const visor = new Mesh(keep(deform(windowSphere(PORT.yaw + 0.1, PORT.pitchTop + 0.06, PORT.pitchBottom - 0.05, segments), 1.03)), visorMat);
  visor.position.set(0, -pivotY, -pivotZ);
  visorPivot.add(visor);
  helmet.add(visorPivot);

  // Visor pivot plates.
  for (const side of [-1, 1]) {
    const plate = new Mesh(keep(new CylinderGeometry(0.13, 0.13, 0.04, 32)), trimMat);
    plate.rotation.z = Math.PI / 2;
    plate.position.set(side * SX * 1.015, pivotY, pivotZ);
    helmet.add(plate);
  }

  // Chin vent.
  const chinVent = new Mesh(keep(new CylinderGeometry(0.09, 0.09, 0.05, 6)), trimMat);
  chinVent.rotation.x = Math.PI / 2;
  const chinPos = shellPoint(new Vector3(0, -0.5, 0.86).normalize(), 1.012);
  chinVent.position.copy(chinPos);
  helmet.add(chinVent);

  // Neck roll: a rubber edge that follows the shell's bottom rim.
  const rim = Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    // Walk down from the equator until the shell meets the bottom plane.
    let pitch = 0;
    let p = new Vector3();
    for (; pitch > -Math.PI / 2; pitch -= 0.01) {
      p = new Vector3(Math.sin(a) * Math.cos(pitch), Math.sin(pitch), Math.cos(a) * Math.cos(pitch));
      shellPoint(p, 1);
      if (p.y <= cutY(p.z) + 1e-4) break;
    }
    return p.multiplyScalar(0.985);
  });
  helmet.add(new Mesh(keep(new TubeGeometry(new CatmullRomCurve3(rim, true), 128, 0.05, 10, true)), rubberMat));

  // Racing stripes over the crown in signal red, from the visor brow to the nape.
  for (const x of [-0.09, 0.09]) {
    const pts = Array.from({ length: 24 }, (_, i) => {
      const pitch = MathUtils.lerp(PORT.pitchTop + 0.1, Math.PI - 0.55, i / 23);
      const v = new Vector3(x, Math.sin(pitch), Math.cos(pitch)).normalize();
      return shellPoint(v, 1.006);
    });
    helmet.add(new Mesh(keep(new TubeGeometry(new CatmullRomCurve3(pts), 96, 0.022, 8, false)), stripeMat));
  }

  // Brow vents.
  for (const x of [-0.22, 0.22]) {
    const vent = new Mesh(keep(new CylinderGeometry(0.06, 0.075, 0.16, 16)), trimMat);
    const at = shellPoint(new Vector3(x, 0.82, 0.5).normalize(), 1.01);
    vent.position.copy(at);
    vent.lookAt(at.clone().multiplyScalar(2));
    vent.rotateX(Math.PI / 2);
    helmet.add(vent);
  }

  // Rear spoiler.
  const spoilerShape = new Shape();
  spoilerShape.moveTo(-0.38, 0);
  spoilerShape.quadraticCurveTo(0, 0.08, 0.38, 0);
  spoilerShape.lineTo(0.32, -0.06);
  spoilerShape.quadraticCurveTo(0, 0.01, -0.32, -0.06);
  spoilerShape.closePath();
  const spoiler = new Mesh(keep(new ExtrudeGeometry(spoilerShape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 })), shellMat);
  const back = shellPoint(new Vector3(0, 0.25, -1).normalize(), 1.0);
  spoiler.position.set(0, back.y, back.z - 0.02);
  spoiler.rotation.x = Math.PI * 0.62;
  helmet.add(spoiler);

  helmet.rotation.order = "YXZ";
  return { helmet, visorPivot, visor, disposables };
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function createHelmetScene(canvas: HTMLCanvasElement, opts: HelmetSceneOptions): HelmetScene {
  const renderer = new WebGLRenderer({ canvas, antialias: !opts.lowPower, alpha: true, powerPreference: opts.lowPower ? "low-power" : "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.lowPower ? 1.5 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmrem.dispose();

  const camera = new PerspectiveCamera(28, 1, 0.1, 50);

  // Lighting: a cool key from top-left, a red rim from behind, a soft fill.
  const key = new DirectionalLight("#ffffff", 2.2);
  key.position.set(-3, 4, 4);
  const rim = new SpotLight(SIGNAL, 60, 12, Math.PI / 5, 0.6, 1.5);
  rim.position.set(2.5, 1.5, -3.5);
  const fill = new DirectionalLight("#9fb3c8", 0.5);
  fill.position.set(3, -1, 3);
  scene.add(key, rim, fill);

  const { helmet, visorPivot, visor, disposables } = buildHelmet(opts.lowPower ? 40 : 72);
  scene.add(helmet);

  // State
  let progress = 0; // target, from scroll
  let shown = 0; // eased towards progress
  let lastInput = performance.now();
  let lastFrame = 0;
  // Phones / weak CPUs: 30 fps is plenty for a slow turn.
  const minFrameMs = opts.lowPower ? 33 : 0;
  // After input stops, keep the float going this long, then stop rendering entirely.
  const SETTLE_MS = 2500;
  let pointerX = 0;
  let pointerY = 0;
  let smoothX = 0;
  let smoothY = 0;
  const startedAt = performance.now();
  const ENTRANCE_MS = opts.reducedMotion ? 0 : 1800;
  let frame = 0;
  let running = true;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole helmet in frame on tall (phone) canvases.
    camera.position.set(0, 0.15, camera.aspect < 0.9 ? 7.4 : 6.2);
    camera.updateProjectionMatrix();
    renderOnce();
  }

  function pose(now: number) {
    const t = ENTRANCE_MS ? Math.min(1, (now - startedAt) / ENTRANCE_MS) : 1;
    const e = easeOutCubic(t);
    const float = opts.reducedMotion ? 0 : Math.sin(now / 1400) * 0.035;
    const ease = opts.reducedMotion ? 1 : 0.12;
    smoothX += (pointerX - smoothX) * ease;
    smoothY += (pointerY - smoothY) * ease;
    shown += (progress - shown) * ease;

    // Entrance: rise and turn into a three-quarter view.
    helmet.position.y = MathUtils.lerp(-1.6, 0, e) + float;
    const baseYaw = MathUtils.lerp(-2.2, -0.62, e);
    // Scroll: turn to a side profile and past it; visor opens over the first half.
    helmet.rotation.y = baseYaw + shown * 1.9 + smoothX * 0.25;
    helmet.rotation.x = 0.08 + smoothY * 0.12 - shown * 0.1;
    const open = MathUtils.smoothstep(shown, 0.05, 0.55);
    visorPivot.rotation.x = -open * 0.82;
    // Lift slightly off the shell while opening, so it clears the crown.
    visor.scale.setScalar(1 + open * 0.025);
    camera.position.z = (camera.aspect < 0.9 ? 7.4 : 6.2) - shown * 1.2;
    camera.lookAt(0, 0.05 - shown * 0.15, 0);
    rim.intensity = 60 * e;

    if (opts.reducedMotion) return false;
    const settling = Math.abs(progress - shown) > 0.0005 || Math.abs(pointerX - smoothX) > 0.001 || Math.abs(pointerY - smoothY) > 0.001;
    return t < 1 || settling || now - lastInput < SETTLE_MS;
  }

  function renderOnce() {
    pose(performance.now());
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    if (!running) return;
    if (now - lastFrame < minFrameMs) {
      frame = requestAnimationFrame(loop);
      return;
    }
    lastFrame = now;
    const keepGoing = pose(now);
    renderer.render(scene, camera);
    frame = keepGoing ? requestAnimationFrame(loop) : 0;
  }

  function wake() {
    lastInput = performance.now();
    if (running && !frame) frame = requestAnimationFrame(loop);
  }

  resize();
  frame = requestAnimationFrame(loop);

  return {
    setProgress(p) {
      progress = MathUtils.clamp(p, 0, 1);
      if (opts.reducedMotion) renderOnce();
      else wake();
    },
    setPointer(x, y) {
      if (opts.reducedMotion) return;
      pointerX = MathUtils.clamp(x, -1, 1);
      pointerY = MathUtils.clamp(y, -1, 1);
      wake();
    },
    resize,
    pause() {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
    },
    resume() {
      if (running) return;
      running = true;
      wake();
    },
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      disposables.forEach((d) => d.dispose());
      envTexture.dispose();
      renderer.dispose();
    },
  };
}
