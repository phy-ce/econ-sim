import { afterAll, describe, expect, it } from 'vitest';
import { TUNE, createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { firstDiff } from '../helpers';

// 마이크로 시제품에서 고른 스위치 (2026-11-01, 기본 끔)를 모두 켠 세계: 마지막 공급자 지킴(aiKeepLastSupplier), 증설 위치(aiGrowWhere),
// 유보로 증설비(aiReserveFund, 회사 현금 → 저택·금융가 금고), 소작지 여유(tenantSlack), 저축을 부에 넣기(wealthSavWeeks).
// 켠 채로 화폐 보존과 결정성(저장/불러오기, 소작지 기준 채움 Region.tenantFill0 포함)이 지켜진다. 시장 임금(wageMarket 1)·증설 확률 1 은 비교 명세의 바탕과 같다.
const ON = { aiKeepLastSupplier: 1, aiGrowWhere: 1, aiReserveFund: 1, tenantSlack: 0.5, wealthSavWeeks: 52, wageMarket: 1, wageMarketRate: 0.0025, reserveGrowMax: 1 };
const saved = Object.fromEntries(Object.keys(ON).map((k) => [k, (TUNE as Record<string, unknown>)[k]]));
Object.assign(TUNE, ON);
afterAll(() => { Object.assign(TUNE, saved); });

/** money.test.ts 와 같은 허용 오차: 화폐 총량 × 1e-12 */
const MONEY_TOLERANCE = 1e-12;
const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };
const END = 480;

describe('마이크로 시제품 스위치를 모두 켠 세계', () => {
  it('화폐 총량이 장부와 맞고, 소작지 기준 채움이 첫 수확에 생긴다', () => {
    const w = createWorld(42);
    const m0 = moneyIdentity(w);
    let worst = 0;
    while (w.tick < END) {
      step(w);
      worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w)));
    }
    expect(worst).toBeLessThan(MONEY_TOLERANCE);
    expect(w.regions.every((r) => r.tenantFill0 !== undefined && r.tenantFill0 > 0)).toBe(true);
  });

  it('켠 채로 저장/불러오기 해도 결과가 같다', () => {
    const a = createWorld(42);
    runTo(a, END);
    const want = JSON.stringify(a);
    let b = createWorld(42);
    runTo(b, 1);
    b = reload(b);
    runTo(b, 400);
    b = reload(b);
    runTo(b, END);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? 'differs');
  });
});
