import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Adapted from the supplied Frogurt scene. The animation controls are shared
// across poses; the head, muzzle, and beard are built from procedural geometry.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- shape

const smin = (a, b, k) => {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
};
const smax = (a, b, k) => -smin(-a, -b, k);
const ellipsoid = (x, y, z, rx, ry, rz) => {
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return (k0 * (k0 - 1)) / Math.max(k1, 1e-6);
};

const SEAT = -0.6;

function field(x, y, z) {
  const skull = ellipsoid(x, y - 0.035, z, 1.02, 0.69, 0.78);
  const muzzle = ellipsoid(x, y + 0.22, z - 0.51, 0.68, 0.38, 0.46);
  return smax(smin(skull, muzzle, 0.22), -(y - SEAT), 0.16);
}

function normalAt(x, y, z) {
  const e = 0.002;
  return new THREE.Vector3(
    field(x + e, y, z) - field(x - e, y, z),
    field(x, y + e, z) - field(x, y - e, z),
    field(x, y, z + e) - field(x, y, z - e),
  ).normalize();
}

/** The first point on his surface along a ray, from outside. */
function hit(origin, dir) {
  let t = 0;
  for (let i = 0; i < 200; i++) {
    const p = origin.clone().addScaledVector(dir, t);
    const d = field(p.x, p.y, p.z);
    if (d < 1e-4) return p;
    t += d * 0.8;
  }
  return origin.clone();
}

/** Meshes shared by all instances of the mascot. */
let shared = null;

function build() {
  const top = new THREE.Color("#ffa741");
  const mid = new THREE.Color("#f77b29");
  const low = new THREE.Color("#cd5727");
  const beard = new THREE.Color("#ffe8ae");

  // Body: a fine sphere, each vertex pushed out along its ray to his surface.
  const centre = new THREE.Vector3(0, 0.1, 0);
  const body = new THREE.SphereGeometry(1, 72, 52);
  const pos = body.attributes.position;
  const nor = body.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const dir = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    dir.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    let lo = 0.02;
    let hi = 2.2;
    for (let k = 0; k < 28; k++) {
      const m = (lo + hi) / 2;
      if (field(centre.x + dir.x * m, centre.y + dir.y * m, centre.z + dir.z * m) < 0) lo = m;
      else hi = m;
    }
    const p = centre.clone().addScaledVector(dir, (lo + hi) / 2);
    pos.setXYZ(i, p.x, p.y, p.z);
    const n = normalAt(p.x, p.y, p.z);
    nor.setXYZ(i, n.x, n.y, n.z);
    // Peach-gold on top, darker orange beneath the chin.
    const t = clamp((p.y - SEAT) / 1.55, 0, 1);
    if (t > 0.45) c.copy(mid).lerp(top, smooth(0.45, 1, t));
    else c.copy(low).lerp(mid, smooth(0, 0.45, t));
    // Wrap the cream beard around the front and leave an uneven scale edge.
    const beardLine = -0.205 - 0.09 * Math.abs(p.x) + 0.018 * Math.cos(p.x * 35);
    const beardMask = (1 - smooth(beardLine - 0.035, beardLine + 0.02, p.y))
      * smooth(-0.03, 0.22, p.z);
    c.lerp(beard, beardMask);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  body.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  body.deleteAttribute("uv");
  body.computeBoundingSphere();

  // Soft oval eyes for the dragon’s expressions.
  let eye= new THREE.SphereGeometry(1, 48, 32);
  const ep = eye.attributes.position;
  for (let i = 0; i < ep.count; i++) {
    let x = ep.getX(i);
    let y = ep.getY(i);
    const r = Math.hypot(x, y);
    if (r > 1e-6) {
      const f = Math.pow(Math.pow(Math.abs(x / r), 2.6) + Math.pow(Math.abs(y / r), 2.6), -1 / 2.6);
      x *= f;
      y *= f;
    }
    ep.setXYZ(i, x * 0.142, y * 0.183, ep.getZ(i) * 0.058);
  }
  eye.deleteAttribute("uv");
  eye.deleteAttribute("normal");
  eye = mergeVertices(eye);
  eye.computeVertexNormals();

  // Happy: the closed eye, arched up.
  const happy = new THREE.TubeGeometry(
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.09, -0.035, 0.02),
      new THREE.Vector3(0, 0.13, 0.05),
      new THREE.Vector3(0.09, -0.035, 0.02),
    ),
    32, 0.024, 10, false,
  );

  // Glasses: rounded-square rims, clear lenses, a bridge and the arms.
  const rimPoints= [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    rimPoints.push(
      new THREE.Vector3(
        0.2 * Math.sign(ca) * Math.pow(Math.abs(ca), 2 / 3.4),
        0.18 * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / 3.4),
        0,
      ),
    );
  }
  const lensRim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints, true), 144, 0.026, 12, true);
  const lens = new THREE.ShapeGeometry(new THREE.Shape(rimPoints.map((p) => new THREE.Vector2(p.x, p.y))), 24);
  const temple = new THREE.TubeGeometry(
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.06, 0, -0.25),
      new THREE.Vector3(0.02, -0.04, -0.55),
    ),
    24, 0.022, 10, false,
  );

  const sphere = new THREE.SphereGeometry(1, 32, 24);

  // A drop of sweat: round below, drawn to a point above.
  const profile= [];
  for (let i = 0; i <= 32; i++) {
    const y = -1 + 2.7 * (i / 32);
    const r = y <= 0 ? Math.sqrt(Math.max(0, 1 - y * y)) : Math.pow(Math.max(0, 1 - y / 1.7), 1.25);
    profile.push(new THREE.Vector2(r, y));
  }
  const drop = new THREE.LatheGeometry(profile, 32);
  drop.computeVertexNormals();

  function front(x, y) {
    return hit(new THREE.Vector3(x, y, 1.6), new THREE.Vector3(0, 0, -1));
  }

  const eyes = [1, -1].map(side => {
    const position = front(side * 0.49, 0.22);
    return { position, normal: normalAt(position.x, position.y, position.z) };
  });

  const smilePoints = [-0.44, -0.28, 0, 0.28, 0.44].map(x => {
    const point = front(x, -0.33 + 0.6 * x * x);
    point.z += 0.013;
    return point;
  });
  const smile = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePoints), 36, 0.019, 8, false);

  const spikeProfile = [
    new THREE.Vector2(0, -0.045),
    new THREE.Vector2(0.104, -0.032),
    new THREE.Vector2(0.127, 0.015),
    new THREE.Vector2(0.096, 0.092),
    new THREE.Vector2(0.039, 0.205),
    new THREE.Vector2(0.015, 0.229),
    new THREE.Vector2(0, 0.235),
  ];
  const spike = new THREE.LatheGeometry(spikeProfile, 20);
  const nostrils = [-1, 1].map(side => front(side * 0.15, -0.126));
  const blush = [-1, 1].map(side => front(side * 0.64, -0.113));

  // The shadow under him: a soft round, darker at its middle.
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext("2d") ;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.42)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.2)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const shadow = new THREE.CanvasTexture(canvas);

  return { body, eye, happy, lensRim, lens, temple, sphere, drop, eyes, shadow, smile, spike, nostrils, blush };
}

// ---------------------------------------------------------------- motion

const rest = ()=> ({
  x: 0, y: 0, tilt: 0, sx: 1, sy: 1, yaw: 0, pitch: 0,
  lookX: 0, lookY: 0, size: 1, squint: 0, happy: 0, blink: 0,
  glasses: 0, think: 0, fly: 0, swarm: 0, sweat: 0, gloom: 0,
});

/** Each state's face and props, before any motion. */
function dress(pose, state) {
  switch (state) {
    case "thinking":
      Object.assign(pose, { lookX: 0.022, lookY: 0.026, squint: 1, think: 1 });
      break;
    case "working":
      Object.assign(pose, { glasses: 1, fly: 1, size: 0.92 });
      break;
    case "done":
      Object.assign(pose, { happy: 1, swarm: 1 });
      break;
    case "limit":
      // Startled: eyes wide, gone pale, sweating.
      Object.assign(pose, { size: 1.32, sweat: 1, gloom: 1, lookY: 0.006 });
      break;
  }
}

const EXACT= ["x", "y", "tilt", "sx", "sy", "blink"];

/** The working fly: a loose orbit round his head, behind it and back. */
const flyPath = (t, out) => {
  const a = t * 1.35;
  return out.set(
    1.12 * Math.sin(a) + 0.03 * Math.sin(t * 13),
    1.06 + 0.12 * Math.sin(t * 2.7) + 0.03 * Math.cos(t * 17),
    0.15 + 0.72 * Math.cos(a),
  );
};

/** Done's flies: a happy swarm circling him, each on its own ring. */
const swarmPath = (t, i, out) => {
  const a = t * (1.6 + i * 0.17) + (i * Math.PI * 2) / 5;
  const r = 1.12 + 0.1 * Math.sin(i * 1.7);
  return out.set(
    r * Math.sin(a),
    1.12 + 0.22 * Math.sin(i * 2.1) + 0.08 * Math.sin(t * 4 + i),
    0.05 + 0.6 * Math.cos(a),
  );
};

// ---------------------------------------------------------------- mount

export function mountDragon(canvas, initial) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch {
    return null;
  }
  shared ??= build();
  const S = shared;
  const options = { ...initial };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  room.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  camera.position.set(0, 0.6, 6.6);
  camera.lookAt(0, 0.32, 0);

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-2.2, 3.2, 4);
  const rim = new THREE.DirectionalLight(0xffd1a4, 1.45);
  rim.position.set(2.5, 1.5, -3);
  const fill = new THREE.HemisphereLight(0xffffff, 0x6c3426, 0.4);
  scene.add(key, rim, fill);

  // Materials: his own, so each dragon can go pale on his own.
  const skin = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    // Matte, soft-touch: a rough surface with a velvet sheen at its edges
    // and only a faint, wide coat, so it reads as premium, not plastic.
    roughness: 0.68,
    clearcoat: 0.12,
    clearcoatRoughness: 0.6,
    sheen: 0.9,
    sheenColor: new THREE.Color("#ffe4bb"),
    sheenRoughness: 0.75,
  });
  const ink = new THREE.MeshPhysicalMaterial({ color: "#0a0c09", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 });
  const frame = new THREE.MeshPhysicalMaterial({ color: "#121314", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", roughness: 0.04, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide,
  });
  const pearl = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.4 });
  const water = new THREE.MeshPhysicalMaterial({ color: "#bfe6ff", roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.92 });
  const wing = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85, depthWrite: false });
  const bug = new THREE.MeshPhysicalMaterial({ color: "#20242b", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const shade = new THREE.MeshBasicMaterial({ map: S.shadow, transparent: true, depthWrite: false });

  // The scene: the head sits on a pivot at his seat, so he squashes from it.
  const root = new THREE.Group();
  scene.add(root);
  const shadowPlane = new THREE.PlaneGeometry(2.6, 2.6);
  const shadow = new THREE.Mesh(shadowPlane, shade);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = SEAT - 0.005;
  root.add(shadow);

  const pivot = new THREE.Group();
  root.add(pivot);
  const head = new THREE.Group();
  head.position.y = -SEAT;
  pivot.add(head);
  head.add(new THREE.Mesh(S.body, skin));

  const beardMaterial = new THREE.MeshStandardMaterial({ color: "#db6435", roughness: 0.78 });
  const chinScaleMaterial = new THREE.MeshStandardMaterial({ color: "#f9ce83", roughness: 0.82 });
  const cheekMaterial = new THREE.MeshStandardMaterial({ color: "#fb906f", roughness: 0.86 });
  const mouthMaterial = new THREE.MeshStandardMaterial({ color: "#713728", roughness: 0.85 });
  head.add(new THREE.Mesh(S.smile, mouthMaterial));

  function addFaceDots(points, material, size) {
    for (const point of points) {
      const dot = new THREE.Mesh(S.sphere, material);
      dot.position.copy(point);
      dot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalAt(point.x, point.y, point.z));
      dot.scale.set(...size);
      head.add(dot);
    }
  }
  addFaceDots(S.nostrils, mouthMaterial, [0.03, 0.02, 0.012]);
  addFaceDots(S.blush, cheekMaterial, [0.115, 0.053, 0.017]);

  // The tapered cheek and jaw scales give a bearded dragon its silhouette.
  const scaleUp = new THREE.Vector3(0, 1, 0);
  for (const side of [-1, 1]) {
    const sites = [
      [0.83, 0.03, 0.28, 1, 0.05, 0.1, 0.88],
      [0.84, -0.11, 0.29, 1, -0.32, 0.1, 1.04],
      [0.79, -0.27, 0.34, 0.86, -0.58, 0.2, 1],
      [0.65, -0.4, 0.43, 0.6, -0.81, 0.18, 0.85],
      [0.49, -0.5, 0.48, 0.43, -0.98, 0.15, 0.72],
      [0.28, -0.54, 0.49, 0.23, -1, 0.22, 0.6],
    ];
    for (const [x, y, z, dx, dy, dz, size] of sites) {
      const scale = new THREE.Mesh(S.spike, y < -0.22 ? chinScaleMaterial : beardMaterial);
      scale.position.set(x * side, y, z);
      scale.quaternion.setFromUnitVectors(scaleUp, new THREE.Vector3(dx * side, dy, dz).normalize());
      scale.scale.setScalar(size);
      head.add(scale);
    }
  }

  const eyes = S.eyes.map((seat, i) => {
    const anchor = new THREE.Group();
    anchor.position.copy(seat.position).addScaledVector(seat.normal, -0.018);
    anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), seat.normal);
    // Each leans out a touch at the top, for an expressive silhouette.
    anchor.rotateZ(i === 0 ? -0.05 : 0.05);
    const ball = new THREE.Mesh(S.eye, ink);
    for (const [x, y, z, size] of [[-0.037, 0.055, 0.059, 0.029], [0.021, -0.05, 0.061, 0.012]]) {
      const glint = new THREE.Mesh(S.sphere, pearl);
      glint.position.set(x, y, z);
      glint.scale.set(size * 0.78, size, size * 0.35);
      ball.add(glint);
    }
    const happy = new THREE.Mesh(S.happy, ink);
    anchor.add(ball, happy);
    head.add(anchor);
    return { ball, happy };
  });

  const glasses = new THREE.Group();
  head.add(glasses);
  const lenses = S.eyes.map((seat, i) => {
    const lensGroup = new THREE.Group();
    lensGroup.position.copy(seat.position).addScaledVector(seat.normal, 0.11);
    lensGroup.position.y += 0.01;
    const facing = new THREE.Vector3(seat.normal.x * 0.45, seat.normal.y * 0.25, 1).normalize();
    lensGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), facing);
    lensGroup.add(new THREE.Mesh(S.lensRim, frame), new THREE.Mesh(S.lens, glass));
    const temple = new THREE.Mesh(S.temple, frame);
    temple.position.set(i === 0 ? 0.2 : -0.2, 0.02, 0);
    temple.scale.x = i === 0 ? 1 : -1;
    lensGroup.add(temple);
    glasses.add(lensGroup);
    return lensGroup;
  });
  // The bridge, built to the gap between the lenses: an arch over the dip
  // between his domes.
  const [lensL, lensR] = lenses;
  const inner = (lens, side) => new THREE.Vector3(side * 0.2, 0.01, 0).applyQuaternion(lens.quaternion).add(lens.position);
  const a = inner(lensR, 1);
  const b = inner(lensL, -1);
  const bridgeGeometry = new THREE.TubeGeometry(
    new THREE.QuadraticBezierCurve3(a, new THREE.Vector3(0, Math.max(a.y, b.y) + 0.07, Math.max(a.z, b.z) + 0.04), b),
    32, 0.024, 10, false,
  );
  glasses.add(new THREE.Mesh(bridgeGeometry, frame));

  // Thought bubbles, up and to his right: two small, then a little cloud
  // with three dots in it.
  const bubbles = [0, 1, 2].map(() => new THREE.Group());
  const BUBBLE_AT = [
    [0.78, 0.98, 0.35],
    [0.93, 1.16, 0.3],
    [1.0, 1.38, 0.15],
  ];
  const ball = (group, x, y, z, r, m) => {
    const mesh = new THREE.Mesh(S.sphere, m);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(r);
    group.add(mesh);
    return mesh;
  };
  const [b0, b1, b2] = bubbles;
  ball(b0, 0, 0, 0, 0.05, pearl);
  ball(b1, 0, 0, 0, 0.08, pearl);
  ball(b2, 0, 0, 0, 0.17, pearl);
  ball(b2, -0.15, -0.05, -0.01, 0.12, pearl);
  ball(b2, 0.15, -0.04, -0.01, 0.12, pearl);
  ball(b2, 0.03, 0.1, -0.03, 0.12, pearl);
  const dots = [-0.075, 0, 0.075].map((x) => ball(b2, x, -0.01, 0.17, 0.027, ink));
  bubbles.forEach((g, i) => {
    const [x, y, z] = BUBBLE_AT[i] ;
    g.position.set(x, y, z);
  });
  root.add(...bubbles);

  // Flies: one while he works, a swarm when he is done.
  const flies = [0, 1, 2, 3, 4].map(() => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(S.sphere, bug);
    body.scale.set(0.05, 0.042, 0.065);
    const head = new THREE.Mesh(S.sphere, bug);
    head.scale.setScalar(0.032);
    head.position.z = 0.065;
    const left = new THREE.Mesh(S.sphere, wing);
    const right = new THREE.Mesh(S.sphere, wing);
    left.scale.set(0.075, 0.006, 0.04);
    left.position.set(0.055, 0.042, -0.015);
    right.scale.set(0.075, 0.006, 0.04);
    right.position.set(-0.055, 0.042, -0.015);
    g.add(body, head, left, right);
    g.visible = false;
    root.add(g);
    return { group: g, left, right, last: new THREE.Vector3() };
  });

  const sweat = new THREE.Mesh(S.drop, water);
  sweat.visible = false;
  head.add(sweat);

  // ------------------------------------------------------------ animation

  const motion = typeof matchMedia === "undefined" ? null : matchMedia("(prefers-reduced-motion: reduce)");
  const start = performance.now() / 1000;
  let last = start;
  let raf = 0;
  let visible = true;
  let stateSince = 0;
  let lastState = options.state;
  let pose = rest();
  dress(pose, options.state);
  let from= null;
  let blendAt = 0;
  let blinkAt = 1 + Math.random() * 2;
  let gaze = { x: 0, y: 0, at: 0 };
  const aim = { eyeX: 0, eyeY: 0, headX: 0, headY: 0 };
  let pointer= null;
  // Reused every frame, so a frame allocates nothing.
  const fly = flyPath(0, new THREE.Vector3());
  const swarmAt = new THREE.Vector3();
  const heading = new THREE.Vector3();
  let lastDraw = 0;
  const grey = new THREE.Color("#c8d0c8");
  const white = new THREE.Color("#ffffff");

  const target = (t)=> {
    const state = options.state;
    const since = t - stateSince;
    const p = rest();
    dress(p, state);
    const breath = Math.sin(t * 1.6);
    const calm = state === "idle" || (state === "done" && since > 1.2);

    if (calm) {
      if (options.followPointer && pointer) {
        p.lookX = aim.eyeX * 0.026;
        p.lookY = aim.eyeY * 0.02;
      } else {
        if (t > gaze.at) gaze = { x: (Math.random() - 0.5) * 0.036, y: (Math.random() - 0.5) * 0.022, at: t + 1.6 + Math.random() * 2.6 };
        p.lookX = gaze.x;
        p.lookY = gaze.y;
      }
      p.y = 0.03 * Math.max(0, Math.sin(t * 1.1));
      p.sy = 1 + 0.02 * breath;
      p.sx = 1 - 0.012 * breath;
      p.tilt = 0.02 * Math.sin(t * 0.7);
      p.yaw = 0.06 * Math.sin(t * 0.45);
      if (state === "done") {
        // Eyes open again after the hop, and the flies leave.
        const open = since >= 3;
        p.happy = open ? 0 : 1;
        p.swarm = open ? 0 : 1;
      }
    } else if (state === "thinking") {
      p.lookX += 0.004 * Math.sin(t * 0.9);
      p.tilt = 0.06 + 0.015 * Math.sin(t * 0.8);
      p.yaw = 0.18;
      p.pitch = -0.08;
      p.sy = 1 + 0.014 * breath;
    } else if (state === "working") {
      // Eyes on the fly, the head turning after it.
      const dx = clamp(fly.x / 1.12, -1, 1);
      p.lookX = dx * 0.03 * (fly.z < 0 ? 0.5 : 1);
      p.lookY = 0.022;
      p.yaw = dx * 0.32;
      p.pitch = -0.1;
      p.tilt = -dx * 0.04;
      p.sy = 1 + 0.015 * breath;
    } else if (state === "done") {
      // One hop: crouch, up, land with a squash.
      const u = since / 1.2;
      if (u < 0.15) {
        const s = Math.sin((u / 0.15) * Math.PI);
        p.sy = 1 - 0.13 * s;
        p.sx = 1 + 0.1 * s;
      } else if (u < 0.72) {
        const v = (u - 0.15) / 0.57;
        p.y = 0.48 * 4 * v * (1 - v);
        p.sy = 1 + 0.08 * Math.sin(v * Math.PI);
        p.sx = 1 - 0.05 * Math.sin(v * Math.PI);
      } else if (u < 0.9) {
        const s = Math.sin(((u - 0.72) / 0.18) * Math.PI);
        p.sy = 1 - 0.11 * s;
        p.sx = 1 + 0.09 * s;
      }
      p.tilt = u < 1 ? -0.07 * Math.sin(u * Math.PI * 2) : 0;
    } else if (state === "limit") {
      const u = since % 2.2;
      const shake = u < 0.6 ? 1 - u / 0.6 : 0;
      p.x = 0.04 * Math.sin(u * 38) * shake;
      p.sx = 1.01;
      p.sy = 0.96;
      p.pitch = 0.04;
    }

    // The head turns after the eyes.
    p.x += aim.headX * 0.05;
    p.yaw += aim.headX * 0.4;
    p.pitch -= aim.headY * 0.22;

    if (t > blinkAt + 0.15) blinkAt = t + (state === "limit" ? 6 : 3.5) + Math.random() * 3.5;
    const b = (t - blinkAt) / 0.15;
    if (b >= 0 && b <= 1 && p.happy < 0.5) p.blink = b < 0.4 ? b / 0.4 : 1 - (b - 0.4) / 0.6;
    return p;
  };

  const step = (t, dt) => {
    if (options.state !== lastState) {
      from = { ...pose };
      blendAt = t;
      stateSince = t;
      lastState = options.state;
    }
    const pt = options.followPointer ? pointer : null;
    const ke = 1 - Math.exp(-dt * 12);
    const kh = 1 - Math.exp(-dt * 5);
    aim.eyeX += ((pt?.x ?? 0) - aim.eyeX) * ke;
    aim.eyeY += ((pt?.y ?? 0) - aim.eyeY) * ke;
    aim.headX += ((pt?.x ?? 0) - aim.headX) * kh;
    aim.headY += ((pt?.y ?? 0) - aim.headY) * kh;
    flyPath(t, fly);
    const goal = target(t);
    const s = from ? Math.min(1, (t - blendAt) / 0.4) : 1;
    const blend = s * s * s * (s * (s * 6 - 15) + 10);
    if (s >= 1) from = null;
    const ease = 1 - Math.exp(-dt * 10);
    for (const key of Object.keys(goal)) {
      if (from && s < 1 && EXACT.includes(key) && key !== "blink") pose[key] = from[key] + (goal[key] - from[key]) * blend;
      else pose[key] = EXACT.includes(key) ? goal[key] : pose[key] + (goal[key] - pose[key]) * ease;
    }
  };

  const place = (t) => {
    const p = pose;
    pivot.position.set(p.x, SEAT + p.y, 0);
    pivot.rotation.set(p.pitch, p.yaw, p.tilt);
    pivot.scale.set(p.sx, p.sy, p.sx);
    const lift = clamp(p.y / 0.48, 0, 1);
    shadow.position.x = p.x;
    shadow.scale.setScalar(1 - lift * 0.4);
    shade.opacity = 1 - lift * 0.65;

    skin.color.copy(white).lerp(grey, p.gloom * 0.8);
    skin.sheen = 0.9 * (1 - p.gloom * 0.6);

    for (const eye of eyes) {
      const squash = (1 - 0.9 * p.blink) * (1 - 0.56 * p.squint);
      const widen = 1 + 0.08 * p.blink + 0.1 * p.squint;
      const open = 1 - p.happy;
      eye.ball.visible = open > 0.02;
      eye.ball.scale.set(p.size * widen, Math.max(0.001, p.size * squash * open), 1);
      eye.ball.position.set(p.lookX, p.lookY - 0.03 * p.squint, 0);
      eye.happy.visible = p.happy > 0.02;
      eye.happy.scale.setScalar(Math.max(0.001, p.happy));
      eye.happy.position.set(p.lookX * 0.5, 0, 0);
    }

    glasses.visible = p.glasses > 0.01;
    glasses.position.y = (1 - p.glasses) * 0.35;
    frame.opacity = clamp(p.glasses * 1.5, 0, 1);
    glass.opacity = 0.14 * p.glasses;

    const life = (t / 2.6) % 1;
    bubbles.forEach((g, i) => {
      const show = smooth(0.04 + i * 0.12, 0.14 + i * 0.12, life) * (1 - smooth(0.9, 0.98, life)) * p.think;
      g.visible = show > 0.01;
      g.scale.setScalar(Math.max(0.001, 0.5 + 0.5 * show) * Math.min(1, show * 3));
      g.position.x = BUBBLE_AT[i] [0] + p.x * 0.6;
      g.position.y = BUBBLE_AT[i] [1] + 0.02 * Math.sin(t * 2 + i);
    });
    dots.forEach((d, j) => {
      d.position.y = -0.01 + 0.03 * Math.max(Math.sin(t * 7 - j * 0.9), 0);
    });

    flies.forEach((f, i) => {
      const working = i === 0 ? p.fly : 0;
      const pop = clamp(p.swarm * 1.4 - i * 0.08, 0, 1);
      const amount = Math.max(working, pop);
      f.group.visible = amount > 0.02;
      if (!f.group.visible) return;
      // Swarm flies arrive from out wide and leave the same way.
      const at = working >= pop ? fly : swarmPath(t, i, swarmAt);
      if (working < pop) {
        const away = 1 - p.swarm;
        at.x *= 1 + away * 1.4;
        at.z *= 1 + away * 1.4;
        at.y += away * 0.7;
      }
      f.group.position.copy(at);
      f.group.position.x += p.x;
      f.group.scale.setScalar(amount);
      // Facing where it is going.
      heading.subVectors(at, f.last);
      if (heading.lengthSq() > 1e-8) f.group.rotation.y = Math.atan2(heading.x, heading.z);
      f.last.copy(at);
      const flap = Math.sin(t * 70 + i) * 0.6;
      f.left.rotation.z = flap;
      f.right.rotation.z = -flap;
    });

    const slide = (t * 0.45) % 1;
    sweat.visible = p.sweat > 0.02;
    sweat.position.set(0.84, 0.9 - slide * 0.14, 0.32);
    sweat.scale.setScalar(0.085 * p.sweat * smooth(0, 0.12, slide) * (1 - smooth(0.8, 1, slide)) + 0.0001);
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w && h) renderer.setSize(w, h, false);
  };
  resize();

  const moving = () => options.animate && !motion?.matches;

  const tick = (now) => {
    raf = 0;
    if (!visible) return;
    const t = now / 1000 - start;
    if (!moving()) {
      // Still: the state's face and props, at a moment where all show.
      pose = rest();
      dress(pose, options.state);
      flyPath(0.6, fly);
      place(1.1);
      renderer.render(scene, camera);
      return;
    }
    // At rest (breathing, blinking, looking round) 30 frames a second read
    // the same as 60 and cost half: the rest of the time, 60.
    const since = t - stateSince;
    const calm =
      !pointer &&
      !from &&
      (options.state === "idle" || (options.state === "done" && since > 4) || options.state === "thinking");
    if (now - lastDraw < (calm ? 1000 / 30 : 1000 / 60) - 1) {
      raf = requestAnimationFrame(tick);
      return;
    }
    lastDraw = now;
    const dt = Math.min(0.1, Math.max(0, now / 1000 - last));
    last = now / 1000;
    step(t, dt);
    place(t);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((entries) => {
          visible = !!entries[entries.length - 1]?.isIntersecting;
          if (visible) {
            last = performance.now() / 1000;
            schedule();
          }
        });
  observer?.observe(canvas);

  const onPointer = (event) => {
    if (event.pointerType !== "mouse") return;
    const box = canvas.getBoundingClientRect();
    const x = (event.clientX - (box.left + box.width / 2)) / box.width;
    const y = (box.top + box.height / 2 - event.clientY) / box.height;
    pointer = { x: clamp(x * 1.6, -1, 1), y: clamp(y * 1.6, -1, 1) };
  };
  const onLeave = () => {
    pointer = null;
  };
  const onMotion = () => schedule();
  canvas.addEventListener("pointermove", onPointer, { passive: true });
  canvas.addEventListener("pointerleave", onLeave);
  motion?.addEventListener("change", onMotion);
  schedule();

  return {
    update(next) {
      Object.assign(options, next);
      last = performance.now() / 1000;
      schedule();
    },
    resize() {
      resize();
      schedule();
    },
    destroy() {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerleave", onLeave);
      motion?.removeEventListener("change", onMotion);
      for (const m of [skin, ink, frame, glass, pearl, water, wing, bug, shade, beardMaterial, chinScaleMaterial, cheekMaterial, mouthMaterial]) m.dispose();
      shadowPlane.dispose();
      bridgeGeometry.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
