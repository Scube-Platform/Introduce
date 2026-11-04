<!-- 판정 기록은 app/lib/story.ts 가 서버 판정(collision.ts)으로 계산한 것이다 — 배경 3D 와 같은 표본 -->
<script setup lang="ts">
import { LEVEL_LABEL, controlFor, fmt2, type AlarmLevel } from "~/lib/collision";
import { storyTimeline, type StoryEvent } from "~/lib/story";

const MARK: Record<AlarmLevel, string> = { EMERGENCY: "#i-lv-octagon", DANGER: "#i-lv-diamond", WARNING: "#i-lv-triangle", CAUTION: "#i-lv-circle" };

function what(e: StoryEvent) {
  const s = e.sample;
  if (e.kind === "halted") return "손목이 울리고 0.6초 뒤, 작업자가 그 자리에 멈춰요.";
  if (e.kind === "stopped") return `지게차가 ${fmt2(s.distanceM)} m 에서 서요. 서 있는 차는 더 판정하지 않지만, 경보는 확인을 받을 때까지 열려 있어요.`;
  const level = s.alarm as AlarmLevel;
  const control = controlFor(level);
  const parts: string[] = [];
  if (e.kind === "raised") parts.push("새 경보예요. 당사자와 운전자에게 가요.");
  else if (level === "WARNING") parts.push("같은 원인이라 새로 만들지 않아요. 열린 경보를 끌어올려 다시 보내요.");
  else if (level === "DANGER") parts.push(`경고 거리지만 지게차의 위험 반경(${fmt2(s.hazardRadiusM)} m) 안이라 한 단계 더 올라요. 안전관리자까지 넓어져요.`);
  else parts.push("지게차가 1.5 m 안으로 지나가요.");
  if (control) parts.push(`지게차에 ${control}.`);
  return parts.join(" ");
}

const events = storyTimeline().map((e) => ({
  ...e,
  level: e.kind === "raised" || e.kind === "upgraded" ? (e.sample.alarm as AlarmLevel) : null,
  text: what(e),
}));
</script>

<template>
  <section id="raised" class="station station--rise station--clear" data-stamp="RAISED" data-band="dark" style="--ground: var(--st-raised)">
    <div class="shell">
      <div class="station__head">
        <div data-in>
          <p class="stamp"><span class="stamp__t inst">RAISED</span></p>
          <h2 class="h2">출하장 진입로,<br />랙이 가린 모서리에서</h2>
        </div>
        <p class="body" data-in>
          W-1002 Nguyen Van An 씨가 랙 끝을 돌아 통로로 나오고, 지게차 1호가 같은 통로를 2 m/s 로 들어와요. 서로 보이지 않는 자리예요. 배경의 색이 바뀌는
          순간과 지게차가 서는 자리는 손으로 정하지 않았어요 — <strong>0.05초마다 서버 판정을 그대로 돌린 결과</strong>예요.
        </p>
      </div>

      <div class="timeline" role="table" aria-label="배경 장면의 판정 기록">
        <div class="timeline__row timeline__head" role="row">
          <span role="columnheader">시각</span><span role="columnheader">이격</span><span role="columnheader">TTC</span><span role="columnheader">등급</span
          ><span role="columnheader">무슨 일이</span>
        </div>
        <div v-for="e in events" :key="`${e.kind}-${e.seconds}`" class="timeline__row" role="row" :data-kind="e.kind" data-in>
          <span class="inst" role="cell">{{ e.seconds.toFixed(2) }}초</span>
          <span class="inst" role="cell">{{ fmt2(e.sample.distanceM) }} m</span>
          <span class="inst" role="cell">{{ e.sample.ttcSec === null ? "—" : `${fmt2(e.sample.ttcSec)}초` }}</span>
          <span class="timeline__lv" role="cell">
            <template v-if="e.level">
              <svg :style="{ color: `var(--lv-${e.level.toLowerCase()})` }" aria-hidden="true"><use :href="MARK[e.level]" /></svg>{{ LEVEL_LABEL[e.level] }}
            </template>
          </span>
          <span class="timeline__what" role="cell">{{ e.text }}</span>
        </div>
      </div>

      <p class="fine" style="margin-top: var(--s4)">
        작업자 걸음 1.2 m/s, 지게차 제동 3 m/s², 손목이 울리고 사람이 멈추기까지 0.6초, 판정 · 전파 지연은 0으로 두고 계산했어요. 등급 기준 · 위험 반경 ·
        차량 제어는 서버 값이고, 지게차 1호의 제원(최고 2.8 m/s · 정지거리 3.0 m)은 시드 현장 그대로예요.
      </p>
    </div>
  </section>
</template>
