import { describe, expect, it } from 'vitest';
import { applyCommandMsg, createWorld, playerCompany, totalMoney } from '../../src/index';
import { TUNE } from '../../src/data';

describe('시작 전 시장 돌리기', () => {
  it('첫날은 틱 0 이고 건물·인구·기술은 그대로이며 기록이 없다', () => {
    const a = createWorld(3, { warm: false }), b = createWorld(3);
    expect(TUNE.warmupDays).toBeGreaterThan(0);
    expect(b.tick).toBe(0);
    expect(b.history).toEqual([]);
    expect(b.metrics).toEqual([]);
    expect(b.constructions).toEqual([]);
    const size = (w: typeof a) => w.pops.reduce((s, p) => s + p.size, 0);
    expect(size(b)).toBeCloseTo(size(a), 6);
    expect(b.companies.map((c) => c.known)).toEqual(a.companies.map((c) => c.known));
    expect(b.regions[0].market.grain.price).not.toBe(a.regions[0].market.grain.price);
    expect(Number.isFinite(totalMoney(b))).toBe(true);
  });
  it('같은 시드는 같은 시작 세계다', () => {
    expect(JSON.stringify(createWorld(3))).toBe(JSON.stringify(createWorld(3)));
  });
});

describe('플레이어 여러 레벨 공사', () => {
  const setup = () => {
    const w = createWorld(1, { warm: false });
    const me = playerCompany(w)!;
    const home = w.regions.filter((r) => r.kingdomId === me.kingdomId).sort((x, y) => y.land.forest - x.land.forest)[0];
    return { w, me, home };
  };
  it('5레벨은 1레벨 공사 다섯 건이다', () => {
    const { w, me, home } = setup();
    expect(applyCommandMsg(w, me.id, { type: 'build', typeId: 'lumber', regionId: home.id, levels: 5 })).toBeNull();
    const mine = w.constructions.filter((k) => k.companyId === me.id);
    expect(mine.length).toBe(5);
    expect(mine.every((k) => (k.levels ?? 1) === 1)).toBe(true);
  });
  it('상한에 걸리면 넣은 공사는 둔다', () => {
    const { w, me, home } = setup();
    for (let i = 0; i < 39; i++) expect(applyCommandMsg(w, me.id, { type: 'build', typeId: 'school', regionId: home.id })).toBeNull();
    expect(applyCommandMsg(w, me.id, { type: 'build', typeId: 'school', regionId: home.id, levels: 5 })).toBeNull();
    expect(w.constructions.filter((k) => k.companyId === me.id).length).toBe(40);
  });
});
