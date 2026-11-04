<!-- 오른쪽 카드는 배경 장면(story.ts)이 긴급에 닿은 순간의 경보다 — 관제 화면에 뜨는 모습으로 옮겼다 -->
<script setup lang="ts">
import { ACK_WINDOW_SEC, fmt2 } from "~/lib/collision";
import { PEOPLE } from "~/lib/site";
import { storyTimeline } from "~/lib/story";

const emergency = storyTimeline().find((e) => e.sample.alarm === "EMERGENCY")!.sample;
const d = fmt2(emergency.distanceM);
const ttc = emergency.ttcSec === null ? null : fmt2(emergency.ttcSec);
// WarningTemplates.collisionText("vi", EMERGENCY) — 당사자의 첫 언어가 베트남어다
const vi = `KHẨN CẤP: Xe ngay bên cạnh. ${d}m${ttc ? `, ${ttc} giây` : ""}. Dừng lại và tránh sang bên ngay.`;
</script>

<template>
  <section id="top" class="hero" data-stamp="신호" data-band="dark">
    <div class="hero__grid">
      <div class="hero__copy">
        <h1 class="display">2초 뒤에 닿을 지게차,<br />작업자의 손목이<br /><em>먼저</em> 알아야 해요.</h1>
        <p class="lede">
          Aegis 는 현장의 위치 태그 · 영상 · 음향 · 스마트워치 신호를 한 서버에서 받아 위험을 판정하고, 위험한 사람에게 그 사람의 언어로 경보를 보내요. 그리고
          확인을 받을 때까지 놓지 않아요.
        </p>
        <p class="hero__cta">
          <a class="btn btn--primary" href="#sources">
            경보 하나의 일생 따라가기
            <svg aria-hidden="true"><use href="#i-down" /></svg>
          </a>
          <a class="btn btn--ghost" href="#judge">판정기 바로 해 보기</a>
        </p>
        <p class="hero__hint">
          <svg aria-hidden="true"><use href="#i-down" /></svg>
          스크롤이 곧 경보 하나의 일생이에요 — 신호에서 마감까지
        </p>
      </div>

      <!-- 관제 화면에 뜬 경보 한 건. 작업자는 어디서나 「이름 (번호)」, 원인 · 역할은 한글이다(관제 화면 규칙) -->
      <div class="alert" role="group" aria-label="관제 화면에 뜬 경보 한 건">
        <div class="alert__top">
          <span class="alert__lv"><svg aria-hidden="true"><use href="#i-lv-octagon" /></svg>긴급</span>
          <span class="alert__state">미확인 · {{ ACK_WINDOW_SEC.EMERGENCY }}초 안에 확인이 없으면 상향</span>
        </div>
        <p class="alert__who">{{ PEOPLE.self.name }} ({{ PEOPLE.self.id }}) · {{ PEOPLE.self.role }}</p>
        <p class="alert__what">출하장 진입로 사각지대 — 지게차 1호가 바로 옆 {{ d }} m</p>
        <dl class="alert__rows">
          <div>
            <dt>손목에 간 말</dt>
            <dd lang="vi">{{ vi }}</dd>
          </div>
          <div>
            <dt>받는 사람</dt>
            <dd>당사자 · 지게차 운전자 · 안전관리자 {{ PEOPLE.supervisor.name }}</dd>
          </div>
          <div>
            <dt>지게차</dt>
            <dd>강제 정지 — {{ d }} m 에서 섰어요</dd>
          </div>
        </dl>
        <p class="alert__note">배경에서 지금 흘러가는 장면의 경보예요. 숫자는 서버 판정을 그대로 돌려 나온 값이에요.</p>
      </div>
    </div>
  </section>
</template>
