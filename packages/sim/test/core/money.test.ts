import { describe, expect, it } from 'vitest';
import { createWorld, moneyIdentity, step } from '../../src/index';

describe('경제 불변식: 화폐', () => {
  it('화폐 총량이 장부와 맞는다 (대륙 + 해외 계정 = 시작 + 주조 + 국채 − 상환 − 이자 − 소멸)', () => {
    const w = createWorld(7);
    const m0 = moneyIdentity(w);
    // 매일 확인한다: 하루 안에 생겼다가 나중에 상쇄되는 누수도 잡는다 (합계 한 번이라 싸다)
    let worst = 0, worstTick = 0;
    for (let i = 0; i < 360 * 3; i++) {
      step(w);
      const drift = Math.abs(moneyIdentity(w) - m0) / m0;
      if (drift > worst) { worst = drift; worstTick = w.tick; }
    }
    expect(w.mint.minted).toBeGreaterThan(0);
    expect(worst, `가장 큰 어긋남: ${worstTick}일`).toBeLessThan(1e-9);
    expect(Math.abs(moneyIdentity(w) - m0) / m0).toBeLessThan(1e-9);
  });
});
