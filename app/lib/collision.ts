/**
 * 충돌위험 판정 — 서버 risk 컨텍스트의 이식.
 *
 * 소개 페이지가 서버와 다른 판정을 말하면 안 된다. 아래 원본의 값과 순서를 그대로 옮겼고,
 * 원본이 바뀌면 여기도 바꾼다. 판정기(CollisionPlayground)와 배경 3D 가 둘 다 이 파일을 쓴다.
 *
 *   risk/domain/CollisionRiskPolicy.java                 defaults() · classify()
 *   risk/domain/CollisionAssessment.java                 between() · MIN_CLOSING_SPEED_MPS
 *   risk/application/service/CollisionRiskService.java   assessPair() — 필터 순서
 *   registry/domain/Vehicle.java · VehicleKind.java      hazardRadiusAt() · hazardousWhenStationary()
 *   alarm/domain/AlarmLevel.java                         확인 창 · 관리자 전파
 *   alarm/domain/RapidWarning.java                       1단계 단문
 *   alarm/domain/WarningTemplates.java                   collisionText() · evidence() (한국어)
 *   alarm/domain/ControlPolicy.java                      강제 정지 · 속도 제한
 */
import type { Vehicle } from "./site";

export type Level = "NONE" | "CAUTION" | "WARNING" | "DANGER" | "EMERGENCY";
export type AlarmLevel = Exclude<Level, "NONE">;

/** CollisionRiskPolicy.defaults() — 위험 요인 판별기준 1 */
export const POLICY = {
  dangerDistanceM: 3.0,
  dangerTtcSec: 2.0,
  emergencyDistanceM: 1.5,
  warningDistanceM: 5.0,
  evaluationRadiusM: 20.0,
  minVehicleSpeedMps: 0.3,
  trackStaleAfterSec: 10,
} as const;

/** 이보다 느린 접근은 측위 잡음과 구분되지 않는다 */
export const MIN_CLOSING_SPEED_MPS = 0.15;

const ORDER: Level[] = ["NONE", "CAUTION", "WARNING", "DANGER", "EMERGENCY"];

export const LEVEL_LABEL: Record<AlarmLevel, string> = {
  CAUTION: "주의",
  WARNING: "경고",
  DANGER: "위험",
  EMERGENCY: "긴급",
};

/** AlarmLevel — 이 창 안에 확인이 없으면 상향(ESCALATED) */
export const ACK_WINDOW_SEC: Record<AlarmLevel, number> = {
  CAUTION: 120,
  WARNING: 60,
  DANGER: 20,
  EMERGENCY: 10,
};

/** ControlPolicy.SPEED_LIMIT_MPS — 약 4km/h, 사람 걸음 속도 */
export const SPEED_LIMIT_MPS = 1.1;

export function hazardousWhenStationary(v: Vehicle) {
  return v.kind === "EXCAVATOR" || v.kind === "CRANE";
}

/** Vehicle.hazardRadiusAt — 정지거리에 속도 비례분을 더한다. 선회형 장비는 선회 반경과 큰 쪽 */
export function hazardRadiusAt(v: Vehicle, speedMps: number) {
  const speed = Math.max(0, Math.min(speedMps, v.maxSpeedMps));
  const driving = v.stoppingDistanceM * (speed / v.maxSpeedMps) + v.stoppingDistanceM * 0.5;
  return hazardousWhenStationary(v) ? Math.max(driving, v.slewRadiusM ?? 0) : driving;
}

export type Kinematics = { x: number; y: number; vx: number; vy: number };

export type Assessment = {
  distanceM: number;
  /** 두 대상을 잇는 선 방향의 상대속도. 음수면 멀어진다 */
  closingSpeedMps: number;
  /** 접근 중일 때만 값이 있다. 값이 없는 것과 값이 큰 것은 다르다 */
  ttcSec: number | null;
  hazardRadiusM: number;
};

/** CollisionAssessment.between — 상대속도를 두 대상을 잇는 선에 사영해 접근 성분만 본다 */
export function between(worker: Kinematics, vehicle: Kinematics, hazardRadiusM: number): Assessment {
  const rx = vehicle.x - worker.x;
  const ry = vehicle.y - worker.y;
  const distance = Math.hypot(rx, ry);
  if (distance <= 0) return { distanceM: 0, closingSpeedMps: 0, ttcSec: 0, hazardRadiusM };

  const rvx = vehicle.vx - worker.vx;
  const rvy = vehicle.vy - worker.vy;
  const closing = -((rx * rvx + ry * rvy) / distance);
  const ttc = closing > MIN_CLOSING_SPEED_MPS ? distance / closing : null;
  return { distanceM: distance, closingSpeedMps: closing, ttcSec: ttc, hazardRadiusM };
}

const raise = (level: Level): Level => ORDER[Math.min(ORDER.indexOf(level) + 1, ORDER.length - 1)]!;

/** CollisionRiskPolicy.classify */
export function classify(a: Assessment | null): Level {
  if (!a) return "NONE";
  const d = a.distanceM;
  const inside = d <= a.hazardRadiusM;

  if (d <= POLICY.emergencyDistanceM) return "EMERGENCY";
  // 멀어지는 중이라면 위험 반경 안에 있을 때만 주의로 남긴다
  if (a.ttcSec === null) return inside ? "CAUTION" : "NONE";

  const ttc = a.ttcSec;
  let level: Level;
  if (d <= POLICY.dangerDistanceM && ttc <= POLICY.dangerTtcSec) level = "DANGER";
  else if (d <= POLICY.warningDistanceM) level = "WARNING";
  else if (d <= POLICY.evaluationRadiusM && ttc <= POLICY.dangerTtcSec * 2) level = "CAUTION";
  else level = "NONE";

  // 차량 제원에서 나온 위험 반경 안쪽은 한 단계 끌어올린다
  if (level !== "NONE" && inside) level = raise(level);
  return level;
}

// ---------------------------------------------------------------- 판정기

export type PairInput = {
  vehicle: Vehicle;
  distanceM: number;
  vehicleSpeedMps: number;
  /** 작업자는 서 있고 차량이 작업자 쪽으로 오는가, 반대로 가는가 */
  approaching: boolean;
  sameFloor: boolean;
  /** 마지막 위치 보고가 몇 초 전인가 */
  trackAgeSec: number;
  /** 그 작업자가 바로 그 차를 모는 운전자인가 */
  isOperator: boolean;
};

export type CheckState = "pass" | "fail" | "skip";

export type Check = {
  key: string;
  label: string;
  state: CheckState;
  detail: string;
  /** 걸러질 때 서버가 남기는 계측 사유 — aegis.risk.suppressed */
  metric?: string;
};

export type PairVerdict = {
  checks: Check[];
  assessment: Assessment | null;
  level: Level;
};

/**
 * CollisionRiskService.assessPair 의 순서 그대로: 층 → 궤적 나이 → 운전자 본인 → 정지 차량
 * → (선회형 장비의) 붐 방향 → 판정 반경 → 등급. 앞에서 걸러지면 뒤는 판정하지 않는다.
 *
 * 붐 방향은 엣지 장비 상태가 있어야 거른다. 이 판정기에는 그 상태가 없으므로 서버와 같이
 * 「모르면 거르지 않는다」로 둔다.
 */
export function judgePair(input: PairInput): PairVerdict {
  const v = input.vehicle;
  const stationaryHazard = hazardousWhenStationary(v);
  const moving = input.vehicleSpeedMps >= POLICY.minVehicleSpeedMps;
  const rows: Array<Omit<Check, "state"> & { ok: boolean }> = [
    {
      key: "floor",
      label: "같은 층",
      ok: input.sameFloor,
      detail: input.sameFloor ? "두 대상이 같은 층에 있어요." : "다른 층의 차량은 판정하지 않아요. 바로 위층 지게차에 울리는 경보는 소음이에요.",
      metric: "DIFFERENT_FLOOR",
    },
    {
      key: "stale",
      label: `위치가 ${POLICY.trackStaleAfterSec}초 안에 갱신됨`,
      ok: input.trackAgeSec < POLICY.trackStaleAfterSec,
      detail:
        input.trackAgeSec < POLICY.trackStaleAfterSec
          ? "두 궤적 모두 새로워요."
          : `${input.trackAgeSec}초 전 위치예요. 이미 자리를 뜬 대상에게 보내는 경보가 유령 경보예요.`,
      metric: "STALE_TRACK",
    },
    {
      key: "operator",
      label: "그 차를 모는 사람이 아님",
      ok: !input.isOperator,
      detail: input.isOperator
        ? "운전자는 자기 장비와 늘 0m 거리에 있어요. 걸러 내지 않으면 운전석에서 긴급을 계속 받아요."
        : "운행 세션의 운전자가 아니에요.",
      metric: "VEHICLE_OPERATOR",
    },
    {
      key: "stopped",
      label: stationaryHazard ? "정지해도 판정하는 장비" : `차량이 움직임 (${POLICY.minVehicleSpeedMps} m/s 이상)`,
      ok: moving || stationaryHazard,
      detail: stationaryHazard
        ? "굴착기 · 크레인은 정지 차량 필터를 받지 않아요. 협착 사고의 상당수는 제자리에서 도는 장비에서 나요."
        : moving
          ? "주행 중이에요."
          : "정지한 지게차는 위험원으로 보지 않아요. 창고에서 하루 수백 번 울리는 경보가 대부분 여기서 사라져요.",
      metric: "VEHICLE_STOPPED",
    },
  ];
  if (stationaryHazard) {
    rows.push({
      key: "boom",
      label: "붐이 향하는 쪽",
      ok: true,
      detail: moving ? "주행 중이면 붐 방향으로 거르지 않아요." : "엣지 장비가 붐 각도를 보내지 않았어요. 모르면 거르지 않아요.",
      metric: "OUTSIDE_BOOM_ARC",
    });
  }

  const checks: Check[] = [];
  let blocked = false;
  for (const r of rows) {
    if (blocked) {
      checks.push({ key: r.key, label: r.label, state: "skip", detail: "앞에서 걸러져 판정하지 않아요." });
      continue;
    }
    checks.push({ key: r.key, label: r.label, state: r.ok ? "pass" : "fail", detail: r.detail, metric: r.metric });
    if (!r.ok) blocked = true;
  }

  const inRadius = input.distanceM <= POLICY.evaluationRadiusM;
  if (blocked) {
    checks.push({ key: "radius", label: `판정 반경 ${POLICY.evaluationRadiusM} m 안`, state: "skip", detail: "앞에서 걸러져 판정하지 않아요." });
    return { checks, assessment: null, level: "NONE" };
  }
  checks.push({
    key: "radius",
    label: `판정 반경 ${POLICY.evaluationRadiusM} m 안`,
    state: inRadius ? "pass" : "fail",
    detail: inRadius ? "계산해요." : "이보다 멀면 계산하지 않아요.",
  });
  if (!inRadius) return { checks, assessment: null, level: "NONE" };

  // 작업자는 원점에 서 있고, 차량은 +x 쪽에서 작업자를 향해(또는 반대로) 달린다
  const vx = input.approaching ? -input.vehicleSpeedMps : input.vehicleSpeedMps;
  const assessment = between({ x: 0, y: 0, vx: 0, vy: 0 }, { x: input.distanceM, y: 0, vx, vy: 0 }, hazardRadiusAt(v, input.vehicleSpeedMps));
  return { checks, assessment, level: classify(assessment) };
}

// ---------------------------------------------------------------- 경보 문구

/** String.format("%.2f") — 반올림을 십진 표기 기준(HALF_UP)으로 맞춘다 */
export function fmt2(value: number) {
  const r = Math.round(Number(`${Math.abs(value)}e2`)) / 100;
  return `${value < 0 && r !== 0 ? "-" : ""}${r.toFixed(2)}`;
}

/** RapidWarning.of(level, "COLLISION") — 번역하지 않는 손목 한 줄 */
export function rapidText(level: AlarmLevel) {
  return `${LEVEL_LABEL[level]}! 즉시 정지`;
}

/** WarningTemplates.collisionText(ko) — 위험 · 근거 · 행동 세 조각 */
export function collisionTextKo(level: AlarmLevel, a: Assessment) {
  const parts = [`${fmt2(a.distanceM)}m`];
  if (a.ttcSec !== null) parts.push(`${fmt2(a.ttcSec)}초`);
  const evidence = ` ${parts.join(", ")}.`;
  switch (level) {
    case "EMERGENCY":
      return `긴급: 차량이 바로 옆입니다.${evidence} 즉시 멈추고 옆으로 피하십시오.`;
    case "DANGER":
      return `위험: 차량이 접근 중입니다.${evidence} 즉시 진행 경로에서 벗어나십시오.`;
    case "WARNING":
      return `경고: 근처에 차량이 있습니다.${evidence} 주변을 확인하고 멈추십시오.`;
    case "CAUTION":
      return `주의: 구역에 차량이 있습니다.${evidence} 차량 통로를 피해 이동하십시오.`;
  }
}

/** ControlPolicy.decide(level, "COLLISION", true) */
export function controlFor(level: AlarmLevel): string | null {
  if (level === "EMERGENCY") return "강제 정지";
  if (level === "DANGER") return `속도 제한 ${SPEED_LIMIT_MPS} m/s`;
  return null;
}
