/**
 * 페이지 뒤의 3D — "밤의 시범 공장".
 *
 * 시드 현장의 실제 구역 좌표(site.ts) 위에 세운 공장(factory.ts)을 천장 조명이 비추고, 스크롤 단계에 따라
 * 경보 하나의 일생을 그 위에 겹쳐 그린다. 공장은 실물처럼, 데이터는 빛으로 — 관제 화면 3D 현장 보기와 같은 문법이다.
 *
 *   신호 · 원천      작업자와 지게차가 움직이고, 태그마다 보고가 서버(위의 한 점)로 올라간다.
 *                    넷 중 하나는 거의 같은 순간에 두 번 올라가고, 두 번째는 가는 도중에 사라진다(중복 제거)
 *   (수집 · 판정)    밝은 지면이 덮는다 — 렌더 루프를 세운다
 *   RAISED          출하장 진입로 사각지대. 지게차 1호가 W-1002 에게 다가가고, 발밑 표식이 등급색으로 오른다
 *   DISPATCHED      서버에서 당사자 · 운전자 · 안전관리자에게 경보가 내려간다
 *   ACKNOWLEDGED    당사자의 확인이 서버로 올라가고, 색이 가라앉는다
 *   생존 확인        배관 피트 바닥의 W-3001. 심박 고리가 뛰고, 서버가 묻고, 작업자가 답한다
 *   아직            아직 없는 것(차량 제어 실연동 · 워치 산소포화도)의 자리에 빈 고리가 깜박인다
 *
 * **빛의 색은 채널을 말한다.** 수집은 파랑, 확인은 청록, 생체는 보라 — 관제 화면 차트 계열색이다. 사람 발밑에 칠하는
 * 등급색(주의 ~ 긴급)은 경보가 난 사람 하나에만 쓴다 — 그래서 그 하나가 보인다.
 *
 * 지게차 접근 장면은 story.ts 가 서버 판정(collision.ts)으로 미리 계산한 결과를 그대로 그린다.
 * 글자는 캔버스에 그리지 않는다. Vue 에 의존하지 않는다. three 는 FlowScene 이 이 파일을 동적으로
 * 불러올 때만 내려받는다.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  Material,
  Mesh,
  MeshBasicMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Points,
  RingGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Level } from "./collision";
import { FORKLIFT_SCALE, PERSON_SCALE, PIT, WORKER_MARK, buildFactory, makeForklift, makeWorker, random, wx, wz } from "./factory";
import { STAGE } from "./stations";
import { STORY_SECONDS, storyAt } from "./story";

export type SiteHandle = {
  /** STATIONS 인덱스 + 구간 안 진행도(0~1). 닫는 말은 STATIONS.length */
  setStage(stage: number): void;
  /** 밝은 지면이 캔버스를 다 덮으면 false — 렌더 루프를 세운다 */
  setVisible(visible: boolean): void;
  dispose(): void;
};

// ---------------------------------------------------------------- 색
const BG = new Color("#071226");
const INK = new Color("#eef4ff");
/** 채널 색 — 관제 화면 차트 계열색(어두운 화면 판)을 조금 밝혔다 */
const SIGNAL = new Color("#6fb2ff"); // 수집 · 보고
const CONFIRM = new Color("#4fe0cf"); // 확인 · 응답
const VITAL = new Color("#b69cff"); // 생체 · 생존 확인
const MARK = new Color(WORKER_MARK);
/** 대시보드 levels.ts 의 등급색 — 예약된 팔레트다. 경보가 아닌 것에 쓰지 않는다 */
const LEVEL_COLOR: Record<Exclude<Level, "NONE">, Color> = {
  CAUTION: new Color("#ffc400"),
  WARNING: new Color("#ff8a00"),
  DANGER: new Color("#f2541b"),
  EMERGENCY: new Color("#e5322d"),
};

/** 서버 — 모든 신호가 모이는 한 점. 지붕 위에 띄운다 */
const NODE = new Vector3(0, 34, -2);

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const fract = (x: number) => x - Math.floor(x);

// ---------------------------------------------------------------- 셰이더 (빛 · 서버 점)
const POINT_VERTEX = /* glsl */ `
  attribute vec3 color;
  attribute float size;
  attribute float aAlpha;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uPixelRatio * (100.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vColor = color;
    vAlpha = aAlpha * clamp(1.0 - (-mv.z - 130.0) / 90.0, 0.2, 1.0);
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  uniform float uIntensity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float shape = smoothstep(0.5, 0.16, d) + smoothstep(0.5, 0.0, d) * 0.3;
    float a = shape * vAlpha * uIntensity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

/** 서버 점 — 가운데가 차고, 한 곳이 트인 고리가 천천히 돈다 */
const NODE_VERTEX = /* glsl */ `
  uniform float uPixelRatio;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 30.0 * uPixelRatio * (100.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const NODE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.12, 0.04, d) + smoothstep(0.3, 0.0, d) * 0.25;
    float ring = smoothstep(0.025, 0.0, abs(d - 0.4));
    float ang = atan(c.y, c.x);
    float gap = smoothstep(0.2, 0.36, abs(mod(ang - uTime * 0.4, 6.2832) - 3.1416));
    // 가운데는 흰빛, 고리는 수집 빛과 같은 파랑 — 모든 보고가 모이는 자리다
    vec3 color = mix(vec3(0.44, 0.7, 1.0), vec3(0.94, 0.97, 1.0), core / (core + ring * gap + 0.001));
    float a = (core + ring * gap * 0.9) * uAlpha * uIntensity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(color, a);
  }
`;

// ---------------------------------------------------------------- 움직이는 사람 · 차
type Walker = { path: [number, number][]; speed: number; pingPong: boolean; offset: number; length: number };

function walker(path: [number, number][], speed: number, pingPong: boolean, offset: number): Walker {
  let length = 0;
  const n = pingPong ? path.length - 1 : path.length;
  for (let i = 0; i < n; i++) {
    const a = path[i]!;
    const b = path[(i + 1) % path.length]!;
    length += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { path, speed, pingPong, offset, length };
}

/** 시각 t 에서의 위치(서버 좌표)와 진행 방향 */
function walkAt(w: Walker, t: number): { x: number; y: number; dx: number; dy: number } {
  let s = (w.offset * w.length + t * w.speed) % (w.pingPong ? w.length * 2 : w.length);
  let dir = 1;
  if (w.pingPong && s > w.length) {
    s = w.length * 2 - s;
    dir = -1;
  }
  const n = w.pingPong ? w.path.length - 1 : w.path.length;
  for (let i = 0; i < n; i++) {
    const a = w.path[i]!;
    const b = w.path[(i + 1) % w.path.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= len || i === n - 1) {
      const k = len ? Math.min(1, s / len) : 0;
      return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dx: ((b[0] - a[0]) / (len || 1)) * dir, dy: ((b[1] - a[1]) / (len || 1)) * dir };
    }
    s -= len;
  }
  const first = w.path[0]!;
  return { x: first[0], y: first[1], dx: 1, dy: 0 };
}

/** 사람들. 0번이 W-1002(당사자), 1번이 W-1003(안전관리자, 흰 안전모), 2번이 W-3001(배관 피트) */
const PEOPLE: Walker[] = [
  walker([[27, 55.8], [55, 55.8]], 1.1, true, 0.1), // W-1002 — 랙 사이 통로
  walker([[26, 35.8], [40, 35.8]], 0.8, true, 0.3), // W-1003 — 안전 순회
  walker([[86.2, 35.4], [88.8, 36.6]], 0.25, true, 0.0), // W-3001 — 피트 바닥에서 배관 점검
  walker([[41, 35.8], [55, 35.8]], 1.0, true, 0.7),
  walker([[27, 7.5], [48, 7.5], [48, 25.9], [27, 25.9]], 1.0, false, 0.2),
  walker([[57, 2.5], [78, 2.5], [78, 23], [57, 23]], 0.9, false, 0.55),
  walker([[78.5, 24], [78.5, 60]], 1.2, true, 0.4),
  walker([[5, 51.5], [5, 58.5]], 0.7, true, 0.2),
  walker([[62, 26.5], [62, 48]], 1.1, true, 0.8),
  walker([[58, 62.5], [85, 62.5]], 1.0, true, 0.35),
];

const FORKLIFT_ROUTES: Walker[] = [
  walker([[16, 46.1], [56, 46.1]], 2.0, true, 0.15), // V-0001 지게차 1호 — 출하장 통로
  walker([[6, 28.2], [56, 28.2]], 1.8, true, 0.6), // V-0002 지게차 2호(대형)
];

// ---------------------------------------------------------------- 카메라 단계
type Shot = { at: number; pos: [number, number, number]; look: [number, number, number] };

// 당사자가 멈춰 서는 자리(서버 17.3, 47.5)와 배관 피트(87.5, 36)를 기준으로 잡았다
const SHOTS: Shot[] = [
  { at: STAGE.top, pos: [-8, 54, 82], look: [2, 0, 4] },
  { at: STAGE.sources, pos: [-2, 66, 80], look: [0, 8, 2] },
  // 랙(5.4 m)을 넘겨 내려다본다. 낮게 잡으면 랙이 통로를 가려 사각지대가 화면에서도 사각지대가 된다
  { at: STAGE.raised - 0.2, pos: [-12, 46, 56], look: [-24, 0, 12] },
  // 멈춰 선 지게차와 사람 사이(1.44 m)가 보이도록 거의 위에서 — 비스듬하면 사람이 지게차를 가려 맞닿아 보인다
  { at: STAGE.raised + 0.55, pos: [-24, 25, 23], look: [-30.5, 0.3, 14.5] },
  { at: STAGE.dispatch + 0.3, pos: [-14, 42, 46], look: [-24, 8, 8] },
  { at: STAGE.ack + 0.4, pos: [-20, 30, 37], look: [-29, 3, 13] },
  // 피트 바닥이 보이려면 거의 바로 위에서 본다 — 깊이 3.6 m, 입구 4.4 m
  { at: STAGE.vitals + 0.15, pos: [45, 27, 17], look: [40, -2.5, 3.5] },
  { at: STAGE.vitals + 0.9, pos: [43, 21, 12.5], look: [40, -3, 3.5] },
  { at: STAGE.later, pos: [-4, 60, 86], look: [2, 0, 2] },
  { at: STAGE.close, pos: [0, 78, 100], look: [0, 0, 0] },
];

function shotAt(s: number) {
  let i = 0;
  while (i < SHOTS.length - 1 && s > SHOTS[i + 1]!.at) i++;
  const a = SHOTS[i]!;
  const b = SHOTS[Math.min(i + 1, SHOTS.length - 1)]!;
  const k = a === b ? 0 : smooth(a.at, b.at, s);
  const lerp = (p: number[], q: number[]) => p.map((v, j) => v + (q[j]! - v) * k) as [number, number, number];
  return { pos: lerp(a.pos, b.pos), look: lerp(a.look, b.look) };
}

export function mountSite(host: HTMLElement): SiteHandle | null {
  const canvas = document.createElement("canvas");
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  host.append(canvas);

  const narrowQuery = window.matchMedia("(max-width: 900px)");
  let narrow = narrowQuery.matches;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  // 그림자는 넓은 화면에서만 — 휴대폰에서는 프레임 예산이 먼저다
  renderer.shadowMap.enabled = !narrow;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  scene.fog = new Fog(BG, 95, 240);
  // 금속(탱크 · 프레스 · 거울)이 비출 것 — 실내 반사 환경
  const pmrem = new PMREMGenerator(renderer);
  const envTexture: Texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.32;
  pmrem.dispose();

  const camera = new PerspectiveCamera(36, 1, 0.5, 400);

  // ---------------------------------------------------------------- 공장
  const factory = buildFactory(scene);

  // ---------------------------------------------------------------- 조명 — 밤의 공장
  scene.add(new HemisphereLight("#a9c0ea", "#18202f", 0.7));
  const moon = new DirectionalLight("#dbe6ff", 1.1);
  moon.position.set(-34, 80, 46);
  moon.target.position.set(0, 0, 0);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -70, right: 70, top: 55, bottom: -55, near: 20, far: 200 });
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.03;
  scene.add(moon, moon.target);
  for (const l of factory.lamps) {
    if (!l.lit) continue;
    // 높은 천장의 투광등 — 바닥에 따뜻한 빛 웅덩이를 만든다
    const p = new PointLight("#ffe3bd", 110, 34, 1.7);
    p.position.set(l.x, factory.lampHeight, l.z);
    scene.add(p);
  }

  // ---------------------------------------------------------------- 사람 · 지게차
  const workers = PEOPLE.map((_, i) => makeWorker(i === 1 ? "#f4f6f8" : "#f2c230"));
  for (const w of workers) {
    w.root.traverse((o) => (o.castShadow = o instanceof Mesh && o.material instanceof Material && !(o.material instanceof MeshBasicMaterial)));
    scene.add(w.root);
  }
  const forklifts = [makeForklift(FORKLIFT_SCALE), makeForklift(FORKLIFT_SCALE * 1.18)];
  for (const f of forklifts) scene.add(f.root);
  const beacons = [...factory.beacons, ...forklifts.map((f) => f.beacon)];
  const motion = PEOPLE.map(() => ({ x: NaN, z: NaN, yaw: 0, phase: 0, swing: 0 }));
  const forkMotion = FORKLIFT_ROUTES.map(() => ({ x: NaN, z: NaN, yaw: 0 }));

  // ---------------------------------------------------------------- 빛 재료 (수집 · 경보 · 확인 · 등기구 후광)
  const uniforms = { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uIntensity: { value: 1 } };
  const pointMaterial = new ShaderMaterial({ vertexShader: POINT_VERTEX, fragmentShader: POINT_FRAGMENT, uniforms, transparent: true, depthWrite: false, blending: AdditiveBlending });

  // 등기구 후광
  const glow = factory.lamps.flatMap((l) => [l.x, factory.lampHeight + 0.02, l.z]);
  const glowGeometry = new BufferGeometry();
  glowGeometry.setAttribute("position", new BufferAttribute(new Float32Array(glow), 3));
  glowGeometry.setAttribute("color", new BufferAttribute(new Float32Array(factory.lamps.flatMap(() => [1, 0.88, 0.7])), 3));
  glowGeometry.setAttribute("size", new BufferAttribute(new Float32Array(factory.lamps.map((l) => (l.lit ? 26 : 14))), 1));
  glowGeometry.setAttribute("aAlpha", new BufferAttribute(new Float32Array(factory.lamps.map((l) => (l.lit ? 0.75 : 0.4))), 1));
  scene.add(new Points(glowGeometry, pointMaterial));

  // 서버 점
  const nodeGeometry = new BufferGeometry();
  nodeGeometry.setAttribute("position", new BufferAttribute(Float32Array.from([NODE.x, NODE.y, NODE.z]), 3));
  const nodeUniforms = { uTime: uniforms.uTime, uPixelRatio: uniforms.uPixelRatio, uIntensity: uniforms.uIntensity, uAlpha: { value: 0 } };
  const node = new Points(
    nodeGeometry,
    new ShaderMaterial({ vertexShader: NODE_VERTEX, fragmentShader: NODE_FRAGMENT, uniforms: nodeUniforms, transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  node.frustumCulled = false;
  scene.add(node);

  // ---------------------------------------------------------------- 바닥 고리
  const ring = (inner: number, color: Color) => {
    const m = new MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    const r = new Mesh(new RingGeometry(inner, 1, 72), m);
    r.rotation.x = -Math.PI / 2;
    r.renderOrder = 4;
    r.frustumCulled = false;
    scene.add(r);
    return { mesh: r, material: m };
  };
  const hazardRing = ring(0.972, INK.clone()); // 지게차 1호의 위험 반경 — 속도에 따라 줄어든다
  const hazardDisc = new MeshBasicMaterial({ color: INK, transparent: true, opacity: 0, depthWrite: false });
  const hazardFill = new Mesh(new RingGeometry(0, 1, 72), hazardDisc);
  hazardFill.rotation.x = -Math.PI / 2;
  hazardFill.renderOrder = 4;
  scene.add(hazardFill);
  const alarmRings = [ring(0.8, LEVEL_COLOR.EMERGENCY.clone()), ring(0.8, LEVEL_COLOR.EMERGENCY.clone())]; // 당사자 둘레에 퍼지는 고리
  const heartRing = ring(0.84, VITAL.clone()); // W-3001 심박
  const laterRings = [ring(0.9, VITAL.clone()), ring(0.9, VITAL.clone())]; // 아직 없는 것의 자리

  const linkGeometry = new BufferGeometry();
  const linkPositions = new Float32Array(6);
  linkGeometry.setAttribute("position", new BufferAttribute(linkPositions, 3));
  const linkMaterial = new LineBasicMaterial({ color: INK, transparent: true, opacity: 0, depthWrite: false });
  const link = new Line(linkGeometry, linkMaterial);
  link.frustumCulled = false;
  link.renderOrder = 4;
  scene.add(link);

  // ---------------------------------------------------------------- 흐르는 빛
  // 수집 빛: 태그 → 서버. 대상마다 주기가 다르고, 넷 중 하나는 거의 같은 순간 두 번 올라간다
  // 이야기 빛: 서버 → 수신자 셋(경보), 당사자 → 서버(확인), 서버 ↔ W-3001(생존 확인)
  const rand = random(20261104);
  const emitters = [...PEOPLE.map((_, i) => ({ kind: "person" as const, i })), ...FORKLIFT_ROUTES.map((_, i) => ({ kind: "forklift" as const, i }))].map((e) => ({
    ...e,
    period: 2.2 + rand() * 1.8,
    offset: rand(),
    twin: rand() < 0.25,
  }));
  const STORY_SPARKS = 3 * 3 + 3 + 4;
  /** 빛 하나는 머리와 꼬리 둘 — 점 하나로는 움직이는 방향이 안 읽힌다 */
  const TRAIL = [
    { lag: 0, alpha: 1, size: 1 },
    { lag: 0.018, alpha: 0.5, size: 0.72 },
    { lag: 0.036, alpha: 0.24, size: 0.5 },
  ];
  const sparkCount = (emitters.length * 2 + STORY_SPARKS) * TRAIL.length;
  const sparkPositions = new Float32Array(sparkCount * 3);
  const sparkColors = new Float32Array(sparkCount * 3);
  const sparkAlpha = new Float32Array(sparkCount);
  const sparkSizes = new Float32Array(sparkCount).fill(7);
  const sparkGeometry = new BufferGeometry();
  sparkGeometry.setAttribute("position", new BufferAttribute(sparkPositions, 3));
  sparkGeometry.setAttribute("color", new BufferAttribute(sparkColors, 3));
  sparkGeometry.setAttribute("aAlpha", new BufferAttribute(sparkAlpha, 1));
  sparkGeometry.setAttribute("size", new BufferAttribute(sparkSizes, 1));
  const sparks = new Points(sparkGeometry, pointMaterial);
  sparks.frustumCulled = false;
  sparks.renderOrder = 5;
  scene.add(sparks);

  const scratch = new Vector3();
  /** 바닥의 한 점에서 서버까지 — 위로 부푼 곡선이라 빛이 랙을 뚫고 지나가지 않는다 */
  function arc(from: Vector3, to: Vector3, p: number, out: Vector3) {
    const mx = (from.x + to.x) / 2, mz = (from.z + to.z) / 2;
    const my = Math.max(from.y, to.y) + 6;
    const q = 1 - p;
    out.set(q * q * from.x + 2 * q * p * mx + p * p * to.x, q * q * from.y + 2 * q * p * my + p * p * to.y, q * q * from.z + 2 * q * p * mz + p * p * to.z);
    return out;
  }
  /** from → to 곡선 위 p 자리에 꼬리 달린 빛 하나. 다음에 쓸 번호를 돌려준다 */
  function streak(i: number, from: Vector3, to: Vector3, p: number, color: Color, alpha: number, size = 7) {
    for (const t of TRAIL) {
      const q = Math.max(0, p - t.lag);
      arc(from, to, q, scratch);
      sparkPositions.set([scratch.x, scratch.y, scratch.z], i * 3);
      sparkColors.set([color.r, color.g, color.b], i * 3);
      sparkAlpha[i] = p - t.lag > 0 ? alpha * t.alpha : 0;
      sparkSizes[i] = size * t.size;
      i++;
    }
    return i;
  }

  // ---------------------------------------------------------------- 단계 → 목표값
  const target = { ingest: 0.35, story: 0, tau: 0, alarm: 0, dispatch: 0, ack: 0, vitals: 0, ask: 0, answer: 0, later: 0, calm: 0, node: 0.5, blind: 0 };
  const now = { ...target };
  const shot = shotAt(0);
  const camPos = new Vector3(...shot.pos);
  const camLook = new Vector3(...shot.look);
  const aimPos = camPos.clone();
  const aimLook = camLook.clone();

  function aim(s: number) {
    target.ingest = 0.3 + 0.7 * smooth(STAGE.top + 0.5, STAGE.sources + 0.2, s) * (1 - 0.75 * smooth(STAGE.sources + 0.9, STAGE.raised, s)) + 0.2 * smooth(STAGE.later - 0.4, STAGE.later, s);
    target.node = 0.45 + 0.55 * smooth(STAGE.top + 0.4, STAGE.sources, s);
    target.story = smooth(STAGE.raised - 0.6, STAGE.raised - 0.3, s) * (1 - smooth(STAGE.measure + 0.2, STAGE.measure + 0.5, s));
    target.tau = smooth(STAGE.raised - 0.05, STAGE.raised + 0.92, s) * STORY_SECONDS;
    target.blind = smooth(STAGE.raised - 0.3, STAGE.raised + 0.2, s) * (1 - smooth(STAGE.vitals - 0.3, STAGE.vitals, s));
    target.dispatch = smooth(STAGE.dispatch - 0.15, STAGE.dispatch + 0.25, s) * (1 - smooth(STAGE.ack + 0.1, STAGE.ack + 0.45, s));
    target.ack = smooth(STAGE.ack + 0.05, STAGE.ack + 0.4, s) * (1 - smooth(STAGE.vitals - 0.2, STAGE.vitals + 0.1, s));
    // 확인을 받으면 색이 가라앉는다. 경보는 아직 열려 있다 — 마감(CLOSED)은 닫는 말에서
    target.alarm = smooth(STAGE.raised - 0.4, STAGE.raised, s) * (1 - 0.8 * smooth(STAGE.ack + 0.3, STAGE.ack + 0.8, s));
    target.vitals = smooth(STAGE.vitals - 0.25, STAGE.vitals + 0.1, s) * (1 - smooth(STAGE.measure - 0.1, STAGE.measure + 0.2, s));
    target.ask = smooth(STAGE.vitals + 0.2, STAGE.vitals + 0.35, s) * (1 - smooth(STAGE.vitals + 0.6, STAGE.vitals + 0.7, s));
    target.answer = smooth(STAGE.vitals + 0.62, STAGE.vitals + 0.75, s) * (1 - smooth(STAGE.measure - 0.05, STAGE.measure + 0.2, s));
    target.later = smooth(STAGE.later - 0.4, STAGE.later + 0.1, s) * (1 - smooth(STAGE.close - 0.4, STAGE.close + 0.3, s));
    target.calm = smooth(STAGE.close - 0.5, STAGE.close, s);
    const next = shotAt(s);
    aimPos.set(...next.pos);
    aimLook.set(...next.look);
  }
  aim(0);

  // ---------------------------------------------------------------- 크기
  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    narrow = narrowQuery.matches;
    // 넓은 화면에서는 투영 중심을 오른쪽으로 옮겨 왼쪽 글자(제목)와 겹치지 않게 한다
    if (narrow) camera.clearViewOffset();
    else camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    camera.updateProjectionMatrix();
    uniforms.uIntensity.value = narrow ? 0.7 : 1;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  // ---------------------------------------------------------------- 그리기
  let last = performance.now();
  let elapsed = 0;
  let visible = true;
  let pageVisible = !document.hidden;
  /** W-3001 의 시계. 생존 확인 구간에서는 멈춘다 — 무동작이 이 장면의 사실이다 */
  let pitClock = 0;
  const tint = new Color();
  const self = new Vector3();
  const supervisor = new Vector3();
  const pit = new Vector3();
  const from = new Vector3();
  const forkTag = new Vector3();
  const up = new Vector3(0, 1, 0);
  /** 키운 사람의 머리 높이 — 보고가 올라가는 자리 */
  const HEAD = 1.72 * PERSON_SCALE;

  /** 걸으면 다리와 팔이 흔들리고, 가는 쪽을 본다 (관제 화면 WorkerFigure 와 같은 움직임) */
  function placeWorker(i: number, x: number, y: number, base: number, dt: number) {
    const w = workers[i]!;
    const m = motion[i]!;
    const X = wx(x), Z = wz(y);
    const dx = Number.isNaN(m.x) ? 0 : X - m.x;
    const dz = Number.isNaN(m.z) ? 0 : Z - m.z;
    const speed = dt > 0 ? Math.hypot(dx, dz) / dt : 0;
    const walking = speed > 0.25 && speed < 30;
    if (walking) {
      m.yaw = Math.atan2(dx, dz);
      m.phase += dt * 8;
    }
    m.swing += ((walking ? Math.sin(m.phase) * 0.55 : 0) - m.swing) * (1 - Math.exp(-dt * 10));
    m.x = X;
    m.z = Z;
    w.root.position.set(X, base, Z);
    w.body.rotation.y += (((m.yaw - w.body.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * (1 - Math.exp(-dt * 6));
    w.legs.forEach((l, k) => (l.rotation.x = k ? -m.swing : m.swing));
    w.arms.forEach((a, k) => (a.rotation.x = k ? m.swing * 0.8 : -m.swing * 0.8));
  }

  function frame(time: number) {
    const dt = Math.min((time - last) / 1000, 0.05); // 탭 복귀 직후 한 번에 튀지 않게
    last = time;
    elapsed += dt;
    pitClock += dt * (1 - now.vitals);

    // 목차 링크로 멀리 건너뛰어도 순간이동하지 않게 목표값을 따라간다
    const k = 1 - Math.exp(-dt * 2.6);
    for (const key of Object.keys(target) as Array<keyof typeof target>) now[key] += (target[key] - now[key]) * k;
    camPos.lerp(aimPos, k);
    camLook.lerp(aimLook, k);
    uniforms.uTime.value = elapsed;
    nodeUniforms.uAlpha.value = now.node;

    const t = elapsed;
    const story = storyAt(now.tau);
    const level = story.alarm;
    const levelColor = level === "NONE" ? INK : LEVEL_COLOR[level];
    // 지게차 1호와 W-1002 는 이야기 구간 동안 story.ts 의 표본을 따른다. 바뀌는 순간은 밝은 지면이 덮고 있다
    const scripted = now.story > 0.5;

    // 프레스 — 6초에 한 번 내려찍는다. 플라이휠은 늘 돈다
    const cycle = fract(t / 6);
    factory.press.ram.position.y = 4.7 - 2.3 * smooth(0.0, 0.18, cycle) * (1 - smooth(0.3, 0.6, cycle));
    factory.press.wheel.rotation.x += dt * 2.4;
    // 경광등 — 돌아가는 불빛
    for (const b of beacons) b.material.emissiveIntensity = 0.4 + 1.6 * Math.max(0, Math.sin(t * b.speed));

    // 지게차
    FORKLIFT_ROUTES.forEach((route, i) => {
      const f = forklifts[i]!;
      const m = forkMotion[i]!;
      let x: number, y: number;
      if (i === 0 && scripted) {
        x = story.fx;
        y = story.fy;
      } else {
        const p = walkAt(route, t);
        x = p.x;
        y = p.y;
      }
      const X = wx(x), Z = wz(y);
      const dist = Number.isNaN(m.x) ? 0 : Math.hypot(X - m.x, Z - m.z);
      if (dist > 0.0005 && dist < 3) m.yaw = Math.atan2(X - m.x, Z - m.z);
      m.x = X;
      m.z = Z;
      f.root.position.set(X, 0, Z);
      f.yaw.rotation.y += (((m.yaw - f.yaw.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * (1 - Math.exp(-dt * 8));
      if (dist < 3) for (const w of f.wheels) w.rotation.x += dist * 3.4;
      f.spot.opacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3));
    });

    // 사람
    PEOPLE.forEach((route, i) => {
      if (i === 0 && scripted) return placeWorker(i, story.wx, story.wy, 0, dt);
      const p = walkAt(route, i === 2 ? pitClock : t);
      placeWorker(i, p.x, p.y, i === 2 ? -PIT.depth : 0, dt);
    });

    const hero = workers[0]!;
    self.copy(hero.root.position).setY(HEAD * 0.7);
    const fork = forklifts[0]!.root.position;

    // 당사자의 발밑 표식 — 경보가 열리면 등급색이 된다. 다른 사람은 관제 화면과 같은 파랑 그대로
    const alarmed = scripted && level !== "NONE";
    tint.copy(MARK).lerp(levelColor, alarmed ? now.alarm : 0);
    hero.mark.color.copy(tint);
    hero.ring.color.copy(tint);
    hero.mark.opacity = 0.28 + (alarmed ? 0.3 * now.alarm : 0);

    // 사각지대 — 이야기 동안 바닥색을 짙게
    for (const z of factory.zones) if (z.zone.kind === "BLIND_SPOT") z.fill.opacity = 0.14 + 0.14 * now.blind;

    // 위험 반경 · 이격 선
    const storyView = now.story * now.blind;
    hazardRing.mesh.position.set(fork.x, 0.07, fork.z);
    hazardRing.mesh.scale.setScalar(story.hazardRadiusM);
    hazardRing.material.opacity = 0.75 * storyView * (1 - now.calm);
    hazardFill.position.set(fork.x, 0.06, fork.z);
    hazardFill.scale.setScalar(story.hazardRadiusM);
    hazardDisc.opacity = 0.08 * storyView * (1 - now.calm);
    linkPositions.set([self.x, 0.35, self.z, fork.x, 0.35, fork.z]);
    linkGeometry.attributes.position!.needsUpdate = true;
    linkMaterial.color.copy(levelColor);
    linkMaterial.opacity = (level === "NONE" ? 0.25 : 0.8) * storyView * (1 - now.ack * 0.8);

    // 경보 고리 — 당사자 둘레로 퍼진다. 확인 전까지 멈추지 않는다
    alarmRings.forEach((r, j) => {
      const p = fract(t * 0.9 + j * 0.5);
      r.mesh.position.set(self.x, 0.08, self.z);
      r.mesh.scale.setScalar(1.3 + p * 3.4);
      r.material.color.copy(levelColor);
      r.material.opacity = level === "NONE" ? 0 : (1 - p) * 0.85 * now.alarm * now.story * (1 - now.ack);
    });

    // W-3001 — 심박 고리(쉬는 심박 72회/분)와 생존 확인. 사람이 들어가 있으면 피트 안 공기가 짙어진다
    const pw = workers[2]!.root.position;
    pit.set(pw.x, -PIT.depth + HEAD * 0.7, pw.z);
    const beat = fract(t * 1.2);
    heartRing.mesh.position.set(pw.x, -PIT.depth + 0.06, pw.z);
    heartRing.mesh.scale.setScalar(0.6 + beat * 1.8);
    heartRing.material.opacity = (1 - beat) * 0.85 * now.vitals;
    factory.pit.haze.opacity = 0.07 + 0.1 * now.vitals * (0.5 + 0.5 * Math.sin(t * 2.4));

    // 아직 — 차량 제어 실연동(지게차 1호) · 워치 산소포화도(W-3001)
    const blink = 0.45 + 0.35 * Math.sin(t * 1.6);
    laterRings[0]!.mesh.position.set(fork.x, 0.1, fork.z);
    laterRings[0]!.mesh.scale.setScalar(3.2);
    laterRings[1]!.mesh.position.set(wx(PIT.x), 0.1, wz(PIT.y));
    laterRings[1]!.mesh.scale.setScalar(4.2);
    for (const r of laterRings) r.material.opacity = blink * now.later;

    // 흐르는 빛 — 수집
    let n = 0;
    emitters.forEach((e) => {
      if (e.kind === "person") from.copy(workers[e.i]!.root.position).setY(workers[e.i]!.root.position.y + HEAD);
      else from.copy(forklifts[e.i]!.root.position).setY(3);
      const p = fract(t / e.period + e.offset);
      n = streak(n, from, NODE, p, SIGNAL, now.ingest * Math.sin(p * Math.PI) * 0.9);
      // 거의 같은 순간의 두 번째 보고 — 서버에 닿기 전에 사라진다(중복 제거)
      const q = p - 0.06;
      const twin = e.twin && q > 0 ? now.ingest * Math.sin(q * Math.PI) * 0.9 * (1 - smooth(0.35, 0.55, q)) : 0;
      n = streak(n, from, NODE, Math.max(q, 0), SIGNAL, twin);
    });

    // 경보 — 서버에서 당사자 · 운전자 · 안전관리자에게
    supervisor.copy(workers[1]!.root.position).setY(HEAD);
    forkTag.set(fork.x, 3, fork.z);
    [self, forkTag, supervisor].forEach((to) => {
      for (let j = 0; j < 3; j++) {
        const p = fract(t * 0.7 + j / 3);
        n = streak(n, NODE, to, p, levelColor, now.dispatch * Math.sin(p * Math.PI), 8);
      }
    });
    // 확인 — 당사자에서 서버로
    for (let j = 0; j < 3; j++) {
      const p = fract(t * 0.55 + j / 3);
      n = streak(n, self, NODE, p, CONFIRM, now.ack * Math.sin(p * Math.PI), 8);
    }
    // 생존 확인 — 서버가 묻고, W-3001 이 답한다
    for (let j = 0; j < 2; j++) {
      const p = fract(t * 0.6 + j / 2);
      n = streak(n, NODE, pit, p, VITAL, now.ask * Math.sin(p * Math.PI), 8);
      n = streak(n, pit, NODE, p, CONFIRM, now.answer * Math.sin(p * Math.PI), 8);
    }
    for (; n < sparkCount; n++) sparkAlpha[n] = 0;
    sparkGeometry.attributes.position!.needsUpdate = true;
    sparkGeometry.attributes.color!.needsUpdate = true;
    sparkGeometry.attributes.aAlpha!.needsUpdate = true;
    sparkGeometry.attributes.size!.needsUpdate = true;

    // 카메라 — 좁은 화면은 조금 물러선다. 닫는 말에서는 천천히 돈다
    const back = narrow ? 1.28 : 1;
    const orbit = now.calm * 0.12 * Math.sin(t * 0.05);
    scratch.copy(camPos).sub(camLook).multiplyScalar(back).applyAxisAngle(up, orbit).add(camLook);
    camera.position.copy(scratch);
    camera.lookAt(camLook);

    renderer.render(scene, camera);
  }

  function sync() {
    const run = visible && pageVisible;
    if (run) last = performance.now();
    renderer.setAnimationLoop(run ? frame : null);
  }

  function onVisibility() {
    pageVisible = !document.hidden;
    sync();
  }
  document.addEventListener("visibilitychange", onVisibility);
  sync();

  return {
    setStage(s) {
      aim(s);
    },
    setVisible(v) {
      if (v === visible) return;
      visible = v;
      sync();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      // 공장은 공유 재료 · 모양이 많다 — 장면을 훑어 한 번씩만 정리한다
      const seen = new Set<{ dispose(): void }>();
      scene.traverse((o) => {
        const any = o as unknown as { geometry?: { dispose(): void }; material?: Material | Material[] };
        if (any.geometry) seen.add(any.geometry);
        for (const m of Array.isArray(any.material) ? any.material : any.material ? [any.material] : []) {
          seen.add(m);
          const map = (m as unknown as { map?: Texture | null }).map;
          if (map) seen.add(map);
        }
      });
      seen.forEach((d) => d.dispose());
      envTexture.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
