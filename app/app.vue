<script setup lang="ts">
/**
 * 경보 하나의 일생 — 신호에서 마감까지.
 *
 * 이 파일은 구성만 한다. 각 구간이 자기 카피를 소유한다(구간 하나 = 파일 하나).
 * 상태가 있는 곳은 스크롤 엔진(FlowScene)과 충돌 판정기(CollisionPlayground) 둘뿐이다.
 */
const { app } = useRuntimeConfig();
const base = app.baseURL;

useHead({
  link: [
    { rel: "icon", href: `${base}favicon.svg`, type: "image/svg+xml" },
    { rel: "apple-touch-icon", href: `${base}apple-touch-icon.png` },
  ],
});
</script>

<template>
  <a class="skip" href="#sources">본문으로 건너뛰기</a>
  <SiteIconSprite />
  <FlowScene />
  <SiteHeader />
  <main id="main">
    <StationsHero />
    <StationsSources />
    <StationsIngest />
    <StationsJudge />
    <StationsRaised />
    <StationsDispatch />
    <StationsAck />
    <StationsVitals />
    <StationsMeasure />
    <StationsLater />
    <StationsClose />
  </main>
  <SiteFooter />
</template>
