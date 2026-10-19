import { BUILDING_BY_ID, BUILDING_TYPES, EDUCATION_FLOOR, EDUCATION_RANGE, GOOD_IDS, GOODS, SKILL_DEFS, TECH_BY_ID, TICKS_PER_WEEK, TICKS_PER_YEAR, TUNE, getMethod, regionPerk } from './data';
import { withEstimateCache, regionAvgWealth, regionPopulation, wageCostOf,
  availableMethods, builderOf, canBuildType, paysDividend, companyById, constructionEstimate, creditLimit, depositFree, efficiency, estimateMethod, harvestFactor, hasBuilder, isGovernment, regionById, researchableTechs, roomFor, slots,
} from './economy';
import { MAX_CONCURRENT_CONSTRUCTIONS, MAX_LEVELS_PER_PROJECT, applyCommand } from './commands';
import { committedCost, lawRevenue, reserveOf } from './finance';
import { subsistenceWage } from './labor';
import { marketOutlook, techValue, valueMethod } from './outlook';
import type { Outlook } from './outlook';
import { kingdomById } from './kingdoms';
import { LITERACY_PER_WEALTH, workforce } from './pops';
import { rand, round2 } from './rng';
import { BUDGET_STEPS, SKILLS, literacyOf } from './types';
import type { BudgetItem, Building, Company, Kingdom, MethodDef, Region, Skill, World } from './types';

// AI: 국영과 민간이 같은 판단을 쓴다. 다른 점은 자금원(국고 / 투자 풀)과 자기 왕국 땅에만 짓는다는 것뿐이다.

/** 건설 판단 기준: 연간 이윤 / 공사비 (5년 안에 회수) */
const MIN_ROI = 0.2;
const SWITCH_COOLDOWN = TICKS_PER_WEEK * 3;
/** 공사 하나의 레벨 수 후보 (큰 것부터) */
const CHUNKS = [5, 2, 1];
/** 사무소를 한 번에 늘리는 레벨: 지금 사무소의 1/4 (최소 2) */
const OFFICE_BLOCK = 2;
const OFFICE_GROWTH = 0.25;
/** 공사 기간 동안 채울 수 있는 사람을 셀 때 보는 날 수 */
const STAFFING_HORIZON = 60;
/** 짓기 기준: 공사 기간 안에 일자리의 이 비율 이상을 채울 사람이 있어야 한다 (건축사무소는 대신 채울 수 있는 레벨 수 officeStaffable 을 본다) */
const MIN_STAFFING = 0.5;

export function runAi(w: World) {
  if (!w.config.ai) return;
  const outlook = marketOutlook(w);
  for (const c of w.companies) {
    if (c.isPlayer) continue;
    // 왕실은 세법과 정책 단계를, 민간은 임금을 정한다 (왕실 임금은 국영 임금 수준이 정한다)
    if (c.state) { chooseTaxLaw(w, c); adjustBudget(w, c); } else adjustWages(w, c);
    manageBuildings(w, c);
    if (c.state) planResearch(w, c, outlook);
    withEstimateCache(() => planConstruction(w, c, outlook));
  }
}

const ownRegions = (w: World, c: Company) => w.regions.filter((r) => r.kingdomId === c.kingdomId);

/**
 * 이 지역에서 공사 기간 안에 이 직종으로 데려올 수 있는 노동 인구.
 * 같은 직종 실업자 + (노동자) 다른 실업자와 소작농이 옮겨 오는 몫 + (그 위 직종) 자격자가 옮겨 오는 몫.
 */
function labourPool(w: World, r: Region, s: Skill): number {
  let n = 0;
  const reach = Math.min(1, TUNE.switchRate * STAFFING_HORIZON);
  for (const p of w.pops) {
    if (p.regionId !== r.id) continue;
    // 같은 직종: 실업자 전부. 귀족·자본가는 소유 자리에서 임금 자리로 옮겨 오는 사람도 센다 (국영 건물의 임금 자리)
    if (p.prof === s) { n += p.work === 0 ? workforce(p) : s === 'capitalist' || s === 'aristocrat' ? workforce(p) * reach : 0; continue; }
    if (p.prof === 'capitalist' || p.prof === 'aristocrat') continue;
    const q = s === 'unskilled' ? workforce(p) : (p.quals[s] ?? 0);
    n += p.work === 0 ? q : q * reach;
  }
  return n;
}

/**
 * 이 방식을 levels 레벨 돌릴 일손이 공사 기간 안에 모이는가 0..1 (민간 건물의 배당 자리는 승진으로 천천히 차므로 세지 않는다).
 * pools: pop 이 바뀌지 않는 동안 (지역, 직종) 별 labourPool 을 한 번만 센다
 */
export function laborAvailability(w: World, r: Region, m: MethodDef, levels: number, stateOwned = true, pools?: Map<string, number>): number {
  let ok = 1;
  // 민간 건물의 소유주 자리(1%)는 공사 판단을 막지 않는다
  for (const s of SKILLS) {
    if (paysDividend(stateOwned, s)) continue;
    const need = (m.workers[s] ?? 0) * levels;
    if (!(need > 0)) continue;
    const k = `${r.id}|${s}`;
    let pool = pools?.get(k);
    if (pool === undefined) { pool = labourPool(w, r, s); pools?.set(k, pool); }
    ok = Math.min(ok, pool / need);
  }
  return ok;
}

/**
 * 이 지역에 건축사무소(방식 m)를 몇 레벨 더 채울 수 있는가 (직종별로 가장 작은 값, 소수).
 * 사람 = labourPool + 지금 자리보다 왕실 임금이 TUNE.switchPremium 배 넘게 높은 같은 직종 재직자 중 공사 기간 안에 옮겨 오는 몫
 * (노동시장 laborMarket 의 이직 규칙과 같다). 여기서 그 지역 왕실 사무소의 빈자리(쉬며 해산한 사무소도 다시 뽑을 자리)를 뺀다
 */
function officeStaffable(w: World, c: Company, r: Region, m: MethodDef, byId: Map<number, Building>): number {
  const reach = Math.min(1, TUNE.switchRate * STAFFING_HORIZON);
  let best = Infinity;
  for (const s of SKILLS) {
    const per = m.workers[s] ?? 0;
    if (!(per > 0) || paysDividend(true, s)) continue;
    let n = labourPool(w, r, s);
    for (const p of w.pops) {
      if (p.regionId !== r.id || p.prof !== s || p.work === 0) continue;
      const b = byId.get(p.work);
      const o = b && !paysDividend(b.stateOwned, s) ? companyById(w, b.companyId) : undefined;
      if (o && o.wages[s] * TUNE.switchPremium < c.wages[s]) n += workforce(p) * reach;
    }
    for (const b of w.buildings) {
      if (b.companyId !== c.id || b.regionId !== r.id || !getMethod(b.typeId, b.methodId).construction) continue;
      n -= Math.max(0, (getMethod(b.typeId, b.methodId).workers[s] ?? 0) * b.level * b.utilization - b.employed[s]);
    }
    best = Math.min(best, n / per);
  }
  return best;
}

/**
 * 민간 임금 (데이터 기준): 바닥과 천장 사이에서, 지난주 실제로 사람이 찼는지를 보고 움직인다.
 * - 바닥: 그 자리로 옮겨 올 사람들의 지금 소득 × TUNE.wageOutside (노동자 ← 소작 수확 가치, 기술자 ← 노동자 임금, 전문가 ← 기술자 임금)
 * - 천장: 회사 생산 건물이 사람을 다 채웠을 때의 부가가치(지금 가격의 매출 − 원료) × TUNE.wageCeil 를 기본 임금 비율대로 나눈 값.
 *   실제 부가가치로 재면 사람이 없을 때 천장이 0이 되어 임금을 못 올리고 사람도 못 뽑는다. 산출이 없는 정부 건물은 천장 계산에서 뺀다
 * - 빈자리가 5% 넘는데 지난주 고용이 빈자리의 10%도 못 늘었으면 +3%, 빈자리가 2% 미만이면 −1%, 적자면 −2%
 */
function adjustWages(w: World, c: Company) {
  const mine = w.buildings.filter((b) => b.companyId === c.id && !BUILDING_BY_ID[b.typeId].auto);
  let va = 0, baseBill = 0;
  for (const b of mine) {
    const m = getMethod(b.typeId, b.methodId);
    if (!b.active || !Object.keys(m.outputs).length) continue;
    const e = estimateMethod(w, b.regionId, b.typeId, b.methodId, c.wages, c.state);
    va += (e.revenue - e.inputCost) * b.level * b.utilization;
    for (const s of SKILLS) if (!paysDividend(c.state, s)) baseBill += slots(b, s) * SKILL_DEFS[s].baseWage;
  }
  const ceilMult = baseBill > 0 ? Math.max(0, va) * TUNE.wageCeil / baseBill : Infinity;
  const last = c.lastEmployed ?? {};
  c.lastEmployed = {};
  for (const s of SKILLS) {
    if (paysDividend(c.state, s)) continue;
    let cap = 0, emp = 0, outside = 0, people = 0;
    for (const b of mine) {
      const n = slots(b, s);
      if (n <= 0) continue;
      cap += n; emp += b.employed[s];
      const r = regionById(w, b.regionId);
      outside += (s === 'unskilled' ? subsistenceWage(w, r) : s === 'skilled' ? c.wages.unskilled : c.wages.skilled) * n;
      people += n;
    }
    c.lastEmployed[s] = emp;
    if (cap <= 0) continue;
    const floor = (people > 0 ? outside / people : 0) * TUNE.wageOutside;
    const ceiling = SKILL_DEFS[s].baseWage * ceilMult;
    const vacancy = cap - emp, grew = emp - (last[s] ?? emp);
    let wage = c.wages[s];
    // runAi 는 주간 장부를 넘기기 전에 돈다: weekProfit 이 막 끝난 주다 (lastWeekProfit 은 그 전 주)
    if (TUNE.wageLossCut && c.weekProfit < 0) wage *= 0.98;
    else if (vacancy > cap * 0.05 && grew < vacancy * 0.1) wage *= 1.03;
    else if (vacancy < cap * 0.02) wage *= 0.99;
    wage = Math.max(floor, Math.min(ceiling, wage));
    wage = Math.min(SKILL_DEFS[s].baseWage * 3, Math.max(SKILL_DEFS[s].baseWage * 0.1, wage));
    if (Math.abs(wage - c.wages[s]) > 1e-9) applyCommand(w, c.id, { type: 'setWage', skill: s, wage });
  }
}

/** 국고가 주간 국정 지출(expenseEma)의 몇 주치인가. 지출이 없으면 무한 */
function treasuryWeeks(c: Company, k: Kingdom): number {
  const spend = k.expenseEma ?? 0;
  return spend > 0 ? c.cash / spend : Infinity;
}

/** 국고가 조이는 중인가: 빚이 있거나 지출 TUNE.treasuryLowWeeks 주치보다 적다 */
function treasuryTight(c: Company, k: Kingdom): boolean {
  return c.debt > 0 || treasuryWeeks(c, k) < TUNE.treasuryLowWeeks;
}

/**
 * 정책 단계 (AI 왕국, 4주마다 한 칸). 기준은 국고가 주간 국정 지출의 몇 주치인가와, 지난 점검보다 늘었는가다.
 * 단계는 한 줄 사다리로 움직인다 (후함 → 긴축): 연구비 5·4 → 세금 1~5 → 연구비 2·1 → 연구 멈춤 → 국영 임금 2·1.
 * - 조임 (빚이 있거나 TUNE.treasuryLowWeeks 주치 미만이고, 지난 점검보다 줄었다): 긴축 쪽으로 한 칸.
 *   조이는 동안 새 연구를 고르지 않는다 (planResearch). 학교는 적자 때문에 헐지 않는다: 사다리를 끝까지(국영 임금 1단계) 내려가고도
 *   빚을 지며 줄 때만 학교를 줄인다 (shrinkSchools)
 * - 회복 (빚 없고 low 주치 이상, 줄지 않았다): 보통(3) 아래로 내린 국영 임금, 연구비를 한 칸씩 되돌린다
 * - 풂 (TUNE.treasuryHighWeeks 주치 초과, 줄지 않았다): 세금을 내리고, 세금이 1단계면 연구비를 보통 위로 올린다.
 * AI는 국영 임금을 보통 위로 올리지 않는다
 */
function adjustBudget(w: World, c: Company) {
  const k = w.kingdoms.find((x) => x.governmentId === c.id);
  if (!k || w.tick % (TICKS_PER_WEEK * 4) !== 0) return;
  const net = c.cash - c.debt;
  const losing = k.netLast != null && net < k.netLast;
  k.netLast = round2(net);
  const b = k.budget;
  let step: [BudgetItem, number] | null = null;
  if (treasuryTight(c, k)) {
    if (losing) {
      if (b.research > 3) step = ['research', b.research - 1];
      else if (b.tax < BUDGET_STEPS) step = ['tax', b.tax + 1];
      else if (b.research > 1) step = ['research', b.research - 1];
      else if (c.research.current) applyCommand(w, c.id, { type: 'setResearch', techId: null });
      else if (b.wages > 1) step = ['wages', b.wages - 1];
      else if (c.debt > 0) shrinkSchools(w, c);
    }
  } else if (!losing) {
    const rich = treasuryWeeks(c, k) > TUNE.treasuryHighWeeks;
    if (b.wages < 3) step = ['wages', b.wages + 1];
    else if (b.research < 3) step = ['research', b.research + 1];
    else if (rich && b.tax > 1) step = ['tax', b.tax - 1];
    else if (rich && b.research < BUDGET_STEPS) step = ['research', b.research + 1];
  }
  if (step) applyCommand(w, c.id, { type: 'setBudget', item: step[0], value: step[1] });
}

/** 사다리를 다 쓰고도 빚을 지며 줄 때: 가장 큰 학교를 왕실 학교 전체 레벨의 1/4(최소 1)만큼 철거 대기에 올린다 */
function shrinkSchools(w: World, c: Company) {
  const list = w.buildings.filter((b) => b.companyId === c.id && getMethod(b.typeId, b.methodId).seats && !w.constructions.some((k) => k.targetBuildingId === b.id));
  const left = (b: Building) => b.level - (b.shrinking ?? 0);
  const total = list.reduce((a, b) => a + left(b), 0);
  const big = list.reduce<Building | null>((x, b) => (!x || left(b) > left(x) ? b : x), null);
  const n = Math.min(Math.max(1, Math.round(total * 0.25)), big ? left(big) : 0);
  // 손익이 나아 보여도 취소하지 않는다 (reviewLevels 는 swap 표시가 붙은 철거를 되돌리지 않는다)
  if (big && n > 0 && !applyCommand(w, c.id, { type: 'demolish', buildingId: big.id, levels: n })) big.swap = true;
}

/** 세법을 바꾸는 기준: 다른 세법의 예상 세입이 지금의 이 배수를 넘을 때, 마지막으로 바꾼 지 LAW_COOLDOWN 틱이 지났을 때 */
const LAW_SWITCH = 1.2;
const LAW_COOLDOWN = TICKS_PER_YEAR;

/** 세법 (AI 왕국, 4주마다): 지금 세금 수준으로 두 세법이 걷을 세금(lawRevenue)을 비교해 더 걷히는 쪽으로 바꾼다 */
function chooseTaxLaw(w: World, c: Company) {
  const k = w.kingdoms.find((x) => x.governmentId === c.id);
  if (!k || w.tick % (TICKS_PER_WEEK * 4) !== 0) return;
  if (k.lawTick != null && w.tick - k.lawTick < LAW_COOLDOWN) return;
  const other = k.taxLaw === 'land' ? 'capita' : 'land';
  if (lawRevenue(w, k, other) > lawRevenue(w, k, k.taxLaw) * LAW_SWITCH) applyCommand(w, c.id, { type: 'setTaxLaw', law: other });
}

/** 산출물 1단위당 이윤 (방식끼리 비교용) */
function unitProfit(profit: number, m: MethodDef): number {
  const out = GOOD_IDS.reduce((a, g) => a + (m.outputs[g] ?? 0), 0);
  return out > 0 ? profit / out : profit;
}

/** 투입재를 대륙 어딘가에서 실제로 구할 수 있는가 */
function inputsAvailable(w: World, m: MethodDef, levels: number): boolean {
  for (const [g, per] of Object.entries(m.inputs) as [keyof typeof GOODS, number][]) {
    let avail = 0;
    for (const x of w.regions) avail += x.market[g].supplyEma;
    if (avail < per * levels * 0.5) return false;
  }
  return true;
}

function manageBuildings(w: World, c: Company) {
  for (const b of w.buildings.filter((x) => x.companyId === c.id && !BUILDING_BY_ID[x.typeId].auto)) {
    const usable = availableMethods(c, b.typeId);
    const cur = getMethod(b.typeId, b.methodId);
    const current = estimateMethod(w, b.regionId, b.typeId, b.methodId, c.wages, c.state);

    // 건축사무소: 자재를 구할 수 있는 방식 중 하루 포인트가 가장 많은 것 (가동률은 늘 100%)
    if (cur.construction) {
      const starved = b.active && !b.idle && b.last.inputFill < 0.5;
      const ok = usable.filter((m) => m.construction && (m.id === b.methodId ? !starved : inputsAvailable(w, m, b.level)));
      const best = ok.length ? ok.reduce((x, m) => (m.construction! > x.construction! ? m : x)) : null;
      if (best && best.id !== b.methodId && (starved || w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN)) applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id });
      continue;
    }

    // 학교 (왕실 건물, 가동률은 늘 100%): 일손을 구할 수 있는 방식 중 이 레벨 수로 손익(공익 − 인건비)이 가장 큰 것.
    // 방식마다 자리 수가 달라 1인당 인건비로 고르면 자리가 크게 줄 수 있다 (공립 학교 10만 → 가정교사 2만)
    if (cur.seats) {
      const r = regionById(w, b.regionId);
      const others = schoolSeats(w, r.id) - b.level * cur.seats;
      const net = (m: MethodDef) => schoolValuation(w, c, r, m, b.level, others).profit;
      const ok = usable.filter((m) => m.seats && (m.id === cur.id || laborAvailability(w, r, m, b.level, c.state) >= MIN_STAFFING));
      const best = ok.reduce((x, m) => (net(m) > net(x) ? m : x), cur);
      if (best.id !== cur.id && w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN) applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id });
      continue;
    }

    // 생산 방식: 같은 상품을 더 싸게 만드는 방식으로 (3주 쿨다운). 투입재를 못 구해 생산이 멈췄으면 쿨다운 없이.
    // 산출이 없는 행정청은 투입재가 모자라도 징세 한도가 그대로라 멈춘 것으로 보지 않는다
    const starved = Object.keys(cur.inputs).length > 0 && Object.keys(cur.outputs).length > 0 && b.active && b.last.inputFill < 0.5 && b.last.staffing > 0;
    if (usable.length > 1 && (starved || w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN)) {
      let best = { m: cur, v: starved ? -Infinity : unitProfit(current.profit, cur) };
      for (const m of usable) {
        if (m.id === cur.id || !inputsAvailable(w, m, b.level)) continue;
        const v = unitProfit(estimateMethod(w, b.regionId, b.typeId, m.id, c.wages, c.state).profit, m);
        if (v > best.v * 1.05 + 0.01) best = { m, v };
      }
      if (best.m !== cur) applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.m.id });
    }
    // 왕실 정부 건물(행정청)은 늘 다 가동한다. 남길지는 reviewLevels 가 레벨 단위로 정한다
    if (c.state && isGovernment(b.typeId)) continue;

    if (!b.active) {
      b.pausedWeeks += 1;
      if (current.margin > 0.05 && inputsAvailable(w, cur, b.level)) {
        applyCommand(w, c.id, { type: 'setActive', buildingId: b.id, active: true });
        applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: 0.3 });
        b.lossWeeks = 0; b.profitEma = 0;
      }
      continue;
    }
    // 적자면 끄지 않고 가동률부터 줄인다 (4주마다 10%씩). 철거는 planConstruction 이 짓기와 같은 계산으로 정한다.
    // 기상 조건이 걸린 동안의 적자는 일시적이라 세지 않는다
    const cost = b.last.inputCost + b.last.wageCost;
    const actualMargin = cost > 0 ? (b.last.revenue - cost) / cost : 0;
    const bleeding = harvestFactor(w, b.regionId, BUILDING_BY_ID[b.typeId].land) >= 1 && b.profitEma < 0 && (current.margin < -0.2 || actualMargin < -0.2);
    b.lossWeeks = bleeding ? b.lossWeeks + 1 : 0;
    if (b.lossWeeks >= 4 && b.utilization > 0.1 + 1e-9) {
      applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: Math.max(0.1, b.utilization - 0.1) });
      b.lossWeeks = 0;
    } else if (b.utilization < 1 && current.margin > 0) {
      applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: b.utilization + 0.1 });
    }
  }
}

/** 지역 학교 자리: 학교 레벨(공사 중 포함) × 방식의 자리. 가동률과 무관하게 지은 만큼 센다 */
function schoolSeats(w: World, regionId: number): number {
  let n = 0;
  for (const b of w.buildings) if (b.regionId === regionId) n += b.level * (getMethod(b.typeId, b.methodId).seats ?? 0);
  for (const k of w.constructions) if (k.regionId === regionId) n += (k.levels ?? 1) * (getMethod(k.typeId, k.methodId).seats ?? 0);
  return n;
}

/**
 * 학교 목표 자리 (AI 왕실): 지역 문해력이 TUNE.schoolTarget 에 닿는 교육 접근도를 만드는 자리 수.
 * 문해력 목표 = 교육 접근도 + 부 × LITERACY_PER_WEALTH, 교육 접근도 = 바닥 + 범위 × 자리/인구 (tick.ts updateEducation) 를 거꾸로 푼다.
 * 기술자 자격은 문해력이 문턱(qualSkilledL)을 넘어야 쌓이므로, 문턱 아래에서 조금씩 짓는 자리는 자격자를 만들지 못한다
 */
function schoolWanted(r: Region): number {
  const cover = (TUNE.schoolTarget - EDUCATION_FLOOR - LITERACY_PER_WEALTH * regionAvgWealth(r)) / EDUCATION_RANGE;
  return regionPopulation(r) * Math.min(1, Math.max(0, cover));
}

/** 학교 판단 재료 (틱마다 한 번 센다): 지역 문해력(인구 가중), 왕국 숙련 일자리 부족 */
interface SchoolNeed { tick: number; literacy: Map<number, number>; shortage: Map<number, number> }
const schoolNeedCache = new WeakMap<World, SchoolNeed>();
/** 문해력으로 자격이 쌓이는 임금 직종 (pops.ts QUAL_FACTOR) */
const LETTERED: Skill[] = ['skilled', 'expert', 'gentry'];

/**
 * 왕국 숙련 부족 0..1 = 그 왕국 건물의 기술자·전문가·하급 귀족 빈자리 ÷ 그 자리 전체 (민간 건물의 배당 자리는 빼고).
 * 지역 문해력 = 인구 가중 평균
 */
function schoolNeed(w: World): SchoolNeed {
  const hit = schoolNeedCache.get(w);
  if (hit && hit.tick === w.tick) return hit;
  const size = new Map<number, number>(), lit = new Map<number, number>();
  for (const p of w.pops) {
    size.set(p.regionId, (size.get(p.regionId) ?? 0) + p.size);
    lit.set(p.regionId, (lit.get(p.regionId) ?? 0) + p.size * literacyOf(p));
  }
  const literacy = new Map<number, number>();
  for (const r of w.regions) { const n = size.get(r.id) ?? 0; literacy.set(r.id, n > 0 ? (lit.get(r.id) ?? 0) / n : 0); }
  const kingdomOf = new Map(w.regions.map((r) => [r.id, r.kingdomId] as const));
  const total = new Map<number, number>(), vacant = new Map<number, number>();
  for (const b of w.buildings) {
    const k = kingdomOf.get(b.regionId);
    if (k == null) continue;
    for (const s of LETTERED) {
      if (paysDividend(b.stateOwned, s)) continue;
      const n = slots(b, s);
      if (!(n > 0)) continue;
      total.set(k, (total.get(k) ?? 0) + n);
      vacant.set(k, (vacant.get(k) ?? 0) + Math.max(0, n - b.employed[s]));
    }
  }
  const shortage = new Map<number, number>();
  for (const [k, n] of total) shortage.set(k, n > 0 ? (vacant.get(k) ?? 0) / n : 0);
  const out = { tick: w.tick, literacy, shortage };
  schoolNeedCache.set(w, out);
  return out;
}

/**
 * 학교 자리 1개의 하루 가치 (AI 왕실). 학교는 앞으로의 자격자를 만든다:
 * TUNE.schoolValue × (1 + 지역 문해력 부족 + 왕국 숙련 부족).
 * 문해력 부족 = (목표 − 지역 문해력) ÷ (목표 − 교육 바닥), 0..1. 숙련 부족은 schoolNeed
 */
function seatValue(w: World, r: Region): number {
  const need = schoolNeed(w);
  const gap = Math.min(1, Math.max(0, (TUNE.schoolTarget - (need.literacy.get(r.id) ?? 0)) / Math.max(1e-9, TUNE.schoolTarget - EDUCATION_FLOOR)));
  return TUNE.schoolValue * (1 + gap + (need.shortage.get(r.kingdomId) ?? 0));
}

/**
 * 학교 levels 레벨(방식 m)의 하루 손익 (AI 판단용) = 공익 − 인건비.
 * 공익 = 목표 자리(schoolWanted)까지 모자란 자리 중 이 레벨이 채우는 자리 × seatValue. others: 이 레벨을 뺀 지역 자리.
 * 학교는 늘 다 가동하므로 인건비는 레벨 전부다 (valueMethod 처럼 가동률을 고르지 않는다)
 */
function schoolValuation(w: World, c: Company, r: Region, m: MethodDef, levels: number, others: number): { wageCost: number; profit: number } {
  const add = levels * (m.seats ?? 0);
  const benefit = Math.min(add, Math.max(0, schoolWanted(r) - others)) * seatValue(w, r);
  const wageCost = wageCostOf(m, c.wages, c.state) * levels;
  return { wageCost, profit: benefit - wageCost };
}

/** 연구 고르기 (AI 왕실): 진행 중인 연구가 없을 때. 국고가 조이는 동안은 새 연구를 시작하지 않는다 (adjustBudget) */
function planResearch(w: World, c: Company, o: Outlook) {
  const r = c.research;
  if (!r.current && !treasuryTight(c, kingdomById(w, c.kingdomId))) {
    const direct = new Map(Object.keys(TECH_BY_ID).map((id) => [id, techValue(w, o, c, id)] as const));
    // 학교를 여는 기술: 자기 왕국에서 목표 자리(schoolWanted)까지 모자란 자리의 가치 (seatValue)
    let uncovered = 0;
    for (const reg of ownRegions(w, c)) uncovered += Math.max(0, schoolWanted(reg) - schoolSeats(w, reg.id)) * seatValue(w, reg);
    for (const t of BUILDING_TYPES) for (const m of t.methods) if (m.seats && m.tech) direct.set(m.tech, (direct.get(m.tech) ?? 0) + uncovered);
    const memo = new Map<string, number>();
    const deep = (id: string): number => {
      if (memo.has(id)) return memo.get(id)!;
      memo.set(id, 0);
      let v = direct.get(id) ?? 0;
      for (const t of Object.values(TECH_BY_ID)) if (t.requires.includes(id)) v = Math.max(v, deep(t.id) * 0.5);
      memo.set(id, v);
      return v;
    };
    const ranked = researchableTechs(c).map((id) => ({ id, s: ((deep(id) + 1) / TECH_BY_ID[id].cost) * (0.85 + rand(w) * 0.3) })).sort((a, b) => b.s - a.s);
    if (ranked.length) applyCommand(w, c.id, { type: 'setResearch', techId: ranked[0].id });
  }
}

function planConstruction(w: World, c: Company, o: Outlook) {
  if (!hasBuilder(w, c)) {
    const home = ownRegions(w, c).sort((a, b) => b.land.plot - a.land.plot)[0];
    if (home && !w.constructions.some((k) => k.companyId === c.id && k.typeId === 'builder')) applyCommand(w, c.id, { type: 'build', typeId: 'builder', regionId: home.id, levels: Math.min(OFFICE_BLOCK, MAX_LEVELS_PER_PROJECT) });
    return;
  }
  for (const k of w.constructions.filter((x) => x.companyId === c.id)) if (k.ticksElapsed > 720 && k.points < k.required * 0.5) applyCommand(w, c.id, { type: 'cancelConstruction', constructionId: k.id });
  const est = constructionEstimate(w, c, 'farm');
  // 밀린 공사는 같은 사무소가 맡은 공사 전부로 센다 (왕실 + 그 왕국 민간)
  const builder = builderOf(w, c);
  const backlog = () => w.constructions.filter((k) => { const o = companyById(w, k.companyId); return !!o && builderOf(w, o) === builder; }).reduce((s, k) => s + (k.required - k.points), 0) / Math.max(1, est.pointsPerDay);
  // 사무소는 왕실만 늘린다. 사무소는 실제로 쓰인 포인트(buildUsed)로 크기를 정한다: 포인트를 거의 다 쓰고(TUNE.officeUseFull 이상)
  // 공사가 한 달 넘게 밀려 있으면, 그 지역에서 채울 수 있는 레벨만큼만 늘린다 (officeStaffable: 사무소의 지금 빈자리를 먼저 뺀다).
  // 남는 포인트와 한 해 내내 빈 레벨은 reviewLevels 가 줄인다.
  // 늘 다 가동해 운영비가 국고에서 나가므로 국고가 넉넉할 때(지출 TUNE.treasuryHighWeeks 주치 초과, 빚 없음)만 늘린다
  if (builder === c) {
    const offices = w.buildings.filter((b) => b.companyId === c.id && b.typeId === 'builder');
    const officeLevel = offices.reduce((s, b) => s + b.level, 0);
    const block = Math.max(OFFICE_BLOCK, Math.round(officeLevel * OFFICE_GROWTH));
    const officeCost = constructionEstimate(w, c, 'builder').cost * block;
    const full = (c.buildUsed ?? 0) >= est.pointsPerDay * TUNE.officeUseFull;
    const rich = c.debt <= 0 && treasuryWeeks(c, kingdomById(w, c.kingdomId)) > TUNE.treasuryHighWeeks;
    if (offices.length && full && rich && backlog() > TUNE.officeTargetDays && c.cash > officeCost * 1.5 && !w.constructions.some((k) => k.companyId === c.id && k.typeId === 'builder')) {
      const office = offices[0];
      // 대기가 TUNE.officeTargetDays 안으로 들어올 만큼 한 번에 늘린다
      const perLevel = est.pointsPerDay / Math.max(1, officeLevel);
      const want = Math.ceil((backlog() * est.pointsPerDay / TUNE.officeTargetDays - est.pointsPerDay) / Math.max(1e-9, perLevel));
      // 한 번에 늘리는 양은 지금 사무소가 목표 일수 안에 지을 수 있는 만큼까지 (증설 공사가 너무 길어지지 않게)
      const byTime = Math.floor((est.pointsPerDay * TUNE.officeTargetDays) / BUILDING_BY_ID.builder.buildPoints);
      const levels = Math.min(Math.max(block, want), Math.max(block, byTime), MAX_LEVELS_PER_PROJECT);
      // 어디에: 늘릴 수 있는 레벨(위 levels, 남은 부지, 채울 수 있는 사람 officeStaffable 중 가장 작은 값)이 가장 큰 자기 지역.
      // 같으면 사무소가 이미 있는 지역, 그다음 부지가 넓은 지역. 어디서도 1레벨을 못 채우면 늘리지 않는다
      const m = getMethod('builder', office.methodId);
      const byId = new Map(w.buildings.map((b) => [b.id, b] as const));
      let spot: { regionId: number; fit: number; room: number; has: boolean } | null = null;
      for (const r of ownRegions(w, c)) {
        const room = roomFor(w, r.id, 'builder');
        if (room < 1) continue;
        const fit = Math.floor(Math.min(levels, room, officeStaffable(w, c, r, m, byId)));
        if (fit < 1) continue;
        const has = offices.some((b) => b.regionId === r.id);
        const better = !spot || fit > spot.fit || (fit === spot.fit && (has !== spot.has ? has : room > spot.room));
        if (better) spot = { regionId: r.id, fit, room, has };
      }
      const here = spot && offices.find((b) => b.regionId === spot.regionId);
      const err = !spot ? 'no room or staff'
        : here ? applyCommand(w, c.id, { type: 'expand', buildingId: here.id, levels: spot.fit })
        : applyCommand(w, c.id, { type: 'build', typeId: 'builder', regionId: spot.regionId, methodId: m.id, levels: spot.fit });
      if (!err) toFront(w, c);
    }
  }
  reviewLevels(w, c, o, est.pointsPerDay);
  let fallbacks = 0;
  let blocked: { best: Pick | null } | undefined;
  for (let started = 0; started < TUNE.startsPerWeek; started++) {
    const own = w.constructions.filter((k) => k.companyId === c.id).length;
    if (own >= MAX_CONCURRENT_CONSTRUCTIONS) break;
    if (c.debt > creditLimit(w, c) * 0.3) break;
    const free = freeCash(w, c, est.costPerDay);
    const school = schoolCash(w, c, est.costPerDay);
    if (free <= 0 && school <= 0) break;
    const out = { best: null as Pick | null };
    const pick = pickProject(w, c, o, free, fallbacks < TUNE.lossBuildsPerWeek, out, school);
    blocked ??= out;
    if (!pick) break;
    if (pick.fallback) fallbacks++;
    const existing = w.buildings.find((b) => b.companyId === c.id && b.regionId === pick.regionId && b.typeId === pick.typeId);
    const err = existing
      ? applyCommand(w, c.id, { type: 'expand', buildingId: existing.id, levels: pick.levels })
      : applyCommand(w, c.id, { type: 'build', typeId: pick.typeId, regionId: pick.regionId, methodId: pick.methodId, levels: pick.levels });
    if (err) break;
    if (pick.fallback) {
      const starts = (kingdomById(w, c.kingdomId).startsMonth ??= {});
      starts[`${pick.typeId}|loss`] = (starts[`${pick.typeId}|loss`] ?? 0) + pick.levels;
    }
    if (isGovernment(pick.typeId)) toFront(w, c);
    // 지역 돈을 먼저 쓴다
    if (c.regionFunds?.[pick.regionId]) c.regionFunds[pick.regionId] = Math.max(0, c.regionFunds[pick.regionId] - constructionEstimate(w, c, pick.typeId).cost * pick.levels);
    o.add(getMethod(pick.typeId, pick.methodId), pick.levels, 1 + regionPerk(pick.regionId, pick.typeId));
  }
  if (blocked?.best) swapLand(w, c, o, blocked.best);
}

/**
 * 새 공사에 쓸 수 있는 돈: 현금 − 남길 돈 − 진행 중 공사에 더 들 돈 − 한 달 공사비.
 * 왕실은 국정 지출 TUNE.treasuryHighWeeks 주치를 남긴다 (학교·행정청·생산 건물 모두 그 위의 여윳돈으로만 짓는다)
 */
function freeCash(w: World, c: Company, costPerDay: number): number {
  const keep = c.state ? TUNE.treasuryHighWeeks * (kingdomById(w, c.kingdomId).expenseEma ?? 0) : 0;
  return c.cash - Math.max(reserveOf(w, c), keep) - committedCost(w, c) - costPerDay * 30;
}

/**
 * 왕실이 학교에 쓸 수 있는 돈: 정책 단계가 조이기 시작하는 선(지출 TUNE.treasuryLowWeeks 주치)까지 쓴다.
 * 현금 − max(준비금, (지출 + 공사 중인 학교의 주간 인건비) low 주치) − 진행 공사 잔액 − 한 달 공사비.
 * 새 학교도 그 운영비 low 주치를 남겨야 한다 (pickProject). 같은 주에 여러 학교를 넣어도 다 지은 뒤의 운영비를 낼 수 있게 한다.
 * 국고가 조이는 중이거나(빚, low 주치 미만) 세금이 TUNE.schoolTaxMax 단계를 넘으면(새 운영비를 낼 칸이 모자란다) 0. 민간은 학교를 짓지 않는다
 */
function schoolCash(w: World, c: Company, costPerDay: number): number {
  if (!c.state) return 0;
  const k = kingdomById(w, c.kingdomId);
  if (treasuryTight(c, k) || k.budget.tax > TUNE.schoolTaxMax) return 0;
  let pending = 0;
  for (const x of w.constructions) {
    const m = getMethod(x.typeId, x.methodId);
    if (x.companyId === c.id && m.seats) pending += wageCostOf(m, c.wages, c.state) * (x.levels ?? 1) * TICKS_PER_WEEK;
  }
  const keep = TUNE.treasuryLowWeeks * ((k.expenseEma ?? 0) + pending);
  return c.cash - Math.max(reserveOf(w, c), keep) - committedCost(w, c) - costPerDay * 30;
}

/** 왕실 사무소 레벨 합 (철거 대기 뺌) */
function officeLevels(w: World, c: Company): number {
  let n = 0;
  for (const x of w.buildings) if (x.companyId === c.id && getMethod(x.typeId, x.methodId).construction) n += x.level - (x.shrinking ?? 0);
  return n;
}

/** 건축사무소가 남기는 하루 포인트: 지금 능력 − 공사에 실제로 쓰인 양(buildUsed) − 이미 철거 대기에 오른 레벨의 몫 */
function officeSpare(w: World, c: Company, pointsPerDay: number): number {
  let pending = 0;
  for (const x of w.buildings) {
    const m = getMethod(x.typeId, x.methodId);
    if (x.companyId === c.id && m.construction && x.shrinking) pending += m.construction * x.shrinking * x.utilization * efficiency(x);
  }
  return pointsPerDay - (c.buildUsed ?? 0) - pending;
}

/** 건축사무소의 빈 레벨: 일하는 사람이 없는 레벨 수 (맡은 공사가 없어 인부를 해산한 사무소는 0) */
function officeEmpty(b: Building): number {
  return b.idle ? 0 : Math.floor(b.level * (1 - b.last.staffing) + 1e-9);
}

/**
 * 내 건물 마지막 1레벨의 장기 하루 손익: 짓기 판단(valueMethod)과 같은 계산이고, 이미 도는 레벨이라 전망에 더하지 않는다.
 * 건축사무소는 손익 대신 포인트 사용량과 일손으로 본다: 빈 레벨이 있거나 그 레벨을 빼도 쓰던 포인트를 다 낼 수 있으면 −1,
 * 아니면 +1 (마지막 1레벨은 남긴다)
 */
function levelValue(w: World, c: Company, o: Outlook, b: Building, pointsPerDay: number): number {
  const m = getMethod(b.typeId, b.methodId);
  if (m.construction) {
    const perLevel = m.construction * b.utilization * efficiency(b);
    if (pointsPerDay - perLevel <= 0) return 1;
    return officeEmpty(b) >= 1 || officeSpare(w, c, pointsPerDay) > perLevel ? -1 : 1;
  }
  const r = regionById(w, b.regionId);
  if (m.seats) return schoolValuation(w, c, r, m, 1, schoolSeats(w, r.id) - m.seats).profit;
  return valueMethod(w, o, r, c, b.typeId, m, 1, true).profit;
}

/**
 * 철거 판단 (짓기와 같은 주, 같은 전망): 마지막 레벨 손익이 TUNE.shrinkWeeks 주 연속 마이너스면 레벨의 1/4(최소 1)을 철거 대기에 올린다.
 * 건축사무소는 TUNE.officeShrinkWeeks 주를 보고, 그동안 한 번도 사람이 차지 않은 레벨(일하던 주의 최고 충원율 staffPeak 로 센다)과
 * 남는 포인트 몫(많아야 1/4) 중 큰 쪽을 헌다. 쉬다가 다시 뽑는 중이라 비어 있는 레벨은 헐지 않는다. 왕국의 마지막 사무소 레벨은 남긴다.
 * 손실 때문에 헐리는 중인 건물이 다시 이익을 내면 철거를 취소한다. 증설 공사 중인 건물은 보지 않는다
 */
function reviewLevels(w: World, c: Company, o: Outlook, pointsPerDay: number) {
  for (const b of w.buildings) {
    if (b.companyId !== c.id || BUILDING_BY_ID[b.typeId].auto) continue;
    if (w.constructions.some((k) => k.targetBuildingId === b.id)) { b.negWeeks = 0; delete b.staffPeak; continue; }
    const v = levelValue(w, c, o, b, pointsPerDay);
    if (b.shrinking) {
      if (v > 0 && !b.swap) b.shrinking = 0;
      delete b.staffPeak;
      continue;
    }
    b.swap = false;
    b.negWeeks = v < 0 ? (b.negWeeks ?? 0) + 1 : 0;
    const m = getMethod(b.typeId, b.methodId);
    if (!m.construction) {
      if (b.negWeeks >= TUNE.shrinkWeeks) {
        applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: Math.max(1, Math.round(b.level * 0.25)) });
        b.negWeeks = 0;
      }
      continue;
    }
    if (b.negWeeks === 0) delete b.staffPeak;
    else if (!b.idle) b.staffPeak = Math.max(b.staffPeak ?? 0, round2(b.last.staffing));
    if (b.negWeeks >= TUNE.officeShrinkWeeks) {
      const quarter = Math.max(1, Math.round(b.level * 0.25));
      const spare = Math.min(quarter, Math.floor(officeSpare(w, c, pointsPerDay) / (m.construction * b.utilization * efficiency(b))));
      const empty = b.staffPeak == null ? 0 : Math.floor(b.level * (1 - b.staffPeak) + 1e-9);
      const n = Math.min(Math.max(empty, spare), officeLevels(w, c) - 1);
      if (n >= 1) applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: n });
      b.negWeeks = 0;
      delete b.staffPeak;
    }
  }
}

/**
 * 땅 바꾸기: 땅이 없어 못 짓는 가장 좋은 후보가 있으면, 그 지역 같은 땅의 내 건물 중 마지막 레벨 수익률이 가장 낮은 것과 비교해
 * 후보 수익률이 그 TUNE.swapMult 배(그리고 기준 수익률)를 넘으면 그 건물을 후보 덩어리만큼 헌다
 */
function swapLand(w: World, c: Company, o: Outlook, cand: Pick) {
  const land = BUILDING_BY_ID[cand.typeId].land;
  const est = constructionEstimate(w, c, 'farm');
  let worst: { b: Building; roi: number } | null = null;
  for (const b of w.buildings) {
    if (b.companyId !== c.id || b.regionId !== cand.regionId || b.shrinking || BUILDING_BY_ID[b.typeId].auto) continue;
    if (BUILDING_BY_ID[b.typeId].land !== land || b.typeId === cand.typeId) continue;
    // 정부 건물(행정청·건축사무소·학교)은 땅 바꾸기로 헐지 않는다 (남길지는 reviewLevels 가 정한다)
    if (isGovernment(b.typeId)) continue;
    if (w.constructions.some((k) => k.targetBuildingId === b.id)) continue;
    const cost = constructionEstimate(w, c, b.typeId).cost;
    if (!Number.isFinite(cost) || cost <= 0) continue;
    const roi = (levelValue(w, c, o, b, est.pointsPerDay) * TICKS_PER_YEAR) / cost;
    if (!worst || roi < worst.roi) worst = { b, roi };
  }
  if (!worst || cand.score <= Math.max(MIN_ROI, worst.roi) * TUNE.swapMult) return;
  const n = Math.min(worst.b.level, cand.levels);
  if (!applyCommand(w, c.id, { type: 'demolish', buildingId: worst.b.id, levels: n })) worst.b.swap = true;
}

interface Pick { regionId: number; typeId: string; methodId: string; levels: number; score: number; fallback?: boolean }

/**
 * 모든 후보를 같은 기준으로: 장기 손익 / 공사비. 수익률이 기준의 1.25배를 넘는 가장 큰 덩어리를 고른다.
 * allowLoss: 이익이 나는 후보가 없으면 수익률이 가장 높은(가장 덜 손해 보는) 후보를 가장 작은 덩어리로 고른다.
 * 학교는 schoolFree(schoolCash)로 짓고, 공사비 + 그 레벨 인건비 TUNE.treasuryLowWeeks 주치가 있어야 한다
 */
export function pickProject(w: World, c: Company, o: Outlook, free: number, allowLoss = false, blocked?: { best: Pick | null }, schoolFree = 0): Pick | null {
  let best: Pick | null = null, least: Pick | null = null;
  const pools = new Map<string, number>();
  for (const r of ownRegions(w, c)) {
    for (const t of BUILDING_TYPES) {
      if (t.id === 'builder' || !canBuildType(c, t)) continue;
      // 기상 조건이 걸린 땅에는 짓지 않는다 (줄어든 산출과 오른 값은 일시적이다)
      if (harvestFactor(w, r.id, t.land) < 1) continue;
      const room = roomFor(w, r.id, t.id);
      const perLevel = constructionEstimate(w, c, t.id).cost;
      const budget = t.methods.some((m) => m.seats) ? schoolFree : free;
      if (!Number.isFinite(perLevel) || budget < perLevel) continue;
      const existing = w.buildings.find((b) => b.companyId === c.id && b.regionId === r.id && b.typeId === t.id);
      if (existing?.shrinking) continue;
      // 땅이 없으면 1레벨 기준 수익률만 재 둔다 (땅 바꾸기 후보). 매장량이 없는 것은 땅을 비워도 못 지으므로 뺀다
      if (room < 1) {
        if (!blocked || (t.deposit && depositFree(w, r.id, t.deposit) < 1)) continue;
        for (const m of availableMethods(c, t.id)) {
          if (existing && existing.methodId !== m.id) continue;
          if (laborAvailability(w, r, m, 1, c.state, pools) < MIN_STAFFING) continue;
          const e = m.seats ? schoolValuation(w, c, r, m, 1, schoolSeats(w, r.id)) : valueMethod(w, o, r, c, t.id, m, 1);
          const roi = (e.profit * TICKS_PER_YEAR) / perLevel;
          if (e.profit > 0 && roi > MIN_ROI && (!blocked.best || roi > blocked.best.score)) blocked.best = { regionId: r.id, typeId: t.id, methodId: m.id, levels: 1, score: roi };
        }
        continue;
      }
      for (const m of availableMethods(c, t.id)) {
        if (existing && existing.methodId !== m.id) continue;
        let choice: { levels: number; roi: number } | null = null, top: { levels: number; roi: number } | null = null;
        for (const levels of CHUNKS) {
          if (levels > room || budget < perLevel * levels) continue;
          if (m.seats && budget < (perLevel + wageCostOf(m, c.wages, c.state) * TICKS_PER_WEEK * TUNE.treasuryLowWeeks) * levels) continue;
          const e = m.seats ? schoolValuation(w, c, r, m, levels, schoolSeats(w, r.id)) : valueMethod(w, o, r, c, t.id, m, levels);
          if (laborAvailability(w, r, m, levels, c.state, pools) < MIN_STAFFING) continue;
          const roi = (e.profit * TICKS_PER_YEAR) / (perLevel * levels);
          if (allowLoss && levels === CHUNKS[CHUNKS.length - 1] && e.profit >= -TUNE.lossTolerance * e.wageCost) {
            const s = roi + Math.abs(roi) * (rand(w) - 0.5) * 0.3;
            if (!least || s > least.score) least = { regionId: r.id, typeId: t.id, methodId: m.id, levels, score: s, fallback: true };
          }
          if (e.profit <= 0) continue;
          if (roi <= MIN_ROI) continue;
          if (!top || roi > top.roi) top = { levels, roi };
          if (!choice && roi > MIN_ROI * 1.25) choice = { levels, roi };
        }
        const pick = choice ?? top;
        if (!pick) continue;
        // 지역 우선 투자: 그 지역 사람들이 낸 돈으로 짓는 몫만큼 가산점
        const local = Math.min(1, (c.regionFunds?.[r.id] ?? 0) / (perLevel * pick.levels));
        const score = pick.roi * (0.85 + rand(w) * 0.3) * (1 + TUNE.localBias * local);
        if (!best || score > best.score) best = { regionId: r.id, typeId: t.id, methodId: m.id, levels: pick.levels, score };
      }
    }
  }
  return best ?? least;
}

/** 방금 넣은 내 공사(목록 맨 끝)를 내 공사 맨 앞으로 옮긴다 */
function toFront(w: World, c: Company) {
  const mine = w.constructions.filter((k) => k.companyId === c.id);
  const last = mine[mine.length - 1];
  if (last && mine.length > 1) applyCommand(w, c.id, { type: 'moveConstruction', constructionId: last.id, index: 0 });
}

