import { describe, expect, it } from 'vitest';
import {
  BUILDING_BY_ID, REGIONS, SKILLS, WORKFORCE_RATIO, applyCommand, colonyPopulation, createWorld, levelOwnersOf, moneyIdentity, playerCompany, regionById, splitKingdoms,
} from '../src/index';
import { run } from './helpers';

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
    // 노동자는 시작 건물(건축사무소·행정청·농장·벌목장·섬유 농장) 자리만큼만 있다
    const seats = w.buildings.reduce((a, b) => a + b.employed.unskilled, 0);
    expect(Math.abs(colonyPopulation(w, 'unskilled') * WORKFORCE_RATIO - seats)).toBeLessThan(1);
    const total = w.pops.reduce((a, p) => a + p.size, 0);
    expect(colonyPopulation(w, 'peasant') / total).toBeGreaterThan(0.88);
    expect(w.pops.some((p) => (p.quals.skilled ?? 0) > 0)).toBe(true);
    expect(total).toBeGreaterThan(4_500_000);
    expect(total).toBeLessThan(5_500_000);
  });

  it('고용된 사람은 노동 인구 비율만큼만 센다', () => {
    const w = createWorld(2, { withPlayer: false });
    run(w, 200);
    let emp = 0, wf = 0, n = 0;
    for (const b of w.buildings) for (const s of SKILLS) { emp += b.employed[s]; if (b.employed[s] > 0) n++; }
    for (const p of w.pops) if (p.work !== 0 && SKILLS.includes(p.prof as never)) wf += p.size * WORKFORCE_RATIO;
    // 건물 고용은 반올림하지 않으므로 부동소수점 오차만 남는다
    expect(Math.abs(emp - wf)).toBeLessThanOrEqual(1e-6 * Math.max(1, wf));
    expect(emp).toBeGreaterThan(0);
  });
});

describe('기술', () => {
  it('기술 없이는 가공 산업을 열 수 없고, 1단계 기술은 시작 문해력의 연구 포인트로 석 달~아홉 달 걸린다', () => {
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

describe('레벨 주인', () => {
  it('민간 건물의 레벨은 모두 저택·금융가 것이고, 왕실 건물은 국가 것이다', () => {
    const w = createWorld(1, { withPlayer: false });
    run(w, 240);
    for (const b of w.buildings) {
      if (BUILDING_BY_ID[b.typeId].auto) continue;
      const owners = levelOwnersOf(w, b);
      expect(owners.reduce((a, x) => a + x.levels, 0), `#${b.id} ${b.typeId}`).toBe(b.level);
      if (b.stateOwned) expect(owners.every((x) => x.owner === 'state')).toBe(true);
      else expect(owners.every((x) => x.owner === 'manor' || x.owner === 'finance')).toBe(true);
    }
    // 민간 공사는 저택·금융가 금고가 낸다
    expect(w.constructions.some((k) => k.funders && Object.keys(k.funders).length > 0)).toBe(true);
  });

  it('민영화를 켠 왕실 건물의 레벨을 저택·금융가가 사 가고, 값은 국고로 간다', () => {
    const w = createWorld(1);
    const me = playerCompany(w)!;
    const home = w.regions.filter((r) => r.kingdomId === me.kingdomId).sort((a, b) => b.land.forest - a.land.forest)[0];
    expect(applyCommand(w, me.id, { type: 'build', typeId: 'lumber', regionId: home.id, levels: 2 })).toBeNull();
    run(w, 150);
    const camp = w.buildings.find((b) => b.companyId === me.id && b.typeId === 'lumber')!;
    expect(camp.level).toBe(2);
    const firm = w.companies.find((c) => !c.state && c.kingdomId === me.kingdomId)!;
    expect(applyCommand(w, firm.id, { type: 'setPrivatize', buildingId: camp.id, on: true })).not.toBeNull();
    expect(applyCommand(w, me.id, { type: 'setPrivatize', buildingId: camp.id, on: true })).toBeNull();
    // 산다는 조건을 맞춘다: 큰 이익과 넉넉한 금고 (돈을 넣은 뒤의 화폐 장부를 기준으로 본다)
    const manor = w.buildings.find((b) => b.typeId === 'manor' && b.regionId === home.id)!;
    manor.cash = 1e10;
    const before = moneyIdentity(w), cash = me.cash;
    for (let d = 0; d < 7; d++) { camp.profitEma = 50_000; run(w, 1); }
    expect(camp.level).toBe(1);
    const priv = w.buildings.find((b) => !b.stateOwned && b.typeId === 'lumber' && b.regionId === home.id)!;
    expect(levelOwnersOf(w, priv).some((x) => x.owner === 'manor' && x.ownerBuildingId === manor.id)).toBe(true);
    expect(me.cash).toBeGreaterThan(cash);
    expect(Math.abs(moneyIdentity(w) - before)).toBeLessThan(0.01);
  });
});
