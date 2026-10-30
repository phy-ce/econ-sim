// 읽기 함수는 세계를 바꾸지 않는다 (오버홀 C3, docs/overhaul/10_ARCHITECTURE.md 3.3): 부르기 전후 JSON·rngState·nextId 가 같고, 얼린 세계에서 예외가 없다.
// 명세의 READERS 등록부와 config.tune 덮어쓰기 경우는 아직 코드에 없어(0a·A 단계) 지금 index.ts 가 내보내는 읽기 함수 목록을 이 파일에 둔다.
import { describe, expect, it } from 'vitest';
import {
  BUDGET_GROUPS, BUILDING_TYPES, DEPOSITS, ENCYCLOPEDIA, ENC_BUILDINGS, GOOD_IDS, INVEST_LAWS, LAND_TYPES, POP_CLASSES, SKILLS, TAX_LAWS,
  availableMethods, borderCost, budgetDrill, budgetLineRaw, budgetPreview, builderOf, buildingEcon, colonyPopulation, colonySol, companyById,
  constructionEstimate, creditLimit, defaultCtx, depositFree, drillBuild, drillGoods, drillInterest, drillMint, drillStateFirms, drillTariffs,
  drillTax, drillWages, drillWelfare, estimateAfterEntry, estimateMethod, exampleWorld, financeRatio, freightRate, harvestCondition, harvestFactor,
  harvestLabel, hasBuilder, holdingsOf, isOwnerBuilding, kingdomById, kingdomGdp, kingdomOf, landFree, landUsed, lawUnlocked, levelOwnersOf,
  marketWage, marketWages, moneyIdentity, netMinted, outputCapacity, ownershipAssets, playerCompany, policyStatus, priceIn, privatizePrice,
  regionById, regionUnemployment, researchableTechs, roomFor, shippingRate, step, taxCapacity, totalMoney, treasuryFree, unemploymentRate, veinsLeft,
  createWorld,
} from '../../src/index';
import type { BudgetLineKey, EncCtx, World } from '../../src/index';

const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

/** 이름 → 세계를 읽기만 해야 하는 호출 묶음. 화면(packages/client)이 부르는 것과 사전 live 가 기준이다.
 *  쓰기 함수(step, applyCommand*, recordHistory·recordMetrics, weeklyAlerts, prospect, mapMoney, borrow·repay, migrateWorld)는 넣지 않는다 */
const READERS: Record<string, (w: World) => void> = {
  budget: (w) => {
    const steps = { tax: 5, wages: 1, welfare: 5 };
    for (const k of w.kingdoms) {
      budgetPreview(w, k.id);
      budgetPreview(w, k.id, steps);
      for (const g of BUDGET_GROUPS) for (const key of g.lines as BudgetLineKey[]) {
        budgetLineRaw(w, k.id, key);
        budgetLineRaw(w, k.id, key, steps);
        budgetDrill(w, k.id, key);
        budgetDrill(w, k.id, key, steps);
      }
      drillWages(w, k.id, steps); drillStateFirms(w, k.id, steps); drillGoods(w, k.id); drillTax(w, k.id, steps);
      drillWelfare(w, k.id, steps); drillInterest(w, k.id); drillTariffs(w, k.id); drillMint(w, k.id); drillBuild(w, k.id, steps);
    }
  },
  policy: (w) => {
    ownershipAssets(w);
    for (const k of w.kingdoms) {
      policyStatus(w, k.id); financeRatio(w, k.id); taxCapacity(w, k.id); kingdomGdp(w, k.id); kingdomById(w, k.id);
      for (const law of [...TAX_LAWS, ...INVEST_LAWS]) lawUnlocked(w, k, law);
    }
  },
  totalMoney: (w) => { totalMoney(w); moneyIdentity(w); },
  money: (w) => {
    netMinted(w);
    for (const s of SKILLS) marketWage(w, s);
    for (const p of POP_CLASSES) { unemploymentRate(w, p); colonyPopulation(w, p); colonySol(w, p); }
  },
  regions: (w) => {
    for (const r of w.regions) {
      regionById(w, r.id); kingdomOf(w, r.id); shippingRate(w, r.id); harvestCondition(w, r.id); harvestLabel(w, r.id); harvestLabel(w, r.id, true);
      for (const land of LAND_TYPES) { landUsed(w, r.id, land); landFree(w, r.id, land); harvestFactor(w, r.id, land); }
      for (const d of DEPOSITS) { depositFree(w, r.id, d); veinsLeft(w, r.id, d); }
      for (const t of BUILDING_TYPES) roomFor(w, r.id, t.id);
      for (const p of POP_CLASSES) regionUnemployment(w, r.id, p);
      for (const g of GOOD_IDS) { priceIn(w, r.id, g); outputCapacity(w, r.id, g); }
      for (const o of w.regions) for (const g of ['grain', 'tools'] as const) { freightRate(w, r.id, o.id, g); borderCost(w, r.id, o.id, g); }
    }
  },
  companies: (w) => {
    playerCompany(w);
    for (const c of w.companies) {
      companyById(w, c.id); creditLimit(w, c); hasBuilder(w, c); builderOf(w, c); researchableTechs(c); marketWages(w, c.id);
      for (const t of BUILDING_TYPES) if (!t.auto) constructionEstimate(w, c, t.id);
    }
  },
  buildings: (w) => {
    for (const b of w.buildings) {
      buildingEcon(w, b); levelOwnersOf(w, b);
      if (isOwnerBuilding(b.typeId)) { holdingsOf(w, b); treasuryFree(w, b); }
    }
    // 국영 건물 매각가: 왕실마다 자기 건물 몇 개
    for (const gov of w.companies.filter((c) => c.state)) {
      for (const b of w.buildings.filter((x) => x.companyId === gov.id && x.active).slice(0, 10)) privatizePrice(w, gov, b);
    }
  },
  estimates: (w) => {
    const me = playerCompany(w) ?? w.companies.find((c) => !c.state)!;
    const r = w.regions.find((x) => x.kingdomId === me.kingdomId)!;
    for (const t of BUILDING_TYPES) {
      if (t.auto) continue;
      for (const m of availableMethods(me, t.id)) {
        estimateMethod(w, r.id, t.id, m.id, me.wages);
        estimateMethod(w, r.id, t.id, m.id, me.wages, false);
        estimateAfterEntry(w, r.id, t.id, m.id, me.wages);
        estimateAfterEntry(w, r.id, t.id, m.id, me.wages, 3);
      }
    }
  },
  // 사전 live: 항목마다 따로 (얼린 세계 예외를 항목 이름으로 잡는다)
  ...Object.fromEntries(ENCYCLOPEDIA.map((e) => [`enc:${e.id}`, (w: World) => {
    for (const p of e.params) p.value();
    if (!e.live) return;
    const base = defaultCtx(w);
    const ctxs: EncCtx[] = [base];
    if (e.live.pick.includes('region')) for (const r of w.regions) ctxs.push({ ...base, regionId: r.id });
    if (e.live.pick.includes('kingdom')) for (const k of w.kingdoms) ctxs.push({ ...base, kingdomId: k.id });
    if (e.live.pick.includes('good')) for (const g of GOOD_IDS) ctxs.push({ ...base, good: g });
    if (e.live.pick.includes('building')) for (const b of ENC_BUILDINGS) ctxs.push({ ...base, building: b });
    for (const c of ctxs) e.live.run(w, c);
  }])),
};

/** 얼린 세계에서는 빼는 것 (값은 그대로지만 칸에 다시 쓰는 읽기 함수). 지금은 없다: totalMoney 는 A0 에서 mapMoney 를 쓰지 않게 고쳤다 */
const WRITES_SAME_VALUE = new Set<string>();

/** 재귀 Object.freeze (ESM 은 엄격 모드라 얼린 객체에 쓰면 TypeError) */
function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

/** 각 읽기 함수를 불러 바뀐 것이 있으면 이름을 모은다 */
function changedBy(w: World): string[] {
  const bad: string[] = [];
  for (const [name, read] of Object.entries(READERS)) {
    const before = JSON.stringify(w), rng = w.rngState, id = w.nextId;
    read(w);
    if (w.rngState !== rng) bad.push(`${name}: rngState ${rng} -> ${w.rngState}`);
    if (w.nextId !== id) bad.push(`${name}: nextId ${id} -> ${w.nextId}`);
    if (JSON.stringify(w) !== before) bad.push(`${name}: 직렬화가 바뀜`);
  }
  return bad;
}

describe('읽기 함수는 세계를 바꾸지 않는다 (C3)', () => {
  // 시드 2개 × 0일·140일 (명세의 720일은 test:core 시간 때문에 뺐다)
  for (const seed of [42, 7]) {
    const w = createWorld(seed);
    it(`시드 ${seed} 0일`, () => { expect(changedBy(w)).toEqual([]); });
    it(`시드 ${seed} 140일 (얼린 세계 포함)`, () => {
      runTo(w, 140);
      expect(changedBy(w)).toEqual([]);
      // 얼린 사본에서도 예외 없이 돈다 (같은 값을 다시 쓰는 것도 잡는다)
      const frozen = deepFreeze(structuredClone(w));
      const threw: string[] = [];
      for (const [name, read] of Object.entries(READERS)) {
        if (WRITES_SAME_VALUE.has(name)) continue;
        try { read(frozen); } catch (e) { threw.push(`${name}: ${(e as Error).message}`); }
      }
      expect(threw).toEqual([]);
    });
  }

  it('사전 예시는 예시 세계를 바꾸지 않는다', () => {
    const ex = exampleWorld();
    const before = JSON.stringify(ex);
    for (const e of ENCYCLOPEDIA) e.example?.();
    expect(JSON.stringify(ex)).toBe(before);
  });
});
