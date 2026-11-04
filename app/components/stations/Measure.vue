<!-- 인수인계 위키 2장 「정량목표와 그것을 재는 곳」 · 12장 「시험 · 성능 실측」 (기준일 2026-11-04)
     공개 사이트라 실측 수치는 싣지 않는다 — 잰 곳과 지금의 단계만 적는다(DESIGN.md 9장) -->
<script setup lang="ts">
const GOALS = [
  {
    code: "P-01",
    goal: "경보 전파 지연 1.0초 이하 (P95)",
    meter: "원천이 보고한 순간부터 발송까지, 경보마다 서버가 재요",
    seen: "개발 장비 부하 시험 · 워치 에뮬레이터 관통 시험까지 — 현장 실측 전",
    planned: false,
  },
  {
    code: "P-02",
    goal: "수집 처리량 초당 200건 (첨두로 판정)",
    meter: "초당 받은 보고 수와 그 첨두를 서버가 늘 세요",
    seen: "개발 장비 부하 시험까지 — 현장 실측 전",
    planned: false,
  },
  { code: "P-03", goal: "전파 성공률(수신확인) 99%", meter: "보낸 경보 중 사람이 확인한 비율", seen: "현장 실측 전", planned: true },
  { code: "P-04", goal: "경고문 3개 국어 이상", meter: "경고문을 만든 언어 수", seen: "한국어 · 영어 · 베트남어 · 네팔어 4개", planned: false },
  {
    code: "P-06",
    goal: "위험 판정 정확도 F1 0.90",
    meter: "사람이 붙인 판정 라벨(맞음 · 오경보)과 놓친 위험 기록으로만 계산",
    seen: "실증 전 — 서버가 스스로 맞았다고 하지 않아요",
    planned: true,
  },
  { code: "P-07", goal: "구역 진입 감지율", meter: "구역마다 드나든 기록", seen: "실증 전", planned: true },
  { code: "P-09", goal: "생체 이상 검출률 95%", meter: "생체 이상 판정 기록", seen: "실증 전", planned: true },
  {
    code: "P-11",
    goal: "실증 3개소",
    meter: "현장마다 데이터를 나눠 운영",
    seen: "시드 현장 3곳 — 제조 공장 · 물류센터 · 건설현장",
    planned: false,
  },
];

const TESTS = [
  { where: "서버", n: "638", note: "서버 안의 경계 규칙과 수집 → 판정 → 경보 → 확인 흐름까지" },
  { where: "관제 화면", n: "68", note: "서버의 등급 · 원인 이름과 화면의 한글 이름이 어긋나지 않는지까지" },
  { where: "워치", n: "141", note: "실제 통신 · 상시 연결을 세워 두고 보고 · 경보 · 재전송을 시험해요" },
  { where: "안드로이드 폰", n: "33", note: "경보 다시 띄우기 · 안전 상태 우선순위 · 그래프 칸" },
  { where: "아이폰", n: "32", note: "단위 시험 30 · 화면 흐름 2 (첫 연결 → 긴급 호출)" },
];
</script>

<template>
  <section
    id="measure"
    class="station station--fade"
    data-stamp="P-01"
    data-band="light"
    data-from
    style="--ground: var(--st-measure); --from: var(--st-vitals); --to: var(--st-later)"
  >
    <div class="shell">
      <div class="station__head">
        <div data-in>
          <p class="stamp"><span class="stamp__t inst">P-01</span></p>
          <h2 class="h2">정량목표는<br />서버가 매일 직접 재요</h2>
        </div>
        <p class="body" data-in>
          정량목표마다 그 값을 재는 계측이 서버에 있어요. 시험 보고서를 쓸 때 따로 만드는 숫자가 아니라, <strong>관제 화면이 매일 읽는 숫자</strong>
          예요. 아직 못 잰 줄도 같이 실어요.
        </p>
      </div>

      <div class="ledger" role="table" aria-label="정량목표와 그것을 재는 곳">
        <div class="ledger__row ledger__head" role="row">
          <span role="columnheader">코드</span><span role="columnheader">목표</span><span role="columnheader">어떻게 재나</span><span role="columnheader">지금까지 잰 것</span>
        </div>
        <div v-for="g in GOALS" :key="g.code" class="ledger__row" role="row" :data-planned="g.planned ? '1' : '0'" data-in>
          <span class="ledger__n inst" role="cell">{{ g.code }}</span>
          <span class="ledger__a" role="cell">{{ g.goal }}</span>
          <span class="ledger__m" role="cell">{{ g.meter }}</span>
          <span class="ledger__b" role="cell">{{ g.seen }}</span>
        </div>
      </div>

      <p class="fine" style="margin-top: var(--s4)">
        부하 시험은 개발 장비에 시뮬레이터로 보고를 넣어 상한을 확인한 거예요. 현장 실증 수치가 아니라서 여기에는 싣지 않고, 현장에서 잰 뒤에 실어요.
      </p>

      <h3 class="h3" style="margin-top: var(--s7)" data-in>판정은 화면이 아니라 시험이 지켜요</h3>
      <div class="tests" role="table" aria-label="저장소별 시험">
        <div v-for="t in TESTS" :key="t.where" class="tests__row" role="row" data-in>
          <span class="tests__where" role="cell">{{ t.where }}</span>
          <span class="tests__n inst" role="cell">{{ t.n }}개</span>
          <span class="tests__note" role="cell">{{ t.note }}</span>
        </div>
      </div>
      <p class="fine" style="margin-top: var(--s3)">
        시험은 전부 순수 로직 중심이에요. 실제로 깨졌던 곳이 화면이 아니라 그 아래(계약 · 파싱 · 판정)였기 때문이에요. 개수는 2026-11-04
        기준이에요.
      </p>
    </div>
  </section>
</template>
