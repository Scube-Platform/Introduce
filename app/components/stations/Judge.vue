<!-- 서버 risk 컨텍스트 — 판정 규칙은 app/lib/collision.ts (CollisionRiskPolicy · CollisionRiskService 이식) -->
<template>
  <section id="judge" class="station station--fade" data-stamp="판정" data-band="light" style="--ground: var(--st-judge)">
    <div class="shell">
      <div class="station__head">
        <div data-in>
          <p class="stamp"><span class="stamp__t inst">판정</span></p>
          <h2 class="h2">울릴 이유보다<br />울리지 않을 이유를 먼저 봐요</h2>
        </div>
        <p class="body" data-in>
          기존 근접경보가 현장에서 꺼지는 건 판정이 틀려서가 아니라 <strong>너무 자주 맞아서</strong>예요. 그래서 필터가 판정보다 먼저예요. 다른 층, 낡은 위치,
          자기가 모는 장비, 서 있는 지게차는 계산하지 않아요. 아래 판정기는 서버의 판정 순서와 기준값을 그대로 옮겼어요. 값을 바꿔 보세요.
        </p>
      </div>

      <CollisionPlayground />

      <div class="also">
        <div class="also__row" data-in>
          <b>구역</b>
          <p>
            경계를 <strong>넘는 순간</strong>만 진입이에요. 자격을 갖추고 통제구역에서 일하는 사람에게 경보하면 그 사람은 곧 시스템을 꺼요 — 그래서 자격 없는
            진입만 위반이에요. 들어간 구역은 2 m 넘게 나가야 이탈이고, 위치 정확도가 10 m 보다 흐리면 진입도 이탈도 말하지 않아요.
          </p>
        </div>
        <div class="also__row" data-in>
          <b>생체</b>
          <p>숫자 하나로 판정하지 않아요. 개인 기준선과 활동량, 지금 있는 구역을 함께 봐요 — 아래 「생존 확인」에서 이어져요.</p>
        </div>
      </div>
    </div>
  </section>
</template>
