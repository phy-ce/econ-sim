import { afterAll, describe, expect, it } from 'vitest';
import { TUNE, createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { firstDiff } from '../helpers';

// 저택 거둠을 저택의 필요·고용인 수로 조절 (TUNE.manorTargetMult·manorGentrySeats, 시제품, 기본 0 = 끔, DESIGN 4장):
// 켠 세계에서도 화폐 보존·결정성(저장/불러오기)이 지켜지고, 저택 하급 귀족이 상한을 넘지 않으며, 거두는 양이 줄어 소작농 저축이 끈 세계보다 많다.
const saved = { manorTargetMult: TUNE.manorTargetMult, manorGentrySeats: TUNE.manorGentrySeats };
const ON = { manorTargetMult: 3, manorGentrySeats: 50 };
Object.assign(TUNE, ON);
afterAll(() => { Object.assign(TUNE, saved); });

/** money.test.ts 와 같은 허용 오차: 화폐 총량 × 1e-12 */
const MONEY_TOLERANCE = 1e-12;
const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };
const END = 240;
const peasantSavings = (w: World) => w.pops.reduce((a, p) => a + (p.prof === 'peasant' ? p.savings : 0), 0);

describe('저택 거둠 조절 (manorTargetMult > 0, manorGentrySeats > 0)', () => {
  it('화폐 총량이 장부와 맞고, 저택 하급 귀족이 상급 귀족 자리 × 상한 ÷ 100 을 넘지 않으며, 소작농 저축이 끈 세계보다 많다', () => {
    const w = createWorld(42);
    const m0 = moneyIdentity(w);
    let worst = 0, checked = 0;
    while (w.tick < END) {
      step(w);
      worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w)));
      for (const b of w.buildings) {
        if (b.typeId !== 'manor' || b.nobleSeats === undefined) continue;
        expect(b.employed.gentry).toBeLessThanOrEqual((b.nobleSeats * ON.manorGentrySeats) / 100 + 1e-6);
        checked++;
      }
    }
    expect(worst).toBeLessThan(MONEY_TOLERANCE);
    expect(checked).toBeGreaterThan(0);
    const on = peasantSavings(w);
    Object.assign(TUNE, saved);
    try {
      const off = createWorld(42);
      runTo(off, END);
      expect(on).toBeGreaterThan(peasantSavings(off));
    } finally {
      Object.assign(TUNE, ON);
    }
  });

  it('켠 채로 저장/불러오기 해도 결과가 같다', () => {
    const a = createWorld(42);
    runTo(a, END);
    const want = JSON.stringify(a);
    let b = createWorld(42);
    runTo(b, 100);
    b = reload(b);
    runTo(b, 177);
    b = reload(b);
    runTo(b, END);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? 'differs');
  });
});
