import { describe, expect, it } from 'vitest';
import { GATED_GOODS, NEEDS, goodTechs, lockedGoodsFor, needsAt } from '../../src/data';
import { syncLockedGoods } from '../../src/economy';
import { migrateWorld } from '../../src/compat';
import { createWorld, step } from '../../src/index';
import { lockedDemand, needSplit } from '../../src/market';
import { START_TECHS } from '../../src/world';
import type { GoodId, World } from '../../src/types';

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
const popDemand = (w: World, g: GoodId) => w.regions.reduce((a, r) => a + Object.entries(r.market[g].demandBy ?? {}).reduce((x, [k, v]) => x + (k.startsWith('pop:') ? v : 0), 0), 0);
const openAll = (w: World) => { for (const c of w.companies) for (const g of GATED_GOODS) for (const t of goodTechs(g)) if (!c.research.known.includes(t)) c.research.known.push(t); };

describe('기술로 열리는 주민 수요', () => {
  it('열리는 상품과 기술은 건물 표에서 나온다', () => {
    expect([...GATED_GOODS].sort()).toEqual(['electronics', 'paper', 'transport']);
    expect(goodTechs('paper')).toEqual(['printing']);
    expect(goodTechs('electronics')).toEqual(['steam_engine']);
    expect(goodTechs('transport')).toContain('wagonway');
    expect(NEEDS.flatMap((n) => n.options).some((o) => o.good === 'tools')).toBe(false);
  });

  it('시작 왕국은 셋 다 잠겨 있고 종이 공장이 없다', () => {
    const w = createWorld(1);
    expect(lockedGoodsFor(START_TECHS).sort()).toEqual(['electronics', 'paper', 'transport']);
    for (const r of w.regions) expect([...r.lockedGoods].sort()).toEqual(['electronics', 'paper', 'transport']);
    expect(w.buildings.some((b) => b.typeId === 'paper_mill')).toBe(false);
  });

  it('잠기면 필요가 0 이고 묶음 합계는 그대로다', () => {
    const locked = lockedGoodsFor(START_TECHS);
    for (const L of [1, 3, 5, 8, 12, 20, 30]) {
      const a = needsAt(L, locked), b = needsAt(L);
      expect(a.travel).toBe(0);
      expect(a.fine_instruments).toBe(0);
      expect(sum(a)).toBeCloseTo(sum(b), 9);
      expect(a.nourishment).toBe(b.nourishment);
    }
    expect(needsAt(2).travel).toBe(0);
    expect(needsAt(5).fine_instruments).toBe(0);
    expect(needsAt(5).travel).toBeGreaterThan(0);
    expect(needsAt(8).fine_instruments).toBeGreaterThan(0);
  });

  it('왕국이 기술을 열어야 주민이 산다', () => {
    const w = createWorld(1, { withPlayer: false });
    for (const p of w.pops) if (p.prof === 'aristocrat') { p.wealth = 12; p.savings += 1e6; }
    step(w);
    for (const g of GATED_GOODS) if (w.regions.every((r) => r.lockedGoods.includes(g))) expect(popDemand(w, g)).toBe(0);
    const r = w.regions[0];
    expect(needSplit(r, 'household', 12).find((o) => o.good === 'paper')?.share).toBe(0);
    expect(lockedDemand(w, r.kingdomId, 'electronics')).toBeGreaterThan(0);
    openAll(w);
    step(w);
    for (const x of w.regions) expect(x.lockedGoods).toEqual([]);
    expect(popDemand(w, 'transport')).toBeGreaterThan(0);
    expect(popDemand(w, 'electronics')).toBeGreaterThan(0);
    expect(popDemand(w, 'paper')).toBeGreaterThan(0);
    expect(needSplit(r, 'household', 12).find((o) => o.good === 'paper')!.share).toBeGreaterThan(0);
  });

  it('왕국마다 따로 열린다', () => {
    const w = createWorld(1, { withPlayer: false });
    const k = w.kingdoms[0];
    for (const c of w.companies) if (c.kingdomId === k.id) c.research.known.push('wagonway');
    syncLockedGoods(w);
    for (const r of w.regions) expect(r.lockedGoods.includes('transport')).toBe(r.kingdomId !== k.id);
  });

  it('옛 저장은 아는 기술로 잠금을 채우고, 종이 공장이 있는 왕국은 인쇄술을 받는다', () => {
    const w = createWorld(1, { withPlayer: false });
    const old = JSON.parse(JSON.stringify(w));
    const r0 = old.regions[0];
    for (const r of old.regions) delete r.lockedGoods;
    old.buildings.push({ ...old.buildings[0], id: 999_999, typeId: 'paper_mill', methodId: 'pulp_press', regionId: r0.id });
    const got = migrateWorld(old)!;
    for (const r of got.regions) {
      expect(r.lockedGoods).toContain('transport');
      expect(r.lockedGoods.includes('paper')).toBe(r.kingdomId !== r0.kingdomId);
    }
  });
});
