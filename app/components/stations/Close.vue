<!-- Aegis 를 이루는 네 가지 — 인수인계 위키 1장 · 6~8장 -->
<script setup lang="ts">
const { consoleUrl } = useRuntimeConfig().public;

const PARTS = [
  {
    name: "관제 화면",
    where: "관제실",
    text: "미확인 경보 · 작업자 상태 · 구역을 한 화면에 두어요. 등급별 경보음을 내고, 서버가 끊기면 화면 전체가 그 사실을 말해요.",
  },
  {
    name: "갤럭시 워치",
    where: "작업자 손목",
    text: "심박 · 낙상 · 착용 상태를 보내고, 경보를 진동 리듬으로 받아요. 화면을 거의 다 쓰는 버튼 하나로 확인해요.",
  },
  {
    name: "작업자 폰 앱",
    where: "아이폰 · 안드로이드",
    text: "워치로 못 볼 때 경보와 건강 그래프를 봐요. 3초 누르는 긴급 호출이 있고, 워치에 Wi-Fi 가 없으면 보고를 대신 올려 줘요.",
  },
  {
    name: "Aegis 서버",
    where: "여러 현장을 한 시스템으로",
    text: "모든 신호를 받아 판정하고, 받을 사람을 정해 보내고, 확인을 세요. 현장이 데이터의 경계라, 실증 3개소가 서로 섞이지 않게 나눠 운영해요.",
  },
];
</script>

<template>
  <section class="close" data-close data-close-stamp="CLOSED" data-band="dark">
    <div class="shell">
      <div class="close__grid">
        <div data-in>
          <h2 class="display close__title">경보는 닫혀도<br />기록은 남아요.</h2>
          <p class="lede" style="margin-top: var(--s5); max-width: 46ch">
            누가 언제 몇 초 만에 확인했는지, 판정이 어떤 숫자를 근거로 했는지, 사람이 그 판정을 맞다고 했는지. 사고 조사가 필요로 하는 건 경보 그 자체보다 이
            기록이에요. 그 기록을 네 가지가 함께 남겨요.
          </p>
          <p class="hero__cta">
            <a class="btn btn--primary" href="#judge">판정기 다시 해 보기</a>
            <a v-if="consoleUrl" class="btn btn--ghost" :href="consoleUrl" rel="noopener">
              관제 화면 열기
              <svg aria-hidden="true"><use href="#i-out" /></svg>
            </a>
          </p>
        </div>

        <div class="parts" data-in aria-label="Aegis 를 이루는 네 가지">
          <div v-for="p in PARTS" :key="p.name" class="part">
            <div class="part__top">
              <b>{{ p.name }}</b><span>{{ p.where }}</span>
            </div>
            <p>{{ p.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
