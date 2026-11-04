<script setup lang="ts">
/**
 * Aegis 마크 + 이름. 도형은 brand/aegis/aegis-mark-reverse.svg 원본 그대로다.
 * 이 페이지의 로고 자리는 전부 어두운 바탕이라 반전판(노란 방패, 점과 틈은 뚫림)만 쓴다 —
 * 노랑을 흰 바탕에 직접 놓지 않는다(brand/README.md).
 */
defineProps<{ height?: number }>();
</script>

<template>
  <span class="logo" :style="{ '--h': `${height ?? 24}px` }">
    <svg class="logo__mark" viewBox="-8 0 116 116" aria-hidden="true">
      <path
        fill="#FFCF4B"
        fill-rule="evenodd"
        d="M50 3.5C51.2 3.5 52.3 3.7 53.4 4.1L89 15.6Q92 16.6 92 19.8V54C92 81 74 101 51.6 111.4Q50 112.2 48.4 111.4C26 101 8 81 8 54V19.8Q8 16.6 11 15.6L46.6 4.1C47.7 3.7 48.8 3.5 50 3.5ZM45.9 27L54.1 27L78.55 85L64.45 85L50 50.73L35.55 85L21.45 85ZM43.75 72.5a6.25 6.25 0 1 0 12.5 0a6.25 6.25 0 1 0 -12.5 0Z"
      />
    </svg>
    <span class="logo__name">Aegis</span>
  </span>
</template>
