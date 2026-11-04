<script setup lang="ts">
/**
 * 충돌 판정기.
 *
 * 이 페이지에서 유일하게 진짜 상태가 있는 자리다. 입력을 바꾸면 서버와 같은 순서로 필터 → 등급을 판정하고,
 * 서버가 근거(evidence)로 남길 값과 작업자 손목에 나갈 문장을 그대로 보여 준다.
 * 판정 자체는 app/lib/collision.ts 에 있다 — 여기는 그리기만 한다.
 */
import {
  ACK_WINDOW_SEC,
  LEVEL_LABEL,
  POLICY,
  collisionTextKo,
  controlFor,
  fmt2,
  judgePair,
  rapidText,
  type AlarmLevel,
  type PairInput,
} from "~/lib/collision";
import { VEHICLES } from "~/lib/site";
import { storyTimeline } from "~/lib/story";

type State = Omit<PairInput, "vehicle"> & { vehicleId: string };

// 배경 장면에서 처음 위험이 된 순간 — 같은 값이면 같은 판정이 나와야 한다
const dangerMoment = storyTimeline().find((e) => e.sample.alarm === "DANGER")!.sample;

const PRESETS: Array<{ label: string; state: State }> = [
  {
    label: "배경 장면의 위험 순간",
    state: {
      vehicleId: "V-0001",
      distanceM: Number(dangerMoment.distanceM.toFixed(1)),
      vehicleSpeedMps: 2.0,
      approaching: true,
      sameFloor: true,
      trackAgeSec: 0,
      isOperator: false,
    },
  },
  {
    label: "정지한 지게차 옆",
    state: { vehicleId: "V-0001", distanceM: 1.8, vehicleSpeedMps: 0, approaching: true, sameFloor: true, trackAgeSec: 0, isOperator: false },
  },
  {
    label: "멈춰 있는 굴착기 옆",
    state: { vehicleId: "V-1001", distanceM: 5.0, vehicleSpeedMps: 0, approaching: true, sameFloor: true, trackAgeSec: 0, isOperator: false },
  },
];

const state = reactive<State>({ ...PRESETS[0]!.state });
const vehicle = computed(() => VEHICLES.find((v) => v.id === state.vehicleId)!);
const verdict = computed(() => judgePair({ ...state, vehicle: vehicle.value }));

watch(
  () => state.vehicleId,
  () => {
    if (state.vehicleSpeedMps > vehicle.value.maxSpeedMps) state.vehicleSpeedMps = vehicle.value.maxSpeedMps;
  },
);

function load(preset: State) {
  Object.assign(state, preset);
}

const alarm = computed<AlarmLevel | null>(() => (verdict.value.level === "NONE" ? null : verdict.value.level));

/** 경보가 없을 때 그 이유 — 서버가 남기는 계측 사유와 같은 이름 */
const quietReason = computed(() => {
  const v = verdict.value;
  const failed = v.checks.find((c) => c.state === "fail");
  if (failed?.metric) return { code: failed.metric, text: "앞의 필터에서 걸러졌어요. 계산하지 않았어요." };
  if (failed) return { code: null, text: "판정 반경 밖이라 계산하지 않았어요." };
  if (v.assessment && v.assessment.ttcSec === null) return { code: "RECEDING", text: "다가오지 않고, 위험 반경 밖이에요." };
  return { code: null, text: "어느 기준에도 들지 않아요." };
});

const MARK: Record<AlarmLevel, string> = { EMERGENCY: "#i-lv-octagon", DANGER: "#i-lv-diamond", WARNING: "#i-lv-triangle", CAUTION: "#i-lv-circle" };
const ICON = { pass: "#i-pass", fail: "#i-fail", skip: "#i-skip" } as const;
const STATE_TEXT = { pass: "통과", fail: "걸러짐", skip: "판정 안 함" } as const;
</script>

<template>
  <div class="play">
    <div class="play__controls">
      <div class="ctl">
        <div class="ctl__top"><span class="ctl__name">차량</span></div>
        <div class="seg seg--4" role="group" aria-label="차량">
          <button v-for="v in VEHICLES" :key="v.id" type="button" :aria-pressed="state.vehicleId === v.id" @click="state.vehicleId = v.id">
            {{ v.name.replace("(대형)", "") }}
          </button>
        </div>
        <p class="ctl__note">
          최고 {{ vehicle.maxSpeedMps }} m/s · 정지거리 {{ vehicle.stoppingDistanceM }} m<template v-if="vehicle.slewRadiusM">
            · 선회 반경 {{ vehicle.slewRadiusM }} m</template
          >
        </p>
      </div>

      <div class="ctl">
        <label class="ctl__top" for="cp-distance">
          <span class="ctl__name">이격거리</span><span class="ctl__value inst">{{ state.distanceM.toFixed(1) }} m</span>
        </label>
        <input id="cp-distance" v-model.number="state.distanceM" class="range" type="range" min="0.5" max="24" step="0.1" />
      </div>

      <div class="ctl">
        <label class="ctl__top" for="cp-speed">
          <span class="ctl__name">차량 속도</span><span class="ctl__value inst">{{ state.vehicleSpeedMps.toFixed(1) }} m/s</span>
        </label>
        <input id="cp-speed" v-model.number="state.vehicleSpeedMps" class="range" type="range" min="0" :max="vehicle.maxSpeedMps" step="0.1" />
      </div>

      <div class="ctl">
        <div class="ctl__top"><span class="ctl__name">차량이 가는 쪽</span></div>
        <div class="seg" role="group" aria-label="차량이 가는 쪽">
          <button type="button" :aria-pressed="state.approaching" @click="state.approaching = true">작업자 쪽으로</button>
          <button type="button" :aria-pressed="!state.approaching" @click="state.approaching = false">멀어지는 중</button>
        </div>
      </div>

      <fieldset class="ctl-group">
        <legend class="ctl-group__legend">필터가 보는 것</legend>
        <div class="ctl">
          <div class="ctl__top"><span class="ctl__name">층</span></div>
          <div class="seg" role="group" aria-label="층">
            <button type="button" :aria-pressed="state.sameFloor" @click="state.sameFloor = true">같은 층</button>
            <button type="button" :aria-pressed="!state.sameFloor" @click="state.sameFloor = false">다른 층</button>
          </div>
        </div>
        <div class="ctl">
          <div class="ctl__top"><span class="ctl__name">마지막 위치 보고</span></div>
          <div class="seg" role="group" aria-label="마지막 위치 보고">
            <button type="button" :aria-pressed="state.trackAgeSec === 0" @click="state.trackAgeSec = 0">방금</button>
            <button type="button" :aria-pressed="state.trackAgeSec === 12" @click="state.trackAgeSec = 12">12초 전</button>
          </div>
        </div>
        <div class="ctl">
          <div class="ctl__top"><span class="ctl__name">이 작업자는</span></div>
          <div class="seg" role="group" aria-label="이 작업자는">
            <button type="button" :aria-pressed="!state.isOperator" @click="state.isOperator = false">걸어 다니는 사람</button>
            <button type="button" :aria-pressed="state.isOperator" @click="state.isOperator = true">그 차의 운전자</button>
          </div>
        </div>
      </fieldset>

      <div class="play__presets">
        <button v-for="p in PRESETS" :key="p.label" type="button" class="play__reset" @click="load(p.state)">{{ p.label }}</button>
      </div>
    </div>

    <div class="play__out">
      <p class="play__who">Nguyen Van An (W-1002) 과 {{ vehicle.name }} 사이 — 서버가 보는 순서대로</p>

      <div class="board" role="table" aria-label="충돌 판정 순서">
        <div v-for="c in verdict.checks" :key="c.key" class="check" role="row" :data-state="c.state">
          <svg class="check__i" aria-hidden="true"><use :href="ICON[c.state]" /></svg>
          <div class="check__body" role="cell">
            <span class="check__label">{{ c.label }}</span>
            <span v-if="c.state !== 'pass' || c.key === 'stopped' || c.key === 'boom'" class="check__detail">{{ c.detail }}</span>
          </div>
          <span class="check__state" role="cell">
            {{ STATE_TEXT[c.state] }}
          </span>
        </div>
      </div>

      <dl v-if="verdict.assessment" class="evidence inst" aria-label="서버가 남기는 판정 근거">
        <div><dt>이격거리</dt><dd>{{ fmt2(verdict.assessment.distanceM) }} m</dd></div>
        <div><dt>다가오는 속도</dt><dd>{{ fmt2(verdict.assessment.closingSpeedMps) }} m/s</dd></div>
        <div>
          <dt>충돌까지</dt>
          <dd>{{ verdict.assessment.ttcSec === null ? "다가오지 않음" : `${fmt2(verdict.assessment.ttcSec)}초` }}</dd>
        </div>
        <div><dt>지게차 위험 반경</dt><dd>{{ fmt2(verdict.assessment.hazardRadiusM) }} m</dd></div>
        <div>
          <dt>반경 안</dt><dd>{{ verdict.assessment.distanceM <= verdict.assessment.hazardRadiusM ? "예" : "아니요" }}</dd>
        </div>
      </dl>

      <div class="verdict" :data-level="verdict.level" aria-live="polite">
        <template v-if="alarm && verdict.assessment">
          <svg class="verdict__mark" :style="{ color: `var(--lv-${alarm.toLowerCase()})` }" aria-hidden="true"><use :href="MARK[alarm]" /></svg>
          <div>
            <p class="verdict__t">
              {{ LEVEL_LABEL[alarm] }}
            </p>
            <p class="verdict__rapid"><span class="verdict__k">1단계 · 손목 한 줄</span>{{ rapidText(alarm) }}</p>
            <p class="verdict__msg"><span class="verdict__k">2단계 · 본문 (ko)</span>{{ collisionTextKo(alarm, verdict.assessment) }}</p>
            <ul class="verdict__facts">
              <li>{{ ACK_WINDOW_SEC[alarm] }}초 안에 확인이 없으면 등급을 올려 다시 보내요.</li>
              <li>{{ alarm === "DANGER" || alarm === "EMERGENCY" ? "당사자와 운전자에 더해 안전관리자에게도 가요." : "당사자와 운전자에게 가요." }}</li>
              <li v-if="controlFor(alarm)">
                {{ vehicle.name }}에 <b>{{ controlFor(alarm) }}</b> 명령이 나가요.
              </li>
              <li v-else>차량 제어는 걸지 않아요 — 위험 이상에서만 기계를 건드려요.</li>
            </ul>
          </div>
        </template>
        <template v-else>
          <svg class="verdict__mark verdict__mark--quiet" aria-hidden="true"><use href="#i-skip" /></svg>
          <div>
            <p class="verdict__t">경보를 만들지 않아요</p>
            <p class="verdict__d">
              {{ quietReason.text }}<template v-if="quietReason.code"> 서버는 이렇게 걸러진 횟수를 이유별로 따로 세요.</template>
            </p>
          </div>
        </template>
      </div>

      <p class="fine" style="margin-top: var(--s3)">
        작업자는 서 있고 차량만 움직인다고 두었어요. 입력값은 시연용이고, 기준값(긴급 {{ POLICY.emergencyDistanceM }} m · 위험
        {{ POLICY.dangerDistanceM }} m &amp; TTC {{ POLICY.dangerTtcSec }}초 · 경고 {{ POLICY.warningDistanceM }} m · 판정 반경
        {{ POLICY.evaluationRadiusM }} m)과 판정 순서 · 문장은 서버와 같아요.
      </p>
    </div>
  </div>
</template>
