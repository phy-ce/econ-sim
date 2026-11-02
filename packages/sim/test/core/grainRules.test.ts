import { afterEach, describe, expect, it } from 'vitest';
import { TUNE } from '../../src/data';
import { createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';

// 곡물 S/D 세계 규칙 후보 (이슈 #11, docs/overhaul/GRAIN_RULES.md, DECISIONS 7-51): 기본은 모두 끔이다.
// 켰을 때도 화폐 보존과 결정성(저장/불러오기)이 지켜지는지만 본다 (경제 결과는 보지 않는다)
const ON = { wageFloorWeeks: 52, tenantSellRef: 1, grainEatElast: 1, tenantKindSigma: 1, grainSurplusCap: 0.5, surplusGrowth: 0.1 };
const before: Record<string, unknown> = {};
const set = () => { for (const [k, v] of Object.entries(ON)) { before[k] = (TUNE as Record<string, unknown>)[k]; (TUNE as Record<string, unknown>)[k] = v; } };
afterEach(() => { for (const [k, v] of Object.entries(before)) (TUNE as Record<string, unknown>)[k] = v; });

const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

describe('곡물 세계 규칙 후보 (켬)', () => {
  it('화폐가 보존되고 남는 식량(⑦)이 실제로 생긴다', () => {
    set();
    const w = createWorld(3);
    const m0 = moneyIdentity(w);
    let worst = 0;
    for (let i = 0; i < 240; i++) {
      step(w);
      worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w)));
    }
    expect(worst).toBeLessThan(1e-12);
    expect(w.pops.some((p) => (p.foodSurplus ?? 0) > 0)).toBe(true);
    expect(w.regions.every((r) => r.tenantAvg !== undefined)).toBe(true);
  });

  it('같은 시드는 같은 결과를 낸다 (저장/불러오기 포함)', () => {
    set();
    const a = createWorld(5);
    runTo(a, 150);
    const want = JSON.stringify(a);
    let b = createWorld(5);
    runTo(b, 80);
    b = reload(b);
    runTo(b, 150);
    expect(JSON.stringify(b) === want).toBe(true);
  });
});
