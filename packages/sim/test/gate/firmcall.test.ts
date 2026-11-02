import { afterAll, describe, expect, it } from 'vitest';
import { moneyIdentity, step, totalMoney } from '../../src/index';
import { FLOW } from '../../src/kingdoms';
import { applyMicroShock, createMicroWorld, restoreMicroScale } from '../../src/lab/micro';

// 주인 운전자금 (finance.ts opsDay·callCapital, DECISIONS 7-40): 민간 상회 현금을 14일 동안 매일 0 으로 비운 뒤
// (drain 충격: 그 돈을 레벨 주인 금고로 옮긴다) 매일 화폐 항등식을 지키고, 주인 금고에서 상회로 운전자금이 옮겨진다.
// (실제로 쓴 돈만 세던 옛 갈래 firmCallPlan 0 은 2026-11-02 wt-simplify 1-C 에서 지웠다)
// 판정은 코드 동작(돈이 옮겨지는지, 화폐 보존)만 본다. 상회가 다시 살아나는지는 cli/microcheck.ts --runs drain --sections k 의 표로 본다.
// 화폐 허용 오차는 test/core/money.test.ts 와 같은 화폐 총량 × 1e-12.

const DRAIN_AT = 60, DRAIN_DAYS = 14, DAYS = DRAIN_AT + DRAIN_DAYS + 28;
const callFlow = () => (FLOW['call.manor'] ?? 0) + (FLOW['call.finance'] ?? 0);

function run() {
  try {
    const w = createMicroWorld({ seed: 1, typeScale: { workshop: 0.15, textile: 0.25, fiber_farm: 0.25 } });
    const m0 = moneyIdentity(w);
    let worst = 0, called = 0;
    for (let d = 0; d < DAYS; d++) {
      if (w.tick >= DRAIN_AT && w.tick < DRAIN_AT + DRAIN_DAYS) applyMicroShock(w, { t: w.tick, kind: 'drain' });
      const c0 = callFlow();
      step(w);
      if (w.tick > DRAIN_AT + DRAIN_DAYS) called += callFlow() - c0;
      worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w)));
    }
    return { worst, called };
  } finally {
    restoreMicroScale();
  }
}

afterAll(() => restoreMicroScale());

describe('주인 운전자금 (현금 0 함정)', () => {
  it('상회 현금을 비운 뒤: 매일 화폐 항등식, 금고에서 상회로 돈이 옮겨진다', () => {
    const on = run();
    expect(on.worst).toBeLessThan(1e-12);
    expect(on.called).toBeGreaterThan(0);
  });
});
