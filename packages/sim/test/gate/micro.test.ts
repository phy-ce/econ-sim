import { afterAll, describe, expect, it } from 'vitest';
import { ABS_LIMITS, BUILDING_TYPES, SUBSISTENCE, TUNE, createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { applyMicroShock, createMicroWorld, microInfo, microScaleActive, restoreMicroScale } from '../../src/lab/micro';
import type { MicroOptions } from '../../src/lab/micro';
import { microTrace } from '../../src/lab/microtrace';
import { worldHash } from '../fixtures/a0';

// 마이크로 세계 (src/lab/micro.ts): 만들기·1년 돌리기가 예외 없이 끝나고, 매일 화폐 항등식을 지키고, 같은 opts 는 같은 세계를 내고,
// 관측(microTrace)은 세계를 바꾸지 않고, 축소를 끄면 표가 본 게임 값으로 돌아온다.
// 화폐 허용 오차는 test/core/money.test.ts 와 같은 화폐 총량 × 1e-12.

const YEAR = 360;
const tables = () => JSON.stringify({ b: BUILDING_TYPES, s: SUBSISTENCE, t: TUNE, a: ABS_LIMITS });
const before = tables();
const fullHash = worldHash(createWorld(1, { withPlayer: false }));

function runMicro(opts: MicroOptions, days: number, onDay?: (w: World) => void): World {
  const w = createMicroWorld(opts);
  for (let d = 0; d < days; d++) { step(w); onDay?.(w); }
  return w;
}

afterAll(() => restoreMicroScale());

describe('마이크로 세계', () => {
  it('만들기와 1년: 예외 없음, 매일 화폐 항등식, 인구 약 400명·일하는 사람 약 100명', () => {
    const w = createMicroWorld({ seed: 1 });
    const people = w.pops.reduce((a, p) => a + p.size, 0);
    expect(people).toBe(400);
    expect(w.kingdoms.length).toBe(1);
    expect(w.regions.length).toBe(1);
    expect(microInfo(w)?.scale).toBeCloseTo(1 / 50);
    const m0 = moneyIdentity(w);
    let worst = 0;
    for (let d = 0; d < YEAR; d++) {
      step(w);
      worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w)));
    }
    expect(worst).toBeLessThan(1e-12);
    expect(w.tick).toBe(YEAR);
  });

  it('같은 opts 두 번은 같은 세계 (지역 2개·충격 포함, 1년)', () => {
    const opts: MicroOptions = { seed: 2, people: [240, 160] };
    const shocks = (w: World) => {
      if (w.tick === 100) applyMicroShock(w, { t: 100, kind: 'build', type: 'farm', levels: 1 });
      if (w.tick === 150) applyMicroShock(w, { t: 150, kind: 'people', n: 40, region: 1 });
      if (w.tick === 200) applyMicroShock(w, { t: 200, kind: 'need', mul: { clothing: 1.5 } });
    };
    const a = runMicro(opts, YEAR, shocks);
    const ha = worldHash(a);
    const b = runMicro(opts, YEAR, shocks);
    expect(b.regions.length).toBe(2);
    expect(worldHash(b)).toBe(ha);
  });

  it('관측(microTrace)을 매일 해도 세계가 같다 (90일)', () => {
    const off = worldHash(runMicro({ seed: 3 }, 90));
    const rows: number[] = [];
    const on = worldHash(runMicro({ seed: 3 }, 90, (w) => { rows.push(microTrace(w).pops.length); }));
    expect(on).toBe(off);
    expect(rows.every((n) => n > 0)).toBe(true);
  });

  it('축소를 끄면 표와 본 게임 세계가 처음과 같다', () => {
    createMicroWorld({ seed: 1 });
    expect(microScaleActive()).not.toBeNull();
    restoreMicroScale();
    expect(microScaleActive()).toBeNull();
    expect(tables()).toBe(before);
    expect(worldHash(createWorld(1, { withPlayer: false }))).toBe(fullHash);
  });
});
