import { describe, expect, it } from 'vitest';
import { SKILLS, createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { firstDiff } from '../helpers';

// 지역 시장 임금 (2026-11-02 기본 규칙, 스위치 wageMarket 은 wt-simplify 1-E 에서 지웠다): 화폐 보존·결정성(저장/불러오기)이 지켜지고,
// 지역 임금이 없는 저장(옛 저장, 또는 회사 임금표 규칙으로 저장한 판)을 불러와도 시작 임금 규칙으로 채워 돈다.

const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

describe('지역 시장 임금', () => {
  it('화폐 총량이 장부와 맞는다', () => {
    const w = createWorld(7);
    const m0 = moneyIdentity(w);
    let worst = 0;
    for (let i = 0; i < 360; i++) {
      step(w);
      worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w)));
    }
    expect(worst).toBeLessThan(1e-12);
    for (const r of w.regions) for (const s of SKILLS) expect(Number.isFinite(r.wages![s]) && r.wages![s] > 0).toBe(true);
  });

  it('저장/불러오기 해도 결과가 같다', () => {
    const a = createWorld(42);
    runTo(a, 150);
    const want = JSON.stringify(a);
    let b = createWorld(42);
    runTo(b, 61);
    b = reload(b);
    runTo(b, 150);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? 'differs');
  });

  it('지역 임금이 없는 저장도 시작 임금 규칙으로 채워 돈다', () => {
    const w = createWorld(3);
    runTo(w, 30);
    const old = reload(w);
    for (const r of old.regions) { delete r.wages; delete r.wageAvg; delete r.stateWages; }
    runTo(old, 40);
    for (const r of old.regions) expect(r.wages && r.wageAvg).toBeTruthy();
  });
});
