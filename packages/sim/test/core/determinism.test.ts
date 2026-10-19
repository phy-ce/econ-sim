import { describe, expect, it } from 'vitest';
import { TICKS_PER_WEEK, createWorld, hasOwnCash, migrateWorld, moneyIdentity, step } from '../../src/index';
import type { World } from '../../src/index';
import { firstDiff, run } from '../helpers';

/** 저장/불러오기 (게임이 쓰는 것과 같은 JSON 왕복) */
const reload = (w: World): World => JSON.parse(JSON.stringify(w));

/** w 를 tick 까지 진행한다 */
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

/** 두 세계가 같은지: 문자열로 비교하고, 다르면 처음 갈라진 경로를 알려 준다 */
function expectSame(got: World, want: string, label: string) {
  const s = JSON.stringify(got);
  if (s === want) return;
  expect.fail(`${label}: ${firstDiff(JSON.parse(s), JSON.parse(want))}`);
}

describe('결정성', () => {
  // a 는 끊김 없이, b 는 두 번 저장/불러오기 하며 같은 시드로 돌린다.
  // 첫 저장은 주 중간(100일), 둘째는 주 경계 직후(147일 = 21주, 주간 처리·장부 이월 바로 뒤)다.
  // 비교는 첫 주간 처리 직후(105일)와 4주 정책 점검·지표 기록을 지난 끝(200일)에서 한다
  it('같은 시드는 같은 결과를 낸다 (저장/불러오기 포함)', () => {
    expect(147 % TICKS_PER_WEEK).toBe(0);
    expect(105 % TICKS_PER_WEEK).toBe(0);
    const a = createWorld(42);
    runTo(a, 105);
    const a105 = JSON.stringify(a);
    runTo(a, 200);
    const a200 = JSON.stringify(a);

    let b = createWorld(42);
    runTo(b, 100);
    b = reload(b);
    runTo(b, 105);
    expectSame(b, a105, '105일 (100일 저장 후 첫 주 경계)');
    runTo(b, 147);
    b = reload(b);
    runTo(b, 200);
    expectSame(b, a200, '200일 (147일 주 경계 저장 후)');
  });
});

describe('저장 변환', () => {
  it('4판 저장을 5판으로 바꾸고 돈이 보존된다', () => {
    const w = createWorld(6);
    run(w, 40);
    // 4판 모양으로 되돌린다: 건물 현금을 주인 회사 현금으로 옮기고 새 필드를 지운다
    const old = JSON.parse(JSON.stringify(w)) as Record<string, any>;
    for (const b of old.buildings) {
      const c = old.companies.find((x: any) => x.id === b.companyId);
      c.cash += b.cash;
      delete b.cash; delete b.wages; delete b.week; delete b.lastWeek; delete b.lastEmployed; delete b.subsidized;
    }
    for (const c of old.companies) { c.wageOffset = null; c.weekStartCash = c.cash; c.revenueEma = 0; delete c.ledger.subsidies; delete c.lastLedger.subsidies; }
    for (const k of old.kingdoms) { k.budget.wages = 3; k.wageIndex = 0.8; }
    old.version = 4;
    const m = moneyIdentity(w);
    const mig = migrateWorld(old)!;
    expect(mig.version).toBe(5);
    expect(Math.abs(moneyIdentity(mig) - m) / m).toBeLessThan(1e-9);
    // 건물 현금은 주인 회사 현금에서 옮긴 시작 현금 (소수 2자리, 빌리지 않는다)
    for (const b of mig.buildings) {
      expect(b.wages.unskilled).toBeGreaterThan(0);
      expect(b.cash).toBeGreaterThanOrEqual(0);
      expect(Math.abs(b.cash * 100 - Math.round(b.cash * 100))).toBeLessThan(1e-6);
      if (!hasOwnCash(b)) expect(b.cash).toBe(0);
    }
    expect(mig.buildings.some((b) => b.cash > 0)).toBe(true);
    for (const c of mig.companies) expect(c.cash).toBeGreaterThanOrEqual(-1e-6);
    expect(mig.kingdoms[0].budget).toEqual({ tax: w.kingdoms[0].budget.tax, research: w.kingdoms[0].budget.research });
    run(mig, 30);
    expect(Math.abs(moneyIdentity(mig) - m) / m).toBeLessThan(1e-9);
    expect(migrateWorld({ version: 3 })).toBeNull();
  });
});
