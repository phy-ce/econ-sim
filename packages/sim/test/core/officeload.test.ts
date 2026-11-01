// 건축사무소는 그날 맡은 공사에 필요한 포인트만 만들고, 그만큼의 자재만 쓰고 산다 (사용자 결정 2026-11-01, DESIGN.md 8장)
import { describe, expect, it } from 'vitest';
import { BUILDING_BY_ID, companyById, createWorld, getMethod, harvestFactor, moneyIdentity, step, totalMoney } from '../../src/index';
import type { Building, Company, World } from '../../src/index';
import { collectOrders, newBook } from '../../src/market';
import { officeLoad, officeNeed, produce, updateIdleOffices } from '../../src/production';
import { builderOf } from '../../src/economy';

const officesOf = (w: World, c: Company): Building[] =>
  w.buildings.filter((b) => b.companyId === c.id && b.active && !!getMethod(b.typeId, b.methodId).construction);

/** 시드 1을 30일 돌리고 왕실 공사가 있는 첫 왕국의 사무소가 맡은 공사를 남은 포인트 3짜리 하나로 줄인다 */
function setup() {
  const w = createWorld(1);
  for (let i = 0; i < 30; i++) step(w);
  // 왕실 공사가 있는 첫 왕국
  const keep = w.constructions.find((k) => !!companyById(w, k.companyId)?.state)!;
  const gov = companyById(w, keep.companyId)!;
  const mineOf = (k: World['constructions'][number]) => { const o = companyById(w, k.companyId); return !!o && builderOf(w, o) === gov; };
  keep.paused = false;
  keep.points = keep.required - 3;
  w.constructions = w.constructions.filter((k) => k === keep || !mineOf(k));
  return { w, gov };
}

describe('건축사무소 가동 비율', () => {
  it('공사가 능력보다 적으면 필요 포인트만 만들고 자재도 그 비율만 쓴다', () => {
    const { w, gov } = setup();
    const offices = officesOf(w, gov);
    expect(offices.length).toBeGreaterThan(0);
    // 자재가 넉넉하면 충족 1: 포인트 = 필요량
    for (const b of offices) for (const g in getMethod(b.typeId, b.methodId).inputs) b.stock[g as keyof typeof b.stock] = 1e9;
    updateIdleOffices(w);
    expect(officeNeed(w, gov)).toBeCloseTo(3, 9);
    const load = officeLoad(w, gov);
    expect(load).toBeGreaterThan(0);
    expect(load).toBeLessThan(1);
    const before = offices.map((b) => ({ ...b.stock }));
    produce(w);
    const points = offices.reduce((s, b) => s + b.last.points, 0);
    expect(points).toBeCloseTo(3, 6);
    offices.forEach((b, i) => {
      const m = getMethod(b.typeId, b.methodId);
      // 다 가동했을 때 쓸 양 × 가동 비율 (b.crew 는 produce 가 오늘 쓴 작업 인원)
      const full = b.level * b.utilization * b.crew! * harvestFactor(w, b.regionId, BUILDING_BY_ID[b.typeId].land);
      for (const g in m.inputs) {
        const used = before[i][g as keyof typeof b.stock]! - b.stock[g as keyof typeof b.stock]!;
        expect(used).toBeCloseTo(m.inputs[g as keyof typeof m.inputs]! * full * load, 3);
      }
    });
  });

  it('맡은 공사가 없는 사무소는 자재를 사지 않고 재고는 그대로 둔다', () => {
    const { w, gov } = setup();
    w.constructions = w.constructions.filter((k) => { const o = companyById(w, k.companyId); return !o || builderOf(w, o) !== gov; });
    updateIdleOffices(w);
    const offices = officesOf(w, gov);
    for (const b of offices) { expect(b.idle).toBe(true); for (const g in getMethod(b.typeId, b.methodId).inputs) b.stock[g as keyof typeof b.stock] = 5; }
    const book = newBook();
    collectOrders(w, book);
    const bought = book.orders.filter((o) => o.src === 'bld:builder' && o.payer.kind === 'company' && o.payer.c === gov);
    expect(bought).toEqual([]);
    produce(w);
    for (const b of offices) for (const g in getMethod(b.typeId, b.methodId).inputs) expect(b.stock[g as keyof typeof b.stock]).toBe(5);
  });

  it('공사를 줄인 뒤에도 화폐 장부가 맞는다', () => {
    const { w } = setup();
    const m0 = moneyIdentity(w);
    for (let i = 0; i < 30; i++) {
      step(w);
      expect(Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w))).toBeLessThan(1e-12);
    }
  });
});
