// 저택 지분 (TUNE.manorShares, docs/overhaul/MANOR_SHARES.md): 사기·팔기·발행·되사기·부재 지주 몫이 돈을 만들거나 없애지 않고, 저장/불러오기에도 결정적인가.
// 경제 결과는 판정하지 않는다 (코드 문제만).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TICKS_PER_WEEK, TUNE, createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { RENT_ASSET_WEEKS, beginStep, ownerViews, sellManorUnits, treasuryFree, treasuryTarget, updateFunds } from '../../src/finance';
import { lawSteer } from '../../src/policy';
import { FLOW } from '../../src/kingdoms';
import { addFund, fundOf } from '../../src/pops';
import { firstDiff } from '../helpers';

const TOL = 1e-12;
const drift = (w: World, m0: number) => Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w));
const manors = (w: World) => w.buildings.filter((b) => b.typeId === 'manor');
const unitsOf = (w: World, id: number) => w.pops.reduce((a, p) => a + fundOf(p, id), 0);

const saved: Record<string, unknown> = {};
beforeAll(() => {
  for (const k of ['manorShares', 'absenteeShare', 'manorBuyScope'] as const) saved[k] = TUNE[k];
  Object.assign(TUNE, { manorShares: 1, absenteeShare: 0.2, manorBuyScope: 'world' });
});
afterAll(() => { Object.assign(TUNE, saved); });

describe('저택 지분', () => {
  it('켜는 첫날 저택마다 지분 값 1 의 지분이 귀족에게만 생긴다', () => {
    const w = createWorld(7, { warm: false });
    for (const o of manors(w)) {
      expect(o.nav).toBe(1);
      for (const p of w.pops) if (fundOf(p, o.id) > 0) expect(['aristocrat', 'gentry']).toContain(p.prof);
    }
    expect(manors(w).some((o) => unitsOf(w, o.id) > 0)).toBe(true);
    // 하급 귀족은 저택에 앉지 않는다
    const ids = new Set(manors(w).map((o) => o.id));
    expect(w.pops.some((p) => p.prof === 'gentry' && ids.has(p.work) && p.size > 0)).toBe(false);
  });

  it('사기·팔기·되사기·부재 지주 몫이 지나도 화폐 장부가 맞다 (2년, 매일)', () => {
    const w = createWorld(7);
    // 부재 지주 몫이 생기게: 민간 건물 하나의 레벨을 다른 지역 저택 것으로 바꾼다 (돈은 움직이지 않는다)
    const b = w.buildings.find((x) => x.owners && Object.keys(x.owners).length > 0)!;
    const away = manors(w).find((o) => o.regionId !== b.regionId)!;
    b.owners = { [away.id]: b.level };
    const m0 = moneyIdentity(w);
    const f0 = { ...FLOW };
    let worst = 0, at = 0;
    for (let d = 0; d < 720; d++) {
      step(w);
      const x = drift(w, m0);
      if (x > worst) { worst = x; at = w.tick; }
    }
    expect(worst, `가장 큰 어긋남 ${at}일`).toBeLessThan(TOL);
    const moved = (t: string) => (FLOW[t] ?? 0) - (f0[t] ?? 0);
    expect(moved('mbuy.home') + moved('mbuy.away') + moved('mbuy.foreign')).toBeGreaterThan(0);
    expect(moved('absentee.manor')).toBeGreaterThan(0);
  });

  it('팔기: 지분 값만큼 금고에서 저축으로, 지분은 줄고 화폐는 그대로', () => {
    const w = createWorld(7);
    for (let d = 0; d < 30; d++) step(w);
    const o = manors(w).find((x) => (x.cash ?? 0) > 1000 && unitsOf(w, x.id) > 0)!;
    const p = w.pops.find((q) => fundOf(q, o.id) > 0)!;
    // 한 번의 팔기가 저택 여럿에 걸칠 수 있어 저택 금고 합으로 본다
    const cashAll = () => manors(w).reduce((a, x) => a + (x.cash ?? 0), 0);
    const m0 = totalMoney(w), u0 = fundOf(p, o.id), s0 = p.savings, c0 = cashAll();
    const need = Math.min(500, u0 * (o.nav ?? 1) / 2);
    sellManorUnits(w, p, need);
    const paid = p.savings - s0;
    expect(paid).toBeGreaterThan(0);
    expect(cashAll()).toBeCloseTo(c0 - paid, 6);
    expect(fundOf(p, o.id)).toBeLessThanOrEqual(u0);
    expect(Math.abs(totalMoney(w) - m0) / m0).toBeLessThan(TOL);
  });

  it('되사기: 귀족이 아닌 pop 의 저택 지분은 주간 처리에서 저택이 되산다', () => {
    const w = createWorld(7);
    for (let d = 0; d < 30; d++) step(w);
    const o = manors(w).find((x) => (x.cash ?? 0) > 1000 && unitsOf(w, x.id) > 0)!;
    const noble = w.pops.find((q) => fundOf(q, o.id) > 0)!;
    const peasant = w.pops.find((q) => q.prof === 'peasant' && q.size > 0)!;
    const give = fundOf(noble, o.id) / 10;
    addFund(noble, o.id, -give);
    addFund(peasant, o.id, give);
    const m0 = totalMoney(w), s0 = peasant.savings;
    updateFunds(w);
    expect(peasant.savings).toBeGreaterThan(s0);
    expect(fundOf(peasant, o.id)).toBeLessThan(give);
    expect(Math.abs(totalMoney(w) - m0) / m0).toBeLessThan(TOL);
  });

  it('지분이 모두 없어진 저택은 그 지역 귀족에게 새로 발행한다 (돈은 그대로)', () => {
    const w = createWorld(7);
    const o = manors(w).find((x) => unitsOf(w, x.id) > 0)!;
    for (const p of w.pops) { const u = fundOf(p, o.id); if (u > 0) addFund(p, o.id, -u); }
    const m0 = totalMoney(w);
    updateFunds(w);
    expect(unitsOf(w, o.id)).toBeGreaterThan(0);
    expect(o.nav).toBe(1);
    expect(Math.abs(totalMoney(w) - m0) / m0).toBeLessThan(TOL);
  });

  it('같은 시드는 같은 결과를 낸다 (저장/불러오기 포함)', () => {
    expect(147 % TICKS_PER_WEEK).toBe(0);
    const a = createWorld(42);
    while (a.tick < 200) step(a);
    const want = JSON.stringify(a);
    let b = createWorld(42);
    while (b.tick < 100) step(b);
    b = JSON.parse(JSON.stringify(b));
    while (b.tick < 147) step(b);
    b = JSON.parse(JSON.stringify(b));
    while (b.tick < 200) step(b);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? "다름");
  });
});

// 저택 지분 고침 (AI 판단, TUNE.nobleChoice·manorSellCap·lawSteer, DESIGN 9.3): 돈을 만들거나 없애지 않고 저장/불러오기에도 결정적인가, 차가운 시작 금융가의 값
describe('저택 지분 고침', () => {
  const keys = ['nobleChoice', 'manorSellCap', 'lawSteer'] as const;
  const old: Record<string, unknown> = {};
  beforeAll(() => { for (const k of keys) old[k] = TUNE[k]; Object.assign(TUNE, { nobleChoice: 1, manorSellCap: 1, lawSteer: 1 }); });
  afterAll(() => { Object.assign(TUNE, old); });

  it('켜도 화폐 장부가 맞다 (2년, 매일)', () => {
    const w = createWorld(7);
    const m0 = moneyIdentity(w);
    let worst = 0, at = 0, steered = false;
    for (let d = 0; d < 720; d++) {
      step(w);
      steered ||= w.kingdoms.some((k) => lawSteer(w, k.id));
      const x = drift(w, m0);
      if (x > worst) { worst = x; at = w.tick; }
    }
    expect(worst, `가장 큰 어긋남 ${at}일`).toBeLessThan(TOL);
    expect(steered).toBe(true);
  });

  it('가진 것이 없는 금융가는 새 레벨 수익률로 보고, 금고 목표는 1레벨 공사비 이상이다', () => {
    const w = createWorld(7);
    for (let d = 0; d < 60; d++) step(w);
    const f = w.buildings.find((b) => b.typeId === 'finance')!;
    for (const b of w.buildings) if (b.owners?.[f.id]) delete b.owners[f.id];
    f.cash = 0; f.profitEma = 0;
    w.constructions = w.constructions.filter((k) => !k.funders?.[f.id]);
    w.tick++;
    const v = ownerViews(w).get(f.id)!;
    expect(v.level).toBeGreaterThan(0);
    expect(v.y).toBeGreaterThanOrEqual(0);
    expect(treasuryTarget(w, f)).toBeCloseTo(v.level, 6);
  });

  it('같은 시드는 같은 결과를 낸다 (저장/불러오기 포함)', () => {
    const a = createWorld(42);
    while (a.tick < 200) step(a);
    const want = JSON.stringify(a);
    let b = createWorld(42);
    while (b.tick < 100) step(b);
    b = JSON.parse(JSON.stringify(b));
    while (b.tick < 147) step(b);
    b = JSON.parse(JSON.stringify(b));
    while (b.tick < 200) step(b);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? "다름");
  });
});

// 지분 값에 지대·짓는 공사 넣기 (TUNE.manorNavRentWeeks·manorNavBuilds, DESIGN 9.3): 값만 바뀌고 돈은 그대로, 파는 돈은 금고까지, AI 와 값이 겹치지 않는다
describe('저택 지분 값의 지대', () => {
  const keys = ['manorNavRentWeeks', 'manorNavBuilds', 'nobleChoice'] as const;
  const old: Record<string, unknown> = {};
  beforeAll(() => { for (const k of keys) old[k] = TUNE[k]; Object.assign(TUNE, { manorNavRentWeeks: 52, manorNavBuilds: 1, nobleChoice: 1 }); });
  afterAll(() => { Object.assign(TUNE, old); });

  const navAt = (w: World, weeks: number, builds = 0) => {
    // updateFunds 는 넘는 금고를 돌려주므로 사본에서 잰다
    const c = JSON.parse(JSON.stringify(w)) as World;
    Object.assign(TUNE, { manorNavRentWeeks: weeks, manorNavBuilds: builds });
    updateFunds(c);
    const m = new Map(manors(c).map((o) => [o.id, o.nav ?? 1]));
    Object.assign(TUNE, { manorNavRentWeeks: 52, manorNavBuilds: 1 });
    return m;
  };

  it('지분 값은 주 수에 비례해 오르고 돈은 움직이지 않는다', () => {
    const w = createWorld(7);
    for (let d = 0; d < 60; d++) step(w);
    const a = navAt(w, 0), b = navAt(w, 52), c = navAt(w, 104);
    const m0 = totalMoney(w), once = JSON.parse(JSON.stringify(w)) as World;
    updateFunds(once);
    expect(Math.abs(totalMoney(once) - m0) / m0).toBeLessThan(TOL);
    const o = manors(w).find((x) => unitsOf(w, x.id) > 0)!;
    expect(b.get(o.id)!).toBeGreaterThan(a.get(o.id)!);
    expect(c.get(o.id)! - b.get(o.id)!).toBeCloseTo(b.get(o.id)! - a.get(o.id)!, 6);
  });

  it('짓고 있는 공사에 낸 돈은 저택 자산으로 센다', () => {
    const w = createWorld(7);
    for (let d = 0; d < 60; d++) step(w);
    const o = manors(w).find((x) => unitsOf(w, x.id) > 0)!;
    const k = w.constructions[0] ?? { typeId: 'farm' } as never;
    w.constructions = [{ ...k, funders: { [o.id]: 1000 }, spent: 1000 }];
    const a = navAt(w, 0, 0).get(o.id)!, b = navAt(w, 0, 1).get(o.id)!;
    expect(Math.abs((b - a) * unitsOf(w, o.id) - 1000)).toBeLessThan(5); // 금고 돌려주기가 조금 다르다
  });

  it('지대가 든 지분 값으로 팔아도 금고의 약정 뺀 돈까지만 낸다', () => {
    const w = createWorld(7);
    for (let d = 0; d < 60; d++) step(w);
    const o = manors(w).find((x) => unitsOf(w, x.id) > 0)!;
    const p = w.pops.find((q) => fundOf(q, o.id) > 0)!;
    p.fund = { id: [o.id], u: [fundOf(p, o.id)] };
    o.cash = 10;
    const free = treasuryFree(w, o), s0 = p.savings, m0 = totalMoney(w);
    sellManorUnits(w, p, 1e12);
    expect(p.savings - s0).toBeLessThanOrEqual(Math.max(0, free) + 1e-9);
    expect(o.cash ?? 0).toBeGreaterThanOrEqual(-1e-9);
    expect(Math.abs(totalMoney(w) - m0) / m0).toBeLessThan(TOL);
  });

  it('AI 판단은 지분 값과 같은 주 수로 지대를 한 번만 센다', () => {
    const w = createWorld(7);
    for (let d = 0; d < 60; d++) step(w);
    const view = (weeks: number) => { Object.assign(TUNE, { manorNavRentWeeks: weeks }); beginStep(w); const y = new Map([...ownerViews(w)].map(([id, v]) => [id, v.y])); Object.assign(TUNE, { manorNavRentWeeks: 52 }); return y; };
    const off = view(0), same = view(RENT_ASSET_WEEKS), more = view(104);
    const o = manors(w).find((x) => (off.get(x.id) ?? 0) > 0)!;
    expect(same.get(o.id)).toBe(off.get(o.id));
    expect(more.get(o.id)!).toBeLessThan(off.get(o.id)!);
  });

  it('켜도 화폐 장부가 맞다 (2년, 매일)', () => {
    const w = createWorld(7);
    const m0 = moneyIdentity(w);
    let worst = 0, at = 0;
    for (let d = 0; d < 720; d++) {
      step(w);
      const x = drift(w, m0);
      if (x > worst) { worst = x; at = w.tick; }
    }
    expect(worst, `가장 큰 어긋남 ${at}일`).toBeLessThan(TOL);
  });

  it('같은 시드는 같은 결과를 낸다 (저장/불러오기 포함)', () => {
    const a = createWorld(42);
    while (a.tick < 200) step(a);
    const want = JSON.stringify(a);
    let b = createWorld(42);
    while (b.tick < 100) step(b);
    b = JSON.parse(JSON.stringify(b));
    while (b.tick < 147) step(b);
    b = JSON.parse(JSON.stringify(b));
    while (b.tick < 200) step(b);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? "다름");
  });
});
