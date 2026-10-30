// AI 난수 분리 (오버홀 0a, docs/overhaul/10_ARCHITECTURE.md 3.2·4.1·4.7, 8.1 의 T5·T6).
// AI 난수는 공유 난수열이 아니라 (시드, 소금, 태그, 키) 의 해시다. 플레이어 명령이 건물·공사를 하나 더해도 다른 후보가 받는 난수가 밀리지 않는다.
import { afterEach, describe, expect, it } from 'vitest';
import { BUILDING_TYPES, GOODS, TECHS, TUNE, RULES_REV, applyCommandMsg, createWorld, migrateWorld, moneyIdentity, rulesHash, step, totalMoney } from '../../src/index';
import type { Building, World } from '../../src/index';
import { reserveRuled, runAi } from '../../src/ai';
import { ownerBuildings } from '../../src/finance';
import { privatizeLevel } from '../../src/production';
import { aiHash, aiRandTrace, keyCompany, keyIdx, keyRegion, keyStr, strKey } from '../../src/rng/aiRand';
import type { AiTag } from '../../src/rng/aiRand';
import { worldHash } from '../fixtures/a0';
import { run } from '../helpers';

/** 저장/불러오기 (화면 워커와 같은 길) */
const reload = (w: World): World => migrateWorld(JSON.parse(JSON.stringify(w)))!;

/** aiRand 가 불린 (태그|키들) → 값. 같은 키가 두 번 불리면 dup 에 센다 */
function traced(fn: () => void, only?: AiTag): { got: Map<string, number>; dup: string[] } {
  const got = new Map<string, number>(), dup: string[] = [];
  aiRandTrace.on = (_w, tag, keys, v) => {
    if (only && tag !== only) return;
    const k = `${tag}|${keys.join(',')}`;
    if (got.has(k)) dup.push(k);
    got.set(k, v);
  };
  try { fn(); } finally { aiRandTrace.on = undefined; }
  return { got, dup };
}

afterEach(() => { aiRandTrace.on = undefined; });

describe('aiRand 식 (4.1)', () => {
  it('문서의 예시 값과 같다', () => {
    const W = keyIdx(12);
    expect(aiHash(1, 0, 'research', [keyCompany(101), keyStr('milling'), W])).toBeCloseTo(0.700601, 6);
    expect(aiHash(1, 1, 'research', [keyCompany(101), keyStr('milling'), W])).toBeCloseTo(0.757257, 6);
    expect(aiHash(1, 0, 'pick', [keyCompany(101), keyRegion(1), keyStr('farm'), keyStr('farm_basic'), W])).toBeCloseTo(0.208643, 6);
  });

  it('데이터 id(건물 종류·방식·기술·상품)와 태그의 strKey 가 겹치지 않는다 (입력 키 유일성, 07 4.3)', () => {
    const ids = new Set<string>(['research', 'least', 'pick', 'pickDev', 'grow']);
    for (const t of BUILDING_TYPES) { ids.add(t.id); for (const m of t.methods) ids.add(m.id); }
    for (const t of TECHS) ids.add(t.id);
    for (const g of Object.keys(GOODS)) ids.add(g);
    const byKey = new Map<number, string>();
    const clash: string[] = [];
    for (const s of ids) {
      const k = strKey(s);
      if (byKey.has(k)) clash.push(`${byKey.get(k)} / ${s}`);
      byKey.set(k, s);
    }
    expect(ids.size).toBeGreaterThan(80);
    expect(clash).toEqual([]);
  });

  it('키를 바꿔 뽑은 값이 0..1 에 고르게 퍼진다', () => {
    let s = 0, s2 = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const v = aiHash(1, 0, 'pick', [keyCompany(101 + (i % 8)), keyRegion(i % 23), keyIdx(Math.floor(i / 184))]);
      expect(v >= 0 && v < 1).toBe(true);
      s += v; s2 += v * v;
    }
    const mean = s / n, variance = s2 / n - mean * mean;
    expect(Math.abs(mean - 0.5)).toBeLessThan(0.01);
    expect(Math.abs(variance - 1 / 12)).toBeLessThan(0.003);
  });
});

describe('같은 키 같은 난수 (T5, 4.7)', () => {
  const base = createWorld(1);
  run(base, 140);

  // 같은 저장에서 (가) 아무것도 안 한 세계와 (나) 플레이어가 학교 1개를 착공한 세계를 4주 돌린다
  it('플레이어 명령 하나를 더해도 그 뒤 4주 동안 양쪽에 나온 후보 키는 같은 난수를 받는다', () => {
    const a = reload(base), b = reload(base);
    expect(applyCommandMsg(b, 100, { type: 'build', typeId: 'school', regionId: 1, levels: 1 })).toBeNull();
    expect(b.nextId).toBe(a.nextId + 1);
    const ta = traced(() => run(a, 28)), tb = traced(() => run(b, 28));
    const both = [...ta.got.keys()].filter((k) => tb.got.has(k));
    const differ = both.filter((k) => ta.got.get(k) !== tb.got.get(k));
    expect(differ).toEqual([]);
    // 키가 실제로 겹친다 (연구·착공·증설 중 무엇이든 불렸다)
    expect(both.length).toBeGreaterThan(10);
    // 같은 키가 한 번 넘게 불리지 않는다 (같은 주에 여러 번 부르는 착공은 부름 순번 keyIdx 로 키가 갈린다)
    expect(ta.dup).toEqual([]);
    expect(tb.dup).toEqual([]);
  });

  /** 지금 세계에서 주간 AI 를 한 번 돌릴 때의 증설(grow) 키 → 값 (사본에서 돌린다) */
  const growOf = (w: World) => traced(() => runAi(reload(w)), 'grow');
  /** 플레이어 소유 사본을 배열 맨 앞에 끼운다 (AI 는 플레이어 건물을 보지 않으므로 다른 건물이 끼어든 것과 같다) */
  const insertFront = (w: World, like: Building) => { w.buildings.unshift({ ...structuredClone(like), id: w.nextId++, companyId: 100 }); };
  const aiGrowBuilding = (w: World) => w.buildings.find((x) => reserveRuled(x) && !w.companies.find((c) => c.id === x.companyId)!.isPlayer && !x.shrinking)!;

  it('증설 키의 묶음 안 순번은 배열 순서로 센다: 같은 틱에 같은 키 건물 둘이 완공돼도, 다른 건물이 끼어들어도 그대로다', () => {
    const b0 = aiGrowBuilding(base);
    expect(b0).toBeDefined();
    // 같은 (회사, 지역, 종류, 방식) 건물 둘이 같은 틱에 완공된 저장
    // 다른 세계에서는 그 전에 다른 건물이 배열 맨 앞에 끼어들고 id 가 밀려, 둘째 건물이 다른 id 를 받는다
    const addTwin = (w: World) => {
      const orig = w.buildings.find((x) => x.id === b0.id)!;
      w.buildings.push({ ...structuredClone(orig), id: w.nextId++, builtTick: w.tick });
      return orig;
    };
    const twin = reload(base);
    const orig = addTwin(twin);
    const withOther = reload(base);
    withOther.nextId += 5;
    insertFront(withOther, orig);
    addTwin(withOther);
    expect(withOther.buildings[withOther.buildings.length - 1].id).not.toBe(twin.buildings[twin.buildings.length - 1].id);
    const g1 = growOf(twin), g2 = growOf(withOther);
    expect(g1.got.size).toBeGreaterThan(0);
    expect(g1.dup).toEqual([]);
    expect(new Map([...g2.got].sort())).toEqual(new Map([...g1.got].sort()));
    // 둘째 건물은 순번 1 로 따로 뽑는다 (묶음 하나에 난수 하나를 쓰지 않는다)
    const group = [keyCompany(orig.companyId), keyRegion(orig.regionId), keyStr(orig.typeId), keyStr(orig.methodId)].join(',');
    const idx = [...g1.got.keys()].filter((k) => k.startsWith(`grow|${group},`)).map((k) => Number(k.split(',').pop()));
    expect(idx.sort()).toEqual([0, 1]);
  });

  it('민영화 사본은 새 id 를 받아도 증설 키가 id 에 매이지 않는다', () => {
    // 140일에는 왕실 생산 건물이 없어, 민간 건물 하나를 왕실 것으로 돌려 놓고 1레벨을 민영화한다 (민간에 같은 묶음이 없으니 새 id 의 사본이 배열 끝에 생긴다)
    const b0 = aiGrowBuilding(base);
    const firm = base.companies.find((c) => c.id === b0.companyId)!;
    const gov = base.companies.find((c) => c.state && c.kingdomId === firm.kingdomId)!;
    const privatize = (w: World) => {
      const b = w.buildings.find((x) => x.id === b0.id)!;
      b.companyId = gov.id;
      b.stateOwned = true;
      const before = w.nextId;
      privatizeLevel(w, b, ownerBuildings(w, gov.kingdomId)[0], 0);
      expect(w.nextId, '사본이 새 id 를 받았다').toBe(before + 1);
    };
    const x = reload(base), y = reload(base);
    privatize(x);
    y.nextId += 7;
    insertFront(y, b0);
    privatize(y);
    const gx = growOf(x), gy = growOf(y);
    const group = `grow|${[keyCompany(firm.id), keyRegion(b0.regionId), keyStr(b0.typeId), keyStr(b0.methodId)].join(',')},`;
    expect([...gx.got.keys()].some((k) => k.startsWith(group)), '사본의 증설 키').toBe(true);
    expect(new Map([...gy.got].sort())).toEqual(new Map([...gx.got].sort()));
  });
});

describe('AI 소금 (T6)', () => {
  it('소금이 다르면 0일 세계는 config.aiSalt 만 다르고, 1년 뒤는 다르며, 둘 다 화폐가 보존된다', () => {
    const a = createWorld(1, { aiSalt: 0 }), b = createWorld(1, { aiSalt: 1 });
    expect(a.config.aiSalt).toBe(0);
    expect(b.config.aiSalt).toBe(1);
    expect(JSON.stringify({ ...b, config: { ...b.config, aiSalt: 0 } })).toBe(JSON.stringify(a));
    const m0 = [moneyIdentity(a), moneyIdentity(b)];
    run(a, 360);
    run(b, 360);
    expect(worldHash(a)).not.toBe(worldHash(b));
    expect(Math.abs(moneyIdentity(a) - m0[0]) / totalMoney(a)).toBeLessThan(1e-12);
    expect(Math.abs(moneyIdentity(b) - m0[1]) / totalMoney(b)).toBeLessThan(1e-12);
  });
});

describe('규칙 식별 (3.9)', () => {
  it('새 세계에 규칙 판·해시를 달고, 규칙 표가 바뀌면 해시가 바뀐다', () => {
    const w = createWorld(3);
    expect(w.config.rulesRev).toBe(RULES_REV);
    expect(w.config.rulesHash).toBe(rulesHash());
    expect(rulesHash()).toMatch(/^[0-9a-f]{16}$/);
    const before = rulesHash();
    const old = TUNE.startsPerWeek;
    try {
      TUNE.startsPerWeek = old + 1;
      expect(rulesHash()).not.toBe(before);
    } finally {
      TUNE.startsPerWeek = old;
    }
    expect(rulesHash()).toBe(before);
  });
});
