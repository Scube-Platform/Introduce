/**
 * 시범 공장의 몸체 —바닥 · 벽 · 기둥 · 조명 · 랙 · 설비 · 사람 · 지게차.
 *
 * 모형은 관제 화면 3D 현장 보기(AegisDashboard src/components/site3d/SiteScene.tsx)를 따른다. 안전모와 형광 조끼의
 * 작업자, 노란 지게차, 프레스 · 탱크 · 배관 피트 · 출하장 볼록거울 — 관제자가 현장을 알아보는 단서가 이름보다 모양이고,
 * 두 화면이 같은 현장을 같은 모양으로 말해야 한다. 서버에는 설비 정보가 없으므로 구역 이름 · 종류에서 정했다.
 *
 * 스케일 1 unit = 1 m, 좌표는 서버 그대로(현장 가운데를 원점으로 옮겼을 뿐이다). 사람과 지게차만 화면에서 읽히도록
 * 관제 화면처럼 키웠다(PERSON_SCALE · FORKLIFT_SCALE). 판정 거리는 키우기 전의 실제 미터다.
 *
 * 글자는 그리지 않는다 — 바닥 도장에도 문자는 없다.
 */
import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineLoop,
  BufferGeometry,
  BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Path,
  RingGeometry,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  ConeGeometry,
  Vector2,
  AdditiveBlending,
  type Material,
} from "three";
import { ZONES, type Zone } from "./site";

export const CX = 47.5;
export const CZ = 32.5;
/** 서버 좌표(m) → 장면 좌표. 서버의 (x, y) 평면을 바닥(x, z)에 눕힌다 — 대시보드 site3d.ts 와 같은 규칙 */
export const wx = (x: number) => x - CX;
export const wz = (y: number) => y - CZ;

/** 건물 외곽(서버 좌표). 시드 구역을 모두 담고, 출하장 문이 서쪽 벽에 난다 */
export const HALL = { x0: -6, x1: 101, y0: -2, y1: 66, height: 9.5 } as const;
/** 지하 배관 피트 개구부 — Z-CONFINED-01 한가운데 */
export const PIT = { x: 87.5, y: 36, sx: 6, sy: 4.4, depth: 3.6 } as const;
/** 랙 — 두 줄씩 등을 맞댄 선반 넷. 이 랙이 출하장 진입로를 가린다(사각지대) */
const RACK = { x0: 24, x1: 56, rows: [31.8, 39.8, 51.8, 59.8], bays: 12, height: 5.4, levels: [0, 1.5, 2.85, 4.2] } as const;
/** 지게차 통로 — 바닥 노란 선 */
const LANES = [
  { y: 46.1, x0: 12, x1: 58 },
  { y: 28.2, x0: 4, x1: 58 },
] as const;
/** 천장 조명. 앞의 여섯은 실제로 빛을 내고(PointLight), 나머지는 등기구만 있다 */
export const LAMPS: Array<{ x: number; y: number; lit: boolean }> = [
  { x: 24, y: 47, lit: true },
  { x: 54, y: 47, lit: true },
  { x: 84, y: 47, lit: true },
  { x: 24, y: 15, lit: true },
  { x: 54, y: 15, lit: true },
  { x: 84, y: 34, lit: true },
  { x: 9, y: 47, lit: false },
  { x: 39, y: 31, lit: false },
  { x: 69, y: 47, lit: false },
  { x: 9, y: 15, lit: false },
  { x: 39, y: 15, lit: false },
  { x: 69, y: 15, lit: false },
];

/** 사람 · 지게차를 화면에서 읽히게 키우는 배율. 관제 화면은 2.1 · 1.5 — 여기는 카메라가 가까워 실제 크기에 가깝게 둔다.
 *  더 키우면 1.44 m 에서 선 지게차가 사람과 닿아 보인다 */
export const PERSON_SCALE = 1.4;
export const FORKLIFT_SCALE = 1.05;

/** 관제 화면 levels.ts ZONE_COLOR — 평면 도면 · 3D 도면 · 이 페이지가 같은 색이어야 같은 구역으로 읽힌다 */
export const ZONE_COLOR: Record<string, string> = {
  CONFINED: "#e5322d",
  HAZARD: "#ff8a00",
  RESTRICTED: "#ffc400",
  BLIND_SPOT: "#4f9bff",
  SAFE: "#2f9e44",
};
/** 관제 화면과 같은 작업자 발밑 표식 색 */
export const WORKER_MARK = "#2a78d6";

/** 결정적인 난수 — 새로 고쳐도 같은 현장이다 */
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------- 재료
const cache = new Map<string, MeshStandardMaterial>();
function std(color: string, roughness = 0.7, metalness = 0, extra: Partial<MeshStandardMaterial> = {}) {
  const key = `${color}|${roughness}|${metalness}|${JSON.stringify(extra)}`;
  let m = cache.get(key);
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness, metalness });
    Object.assign(m, extra);
    cache.set(key, m);
  }
  return m;
}

const YELLOW = "#e0b417";

/** 바닥과 벽은 그림자를 받고, 물건은 그림자를 드리운다 */
function mesh(geometry: BufferGeometry, material: Material, x: number, y: number, z: number, cast = true, receive = true) {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

const unitBox = new BoxGeometry(1, 1, 1);
const box = (sx: number, sy: number, sz: number, material: Material, x: number, y: number, z: number, cast = true) => {
  const m = mesh(unitBox, material, x, y, z, cast);
  m.scale.set(sx, sy, sz);
  return m;
};

type Inst = { x: number; y: number; z: number; sx: number; sy: number; sz: number; color?: string };
const dummy = new Object3D();
/** 같은 모양이 수백 개 — 랙 기둥 · 보 · 적재물은 하나의 그리기 호출로 낸다 */
function instanced(items: Inst[], material: Material, geometry: BufferGeometry = unitBox, cast = true) {
  const im = new InstancedMesh(geometry, material, items.length);
  const c = new Color();
  items.forEach((it, i) => {
    dummy.position.set(it.x, it.y, it.z);
    dummy.scale.set(it.sx, it.sy, it.sz);
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
    if (it.color) im.setColorAt(i, c.set(it.color));
  });
  im.castShadow = cast;
  im.receiveShadow = true;
  return im;
}

// ---------------------------------------------------------------- 바닥 도장
/**
 * 바닥 한 장. 콘크리트 결 · 6 m 줄눈 · 지게차 통로의 노란 선 · 사각지대 앞 정지선을 그린다.
 * 피트 개구부는 구멍으로 뚫는다 — 그 아래가 보여야 밀폐공간이다.
 */
function floorTexture() {
  const W = HALL.x1 - HALL.x0;
  const H = HALL.y1 - HALL.y0;
  const s = 20; // px / m
  const c = document.createElement("canvas");
  c.width = Math.round(W * s);
  c.height = Math.round(H * s);
  const g = c.getContext("2d")!;
  const px = (x: number) => (x - HALL.x0) * s;
  const py = (y: number) => (y - HALL.y0) * s;

  g.fillStyle = "#7d848e";
  g.fillRect(0, 0, c.width, c.height);
  // 콘크리트 결 — 얼룩과 잔티
  const rand = random(7);
  for (let i = 0; i < 900; i++) {
    const r = 20 + rand() * 120;
    const grad = g.createRadialGradient(rand() * c.width, rand() * c.height, 0, rand() * c.width, rand() * c.height, r);
    grad.addColorStop(0, `rgba(${rand() < 0.5 ? "40,44,52" : "150,156,166"},${0.04 + rand() * 0.05})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
  }
  for (let i = 0; i < 26000; i++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? "30,32,38" : "210,214,220"},${0.06 + rand() * 0.1})`;
    g.fillRect(rand() * c.width, rand() * c.height, 1.5, 1.5);
  }
  // 줄눈
  g.strokeStyle = "rgba(30,34,40,0.45)";
  g.lineWidth = 1.5;
  for (let x = HALL.x0; x <= HALL.x1; x += 6) {
    g.beginPath();
    g.moveTo(px(x), 0);
    g.lineTo(px(x), c.height);
    g.stroke();
  }
  for (let y = HALL.y0; y <= HALL.y1; y += 6) {
    g.beginPath();
    g.moveTo(0, py(y));
    g.lineTo(c.width, py(y));
    g.stroke();
  }
  // 랙 발밑 — 오래 놓인 자리가 더 어둡다
  g.fillStyle = "rgba(25,28,34,0.35)";
  for (const yc of RACK.rows) g.fillRect(px(RACK.x0 - 0.3), py(yc - 1.5), (RACK.x1 - RACK.x0 + 0.6) * s, 3 * s);
  // 지게차 통로 — 양쪽 노란 실선
  g.fillStyle = "#e5b80b";
  for (const lane of LANES) {
    for (const edge of [-1.9, 1.9]) g.fillRect(px(lane.x0), py(lane.y + edge) - 0.06 * s, (lane.x1 - lane.x0) * s, 0.12 * s);
  }
  // 보행 통로 — 랙 사이 흰 점선
  g.fillStyle = "rgba(235,238,242,0.85)";
  for (const y of [35.8, 55.8]) {
    for (let x = RACK.x0; x < RACK.x1; x += 2) g.fillRect(px(x), py(y) - 0.05 * s, 1 * s, 0.1 * s);
  }
  // 사각지대 앞 정지선 — 지게차가 출하장으로 꺾기 전에 서는 자리
  g.fillStyle = "rgba(240,242,246,0.92)";
  g.fillRect(px(22) - 0.2 * s, py(46.1 - 1.9), 0.4 * s, 3.8 * s);
  // 위험구역(프레스) 둘레 — 노랑 · 검정 빗금 띠
  const press = ZONES.find((z) => z.kind === "HAZARD")!;
  const [[ax, ay], , [bx, by]] = press.vertices as [[number, number], [number, number], [number, number]];
  g.save();
  g.beginPath();
  g.rect(px(ax) - 0.6 * s, py(ay) - 0.6 * s, (bx - ax + 1.2) * s, (by - ay + 1.2) * s);
  g.rect(px(ax), py(ay), (bx - ax) * s, (by - ay) * s);
  g.clip("evenodd");
  g.fillStyle = "#e5b80b";
  g.fillRect(px(ax) - s, py(ay) - s, (bx - ax + 2) * s, (by - ay + 2) * s);
  g.strokeStyle = "#1b1d21";
  g.lineWidth = 0.35 * s;
  for (let d = -40; d < 60; d += 0.9) {
    g.beginPath();
    g.moveTo(px(ax + d), py(ay - 2));
    g.lineTo(px(ax + d + 20), py(ay + 18));
    g.stroke();
  }
  g.restore();

  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function buildFloor(scene: Scene) {
  // 모양은 장면 좌표(x, -z)로 그린 뒤 눕힌다. 피트 개구부는 구멍이다
  const shape = new Shape();
  shape.moveTo(wx(HALL.x0), -wz(HALL.y0));
  shape.lineTo(wx(HALL.x1), -wz(HALL.y0));
  shape.lineTo(wx(HALL.x1), -wz(HALL.y1));
  shape.lineTo(wx(HALL.x0), -wz(HALL.y1));
  shape.closePath();
  const hole = new Path();
  const [hx0, hx1, hy0, hy1] = [PIT.x - PIT.sx / 2, PIT.x + PIT.sx / 2, PIT.y - PIT.sy / 2, PIT.y + PIT.sy / 2];
  hole.moveTo(wx(hx0), -wz(hy0));
  hole.lineTo(wx(hx0), -wz(hy1));
  hole.lineTo(wx(hx1), -wz(hy1));
  hole.lineTo(wx(hx1), -wz(hy0));
  hole.closePath();
  shape.holes.push(hole);
  const geometry = new ShapeGeometry(shape);
  // UV 를 서버 좌표에서 다시 낸다 — 캔버스 한 장이 건물 바닥 전체다
  const pos = geometry.attributes.position!;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + CX;
    const y = -pos.getY(i) + CZ;
    uv[i * 2] = (x - HALL.x0) / (HALL.x1 - HALL.x0);
    uv[i * 2 + 1] = 1 - (y - HALL.y0) / (HALL.y1 - HALL.y0);
  }
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  const floor = new Mesh(geometry, new MeshStandardMaterial({ map: floorTexture(), roughness: 0.82, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
}

// ---------------------------------------------------------------- 건물
function buildShell(scene: Scene) {
  const H = HALL.height;
  const wall = std("#3b4452", 0.9);
  const column = std("#5d6672", 0.55, 0.35);
  const len = HALL.x1 - HALL.x0;
  const dep = HALL.y1 - HALL.y0;
  const midX = wx((HALL.x0 + HALL.x1) / 2);
  const midZ = wz((HALL.y0 + HALL.y1) / 2);

  // 벽은 먼 두 쪽(남 · 서)에만 세운다 — 가까운 쪽은 잘라 낸 단면이다
  scene.add(box(len + 0.6, H, 0.3, wall, midX, H / 2, wz(HALL.y0) - 0.15, false));
  // 남쪽 벽 위 채광창 — 밤이라 바깥의 푸른 빛이 들어온다
  const windowGlow = std("#9fb7d6", 0.4, 0, { emissive: new Color("#7da2d6"), emissiveIntensity: 0.55 });
  scene.add(box(len * 0.92, 1.1, 0.05, windowGlow, midX, H - 1.6, wz(HALL.y0) + 0.02, false));

  // 서쪽 벽 — 출하장 문 셋을 비운다
  const doors = [44, 50.5, 57];
  const doorW = 3.6;
  const doorH = 4.4;
  let from = HALL.y0;
  for (const y of [...doors, HALL.y1 + doorW / 2]) {
    const to = y - doorW / 2;
    if (to > from) scene.add(box(0.3, doorH, to - from, wall, wx(HALL.x0) - 0.15, doorH / 2, wz((from + to) / 2), false));
    from = y + doorW / 2;
  }
  scene.add(box(0.3, H - doorH, dep + 0.6, wall, wx(HALL.x0) - 0.15, doorH + (H - doorH) / 2, midZ, false));
  const shutter = std("#9aa3ae", 0.5, 0.4);
  const frame = std(YELLOW, 0.55);
  for (const y of doors) {
    // 반쯤 올린 셔터와 노란 문틀 · 충돌 방지 기둥
    scene.add(box(0.12, 1.6, doorW, shutter, wx(HALL.x0) - 0.1, doorH - 0.8, wz(y)));
    for (const side of [-1, 1]) {
      scene.add(box(0.2, doorH, 0.16, frame, wx(HALL.x0) + 0.05, doorH / 2, wz(y + (side * (doorW + 0.16)) / 2)));
      scene.add(mesh(new CylinderGeometry(0.14, 0.14, 1.1, 14), frame, wx(HALL.x0) + 0.6, 0.55, wz(y + side * (doorW / 2 + 0.3))));
    }
  }

  // 기둥 — 15 m 간격, 네 둘레
  const posts: Inst[] = [];
  for (let x = HALL.x0; x <= HALL.x1 + 0.1; x += 15) {
    posts.push({ x: wx(x), y: H / 2, z: wz(HALL.y0) + 0.3, sx: 0.5, sy: H, sz: 0.5 });
    posts.push({ x: wx(x), y: 1.2, z: wz(HALL.y1), sx: 0.5, sy: 2.4, sz: 0.5 }); // 잘라 낸 쪽 — 밑동만
  }
  for (let y = HALL.y0 + 15; y < HALL.y1; y += 15) {
    posts.push({ x: wx(HALL.x0) + 0.3, y: H / 2, z: wz(y), sx: 0.5, sy: H, sz: 0.5 });
    posts.push({ x: wx(HALL.x1), y: 1.2, z: wz(y), sx: 0.5, sy: 2.4, sz: 0.5 });
  }
  scene.add(instanced(posts, column));

  // 지붕은 걷어 낸다 — 보가 남으면 위에서 내려다보는 화면을 대각선으로 가로질러 랙을 가린다.
  // 먼 두 벽 위의 테두리 보만 남겨 높이를 알게 한다
  const eaves = std("#4a5462", 0.6, 0.4);
  scene.add(box(len + 0.6, 0.6, 0.4, eaves, midX, H - 0.3, wz(HALL.y0) + 0.3, false));
  scene.add(box(0.4, 0.6, dep + 0.6, eaves, wx(HALL.x0) + 0.3, H - 0.3, midZ, false));

  // 잘라 낸 두 쪽의 낮은 턱
  const curb = std("#59616c", 0.8);
  scene.add(box(len + 0.6, 0.4, 0.4, curb, midX, 0.2, wz(HALL.y1) + 0.2));
  scene.add(box(0.4, 0.4, dep + 0.6, curb, wx(HALL.x1) + 0.2, 0.2, midZ));

  // 북동쪽 현장 사무실 — 불 켜진 창
  const ox = wx(94), oz = wz(59), osx = 12, osz = 12, oh = 4.2;
  scene.add(box(osx, oh, osz, std("#3a4452", 0.85), ox, oh / 2, oz));
  const lit = std("#ffe3b8", 0.4, 0, { emissive: new Color("#ffcf8a"), emissiveIntensity: 0.9 });
  scene.add(box(osx * 0.86, 1.1, 0.05, lit, ox, 2.4, oz - osz / 2 - 0.03, false));
  scene.add(box(0.05, 1.1, osz * 0.8, lit, ox - osx / 2 - 0.03, 2.4, oz, false));
  scene.add(box(osx + 0.4, 0.25, osz + 0.4, std("#59616c", 0.8), ox, oh + 0.12, oz));

  // 출하장에 대 놓은 트레일러 둘 — 문 밖
  const trailer = std("#dfe4ea", 0.55, 0.2);
  const cab = std("#2f6fe0", 0.45, 0.3);
  const tire = std("#151515", 0.9);
  for (const y of [44, 57]) {
    const z = wz(y);
    scene.add(box(12, 3.4, 2.5, trailer, wx(HALL.x0) - 6.6, 2.15, z));
    scene.add(box(2.6, 2.9, 2.5, cab, wx(HALL.x0) - 14.2, 1.9, z));
    for (const xx of [-2.2, -3.6, -10.4, -14.6]) {
      for (const side of [-1, 1]) {
        const w = mesh(new CylinderGeometry(0.5, 0.5, 0.35, 18), tire, wx(HALL.x0) + xx - 0.4, 0.5, z + side * 1.1);
        w.rotation.x = Math.PI / 2;
        scene.add(w);
      }
    }
  }
}

// ---------------------------------------------------------------- 천장 조명
export type Lamp = { x: number; z: number; lit: boolean };
function buildLamps(scene: Scene) {
  // 카메라가 늘 등기구보다 높다 — 위에서 본 갓이 검은 원판으로 뜨지 않게 밝은 금속으로 둔다
  const housing = std("#9aa3ae", 0.35, 0.7);
  const face = new MeshStandardMaterial({ color: "#fff4dc", emissive: new Color("#fff1d6"), emissiveIntensity: 2.4 });
  // 빛기둥 — 먼지 낀 공장 공기에 비치는 원뿔. 가산 혼합이라 겹치면 밝아진다
  const shaft = new MeshBasicMaterial({ color: "#ffe9c8", transparent: true, opacity: 0.045, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
  const lamps: Lamp[] = [];
  const H = HALL.height - 0.6;
  for (const l of LAMPS) {
    const x = wx(l.x), z = wz(l.y);
    scene.add(mesh(new CylinderGeometry(0.02, 0.02, 1.4, 4), housing, x, H + 0.1, z, false, false)); // 매단 줄
    scene.add(mesh(new CylinderGeometry(0.16, 0.38, 0.34, 20), housing, x, H - 0.75, z, false, false));
    const disc = mesh(new CircleGeometry(0.36, 20), face, x, H - 0.93, z, false, false);
    disc.rotation.x = Math.PI / 2;
    scene.add(disc);
    if (l.lit) {
      const cone = new Mesh(new ConeGeometry(6.5, H - 1, 28, 1, true), shaft);
      cone.position.set(x, (H - 1) / 2, z);
      cone.renderOrder = 2;
      scene.add(cone);
    }
    lamps.push({ x, z, lit: l.lit });
  }
  return { lamps, height: H - 1 };
}

// ---------------------------------------------------------------- 랙 · 적재물
function buildRacks(scene: Scene) {
  const rand = random(20261104);
  const bay = (RACK.x1 - RACK.x0) / RACK.bays;
  const uprights: Inst[] = [];
  const beams: Inst[] = [];
  const pallets: Inst[] = [];
  const loads: Inst[] = [];
  const bollards: Inst[] = [];
  const GOODS = ["#b08f5f", "#a07c4c", "#c29a62", "#cfd6dd", "#d9dee6", "#3d6fb8", "#8a939e"];

  for (const yc of RACK.rows) {
    // 등을 맞댄 두 랙: 각 깊이 1.1 m, 가운데 0.2 m 틈
    const faces = [yc - 1.2, yc - 0.1, yc + 0.1, yc + 1.2];
    for (let b = 0; b <= RACK.bays; b++) {
      const x = RACK.x0 + b * bay;
      for (const f of faces) uprights.push({ x: wx(x), y: RACK.height / 2, z: wz(f), sx: 0.09, sy: RACK.height, sz: 0.09 });
    }
    for (let b = 0; b < RACK.bays; b++) {
      const xm = RACK.x0 + (b + 0.5) * bay;
      for (const level of [...RACK.levels.slice(1), RACK.height - 0.05]) {
        for (const f of faces) beams.push({ x: wx(xm), y: level, z: wz(f), sx: bay, sy: 0.12, sz: 0.05 });
      }
      for (const side of [yc - 0.65, yc + 0.65]) {
        for (const level of RACK.levels) {
          for (const off of [-0.32, 0.32]) {
            if (rand() < 0.16) continue; // 빈 칸
            const x = xm + off * bay;
            const h = 0.6 + rand() * 0.55;
            const base = level + (level ? 0.06 : 0);
            pallets.push({ x: wx(x), y: base + 0.07, z: wz(side), sx: 1.15, sy: 0.14, sz: 1.0 });
            loads.push({ x: wx(x), y: base + 0.14 + h / 2, z: wz(side), sx: 1.05, sy: h, sz: 0.92, color: GOODS[Math.floor(rand() * GOODS.length)] });
          }
        }
      }
    }
    // 랙 끝 충돌 방지 기둥
    for (const x of [RACK.x0 - 0.35, RACK.x1 + 0.35]) for (const f of [yc - 1.1, yc + 1.1]) bollards.push({ x: wx(x), y: 0.5, z: wz(f), sx: 0.16, sy: 1, sz: 0.16 });
  }
  scene.add(instanced(uprights, std("#2f62b5", 0.5, 0.35)));
  scene.add(instanced(beams, std("#e07a2c", 0.5, 0.3)));
  scene.add(instanced(pallets, std("#8b6a43", 0.9)));
  scene.add(instanced(loads, std("#ffffff", 0.78)));
  scene.add(instanced(bollards, std(YELLOW, 0.5), new CylinderGeometry(0.5, 0.5, 1, 12)));
}

// ---------------------------------------------------------------- 설비
function buildTank(scene: Scene) {
  const x = wx(37.5), z = wz(17.5), r = 4.2, h = 7.6;
  const steel = std("#b8bfc7", 0.32, 0.6);
  scene.add(mesh(new CylinderGeometry(r, r, h, 48), steel, x, h / 2, z));
  const dome = mesh(new SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), steel, x, h, z);
  dome.scale.y = 0.35;
  scene.add(dome);
  const band = std("#858d96", 0.45, 0.6);
  for (const y of [0.4, 2.6, 5.1]) {
    const t = mesh(new TorusGeometry(r + 0.03, 0.07, 8, 64), band, x, y, z);
    t.rotation.x = Math.PI / 2;
    scene.add(t);
  }
  // 받침대 · 점검 사다리 · 위 난간
  scene.add(mesh(new CylinderGeometry(r + 0.6, r + 0.6, 0.3, 48), std("#6b737d", 0.8), x, 0.15, z));
  const ladder = std(YELLOW, 0.5);
  for (const dz of [-0.25, 0.25]) scene.add(box(0.06, h + 1.2, 0.06, ladder, x + r + 0.25, (h + 1.2) / 2, z + dz));
  for (let y = 0.4; y < h + 1; y += 0.42) scene.add(box(0.05, 0.05, 0.5, ladder, x + r + 0.25, y, z, false));
  const rail = mesh(new TorusGeometry(r * 0.7, 0.05, 6, 48), ladder, x, h + 1.4, z);
  rail.rotation.x = Math.PI / 2;
  scene.add(rail);
  // 탱크에서 피트 쪽으로 나가는 배관
  const pipe = std("#9aa3ad", 0.4, 0.6);
  const p1 = mesh(new CylinderGeometry(0.22, 0.22, 20, 16), pipe, x + r + 10, 1.4, z + 1.5);
  p1.rotation.z = Math.PI / 2;
  scene.add(p1);
}

function buildPress(scene: Scene) {
  const g = new Group();
  g.position.set(wx(67.5), 0, wz(12.5));
  const dark = std("#4a5058", 0.6, 0.4);
  const plate = std("#6b7178", 0.5, 0.5);
  const yellow = std("#c99a1c", 0.55, 0.2);
  g.add(box(5.4, 1.1, 4.2, dark, 0, 0.55, 0));
  g.add(box(4.4, 0.3, 3.4, plate, 0, 1.25, 0));
  for (const cx of [-2.25, 2.25]) g.add(box(0.9, 5, 3.6, yellow, cx, 3.6, 0));
  g.add(box(5.8, 1.5, 4.2, yellow, 0, 6.75, 0));
  const ram = box(3.5, 1, 3, std("#7d848c", 0.35, 0.6), 0, 4.7, 0);
  g.add(ram);
  const wheel = mesh(new CylinderGeometry(1.2, 1.2, 0.35, 32), std("#3a3f45", 0.5, 0.5), 3.05, 6.75, 0);
  wheel.rotation.z = Math.PI / 2;
  g.add(wheel);
  // 광커튼 — 앞쪽 두 기둥 사이의 붉은 빛
  const curtain = std("#1e1e1e", 0.5, 0, { emissive: new Color("#e5322d"), emissiveIntensity: 0.6 });
  for (const cx of [-2, 2]) g.add(box(0.12, 2.8, 0.12, curtain, cx, 1.4, 2.4));
  // 조작반
  g.add(box(0.9, 1.3, 0.5, std("#3c4148", 0.6), -3.6, 0.65, 2.2));
  scene.add(g);
  return { ram, wheel };
}

function buildPit(scene: Scene) {
  const x = wx(PIT.x), z = wz(PIT.y);
  const d = PIT.depth;
  // 안쪽 벽은 뒷면만 칠한다 — 위에서 들여다보면 먼 벽과 바닥이 보인다
  const walls = new Mesh(new BoxGeometry(PIT.sx, d, PIT.sy), std("#5d636b", 0.95, 0, { side: BackSide }));
  walls.position.set(x, -d / 2, z);
  walls.receiveShadow = true;
  scene.add(walls);
  const pipes = [
    { off: -1.1, y: -1.2, r: 0.28, color: "#8a939e" },
    { off: 0, y: -2.0, r: 0.22, color: "#a64a3f" },
    { off: 1.1, y: -2.7, r: 0.34, color: "#c9ccd1" },
  ];
  for (const p of pipes) {
    const m = mesh(new CylinderGeometry(p.r, p.r, PIT.sx - 0.2, 20), std(p.color, 0.5, 0.45), x, p.y, z + p.off);
    m.rotation.z = Math.PI / 2;
    scene.add(m);
  }
  const yellow = std(YELLOW, 0.5);
  const lx = x - PIT.sx / 2 + 0.35;
  for (const dz of [-0.22, 0.22]) scene.add(box(0.05, d + 1.1, 0.05, yellow, lx, (1.1 - d) / 2, z + dz));
  for (let i = 0; i < 10; i++) scene.add(box(0.05, 0.04, 0.44, yellow, lx, -d + 0.3 + i * 0.42, z, false));
  // 개구부 안전 난간
  const rail: Inst[] = [];
  const x0 = PIT.x - PIT.sx / 2 - 0.4, x1 = PIT.x + PIT.sx / 2 + 0.4, y0 = PIT.y - PIT.sy / 2 - 0.4, y1 = PIT.y + PIT.sy / 2 + 0.4;
  for (let xx = x0; xx <= x1 + 0.01; xx += (x1 - x0) / 5) {
    rail.push({ x: wx(xx), y: 0.53, z: wz(y0), sx: 0.07, sy: 1.06, sz: 0.07 }, { x: wx(xx), y: 0.53, z: wz(y1), sx: 0.07, sy: 1.06, sz: 0.07 });
  }
  for (let yy = y0 + (y1 - y0) / 3; yy < y1 - 0.1; yy += (y1 - y0) / 3) {
    rail.push({ x: wx(x0), y: 0.53, z: wz(yy), sx: 0.07, sy: 1.06, sz: 0.07 }, { x: wx(x1), y: 0.53, z: wz(yy), sx: 0.07, sy: 1.06, sz: 0.07 });
  }
  for (const h of [1.05, 0.55]) {
    rail.push({ x: wx(PIT.x), y: h, z: wz(y0), sx: x1 - x0, sy: 0.05, sz: 0.05 }, { x: wx(PIT.x), y: h, z: wz(y1), sx: x1 - x0, sy: 0.05, sz: 0.05 });
    rail.push({ x: wx(x0), y: h, z: wz(PIT.y), sx: 0.05, sy: 0.05, sz: y1 - y0 }, { x: wx(x1), y: h, z: wz(PIT.y), sx: 0.05, sy: 0.05, sz: y1 - y0 });
  }
  scene.add(instanced(rail, yellow));
  // 피트 안 공기 — 산소결핍은 눈에 안 보인다. 안개는 「여기 공기가 위험하다」는 표시다(관제 화면과 같다)
  const haze = new MeshBasicMaterial({ color: "#7cc4cf", transparent: true, opacity: 0.08, depthWrite: false });
  const plane = new Mesh(new BoxGeometry(PIT.sx - 0.1, 0.02, PIT.sy - 0.1), haze);
  plane.position.set(x, -d * 0.4, z);
  scene.add(plane);
  return { haze };
}

/** 출하장 — 시야를 가리는 적재 팔레트와 모서리의 볼록거울. 사각지대가 왜 생기는지 그대로 보인다 */
function buildDock(scene: Scene) {
  const rand = random(20261105);
  const wood = std("#8b6a43", 0.9);
  for (const [x, y] of [[2.2, 52.5], [2.2, 54.2], [2.2, 55.9], [7.8, 53.4], [7.8, 57.2], [2.2, 58.4], [13.5, 41.2], [15.2, 41.2]] as const) {
    const h = 1.2 + rand() * 1.3;
    scene.add(box(1.25, 0.15, 1.05, wood, wx(x), 0.075, wz(y)));
    const wrapped = rand() < 0.5;
    scene.add(box(1.15, h, 0.98, std(wrapped ? "#cfd6dd" : "#b08f5f", wrapped ? 0.35 : 0.8), wx(x), 0.15 + h / 2, wz(y)));
  }
  // ㄱ자 사각지대의 안쪽 모서리(10, 50)에 볼록거울
  const pole = std(YELLOW, 0.5);
  const mx = wx(10.3), mz = wz(50.3);
  scene.add(mesh(new CylinderGeometry(0.05, 0.05, 3, 10), pole, mx, 1.5, mz));
  const mirror = mesh(new SphereGeometry(0.5, 24, 16), std("#e8eef5", 0.06, 0.95), mx + 0.1, 3.1, mz - 0.1);
  mirror.scale.set(1, 1, 0.45);
  mirror.rotation.y = -Math.PI / 4;
  scene.add(mirror);
  const rim = mesh(new TorusGeometry(0.5, 0.05, 8, 32), std("#e5322d", 0.5), mx + 0.1, 3.1, mz - 0.1);
  rim.rotation.y = -Math.PI / 4;
  scene.add(rim);
  return beacon(scene, mx, 3.75, mz, 4);
}

/** 경광등 — 주황 불이 돈다. 색은 관제 화면과 같다 */
const beaconMaterial = () => new MeshStandardMaterial({ color: "#ffb21a", emissive: new Color("#ffb21a"), emissiveIntensity: 1, transparent: true, opacity: 0.9 });
function beacon(parent: Object3D, x: number, y: number, z: number, speed: number) {
  parent.add(mesh(new CylinderGeometry(0.2, 0.22, 0.16, 16), std("#222222", 0.6), x, y + 0.08, z, false, false));
  const m = beaconMaterial();
  parent.add(mesh(new CylinderGeometry(0.16, 0.18, 0.34, 16), m, x, y + 0.32, z, false, false));
  return { material: m, speed };
}

/** 구역 울타리 — 통제 · 위험구역 둘레의 노란 기둥과 난간 */
function buildFences(scene: Scene) {
  const yellow = std(YELLOW, 0.5);
  const items: Inst[] = [];
  for (const zone of ZONES) {
    if (zone.kind !== "RESTRICTED" && zone.kind !== "HAZARD") continue;
    const v = zone.vertices;
    for (let i = 0; i < v.length; i++) {
      const [x1, y1] = v[i]!;
      const [x2, y2] = v[(i + 1) % v.length]!;
      const len = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(1, Math.round(len / 2.5));
      for (let k = 0; k < n; k++) items.push({ x: wx(x1 + ((x2 - x1) * k) / n), y: 0.55, z: wz(y1 + ((y2 - y1) * k) / n), sx: 0.08, sy: 1.1, sz: 0.08 });
      for (const h of [1.08, 0.6]) {
        const alongX = Math.abs(x2 - x1) > Math.abs(y2 - y1);
        items.push({ x: wx((x1 + x2) / 2), y: h, z: wz((y1 + y2) / 2), sx: alongX ? len : 0.05, sy: 0.05, sz: alongX ? 0.05 : len });
      }
    }
  }
  scene.add(instanced(items, yellow));
}

/** 구역 바닥 — 관제 화면처럼 옅게 칠한 면과 둘레선 */
function buildZoneOverlays(scene: Scene) {
  return ZONES.map((zone: Zone) => {
    const shape = new Shape(zone.vertices.map(([x, y]) => new Vector2(wx(x), -wz(y))));
    const fill = new MeshBasicMaterial({ color: ZONE_COLOR[zone.kind], transparent: true, opacity: zone.kind === "BLIND_SPOT" ? 0.16 : 0.1, depthWrite: false });
    const m = new Mesh(new ShapeGeometry(shape), fill);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.025;
    m.renderOrder = 1;
    scene.add(m);
    const pts = zone.vertices.flatMap(([x, y]) => [wx(x), 0.04, wz(y)]);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(pts), 3));
    const line = new LineBasicMaterial({ color: ZONE_COLOR[zone.kind], transparent: true, opacity: 0.9, depthWrite: false });
    scene.add(new LineLoop(g, line));
    return { zone, fill, line };
  });
}

export function buildFactory(scene: Scene) {
  buildFloor(scene);
  buildShell(scene);
  const lights = buildLamps(scene);
  buildRacks(scene);
  buildTank(scene);
  const press = buildPress(scene);
  const pit = buildPit(scene);
  const mirrorBeacon = buildDock(scene);
  buildFences(scene);
  const zones = buildZoneOverlays(scene);
  return { lamps: lights.lamps, lampHeight: lights.height, press, pit, zones, beacons: [mirrorBeacon] };
}

// ---------------------------------------------------------------- 사람
export type Worker = { root: Group; body: Group; legs: Group[]; arms: Group[]; mark: MeshBasicMaterial; ring: MeshBasicMaterial };

const markGeometry = new CircleGeometry(1.15, 32);
const markRingGeometry = new RingGeometry(0.95, 1.2, 40);

/** 작업자. 안전모 · 형광 조끼 — 현장에서 보는 그 모습이어야 화면이 현장으로 읽힌다 (관제 화면 WorkerFigure) */
export function makeWorker(hat: string): Worker {
  const root = new Group();
  const body = new Group();
  body.scale.setScalar(PERSON_SCALE);
  root.add(body);
  const pants = std("#2e3642", 0.8);
  const vest = std("#f37a1f", 0.6);
  const band = std("#e9eef2", 0.3, 0, { emissive: new Color("#e9eef2"), emissiveIntensity: 0.35 });
  const legs: Group[] = [];
  for (const x of [-0.11, 0.11]) {
    const hip = new Group();
    hip.position.set(x, 0.88, 0);
    hip.add(box(0.17, 0.86, 0.2, pants, 0, -0.43, 0));
    body.add(hip);
    legs.push(hip);
  }
  body.add(box(0.46, 0.62, 0.27, vest, 0, 1.2, 0));
  body.add(box(0.47, 0.06, 0.28, band, 0, 1.08, 0, false));
  const arms: Group[] = [];
  for (const x of [-0.3, 0.3]) {
    const shoulder = new Group();
    shoulder.position.set(x, 1.48, 0);
    shoulder.add(box(0.12, 0.58, 0.14, vest, 0, -0.28, 0));
    body.add(shoulder);
    arms.push(shoulder);
  }
  body.add(mesh(new SphereGeometry(0.13, 16, 12), std("#d6b08a", 0.7), 0, 1.66, 0));
  body.add(mesh(new SphereGeometry(0.155, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(hat, 0.45), 0, 1.71, 0));
  // 발밑 표식 — 관제 화면과 같은 파랑 원. 멀리서 몸은 안 보여도 이 원은 보인다
  const mark = new MeshBasicMaterial({ color: WORKER_MARK, transparent: true, opacity: 0.28, depthWrite: false });
  const disc = new Mesh(markGeometry, mark);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.04;
  disc.renderOrder = 3;
  root.add(disc);
  const ring = new MeshBasicMaterial({ color: WORKER_MARK, transparent: true, opacity: 0.95, depthWrite: false });
  const r = new Mesh(markRingGeometry, ring);
  r.rotation.x = -Math.PI / 2;
  r.position.y = 0.045;
  r.renderOrder = 3;
  root.add(r);
  return { root, body, legs, arms, mark, ring };
}

// ---------------------------------------------------------------- 지게차
export type Forklift = { root: Group; yaw: Group; wheels: Mesh[]; spot: MeshBasicMaterial; beacon: { material: MeshStandardMaterial; speed: number } };

/** 지게차 (관제 화면 Forklift). 앞 바닥에는 접근 경고용 블루 스팟을 비춘다 */
export function makeForklift(scale: number): Forklift {
  const root = new Group();
  const yaw = new Group();
  root.add(yaw);
  const g = new Group();
  g.scale.setScalar(scale);
  yaw.add(g);
  const yellow = std("#e3a812", 0.5, 0.2);
  const frame = std("#2b2f35", 0.6, 0.3);
  g.add(box(1.15, 0.62, 2, yellow, 0, 0.62, 0));
  g.add(box(1.15, 0.75, 0.45, std("#3c4148", 0.6), 0, 0.8, -0.95));
  for (const [x, z] of [[-0.5, -0.55], [0.5, -0.55], [-0.5, 0.45], [0.5, 0.45]] as const) g.add(box(0.06, 1.3, 0.06, frame, x, 1.55, z));
  g.add(box(1.12, 0.06, 1.15, frame, 0, 2.2, -0.05));
  g.add(box(0.5, 0.5, 0.5, std("#1f242b", 0.7), 0, 1.15, -0.2)); // 운전석
  for (const x of [-0.36, 0.36]) g.add(box(0.1, 2.5, 0.12, std("#4a5058", 0.45, 0.5), x, 1.3, 1.08));
  g.add(box(0.84, 0.5, 0.06, std("#4a5058", 0.45, 0.5), 0, 0.5, 1.15)); // 포크 받침
  for (const x of [-0.28, 0.28]) g.add(box(0.12, 0.05, 1.15, std("#30353b", 0.4, 0.6), x, 0.18, 1.7));
  const wheels: Mesh[] = [];
  const tire = std("#151515", 0.9);
  for (const [x, z] of [[-0.62, 0.62], [0.62, 0.62], [-0.62, -0.6], [0.62, -0.6]] as const) {
    const w = mesh(new CylinderGeometry(0.28, 0.28, 0.22, 16), tire, x, 0.28, z);
    w.rotation.z = Math.PI / 2;
    g.add(w);
    wheels.push(w);
  }
  const b = beacon(g, 0.35, 2.23, -0.4, 6);
  const spot = new MeshBasicMaterial({ color: "#3a8bff", transparent: true, opacity: 0.5, depthWrite: false });
  const s = new Mesh(new CircleGeometry(0.45, 24), spot);
  s.rotation.x = -Math.PI / 2;
  s.position.set(0, 0.05, 3.4 * (scale / 1.5));
  s.renderOrder = 3;
  yaw.add(s);
  return { root, yaw, wheels, spot, beacon: b };
}
