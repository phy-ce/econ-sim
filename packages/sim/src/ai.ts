import { BUILDING_BY_ID, buildPointsOf, BUILDING_TYPES, EDUCATION_FLOOR, EDUCATION_RANGE, GOOD_IDS, GOODS, SKILL_DEFS, TECH_BY_ID, TICKS_PER_WEEK, TICKS_PER_YEAR, TRADING_POST, TUNE, getMethod, regionPerk, tradeEscrowPerLevel, tradeReserveOf } from './data';
import { withEstimateCache, regionAvgWealth, regionPopulation, wageCostOf,
  availableMethods, ownBuildingAt, builderOf, canBuildType, kingdomGdp, paysDividend, paysShare, companyById, constructionEstimate, creditLimit, depositFree, efficiency, estimateMethod, harvestFactor, hasBuilder, isGovernment, regionById, wagesAt, researchableTechs, roomFor, sellsShares, slots,
} from './economy';
import { MAX_CONCURRENT_CONSTRUCTIONS, MAX_LEVELS_PER_PROJECT, applyCommand } from './commands';
import { committedCost, favours, funderWeight, lawRevenue, ownerBuildings, ownerFunds, reserveOf, treasuryFree } from './finance';
import { privatizeLevel } from './production';
import { policyStatus } from './policy';
import { subsistenceWage } from './labor';
import { baseValue, longRunWages, marketOutlook, techValue, valueMethod } from './outlook';
import type { Outlook } from './outlook';
import { kingdomById } from './kingdoms';
import { STAFFING_HORIZON, expectedStaffing, labourPool, laborAvailability, takeFromPool } from './staffing';
import { LITERACY_PER_WEALTH, workforce } from './pops';
import { rand } from './rng';
import { BUDGET_STEPS, INVEST_LAWS, SKILLS, expOf, isLowerJob, literacyOf } from './types';
import type { BudgetItem, Building, Company, GoodId, Kingdom, MethodDef, Region, Skill, TaxLaw, WelfareLaw, World } from './types';
import { welfareShortOf, welfareWeekly } from './welfare';

export { STAFFING_HORIZON, laborAvailability } from './staffing';

// AI: 국영과 민간이 같은 판단을 쓴다. 다른 점은 자금원(국고 / 저택·금융가 금고)과 자기 왕국 땅에만 짓는다는 것뿐이다.

/** 건설 판단 기준: 연간 이윤 / 공사비 (5년 안에 회수) */
const MIN_ROI = () => TUNE.minRoi;
export const SWITCH_COOLDOWN = TICKS_PER_WEEK * 3;
/** 방식 고르기: 투입재마다 대륙 공급(이동평균)이 필요의 이 비율 미만이면 그 방식을 고르지 않는다 (근거 없음) */
export const INPUT_SUPPLY_MIN = 0.5;
/** aiSwitchV2: 새 방식의 건물 전체 하루 손익이 지금보다 이 비율 넘게 커야 바꾼다 */
export const SWITCH_MARGIN = 0.05;
/** aiSwitchV2: 바꾸기 문턱의 최소값 (레벨 × 지금 방식 하루 인건비 대비) */
export const SWITCH_MIN_WAGE_SHARE = 0.01;
/** 공사 하나의 레벨 수 후보 (큰 것부터). 1레벨이 일꾼 500명이 되어(2026-10-22) 1,000명 시절 [5, 2, 1]의 두 배 (1은 남는 땅 한 칸용) */
export const CHUNKS = [10, 4, 2, 1];
/** 사무소를 한 번에 늘리는 레벨: 지금 사무소의 1/4 (최소 4, 1,000명 시절 2의 두 배) */
export const OFFICE_BLOCK = 4;
export const OFFICE_GROWTH = 0.25;
/** TUNE.aiMixedMethods: 옆에 새 방식으로 짓는 건물의 공사 하나 레벨 상한 (계획: 1~2레벨) */
export const MIXED_LEVELS = 2;
/** 짓기 기준: 공사 기간 안에 일자리의 이 비율 이상을 채울 사람이 있어야 한다 (건축사무소는 대신 채울 수 있는 레벨 수 officeStaffable 을 본다) */
// TUNE.laborStrict: 일손이 다 차야(1) 짓는다
const MIN_STAFFING = () => (TUNE.laborStrict ? 1 : TUNE.minStaffing);

/**
 * 진단용 (cli/builddiag.ts): AI가 공사를 넣고(levels > 0), 헐고(< 0), 방식을 바꿀 때 그 길(path)과 함께 부른다.
 * path: pick 보통 후보, loss 손해 후보(allowLoss), govInputs 왕실 원료 확보, office 건축사무소, shrink 철거, swap 땅 바꾸기 철거, switchIn·switchOut 방식 바꾸기.
 * 시뮬레이션 상태를 바꾸지 않는다 (비어 있으면 아무것도 하지 않는다)
 */
export const aiTrace: { on?: (w: World, c: Company, path: string, typeId: string, methodId: string, levels: number, o?: Outlook, regionId?: number) => void } = {};

export function runAi(w: World) {
  if (!w.config.ai) return;
  const outlook = marketOutlook(w);
  // 이번 주 방식 바꾸기가 함께 쓰는 일손 곳간 (지역, 직종): 한 건물이 바꾸며 더 뽑을 사람을 빼 두어, 같은 사람을 여러 건물이 세지 않는다
  const switchPools = new Map<string, number>();
  const spare = TUNE.aiSwitchV2 ? switchSpare(w, outlook) : ({} as Record<GoodId, number>);
  for (const c of w.companies) {
    if (c.isPlayer) continue;
    // 왕실은 세법과 정책 단계(정부 건물의 국영 임금 포함)를 정한다. 생산 건물 임금은 민간과 왕실 모두 같은 규칙으로 정한다
    if (c.state) { chooseTaxLaw(w, c); adjustBudget(w, c); }
    adjustWages(w, c);
    manageBuildings(w, c, outlook, switchPools, spare);
    if (c.state) planResearch(w, c, outlook);
    if (c.state && TUNE.crownPrivatize === 'all') for (const b of w.buildings) if (b.companyId === c.id && sellsShares(b.typeId)) b.privatize = true;
    withEstimateCache(() => planConstruction(w, c, outlook));
  }
  withEstimateCache(() => buyLevels(w));
}

/**
 * 민영화 레벨 사기 (저택·금융가 AI, 매주): 민영화가 켜진 왕실 건물마다 1레벨까지 판다.
 * 레벨 값 = max(공사비 × 0.5, 공사비 + 그 레벨의 1년 이익) (적자면 공사비보다 싸고, 반값 아래로는 내려가지 않는다).
 * 사는 조건: 금고(약정 뺀 돈) ≥ 값 × TUNE.privatizeMargin, 값 ÷ 1년 이익 ≤ TUNE.privatizePayback 년.
 * 사는 곳은 마음(funderWeight: 같은 지역, 좋아하는 종류)이 큰 곳부터. 한 소유 건물은 한 주에 1레벨만 산다
 */
export function privatizePrice(w: World, gov: Company, b: Building): { price: number; yearProfit: number } {
  const cost = constructionEstimate(w, gov, b.typeId).cost;
  const yearProfit = b.level > 0 ? (b.profitEma * TICKS_PER_YEAR) / b.level : 0;
  return { price: Math.max(cost * 0.5, cost + yearProfit), yearProfit };
}

function buyLevels(w: World) {
  const bought = new Set<number>();
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId);
    if (!gov) continue;
    const forSale = w.buildings.filter((b) => b.companyId === gov.id && b.privatize && b.level >= 1 && !b.shrinking && sellsShares(b.typeId)
      && !w.constructions.some((x) => x.targetBuildingId === b.id));
    if (forSale.length === 0) continue;
    const owners = ownerBuildings(w, k.id);
    for (const b of forSale) {
      const { price, yearProfit } = privatizePrice(w, gov, b);
      if (!Number.isFinite(price) || price <= 0 || yearProfit <= 0 || price / yearProfit > TUNE.privatizePayback) continue;
      const buyer = owners.filter((o) => !bought.has(o.id)).map((o) => ({ o, free: treasuryFree(w, o), wt: funderWeight(o, b.regionId, b.typeId) }))
        .filter((x) => x.free >= price * TUNE.privatizeMargin).sort((a, c) => c.wt - a.wt || c.free - a.free || a.o.id - c.o.id)[0];
      if (!buyer) continue;
      bought.add(buyer.o.id);
      privatizeLevel(w, b, buyer.o, price);
    }
  }
}

const ownRegions = (w: World, c: Company) => w.regions.filter((r) => r.kingdomId === c.kingdomId);

/**
 * 이 지역에 건축사무소(방식 m)를 몇 레벨 더 채울 수 있는가 (직종별로 가장 작은 값, 소수).
 * 사람 = labourPool + 지금 자리보다 국영 임금(stateWages)이 TUNE.switchPremium 배 넘게 높은 같은 직종 재직자 중 공사 기간 안에 옮겨 오는 몫
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
      const o = b && !paysShare(b, s) ? companyById(w, b.companyId) : undefined;
      if (o && b && wagesAt(o, b.typeId)[s] * TUNE.switchPremium < (c.stateWages ?? c.wages)[s]) n += workforce(p) * reach;
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
 * 생산 건물 임금 (민간 상회와 왕실, 데이터 기준): 바닥과 천장 사이에서, 지난주 실제로 사람이 찼는지를 보고 움직인다.
 * 왕실의 정부 건물(행정청·건축사무소·학교)은 국영 임금(stateWages)이라 여기서 세지 않는다. 플레이어 회사는 AI가 돌지 않는다
 * - 바닥: 그 자리로 옮겨 올 사람들의 지금 소득 × TUNE.wageOutside (노동자·농부 ← 소작 수확 가치, 기술자 ← 노동자 임금, 전문가 ← 기술자 임금)
 * - 천장: 회사 생산 건물이 사람을 다 채웠을 때의 부가가치(지금 가격의 매출 − 원료) × TUNE.wageCeil 를 기본 임금 비율대로 나눈 값.
 *   실제 부가가치로 재면 사람이 없을 때 천장이 0이 되어 임금을 못 올리고 사람도 못 뽑는다. 산출이 없는 정부 건물은 천장 계산에서 뺀다
 * - 빈자리가 5% 넘는데 지난주 고용이 빈자리의 10%도 못 늘었으면 +3%, 빈자리가 2% 미만이면 −1%, 적자면 −2%
 */
function adjustWages(w: World, c: Company) {
  const mine = w.buildings.filter((b) => b.companyId === c.id && !BUILDING_BY_ID[b.typeId].auto && !(c.state && isGovernment(b.typeId)));
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
      outside += (isLowerJob(s) ? subsistenceWage(w, r) : s === 'skilled' ? c.wages.unskilled : c.wages.skilled) * n;
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

/**
 * 왕실이 남겨 둘 국고 (AI): 기본은 국정 지출 TUNE.treasuryHighWeeks 주치.
 * TUNE.crownGdpReserve > 0 이면 왕국 연간 총생산 × 그 비율 (지출이 커지거나 줄어도 경제 크기에 맞춘 기준)
 */
function crownKeep(w: World, c: Company, k: Kingdom): number {
  return TUNE.crownGdpReserve > 0 ? TUNE.crownGdpReserve * kingdomGdp(w, k.id) : TUNE.treasuryHighWeeks * (k.expenseEma ?? 0);
}

/** 국고가 넉넉한가 (풂): 남겨 둘 국고(crownKeep)를 넘는다 */
function treasuryRich(w: World, c: Company, k: Kingdom): boolean {
  return TUNE.crownGdpReserve > 0 ? c.cash > crownKeep(w, c, k) : treasuryWeeks(c, k) > TUNE.treasuryHighWeeks;
}

/** 국고가 조이는 중인가: 빚이 있거나 지출 TUNE.treasuryLowWeeks 주치보다 적다 (TUNE.crownGdpReserve > 0 이면 남겨 둘 국고의 절반보다 적다) */
export function treasuryTight(w: World, c: Company, k: Kingdom): boolean {
  if (c.debt > 0) return true;
  return TUNE.crownGdpReserve > 0 ? c.cash < crownKeep(w, c, k) / 2 : treasuryWeeks(c, k) < TUNE.treasuryLowWeeks;
}

/**
 * 정책 단계 (AI 왕국, 4주마다 한 칸). 기준은 국고가 주간 국정 지출의 몇 주치인가와, 지난 점검보다 늘었는가다.
 * 단계는 한 줄 사다리로 움직인다 (후함 → 긴축): 국영 임금 4 → 세금 1~5 → 국영 임금 2·1. 연구는 돈이 들지 않아 사다리에 없다.
 * - 조임 (빚이 있거나 TUNE.treasuryLowWeeks 주치 미만이고, 지난 점검보다 줄었다): 긴축 쪽으로 한 칸.
 *   학교는 적자 때문에 헐지 않는다: 사다리를 끝까지(국영 임금 1단계) 내려가고도 빚을 지며 줄 때만 학교를 줄인다 (shrinkSchools)
 * - 회복 (빚 없고 low 주치 이상, 줄지 않았다): 보통(3) 아래로 내린 국영 임금을 한 칸씩 되돌린다
 * - 풂 (TUNE.treasuryHighWeeks 주치 초과, 줄지 않았다): 세금을 내린다.
 * - 기술을 다 연 왕국: 풂 조건에서 임금 지수가 1 이하면 국영 임금을 TUNE.doneWageMax 단계까지 올리고,
 *   임금 지수가 1을 넘으면 보통(3)으로 되돌린다. 그 밖에는 국영 임금을 보통 위로 올리지 않는다
 * - 복지 (cutWelfare·raiseWelfare): 조임에서는 복지를 가장 먼저 줄인다 (단계를 1까지, 빚이 있으면 그다음 복지법을 끈다). 조이지 않는데 국고가 줄며
 *   TUNE.welfareWeeks 의 절반 주치 아래면 복지 단계를 내린다. 다른 손잡이를 움직이지 않은 점검에서는 복지를 켜거나 올린다 (raiseWelfare)
 */
function adjustBudget(w: World, c: Company) {
  const k = w.kingdoms.find((x) => x.governmentId === c.id);
  if (!k || w.tick % (TICKS_PER_WEEK * 4) !== 0) return;
  const net = c.cash - c.debt;
  const losing = k.netLast != null && net < k.netLast;
  k.netLast = net;
  const b = k.budget;
  let step: [BudgetItem, number] | null = null;
  // 기술을 다 연 왕국: 국영 임금을 보통 위로 TUNE.doneWageMax 단계까지 올릴 수 있다 (임금 지수 1 이하, 국고 넉넉할 때)
  const done = !c.research.current && researchableTechs(c).length === 0;
  if (treasuryTight(w, c, k)) {
    if (losing && !cutWelfare(w, c, k)) {
      if (b.wages > 3) step = ['wages', b.wages - 1];
      else if (b.tax < BUDGET_STEPS) step = ['tax', b.tax + 1];
      else if (b.wages > 1) step = ['wages', b.wages - 1];
      else if (c.debt > 0) shrinkSchools(w, c);
    }
  } else if (!losing) {
    const rich = treasuryRich(w, c, k);
    if (b.wages > 3 && (k.wageIndex ?? 1) > 1) step = ['wages', b.wages - 1];
    else if (b.wages < 3) step = ['wages', b.wages + 1];
    else if (done && rich && b.wages < TUNE.doneWageMax && (k.wageIndex ?? 1) <= 1) step = ['wages', b.wages + 1];
    else if (rich && b.tax > 1) step = ['tax', b.tax - 1];
    else raiseWelfare(w, c, k);
  } else if (k.welfareLaw !== 'none' && b.welfare > 1 && c.cash < (TUNE.welfareWeeks / 2) * (k.expenseEma ?? 0)) {
    // 조이지는 않지만 국고가 줄며 복지 기준의 절반 주치 아래: 복지를 한 칸 내린다
    step = ['welfare', b.welfare - 1];
  }
  if (step) applyCommand(w, c.id, { type: 'setBudget', item: step[0], value: step[1] });
}

/** 복지를 받을 수 있는 법 (끄기 'none' 제외) */
const WELFARE_ON: WelfareLaw[] = ['poor', 'wage', 'universal'];

/** 조임: 바뀌는 중인 복지법을 거두고, 복지 단계를 1까지 내리고, 빚이 있으면 복지법을 끈다. 무엇을 했으면 true */
function cutWelfare(w: World, c: Company, k: Kingdom): boolean {
  const pending = k.lawChange?.welfare;
  if (pending && pending.to !== 'none') { applyCommand(w, c.id, { type: 'setWelfareLaw', law: k.welfareLaw }); return true; }
  // TUNE.welfareCutOff: 복지법을 끄는 중(180일)이고 빚이 없으면 다른 손잡이(세금 등)를 움직이지 않고 기다린다
  if (TUNE.welfareCutOff && pending?.to === 'none' && c.debt <= 0) return true;
  if (k.welfareLaw === 'none') return false;
  if (k.budget.welfare > 1) { applyCommand(w, c.id, { type: 'setBudget', item: 'welfare', value: k.budget.welfare - 1 }); return true; }
  // 복지법은 빚을 질 때만 끈다 (지출 몇 주치가 모자란 것만으로 끄면 180일 전환 동안 다시 켜고 끄기를 되풀이한다).
  // TUNE.welfareCutOff: 조이면 빚이 없어도 끈다 (세금보다 먼저). 다시 켜기는 끈 뒤 WELFARE_COOLDOWN 동안 막는다 (raiseWelfare)
  if (!pending && (c.debt > 0 || TUNE.welfareCutOff)) { applyCommand(w, c.id, { type: 'setWelfareLaw', law: 'none' }); return true; }
  return false;
}

/** 복지법을 바꾸는 기준: 다른 법이 모자란 사람을 이 배수 넘게 더 돕고, 마지막으로 바꾼 지 WELFARE_COOLDOWN 틱이 지났을 때 */
export const WELFARE_SWITCH = 1.5;
export const WELFARE_COOLDOWN = 2 * TICKS_PER_YEAR;

/**
 * 복지 켜기·올리기 (AI 왕실, 다른 손잡이를 움직이지 않은 점검에서). 감당 = 국고 ≥ (복지를 뺀 주간 국정 지출 + 그 법·단계의 주간 복지 예상액) × TUNE.welfareWeeks.
 * 법마다 감당할 수 있는 가장 높은 단계에서 목표 소득에 모자란 사람(모자란 비율로 가중)을 세어 가장 많은 법을 고른다.
 * - 복지법이 없으면: 가장 나은 법으로 바꾸기 시작하고 복지 단계를 1로 둔다 (켜진 뒤 한 칸씩 올린다)
 * - 복지법이 있으면: 마지막으로 바꾼 지 WELFARE_COOLDOWN 이 지났고 다른 법이 지금 법의 WELFARE_SWITCH 배를 넘게 돕는다면 그 법으로 바꾼다.
 *   아니면 다음 단계를 감당할 수 있고 그 단계에 모자란 사람이 있으면 한 칸 올린다
 */
function raiseWelfare(w: World, c: Company, k: Kingdom) {
  if (k.lawChange?.welfare) return;
  // TUNE.welfareCutOff: 복지법을 끈 지(welfareTick: 마지막으로 법이 바뀐 날) WELFARE_COOLDOWN 이 안 지났으면 다시 켜지 않는다
  if (TUNE.welfareCutOff && k.welfareLaw === 'none' && k.welfareTick != null && w.tick - k.welfareTick < WELFARE_COOLDOWN) return;
  const paid = k.lastBudget?.welfare ?? 0;
  const base = Math.max(0, (k.expenseEma ?? 0) - paid);
  const afford = (law: WelfareLaw, s: number) => c.cash >= TUNE.welfareWeeks * (base + welfareWeekly(k, law, s));
  const best = (law: WelfareLaw) => {
    for (let s = BUDGET_STEPS; s >= 1; s--) if (afford(law, s)) return { s, v: welfareShortOf(k, law, s) };
    return { s: 0, v: 0 };
  };
  let pick: WelfareLaw | null = null, top = 0;
  for (const law of WELFARE_ON) { const x = best(law); if (x.v > top) { top = x.v; pick = law; } }
  if (k.welfareLaw === 'none') {
    if (!pick) return;
    applyCommand(w, c.id, { type: 'setWelfareLaw', law: pick });
    if (k.budget.welfare !== 1) applyCommand(w, c.id, { type: 'setBudget', item: 'welfare', value: 1 });
    return;
  }
  const cooled = k.welfareTick == null || w.tick - k.welfareTick >= WELFARE_COOLDOWN;
  if (cooled && pick && pick !== k.welfareLaw && top > best(k.welfareLaw).v * WELFARE_SWITCH) {
    applyCommand(w, c.id, { type: 'setWelfareLaw', law: pick });
    return;
  }
  const next = k.budget.welfare + 1;
  if (next <= BUDGET_STEPS && afford(k.welfareLaw, next) && welfareShortOf(k, k.welfareLaw, next) > 0) {
    applyCommand(w, c.id, { type: 'setBudget', item: 'welfare', value: next });
  }
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
export const LAW_SWITCH = 1.2;
export const LAW_COOLDOWN = TICKS_PER_YEAR;

/** 세법 (AI 왕국, 4주마다): 지금 세금 수준으로 두 세법이 걷을 세금(lawRevenue)을 비교해 더 걷히는 쪽으로 바꾼다 */
function chooseTaxLaw(w: World, c: Company) {
  const k = w.kingdoms.find((x) => x.governmentId === c.id);
  if (!k || w.tick % (TICKS_PER_WEEK * 4) !== 0) return;
  // 바꾸기가 끝날 때 실패했으면 LAW_COOLDOWN 동안 그 법은 다시 시작하지 않는다
  const failed = (kind: 'tax' | 'invest') => k.lawFail?.[kind] != null && w.tick - k.lawFail[kind]! < LAW_COOLDOWN;
  const st = policyStatus(w, k.id);
  // 기술로 열리고 조건이 맞는 세법 중 예상 세입이 가장 큰 것이 지금의 LAW_SWITCH 배를 넘으면 바꾸기 시작한다
  if (!k.lawChange?.tax && !(k.lawTick != null && w.tick - k.lawTick < LAW_COOLDOWN) && !failed('tax')) {
    let best: TaxLaw = k.taxLaw, top = lawRevenue(w, k, k.taxLaw) * LAW_SWITCH;
    for (const o of st.tax.options) {
      if (!o.eligible || o.id === k.taxLaw) continue;
      const v = lawRevenue(w, k, o.id);
      if (v > top) { top = v; best = o.id; }
    }
    if (best !== k.taxLaw) applyCommand(w, c.id, { type: 'setTaxLaw', law: best });
  }
  // 투자법: 열리고 조건이 맞으면 한 칸씩 넓힌다 (지분을 살 사람이 늘어 금융가가 커진다)
  if (!k.lawChange?.invest && !failed('invest')) {
    const next = INVEST_LAWS[INVEST_LAWS.indexOf(k.investLaw) + 1];
    if (next && st.invest.options.find((o) => o.id === next)?.eligible) applyCommand(w, c.id, { type: 'setInvestLaw', law: next });
  }
}

/** 산출물 1단위당 이윤 (방식끼리 비교용) */
function unitProfit(profit: number, m: MethodDef): number {
  const out = GOOD_IDS.reduce((a, g) => a + (m.outputs[g] ?? 0), 0);
  return out > 0 ? profit / out : profit;
}

/**
 * 투입재를 대륙 어딘가에서 실제로 구할 수 있는가: 투입재마다 대륙 공급(이동평균)이 필요의 INPUT_SUPPLY_MIN 이상.
 * TUNE.aiInputFill: 공급 대신 남는 양 = 대륙 공급 − 대륙 수요 (이동평균) + 이 건물 b 가 지금 방식으로 쓰는 양 (레벨 × 가동률, 바꾸면 풀린다. 꺼진 건물은 0)
 */
function inputsAvailable(w: World, m: MethodDef, levels: number, b?: Building): boolean {
  const own = TUNE.aiInputFill && b?.active ? getMethod(b.typeId, b.methodId) : null;
  for (const [g, per] of Object.entries(m.inputs) as [keyof typeof GOODS, number][]) {
    let avail = 0;
    if (TUNE.aiInputFill) {
      for (const x of w.regions) avail += x.market[g].supplyEma - x.market[g].demandEma;
      if (own && b) avail += (own.inputs[g] ?? 0) * b.level * b.utilization;
    } else for (const x of w.regions) avail += x.market[g].supplyEma;
    if (avail < per * levels * INPUT_SUPPLY_MIN) return false;
  }
  return true;
}

/** 굶는 투입 충족: 이 값 미만이면 굶은 주로 센다 (TUNE.starveWeeks, 건축사무소 자재 바꾸기). 근거 없음 */
export const STARVE_FILL = 0.5;

/** 굶는 건물 (TUNE.starveWeeks): 투입 충족 < STARVE_FILL 이 그 주 수 이어졌다 */
function starving(b: Building): boolean {
  return TUNE.starveWeeks > 0 && (b.starvedWeeks ?? 0) >= TUNE.starveWeeks;
}
/** TUNE.starveWeeks > 0: 투입 충족이 이 값 미만이면 가동률을 올리지 않는다 (올리면 더 모자란다). 근거 없음 */
export const RAISE_FILL = 0.9;

/** 행정청용: 그 왕국 시장들에 남는 투입재(공급 − 수요, 이동평균)가 이 방식 levels 레벨의 하루 필요의 절반 이상인가 */
function kingdomInputs(w: World, kingdomId: number, m: MethodDef, levels: number): boolean {
  for (const [g, per] of Object.entries(m.inputs) as [keyof typeof GOODS, number][]) {
    let spare = 0;
    for (const x of w.regions) if (x.kingdomId === kingdomId) spare += x.market[g].supplyEma - x.market[g].demandEma;
    if (spare < per * levels * 0.5) return false;
  }
  return true;
}

/**
 * 방식 바꾸기용 남는 투입재 (대륙): 전망의 공급(절반 넘게 지은 공사의 산출 포함) − 건물이 지금 방식으로 쓰는 양(레벨 × 가동률 × 충원율) − 건물 밖 수요(가계·정부·공사 자재, 이동평균)
 * − 공사 중 건물의 투입. 건물 수요를 이동평균이 아니라 방식으로 세는 것은, 바꾼 건물이 사람을 다 뽑기까지 몇 주 동안 원료를 덜 사서
 * 이동평균으로는 남는 것처럼 보여 다른 건물이 줄줄이 따라 바꾸고, 다 차면 원료가 끊겨 되돌아가기를 되풀이했기 때문이다
 */
const RAMP_WEEKS = 8;
function switchSpare(w: World, o: Outlook): Record<GoodId, number> {
  const spare = {} as Record<GoodId, number>;
  for (const g of GOOD_IDS) {
    let d = 0;
    for (const r of w.regions) for (const [k, q] of Object.entries(r.market[g].demandByEma ?? {})) if (!k.startsWith('bld:')) d += q;
    spare[g] = o.supply[g] - d;
  }
  for (const b of w.buildings) {
    if (!b.active) continue;
    const m = getMethod(b.typeId, b.methodId);
    // 사람이 덜 찬 건물은 그만큼 덜 산다. 다만 막 바꾼 건물(RAMP_WEEKS 안)은 곧 다 찬다고 본다
    const run = b.level * b.utilization * (w.tick - b.lastSwitchTick < RAMP_WEEKS * TICKS_PER_WEEK ? 1 : Math.min(1, b.last.staffing));
    for (const g in m.inputs) spare[g as GoodId] -= (m.inputs[g as GoodId] ?? 0) * run;
  }
  for (const k of w.constructions) {
    const m = getMethod(k.typeId, k.methodId);
    for (const g in m.inputs) spare[g as GoodId] -= (m.inputs[g as GoodId] ?? 0) * (k.levels ?? 1);
    // 공사 중 산출은 절반 넘게 지은 것만 센다 (막 시작한 공사의 산출을 믿고 바꾸면 원료가 끊겨 되돌아간다)
    if (k.points < k.required / 2) for (const g in m.outputs) spare[g as GoodId] -= (m.outputs[g as GoodId] ?? 0) * (1 + regionPerk(k.regionId, k.typeId)) * (k.levels ?? 1);
  }
  return spare;
}

/** 방식 바꾸기용 투입 충족 0..1: 남는 투입재(switchSpare)에 이 건물이 지금 방식으로 쓰는 양을 돌려 더해 새 방식의 필요를 얼마나 채우는가 (투입재마다 가장 작은 값) */
function inputFill(spare: Record<GoodId, number>, m: MethodDef, cur: MethodDef, b: Building): number {
  const run = b.level * Math.max(0.1, b.utilization);
  let f = 1;
  for (const [g, per] of Object.entries(m.inputs) as [GoodId, number][]) {
    if (!(per > 0)) continue;
    f = Math.min(f, Math.max(0, Math.min(1, (spare[g] + (cur.inputs[g] ?? 0) * run) / (per * run))));
  }
  return f;
}

/** AI 무역소 판단: 금고 중 하루 매입에 쓰인다고 보는 비율 (산 화물은 다음 날 팔려 돈이 돌아오므로 금고 절반쯤은 늘 화물로 묶인다). 근거 없음 */
export const TRADE_TURN = 0.5;

/**
 * 무역소 levels 레벨(방식 m)의 하루 손익 (AI): 이 지역 교역 수요(산 주문 + 금고가 모자라 잘린 주문, Region.trade 이동평균) 중
 * 다른 무역소(self 를 뺀 그 지역 모든 무역소와 공사 중인 무역소, 레벨 × 레벨당 유보액 × TRADE_TURN)가 다 사고 남는 몫을 이 레벨들의 하루 매입 한도까지 사서
 * 기대 이익률(값 차이 − 운임 − 관세)만큼 번다고 본다. 거기서 인건비를 뺀다 (짓기 판단과 같은 장기 임금, outlook.ts longRunWages)
 */
export function tradeValuation(w: World, c: Company, r: Region, m: MethodDef, levels: number, self?: Building): { wageCost: number; profit: number } {
  const t = r.trade;
  const wageCost = wageCostOf(m, longRunWages(c, TRADING_POST), c.state) * levels;
  if (!t) return { wageCost, profit: -wageCost };
  let others = 0;
  for (const x of w.buildings) if (x !== self && x.typeId === TRADING_POST && x.regionId === r.id) others += x.level * tradeReserveOf(x.methodId) * TRADE_TURN;
  // 공사 중인 무역소도 곧 살 몫으로 센다 (같은 주에 여러 공사를 넣거나, 잘린 주문 기록이 공사가 끝나기 전까지 줄지 않아 겹쳐 짓지 않게)
  for (const k of w.constructions) if (k.typeId === TRADING_POST && k.regionId === r.id) others += (k.levels ?? 1) * tradeReserveOf(k.methodId) * TRADE_TURN;
  const extra = Math.min(levels * tradeReserveOf(m.id) * TRADE_TURN, Math.max(0, t.buy + t.cut - others));
  return { wageCost, profit: extra * Math.max(0, t.margin) - wageCost };
}

function manageBuildings(w: World, c: Company, o: Outlook, pools: Map<string, number>, spare: Record<GoodId, number>) {
  for (const b of w.buildings.filter((x) => x.companyId === c.id && !BUILDING_BY_ID[x.typeId].auto)) {
    const usable = availableMethods(c, b.typeId);
    const cur = getMethod(b.typeId, b.methodId);

    // 무역소: 일손을 구할 수 있는 방식 중 이 레벨 수로 하루 손익(tradeValuation)이 가장 큰 것 (지금보다 5% 넘게 나아야, 3주 쿨다운).
    // 늘 다 가동한다 (가동률을 줄이면 살 수 있는 돈만 준다). 남길지는 reviewLevels 가 레벨 단위로 정한다
    if (b.typeId === TRADING_POST) {
      const r = regionById(w, b.regionId);
      if (usable.length > 1 && w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN) {
        const val = (m: MethodDef) => tradeValuation(w, c, r, m, b.level, b).profit;
        const vCur = val(cur);
        let best = cur, bestV = vCur + Math.abs(vCur) * SWITCH_MARGIN;
        for (const m of usable) {
          if (m.id === cur.id || laborAvailability(w, r, m, b.level, c.state, pools, c, b) < MIN_STAFFING()) continue;
          const v = val(m);
          if (v > bestV) { best = m; bestV = v; }
        }
        if (best !== cur) { applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id }); takeFromPool(w, r, best, b.level, c.state, pools, c, b); }
      }
      if (!b.active) applyCommand(w, c.id, { type: 'setActive', buildingId: b.id, active: true });
      if (b.utilization < 1) applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: 1 });
      continue;
    }
    const wages = wagesAt(c, b.typeId);
    const current = estimateMethod(w, b.regionId, b.typeId, b.methodId, wages, c.state);

    // 건축사무소: 자재를 구할 수 있는 방식 중 하루 포인트가 가장 많은 것 (가동률은 늘 100%)
    if (cur.construction) {
      const starved = b.active && !b.idle && b.last.inputFill < STARVE_FILL;
      const ok = usable.filter((m) => m.construction && (m.id === b.methodId ? !starved : inputsAvailable(w, m, b.level, b)));
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
      const ok = usable.filter((m) => m.seats && (m.id === cur.id || laborAvailability(w, r, m, b.level, c.state) >= MIN_STAFFING()));
      const best = ok.reduce((x, m) => (net(m) > net(x) ? m : x), cur);
      if (best.id !== cur.id && w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN) applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id });
      continue;
    }

    // 행정청: 한도 × 원료 충족률이 가장 큰 방식. 원료가 있는 방식은 이 건물의 충족률 이동평균(fillEma)으로 본다.
    // 원료가 없는 방식으로 도는 동안은 fillEma 를 매주 TUNE.adminFillRetry 만큼 1로 되돌려, 원료가 다시 돌면 언젠가 다시 시도한다
    if (cur.taxCapacity) {
      if (!Object.keys(cur.inputs).length && b.fillEma !== undefined) b.fillEma = b.fillEma + (1 - b.fillEma) * TUNE.adminFillRetry;
      const ema = b.fillEma ?? 1;
      const value = (m: MethodDef) => m.taxCapacity! * (Object.keys(m.inputs).length ? ema : 1);
      let best = cur;
      for (const m of usable) if (m.taxCapacity && m.id !== cur.id && kingdomInputs(w, regionById(w, b.regionId).kingdomId, m, b.level) && value(m) > value(best) * 1.1) best = m;
      if (best.id !== cur.id && w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN) applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id });
      continue;
    }

    // 생산 방식 (TUNE.aiSwitchV2): 건물 전체의 하루 손익 = 레벨 × 기대 충원율 × (매출 × 투입 충족 × 숙련 − 원료비 × 투입 충족 − 인건비)가
    // 지금 방식보다 5% (최소 인건비의 1%) 넘게 큰 방식으로 바꾼다 (3주 쿨다운, 투입재를 못 구해 멈췄으면 쿨다운 없이).
    // 기대 충원율 = 지금 재직자 + 이번 주 곳간으로 채우는 비율 (임금 가중). 투입 충족 = 대륙 전망의 남는 공급(공사 중 산출 포함)으로 채우는 비율.
    // 숙련: 바꾸면 숙련이 반으로 준다 (commands setMethod). 바꾸면 더 뽑을 사람을 곳간에서 뺀다
    const starved = Object.keys(cur.inputs).length > 0 && Object.keys(cur.outputs).length > 0 && b.active && b.last.inputFill < STARVE_FILL && b.last.staffing > 0;
    const region = regionById(w, b.regionId);
    if (TUNE.aiSwitchV2) {
      if (usable.length > 1 && (starved || w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN)) {
        const exp = 0.4 + 0.6 * expOf(b);
        const perk = 1 + regionPerk(b.regionId, b.typeId);
        // 값은 대륙 장기 가격(전망)으로 잰다: 지금 시장 값은 바꾼 직후 크게 출렁여(떠난 상품은 오르고 들어간 상품은 내린다) 되돌아가게 만든다.
        // 바꾸면 이 건물이 내놓고 사는 양이 바뀐 만큼 장기 가격과 팔리는 비율을 움직인 값으로 친다 (작은 시장에 큰 건물이 들어가면 넘친다)
        const val = (m: MethodDef) => {
          const st = expectedStaffing(w, region, m, b.level, c.state, pools, c, b);
          const fi = m === cur && starved ? b.last.inputFill : inputFill(spare, m, cur, b);
          const eff = m === cur ? 1 : (0.4 + 0.6 * expOf(b) * 0.5) / exp;
          let revenue = 0, inputCost = 0;
          for (const g of GOOD_IDS) {
            const out = m.outputs[g] ?? 0, inp = m.inputs[g] ?? 0;
            if (out) {
              const dS = (out - (cur.outputs[g] ?? 0)) * perk * b.level;
              revenue += out * perk * o.price(g, dS) * o.sellRate(g, dS);
            }
            if (inp) inputCost += inp * o.price(g, 0, (inp - (cur.inputs[g] ?? 0)) * b.level, false);
          }
          return b.level * st * (revenue * fi * eff - inputCost * fi - wageCostOf(m, wages, c.state));
        };
        const vCur = val(cur);
        const bar = vCur + Math.max(Math.abs(vCur) * SWITCH_MARGIN, SWITCH_MIN_WAGE_SHARE * b.level * wageCostOf(cur, wages, c.state));
        let best = cur, bestV = -Infinity;
        // TUNE.aiMixedMethods: 같은 지역에 그 방식 건물이 이미 있으면 그 방식으로는 바꾸지 않는다 (방식마다 건물 하나)
        const taken = (m: MethodDef) => !!TUNE.aiMixedMethods && w.buildings.some((x) => x !== b && x.companyId === b.companyId && x.regionId === b.regionId && x.typeId === b.typeId && x.methodId === m.id);
        for (const m of usable) {
          if (m.id === cur.id || taken(m)) continue;
          const v = val(m);
          // 손해 보는 방식으로는 바꾸지 않는다: 원료가 없어 아무것도 못 만드는 방식도 사람이 적으면 "덜 잃는" 쪽으로 보인다 (손해는 가동률과 철거가 다룬다)
          if (v > 0 && v > bar && v > bestV) { best = m; bestV = v; }
        }
        if (best !== cur) {
          applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id });
          if (aiTrace.on) { aiTrace.on(w, c, 'switchIn', b.typeId, best.id, b.level, o); aiTrace.on(w, c, 'switchOut', b.typeId, cur.id, -b.level, o); }
          takeFromPool(w, region, best, b.level, c.state, pools, c, b);
          // 같은 주에 다른 건물이 이 바꾸기를 보고 판단하게 전망에 반영한다
          o.add(best, b.level, perk, true); o.add(cur, -b.level, perk, true);
          for (const g of GOOD_IDS) spare[g] -= ((best.inputs[g] ?? 0) - (cur.inputs[g] ?? 0)) * b.level * b.utilization;
        }
      }
    } else {
      // 옛 규칙: 산출 1단위당 이윤이 5% + 0.01 넘게 나은 방식. 일손 기대(지금 재직자 포함)가 기준 미만이거나 공급이 필요의 50% 미만인 방식은 고르지 않는다.
      // 지금 방식이 반도 채워지지 않고 일손도 구할 수 없으면(understaffed), 손익이 낮아도 일손을 구할 수 있는 방식으로 바꾼다
      const staffable = (m: MethodDef) => laborAvailability(w, region, m, b.level, c.state, undefined, c, b) >= MIN_STAFFING();
      const understaffed = b.active && b.last.staffing < MIN_STAFFING() && !staffable(cur);
      if (usable.length > 1 && (starved || w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN)) {
        let best = { m: cur, v: starved || understaffed ? -Infinity : unitProfit(current.profit, cur) };
        for (const m of usable) {
          if (m.id === cur.id || !inputsAvailable(w, m, b.level, b) || !staffable(m)) continue;
          const v = unitProfit(estimateMethod(w, b.regionId, b.typeId, m.id, wages, c.state).profit, m);
          if (v > best.v * 1.05 + 0.01) best = { m, v };
        }
        if (best.m !== cur && !applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.m.id }) && aiTrace.on) {
          aiTrace.on(w, c, 'switchIn', b.typeId, best.m.id, b.level, o); aiTrace.on(w, c, 'switchOut', b.typeId, cur.id, -b.level, o);
        }
      }
    }
    // 굶은 주 수 (TUNE.starveWeeks): 지금 방식으로 투입 충족 < STARVE_FILL 인 주를 센다 (방식을 바꾸면 처음부터)
    if (TUNE.starveWeeks > 0) {
      const n = starved && b.methodId === cur.id ? (b.starvedWeeks ?? 0) + 1 : 0;
      if (n > 0) b.starvedWeeks = n; else delete b.starvedWeeks;
    }
    // 왕실 정부 건물(행정청)은 늘 다 가동한다. 남길지는 reviewLevels 가 레벨 단위로 정한다
    if (c.state && isGovernment(b.typeId)) continue;

    if (!b.active) {
      b.pausedWeeks += 1;
      if (current.margin > 0.05 && inputsAvailable(w, cur, b.level, b)) {
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
    // 유보 자산이 남아 있으면 적자를 거기서 메우고 가동률을 줄이지 않는다. 다만 굶는 건물(starving)은 유보 자산이 있어도 줄인다
    const hungry = starving(b);
    const bleeding = (hungry || !b.reserve) && harvestFactor(w, b.regionId, BUILDING_BY_ID[b.typeId].land) >= 1 && b.profitEma < 0 && (current.margin < -0.2 || actualMargin < -0.2);
    b.lossWeeks = bleeding ? b.lossWeeks + 1 : 0;
    if (b.lossWeeks >= 4 && b.utilization > 0.1 + 1e-9) {
      applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: Math.max(0.1, b.utilization - 0.1) });
      b.lossWeeks = 0;
    } else if (b.utilization < 1 && current.margin > 0 && !(TUNE.starveWeeks > 0 && b.last.inputFill < RAISE_FILL)) {
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
      if (paysShare(b, s)) continue;
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
  const wageCost = wageCostOf(m, c.stateWages ?? c.wages, c.state) * levels;
  return { wageCost, profit: benefit - wageCost };
}

/** 연구 고르기 (AI 왕실): 진행 중인 연구가 없으면 늘 하나 고른다 (연구는 돈이 들지 않는다) */
function planResearch(w: World, c: Company, o: Outlook) {
  const r = c.research;
  if (!r.current) {
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
  // 사무소는 수수료로 운영비를 벌지만 쓰지 못한 포인트는 손실이고 증설비는 국고가 내므로, 국고가 넉넉할 때(지출 TUNE.treasuryHighWeeks 주치 초과, 빚 없음)만 늘린다.
  // 국고 몇 주치의 지출(expenseEma)에는 사무소 손익이 들어 있다 (finance.ts spendBudget)
  if (builder === c) {
    const offices = w.buildings.filter((b) => b.companyId === c.id && b.typeId === 'builder');
    const officeLevel = offices.reduce((s, b) => s + b.level, 0);
    const block = Math.max(OFFICE_BLOCK, Math.round(officeLevel * OFFICE_GROWTH));
    const officeCost = constructionEstimate(w, c, 'builder').cost * block;
    const full = (c.buildUsed ?? 0) >= est.pointsPerDay * TUNE.officeUseFull;
    // TUNE.officeSelfPay: 민간 공사가 목표 일수 넘게 밀려 있으면 늘린 포인트를 민간이 사 가므로(공사비) 조이지 않는 국고면 늘린다
    const weeks = treasuryWeeks(c, kingdomById(w, c.kingdomId));
    const privBacklog = w.constructions.filter((k) => { const o = companyById(w, k.companyId); return !!o && !o.state && builderOf(w, o) === builder; }).reduce((s, k) => s + (k.required - k.points), 0) / Math.max(1, est.pointsPerDay);
    // TUNE.officeSchoolFirst: 이 길은 학교 자리가 목표(schoolWanted)의 그 비율 이상일 때만 (사무소와 학교는 같은 국고·기술자를 쓴다)
    let seats = 0, wanted = 0;
    if (TUNE.officeSchoolFirst > 0) for (const r of ownRegions(w, c)) { seats += schoolSeats(w, r.id); wanted += schoolWanted(r); }
    const schooled = seats >= wanted * TUNE.officeSchoolFirst;
    const rich = c.debt <= 0 && (weeks > TUNE.officeRichWeeks || (TUNE.officeSelfPay > 0 && schooled && weeks > TUNE.treasuryLowWeeks && privBacklog > TUNE.officeTargetDays));
    if (offices.length && full && rich && backlog() > TUNE.officeTargetDays && c.cash > officeCost * 1.5 && !w.constructions.some((k) => k.companyId === c.id && k.typeId === 'builder')) {
      const office = offices[0];
      // 대기가 TUNE.officeTargetDays 안으로 들어올 만큼 한 번에 늘린다
      const perLevel = est.pointsPerDay / Math.max(1, officeLevel);
      const want = Math.ceil((backlog() * est.pointsPerDay / TUNE.officeTargetDays - est.pointsPerDay) / Math.max(1e-9, perLevel));
      // 한 번에 늘리는 양은 지금 사무소가 목표 일수 안에 지을 수 있는 만큼까지 (증설 공사가 너무 길어지지 않게)
      const byTime = Math.floor((est.pointsPerDay * TUNE.officeTargetDays) / buildPointsOf('builder'));
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
      if (!err && spot) aiTrace.on?.(w, c, 'office', 'builder', m.id, spot.fit);
    }
  }
  reviewLevels(w, c, o, est.pointsPerDay);
  if (c.state) secureGovInputs(w, c, o, est.costPerDay);
  // 착공 공사비 52주 이동 합 (발전 투자 몫을 재는 바탕, TUNE.devShare)
  c.startCost = (c.startCost ?? 0) * (1 - 1 / 52);
  c.devCost = (c.devCost ?? 0) * (1 - 1 / 52);
  const free = () => (c.state || c.isPlayer ? freeCash(w, c, est.costPerDay) : ownerFunds(w, c.kingdomId));
  const canStart = () => w.constructions.filter((k) => k.companyId === c.id).length < MAX_CONCURRENT_CONSTRUCTIONS && c.debt <= creditLimit(w, c) * 0.3;
  const start = (pick: Pick, path: string): boolean => {
    const existing = ownBuildingAt(w, c.id, pick.regionId, pick.typeId, pick.methodId);
    const err = existing
      ? applyCommand(w, c.id, { type: 'expand', buildingId: existing.id, levels: pick.levels })
      : applyCommand(w, c.id, { type: 'build', typeId: pick.typeId, regionId: pick.regionId, methodId: pick.methodId, levels: pick.levels });
    if (err) return false;
    aiTrace.on?.(w, c, path, pick.typeId, pick.methodId, pick.levels, o, pick.regionId);
    const cost = constructionEstimate(w, c, pick.typeId).cost * pick.levels;
    if (!isGovernment(pick.typeId)) c.startCost = (c.startCost ?? 0) + cost;
    if (path === 'dev') c.devCost = (c.devCost ?? 0) + cost;
    if (isGovernment(pick.typeId)) toFront(w, c);
    o.add(getMethod(pick.typeId, pick.methodId), pick.levels, 1 + regionPerk(pick.regionId, pick.typeId), false, pick.regionId);
    return true;
  };
  // 발전 투자 (TUNE.devShare): 주에 1건까지, 잠재 수요를 보고 짓는 공사비가 52주 착공 공사비의 devShare 를 넘지 않을 만큼.
  // devCost + x <= devShare × (startCost + x) → x <= (devShare × startCost − devCost) ÷ (1 − devShare)
  if (TUNE.aiBuildNow && TUNE.devShare > 0 && TUNE.devShare < 1 && canStart()) {
    const room = (TUNE.devShare * (c.startCost ?? 0) - (c.devCost ?? 0)) / (1 - TUNE.devShare);
    const budget = Math.min(free(), room);
    const pick = budget > 0 ? pickProject(w, c, o, budget, false, undefined, 0, true) : null;
    if (pick) start(pick, 'dev');
  }
  let fallbacks = 0;
  let blocked: { best: Pick | null } | undefined;
  for (let started = 0; started < TUNE.startsPerWeek; started++) {
    if (!canStart()) break;
    // 민간 상회는 저택·금융가 금고(약정 뺀 돈)로 짓는다
    const cash = free();
    const school = schoolCash(w, c, est.costPerDay);
    if (cash <= 0 && school <= 0) break;
    const out = { best: null as Pick | null };
    const pick = pickProject(w, c, o, cash, fallbacks < TUNE.lossBuildsPerWeek, out, school);
    blocked ??= out;
    if (!pick) break;
    if (pick.fallback) fallbacks++;
    if (!start(pick, pick.fallback ? 'loss' : 'pick')) break;
    if (pick.fallback) {
      const starts = (kingdomById(w, c.kingdomId).startsMonth ??= {});
      starts[`${pick.typeId}|loss`] = (starts[`${pick.typeId}|loss`] ?? 0) + pick.levels;
    }
  }
  if (blocked?.best) swapLand(w, c, o, blocked.best);
}

/**
 * 왕실은 행정청 원료(전문 관료제의 종이 등)를 왕국 안에서 댈 만큼 생산 건물을 직접 짓는다.
 * 필요 = 행정청 레벨 × 원료를 쓰는 가장 나은 방식(아는 것)의 레벨당 원료. 공급 = 왕국 안 그 상품 건물(누구 것이든)과 시작한 공사의 레벨 × 레벨당 산출.
 * 국고가 조이지 않으면 남길 돈 선을 넘어서도 짓는다. 모자라면 모자란 만큼 1건 짓고 맨 앞에 둔다 (같은 상품 공사가 왕실에 이미 있으면 기다린다). 민간 공사 대기열은 길어서 기다리면 몇 년이 걸린다
 */
function secureGovInputs(w: World, c: Company, o: Outlook, costPerDay: number) {
  if (w.constructions.filter((k) => k.companyId === c.id).length >= MAX_CONCURRENT_CONSTRUCTIONS || c.debt > creditLimit(w, c) * 0.3) return;
  const mine = (regionId: number) => regionById(w, regionId).kingdomId === c.kingdomId;
  const need = new Map<keyof typeof GOODS, number>();
  const where = new Map<number, number>();
  for (const b of w.buildings) {
    if (b.companyId !== c.id || !getMethod(b.typeId, b.methodId).taxCapacity) continue;
    const m = availableMethods(c, b.typeId).filter((x) => x.taxCapacity && Object.keys(x.inputs).length).sort((x, y) => y.taxCapacity! - x.taxCapacity!)[0];
    if (!m) continue;
    for (const [g, per] of Object.entries(m.inputs) as [keyof typeof GOODS, number][]) need.set(g, (need.get(g) ?? 0) + per * b.level);
    where.set(b.regionId, (where.get(b.regionId) ?? 0) + b.level);
  }
  for (const [g, n] of need) {
    let supply = 0, queued = false;
    for (const b of w.buildings) if (mine(b.regionId)) supply += (getMethod(b.typeId, b.methodId).outputs[g] ?? 0) * b.level;
    for (const k of w.constructions) {
      const out = getMethod(k.typeId, k.methodId).outputs[g] ?? 0;
      // 민간 공사는 대기열이 길어 시작한 것(포인트가 들어간 것)만 센다
      if (out > 0 && mine(k.regionId) && (k.companyId === c.id || k.points > 0)) { supply += out * (k.levels ?? 1); if (k.companyId === c.id) queued = true; }
    }
    if (queued || supply >= n) continue;
    const t = BUILDING_TYPES.find((x) => canBuildType(c, x) && !x.stateOnly && availableMethods(c, x.id).some((m) => (m.outputs[g] ?? 0) > 0));
    if (!t) continue;
    const m = availableMethods(c, t.id).find((x) => (x.outputs[g] ?? 0) > 0)!;
    const perLevel = constructionEstimate(w, c, t.id).cost;
    // 국고가 조이지 않으면(빚 없음, 지출 TUNE.treasuryLowWeeks 주치 이상) 진행 중 공사비를 뺀 현금으로 짓는다
    const afford = treasuryTight(w, c, kingdomById(w, c.kingdomId)) ? 0 : Math.floor((c.cash - committedCost(w, c)) / perLevel);
    let levels = Math.min(Math.ceil((n - supply) / m.outputs[g]!), MAX_LEVELS_PER_PROJECT, afford);
    // 행정청이 큰 지역부터, 땅과 일손이 되는 곳
    const regions = ownRegions(w, c).sort((x, y) => (where.get(y.id) ?? 0) - (where.get(x.id) ?? 0) || x.id - y.id);
    for (const r of regions) {
      const fit = Math.min(levels, Math.floor(roomFor(w, r.id, t.id)));
      if (fit < 1 || laborAvailability(w, r, m, fit, true) < MIN_STAFFING()) continue;
      const existing = ownBuildingAt(w, c.id, r.id, t.id, m.id);
      const err = existing
        ? applyCommand(w, c.id, { type: 'expand', buildingId: existing.id, levels: fit })
        : applyCommand(w, c.id, { type: 'build', typeId: t.id, regionId: r.id, methodId: m.id, levels: fit });
      if (!err) { aiTrace.on?.(w, c, 'govInputs', t.id, m.id, fit, o, r.id); toFront(w, c); o.add(m, fit, 1 + regionPerk(r.id, t.id), false, r.id); levels = 0; }
      break;
    }
  }
}

/**
 * 새 공사에 쓸 수 있는 돈: 현금 − 남길 돈 − 진행 중 공사에 더 들 돈 − 한 달 공사비.
 * 왕실은 국정 지출 TUNE.treasuryHighWeeks 주치를 남긴다 (학교·행정청·생산 건물 모두 그 위의 여윳돈으로만 짓는다)
 */
function freeCash(w: World, c: Company, costPerDay: number): number {
  const keep = c.state ? crownKeep(w, c, kingdomById(w, c.kingdomId)) : 0;
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
  if (treasuryTight(w, c, k) || k.budget.tax > TUNE.schoolTaxMax) return 0;
  let pending = 0;
  for (const x of w.constructions) {
    const m = getMethod(x.typeId, x.methodId);
    if (x.companyId === c.id && m.seats) pending += wageCostOf(m, c.stateWages ?? c.wages, c.state) * (x.levels ?? 1) * TICKS_PER_WEEK;
  }
  const keep = TUNE.crownGdpReserve > 0 ? crownKeep(w, c, k) / 2 + TUNE.treasuryLowWeeks * pending : TUNE.treasuryLowWeeks * ((k.expenseEma ?? 0) + pending);
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
function levelValue(w: World, c: Company, o: Outlook, b: Building, pointsPerDay: number, fill?: number): number {
  const m = getMethod(b.typeId, b.methodId);
  if (m.construction) {
    const perLevel = m.construction * b.utilization * efficiency(b);
    if (pointsPerDay - perLevel <= 0) return 1;
    return officeEmpty(b) >= 1 || officeSpare(w, c, pointsPerDay) > perLevel ? -1 : 1;
  }
  const r = regionById(w, b.regionId);
  if (m.seats) return schoolValuation(w, c, r, m, 1, schoolSeats(w, r.id) - m.seats).profit;
  // 무역소: 이 건물 전체 손익 − 한 레벨 적을 때의 손익
  if (b.typeId === TRADING_POST) return tradeValuation(w, c, r, m, b.level, b).profit - tradeValuation(w, c, r, m, b.level - 1, b).profit;
  return valueMethod(w, o, r, c, b.typeId, m, 1, true, fill).profit;
}

/**
 * 철거 판단 (짓기와 같은 주, 같은 전망): 마지막 레벨 손익이 TUNE.shrinkWeeks 주 연속 마이너스면 레벨의 1/4(최소 1)을 철거 대기에 올린다.
 * 건물이 적자를 유보 자산으로 메우는 동안은 세지 않는다 (유보 자산이 바닥나야 센다).
 * 건축사무소는 TUNE.officeShrinkWeeks 주를 보고, 그동안 한 번도 사람이 차지 않은 레벨(일하던 주의 최고 충원율 staffPeak 로 센다)과
 * 남는 포인트 몫(많아야 1/4) 중 큰 쪽을 헌다. 쉬다가 다시 뽑는 중이라 비어 있는 레벨은 헐지 않는다. 왕국의 마지막 사무소 레벨은 남긴다.
 * 손실 때문에 헐리는 중인 건물이 다시 이익을 내면 철거를 취소한다. 증설 공사 중인 건물은 보지 않는다
 */
function reviewLevels(w: World, c: Company, o: Outlook, pointsPerDay: number) {
  for (const b of w.buildings) {
    if (b.companyId !== c.id || BUILDING_BY_ID[b.typeId].auto) continue;
    if (w.constructions.some((k) => k.targetBuildingId === b.id)) { b.negWeeks = 0; delete b.staffPeak; continue; }
    // 굶는 건물은 지금 투입 충족으로 잰다 (장기 전망은 투입을 다 산다고 본다)
    const hungry = starving(b);
    const v = levelValue(w, c, o, b, pointsPerDay, hungry ? b.last.inputFill : undefined);
    if (b.shrinking) {
      if (v > 0 && !b.swap) b.shrinking = 0;
      delete b.staffPeak;
      continue;
    }
    b.swap = false;
    // 적자를 유보 자산으로 메우는 동안은 철거 주 수를 세지 않는다 (굶는 건물은 센다)
    const covered = b.profitEma < 0 && !!b.reserve && !hungry;
    b.negWeeks = v < 0 && !covered ? (b.negWeeks ?? 0) + 1 : 0;
    const m = getMethod(b.typeId, b.methodId);
    if (!m.construction) {
      if (b.negWeeks >= TUNE.shrinkWeeks) {
        const n = Math.max(1, Math.round(b.level * 0.25));
        if (!applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: n })) aiTrace.on?.(w, c, 'shrink', b.typeId, b.methodId, -n);
        b.negWeeks = 0;
      }
      continue;
    }
    if (b.negWeeks === 0) delete b.staffPeak;
    else if (!b.idle) b.staffPeak = Math.max(b.staffPeak ?? 0, b.last.staffing);
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
  if (!worst || cand.score <= Math.max(MIN_ROI(), worst.roi) * TUNE.swapMult) return;
  const n = Math.min(worst.b.level, cand.levels);
  if (!applyCommand(w, c.id, { type: 'demolish', buildingId: worst.b.id, levels: n })) { worst.b.swap = true; aiTrace.on?.(w, c, 'swap', worst.b.typeId, worst.b.methodId, -n); }
}

interface Pick { regionId: number; typeId: string; methodId: string; levels: number; score: number; fallback?: boolean }

/**
 * TUNE.expandUtilMin (0 = 끔): 왕국 안(왕실 + 민간 상회. 왕국마다 민간 상회는 하나라 회사로 나누면 왕실 건물만 빠진다) 같은 종류이고
 * 산출 상품이 겹치는 건물의 레벨 가중 가동률(꺼진 건물은 0)이 이 값 미만이거나 장기 손익(profitEma) 합이 음수이면, 그 방식은 새로 짓지도 늘리지도 않는다.
 * 그런 건물이 없으면 막지 않는다 (새 산업은 시작된다). 정부 건물(행정청·학교·사무소)은 손익으로 짓지 않으므로 보지 않는다. w.buildings 순서로 더한다 (결정성)
 */
function glutOf(w: World, kingdomId: number): (typeId: string, m: MethodDef) => boolean {
  const kingdomOf = new Map(w.companies.map((x) => [x.id, x.kingdomId] as const));
  const byType = new Map<string, Building[]>();
  for (const b of w.buildings) {
    if (kingdomOf.get(b.companyId) !== kingdomId || BUILDING_BY_ID[b.typeId].auto || isGovernment(b.typeId)) continue;
    const list = byType.get(b.typeId);
    if (list) list.push(b); else byType.set(b.typeId, [b]);
  }
  const memo = new Map<string, boolean>();
  return (typeId, m) => {
    // 무역소는 산출이 없고 금고가 찰 때까지 매출이 없어 손익으로 막지 않는다 (tradeValuation 이 지역 교역 수요로 본다)
    if (isGovernment(typeId) || typeId === TRADING_POST) return false;
    const key = `${typeId}|${m.id}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    const outs = GOOD_IDS.filter((g) => (m.outputs[g] ?? 0) > 0);
    let levels = 0, used = 0, profit = 0;
    for (const b of byType.get(typeId) ?? []) {
      const bm = getMethod(b.typeId, b.methodId);
      if (outs.length && !outs.some((g) => (bm.outputs[g] ?? 0) > 0)) continue;
      levels += b.level;
      used += (b.active ? b.utilization : 0) * b.level;
      profit += b.profitEma;
    }
    const glut = levels > 0 && (used / levels < TUNE.expandUtilMin || profit < 0);
    memo.set(key, glut);
    return glut;
  };
}

/**
 * 모든 후보를 같은 기준으로: 장기 손익 / 공사비. 수익률이 기준의 1.25배를 넘는 가장 큰 덩어리를 고른다.
 * allowLoss: 이익이 나는 후보가 없으면 수익률이 가장 높은(가장 덜 손해 보는) 후보를 가장 작은 덩어리로 고른다.
 * 학교는 schoolFree(schoolCash)로 짓고, 공사비 + 그 레벨 인건비 TUNE.treasuryLowWeeks 주치가 있어야 한다
 */
export function pickProject(w: World, c: Company, o: Outlook, free: number, allowLoss = false, blocked?: { best: Pick | null }, schoolFree = 0, dev = false): Pick | null {
  let best: Pick | null = null, least: Pick | null = null;
  // 발전 투자 대상: 잠재 수요(바꿀 수 있는 몫)가 있고 공급(공사 중 포함)이 지금 수요 + 잠재 수요에 못 미치는 상품
  const devGood = (g: GoodId) => o.latent[g] > 1e-6 && o.supply[g] < o.demand[g] + o.latent[g];
  const devOuts = (m: MethodDef) => GOOD_IDS.filter((g) => (m.outputs[g] ?? 0) > 0 && devGood(g));
  const pools = new Map<string, number>();
  // 지역 우선 투자 (민간): 그 지역 저택·금융가 금고(약정 뺀 돈). 좋아하지 않는 종류의 건물에는 TUNE.ownerTilt 배로 센다
  const local = new Map<number, Building[]>();
  const freeOf = new Map<number, number>();
  if (!c.state) for (const o of ownerBuildings(w, c.kingdomId)) {
    freeOf.set(o.id, Math.max(0, treasuryFree(w, o)));
    if (!local.has(o.regionId)) local.set(o.regionId, []);
    local.get(o.regionId)!.push(o);
  }
  const localFunds = (regionId: number, typeId: string) => (local.get(regionId) ?? []).reduce((a, o) => a + freeOf.get(o.id)! * (favours(o, typeId) ? 1 : TUNE.ownerTilt), 0);
  // TUNE.crownDebtNoBuild: 빚이 현금보다 많은 왕실은 생산 건물을 짓지 않는다 (정부 건물·학교는 그대로)
  const inDebt = c.state && !!TUNE.crownDebtNoBuild && c.debt > c.cash;
  // TUNE.expandUtilMin: 왕국 안 같은 종류·같은 산출 건물이 덜 돌거나 적자인 방식은 짓지도 늘리지도 않는다 (glutOf. 땅 바꾸기 후보도 뺀다)
  const glut = TUNE.expandUtilMin > 0 ? glutOf(w, c.kingdomId) : null;
  for (const r of ownRegions(w, c)) {
    for (const t of BUILDING_TYPES) {
      if (t.id === 'builder' || !canBuildType(c, t)) continue;
      if (inDebt && !isGovernment(t.id)) continue;
      if (dev && isGovernment(t.id)) continue;
      // 기상 조건이 걸린 땅에는 짓지 않는다 (줄어든 산출과 오른 값은 일시적이다)
      if (harvestFactor(w, r.id, t.land) < 1) continue;
      const room = roomFor(w, r.id, t.id);
      // 무역소는 공사비에 금고에 묶는 돈(레벨당 tradeEscrowPerLevel)을 더해 센다
      const perLevel = constructionEstimate(w, c, t.id).cost + (t.id === TRADING_POST ? tradeEscrowPerLevel() : 0);
      const budget = t.methods.some((m) => m.seats) ? schoolFree : free;
      if (!Number.isFinite(perLevel) || budget < perLevel) continue;
      const sibs = w.buildings.filter((b) => b.companyId === c.id && b.regionId === r.id && b.typeId === t.id);
      const existing = sibs[0];
      if (existing?.shrinking) continue;
      // 한 회사는 지역마다 종류마다 건물 하나라 그 방식으로만 늘린다. TUNE.aiMixedMethods: 그 건물이 (manageBuildings 에서) 더 나은 방식으로 바꾸지 못했으면,
      // 기본가로 가장 나은 방식을 옆에 새 건물로 공사 하나에 MIXED_LEVELS 레벨까지 짓는다
      const topBase = TUNE.aiMixedMethods && existing ? availableMethods(c, t.id).reduce<MethodDef | null>((x, m) => (!x || baseValue(m, c) > baseValue(x, c) ? m : x), null) : null;
      const newMethod = (m: MethodDef) => !!existing && !sibs.some((b) => b.methodId === m.id);
      const otherMethod = (m: MethodDef) => newMethod(m) && !(m === topBase && sibs.every((b) => baseValue(getMethod(b.typeId, b.methodId), c) * 1.05 < baseValue(m, c)));
      // 땅이 없으면 1레벨 기준 수익률만 재 둔다 (땅 바꾸기 후보). 매장량이 없는 것은 땅을 비워도 못 지으므로 뺀다
      if (room < 1) {
        if (!blocked || dev || (t.deposit && depositFree(w, r.id, t.deposit) < 1)) continue;
        for (const m of availableMethods(c, t.id)) {
          if (otherMethod(m) || glut?.(t.id, m)) continue;
          if (laborAvailability(w, r, m, 1, c.state, pools, c) < MIN_STAFFING()) continue;
          const e = m.seats ? schoolValuation(w, c, r, m, 1, schoolSeats(w, r.id)) : t.id === TRADING_POST ? tradeValuation(w, c, r, m, 1) : valueMethod(w, o, r, c, t.id, m, 1);
          const roi = (e.profit * TICKS_PER_YEAR) / perLevel;
          if (e.profit > 0 && roi > MIN_ROI() && (!blocked.best || roi > blocked.best.score)) blocked.best = { regionId: r.id, typeId: t.id, methodId: m.id, levels: 1, score: roi };
        }
        continue;
      }
      for (const m of availableMethods(c, t.id)) {
        if (otherMethod(m) || glut?.(t.id, m)) continue;
        const outs = dev ? devOuts(m) : [];
        if (dev && !outs.length) continue;
        const cap = newMethod(m) ? MIXED_LEVELS : Infinity;
        let choice: { levels: number; roi: number } | null = null, top: { levels: number; roi: number } | null = null;
        for (const levels of CHUNKS) {
          if (levels > room || levels > cap || budget < perLevel * levels) continue;
          if (m.seats && budget < (perLevel + wageCostOf(m, c.stateWages ?? c.wages, c.state) * TICKS_PER_WEEK * TUNE.treasuryLowWeeks) * levels) continue;
          // 발전 투자: 공급(공사 중 포함) + 이 공사의 산출이 지금 수요 + 잠재 수요를 넘는 덩어리는 짓지 않는다
          if (dev && outs.some((g) => o.supply[g] + (m.outputs[g] ?? 0) * levels * (1 + regionPerk(r.id, t.id)) > o.demand[g] + o.latent[g])) continue;
          const e = m.seats ? schoolValuation(w, c, r, m, levels, schoolSeats(w, r.id)) : t.id === TRADING_POST ? tradeValuation(w, c, r, m, levels) : valueMethod(w, o, r, c, t.id, m, levels, false, undefined, dev);
          if (laborAvailability(w, r, m, levels, c.state, pools, c) < MIN_STAFFING()) continue;
          const roi = (e.profit * TICKS_PER_YEAR) / (perLevel * levels);
          // 발전 투자: 잠재 수요까지 센 손익이 −인건비 × TUNE.devLoss 이상인 가장 큰 덩어리
          if (dev) {
            if (e.profit >= -TUNE.devLoss * e.wageCost && !choice) choice = { levels, roi };
            continue;
          }
          if (allowLoss && levels === CHUNKS[CHUNKS.length - 1] && e.profit >= -TUNE.lossTolerance * e.wageCost) {
            const s = roi + Math.abs(roi) * (rand(w) - 0.5) * 0.3;
            if (!least || s > least.score) least = { regionId: r.id, typeId: t.id, methodId: m.id, levels, score: s, fallback: true };
          }
          if (e.profit <= 0) continue;
          if (roi <= MIN_ROI()) continue;
          if (!top || roi > top.roi) top = { levels, roi };
          if (!choice && roi > MIN_ROI() * 1.25) choice = { levels, roi };
        }
        const pick = choice ?? top;
        if (!pick) continue;
        // 지역 우선 투자: 그 지역 저택·금융가 돈으로 짓는 몫만큼 가산점
        const here = c.state ? 0 : Math.min(1, localFunds(r.id, t.id) / (perLevel * pick.levels));
        const score = pick.roi * (0.85 + rand(w) * 0.3) * (1 + TUNE.localBias * here);
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

