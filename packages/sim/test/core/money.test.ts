import { describe, expect, it } from 'vitest';
import { createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';

/**
 * 화폐 장부의 허용 오차: 화폐 총량 × 1e-12.
 * 돈은 반올림하지 않은 double 이라, 같은 돈이 오가도 큰 계정(국고 수억)에 더하고 빼는 순간 그 계정의 ulp(약 1e-8~1e-7)만큼 어긋날 수 있다.
 * 하루 수천 번의 덧셈이 쌓여도 어긋남은 화폐 총량의 1e-14 언저리다 (시드 7, 3년: 최대 8e-15, 약 3e-6 플로린).
 * 1e-12 는 그보다 100배 넉넉하고 1센트보다 훨씬 작다 (총량 4억이면 0.0004 플로린): 짝 없는 돈은 대개 이보다 몇 자리 크다
 */
const MONEY_TOLERANCE = 1e-12;
const moneyDrift = (w: World, m0: number) => Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w));

describe('경제 불변식: 화폐', () => {
  it('화폐 총량이 장부와 맞는다 (대륙 + 해외 계정 = 시작 + 주조 + 국채 − 상환 − 이자 − 소멸)', () => {
    const w = createWorld(7);
    const m0 = moneyIdentity(w);
    // 매일 확인한다: 하루 안에 생겼다가 나중에 상쇄되는 누수도 잡는다 (합계 한 번이라 싸다)
    let worst = 0, worstTick = 0, negFund = 0;
    for (let i = 0; i < 360 * 3; i++) {
      step(w);
      const drift = moneyDrift(w, m0);
      if (drift > worst) { worst = drift; worstTick = w.tick; }
      if (w.fund < 0) negFund++;
    }
    expect(w.mint.minted).toBeGreaterThan(0);
    expect(worst, `가장 큰 어긋남 (화폐 총량 대비): ${worstTick}일`).toBeLessThan(MONEY_TOLERANCE);
    // 주인 없는 돈은 받기만 하고 매주 금융가로 나간다: 음수가 되지 않는다
    expect(negFund).toBe(0);
  });

  it('센트보다 작은 누수도 드러난다', () => {
    const w = createWorld(7);
    step(w);
    const m0 = moneyIdentity(w);
    // 짝 없이 0.001 을 없애면 장부가 그만큼 어긋난다 (허용 오차는 그보다 작다)
    w.pops.find((p) => p.savings > 1)!.savings -= 0.001;
    expect(moneyDrift(w, m0)).toBeGreaterThan(MONEY_TOLERANCE);
  });
});
