import { afterAll, describe, expect, it } from 'vitest';
import { HARVEST_SEASON_DAYS, TUNE, createWorld, harvestCondition, step } from '../../src/index';
import type { World } from '../../src/index';
import { firstDiff } from '../helpers';

// 기상 조건이 걸린 채로 저장/불러오기 하는 경우. 기본 확률(3%)로는 짧은 실행에 조건이 거의 없어서 확률을 올린다
const saved = TUNE.harvestChance;
TUNE.harvestChance = 0.5;
afterAll(() => { TUNE.harvestChance = saved; });

const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };
const affected = (w: World) => w.regions.filter((r) => harvestCondition(w, r.id)).length;

describe('기상 조건', () => {
  it('조건이 걸린 채로 저장/불러오기 해도 결과가 같다', () => {
    const a = createWorld(42);
    runTo(a, 200);
    const want = JSON.stringify(a);

    let b = createWorld(42);
    runTo(b, 100);
    expect(affected(b)).toBeGreaterThan(0);
    b = reload(b);
    runTo(b, 147);
    b = reload(b);
    runTo(b, 200);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? 'differs');
  });

  it('번진 조건은 진원지에 같은 조건이 걸려 있을 때만 있다', () => {
    const w = createWorld(1);
    let spread = 0;
    for (let seed = 1; seed <= 10; seed++) {
      w.seed = seed;
      for (let s = 1; s <= 200; s++) {
        const t = s * HARVEST_SEASON_DAYS;
        for (const r of w.regions) {
          const c = harvestCondition(w, r.id, t);
          if (!c || c.origin === r.id) continue;
          spread++;
          expect(r.neighbors).toContain(c.origin);
          const o = harvestCondition(w, c.origin, t);
          expect(o && o.origin === c.origin && o.start === c.start && o.kind === c.kind).toBe(true);
        }
      }
    }
    expect(spread).toBeGreaterThan(0);
  });
});
