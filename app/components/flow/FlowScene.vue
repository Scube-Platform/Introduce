<script setup lang="ts">
/**
 * 스크롤 = 경보 하나의 일생.
 *
 * 이 컴포넌트가 하는 일은 넷뿐이다.
 *   1) 화면 가운데를 지나는 구간과 그 안의 진행도를 3D 장면의 단계로 넘긴다
 *   2) 레일의 눈금 · 지금 상태 · 밴드(밝음/어두움)를 현재 구간에 맞춘다
 *   3) 밝은 지면이 캔버스를 다 덮는 동안 렌더 루프를 세운다
 *   4) [data-in] 등장 — 한 가지 방식만
 *
 * 전부 명령형으로 둔다. 스크롤은 초당 60번 도는 경로라 Vue 반응성을 얹으면 얻는 것 없이 느려지기만 한다.
 * Vue 가 소유하는 것은 "레일이 어떤 DOM 인가"까지고, 그 안의 값은 ref 로 직접 쓴다.
 */
import { STATIONS } from "~/lib/stations";
import type { SiteHandle } from "~/lib/site-scene";

const sky = ref<HTMLDivElement | null>(null);
const fallback = ref<HTMLDivElement | null>(null);
const rail = ref<HTMLDivElement | null>(null);
const railNow = ref<HTMLSpanElement | null>(null);
const ticksHost = ref<HTMLDivElement | null>(null);

let cleanup: (() => void) | null = null;

onMounted(() => {
  const html = document.documentElement;
  const skyEl = sky.value!;
  const railEl = rail.value!;
  let scene: SiteHandle | null = null;
  let disposed = false;
  let ticking = false;

  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-stamp]"));
  const closeEl = document.querySelector<HTMLElement>("[data-close]");
  const tickEls = Array.from(ticksHost.value!.querySelectorAll<HTMLElement>(".rail__tick"));
  const marks = sections.map((el, i) => ({
    el,
    tick: tickEls[i],
    stamp: el.dataset.stamp ?? "",
    band: el.dataset.band ?? "dark",
  }));

  // ── 눈금 위치 ───────────────────────────────────────────
  const narrow = window.matchMedia("(max-width: 900px)");

  function positionTicks() {
    const docH = Math.max(1, html.scrollHeight - window.innerHeight);
    for (const m of marks) {
      if (!m.tick) continue;
      const top = m.el.getBoundingClientRect().top + window.scrollY;
      const p = Math.min(1, Math.max(0, (top - window.innerHeight * 0.5) / docH));
      const pct = `${(p * 100).toFixed(2)}%`;
      m.tick.style.left = narrow.matches ? pct : "";
      m.tick.style.top = narrow.matches ? "" : pct;
    }
  }

  // ── 매 프레임 ───────────────────────────────────────────
  function update() {
    ticking = false;
    const docH = Math.max(1, html.scrollHeight - window.innerHeight);
    railEl.style.setProperty("--rd", Math.min(1, Math.max(0, window.scrollY / docH)).toFixed(4));

    // 화면 가운데를 지난 마지막 구간이 "지금"이다. 단계 = 그 구간 번호 + 구간 안 진행도
    const mid = window.innerHeight * 0.5;
    let index = 0;
    for (let i = 0; i < marks.length; i++) {
      const passed = marks[i]!.el.getBoundingClientRect().top <= mid;
      if (passed) index = i;
      if (marks[i]!.tick) marks[i]!.tick!.dataset.on = passed ? "1" : "0";
    }
    const rect = marks[index]!.el.getBoundingClientRect();
    let stage = index + Math.min(1, Math.max(0, (mid - rect.top) / Math.max(1, rect.height)));
    let stamp = marks[index]!.stamp;
    if (closeEl && closeEl.getBoundingClientRect().top <= mid) {
      stage = marks.length;
      stamp = closeEl.dataset.closeStamp ?? stamp;
    }
    scene?.setStage(stage);

    if (railNow.value && railNow.value.textContent !== stamp) railNow.value.textContent = stamp;
    const band = marks[index]!.band;
    if (railEl.dataset.band !== band) railEl.dataset.band = band;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  function onResize() {
    positionTicks();
    onScroll();
  }

  // ── 캔버스가 보이는 구간 — 어두운 지면만 현장을 비친다 ──────────
  const darkSections = Array.from(document.querySelectorAll<HTMLElement>('main [data-band="dark"], footer[data-band="dark"]'));
  const seen = new Set<Element>();
  let skyVisible = true;
  const darkObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) seen.add(e.target);
      else seen.delete(e.target);
    }
    const visible = seen.size > 0;
    if (visible === skyVisible) return;
    skyVisible = visible;
    skyEl.style.setProperty("--sky-op", visible ? "1" : "0");
    scene?.setVisible(visible);
  });
  darkSections.forEach((s) => darkObserver.observe(s));

  // ── 등장 — 한 가지 방식만 ─────────────────────────────────
  const reveals = Array.from(document.querySelectorAll<HTMLElement>("[data-in]"));
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        obs.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  reveals.forEach((el) => {
    // 형제끼리만 조금씩 늦춘다 — 전역 순서로 늦추면 아래쪽이 영영 늦게 뜬다
    const sibling = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
    el.style.setProperty("--d", `${Math.min(sibling, 6) * 55}ms`);
    revealObserver.observe(el);
  });

  // ── 3D — 쓰지 않을 것이 확실하면 three 를 아예 받지 않는다 ─────────
  const wantsMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canWebGL2 = (() => {
    try {
      return !!(window.WebGL2RenderingContext && document.createElement("canvas").getContext("webgl2"));
    } catch {
      return false;
    }
  })();

  const useFallback = (reason: string) => {
    if (fallback.value) fallback.value.hidden = false;
    skyEl.dataset.fallback = reason;
  };

  if (!wantsMotion || !canWebGL2) {
    useFallback(wantsMotion ? "no-webgl2" : "reduced-motion");
  } else {
    import("~/lib/site-scene")
      .then(({ mountSite }) => {
        if (disposed) return;
        scene = mountSite(skyEl);
        if (!scene) return useFallback("webgl-init");
        scene.setVisible(skyVisible);
        update();
      })
      .catch((err) => {
        useFallback("load-error");
        console.warn("현장 장면을 불러오지 못해 정적 배경을 씁니다.", err);
      });
  }

  positionTicks();
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("load", positionTicks);
  document.fonts?.ready.then(positionTicks);

  cleanup = () => {
    disposed = true;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("load", positionTicks);
    darkObserver.disconnect();
    revealObserver.disconnect();
    scene?.dispose();
    scene = null;
  };
});

onBeforeUnmount(() => cleanup?.());
</script>

<template>
  <!-- 경보 하나가 지나가는 배경. 글자는 전부 DOM 이라 검색·스크린리더에 손실이 없다 -->
  <div ref="sky" class="sky" aria-hidden="true">
    <div ref="fallback" class="sky__fallback" hidden />
  </div>
  <div class="scrim" aria-hidden="true" />

  <!-- 상태 레일 — 순서가 정보 자체라서 상태 표기가 장식이 아니다 -->
  <div ref="rail" class="rail" data-band="dark" aria-hidden="true">
    <span class="rail__cap">신호에서</span>
    <span ref="railNow" class="rail__now inst">{{ STATIONS[0]!.stamp }}</span>
    <div class="rail__track">
      <div class="rail__fill" />
      <div ref="ticksHost" class="rail__ticks">
        <i v-for="s in STATIONS" :key="s.id" class="rail__tick" data-on="0" />
      </div>
    </div>
    <span class="rail__cap">마감까지</span>
  </div>
</template>
