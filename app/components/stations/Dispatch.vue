<!-- 서버의 두 단계 발송 · 신속 문구 · 경고문 템플릿 · 수신 역할 — 문장은 서버 템플릿 원문이다 -->
<script setup lang="ts">
import { collisionTextKo, fmt2, rapidText } from "~/lib/collision";
import { PEOPLE } from "~/lib/site";
import { storyTimeline } from "~/lib/story";

// 배경 장면이 긴급에 닿은 순간의 근거로 문장을 만든다
const emergency = storyTimeline().find((e) => e.sample.alarm === "EMERGENCY")!.sample;
const evidence = { distanceM: emergency.distanceM, closingSpeedMps: 0, ttcSec: emergency.ttcSec, hazardRadiusM: emergency.hazardRadiusM };
const d = fmt2(emergency.distanceM);
const ttc = emergency.ttcSec === null ? null : fmt2(emergency.ttcSec);

const ko = collisionTextKo("EMERGENCY", evidence);
// WarningTemplates.collisionText("vi", EMERGENCY) · evidence() — 단위도 언어를 따른다
const vi = `KHẨN CẤP: Xe ngay bên cạnh. ${d}m${ttc ? `, ${ttc} giây` : ""}. Dừng lại và tránh sang bên ngay.`;

// 밑줄 색: 위험은 그 등급의 색, 근거는 판정이 쓴 숫자(수집 · 보고의 파랑), 행동은 받는 사람이 할 일(확인의 청록)
const PIECES = [
  { part: "위험", text: "긴급: 차량이 바로 옆입니다.", color: "var(--lv-emergency)" },
  { part: "근거", text: `${d}m${ttc ? `, ${ttc}초` : ""}.`, color: "var(--signal)" },
  { part: "행동", text: "즉시 멈추고 옆으로 피하십시오.", color: "var(--confirm)" },
];

const RECIPIENTS = [
  { role: "당사자", code: "SELF", who: `${PEOPLE.self.id} ${PEOPLE.self.name} · ${PEOPLE.self.role}`, lang: "vi", text: vi },
  { role: "운전자", code: "OPERATOR", who: "지게차 1호 운행 세션의 운전자", lang: "ko", text: ko },
  { role: "안전관리자", code: "SUPERVISOR", who: `${PEOPLE.supervisor.id} ${PEOPLE.supervisor.name} · 위험 이상일 때`, lang: "ko", text: ko },
];
</script>

<template>
  <section id="dispatch" class="station station--clear" data-stamp="DISPATCHED" data-band="dark" style="--ground: var(--st-dispatch)">
    <div class="shell">
      <div class="station__head">
        <div data-in>
          <p class="stamp"><span class="stamp__t inst">DISPATCHED</span></p>
          <h2 class="h2">먼저 느끼게 하고,<br />그다음 알게 해요</h2>
        </div>
        <p class="body" data-in>
          받는 사람의 언어로 문장을 만들고 음성까지 실으려면 몇백 밀리초가 들어요. 그동안 작업자는 아무것도 못 느껴요. 그래서 서버는 <strong>두 번</strong>
          보내요. 1단계는 번역을 기다리지 않는 한 줄과 진동, 2단계가 받는 사람 언어의 전체 문장이에요.
        </p>
      </div>

      <div class="stages">
        <div class="stage" data-in>
          <p class="stage__k">1단계 · 신속</p>
          <p class="stage__rapid">{{ rapidText("EMERGENCY") }}</p>
          <p class="stage__note">손목 화면 한 줄(14자 이하). 번역하지 않아요 — 읽으라고 있는 게 아니라 고개를 들게 하려고 있어요.</p>
        </div>
        <div class="stage" data-in>
          <p class="stage__k">2단계 · 상세 — 위험 · 근거 · 행동</p>
          <p class="pieces">
            <span v-for="p in PIECES" :key="p.part" class="piece" :style="{ '--c': p.color }"
              ><span class="piece__t">{{ p.text }}</span><span class="piece__k">{{ p.part }}</span></span
            >
          </p>
          <p class="stage__note">
            「위험합니다」만으로는 무엇을 해야 할지 몰라요. 근거는 판정이 쓴 숫자 그대로, 행동은 한 동작으로 적어요. 긴급은 문장 생성을 기다리지 않고 고정
            템플릿으로 바로 채워요.
          </p>
        </div>
      </div>

      <div class="recipients" role="table" aria-label="이 경보를 받는 사람">
        <div v-for="r in RECIPIENTS" :key="r.code" class="recipients__row" role="row" data-in>
          <div class="recipients__who" role="cell">
            <b>{{ r.role }}</b>
            <span>{{ r.who }}</span>
          </div>
          <p class="recipients__text" role="cell" :lang="r.lang">
            <span class="recipients__lang inst">{{ r.lang }}</span>{{ r.text }}
          </p>
        </div>
      </div>

      <p class="fine" style="margin-top: var(--s4)">
        작업자 대장의 첫 언어가 그 사람의 주 언어예요. 서버는 경고문을 ko · en · vi · ne 네 언어로 만들 수 있고, 한 경보에서는 받는 사람들 언어의 합집합만 한
        번에 만들어요. 워치 · 폰 · 관제 화면은 늘 열어 둔 연결로 「새 경보가 있다」는 신호만 받고 본문은 직접 받아 가요 — 연결은 끊기기 마련이라 주기적으로 다시 묻는 것도 끄지 않아요. 운전자 행은 운행 세션이 열려 있다고 둔 시연이에요.
      </p>
    </div>
  </section>
</template>
