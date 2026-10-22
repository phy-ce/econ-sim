import { describe, expect, it } from 'vitest';
import { BUILDING_BY_ID, buildingEcon, createWorld, moneyIdentity, step } from '../../src/index';

describe('건물 수지·지분 (buildingEcon, b.payout)', () => {
  it('지분 합이 1, 배당 기록이 회사 장부와 맞고, 화폐 총량은 그대로다', () => {
    const w = createWorld(7);
    const m0 = moneyIdentity(w);
    for (let i = 0; i < 7 * 8; i++) step(w);
    expect(Math.abs(moneyIdentity(w) - m0)).toBeLessThan(1e-3);
    let anyPaid = 0;
    for (const b of w.buildings) {
      if (BUILDING_BY_ID[b.typeId].auto || b.level <= 0) continue;
      const e = buildingEcon(w, b);
      expect(e.day.profit).toBeCloseTo(e.day.sales - e.day.inputs - e.day.wages, 1);
      expect(e.profitWeekPerLevel * b.level).toBeCloseTo(e.profitWeek, 0);
      if (e.owners.length) expect(e.owners.reduce((a, o) => a + o.share, 0)).toBeCloseTo(1, 6);
      if (b.stateOwned) expect(e.dividendsWeek).toBeCloseTo(b.payout?.crown ?? 0, 1);
      if (e.hasReserve) expect(e.reserve).toBeLessThanOrEqual(e.reserveCap + 0.01);
      const own = e.owners.reduce((a, o) => a + o.dividendWeek, 0) + Object.values(e.ownerless).reduce((a, x) => a + x, 0);
      expect(own).toBeCloseTo(e.dividendsWeek, 1);
      anyPaid += e.dividendsWeek;
    }
    // 민간 회사가 지난주 낸 배당(lastLedger.dividends)과 건물별 기록 합이 같다
    for (const c of w.companies) {
      if (c.state) continue;
      let sum = 0;
      for (const b of w.buildings) if (b.companyId === c.id && b.payout) for (const v of Object.values(b.payout.paid)) sum += v;
      expect(sum).toBeCloseTo(c.lastLedger?.dividends ?? 0, 0);
    }
    expect(anyPaid).toBeGreaterThan(0);
  });
});
