import { describe, expect, it } from 'vitest';
import { GOODS, applyCommandMsg, createWorld, migrateWorld, moneyIdentity, playerCompany, recordHistory, roundWorld, roundingDrift, step } from '../../src/index';
import type { World } from '../../src/index';
import { PRICE_MAX, PRICE_MIN, updatePrices } from '../../src/market';
import { round2 } from '../../src/rng';

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

  // 8판(레벨 소유)부터는 옛 저장을 바꾸지 않는다 (사용자 2026-10-21: 옛 저장은 신경 쓰지 않는다)
  it('옛 판 저장은 불러오지 않는다', () => {
    const w = createWorld(7);
    runTo(w, 30);
    const old = JSON.parse(save(w));
    for (const v of [3, 4, 5, 6, 7, 8]) expect(migrateWorld({ ...old, version: v })).toBeNull();
    expect(save(migrateWorld(JSON.parse(save(w)))!)).toBe(save(w));
    // 10판: 금융가 지분이 id → 지분 수 객체였다. 불러오면 11판 배열 묶음이 된다
    const v10 = JSON.parse(save(w));
    v10.version = 10;
    let held = 0;
    for (const p of v10.pops) if (p.fund) { held++; p.fund = Object.fromEntries(p.fund.id.map((id: number, i: number) => [id, p.fund.u[i]])); }
    expect(held).toBeGreaterThan(0);
    expect(save(migrateWorld(v10)!)).toBe(save(w));
  });

  // 화면 표시용 사본(Pop.wealth·literacy, Region.education, Building.crew)은 sim 이 읽지 않는다: 사본을 엉뚱한 값으로 바꿔도 다음 날 세계가 같고,
  // 하루가 끝나면 사본이 100배 값과 맞는다. 사본이 없는 6판 저장도 불러오면 사본이 생긴다
  it('화면 표시용 사본은 sim 이 읽지 않고, 하루 끝과 불러오기 뒤에 100배 값과 맞는다', () => {
    const a = createWorld(5);
    runTo(a, 60);
    const b = migrateWorld(JSON.parse(save(a)))!;
    for (const p of b.pops) { p.wealth = -77; p.literacy = -77; }
    for (const r of b.regions) r.education = -77;
    for (const x of b.buildings) x.crew = -77;
    runTo(a, 75); runTo(b, 75);
    expect(save(b)).toBe(save(a));
    const synced = (w: World) =>
      w.pops.every((p) => p.wealth === round2(p.wealth100 / 100) && p.literacy === round2(p.literacy100 / 100)) &&
      w.regions.every((r) => r.education === round2(r.education100 / 100)) &&
      w.buildings.every((x) => x.crew === (x.crew100 === undefined ? undefined : round2(x.crew100 / 100)));
    expect(synced(a)).toBe(true);
    const bare = JSON.parse(save(a));
    for (const p of bare.pops) { delete p.wealth; delete p.literacy; }
    for (const r of bare.regions) delete r.education;
    for (const x of bare.buildings) delete x.crew;
    const loaded = migrateWorld(bare)!;
    expect(synced(loaded)).toBe(true);
    expect(loaded).toEqual(JSON.parse(save(a)));
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
