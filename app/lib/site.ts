/**
 * 시드 현장 하나 — 배경 3D 와 판정기가 같이 쓰는 현장 대장.
 *
 * 원본은 Aegis 서버의 platform/config/DevDataSeeder.java 다. 구역 꼭짓점 · 차량 제원 · 작업자는
 * 그 파일의 값을 그대로 옮겼다. 서버가 시드를 바꾸면 여기도 바꾼다.
 *
 * 현장 이름과 코드만 공개용 가상 이름이다 — 공개 사이트라 실제 현장 이름을 싣지 않는다(DESIGN.md 9장).
 *
 * 좌표는 서버와 같은 미터다. 서버의 (x, y) 평면을 3D 의 바닥(x, z)에 눕힌다 — 대시보드
 * 3D 현장 보기(src/lib/site3d.ts)와 같은 규칙이다.
 */

export type ZoneKind = "RESTRICTED" | "HAZARD" | "CONFINED" | "BLIND_SPOT" | "SAFE";

export type Zone = {
  id: string;
  name: string;
  kind: ZoneKind;
  vertices: [number, number][];
  approachMarginM: number;
};

export const SITE = { code: "DEMO-01", name: "시범 공장" } as const;

export const ZONES: Zone[] = [
  {
    id: "Z-TANK-01",
    name: "1호 탱크 점검구역",
    kind: "RESTRICTED",
    vertices: [
      [30, 10],
      [45, 10],
      [45, 25],
      [30, 25],
    ],
    approachMarginM: 2.0,
  },
  {
    id: "Z-PRESS-01",
    name: "프레스 작동 반경",
    kind: "HAZARD",
    vertices: [
      [60, 5],
      [75, 5],
      [75, 20],
      [60, 20],
    ],
    approachMarginM: 3.0,
  },
  {
    id: "Z-CONFINED-01",
    name: "지하 배관 피트",
    kind: "CONFINED",
    vertices: [
      [80, 30],
      [95, 30],
      [95, 42],
      [80, 42],
    ],
    approachMarginM: 2.0,
  },
  {
    // 지게차 통로 모서리. 오목한 모양이라 서버는 광선 교차로 판정한다
    id: "Z-BLIND-01",
    name: "출하장 진입로 사각지대",
    kind: "BLIND_SPOT",
    vertices: [
      [0, 40],
      [20, 40],
      [20, 50],
      [10, 50],
      [10, 60],
      [0, 60],
    ],
    approachMarginM: 2.5,
  },
];

export type VehicleKind = "FORKLIFT" | "EXCAVATOR" | "CRANE";

export type Vehicle = {
  id: string;
  name: string;
  kind: VehicleKind;
  maxSpeedMps: number;
  stoppingDistanceM: number;
  /** 선회형 장비만 값이 있다 */
  slewRadiusM: number | null;
};

export const VEHICLES: Vehicle[] = [
  { id: "V-0001", name: "지게차 1호", kind: "FORKLIFT", maxSpeedMps: 2.8, stoppingDistanceM: 3.0, slewRadiusM: null },
  { id: "V-0002", name: "지게차 2호(대형)", kind: "FORKLIFT", maxSpeedMps: 3.3, stoppingDistanceM: 4.5, slewRadiusM: null },
  { id: "V-1001", name: "굴착기 1호", kind: "EXCAVATOR", maxSpeedMps: 5.5, stoppingDistanceM: 4.0, slewRadiusM: 7.5 },
  { id: "V-1002", name: "이동식 크레인", kind: "CRANE", maxSpeedMps: 4.0, stoppingDistanceM: 5.0, slewRadiusM: 18.0 },
];

/** 이 페이지가 따라가는 사람들. 언어는 순서가 의미를 갖는다 — 첫 값이 경고문의 주 언어다 */
export const PEOPLE = {
  self: { id: "W-1002", name: "Nguyen Van An", role: "물류", languages: ["vi", "ko"] },
  supervisor: { id: "W-1003", name: "박정민", role: "안전관리", languages: ["ko", "en"] },
  confined: { id: "W-3001", name: "정우성", role: "배관보전", languages: ["ko"] },
} as const;
