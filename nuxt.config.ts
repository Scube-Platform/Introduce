/**
 * Aegis 소개 사이트 (Nuxt 정적 생성).
 *
 * 서버 런타임이 없다. `nuxt generate` 가 .output/public 에 HTML·CSS·JS 를 떨구고, 그대로 정적 서버에 올린다.
 * 대시보드 이미지처럼 nginx 한 대면 된다. 서버 · 대시보드 · 워치와는 독립된 패키지다.
 */
export default defineNuxtConfig({
  compatibilityDate: "2026-11-01",
  devtools: { enabled: false },
  telemetry: false,

  css: ["~/assets/css/main.css"],
  typescript: { strict: true },

  /* 서브경로에 올릴 때는 빌드할 때 NUXT_APP_BASE_URL 로 알려 준다(끝의 / 포함). 로컬은 "/" 그대로다. */
  app: {
    head: {
      htmlAttrs: { lang: "ko" },
      title: "Aegis — AI 센서융합 작업안전 시스템",
      meta: [
        {
          name: "description",
          content:
            "현장의 태그 · 영상 · 음향 · 워치 신호를 한 서버가 받아 판정하고, 위험한 사람에게 1초 안에 경보를 보내고, 확인을 받을 때까지 놓지 않아요.",
        },
        { name: "theme-color", content: "#071226" },
        { name: "format-detection", content: "telephone=no, address=no, email=no, date=no" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "ko_KR" },
        { property: "og:site_name", content: "Aegis" },
        { property: "og:title", content: "Aegis — AI 센서융합 작업안전 시스템" },
        { property: "og:description", content: "경보는 확인을 받을 때까지 끝나지 않아요." },
      ],
    },
  },

  runtimeConfig: {
    public: {
      // 관제 화면 주소. 비어 있으면 링크를 그리지 않는다 — 사내 주소를 소스에 박아 두지 않으려고
      // 빌드할 때 NUXT_PUBLIC_CONSOLE_URL 로 넣는다
      consoleUrl: "",
    },
  },

  nitro: {
    prerender: { routes: ["/"], failOnError: true },
  },
});
