<!-- 시연용 값의 안내는 그 값이 있는 자리(판정기 · 수집 결과 예시 · 배경 장면 · 히어로 카드)에 각각 적는다 -->
<script setup lang="ts">
const { consoleUrl } = useRuntimeConfig().public;
</script>

<template>
  <footer class="foot" data-band="dark">
    <div class="shell">
      <div class="foot__grid">
        <p>Aegis · AI 센서융합 작업안전 시스템</p>
        <p>© 2026 (주)사운드마인드</p>
      </div>
      <p class="fine" style="margin-top: var(--s4)">(주)사운드마인드 — 서버 · 관제 화면 · 워치 단말 · 작업자 폰 앱</p>
      <p v-if="consoleUrl" class="fine" style="margin-top: var(--s2)">관제 화면은 사내 연동시험망 안에서만 열려요.</p>
    </div>
  </footer>
</template>
