import { describe, expect, it } from 'vitest';
import { GOODS, applyCommandMsg, createWorld, migrateWorld, playerCompany, recordHistory, step } from '../../src/index';
import type { World } from '../../src/index';
import { PRICE_MAX, PRICE_MIN, updatePrices } from '../../src/market';

// 반올림은 플레이어에게 보이는 값에만 한다 (CLAUDE.md). sim 이 계산하고 저장하는 값은 반올림하지 않는다 (round.ts).
// 여기서는 화면에 그대로 나가는 값이 소수 둘째 자리인지, 반올림하지 않은 저장값이 저장/불러오기에서 그대로 돌아오는지, 옛 판 저장 변환을 본다.

/** JSON.stringify 가 이 숫자를 쓰는 글자의 소수 자릿수 (1e-7 같은 지수 표기도 센다) */
function decimals(x: number): number {
  const s = String(x);
  const e = s.indexOf('e');
  const mant = e < 0 ? s : s.slice(0, e), exp = e < 0 ? 0 : Number(s.slice(e + 1));
  const dot = mant.indexOf('.');
  return Math.max(0, (dot < 0 ? 0 : mant.length - dot - 1) - exp);
}

/** 값 안에서 소수 셋째 자리 이상인 숫자: 개수와 앞의 몇 개 경로 (없으면 빈 목록) */
function violations(root: unknown, label: string, limit = 8): string[] {
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
  walk(root, label);
  return count ? [`${count}개`, ...found] : [];
}

/** 화면에 그대로 나가는 값: 기록(history·metrics), 지난주 국정 수지, 투자 풀 칸, 회사 임금 */
function shown(w: World) {
  return {
    history: w.history, metrics: w.metrics,
    kingdoms: w.kingdoms.map((k) => ({ lastBudget: k.lastBudget, investmentPool: k.investmentPool })),
    wages: w.companies.map((c) => c.wages),
  };
}

const save = (w: World) => JSON.stringify(w);
const expectShownClean = (w: World, label: string) => expect(violations(shown(w), '$'), label).toEqual([]);
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

describe('보이는 값은 소수 둘째 자리, 저장값은 그대로', () => {
  it.each([42, 2])('시드 %i: 1·100·400일, 틱 사이 명령 뒤, 저장/불러오기 뒤에 보이는 값이 소수 둘째 자리 이하다', (seed) => {
    // 화면과 같은 시작: 플레이어 왕실이 있는 세계 + 첫 기록
    let w = createWorld(seed);
    recordHistory(w);
    expectShownClean(w, `${seed}: 0일`);
    runTo(w, 1);
    expectShownClean(w, `${seed}: 1일`);
    runTo(w, 50);
    const me = playerCompany(w)!;
    const home = w.regions.filter((r) => r.kingdomId === me.kingdomId).sort((a, b) => b.land.arable - a.land.arable)[0];
    expect(applyCommandMsg(w, me.id, { type: 'build', typeId: 'farm', regionId: home.id, levels: 2 })).toBeNull();
    expect(applyCommandMsg(w, me.id, { type: 'setBudget', item: 'tax', value: 4 })).toBeNull();
    expectShownClean(w, `${seed}: 50일 명령 뒤`);
    runTo(w, 100);
    expectShownClean(w, `${seed}: 100일`);
    w = migrateWorld(JSON.parse(save(w)))!;
    expectShownClean(w, `${seed}: 100일 불러온 뒤`);
    runTo(w, 400);
    expectShownClean(w, `${seed}: 400일`);
    // 저장값은 반올림하지 않는다: 저축·인구·부에는 소수 셋째 자리 아래가 있다
    expect(violations(w.pops.map((p) => [p.savings, p.size, p.wealth]), 'pops').length).toBeGreaterThan(0);
  });

  // 반올림하지 않은 double 은 JSON 왕복에서 그대로 돌아온다: 불러온 세계를 이어 돌려도 끊김 없이 돈 세계와 같다
  it('저장 → 불러오기 → 이어 돌리기가 끊김 없는 실행과 같다', () => {
    const a = createWorld(11);
    runTo(a, 90);
    const b = migrateWorld(JSON.parse(save(a)))!;
    expect(save(b)).toBe(save(a));
    runTo(a, 150); runTo(b, 150);
    expect(save(b)).toBe(save(a));
  });

  it('옛 판 저장: 9판 이하는 불러오지 않고, 10~15판은 16판으로 바꾼다', () => {
    const w = createWorld(7);
    runTo(w, 30);
    const now = JSON.parse(save(w));
    for (const v of [3, 4, 5, 6, 7, 8, 9]) expect(migrateWorld({ ...now, version: v })).toBeNull();
    expect(save(migrateWorld(JSON.parse(save(w)))!)).toBe(save(w));
    // 15판: 굶은 주 수(Building.starvedWeeks)가 없었다 (없어도 된다)
    const o15 = JSON.parse(save(w));
    o15.version = 15;
    expect(save(migrateWorld(o15)!)).toBe(save(w));
    // 14판: 옛 공사 수수료 미리보기 기준값이 있었다
    const o14 = JSON.parse(save(w));
    o14.version = 14;
    for (const k of o14.kingdoms) { k.feeWageWeek = 12.5; k.budgetBase = { ...(k.budgetBase ?? {}), feesWage: 1, feesOther: 2 }; }
    expect(save(migrateWorld(o14)!)).toBe(save(w));
    // 13판까지: 연구가 돈이었다 (연구비 수준·연구비 장부·Research.budget, 진행은 연구비, 기술 값은 지금의 8,000/3배)
    const toOldResearch = (o: any) => {
      o.version = 13;
      for (const c of o.companies) { c.research.budget = c.research.points / 7; delete c.research.points; for (const id of Object.keys(c.research.progress)) c.research.progress[id] *= 8000 / 3; c.ledger.research = 0; c.lastLedger.research = 0; }
      for (const k of o.kingdoms) { k.budget.research = 3; if (k.lastBudget) k.lastBudget.research = 0; }
      return o;
    };
    // 11판: 부·문해력·교육 접근도·숙련도·작업 인원이 100배 값이었다 (사본 칸은 소수 둘째 자리)
    const to11 = () => {
      const o = toOldResearch(JSON.parse(save(w)));
      o.version = 11;
      for (const p of o.pops) { p.wealth100 = p.wealth * 100; p.literacy100 = p.literacy * 100; p.wealth = Math.round(p.wealth * 100) / 100; p.literacy = Math.round(p.literacy * 100) / 100; }
      for (const r of o.regions) { r.education100 = r.education * 100; r.education = Math.round(r.education * 100) / 100; }
      for (const b of o.buildings) { b.exp100 = b.exp * 100; delete b.exp; if (b.crew !== undefined) { b.crew100 = b.crew * 100; b.crew = Math.round(b.crew * 100) / 100; } }
      return o;
    };
    // 100배 했다가 나누면 마지막 자리가 다를 수 있다: 바꾼 값이 원래 값과 거의 같은지 보고, 원래 값으로 맞춘 뒤 나머지가 모두 같은지 본다
    const same = (got: World) => {
      const close = (x: number, y: number) => Math.abs(x - y) <= 1e-12 * Math.max(1, Math.abs(y));
      got.pops.forEach((p, i) => { expect(close(p.wealth, w.pops[i].wealth) && close(p.literacy, w.pops[i].literacy)).toBe(true); p.wealth = w.pops[i].wealth; p.literacy = w.pops[i].literacy; });
      got.regions.forEach((r, i) => { expect(close(r.education, w.regions[i].education)).toBe(true); r.education = w.regions[i].education; });
      got.buildings.forEach((b, i) => {
        const x = w.buildings[i];
        expect(close(b.exp, x.exp) && (x.crew === undefined ? b.crew === undefined : close(b.crew!, x.crew))).toBe(true);
        b.exp = x.exp; if (x.crew !== undefined) b.crew = x.crew;
      });
      // 연구 진행은 8,000/3배 했다가 나눈다. 지난주 연구 포인트(화면 기록)는 불러올 때 0이 되고 다음 주에 다시 찬다
      got.companies.forEach((c, i) => {
        const x = w.companies[i].research;
        for (const id of Object.keys(x.progress)) { expect(close(c.research.progress[id], x.progress[id])).toBe(true); c.research.progress[id] = x.progress[id]; }
        expect(c.research.points).toBe(0);
        c.research.points = x.points;
      });
      // 바꾼 칸은 객체 끝에 새로 생기므로 키 순서는 다를 수 있다: 값으로 비교한다
      expect(JSON.parse(save(got))).toEqual(JSON.parse(save(w)));
    };
    expect(w.companies.some((c) => Object.values(c.research.progress).some((x) => x > 0))).toBe(true);
    same(migrateWorld(toOldResearch(JSON.parse(save(w))))!);
    same(migrateWorld(to11())!);
    // 10판: 그에 더해 금융가 지분이 id → 지분 수 객체였다
    const v10 = to11();
    v10.version = 10;
    let held = 0;
    for (const p of v10.pops) if (p.fund) { held++; p.fund = Object.fromEntries(p.fund.id.map((id: number, i: number) => [id, p.fund.u[i]])); }
    expect(held).toBeGreaterThan(0);
    same(migrateWorld(v10)!);
  });

  // 흐름이 끊긴 시장: 수요·공급 이동평균이 같은 비율로 줄어 가격이 마지막 수급 비율에 머물다가, 둘 다 거의 0(1e-6 아래, priceFormula)이 되면
  // 쏠린 쪽 끝으로 간다 (market.ts updatePrices). 처음부터 흐름이 없던 시장은 기본가 그대로다
  it('흐름이 끊긴 시장: 가격은 쏠린 쪽 끝으로', () => {
    const w = createWorld(5);
    const [a, b] = w.regions;
    const base = GOODS.luxury_cloth.basePrice;
    const glut = a.market.luxury_cloth, short = b.market.luxury_cloth, idle = b.market.electronics;
    Object.assign(glut, { demand: 0, supply: 0, demandEma: 0.04, supplyEma: 0.05, price: base });
    Object.assign(short, { demand: 0, supply: 0, demandEma: 0.03, supplyEma: 0, price: base });
    Object.assign(idle, { demand: 0, supply: 0, demandEma: 0, supplyEma: 0, price: GOODS.electronics.basePrice });
    for (let d = 0; d < 600; d++) {
      updatePrices(w);
      // 90일: 마지막 수급 비율(수요 0.04 : 공급 0.05)의 가격 근처
      if (d === 90) expect(Math.abs(glut.price - base * (1 - 0.75 * 0.25))).toBeLessThan(0.5);
      for (const m of [glut, short, idle]) { m.demand = 0; m.supply = 0; }
    }
    expect(glut.demandEma).toBeLessThan(1e-15);
    expect(glut.price).toBeCloseTo(base * PRICE_MIN, 4);
    expect(short.price).toBeCloseTo(base * PRICE_MAX, 4);
    expect(idle.price).toBe(GOODS.electronics.basePrice);
  });
});
