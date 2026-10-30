// 저장/불러오기(JSON 왕복 + migrateWorld, 화면 워커와 같은 경로)는 세계 구조를 그대로 돌려준다 (오버홀 T4, docs/overhaul/10_ARCHITECTURE.md 8.1).
// determinism.test.ts 는 JSON.parse 만 거친 이어 달리기를 본다. 여기서는 JSON 이 잃는 값(undefined·NaN·Infinity·−0·Map·Set·클래스)이 없는지와 compat 경로를 본다.
import { describe, expect, it } from 'vitest';
import { createWorld, migrateWorld, step } from '../../src/index';
import type { World } from '../../src/index';
import { firstDiff } from '../helpers';

const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };
/** 화면이 하는 저장/불러오기: 워커가 JSON.stringify 로 저장하고, 불러올 때 JSON.parse 뒤 migrateWorld 를 거친다 (client sim.worker.ts) */
const saveLoad = (w: World): World => {
  const loaded = migrateWorld(JSON.parse(JSON.stringify(w)));
  if (!loaded) throw new Error('migrateWorld 가 지금 판 저장을 거부함');
  return loaded;
};

/** 값이 undefined 여도 되는 칸 (경로의 배열 첨자는 [], 숫자 키는 #). 읽는 쪽이 없는 칸과 같게 다룬다:
 *  logEvent 가 regionId·buildingId 를 늘 칸으로 넣어(economy.ts logEvent) 값이 없으면 undefined 로 남는다 */
const UNDEFINED_OK = new Set(['$.events[].regionId', '$.events[].buildingId']);

/** JSON 왕복에서 잃거나 바뀌는 값을 경로별로 센다 */
function jsonLosses(w: World): string[] {
  const found = new Map<string, number>();
  const add = (k: string) => found.set(k, (found.get(k) ?? 0) + 1);
  const walk = (o: unknown, path: string): void => {
    if (o === undefined) { if (!UNDEFINED_OK.has(path)) add(`undefined ${path}`); return; }
    if (typeof o === 'number') {
      if (Number.isNaN(o)) add(`NaN ${path}`);
      else if (!Number.isFinite(o)) add(`Infinity ${path}`);
      else if (Object.is(o, -0)) add(`-0 ${path}`);
      return;
    }
    if (typeof o === 'function' || typeof o === 'bigint' || typeof o === 'symbol') { add(`${typeof o} ${path}`); return; }
    if (typeof o !== 'object' || o === null) return;
    const proto = Object.getPrototypeOf(o);
    if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) { add(`${(o as object).constructor?.name ?? 'class'} ${path}`); return; }
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length; i++) { if (!(i in o)) add(`빈 칸 ${path}`); walk(o[i], `${path}[]`); }
      return;
    }
    for (const k of Object.keys(o)) walk((o as Record<string, unknown>)[k], `${path}.${/^\d+$/.test(k) ? '#' : k}`);
  };
  walk(w, '$');
  return [...found].map(([k, n]) => `${k} ×${n}`);
}

describe('저장/불러오기 왕복 (T4)', () => {
  const w = createWorld(3);

  it('새 세계: JSON 이 잃는 값이 없고 불러온 세계가 같다', () => {
    expect(jsonLosses(w)).toEqual([]);
    expect(firstDiff(saveLoad(w), w)).toBeNull();
  });

  it('120일: 구조가 같고, migrateWorld 는 지금 판을 바꾸지 않고, 이어 달리면 같다', () => {
    runTo(w, 120);
    expect(jsonLosses(w)).toEqual([]);
    const b = saveLoad(w);
    // 메모리의 세계와 불러온 세계가 칸마다 같다 (Map·Set 이 {} 로, NaN 이 null 로 바뀌면 여기서 잡힌다)
    expect(firstDiff(b, w)).toBeNull();
    // 지금 판 저장에는 compat 이 아무것도 바꾸지 않는다 (writePool 은 하루 끝에 쓴 값과 같다)
    expect(JSON.stringify(b)).toBe(JSON.stringify(w));
    expect(JSON.stringify(saveLoad(b))).toBe(JSON.stringify(b));
    // 주 경계(126일)를 지나 이어 달린다
    runTo(w, 134);
    runTo(b, 134);
    const d = firstDiff(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(w)));
    expect(d).toBeNull();
  });

  it('migrateWorld 는 판 범위 밖 저장을 거부한다', () => {
    const s = JSON.parse(JSON.stringify(createWorld(1))) as { version: number };
    expect(s.version).toBe(18);
    expect(migrateWorld({ ...s, version: 9 })).toBeNull();
    expect(migrateWorld({ ...s, version: 19 })).toBeNull();
    expect(migrateWorld(null)).toBeNull();
  });
});
