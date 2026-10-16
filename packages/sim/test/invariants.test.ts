import { describe, expect, it } from 'vitest';
import {
  GOOD_IDS, GOODS, POP_CLASSES, SKILLS, MAX_RESEARCH_BUDGET, TECH_BY_ID, WEALTH_MAX, applyCommand, colonyPopulation, colonySol, createWorld, landFree, moneyIdentity,
  playerCompany, regionById, step,
} from '../src/index';
import type { World } from '../src/index';

const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) step(w); };

/** 왕국 노동자의 식량 충족률 (인구 가중). 기아는 부가 아니라 이것으로 판정한다 */
function laborerFood(w: World): number {
  let pop = 0, fed = 0;
  for (const r of w.regions) { const h = r.households.unskilled; pop += h.population; fed += h.population * (h.food ?? 1); }
  return pop > 0 ? fed / pop : 1;
}

describe('경제 불변식', () => {
  it('화폐 총량이 보존된다 (콜로니 + 외부 계정)', () => {
    const w = createWorld(7);
    const m0 = moneyIdentity(w);
    run(w, 360 * 3);
    expect(Math.abs(moneyIdentity(w) - m0) / m0).toBeLessThan(1e-9);
  });

  it('재고·현금·가격·부 단계가 정상 범위를 벗어나지 않는다', () => {
    const w = createWorld(3);
    for (let i = 0; i < 360 * 3; i++) {
      step(w);
      for (const r of w.regions) {
        for (const g of GOOD_IDS) {
          const mg = r.market[g];
          expect(mg.inventory).toBeGreaterThanOrEqual(-1e-6);
          expect(mg.price).toBeGreaterThanOrEqual(GOODS[g].basePrice * 0.25 - 1e-9);
          expect(mg.price).toBeLessThanOrEqual(GOODS[g].basePrice * 4 + 1e-9);
        }
        for (const s of POP_CLASSES) {
          expect(r.households[s].savings).toBeGreaterThanOrEqual(-1e-6);
          expect(r.households[s].wealth).toBeGreaterThanOrEqual(1);
          expect(r.households[s].wealth).toBeLessThanOrEqual(WEALTH_MAX);
          expect(Number.isFinite(r.households[s].population)).toBe(true);
        }
      }
      for (const c of w.companies) expect(c.cash).toBeGreaterThanOrEqual(-1e-6);
      expect(w.bank.cash).toBeGreaterThanOrEqual(-1e-6);
      expect(w.traders.cash).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it('고용자 수가 지역 인구를 넘지 않고, 땅 한도를 넘는 건물이 없다', () => {
    const w = createWorld(5);
    run(w, 360 * 3);
    for (const r of w.regions) {
      for (const s of SKILLS) {
        const emp = w.buildings.filter((b) => b.regionId === r.id).reduce((a, b) => a + b.employed[s], 0);
        expect(emp).toBeLessThanOrEqual(r.households[s].population + 1e-6);
      }
      for (const land of ['arable', 'forest', 'ore', 'plot'] as const) expect(landFree(w, r.id, land)).toBeGreaterThanOrEqual(0);
    }
  });

  it('같은 시드는 같은 결과를 낸다 (저장/불러오기 포함)', () => {
    const a = createWorld(42);
    const b = createWorld(42);
    run(a, 200);
    run(b, 100);
    const restored: World = JSON.parse(JSON.stringify(b));
    run(restored, 100);
    expect(JSON.stringify(restored)).toEqual(JSON.stringify(a));
  });
});

describe('계층 구조', () => {
  it('시작 시 하층의 85% 이상이 소작농이고 소작농은 기아선 아래에서 출발한다', () => {
    const w = createWorld(1);
    const peasants = colonyPopulation(w, 'peasant');
    const laborers = colonyPopulation(w, 'unskilled');
    expect(peasants / (peasants + laborers)).toBeGreaterThanOrEqual(0.85);
    expect(colonySol(w, 'peasant')).toBeLessThan(5);
  });

  it('5년 뒤에도 상층은 노동자보다 훨씬 잘살고, 노동자는 굶지 않는다', () => {
    const w = createWorld(2, { withPlayer: false });
    run(w, 360 * 5);
    expect(colonySol(w, 'aristocrat')).toBeGreaterThan(colonySol(w, 'unskilled') + 5);
    // 자본가는 산업이 막 자라는 초반 5년엔 지주만큼 부유하지 않을 수 있다
    expect(colonySol(w, 'capitalist')).toBeGreaterThan(colonySol(w, 'unskilled') + 2);
    // 한 시점의 값이라 흉년이 걸릴 수 있다: 대체로 먹고 사는지만 본다
    expect(laborerFood(w)).toBeGreaterThan(0.8);
    expect(colonySol(w, 'unskilled')).toBeGreaterThan(4);
  });

  it('산업화가 진행되면 소작농이 노동자로 흡수된다 (8년에 4분의 1 이상)', () => {
    const w = createWorld(3, { withPlayer: false });
    const before = colonyPopulation(w, 'peasant');
    run(w, 360 * 8);
    expect(colonyPopulation(w, 'peasant')).toBeLessThan(before * 0.75);
  });

  it('기술 없이는 고급 생산 방식을 쓸 수 없다', () => {
    const w = createWorld(1);
    const me = playerCompany(w)!;
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'fab', regionId: 1 })).not.toBeNull();
    expect(applyCommand(w, me.id, { type: 'setResearch', techId: 'electronics' })).not.toBeNull();
    expect(applyCommand(w, me.id, { type: 'setResearch', techId: 'power_saw' })).not.toBeNull();
    // 처음엔 1차 산업만: 식품 공장·학교는 기술이 있어야 짓는다
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'foodplant', regionId: 1 })).not.toBeNull();
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'school', regionId: 1 })).not.toBeNull();
    // 연구비를 최대로 넣어도 가장 싼 기술도 약 한 달은 걸린다
    const cheapest = Math.min(...Object.values(TECH_BY_ID).map((t) => t.cost));
    expect(cheapest / MAX_RESEARCH_BUDGET).toBeGreaterThanOrEqual(28);
    applyCommand(w, me.id, { type: 'setResearch', techId: 'milling' });
    applyCommand(w, me.id, { type: 'setResearchBudget', budget: MAX_RESEARCH_BUDGET });
    run(w, 25);
    expect(me.research.known).not.toContain('milling');
    run(w, 10);
    expect(me.research.known).toContain('milling');
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'foodplant', regionId: 1 })).toBeNull();
  });
});

describe('장기 안정성', () => {
  it.each([1, 2, 3, 4])('시드 %i: 15년 동안 노동자가 굶지 않는다', (seed) => {
    const w = createWorld(seed);
    let min = Infinity, minFood = Infinity, sumFood = 0, n = 0;
    for (let t = 0; t < 360 * 15; t++) {
      step(w);
      if (t > 360 * 2 && t % 30 === 0) {
        const f = laborerFood(w);
        min = Math.min(min, colonySol(w, 'unskilled')); minFood = Math.min(minFood, f); sumFood += f; n++;
      }
    }
    // 흉년에 어느 정도 굶는 건 피할 수 없다. 다만 절반 아래로 무너지지 않고, 평균으로는 대체로 먹고 산다
    console.log(`seed ${seed}: 노동자 식량 최저 ${(minFood * 100).toFixed(0)}% 평균 ${(sumFood / n * 100).toFixed(0)}%, 부 최저 ${min.toFixed(1)}`);
    expect(minFood).toBeGreaterThan(0.4);
    expect(sumFood / n).toBeGreaterThan(0.85);
    expect(min).toBeGreaterThan(3);
    expect(w.regions[0].market.food.supplyEma + w.regions[1].market.grain.supplyEma).toBeGreaterThan(20);
  });
});

describe('명령', () => {
  it('땅이 없는 지역에는 지을 수 없다', () => {
    const w = createWorld(1);
    const me = playerCompany(w)!;
    const r = regionById(w, 1);
    r.land.arable = 0;
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'farm', regionId: 1 })).toMatch(/농지/);
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'farm', regionId: 2 })).toBeNull();
  });

  it('플레이어가 지은 건물이 완공되어 생산한다', () => {
    const w = createWorld(1);
    const me = playerCompany(w)!;
    applyCommand(w, me.id, { type: 'build', typeId: 'farm', regionId: 2 });
    // 건축사무소(12점/일, 숙련도 램프)로 450점짜리 농장을 짓고 사람을 뽑기까지
    run(w, 200);
    const farm = w.buildings.find((b) => b.companyId === me.id && b.typeId === 'farm');
    expect(farm).toBeDefined();
    expect(farm!.employed.unskilled).toBeGreaterThan(0);
    expect(farm!.last.output.grain ?? 0).toBeGreaterThan(0);
  });
});
