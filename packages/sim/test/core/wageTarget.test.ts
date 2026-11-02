import { afterAll, describe, expect, it } from 'vitest';
import { SKILLS, SKILL_DEFS, TUNE, createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { MARKET_WAGE_RANGE, clearingWage, willingAt } from '../../src/labor';
import { firstDiff } from '../helpers';

// 목표 임금 (wt-wagespeed, TUNE.wageTarget 1·2): 켜도 화폐 보존·결정성(저장/불러오기)이 지켜지고 시장 임금이 안전 범위 안에 있다.
// 맞는 임금(clearingWage)은 오려는 사람 ≥ min(자리, 상한에서 오려는 사람)이 되는 가장 낮은 임금이다
const saved = { wageTarget: TUNE.wageTarget, wageTargetSpeed: TUNE.wageTargetSpeed };
afterAll(() => { Object.assign(TUNE, saved); });

const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

describe('맞는 임금 (clearingWage)', () => {
  // 고정 2명, 지금 소득 2·4 인 사람이 각각 1명분 (switchPremium 1.1 → 2.2·4.4 넘게부터 오기 시작해 소득의 2배에서 다 온다)
  const cv = { fixed: 2, base: [1, 1], cur: [2, 4] };
  it('사람이 남으면 하한, 더 올려도 올 사람이 없으면 다 오는 가장 낮은 임금', () => {
    expect(clearingWage(cv, 1, 1, 100)).toBe(1);
    expect(clearingWage(cv, 2, 1, 100)).toBe(1);
    const top = clearingWage(cv, 50, 1, 100);
    expect(willingAt(cv, top)).toBeCloseTo(4, 6);
    expect(top).toBeCloseTo(8, 6);
  });
  it('그 사이에서는 오려는 사람 = 자리', () => {
    for (const jobs of [2.5, 3, 3.4, 3.9]) {
      const v = clearingWage(cv, jobs, 1, 100);
      expect(willingAt(cv, v)).toBeGreaterThanOrEqual(jobs - 1e-8);
      expect(willingAt(cv, v * (1 - 1e-6))).toBeLessThan(jobs + 1e-9);
    }
  });
});

for (const mode of [1, 2]) {
  describe(`목표 임금 wageTarget ${mode}`, () => {
    it('화폐 총량이 장부와 맞고 시장 임금이 안전 범위 안이다', () => {
      Object.assign(TUNE, { wageTarget: mode, wageTargetSpeed: 0.05 });
      const w = createWorld(1);
      const m0 = moneyIdentity(w);
      let worst = 0;
      for (let i = 0; i < 300; i++) {
        step(w);
        worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w)));
      }
      expect(worst).toBeLessThan(1e-12);
      for (const r of w.regions) for (const s of SKILLS) {
        const v = r.wages![s], b = SKILL_DEFS[s].baseWage;
        expect(v).toBeGreaterThanOrEqual(b * MARKET_WAGE_RANGE[0] - 1e-9);
        expect(v).toBeLessThanOrEqual(b * MARKET_WAGE_RANGE[1] + 1e-9);
      }
      Object.assign(TUNE, saved);
    });

    it('저장/불러오기 해도 결과가 같다', () => {
      Object.assign(TUNE, { wageTarget: mode, wageTargetSpeed: 0.05 });
      const a = createWorld(2);
      runTo(a, 200);
      const want = JSON.stringify(a);
      let b = createWorld(2);
      runTo(b, 143);
      b = reload(b);
      runTo(b, 200);
      const got = JSON.stringify(b);
      Object.assign(TUNE, saved);
      if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? 'differs');
    });
  });
}
