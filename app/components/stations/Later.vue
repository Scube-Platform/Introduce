<!-- 인수인계 위키 1장 「지금 위험한 것」 · 14장 「남은 일」 (기준일 2026-11-04) -->
<template>
  <section id="later" class="station station--rise" data-stamp="아직" data-band="dark" style="--ground: var(--st-later)">
    <div class="shell">
      <div class="station__head">
        <div data-in>
          <p class="stamp"><span class="stamp__t inst">아직</span></p>
          <h2 class="h2">현장에 나가기 전에<br />남은 것들이에요</h2>
        </div>
        <p class="body" data-in>
          소개 페이지가 코드보다 앞서 나가면 안 돼요. 아래는 저장소에 <strong>아직 없거나, 실기기로 확인하지 못한 것</strong>들이에요. 배경의 빈 고리 두 개가
          그중 두 자리예요 — 지게차 1호와 배관 피트의 워치.
        </p>
      </div>

      <ul class="cannots">
        <li class="cannot" data-in>
          <b>차량 제어는 아직 기록만 남겨요</b>
          <p>강제 정지 · 속도 제한 명령을 만드는 곳과 안전 잠금까지 있어요. 실제 속도제어기 · 지게차와 잇는 건 연계 규격이 확정된 뒤예요.</p>
        </li>
        <li class="cannot" data-in>
          <b>워치 산소포화도 · 피부 온도</b>
          <p>
            삼성 헬스 센서 SDK 파트너 승인이 필요해요. 끼울 자리는 만들어 뒀어요. 시험 워치4 에는 피부 온도 센서가 없어서, 밀폐공간 산소결핍은 실기기로 아직
            실증하지 못해요.
          </p>
        </li>
        <li class="cannot" data-in>
          <b>AI 가 쓰는 경고문</b>
          <p>문장 검사 · 실패하면 고정 문구로 돌아가기 · 언어 나누기는 준비돼 있어요. 막힌 건 문장을 만들어 줄 AI 서버예요. 지금 문장은 전부 고정 문구예요.</p>
        </li>
        <li class="cannot" data-in>
          <b>워치 GPS 로는 「접근」을 못 갈라요</b>
          <p>구역은 한 변 15~20 m, 접근 폭은 2~3 m 인데 워치 위치는 공장 안에서 수십 m 씩 튀어요. 정확도 10 m 보다 흐리면 판정하지 않고, 접근은 UWB 태그의 몫이에요.</p>
        </li>
        <li class="cannot" data-in>
          <b>현장망 인증 전환</b>
          <p>기기마다 따로 주는 자격과 역할 4개는 있어요. 현장에 내보내려면 회사 로그인 연동과 보안 마무리가 남았어요. 지금은 시험망 전용이에요.</p>
        </li>
        <li class="cannot" data-in>
          <b>상태 일부가 메모리에만 있어요</b>
          <p>보고 저장 · 이동 궤적 · 구역 정의 · 차량 제어 이력이 서버 메모리에만 있어요. 다시 켜면 사라지고, 서버를 두 대로 늘릴 수 없어요. 제어 이력은 사고 조사 자료라 먼저 옮겨야 해요.</p>
        </li>
        <li class="cannot" data-in>
          <b>앱이 닫힌 아이폰</b>
          <p>푸시 발송 코드는 있지만 애플 유료 개발자 계정의 키가 없어요. 아이폰 작업자에게는 지금 「앱이 열려 있을 때만」이에요. 안드로이드는 앱을 닫아도 받아요.</p>
        </li>
        <li class="cannot" data-in>
          <b>워치 ↔ 폰 중계</b>
          <p>워치가 폰을 거쳐 보고하는 길은 빌드와 단위 시험만 통과했어요. 시뮬레이터 · 에뮬레이터에는 블루투스가 없어서 실기기 왕복 확인이 남았어요.</p>
        </li>
      </ul>
    </div>
  </section>
</template>
