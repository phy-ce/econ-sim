import { BUILDING_BY_ID, BUILDING_TYPES, GOOD_IDS, GOODS, SCHOOL_CAPACITY, SKILL_DEFS, TECH_BY_ID, TICKS_PER_WEEK, TICKS_PER_YEAR, getMethod, POP_SCALE, regionPerk } from './data';
import {
  availableMethods, bookValue, canBuildType, colonyPrice, constructionEstimate, payClassIn, creditLimit, estimateAfterEntry, expectedSellThrough, hasBuilder, estimateMethod, landFree,
  payHouseholds, regionById, regionPopulation, regionUnemployment, researchableTechs, slots, unemploymentRate, ownerJobs, shippingRate, CARTAGE_RATE,
} from './economy';
import { applyCommand } from './commands';
import { skillShareCap } from './tick';
import { MAX_RESEARCH_BUDGET } from './commands';
import { rand } from './rng';
import { marketOutlook, techValue, valueMethod } from './outlook';
import type { Outlook } from './outlook';
import { SKILLS } from './types';
import type { Company, GoodBag, GoodId, MethodDef, PopClass, Region, Skill, World } from './types';

/** 건설 판단 기준: 연간 이윤 / 공사비 */
const MIN_ROI = 0.4;
/** 생산 방식 전환 후 재전환까지 대기 */
const SWITCH_COOLDOWN = TICKS_PER_WEEK * 3;
/** 여유가 있을 때 이익이 안 보여도 새 산업에 투자해 보는 주간 확률 */
const EXPLORE_CHANCE = 0.08;

/** 주 1회 AI 회사의 의사결정. AI도 플레이어와 같은 applyCommand 경로를 쓴다 */
export function runAi(w: World) {
  const outlook = marketOutlook(w);
  for (const c of w.companies) {
    if (c.isPlayer) continue;
    if (!w.config.ai) { payDividends(w, c); continue; }
    adjustWages(w, c);
    manageBuildings(w, c);
    planResearch(w, c, outlook);
    planConstruction(w, c, outlook);
    payDividends(w, c);
  }
}

/** 투입재를 왕국 어딘가에서 구할 수 있고(운송으로 들여옴) 지역 가격이 폭등하지 않았는가 */
export function inputsAvailable(w: World, r: Region, method: MethodDef, levels: number): boolean {
  for (const [g, per] of Object.entries(method.inputs) as [GoodId, number][]) {
    // 실제로 어디선가 생산되고 있어야 한다. 시작 재고만으로는 금방 바닥나므로 재고는 절반만 친다
    let avail = 0;
    for (const x of w.regions) avail += x.market[g].inventory * 0.5 + x.market[g].supplyEma * 20;
    if (avail < per * levels * 10) return false;
    if (r.market[g].price > GOODS[g].basePrice * 2.5) return false;
  }
  return true;
}

/**
 * 지역 시장에 추가 공급을 받아줄 여유가 있는가. 이웃 지역의 부족분도 일부 감안한다.
 * 가격이 기본가보다 높으면 부족 신호로 보고 더 관대하게 판단한다.
 */
export function marketHasRoom(w: World, r: Region, outputs: GoodBag, extraLevels: number, pending: GoodBag): boolean {
  for (const g of GOOD_IDS) {
    const per = outputs[g];
    if (!per) continue;
    const mg = r.market[g];
    if (mg.inventory > mg.target * 3 || expectedSellThrough(g, mg) < 0.9) return false;
    // 이웃의 모자란 수요는 운송으로 닿는 만큼만 센다 (철도가 없으면 거의 못 판다)
    const reach = GOODS[g].perishable ? 0 : Math.max(0, 1 - shippingRate(w, r.id) / CARTAGE_RATE);
    let neighborGap = 0;
    for (const nb of r.neighbors) {
      const m2 = regionById(w, nb).market[g];
      neighborGap += Math.max(0, m2.demandEma - m2.supplyEma) * reach;
    }
    const tolerance = mg.price / GOODS[g].basePrice > 1 ? 1.2 : 1.08;
    const projected = mg.supplyEma + (pending[`${r.id}:${g}` as GoodId] ?? 0) + per * extraLevels;
    if (projected > mg.demandEma * tolerance + neighborGap * 0.5 + per * 0.5) return false;
  }
  return true;
}

/** 공사 중인 프로젝트들이 완공되면 늘어날 산출량 (지역:상품 키) */
function pendingOutput(w: World): GoodBag {
  const out: Record<string, number> = {};
  for (const k of w.constructions) {
    const m = getMethod(k.typeId, k.methodId);
    for (const g of GOOD_IDS) if (m.outputs[g]) out[`${k.regionId}:${g}`] = (out[`${k.regionId}:${g}`] ?? 0) + m.outputs[g]!;
  }
  return out as GoodBag;
}

/** 회사가 노동자를 쓰는 지역들의 최저 수용 임금(자급 소득) 중 가장 높은 값 */
function reservationWage(w: World, c: Company): number {
  let v = 0;
  for (const b of w.buildings) if (b.companyId === c.id) v = Math.max(v, regionById(w, b.regionId).subsistenceIncome * 1.05);
  return v || SKILL_DEFS.unskilled.baseWage * 0.4;
}

/** 지역 하층의 10% 넘게 소작농이 남아 있으면 빈자리는 임금을 올리지 않아도 곧 찬다 */
function isReservoir(r: Region): boolean {
  const p = r.households.peasant.population;
  return p > (p + r.households.unskilled.population) * 0.1;
}

function adjustWages(w: World, c: Company) {
  const paysInFull = !w.buildings.some((b) => b.companyId === c.id && b.unpaid);
  for (const s of SKILLS) {
    let cap = 0, emp = 0;
    for (const b of w.buildings) {
      if (b.companyId !== c.id) continue;
      cap += slots(b, s);
      emp += b.employed[s];
    }
    if (cap <= 0) continue;
    const vacancy = 1 - emp / cap;
    const base = SKILL_DEFS[s].baseWage;
    let wage = c.wages[s];
    // 임금은 경직적이다: 흑자이고 임금을 다 주는데 빈자리가 많으면 올리고, 적자면 내리고,
    // 실업자가 많은데 기본가보다 높게 주고 있으면 천천히 내린다
    // 노동력이 남아도는 동안은 흑자여도 사람을 구할 수 있는 최저선까지 임금을 깎는다(착취).
    // 노동력이 귀해져 빈자리가 생기면 그때서야 올린다.
    // 흑자이고 임금을 다 주는데 빈자리가 있으면 올리고, 적자면 내리고,
    // 실업자가 많으면 사람을 구할 수 있는 최저선(농민 현물 소득 조금 위)까지 깎는다.
    const unemp = unemploymentRate(w, s);
    const floor = s === 'unskilled' ? reservationWage(w, c) * 1.08 : base * 0.5;
    // 노동자 빈자리는 지역에 소작농이 남아 있으면 임금을 올리지 않아도 곧 찬다
    const reservoir = s === 'unskilled' && w.buildings.some((b) => b.companyId === c.id && isReservoir(regionById(w, b.regionId)));
    if (vacancy > 0.05 && paysInFull && c.lastWeekProfit > 0 && !reservoir) wage *= 1.02;
    else if (c.lastWeekProfit < 0) wage *= 0.98;
    else if (unemp > 0.08 && wage > floor) wage *= 0.985;
    wage = Math.min(base * 3, Math.max(floor, base * 0.3, wage));
    if (wage !== c.wages[s]) applyCommand(w, c.id, { type: 'setWage', skill: s, wage });
  }
}

/** 산출물 1단위(주 산출물 기준)당 이윤 — 방식끼리 비교용 */
function unitProfit(e: { profit: number }, m: MethodDef): number {
  const out = GOOD_IDS.reduce((a, g) => a + (m.outputs[g] ?? 0), 0);
  return out > 0 ? e.profit / out : e.profit;
}

function manageBuildings(w: World, c: Company) {
  for (const b of w.buildings.filter((x) => x.companyId === c.id)) {
    const r = regionById(w, b.regionId);
    const usable = availableMethods(c, b.typeId);
    const current = estimateMethod(w, b.regionId, b.typeId, b.methodId, c.wages);

    // 투입재를 못 구해 생산이 멈췄으면 투입재가 필요 없는 방식으로 즉시 전환
    if (b.active && b.last.inputFill < 0.5) {
      const fallback = usable.find((m) => Object.keys(m.inputs).length === 0 && !m.grant);
      if (fallback && fallback.id !== b.methodId) {
        applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: fallback.id });
        b.lastSwitchTick = w.tick;
        continue;
      }
    }

    // 건축사무소: 자재를 구할 수 있는 방식 중 하루 포인트가 가장 많은 것으로 (적자 판단에서 제외).
    // 지금 방식의 자재가 끊겼으면 쿨다운 없이 바로 바꾼다
    const curMethod = getMethod(b.typeId, b.methodId);
    if (curMethod.construction) {
      const starved = b.active && !b.idle && b.last.inputFill < 0.5;
      const ok = usable.filter((m) => m.construction && (m.id === b.methodId ? !starved : inputsAvailable(w, r, m, b.level)));
      const best = ok.length ? ok.reduce((x, m) => (m.construction! > x.construction! ? m : x)) : null;
      if (best && best.id !== b.methodId && (starved || w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN)) {
        applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id });
        b.lastSwitchTick = w.tick;
      }
      continue;
    }

    // 생산 방식 전환: 매주 모든 건물을 검토한다 (건물별 3주 쿨다운). 산출물이 바뀌는 전환은 그 시장에 여유가 있을 때만
    if (usable.length > 1 && w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN) {
      const cur = getMethod(b.typeId, b.methodId);
      const mainOut = (m: MethodDef) => GOOD_IDS.find((g) => m.outputs[g]);
      // 같은 상품을 더 싸게 만드는 방식이면(기술 개량) 생산량을 유지하도록 가동률을 맞춰 전환한다.
      // 산출물이 바뀌는 전환(곡물→섬유 등)은 그 시장에 여유가 있어야 한다.
      let best = { id: b.methodId, unitProfit: unitProfit(current, cur), util: b.utilization };
      for (const m of usable) {
        if (m.id === b.methodId || m.grant || !inputsAvailable(w, r, m, b.level)) continue;
        const e = estimateMethod(w, b.regionId, b.typeId, m.id, c.wages);
        const sameProduct = mainOut(m) === mainOut(cur);
        if (!sameProduct && !marketHasRoom(w, r, m.outputs, b.level * 0.5, {})) continue;
        const g = mainOut(m);
        const util = sameProduct && g ? Math.min(1, (b.utilization * (cur.outputs[g] ?? 0)) / (m.outputs[g] ?? 1)) : b.utilization;
        if (unitProfit(e, m) > best.unitProfit) best = { id: m.id, unitProfit: unitProfit(e, m), util };
      }
      const curUnit = unitProfit(current, cur);
      if (best.id !== b.methodId && best.unitProfit > 0 && best.unitProfit > Math.max(0, curUnit) * 1.05 + 0.01) {
        applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id });
        applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: Math.max(0.3, best.util) });
        b.lastSwitchTick = w.tick;
      }
    }

    if (!b.active) {
      b.pausedWeeks += 1;
      if (current.margin > 0.05 && inputsAvailable(w, r, getMethod(b.typeId, b.methodId), b.level)) {
        applyCommand(w, c.id, { type: 'setActive', buildingId: b.id, active: true });
        applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: 0.3 });
        b.lossWeeks = 0;
        b.profitEma = 0;
      } else if (b.pausedWeeks >= 26) {
        applyCommand(w, c.id, { type: 'demolish', buildingId: b.id });
        b.pausedWeeks = 0;
      }
      continue;
    }
    // 생산은 쉽게 줄이지 않는다(가격과 임금이 조정을 맡는다).
    // 매출이 비용의 80%에도 못 미치는 큰 적자가 8주 이상 이어질 때만 가동률을 낮춘다.
    // 투입재를 못 구해 멈춘 건물(임금만 나가는 상태)도 출혈로 본다
    const starved = Object.keys(getMethod(b.typeId, b.methodId).inputs).length > 0 && b.last.inputFill < 0.5;
    // 추정치뿐 아니라 실제 장부(어제 매출 대비 비용)도 본다. 팔리지 않고 창고에 쌓이면 추정은 멀쩡해도 돈이 샌다
    const cost = b.last.inputCost + b.last.wageCost;
    const actualMargin = cost > 0 ? (b.last.revenue - cost) / cost : 0;
    const bleeding = (b.profitEma < 0 && (current.margin < -0.2 || actualMargin < -0.2)) || starved;
    b.lossWeeks = bleeding ? b.lossWeeks + 1 : 0;
    if (b.lossWeeks >= 8) {
      if (b.utilization <= 0.2 && b.level > 1) {
        // 여러 개짜리 건물은 멈추기 전에 하나씩 철거해 규모를 줄인다 (4주마다 하나)
        applyCommand(w, c.id, { type: 'demolish', buildingId: b.id });
        b.lossWeeks = 4;
      } else if (b.utilization <= 0.2) {
        applyCommand(w, c.id, { type: 'setActive', buildingId: b.id, active: false });
        b.pausedWeeks = 0;
      } else {
        applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: b.utilization - 0.1 });
      }
    } else if (b.utilization < 1 && current.margin > 0) {
      applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: b.utilization + 0.1 });
    }
  }
}

/** 여유가 있으면 매출의 일부를 연구에 쓴다. 가장 싼 연구 가능 기술부터 (동률은 무작위) */
function planResearch(w: World, c: Company, o: Outlook) {
  const r = c.research;
  const spare = c.cash - reserveOf(w, c);
  if (!r.current) {
    // 연구비 대비 가치가 큰 기술부터: 기술이 여는 방식의 장기 이윤(기존 건물 개선 + 새 건물). 가치가 없어 보이면 선행 기술로서의 가치를 본다
    const options = researchableTechs(c);
    const direct = new Map(Object.keys(TECH_BY_ID).map((id) => [id, techValue(w, o, c, id)] as const));
    const memo = new Map<string, number>();
    const deep = (id: string): number => {
      if (memo.has(id)) return memo.get(id)!;
      memo.set(id, 0);
      let v = direct.get(id) ?? 0;
      for (const t of Object.values(TECH_BY_ID)) if (t.requires.includes(id)) v = Math.max(v, deep(t.id) * 0.5);
      memo.set(id, v);
      return v;
    };
    const ranked = options.map((id) => ({ id, s: ((deep(id) + 1) / TECH_BY_ID[id].cost) * (0.85 + rand(w) * 0.3) })).sort((a, b) => b.s - a.s);
    if (ranked.length) applyCommand(w, c.id, { type: 'setResearch', techId: ranked[0].id });
  }
    // 연구가 건설을 굶기지 않게: 한 달에 여유 현금의 30%와 매출의 8%까지
  const budget = r.current && spare > 0 ? Math.min(MAX_RESEARCH_BUDGET, (spare * 0.3) / 30 + c.revenueEma * 0.08) : 0;
  if (budget !== r.budget) applyCommand(w, c.id, { type: 'setResearchBudget', budget });
}

function weeklyWageBill(w: World, c: Company): number {
  let bill = 0;
  for (const b of w.buildings) {
    if (b.companyId !== c.id) continue;
    for (const s of SKILLS) bill += b.employed[s] * c.wages[s];
  }
  return bill * TICKS_PER_WEEK;
}

export function reserveOf(w: World, c: Company): number {
  return 500 * POP_SCALE + weeklyWageBill(w, c) * 2 + c.research.budget * TICKS_PER_WEEK;
}

export function committedCost(w: World, c: Company): number {
  let total = 0;
  for (const k of w.constructions) {
    if (k.companyId !== c.id) continue;
    const est = constructionEstimate(w, c, k.typeId);
    if (!Number.isFinite(est.cost)) continue;
    total += Math.max(0, est.cost * (1 - k.points / k.required));
  }
  return total;
}

/**
 * 병목 사슬(광석→금속→공구 등)을 채우는 건물의 손익. 산출물은 기본가(현지가가 더 낮으면 현지가)에서 운송비를 뺀 값에 팔되,
 * 팔리는 양은 왕국에서 아직 못 채운 양(이미 공사 중인 산출은 뺀다)까지로 본다.
 */
function bottleneckEstimate(w: World, r: Region, typeId: string, m: MethodDef, wages: Record<Skill, number>, gaps: Map<GoodId, number>, pending: GoodBag) {
  const e = estimateAfterEntry(w, r.id, typeId, m.id, wages, 1, pending as Record<string, number>, gaps);
  const ship = shippingRate(w, r.id);
  let revenue = 0;
  for (const g of GOOD_IDS) {
    const out = m.outputs[g];
    if (!out) continue;
    const gap = gaps.get(g);
    if (gap === undefined) { revenue += (e.revenue * out) / GOOD_IDS.reduce((a, x) => a + (m.outputs[x] ?? 0), 0); continue; }
    let building = 0;
    for (const [k, v] of Object.entries(pending as Record<string, number>)) if (k.endsWith(`:${g}`)) building += v;
    const sold = Math.min(out, Math.max(0, gap - building));
    revenue += sold * Math.min(r.market[g].price, GOODS[g].basePrice) * (1 - ship);
  }
  // 투입재도 같은 부족 사슬에 있으면(광석·연료 → 제련소) 곧 공급될 것이므로 지금의 품귀 가격 대신 기본가 이하로 본다
  let inputCost = 0;
  for (const g of GOOD_IDS) {
    const per = m.inputs[g];
    if (!per) continue;
    const p = r.market[g].price;
    inputCost += per * (gaps.has(g) ? Math.min(p, GOODS[g].basePrice) : p);
  }
  const profit = revenue - inputCost - e.wageCost;
  return { ...e, revenue, inputCost, profit };
}

/**
 * 그 지역(과 이웃 일부)에 이 방식을 돌릴 일손이 있는가 0..1.
 * 노동자는 소작농이 곧바로 공장으로 오므로 소작농도 센다. 기술자·전문가는 빈자리가 임금을 올려 끌어오므로 느슨하게 본다.
 */
export function laborAvailability(w: World, r: Region, m: MethodDef): number {
  let labor = 1;
  for (const s of SKILLS) {
    const need = m.workers[s] ?? 0;
    if (need <= 0) continue;
    let idle = r.households[s].population * regionUnemployment(w, r.id, s);
    if (s === 'unskilled') idle += r.households.peasant.population;
    for (const nb of r.neighbors) {
      const n = regionById(w, nb);
      idle += n.households[s].population * regionUnemployment(w, nb, s) * 0.3;
      if (s === 'unskilled') idle += n.households.peasant.population * 0.3;
    }
    // 교육 수준이 받쳐 주면 하위 직종에서 승급해 올 사람도 센다 (공사 기간 동안 채워질 만큼)
    const pop = regionPopulation(r);
    if (s !== 'unskilled' && r.households[s].population / pop < skillShareCap(r.education, s)) {
      const from = s === 'skilled' ? r.households.unskilled : r.households.skilled;
      const learn = s === 'skilled' ? r.education : Math.max(0, r.education - 0.25) * 2;
      idle += from.population * 0.0004 * learn * 60;
    }
    // 중층은 필요 인원의 4분의 1만 있어도 짓는다 (나머지는 승급과 임금으로 채운다)
    labor = Math.min(labor, s === 'unskilled' ? idle / need : (idle / need) * 4);
  }
  return labor;
}

/** 학교가 이미 지역 인구의 60%를 감당하는가 */
export function schoolsSaturated(w: World, r: Region): boolean {
  let seats = 0;
  for (const b of w.buildings) if (b.regionId === r.id && getMethod(b.typeId, b.methodId).grant) seats += b.level * SCHOOL_CAPACITY;
  for (const k of w.constructions) if (k.regionId === r.id && getMethod(k.typeId, k.methodId).grant) seats += SCHOOL_CAPACITY;
  // 국고가 보조금을 다 못 대면 더 짓지 않는다
  if (w.grantRatio < 0.9) return true;
  return seats >= regionPopulation(r) * 0.3;
}

/**
 * 병목 상품 집합: 왕국 어디선가 기본가의 2배를 넘는 상품과, 그것을 만드는 데 필요한데 왕국에 없는 투입재(연쇄).
 * 예: 금속이 비싸면 금속 → (제련소 투입) 광석·연료까지 포함된다. 이 상품을 만드는 건물은 시장 여유·투입재 검사를 건너뛴다.
 */
export function bottleneckGoods(w: World): Map<GoodId, number> {
  // 상품 → 하루 부족량. 비싸면서 실제로 못 채운 수요가 있는 상품만 (빈 시장에서 가격만 떠 있는 상품은 제외)
  const needed = new Map<GoodId, number>();
  for (const g of GOOD_IDS) {
    if (colonyPrice(w, g) <= GOODS[g].basePrice * 2) continue;
    let unmet = 0;
    for (const r of w.regions) unmet += Math.max(0, r.market[g].demandEma - r.market[g].supplyEma);
    if (unmet >= 1) needed.set(g, unmet);
  }
  const available = (g: GoodId) => w.regions.reduce((a, r) => a + r.market[g].inventory + r.market[g].supplyEma * 5, 0) > GOODS[g].minStock * 0.2;
  // 잠재 수요: 쓸 수 있는 더 나은 방식(공구·연료를 쓰는 방식)을 투입재가 비싸거나 없어서 못 쓰고 있으면, 그 투입재가 부족한 것이다.
  // 건물마다 투입재별로 가장 많이 쓰는 대안 하나만 센다
  const scarce = (g: GoodId) => !available(g) || colonyPrice(w, g) > GOODS[g].basePrice * 1.5;
  for (const b of w.buildings) {
    const c = w.companies.find((x) => x.id === b.companyId);
    if (!c) continue;
    const want = new Map<GoodId, number>();
    for (const m of availableMethods(c, b.typeId)) {
      if (m.id === b.methodId || m.grant) continue;
      for (const g of GOOD_IDS) {
        const per = m.inputs[g];
        if (!per || !scarce(g)) continue;
        want.set(g, Math.max(want.get(g) ?? 0, per * b.level));
      }
    }
    for (const [g, q] of want) needed.set(g, (needed.get(g) ?? 0) + q);
  }
  // 그 상품을 만드는 데 필요한데 왕국에 없는 투입재: 부족분을 메울 건물 하나가 쓰는 만큼을 부족량으로 본다
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of BUILDING_TYPES) {
      for (const m of t.methods) {
        if (!GOOD_IDS.some((g) => m.outputs[g] && needed.has(g))) continue;
        for (const g of GOOD_IDS) {
          if (!m.inputs[g] || needed.has(g) || (available(g) && !scarce(g))) continue;
          needed.set(g, m.inputs[g]!);
          grew = true;
        }
      }
    }
  }
  return needed;
}

function planConstruction(w: World, c: Company, o: Outlook) {
  // 건축사무소가 없으면 그것부터 (개항장에)
  if (!hasBuilder(w, c)) {
    if (!w.constructions.some((k) => k.companyId === c.id && k.typeId === 'builder')) applyCommand(w, c.id, { type: 'build', typeId: 'builder', regionId: 1 });
    return;
  }
  const ongoing = w.constructions.filter((k) => k.companyId === c.id);
  // 2년 넘게 절반도 못 나간 공사는 포기한다
  for (const k of ongoing) if (k.ticksElapsed > 720 && k.points < k.required * 0.5) applyCommand(w, c.id, { type: 'cancelConstruction', constructionId: k.id });
  // 공사가 밀려 있고 현금이 넉넉하면 사무소를 늘린다
  const est = constructionEstimate(w, c, 'farm');
  const backlogDays = ongoing.reduce((s, k) => s + (k.required - k.points), 0) / Math.max(1, est.pointsPerDay);
  // 공사가 두 달 넘게 밀려 있고 사무소 하나 더 지을 돈(공사비의 3배)이 있으면 사무소를 늘린다 (최대 10개)
  const officeLevel = w.buildings.filter((b) => b.companyId === c.id && b.typeId === 'builder').reduce((s, b) => s + b.level, 0);
  const officeCost = constructionEstimate(w, c, 'builder').cost;
  if (backlogDays > 60 && c.cash > officeCost * 3 && officeLevel < 10 && !ongoing.some((k) => k.typeId === 'builder')) {
    const office = w.buildings.find((b) => b.companyId === c.id && b.typeId === 'builder');
    if (office) applyCommand(w, c.id, { type: 'expand', buildingId: office.id });
  }
  // AI는 빚으로 짓지 않는다
  // 동시 공사는 최대 10건, 그리고 사무소가 넉 달 안에 소화할 만큼만 쌓는다. 몇 건을 벌일지는 남는 현금(free)이 정한다
  if (ongoing.length >= 10 || backlogDays > 120) return;
  if (c.debt > creditLimit(w, c) * 0.3) return;
  const free = c.cash - reserveOf(w, c) - committedCost(w, c) - est.costPerDay * 30;
  if (free <= 0) return;

  // 모든 후보를 같은 기준으로: 시장 전망으로 본 장기 손익 / 공사비
  let best: { regionId: number; typeId: string; methodId: string; score: number } | null = null;
  for (const r of w.regions) {
    for (const t of BUILDING_TYPES) {
      if (t.id === 'builder' || !canBuildType(c, t) || landFree(w, r.id, t.land) < 1) continue;
      const cost = constructionEstimate(w, c, t.id).cost;
      if (!Number.isFinite(cost) || free < cost) continue;
      // 같은 지역의 같은 건물은 방식이 통일되므로, 이미 있으면 그 방식으로만 늘린다
      const existing = w.buildings.find((b) => b.companyId === c.id && b.regionId === r.id && b.typeId === t.id);
      for (const m of availableMethods(c, t.id)) {
        if (existing && existing.methodId !== m.id) continue;
        if (m.grant && schoolsSaturated(w, r)) continue;
        const e = valueMethod(w, o, r, t.id, m, c.wages);
        if (e.profit <= 0 || laborAvailability(w, r, m) < 0.5) continue;
        const roi = (e.profit * TICKS_PER_YEAR) / cost;
        const score = roi * (0.85 + rand(w) * 0.3);
        if (roi > MIN_ROI && (!best || score > best.score)) best = { regionId: r.id, typeId: t.id, methodId: m.id, score };
      }
    }
  }
  // 탐색 투자: 여유 현금이 공사비의 3배를 넘으면 가끔(주 8%) 당장 이익이 안 보여도 새 산업에 손을 댄다.
  // 아직 아무도 제대로 만들지 않아 비싼 상품일수록 고를 확률이 높다 (사슬의 첫 고리를 놓는 역할)
  if (rand(w) < EXPLORE_CHANCE) {
    const picks: { regionId: number; typeId: string; methodId: string; weight: number }[] = [];
    for (const r of w.regions) {
      for (const t of BUILDING_TYPES) {
        if (t.id === 'builder' || !canBuildType(c, t) || landFree(w, r.id, t.land) < 1) continue;
        const cost = constructionEstimate(w, c, t.id).cost;
        if (!Number.isFinite(cost) || free < cost * 3) continue;
        if (w.buildings.some((b) => b.companyId === c.id && b.regionId === r.id && b.typeId === t.id)) continue;
        for (const m of availableMethods(c, t.id)) {
          if (m.grant || laborAvailability(w, r, m) < 0.5) continue;
          let weight = 0;
          for (const g of GOOD_IDS) if (m.outputs[g]) weight += Math.max(0, o.price(g) / GOODS[g].basePrice - 0.8);
          if (weight > 0) picks.push({ regionId: r.id, typeId: t.id, methodId: m.id, weight });
        }
      }
    }
    const total = picks.reduce((a, p) => a + p.weight, 0);
    let x = rand(w) * total;
    for (const p of picks) {
      x -= p.weight;
      if (x > 0) continue;
      if (!best || p.weight > 1) best = { regionId: p.regionId, typeId: p.typeId, methodId: p.methodId, score: 0 };
      break;
    }
  }
  if (!best) return;

  const pick = best;
  const existing = w.buildings.find((b) => b.companyId === c.id && b.regionId === pick.regionId && b.typeId === pick.typeId);
  const err = existing
    ? applyCommand(w, c.id, { type: 'expand', buildingId: existing.id })
    : applyCommand(w, c.id, { type: 'build', typeId: pick.typeId, regionId: pick.regionId, methodId: pick.methodId });
  if (!err) o.add(getMethod(pick.typeId, pick.methodId), 1, 1 + regionPerk(pick.regionId, pick.typeId));
}

/**
 * 배당: 여유 현금의 절반을 건물 장부가 비중대로 나눈 뒤, 각 건물의 소유 지분(1인당)대로
 * 그 건물이 있는 지역의 계층에 준다. 땅 건물은 지주 귀족, 공장은 자본가가 대부분을 가져간다.
 */
function payDividends(w: World, c: Company) {
  // 배당은 이익에서만: 지난주 이윤의 절반, 그것도 준비금과 공사비를 빼고 남는 현금 범위 안에서
  const surplus = c.cash - reserveOf(w, c) - committedCost(w, c);
  if (surplus <= 0) return;
  // 두 달치 임금과 공사 10건 남짓을 굴릴 돈(건축사무소 운영비 반년치)을 넘는 현금은 매주 10%씩 배당한다 (돈이 금고에서 썩지 않게)
  const buffer = weeklyWageBill(w, c) * 8 + constructionEstimate(w, c, 'farm').costPerDay * 180;
  const hoard = Math.max(0, surplus - buffer);
  const pay = Math.min(surplus, Math.max(0, c.weekProfit) * 0.5 + hoard * 0.1);
  if (pay <= 0) return;
  const mine = w.buildings.filter((b) => b.companyId === c.id);
  const totalBook = mine.reduce((a, b) => a + bookValue(b), 0);
  if (totalBook <= 0) return;
  c.cash -= pay;
  for (const b of mine) {
    const r = regionById(w, b.regionId);
    // 배당은 그 건물의 소유주 계층(자본가 또는 지주 귀족)에게 간다
    payClassIn(w, r, ownerJobs(b).cls, (pay * bookValue(b)) / totalBook);
  }
}
