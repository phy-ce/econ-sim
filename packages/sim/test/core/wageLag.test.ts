import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SCRIPTED_HARVESTS, SKILLS, TUNE, createWorld, harvestFactor, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { PREMIUM_MAX } from '../../src/ai';
import { firstDiff } from '../helpers';

// 임금 지연 고치기 (wt-wagelag): A1 상회 웃돈(aiWagePremium), A2 국영 임금 지키기(aiAdminWage 2), W1 오를 때 속도(wageMarketRateUp)를 켜도
// 화폐 보존·결정성(저장/불러오기)이 지켜지고 웃돈이 범위 안에 있다. 정해 둔 흉작(SCRIPTED_HARVESTS)은 그 지역·기간에만 산출을 깎는다
const KEYS = ['aiWagePremium', 'aiAdminWage', 'wageMarketRateUp'] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, TUNE[k]]));
beforeAll(() => { Object.assign(TUNE, { aiWagePremium: 1, aiAdminWage: 2, wageMarketRateUp: 0.01 }); });
afterAll(() => { Object.assign(TUNE, saved); SCRIPTED_HARVESTS.length = 0; });

const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

describe('임금 지연 스위치 (A1·A2·W1)', () => {
  it('화폐 총량이 장부와 맞고 웃돈이 0~상한 안이다', () => {
    const w = createWorld(1);
    const m0 = moneyIdentity(w);
    let worst = 0;
    for (let i = 0; i < 300; i++) {
      step(w);
      worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w)));
    }
    expect(worst).toBeLessThan(1e-12);
    const firms = w.companies.filter((c) => !c.state && !c.isPlayer);
    expect(firms.some((c) => c.aiPremium && Object.keys(c.aiPremium).length > 0)).toBe(true);
    for (const c of firms) for (const x of Object.values(c.aiPremium ?? {})) for (const s of SKILLS) {
      expect(x.off[s]).toBeGreaterThanOrEqual(0);
      expect(x.off[s]).toBeLessThanOrEqual(PREMIUM_MAX);
    }
  });

  it('저장/불러오기 해도 결과가 같다', () => {
    const a = createWorld(2);
    runTo(a, 260);
    const want = JSON.stringify(a);
    let b = createWorld(2);
    runTo(b, 203);
    b = reload(b);
    runTo(b, 260);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? 'differs');
  });

  it('정해 둔 흉작은 그 지역·기간의 소작지·농지만 깎는다', () => {
    const w = createWorld(3);
    const r = w.regions[0], other = w.regions[1];
    SCRIPTED_HARVESTS.push({ kind: 'drought', lands: ['arable'], intensity: 4, cut: 0.2, origin: r.id, regionId: r.id, start: 10, end: 20 });
    expect(harvestFactor(w, r.id, 'arable', 15)).toBeCloseTo(0.8, 12);
    expect(harvestFactor(w, r.id, 'forest', 15)).toBe(1);
    expect(harvestFactor(w, other.id, 'arable', 15) === 0.8).toBe(false);
    expect(harvestFactor(w, r.id, 'arable', 20) === 0.8).toBe(false);
    SCRIPTED_HARVESTS.length = 0;
  });
});
