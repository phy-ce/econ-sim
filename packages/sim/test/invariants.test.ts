import { describe, expect, it } from 'vitest';
import {
  BUILDING_BY_ID, DEPOSITS, GOOD_IDS, GOODS, LAND_TYPES, REGIONS, SKILLS, TECHS, TECH_BY_ID, WEALTH_MAX, WORKFORCE_RATIO,
  applyCommand, colonyPopulation, createWorld, depositFree, landFree, moneyIdentity, playerCompany, regionById, splitKingdoms, step,
} from '../src/index';
import type { World } from '../src/index';

const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) step(w); };

/** 노동자의 식량 충족률 (인구 가중). 기아는 부가 아니라 이것으로 판정한다 */
function laborerFood(w: World): number {
  let pop = 0, fed = 0;
  for (const p of w.pops) if (p.prof === 'unskilled') { pop += p.size; fed += p.size * p.food; }
  return pop > 0 ? fed / pop : 1;
}

describe('경제 불변식', () => {
  it('화폐 총량이 장부와 맞는다 (대륙 + 해외 계정 = 시작 + 주조 + 국채 − 상환 − 이자 − 소멸)', () => {
    const w = createWorld(7);
    const m0 = moneyIdentity(w);
    run(w, 360 * 3);
    expect(w.mint.minted).toBeGreaterThan(0);
    expect(Math.abs(moneyIdentity(w) - m0) / m0).toBeLessThan(1e-9);
  });

  it('가격·현금·저축·부 단계가 정상 범위를 벗어나지 않는다', () => {
    const w = createWorld(3);
    for (let i = 0; i < 360 * 2; i++) {
      step(w);
      for (const r of w.regions) for (const g of GOOD_IDS) {
        expect(r.market[g].price).toBeGreaterThanOrEqual(GOODS[g].basePrice * 0.25 - 1e-9);
        expect(r.market[g].price).toBeLessThanOrEqual(GOODS[g].basePrice * 1.75 + 1e-9);
      }
      for (const p of w.pops) {
        expect(p.savings).toBeGreaterThanOrEqual(-1e-6);
        expect(p.wealth).toBeGreaterThanOrEqual(1);
        expect(p.wealth).toBeLessThanOrEqual(WEALTH_MAX);
        expect(Number.isFinite(p.size)).toBe(true);
      }
      for (const c of w.companies) expect(c.cash).toBeGreaterThanOrEqual(-1e-6);
      expect(w.bank.cash).toBeGreaterThanOrEqual(-1e-6);
      expect(w.traders.cash).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it('고용이 일자리를 넘지 않고, 땅과 매장량 한도를 넘는 건물이 없다', () => {
    const w = createWorld(5);
    run(w, 360 * 3);
    for (const b of w.buildings) {
      if (BUILDING_BY_ID[b.typeId].auto) continue;
      const method = BUILDING_BY_ID[b.typeId].methods.find((m) => m.id === b.methodId)!;
      // 하루 안의 인구 증가만큼은 다음 날 해고로 정리된다
      for (const s of SKILLS) expect(b.employed[s]).toBeLessThanOrEqual((method.workers[s] ?? 0) * b.level * b.utilization * 1.001 + 1e-6);
    }
    for (const r of w.regions) {
      for (const land of LAND_TYPES) expect(landFree(w, r.id, land)).toBeGreaterThanOrEqual(0);
      for (const d of DEPOSITS) expect(depositFree(w, r.id, d)).toBeGreaterThanOrEqual(0);
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

describe('왕국', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('시드 %i: 세 왕국이 각각 이어진 2지역 이상을 갖는다', (seed) => {
    const owner = splitKingdoms(seed);
    for (const k of [1, 2, 3]) {
      const mine = REGIONS.filter((r) => owner[r.id] === k).map((r) => r.id);
      expect(mine.length).toBeGreaterThanOrEqual(2);
      const seen = new Set([mine[0]]);
      const queue = [mine[0]];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const n of REGIONS.find((r) => r.id === cur)!.neighbors) if (mine.includes(n) && !seen.has(n)) { seen.add(n); queue.push(n); }
      }
      expect(seen.size).toBe(mine.length);
    }
  });

  it('다른 왕국 땅에는 지을 수 없고, 소작지는 손댈 수 없다', () => {
    const w = createWorld(1);
    const me = playerCompany(w)!;
    const foreign = w.regions.find((r) => r.kingdomId !== me.kingdomId)!;
    const home = w.regions.find((r) => r.kingdomId === me.kingdomId && r.land.arable > 0)!;
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'farm', regionId: foreign.id })).not.toBeNull();
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'farm', regionId: home.id })).toBeNull();
    const subs = w.buildings.find((b) => b.typeId === 'subsistence' && b.regionId === home.id)!;
    expect(subs.companyId).not.toBe(me.id);
    expect(applyCommand(w, me.id, { type: 'demolish', buildingId: subs.id })).not.toBeNull();
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'subsistence', regionId: home.id })).not.toBeNull();
  });
});

describe('인구', () => {
  it('시작 시 하층은 시작 건물 일꾼을 빼고 전부 소작농이고, 숙련 인력은 자격으로 들어 있다', () => {
    const w = createWorld(1);
    // 노동자는 시작 건물(건축사무소·행정청·농장) 자리만큼만 있다
    const seats = w.buildings.reduce((a, b) => a + b.employed.unskilled, 0);
    expect(Math.abs(colonyPopulation(w, 'unskilled') * WORKFORCE_RATIO - seats)).toBeLessThan(1);
    const total = w.pops.reduce((a, p) => a + p.size, 0);
    expect(colonyPopulation(w, 'peasant') / total).toBeGreaterThan(0.9);
    expect(w.pops.some((p) => (p.quals.skilled ?? 0) > 0)).toBe(true);
    expect(total).toBeGreaterThan(4_500_000);
    expect(total).toBeLessThan(5_500_000);
  });

  it('고용된 사람은 노동 인구 비율만큼만 센다', () => {
    const w = createWorld(2, { withPlayer: false });
    run(w, 200);
    let emp = 0, wf = 0;
    for (const b of w.buildings) for (const s of SKILLS) emp += b.employed[s];
    for (const p of w.pops) if (p.work !== 0 && SKILLS.includes(p.prof as never)) wf += p.size * WORKFORCE_RATIO;
    expect(emp).toBeCloseTo(wf, 3);
  });
});

describe('기술', () => {
  it('기술 없이는 가공 산업을 열 수 없고, 1단계 기술은 기본 예산으로 석 달~아홉 달 걸린다', () => {
    const w = createWorld(1);
    const me = playerCompany(w)!;
    const home = w.regions.find((r) => r.kingdomId === me.kingdomId)!;
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'foodplant', regionId: home.id })).not.toBeNull();
    expect(applyCommand(w, me.id, { type: 'setResearch', techId: 'steam_engine' })).not.toBeNull();
    applyCommand(w, me.id, { type: 'setResearch', techId: 'milling' });
    run(w, 90);
    expect(me.research.known).not.toContain('milling');
    run(w, 180);
    expect(me.research.known).toContain('milling');
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'foodplant', regionId: home.id })).toBeNull();
  });
});

describe('명령', () => {
  it('플레이어가 지은 건물이 완공되어 생산한다', () => {
    const w = createWorld(1);
    const me = playerCompany(w)!;
    const home = w.regions.filter((r) => r.kingdomId === me.kingdomId).sort((a, b) => b.land.forest - a.land.forest)[0];
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'lumber', regionId: home.id })).toBeNull();
    run(w, 120);
    const camp = w.buildings.find((b) => b.companyId === me.id && b.typeId === 'lumber');
    expect(camp).toBeDefined();
    expect(camp!.employed.unskilled).toBeGreaterThan(0);
    expect(camp!.last.output.timber ?? 0).toBeGreaterThan(0);
    expect(regionById(w, home.id).market.timber.supply).toBeGreaterThan(0);
  });
});

describe('장기: 20년이면 경제가 다 발전한다', () => {
  // 소작농 비중 5년차 70% 이상, 10년차 50~70%, 20년차 35% 이하.
  // 기술 17개는 앞선 왕국 기준 15~20년차에 다 열리고, 4단계 기술은 8년차 전에는 열리지 않는다.
  // 그동안 노동자는 대체로 먹고 산다 (식량 충족 최저 40%, 평균 80%).
  it.each([1, 2])('시드 %i', (seed) => {
    const w = createWorld(seed, { withPlayer: false });
    const m0 = moneyIdentity(w);
    const top = Math.max(...TECHS.map((t) => t.cost));
    const share: Record<number, number> = {};
    let allTechs: number | null = null, tier4: number | null = null;
    let minFood = Infinity, sumFood = 0, n = 0;
    for (let t = 1; t <= 360 * 20; t++) {
      step(w);
      if (t > 360 * 2 && t % 30 === 0) { const f = laborerFood(w); minFood = Math.min(minFood, f); sumFood += f; n++; }
      if (t % 360 !== 0) continue;
      const y = t / 360;
      const total = w.pops.reduce((a, p) => a + p.size, 0);
      share[y] = colonyPopulation(w, 'peasant') / total;
      const govs = w.companies.filter((c) => c.state);
      if (allTechs === null && govs.some((c) => c.research.known.length === TECHS.length)) allTechs = y;
      if (tier4 === null && govs.some((c) => c.research.known.some((id) => TECH_BY_ID[id].cost === top))) tier4 = y;
    }
    // 화폐 보존은 20년 내내 지켜진다 (짧은 시험에서 안 보이는 누수)
    expect(Math.abs(moneyIdentity(w) - m0) / m0).toBeLessThan(1e-9);
    console.log(`seed ${seed}: 소작농 5년 ${(share[5] * 100).toFixed(0)}% 10년 ${(share[10] * 100).toFixed(0)}% 20년 ${(share[20] * 100).toFixed(0)}% | 기술 완료 ${allTechs}년 4단계 ${tier4}년 | 노동자 식량 최저 ${(minFood * 100).toFixed(0)}% 평균 ${((sumFood / n) * 100).toFixed(0)}%`);
    expect(share[5]).toBeGreaterThanOrEqual(0.7);
    expect(share[10]).toBeGreaterThanOrEqual(0.5);
    expect(share[10]).toBeLessThanOrEqual(0.7);
    expect(share[20]).toBeLessThanOrEqual(0.35);
    expect(allTechs).not.toBeNull();
    expect(allTechs!).toBeGreaterThanOrEqual(15);
    expect(tier4!).toBeGreaterThanOrEqual(8);
    expect(w.mobility?.['peasant>unskilled'] ?? 0).toBeGreaterThan(0);
    expect(minFood).toBeGreaterThan(0.4);
    expect(sumFood / n).toBeGreaterThan(0.8);
  }, 600_000);
});
