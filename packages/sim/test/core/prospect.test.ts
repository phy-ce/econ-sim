import { afterAll, describe, expect, it } from 'vitest';
import { DEPOSITS, HARVEST_SEASON_DAYS, REGIONS, TUNE, createWorld, step } from '../../src/index';
import type { World } from '../../src/index';
import { firstDiff } from '../helpers';

// 탐광: 짧은 실행에서도 광맥을 찾도록 확률을 올린다
const saved = TUNE.prospectChance;
TUNE.prospectChance = 0.5;
afterAll(() => { TUNE.prospectChance = saved; });

const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };
const found = (w: World) => w.regions.reduce((a, r) => a + DEPOSITS.reduce((b, d) => b + r.deposits[d], 0), 0);

describe('탐광', () => {
  it('계절이 바뀌는 날에 저장/불러오기 해도 찾는 광맥이 같고, 잠재량을 넘지 않는다', () => {
    const a = createWorld(7);
    const start = found(a);
    runTo(a, 3 * HARVEST_SEASON_DAYS + 5);
    const want = JSON.stringify(a);
    expect(found(a)).toBeGreaterThan(start);

    let b = createWorld(7);
    runTo(b, HARVEST_SEASON_DAYS);
    b = reload(b);
    runTo(b, 2 * HARVEST_SEASON_DAYS);
    b = reload(b);
    runTo(b, 3 * HARVEST_SEASON_DAYS + 5);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? 'differs');

    // 찾은 광맥은 잠재량을 넘지 않고, land.ore 는 그 합이다
    for (const r of a.regions) {
      const def = REGIONS.find((d) => d.id === r.id)!;
      for (const d of DEPOSITS) expect(r.deposits[d]).toBeLessThanOrEqual(def.veins[d]);
      expect(r.land.ore).toBe(DEPOSITS.reduce((x, d) => x + r.deposits[d], 0));
    }
  });
});
