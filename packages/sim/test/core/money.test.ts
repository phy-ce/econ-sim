import { describe, expect, it } from 'vitest';
import { createWorld, moneyIdentity, roundWorld, roundingDrift, step } from '../../src/index';

describe('경제 불변식: 화폐', () => {
  it('화폐 총량이 장부와 센트까지 맞는다 (대륙 + 해외 계정 = 시작 + 주조 + 국채 − 상환 − 이자 − 소멸)', () => {
    const w = createWorld(7);
    const m0 = moneyIdentity(w);
    // 매일 확인한다: 하루 안에 생겼다가 나중에 상쇄되는 누수도 잡는다 (합계 한 번이라 싸다)
    let worst = 0, worstTick = 0, negFund = 0;
    for (let i = 0; i < 360 * 3; i++) {
      step(w);
      const drift = Math.abs(moneyIdentity(w) - m0);
      if (drift > worst) { worst = drift; worstTick = w.tick; }
      if (w.fund < 0) negFund++;
    }
    expect(w.mint.minted).toBeGreaterThan(0);
    // 돈 계정은 날마다 센트로 맞추므로 장부도 센트까지 그대로다 (합계의 부동소수점 오차만 남는다): 한 센트라도 어긋나면 잡는다
    expect(worst, `가장 큰 어긋남: ${worstTick}일`).toBeLessThan(1e-3);
    // 하루 0.005 미만의 누수는 마지막 반올림(주인 없는 돈)이 지워서 장부에 안 보인다. 지운 양이 부동소수점 찌꺼기뿐이어야 누수가 없다
    // (찌꺼기는 20년 × 시드 1~4에서 하루 최대 4.7e-7: 큰 계정(3억)의 덧셈 오차다)
    expect(roundingDrift(w)).toBeLessThan(1e-5);
    // 센트 아래는 버려서 주인 없는 돈이 받으므로 주인 없는 돈은 음수가 되지 않는다
    expect(negFund).toBe(0);
  });

  it('센트 아래 누수도 드러난다 (반올림이 지운 양)', () => {
    const w = createWorld(7);
    step(w);
    const m0 = moneyIdentity(w);
    expect(roundingDrift(w)).toBeLessThan(1e-5);
    // 짝 없이 0.004를 없앤다: 장부는 반올림이 메워서 그대로지만, 반올림이 지운 양에 나타난다
    w.pops.find((p) => p.savings > 1)!.savings -= 0.004;
    roundWorld(w);
    expect(Math.abs(moneyIdentity(w) - m0)).toBeLessThan(1e-3);
    expect(roundingDrift(w)).toBeGreaterThan(0.0039);
  });
});
