<script setup lang="ts">
const { consoleUrl } = useRuntimeConfig().public;
</script>

<template>
  <header class="top" data-band="dark">
    <a class="brand" href="#top" aria-label="Aegis 처음으로">
      <SiteBrandLogo :height="24" />
    </a>
    <nav class="top__links" aria-label="페이지 안내">
      <a href="#ingest">수집</a>
      <a href="#judge">판정</a>
      <a href="#dispatch">전파</a>
      <a href="#measure">정량목표</a>
      <a href="#later">한계</a>
      <a v-if="consoleUrl" class="top__console" :href="consoleUrl" rel="noopener">
        관제 화면
        <svg aria-hidden="true"><use href="#i-out" /></svg>
      </a>
    </nav>
  </header>
</template>
