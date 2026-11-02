import { afterAll, describe, expect, it } from 'vitest';
import { SKILLS, SKILL_DEFS, TUNE, createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { MARKET_WAGE_RANGE, clearingWage, updateMarketWages, willingAt } from '../../src/labor';
import { marketWageTargets } from '../../src/index';
import { firstDiff } from '../helpers';

// 목표 임금 (wt-wagespeed, 맞는 임금 쪽으로 움직이는 시장 임금): 하루 비율을 바꿔도 화폐 보존·결정성(저장/불러오기)이 지켜지고 시장 임금이 안전 범위 안에 있다.
// (비교용 쏠림 규칙 wageTarget 1 과 옛 고정 속도 0 은 wt-simplify 1-E 에서 지웠다)
// 맞는 임금(clearingWage)은 오려는 사람 ≥ min(자리, 상한에서 오려는 사람)이 되는 가장 낮은 임금이다
const saved = { wageTargetSpeed: TUNE.wageTargetSpeed };
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

{
  describe('목표 임금 (하루 비율 0.05)', () => {
    it('화폐 총량이 장부와 맞고 시장 임금이 안전 범위 안이다', () => {
      Object.assign(TUNE, { wageTargetSpeed: 0.05 });
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
      Object.assign(TUNE, { wageTargetSpeed: 0.05 });
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

// 목표 임금 읽기 (marketWageTargets, UI_CHANGES 2-86): 세계를 바꾸지 않고, 그 목표가 다음 updateMarketWages 가 움직이는 쪽과 같다
describe('목표 임금 읽기 (marketWageTargets)', () => {
  it('세계를 바꾸지 않고, 다음 updateMarketWages 가 그 목표 쪽으로 wageTargetSpeed 만큼 움직인다', () => {
    const w = createWorld(1);
    runTo(w, 120);
    const before = JSON.stringify(w), rng = w.rngState, id = w.nextId;
    const got = w.regions.map((r) => marketWageTargets(w, r.id));
    expect(JSON.stringify(w)).toBe(before);
    expect(w.rngState).toBe(rng);
    expect(w.nextId).toBe(id);
    expect(w.regions.map((r) => marketWageTargets(w, r.id))).toEqual(got);
    const prev = w.regions.map((r) => ({ ...r.wages! }));
    updateMarketWages(w);
    let withJobs = 0;
    w.regions.forEach((r, i) => {
      const t = got[i]!;
      expect(t).not.toBeNull();
      for (const s of SKILLS) {
        const c = t[s], v0 = prev[i][s];
        // 자리가 있으면 목표 쪽으로 차이의 wageTargetSpeed (자격자가 없으면 목표 = 지금 임금), 없으면 시작 임금(목표)으로 바로 간다
        const want = c.jobs > 1e-9 ? v0 + TUNE.wageTargetSpeed * (c.target - v0) : c.target;
        expect(r.wages![s], `${r.id} ${s}`).toBe(want);
        if (c.jobs > 1e-9) {
          withJobs++;
          expect(c.lo).toBeLessThanOrEqual(c.hi);
          if (c.hi > c.lo) { expect(c.target).toBeGreaterThanOrEqual(c.lo); expect(c.target).toBeLessThanOrEqual(c.hi); }
        }
      }
    });
    expect(withJobs).toBeGreaterThan(0);
    Object.assign(TUNE, saved);
  });

  // (TUNE.wageMarket·wageTarget 이 아니면 null 이던 경우는 두 키를 wt-simplify 1-E 에서 지워 없어졌다)
  it('지역이 없거나 지역 시장 임금이 없으면 null', () => {
    const w = createWorld(1);
    const id = w.regions[0].id;
    expect(marketWageTargets(w, -1)).toBeNull();
    const bare = structuredClone(w);
    bare.regions[0].wages = undefined;
    expect(marketWageTargets(bare, id)).toBeNull();
  });
});
