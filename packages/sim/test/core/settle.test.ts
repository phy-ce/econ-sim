// 민간 공사 완공 정산 (이슈 #10, production.ts giveLevels, DESIGN.md 8장): 약정 몫보다 레벨을 더 받은 금고는 금고에 있는 돈까지만 낸다 (TUNE.settleCap = 1).
// 여러 금고가 한 레벨을 함께 낸 공사(chooseFunders 의 모아 내기)를 직접 만들어 완공시키고, 정산 뒤 금고가 0 아래로 내려가지 않는지와 돈의 합이 그대로인지 본다
import { afterEach, describe, expect, it } from 'vitest';
import { BUILDING_BY_ID, TUNE, buildPointsOf, createWorld, isOwnerBuilding, kingdomOf, totalMoney } from '../../src/index';
import type { Building, World } from '../../src/index';
import { advanceConstruction } from '../../src/production';

const cap0 = TUNE.settleCap;
afterEach(() => { TUNE.settleCap = cap0; });

/** 시드 1 첫 왕국의 민간 건물 하나에 1레벨 증설 공사를 걸고, 저택·금융가 두 곳이 60:40 으로 낸 것으로 만든다 (공사비 1,000, 다 지음) */
function setup(cashA: number, cashB: number) {
  const w: World = createWorld(1, { withPlayer: false });
  const k0 = w.kingdoms[0];
  const firmId = k0.privateIds[0];
  const b = w.buildings.find((x) => x.companyId === firmId && !x.stateOwned && !BUILDING_BY_ID[x.typeId].auto)!;
  const [A, B] = w.buildings.filter((x) => isOwnerBuilding(x.typeId) && kingdomOf(w, x.regionId) === k0.id) as [Building, Building];
  expect(b && A && B).toBeTruthy();
  A.cash = cashA; B.cash = cashB;
  const required = buildPointsOf(b.typeId);
  w.constructions = [{ id: w.nextId++, companyId: firmId, regionId: b.regionId, typeId: b.typeId, methodId: b.methodId, targetBuildingId: b.id,
    points: required, required, spent: 1000, ticksElapsed: 0, funders: { [A.id]: 600, [B.id]: 400 } }];
  return { w, b, A, B, ownedA: b.owners?.[A.id] ?? 0, level: b.level };
}

describe('민간 공사 완공 정산', () => {
  it('settleCap = 1: 레벨을 더 받은 금고는 금고에 있는 돈까지만 내고 0 아래로 내려가지 않는다', () => {
    TUNE.settleCap = 1;
    const { w, b, A, B, ownedA, level } = setup(100, 50);
    const m0 = totalMoney(w);
    advanceConstruction(w);
    // 60% 를 낸 A 가 1레벨을 갖고, B 에게 낼 400 중 금고에 있던 100 만 낸다
    expect(b.level).toBe(level + 1);
    expect(b.owners?.[A.id] ?? 0).toBe(ownedA + 1);
    expect(A.cash).toBe(0);
    expect(B.cash).toBeCloseTo(150, 9);
    for (const o of w.buildings) if (isOwnerBuilding(o.typeId)) expect(o.cash ?? 0).toBeGreaterThanOrEqual(0);
    expect(Math.abs(totalMoney(w) - m0)).toBeLessThan(1e-6);
  });

  it('settleCap = 1: 금고가 넉넉하면 차액을 다 낸다', () => {
    TUNE.settleCap = 1;
    const { w, A, B } = setup(1000, 50);
    const m0 = totalMoney(w);
    advanceConstruction(w);
    expect(A.cash).toBeCloseTo(600, 9);
    expect(B.cash).toBeCloseTo(450, 9);
    expect(Math.abs(totalMoney(w) - m0)).toBeLessThan(1e-6);
  });

  it('settleCap = 0: 금고를 보지 않고 다 뺀다 (예전 동작, 금고가 음수가 된다)', () => {
    TUNE.settleCap = 0;
    const { w, A, B } = setup(100, 50);
    const m0 = totalMoney(w);
    advanceConstruction(w);
    expect(A.cash).toBeCloseTo(-300, 9);
    expect(B.cash).toBeCloseTo(450, 9);
    expect(Math.abs(totalMoney(w) - m0)).toBeLessThan(1e-6);
  });
});
