/**
 * 배경 3D 가 따라가는 한 장면 — 출하장 진입로 사각지대에서 지게차 1호가 작업자 W-1002 에게 다가간다.
 *
 * 장면은 판정을 흉내 내지 않는다. 0.05초마다 두 대상을 움직이고, 그때마다 collision.ts(서버 이식)로
 * 등급을 매기고, 그 등급이 서버의 ControlPolicy 대로 지게차를 늦추거나 세운다. 배경의 색이 바뀌는
 * 순간과 지게차가 서는 자리는 이 계산의 결과다 — 손으로 정한 값이 아니다.
 *
 * 스크롤이 이 이야기의 시각을 정하므로, 시뮬레이션은 한 번만 돌려 표본으로 들고 있는다.
 */
import { between, classify, hazardRadiusAt, POLICY, type Level } from "./collision";
import { VEHICLES } from "./site";

export type StorySample = {
  /** 작업자 위치(서버 좌표, m) */
  wx: number;
  wy: number;
  /** 지게차 위치와 속도 */
  fx: number;
  fy: number;
  fSpeed: number;
  hazardRadiusM: number;
  distanceM: number;
  ttcSec: number | null;
  /** 지금 이 순간의 판정. 지게차가 서면 정지 차량 필터에 걸려 NONE 이 된다 */
  live: Level;
  /** 열린 경보의 등급 — 한 번 오른 등급은 확인 전까지 내려가지 않는다 */
  alarm: Level;
};

export const STORY_SECONDS = 15;
const DT = 0.05;

const ORDER: Level[] = ["NONE", "CAUTION", "WARNING", "DANGER", "EMERGENCY"];
const rank = (l: Level) => ORDER.indexOf(l);

/** 랙 끝을 돌아 차량 통로로 나오는 길. 랙이 가려 지게차에서도, 작업자에게서도 서로 안 보인다 */
const WALK: [number, number][] = [
  [27.0, 55.8],
  [21.5, 55.8],
  [17.3, 47.6],
  [17.1, 47.1],
];
const WALK_SPEED = 1.2;
/** 손목이 울리고 사람이 멈추기까지 */
const REACTION_SEC = 0.6;

/** 통로 중심선. 작업자가 멈춰 선 자리에서 1.4 m — 지게차가 옆을 지나면 긴급 거리(1.5 m) 안이다 */
export const LANE_Y = 46.1;
const FORKLIFT_START_X = 44.0;
const FORKLIFT_SPEED = 2.0;
/** 지게차 제동 감속도(m/s²) */
const BRAKE = 3.0;

function along(path: [number, number][], dist: number): { x: number; y: number; dx: number; dy: number; done: boolean } {
  let left = dist;
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i]!;
    const [x2, y2] = path[i + 1]!;
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (left <= len) {
      const t = len ? left / len : 0;
      return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, dx: (x2 - x1) / len, dy: (y2 - y1) / len, done: false };
    }
    left -= len;
  }
  const [x, y] = path[path.length - 1]!;
  return { x, y, dx: 0, dy: 0, done: true };
}

function simulate(): StorySample[] {
  const forklift = VEHICLES[0]!; // V-0001 지게차 1호
  const out: StorySample[] = [];
  let walked = 0;
  let stopAt: number | null = null;
  let fx = FORKLIFT_START_X;
  let fSpeed = FORKLIFT_SPEED;
  let alarm: Level = "NONE";

  for (let t = 0; t <= STORY_SECONDS + 1e-9; t += DT) {
    const walking = stopAt === null || t < stopAt;
    const here = along(WALK, walked);
    const wvx = walking && !here.done ? here.dx * WALK_SPEED : 0;
    const wvy = walking && !here.done ? here.dy * WALK_SPEED : 0;

    // 판정 — 서버와 같은 필터 순서에서 이 장면에 해당하는 것은 정지 차량과 판정 반경뿐이다
    const hazard = hazardRadiusAt(forklift, fSpeed);
    const a = between({ x: here.x, y: here.y, vx: wvx, vy: wvy }, { x: fx, y: LANE_Y, vx: -fSpeed, vy: 0 }, hazard);
    let live: Level = "NONE";
    if (fSpeed >= POLICY.minVehicleSpeedMps && a.distanceM <= POLICY.evaluationRadiusM) live = classify(a);
    if (rank(live) > rank(alarm)) alarm = live;
    if (stopAt === null && rank(alarm) >= rank("DANGER")) stopAt = t + REACTION_SEC;

    out.push({ wx: here.x, wy: here.y, fx, fy: LANE_Y, fSpeed, hazardRadiusM: hazard, distanceM: a.distanceM, ttcSec: a.ttcSec, live, alarm });

    // 제어 — 긴급이면 강제 정지, 위험이면 1.1 m/s 로 제한 (ControlPolicy)
    const limit = alarm === "EMERGENCY" ? 0 : alarm === "DANGER" ? 1.1 : FORKLIFT_SPEED;
    fSpeed = fSpeed > limit ? Math.max(limit, fSpeed - BRAKE * DT) : fSpeed;
    fx -= fSpeed * DT;
    if (walking) walked += WALK_SPEED * DT;
  }
  return out;
}

export const STORY: StorySample[] = simulate();

/** 이야기의 시각(초) → 표본. 두 표본 사이는 선형 보간한다 */
export function storyAt(seconds: number): StorySample {
  const f = Math.min(Math.max(seconds / DT, 0), STORY.length - 1);
  const i = Math.floor(f);
  const a = STORY[i]!;
  const b = STORY[Math.min(i + 1, STORY.length - 1)]!;
  const k = f - i;
  const mix = (p: number, q: number) => p + (q - p) * k;
  return {
    wx: mix(a.wx, b.wx),
    wy: mix(a.wy, b.wy),
    fx: mix(a.fx, b.fx),
    fy: a.fy,
    fSpeed: mix(a.fSpeed, b.fSpeed),
    hazardRadiusM: mix(a.hazardRadiusM, b.hazardRadiusM),
    distanceM: mix(a.distanceM, b.distanceM),
    ttcSec: k < 0.5 ? a.ttcSec : b.ttcSec,
    live: k < 0.5 ? a.live : b.live,
    alarm: k < 0.5 ? a.alarm : b.alarm,
  };
}

export type StoryEvent = {
  seconds: number;
  sample: StorySample;
  kind: "raised" | "upgraded" | "halted" | "stopped";
};

/**
 * 열린 경보가 겪은 일. 처음 판정은 새 경보(RAISED), 같은 원인에서 등급이 오르면 서버는 기존 경보를
 * 끌어올려 넓어진 수신자에게 다시 보낸다(AlarmService.groupWith). 같은 등급의 반복 판정은 억제된다.
 */
export function storyTimeline(): StoryEvent[] {
  const events: StoryEvent[] = [];
  let walking = true;
  let moving = true;
  STORY.forEach((s, i) => {
    const prev = STORY[i - 1];
    const seconds = i * DT;
    if (prev && rank(s.alarm) > rank(prev.alarm)) events.push({ seconds, sample: s, kind: prev.alarm === "NONE" ? "raised" : "upgraded" });
    if (walking && prev && s.wx === prev.wx && s.wy === prev.wy) {
      walking = false;
      events.push({ seconds: seconds - DT, sample: prev, kind: "halted" });
    }
    if (moving && s.fSpeed === 0) {
      moving = false;
      events.push({ seconds, sample: s, kind: "stopped" });
    }
  });
  return events;
}
