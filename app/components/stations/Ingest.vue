<!-- 서버 README 「수집」 · 인수인계 위키 5.2 「수집」 — 수집 결과 예시는 README 의 배치 응답을 사람 말로 옮긴 것이다 -->
<script setup lang="ts">
const RULES = [
  {
    name: "중복",
    text: "원천이 붙인 번호가 있으면 그것으로, 없으면 내용과 시간 창(기본 2초, 위치 · 생체는 0.2초)으로 걸러요. 검사와 저장을 한 번에 해서, 같은 보고가 동시에 열 번 와도 한 번만 남아요.",
  },
  {
    name: "늦게 온 것",
    text: "5초 넘게 늦은 보고는 저장하고 통계에도 넣지만 실시간 경보는 울리지 않아요. 통신이 돌아오며 쏟아진 10분 전 위치로 지금 경보를 내면 안 되니까요.",
  },
  {
    name: "미래에서 온 것",
    text: "원천의 시계가 허용 오차를 넘어 앞서 있으면 거부해요. 시각이 비어 있으면 받은 시각으로 채우고, 그 차이를 기록해요.",
  },
  {
    name: "모르는 현장",
    text: "등록되지 않았거나 운용 중이 아닌 현장의 보고는 받지 않아요. 현장 · 사람 · 장비 대장이 보고보다 먼저예요.",
  },
  {
    name: "주인 없는 태그",
    text: "태그는 자기가 누구에게 붙어 있는지 몰라요. 그 시각에 누구에게 배정돼 있었는지로 사람을 찾아요. 같은 태그라도 오전과 오후의 주인이 달라요.",
  },
  {
    name: "원문",
    text: "받은 원문은 정상이든 거부든 그대로 남겨요. 「우리가 보낸 게 왜 거부됐냐」에 로그를 뒤지지 않고 답해요.",
  },
];

const BATCH = [
  { what: "위치 보고 — 통신이 흔들려 같은 것이 한 번 더 왔어요", verdict: "중복", note: "하나만 남겨요", state: "skip" },
  { what: "시계가 앞서 있는 장비의 보고", verdict: "거부", note: "이유를 함께 돌려주고 원문을 남겨요", state: "fail" },
  { what: "워치의 생체 보고", verdict: "받음", note: "저장하고 바로 판정으로 넘겨요", state: "pass" },
] as const;
</script>

<template>
  <section
    id="ingest"
    class="station"
    data-stamp="ACCEPTED"
    data-band="light"
    data-from
    style="--ground: var(--st-ingest); --from: var(--st-sources)"
  >
    <div class="shell">
      <div class="station__head">
        <div data-in>
          <p class="stamp"><span class="stamp__t inst">ACCEPTED</span></p>
          <h2 class="h2">받자마자 판정하지 않아요.<br />믿을 수 있는지부터 봐요.</h2>
        </div>
        <p class="body" data-in>
          수집은 저장이 끝나면 바로 응답하고, 판정은 따로 맡아요. 대기열(2,000건)이 차도 <strong>버리지 않고</strong> 보내는 쪽을 늦춰요. 그 사이에
          보고 하나가 지나야 하는 검사가 있어요.
        </p>
      </div>

      <div class="exchange">
        <ul class="rules">
          <li v-for="r in RULES" :key="r.name" class="rule" data-in>
            <div class="rule__top">
              <b>{{ r.name }}</b>
            </div>
            <p>{{ r.text }}</p>
          </li>
        </ul>

        <div class="batch" data-in aria-label="한 번에 들어온 세 건의 처리 결과 (예시)">
          <p class="batch__t">한 번에 들어온 세 건</p>
          <div v-for="b in BATCH" :key="b.what" class="batch__row" :data-state="b.state">
            <span class="batch__what">{{ b.what }}</span>
            <span class="batch__verdict">{{ b.verdict }}</span>
            <span class="batch__note">{{ b.note }}</span>
          </div>
          <p class="batch__foot">한 건이 거부돼도 나머지는 처리하고, 건마다 결과를 따로 돌려줘요. 보내는 쪽은 무엇이 왜 빠졌는지 바로 알아요.</p>
        </div>
      </div>
    </div>
  </section>
</template>
