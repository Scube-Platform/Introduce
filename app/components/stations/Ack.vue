<!-- 확인 창은 서버 AlarmLevel, 진동은 워치 WatchAlarmPresenter.vibrate() 의 파형 그대로다 -->
<script setup lang="ts">
import { ACK_WINDOW_SEC, LEVEL_LABEL, collisionTextKo, type AlarmLevel } from "~/lib/collision";
import { storyTimeline } from "~/lib/story";

// 워치 경보 화면에는 서버가 만든 본문이 그대로 뜬다 — 배경 장면이 긴급에 닿은 순간의 문장
const emergency = storyTimeline().find((e) => e.sample.alarm === "EMERGENCY")!.sample;
const watchText = collisionTextKo("EMERGENCY", { distanceM: emergency.distanceM, closingSpeedMps: 0, ttcSec: emergency.ttcSec, hazardRadiusM: emergency.hazardRadiusM });

/** VibrationEffect 파형(ms) — 첫 값은 쉬는 시간이고, 이후 켜짐 · 꺼짐이 번갈아 온다 */
const HAPTICS: Array<{ level: AlarmLevel; wave: number[]; repeat: boolean; say: string }> = [
  { level: "EMERGENCY", wave: [0, 400, 150, 400, 150], repeat: true, say: "확인할 때까지 끊기지 않아요" },
  { level: "DANGER", wave: [0, 300, 120, 300, 120, 300], repeat: false, say: "세 번" },
  { level: "WARNING", wave: [0, 180, 140, 180], repeat: false, say: "두 번" },
  { level: "CAUTION", wave: [0, 120], repeat: false, say: "한 번" },
];

const SPAN_MS = 1700;
function pulses(wave: number[], repeat: boolean) {
  const out: Array<{ at: number; len: number }> = [];
  let t = 0;
  do {
    wave.forEach((ms, i) => {
      if (i % 2 === 1 && t < SPAN_MS) out.push({ at: t, len: Math.min(ms, SPAN_MS - t) });
      t += ms;
    });
  } while (repeat && t < SPAN_MS);
  return out;
}

const ROWS = HAPTICS.map((h) => ({ ...h, window: ACK_WINDOW_SEC[h.level], pulses: pulses(h.wave, h.repeat) }));
const MARK: Record<AlarmLevel, string> = { EMERGENCY: "#i-lv-octagon", DANGER: "#i-lv-diamond", WARNING: "#i-lv-triangle", CAUTION: "#i-lv-circle" };
</script>

<template>
  <section id="ack" class="station station--clear" data-stamp="ACKNOWLEDGED" data-band="dark" style="--ground: var(--st-ack)">
    <div class="shell">
      <div class="station__head">
        <div data-in>
          <p class="stamp"><span class="stamp__t inst">ACKNOWLEDGED</span></p>
          <h2 class="h2">확인이 없으면<br />경보가 스스로 올라가요</h2>
        </div>
        <p class="body" data-in>
          워치 화면에는 버튼이 하나뿐이고 화면을 거의 다 써요. 장갑 낀 손, 흔들리는 발판, 앞을 봐야 하는 눈 — 작은 버튼 두 개는 그 순간 아무것도 눌리지 않아요.
          정해진 창 안에 확인이 없으면 등급을 한 단계 올려 다시 보내요.
        </p>
      </div>

      <div class="ackgrid">
        <!-- 워치 화면의 배치를 그린 것이다. 캡처가 아니다 -->
        <figure class="watch" data-in aria-label="워치 경보 화면의 배치">
          <div class="watch__face">
            <p class="watch__lv">{{ LEVEL_LABEL.EMERGENCY }}</p>
            <p class="watch__msg">{{ watchText }}</p>
            <span class="watch__btn">확인</span>
          </div>
          <figcaption class="fine">화면 배치를 옮겨 그린 그림이에요.</figcaption>
        </figure>

        <div class="windows" role="table" aria-label="등급별 확인 창과 손목 진동" data-in>
          <div class="windows__row windows__head" role="row">
            <span role="columnheader">등급</span><span role="columnheader">확인 창</span><span role="columnheader">손목 진동 · {{ SPAN_MS / 1000 }}초</span>
          </div>
          <div v-for="r in ROWS" :key="r.level" class="windows__row" role="row" :style="{ '--c': `var(--lv-${r.level.toLowerCase()})` }">
            <span class="windows__lv" role="cell"><svg aria-hidden="true"><use :href="MARK[r.level]" /></svg>{{ LEVEL_LABEL[r.level] }}</span>
            <span class="windows__win inst" role="cell">{{ r.window }}초</span>
            <span class="windows__wave" role="cell">
              <span class="wave" :data-repeat="r.repeat ? '1' : '0'">
                <i v-for="(p, i) in r.pulses" :key="i" :style="{ left: `${(p.at / SPAN_MS) * 100}%`, width: `${(p.len / SPAN_MS) * 100}%` }" />
              </span>
              <span class="windows__say">{{ r.say }}</span>
            </span>
          </div>
        </div>
      </div>

      <ul class="rules rules--dark">
        <li class="rule" data-in>
          <div class="rule__top"><b>소리 대신 리듬</b></div>
          <p>착암기 옆에서 워치 스피커는 안 들려요. 주력은 진동이고, 등급은 세기가 아니라 박자로 구분해요 — 사람은 진동의 강약보다 리듬을 훨씬 잘 가려요.</p>
        </li>
        <li class="rule" data-in>
          <div class="rule__top"><b>한 곳에서 누르면 모두 내려가요</b></div>
          <p>확인을 받으면 그 사람의 상시 연결 전부에 알려요. 폰에서 확인한 경보를 워치가 다음 조회(30초)를 기다리지 않고 내려요.</p>
        </li>
        <li class="rule" data-in>
          <div class="rule__top"><b>경보 상태가 배터리보다 먼저</b></div>
          <p>배터리 3% 는 지금 쓰러진 사람 앞에서 측정을 멈출 이유가 아니에요. 큐가 넘쳐도 낙상과 확인은 버리지 않고, 재전송은 같은 ID 로 나가요.</p>
        </li>
      </ul>
    </div>
  </section>
</template>
