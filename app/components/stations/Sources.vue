<!-- 서버 README 수집 원천 목록 · 인수인계 위키 3장 -->
<script setup lang="ts">
const SOURCES = [
  { code: "IF-01", source: "작업자 태그", what: "작업자의 위치", confidence: false },
  { code: "IF-02", source: "차량 태그", what: "지게차 · 중장비의 위치와 속도", confidence: false },
  { code: "IF-03", source: "구역 태그", what: "구역 출입", confidence: false },
  { code: "IF-04", source: "영상 AI", what: "영상에서 추론한 위험", confidence: true },
  { code: "IF-05", source: "음향 AI", what: "소리에서 추론한 위험", confidence: true },
  { code: "IF-06", source: "융합 AI", what: "여러 원천을 묶어 내린 추론", confidence: true },
  { code: "IF-08", source: "스마트워치", what: "심박 · 낙상 · 착용 상태", confidence: false },
];
</script>

<template>
  <section id="sources" class="station station--rise" data-stamp="IF-01~08" data-band="dark" style="--ground: var(--st-sources)">
    <div class="shell">
      <div class="station__head">
        <div data-in>
          <p class="stamp"><span class="stamp__t inst">IF-01~08</span></p>
          <h2 class="h2">원천은 일곱 갈래예요.<br />판정은 한 형식으로 해요.</h2>
        </div>
        <p class="body" data-in>
          만든 회사도, 보내는 주기도, 시각을 재는 시계도 다 달라요. Aegis 는 이걸 전부 <strong>하나의 안전 이벤트 형식</strong>으로 바꾼 다음에야
          판정을 시작해요. 배경에서 사람과 차마다 올라가는 빛이 그 보고예요.
        </p>
      </div>

      <div class="sources" role="table" aria-label="수집 원천">
        <div class="sources__row sources__head" role="row">
          <span role="columnheader">연계</span><span role="columnheader">원천</span><span role="columnheader">보내는 것</span
          ><span role="columnheader">신뢰도</span>
        </div>
        <div v-for="s in SOURCES" :key="s.code" class="sources__row" role="row" data-in>
          <span class="sources__code inst" role="cell">{{ s.code }}</span>
          <b class="sources__name" role="cell">{{ s.source }}</b>
          <span role="cell">{{ s.what }}</span>
          <span class="sources__conf" role="cell">{{ s.confidence ? "필수" : "—" }}</span>
        </div>
      </div>

      <p class="fine" style="margin-top: var(--s5)">
        추론 원천(영상 · 음향 · 융합 AI)이 신뢰도를 빠뜨리면 1.0 으로 채우지 않고 거부해요. 채우면 가장 불확실한 입력이 융합에서 가장 큰 가중치를 받으니까요. 보고는 웹 API 로도, 현장 메시지 브로커(MQTT)로도 들어오고, 한 번에 최대 500건까지 묶어 보낼 수 있어요.
      </p>
    </div>
  </section>
</template>
