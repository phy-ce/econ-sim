import { describe, expect, it } from 'vitest';
import { GOODS, applyCommandMsg, createWorld, migrateWorld, moneyIdentity, playerCompany, recordHistory, roundWorld, roundingDrift, step } from '../../src/index';
import type { World } from '../../src/index';
import { PRICE_MAX, PRICE_MIN, updatePrices } from '../../src/market';

// 저장되는 값은 소수 둘째 자리까지 (CLAUDE.md). 화면이 저장하는 글(JSON.stringify(world))의 모든 숫자를 본다.

/** JSON.stringify 가 이 숫자를 쓰는 글자의 소수 자릿수 (1e-7 같은 지수 표기도 센다) */
function decimals(x: number): number {
  const s = String(x);
  const e = s.indexOf('e');
  const mant = e < 0 ? s : s.slice(0, e), exp = e < 0 ? 0 : Number(s.slice(e + 1));
  const dot = mant.indexOf('.');
  return Math.max(0, (dot < 0 ? 0 : mant.length - dot - 1) - exp);
}

/** 저장 글에서 소수 셋째 자리 이상인 숫자: 개수와 앞의 몇 개 경로 (없으면 빈 목록) */
function violations(json: string, limit = 8): string[] {
  const found: string[] = [];
  let count = 0;
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'number') {
      if (decimals(v) > 2) { count++; if (found.length < limit) found.push(`${path} = ${v}`); }
      return;
    }
    if (v === null || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
    for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(JSON.parse(json), '$');
  return count ? [`${count}개`, ...found] : [];
}

const save = (w: World) => JSON.stringify(w);
const expectClean = (w: World, label: string) => expect(violations(save(w)), label).toEqual([]);
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

describe('저장값 소수 둘째 자리', () => {
  it.each([42, 2])('시드 %i: 1·100·400일, 틱 사이 명령 뒤, 저장/불러오기 뒤에 모든 숫자가 소수 둘째 자리 이하다', (seed) => {
    // 화면과 같은 시작: 플레이어 왕실이 있는 세계 + 첫 기록
    let w = createWorld(seed);
    recordHistory(w);
    expectClean(w, `${seed}: 0일`);
    runTo(w, 1);
    expectClean(w, `${seed}: 1일`);
    // 화면이 틱 사이에 넣는 명령: 짓기(민간 지분 공사비가 오간다)와 취소(남은 공사비를 돌려준다), 정책 단계
    runTo(w, 50);
    const me = playerCompany(w)!;
    const home = w.regions.filter((r) => r.kingdomId === me.kingdomId).sort((a, b) => b.land.arable - a.land.arable)[0];
    expect(applyCommandMsg(w, me.id, { type: 'build', typeId: 'farm', regionId: home.id, levels: 2 })).toBeNull();
    expect(applyCommandMsg(w, me.id, { type: 'setBudget', item: 'tax', value: 4 })).toBeNull();
    expectClean(w, `${seed}: 50일 명령 뒤`);
    runTo(w, 70);
    const k = w.constructions.find((x) => x.companyId === me.id && x.typeId === 'farm')!;
    expect(applyCommandMsg(w, me.id, { type: 'cancelConstruction', constructionId: k.id })).toBeNull();
    expectClean(w, `${seed}: 70일 취소 뒤`);
    runTo(w, 100);
    expectClean(w, `${seed}: 100일`);
    // 저장/불러오기 (화면과 같은 길: JSON 왕복 후 변환)
    w = migrateWorld(JSON.parse(save(w)))!;
    expectClean(w, `${seed}: 100일 불러온 뒤`);
    runTo(w, 400);
    expectClean(w, `${seed}: 400일`);
  });

  // round.ts 는 수가 많은 객체의 필드를 직접 적어 맞춘다. 새 필드를 빠뜨리지 않았는지: 정수가 아닌 모든 숫자에 끝수를 더한 뒤 한 번에 다 맞춰지는지 본다.
  // (기록, 알림 상태, 쓸 때 반올림하는 출처별 수요·공급은 roundWorld 가 훑지 않으므로 건드리지 않는다)
  // 돈 계정은 모두 센트 맞춤 길(economy.ts mapMoney)로 맞춰야 한다: 다른 길로 반올림한 돈 계정은 그 끝수가 주인 없는 돈에 가지 않아 장부가 어긋나거나
  // 마지막 반올림이 그 끝수를 지운다 (roundingDrift)
  it('roundWorld 가 저장값의 모든 숫자를 맞춘다 (빠진 필드가 없고, 돈 계정은 모두 장부를 지킨다)', () => {
    const w = createWorld(3);
    runTo(w, 300);
    const clean = moneyIdentity(w);
    const skip = new Set(['history', 'metrics', 'events', 'alertState', 'demandBy', 'supplyBy', 'demandByEma', 'supplyByEma']);
    let n = 0;
    const dirty = (o: Record<string, unknown> | unknown[]) => {
      for (const k of Object.keys(o)) {
        if (skip.has(k)) continue;
        const v = (o as Record<string, unknown>)[k];
        if (typeof v === 'number') { if (!Number.isInteger(v)) { (o as Record<string, unknown>)[k] = v + 0.003; n++; } }
        else if (v && typeof v === 'object') dirty(v as Record<string, unknown>);
      }
    };
    dirty(w as unknown as Record<string, unknown>);
    expect(n).toBeGreaterThan(1000);
    expect(violations(save(w)).length).toBeGreaterThan(0);
    // 끝수는 없던 돈을 만든다: 그만큼 주인 없는 돈에서 빼서 장부를 맞춰 둔다. 그러면 반올림이 찌꺼기 말고는 지울 것이 없어야 한다
    w.fund -= moneyIdentity(w) - clean;
    roundWorld(w);
    expect(violations(save(w))).toEqual([]);
    expect(Math.abs(moneyIdentity(w) - clean)).toBeLessThan(1e-5);
    expect(roundingDrift(w)).toBeLessThan(1e-5);
  });

  it('옛 저장(4판)을 바꾸면 모든 숫자가 소수 둘째 자리이고 화폐 장부가 센트 안에서 그대로다', () => {
    const w = createWorld(7);
    runTo(w, 60);
    // 4판 모양으로 되돌린다: 부·문해력·교육 접근도·숙련도·작업 인원은 규칙 단위, 돈과 수량에는 센트 아래 끝수
    const old = JSON.parse(save(w));
    old.version = 4;
    for (const p of old.pops) {
      p.wealth = p.wealth100 / 100 + 1e-5; p.literacy = p.literacy100 / 100 + 1e-5; delete p.wealth100; delete p.literacy100;
      p.savings += 0.001234; p.size += 0.000321;
    }
    for (const r of old.regions) { r.education = r.education100 / 100 + 1e-5; delete r.education100; }
    for (const b of old.buildings) {
      b.exp = b.exp100 / 100 + 1e-5; delete b.exp100;
      if (b.crew100 !== undefined) { b.crew = b.crew100 / 100 + 1e-5; delete b.crew100; }
    }
    for (const c of old.companies) c.cash += 0.004321;
    old.traders.shipments.push(...old.traders.shipments.map((s: { q: number }) => ({ ...s, q: s.q / 3 + 1e-4 })));
    const before = moneyIdentity(old as World);
    const got = migrateWorld(old)!;
    expect(got.version).toBe(6);
    expect(violations(save(got))).toEqual([]);
    // 옛 저장의 끝수는 장부의 센트 아래이므로 마지막 반올림이 그만큼(반 센트 아래)만 지운다
    expect(Math.abs(moneyIdentity(got) - before)).toBeLessThan(0.01);
    expect(got.fund).toBeGreaterThanOrEqual(0);
    expect(got.pops[0].wealth100).toBeGreaterThanOrEqual(100);
    expect(got.buildings.every((b) => b.exp100 >= 0 && b.exp100 <= 100 && !('exp' in b) && !('crew' in b))).toBe(true);
    expect(got.buildings.some((b) => (b.crew100 ?? 0) > 1)).toBe(true);
    // 바꾼 세계도 계속 돈다
    runTo(got, 90);
    expect(violations(save(got))).toEqual([]);
  });

  // 5판은 이 변경의 중간 판이다: 건물 숙련도·작업 인원이 규칙 단위(exp, crew)인 것과 지금처럼 100배 값인 것이 있다. 둘 다 지금 세계와 같아진다
  it('5판 저장(두 모양)을 바꾸면 지금 세계와 같다', () => {
    const w = createWorld(7);
    runTo(w, 30);
    const want = JSON.parse(save(w));
    const same = JSON.parse(save(w));
    same.version = 5;
    expect(save(migrateWorld(same)!)).toBe(save(w));
    const older = JSON.parse(save(w));
    older.version = 5;
    for (const b of older.buildings) {
      b.exp = b.exp100 / 100; delete b.exp100;
      if (b.crew100 !== undefined) { b.crew = b.crew100 / 100; delete b.crew100; }
    }
    const got = migrateWorld(older)!;
    expect(got.version).toBe(6);
    // 필드 순서만 다를 수 있다 (바꾼 필드가 끝으로 간다)
    expect(got).toEqual(want);
    expect(violations(save(got))).toEqual([]);
    expect(migrateWorld({ ...want, version: 3 })).toBeNull();
  });

  // 반올림 찌꺼기(0.05 이하 이동평균)는 0이 되고, 사고파는 사람이 없는 시장은 기본가에서 벗어난 쪽 끝으로 간다 (market.ts updatePrices)
  it('흐름이 끊긴 시장: 이동평균 찌꺼기는 0, 가격은 쏠린 쪽 끝으로', () => {
    const w = createWorld(5);
    const [a, b] = w.regions;
    const base = GOODS.luxury_cloth.basePrice;
    const cheap = a.market.luxury_cloth, dear = b.market.luxury_cloth, idle = b.market.electronics;
    Object.assign(cheap, { demand: 0, supply: 0, demandEma: 0.05, supplyEma: 0.04, price: base * 0.5 });
    Object.assign(dear, { demand: 0, supply: 0, demandEma: 0.03, supplyEma: 0, price: base * 1.5 });
    Object.assign(idle, { demand: 0, supply: 0, demandEma: 0, supplyEma: 0, price: GOODS.electronics.basePrice });
    for (let d = 0; d < 400; d++) {
      updatePrices(w);
      for (const m of [cheap, dear, idle]) { m.demand = 0; m.supply = 0; }
    }
    expect([cheap.demandEma, cheap.supplyEma, dear.demandEma, dear.supplyEma]).toEqual([0, 0, 0, 0]);
    expect(cheap.price).toBe(base * PRICE_MIN);
    expect(dear.price).toBe(base * PRICE_MAX);
    expect(idle.price).toBe(GOODS.electronics.basePrice);
  });
});
