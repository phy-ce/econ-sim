import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/index';
import { clearMarkets, collectOrders, newBook, resetMarkets } from '../../src/market';

// 가계 계획량이 아주 작으면(≤ 1e-9) 시장 수요(mg.demand)에 넣지 않는다 (market.ts collectOrders).
// 예전에는 계획량(plan.goods)이 그대로 남아, 그 시장 수요가 0 이면 체결률 1 로 아무도 팔지 않은 물건값을 내고 돈이 사라졌다
// (마이크로 세계 도구가 찾음, 2026-11-01). 같은 문턱으로 계획량도 0 으로 둔다.
describe('아주 작은 가계 수요', () => {
  it('시장 수요에 넣지 않은 계획량은 돈을 내지 않는다', () => {
    const w = createWorld(7, { withPlayer: false });
    const r = w.regions[0];
    // 그 지역의 다른 수요를 모두 없앤다: 건물은 쉬게 하고, 다른 pop 은 소비하지 않는 크기로
    for (const b of w.buildings) b.active = false;
    const p = w.pops.find((x) => x.regionId === r.id && x.size > 10)!;
    for (const x of w.pops) if (x.regionId === r.id && x !== p) x.size = 0;
    // 예산을 아주 작게: 식량 계획량이 1e-9 아래로 줄어든다
    p.savings = 1e-13; p.incomeEma = 0;
    const before = p.lastSpend, savings = p.savings;
    resetMarkets(w);
    const book = newBook();
    collectOrders(w, book);
    clearMarkets(w, book);
    expect(p.lastSpend).toBe(before);
    expect(p.savings).toBeGreaterThanOrEqual(savings);
    const plan = book.plans.find((x) => x.pop === p)!;
    expect(plan.goods.some((q) => q > 0 && q <= 1e-9)).toBe(false);
  });
});
