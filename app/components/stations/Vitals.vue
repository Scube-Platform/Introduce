<!-- 인수인계 위키 5.2 「생체」 · 민감도 조정 기록(2026-11-04) · ADR-0008 -->
<script setup lang="ts">
import { PEOPLE } from "~/lib/site";

const CONTEXT = [
  { where: "휴게실", level: null, label: "경보 없음" },
  { where: "밀폐공간", level: "danger", label: "위험" },
  { where: "단독 작업", level: "emergency", label: "긴급" },
] as const;

const RULES = [
  {
    name: "생존 확인",
    text: "밀폐공간 · 단독 작업에서는 5분, 그 밖에서는 15분 움직임이 없으면 워치가 「괜찮으십니까」를 물어요. 60초 안에 답이 없으면 올려요. 휴식 · 점심마다 묻지 않으려고 둘을 나눴어요.",
  },
  {
    name: "개인 기준선",
    text: "2분 넘게 쉰 뒤의 안정 심박만, 40~100회/분 안에서만 배워요. 20건이 모이기 전에는 심박 · 온열 판정을 보류해요.",
  },
  {
    name: "심박",
    text: "60초 지속이 기준이에요. 아래쪽(-30%)은 언제나, 위쪽(+30%)은 쉬고 있을 때만 이상이에요. 움직이는 동안에는 150회/분 상한만 봐요 — 계단만 올라도 70이 110을 넘어요.",
  },
  {
    name: "낙상",
    text: "충격은 워치가 자유낙하를 감지한 낙상 후보에서만 믿어요. 망치질만으로 손목은 3g 를 넘어요. 충격 뒤 20초 동안 움직임이 없어야 낙상으로 굳어요.",
  },
  {
    name: "모름",
    text: "활동량이 오지 않았으면 무동작이 아니라 모름이에요. 모름을 0으로 바꾸지 않아요 — 그렇게 했다가 생존 확인이 반복된 결함이 있었어요.",
  },
  {
    name: "보내지 않는 것",
    text: "서버로는 요약값과 판정 상태만 와요. 맥파 원파형이나 심전도는 서버로 오지도, 화면에 나가지도 않아요.",
  },
];
</script>

<template>
  <section id="vitals" class="station station--fade station--clear" data-stamp="생존 확인" data-band="dark" style="--ground: var(--st-vitals)">
    <div class="shell">
      <div class="station__head">
        <div data-in>
          <p class="stamp"><span class="stamp__t inst">생존 확인</span></p>
          <h2 class="h2">같은 무동작도<br />어디서냐에 따라 달라요</h2>
        </div>
        <p class="body" data-in>
          생체 판정은 숫자 하나로 하지 않아요. 개인 기준선과 활동량, 그리고 지금 있는 구역을 함께 봐요. 배경은 지하 배관 피트 바닥의 {{ PEOPLE.confined.id }}
          {{ PEOPLE.confined.name }} 씨예요. 서버가 묻고, 작업자가 답해요.
        </p>
      </div>

      <div class="context" role="table" aria-label="움직임이 없을 때, 있는 곳에 따른 등급" data-in>
        <div v-for="c in CONTEXT" :key="c.where" class="context__cell" role="row">
          <span class="context__q" role="cell">무동작 + <b>{{ c.where }}</b></span>
          <span class="context__a" role="cell">
            <i v-if="c.level" class="lv-dot" :style="{ '--c': `var(--lv-${c.level})` }" />{{ c.label }}
          </span>
        </div>
      </div>

      <ul class="rules rules--dark rules--2">
        <li v-for="r in RULES" :key="r.name" class="rule" data-in>
          <div class="rule__top"><b>{{ r.name }}</b></div>
          <p>{{ r.text }}</p>
        </li>
      </ul>

      <p class="fine" style="margin-top: var(--s4)">
        산소포화도는 서버 규칙(90% 미만이 연속 2회)까지 있지만, 워치에서 재는 부분은 아직이에요 — 아래 「아직」에 적었어요. 시연용 합성 생체값은 워치 화면과
        모든 보고에 시연용이라고 표시돼 실측과 섞이지 않아요.
      </p>
    </div>
  </section>
</template>
