<!-- 아이콘은 1.5 선 두께로 직접 그렸다. 유니코드 글리프·이모지로 아이콘 자리를 대신하지 않는다.
     등급 표식(lv-*)은 대시보드 levels.ts 의 모양과 같다 — 색만으로 등급을 말하지 않기 위해서다 -->
<template>
  <svg width="0" height="0" style="position: absolute" aria-hidden="true">
    <defs>
      <symbol id="i-down" viewBox="0 0 20 20">
        <path d="M10 4v12M5 11l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </symbol>
      <symbol id="i-out" viewBox="0 0 20 20">
        <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3M11 4h5v5M16 4l-7 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </symbol>
      <symbol id="i-pass" viewBox="0 0 20 20">
        <path d="m5 10.5 3.2 3.2L15 6.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </symbol>
      <symbol id="i-fail" viewBox="0 0 20 20">
        <path d="m6 6 8 8M14 6l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </symbol>
      <symbol id="i-skip" viewBox="0 0 20 20">
        <path d="M5.5 10h9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </symbol>
      <symbol id="i-lv-octagon" viewBox="0 0 20 20">
        <path d="M7 2.5h6l4.5 4.5v6L13 17.5H7L2.5 13V7Z" fill="currentColor" />
      </symbol>
      <symbol id="i-lv-diamond" viewBox="0 0 20 20">
        <path d="M10 2 18 10 10 18 2 10Z" fill="currentColor" />
      </symbol>
      <symbol id="i-lv-triangle" viewBox="0 0 20 20">
        <path d="M10 3 18 17H2Z" fill="currentColor" />
      </symbol>
      <symbol id="i-lv-circle" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7" fill="currentColor" />
      </symbol>
    </defs>
  </svg>
</template>
