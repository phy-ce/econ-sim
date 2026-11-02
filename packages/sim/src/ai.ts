import { BUILDING_BY_ID, buildPointsOf, BUILDING_TYPES, EDUCATION_FLOOR, EDUCATION_RANGE, GOOD_IDS, GOODS, SKILL_DEFS, TECH_BY_ID, TICKS_PER_WEEK, TICKS_PER_YEAR, TRADING_POST, TUNE, getMethod, regionPerk, tradeEscrowPerLevel, tradeReserveOf } from './data';
import { withEstimateCache, regionAvgWealth, regionPopulation, wageCostOf,
  availableMethods, ownBuildingAt, builderOf, canBuildType, disbanded, kingdomGdp, paysDividend, paysShare, companyById, constructionEstimate, creditLimit, depositFree, efficiency, estimateMethod, harvestFactor, hasBuilder, isGovernment, regionById, wagesAt, researchableTechs, roomFor, sellsShares, slots, mainOutput, projectedSD, currentSD,
  FLOW_ZERO, harvestFactorEma, priceBounds, priceFormula, shareWage,
} from './economy';
import { BY_EMA } from './market';
import { MAX_CONCURRENT_CONSTRUCTIONS, MAX_LEVELS_PER_PROJECT, applyCommand } from './commands';
import { applyStateWages, budgetMult, committedCost, favours, funderWeight, hasReserve, lawRevenue, ownerBuildings, ownerFunds, reserveCap, reserveOf, taxRates, treasuryFree } from './finance';
import { privatizeLevel } from './production';
import { policyStatus } from './policy';
import { WAGE_LADDER, subsistenceWage } from './labor';
import { baseValue, longRunWages, marketOutlook, techValue, valueMethod } from './outlook';
import type { Outlook } from './outlook';
import { kingdomById, toTreasury } from './kingdoms';
import { STAFFING_HORIZON, expectedStaffing, labourPool, laborAvailability, takeFromPool } from './staffing';
import { LITERACY_PER_WEALTH, workforce } from './pops';
import { clamp } from './rng';
import { aiRand, keyCompany, keyIdx, keyRegion, keyStr, keyWeek } from './rng/aiRand';
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
/** TUNE.aiAdminWage: 왕실 행정청의 레벨 가중 충원율이 이 값 아래면 일손이 모자란 것으로 본다 (근거 없음) */
export const ADMIN_STAFFED = 0.9;

/** 징수율 하한 (TUNE.aiAdminFloor > 0, 오버홀 07 A4): 그 왕국 징수율(taxRatio)이 하한 아래인가 */
function belowAdminFloor(k: Kingdom | undefined): boolean {
  return TUNE.aiAdminFloor > 0 && !!k && (k.taxRatio ?? 1) < TUNE.aiAdminFloor;
}

/** 왕실 건축사무소(켜진 건물, 해산한 사무소 제외)의 가동 레벨 가중 충원율. 사무소가 없으면 1 (TUNE.aiAdminWage 2) */
function officeStaffing(w: World, c: Company): number {
  let st = 0, lv = 0;
  for (const b of w.buildings) {
    if (b.companyId !== c.id || !b.active || disbanded(b) || !getMethod(b.typeId, b.methodId).construction) continue;
    const n = b.level * b.utilization;
    st += b.last.staffing * n; lv += n;
  }
  return lv > 0 ? st / lv : 1;
}

/** 왕실 행정청(징세 한도가 있는 방식, 켜진 건물)의 레벨 가중 충원율. 행정청이 없으면 1 */
function adminStaffing(w: World, c: Company): number {
  let st = 0, lv = 0;
  for (const b of w.buildings) {
    if (b.companyId !== c.id || !b.active || !getMethod(b.typeId, b.methodId).taxCapacity) continue;
    st += b.last.staffing * b.level; lv += b.level;
  }
  return lv > 0 ? st / lv : 1;
}

/**
 * 진단용 (cli/builddiag.ts): AI가 공사를 넣고(levels > 0), 헐고(< 0), 방식을 바꿀 때 그 길(path)과 함께 부른다.
 * path: pick 보통 후보, loss 손해 후보(allowLoss), govInputs 왕실 원료 확보, office 건축사무소, shrink 철거, swap 땅 바꾸기 철거, switchIn·switchOut 방식 바꾸기,
 * reserve 유보 자산이 찬 건물 증설, reserveShrink 유보 자산이 바닥난 적자 건물 철거, trial 새 투자 1레벨 (TUNE.aiReserveRule).
 * 시뮬레이션 상태를 바꾸지 않는다 (비어 있으면 아무것도 하지 않는다)
 */
export const aiTrace: { on?: (w: World, c: Company, path: string, typeId: string, methodId: string, levels: number, o?: Outlook, regionId?: number) => void } = {};

export function runAi(w: World) {
  if (!w.config.ai) return;
  if (TUNE.aiReserveRule) countHotPrices(w);
  if (TUNE.aiReserveRule && (TUNE.aiCutSD > 0 || TUNE.aiDemoSD > 0)) sdExit(w);
  if (TUNE.aiReserveRule && TUNE.aiSellDemoSD > 0) sellDemo(w);
  if (TUNE.aiReserveRule && TUNE.aiMarginal >= 2) marginExit(w);
  const outlook = marketOutlook(w);
  // 이번 주 방식 바꾸기가 함께 쓰는 일손 곳간 (지역, 직종): 한 건물이 바꾸며 더 뽑을 사람을 빼 두어, 같은 사람을 여러 건물이 세지 않는다
  const switchPools = new Map<string, number>();
  const spare = TUNE.aiSwitchV2 ? switchSpare(w, outlook) : ({} as Record<GoodId, number>);
  for (const c of w.companies) {
    if (c.isPlayer) continue;
    // 왕실은 세법과 정책 단계(정부 건물의 국영 임금 포함)를 정한다. 생산 건물 임금은 민간과 왕실 모두 같은 규칙으로 정한다
    if (c.state) { chooseTaxLaw(w, c); adjustBudget(w, c); }
    // TUNE.aiStatePremium: 왕실은 정부 건물 일손이 모자라는 지역에 국영 임금 웃돈을 얹는다 (adjustStatePremium)
    if (c.state && TUNE.aiStatePremium && TUNE.wageMarket) adjustStatePremium(w, c);
    // TUNE.wageMarket = 1: 임금은 지역 시장 임금이 정한다 (labor.ts updateMarketWages). AI 는 자리(가동률·증설·철거)만 정한다.
    // TUNE.aiWagePremium: 민간 상회는 사람이 빠지는 지역에 웃돈을 얹는다 (adjustPremium)
    if (!TUNE.wageMarket) adjustWages(w, c);
    else if (TUNE.aiWagePremium && !c.state) adjustPremium(w, c);
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
  // 사무소가 주는 임금: 국영 임금 (TUNE.wageMarket = 1 이면 그 지역 국영 임금)
  const mine = TUNE.wageMarket ? (r.stateWages ?? c.stateWages ?? c.wages) : (c.stateWages ?? c.wages);
  let best = Infinity;
  for (const s of SKILLS) {
    const per = m.workers[s] ?? 0;
    if (!(per > 0) || paysDividend(true, s)) continue;
    let n = labourPool(w, r, s);
    for (const p of w.pops) {
      if (p.regionId !== r.id || p.prof !== s || p.work === 0) continue;
      const b = byId.get(p.work);
      const o = b && !paysShare(b, s) ? companyById(w, b.companyId) : undefined;
      if (o && b && wagesAt(o, b.typeId, w, b.regionId)[s] * TUNE.switchPremium < mine[s]) n += workforce(p) * reach;
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

/** TUNE.aiWagePremium: 웃돈을 한 주에 움직이는 최대 폭 (시장 임금 대비 비율). 근거: DESIGN 11 aiWagePremium */
export const PREMIUM_STEP = 0.1;
/** TUNE.aiWagePremium: 웃돈 상한 (플레이어 웃돈 손잡이 setWageOffset 의 위 끝과 같다). AI 는 웃돈만 얹으므로 아래 끝은 0 */
export const PREMIUM_MAX = 1;

/**
 * 민간 AI 상회의 지역 웃돈 (TUNE.aiWagePremium, 매주, TUNE.wageMarket = 1 일 때). 지역마다 그 상회 생산 건물(정부·소유·소작 건물 제외)을 보고, 직종마다:
 * - 목표 = 바깥 소득 × switchPremium ÷ 시장 임금 − 1 (0~PREMIUM_MAX). 바깥 소득: 노동자·농부는 그 지역 소작 1인 소득, 위 직종은 한 칸 아래 직종(WAGE_LADDER)이
 *   이 상회 그 지역에서 받는 임금 (사람이 옮겨 오려면 지금 소득의 switchPremium 배를 넘어야 한다: labor.ts switchShare)
 * - 그 지역 이익(profitEma 합)이 0 이하면 PREMIUM_STEP 만큼 내린다 (0까지)
 * - 웃돈이 목표보다 크면 (시장 임금이 따라왔거나 소작 소득이 내렸다) 목표까지 PREMIUM_STEP 씩 내린다
 * - 빈자리가 있고 지난 점검보다 고용이 줄었거나 빈자리가 늘었으면 (사람이 빠진다) 목표까지 PREMIUM_STEP 씩 올린다. 그 밖에는 그대로
 * 그 지역 이 상회 임금 = 시장 임금 × (1 + 웃돈) (economy.ts wagesAt). 시장 임금 규칙(labor.ts updateMarketWages)은 바뀌지 않는다
 */
function adjustPremium(w: World, c: Company) {
  const byRegion = new Map<number, Building[]>();
  for (const b of w.buildings) {
    if (b.companyId !== c.id || b.level <= 0) continue;
    const def = BUILDING_BY_ID[b.typeId];
    if (def.auto || def.ownership || isGovernment(b.typeId)) continue;
    const list = byRegion.get(b.regionId);
    if (list) list.push(b); else byRegion.set(b.regionId, [b]);
  }
  const prev = c.aiPremium ?? {};
  const next: NonNullable<Company['aiPremium']> = {};
  for (const rid of [...byRegion.keys()].sort((a, b) => a - b)) {
    const r = regionById(w, rid);
    const market = r.wages;
    if (!market) continue;
    const old = prev[rid];
    const off = old ? { ...old.off } : emptyRecord();
    const emp = emptyRecord(), vac = emptyRecord();
    let profit = 0;
    for (const b of byRegion.get(rid)!) {
      profit += b.profitEma;
      for (const s of SKILLS) {
        if (paysShare(b, s)) continue;
        emp[s] += b.employed[s];
        vac[s] += Math.max(0, slots(b, s) - b.employed[s]);
      }
    }
    const tenant = subsistenceWage(w, r);
    const paid = {} as Record<Skill, number>;
    for (const s of SKILLS) {
      const below = WAGE_LADDER[s];
      const outside = below ? paid[below] : tenant;
      const target = market[s] > 0 ? clamp((outside * TUNE.switchPremium) / market[s] - 1, 0, PREMIUM_MAX) : 0;
      const leaving = vac[s] > 1e-6 && !!old && (emp[s] < old.emp[s] - 1e-6 || vac[s] > old.vac[s] + 1e-6);
      if (profit <= 0) off[s] = Math.max(0, off[s] - PREMIUM_STEP);
      else if (off[s] > target) off[s] = Math.max(target, off[s] - PREMIUM_STEP);
      else if (leaving) off[s] = Math.min(target, off[s] + PREMIUM_STEP);
      paid[s] = market[s] * (1 + off[s]);
    }
    next[rid] = { off, emp, vac };
  }
  c.aiPremium = next;
}

/** TUNE.aiStatePremium: 일손이 모자란 정부 건물이 데려올 때 맞추는 국영 임금 ÷ 바깥 소득. switchPremium(1.1)보다 커야 사람이 옮겨 온다 (1.25 면 하루 1.25%, labor.ts switchShare). 근거 없음 */
export const STATE_HIRE_PULL = 1.25;

/**
 * AI 왕실의 국영 건물 지역 웃돈 (TUNE.aiStatePremium, 매주, TUNE.wageMarket = 1). 지역마다 그 왕실의 정부 건물(행정청·건축사무소·학교: 켜져 있고 해산하지 않은 것)을 보고, 직종마다:
 * - 바깥 소득 = 그 지역 시장 임금과 다음 중 큰 쪽: 노동자·농부는 소작 1인 소득, 하급 귀족은 그 지역 저택의 하급 귀족 1인 몫 (economy.ts shareWage). TUNE.manorShares 이면 저택 자리 소득이 0 이라 시장 임금이다.
 *   (TUNE.manorShares 0 일 때: 세습 관료제 행정청의 하급 귀족은 저택 몫과 비교해 떠난다: 저택 이익이 오르면 1년차에 국영 임금의 1.5~3배가 된다 (10년 × 시드 1·2, main b1bd1fa, HANDOFF 0-1102e))
 * - 그 직종 충원율(고용 ÷ 자리)이 ADMIN_STAFFED 아래면 웃돈을 데려올 목표(바깥 소득 × STATE_HIRE_PULL ÷ 웃돈 전 국영 임금 − 1)까지 바로 올린다
 * - 차 있으면 지킬 목표(바깥 소득 ÷ 웃돈 전 국영 임금 − 1: 사람은 바깥 소득이 지금 소득의 switchPremium 배를 넘어야 떠난다)까지 PREMIUM_STEP 씩 내린다
 * - 두 목표 모두 0 ~ TUNE.aiStatePremium (이 값이 웃돈 상한이다). 웃돈 전 국영 임금 = 시장 임금 × 단계 배율
 * 정부 건물이 없는 지역의 웃돈은 지운다. 바꾼 웃돈은 바로 그 왕국 국영 임금에 넣는다 (finance.ts applyStateWages)
 */
function adjustStatePremium(w: World, c: Company) {
  const k = w.kingdoms.find((x) => x.governmentId === c.id);
  if (!k) return;
  const emp = new Map<number, Record<Skill, number>>(), cap = new Map<number, Record<Skill, number>>();
  for (const b of w.buildings) {
    if (b.companyId !== c.id || b.level <= 0 || !b.active || disbanded(b) || !isGovernment(b.typeId)) continue;
    let e = emp.get(b.regionId), n = cap.get(b.regionId);
    if (!e || !n) { emp.set(b.regionId, (e = emptyRecord())); cap.set(b.regionId, (n = emptyRecord())); }
    for (const s of SKILLS) { const sl = slots(b, s); if (sl > 0) { n[s] += sl; e[s] += b.employed[s]; } }
  }
  const mult = budgetMult(k, 'wages');
  const prev = c.statePremium ?? {};
  const next: Record<number, Record<Skill, number>> = {};
  for (const rid of [...cap.keys()].sort((a, b) => a - b)) {
    const r = regionById(w, rid);
    const market = r.wages;
    if (!market) continue;
    const off = prev[rid] ? { ...prev[rid] } : emptyRecord();
    const e = emp.get(rid)!, n = cap.get(rid)!;
    let tenant = -1, manor: Building | undefined | null = null;
    for (const s of SKILLS) {
      if (!(n[s] > 0)) { off[s] = 0; continue; }
      let outside = market[s];
      if (isLowerJob(s)) { if (tenant < 0) tenant = subsistenceWage(w, r); outside = Math.max(outside, tenant); }
      else if (s === 'gentry') {
        if (manor === null) manor = w.buildings.find((x) => x.regionId === rid && x.typeId === 'manor');
        if (manor) outside = Math.max(outside, shareWage(manor, 'gentry'));
      }
      const base = market[s] * mult;
      if (!(base > 0)) { off[s] = 0; continue; }
      // 모자라면 바로 데려올 목표로 (바깥 소득 × STATE_HIRE_PULL), 차 있으면 지킬 목표(바깥 소득과 같은 국영 임금)까지 PREMIUM_STEP 씩 내린다
      const hire = clamp((outside * STATE_HIRE_PULL) / base - 1, 0, TUNE.aiStatePremium);
      const keep = clamp(outside / base - 1, 0, TUNE.aiStatePremium);
      if (e[s] / n[s] < ADMIN_STAFFED) off[s] = Math.max(off[s], hire);
      else if (off[s] > keep) off[s] = Math.max(keep, off[s] - PREMIUM_STEP);
    }
    if (SKILLS.some((s) => off[s] > 0)) next[rid] = off;
  }
  c.statePremium = next;
  applyStateWages(w, k);
}

function emptyRecord(): Record<Skill, number> {
  const o = {} as Record<Skill, number>;
  for (const s of SKILLS) o[s] = 0;
  return o;
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
 * - 행정청 일손 (TUNE.aiAdminWage, 오버홀 07 A4): 1 이면 징수율이 TUNE.aiAdminFloor 아래인 동안 국영 임금을 내리지 않고, 행정청 충원율이 ADMIN_STAFFED 아래면
 *   그 점검에서는 다른 손잡이보다 먼저 국영 임금을 한 칸 올린다 (5까지). 행정청 일꾼은 국영 임금을 받으므로, 국고가 조일 때 임금을 깎으면 징수율이 더 떨어진다.
 *   2 이면 징수율과 상관없이 행정청과 건축사무소 충원율 중 낮은 쪽이 ADMIN_STAFFED 아래인 동안 같은 일을 한다 (wt-wagelag A2)
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
  // TUNE.aiAdminWage 1: 징수율이 하한 아래면 국영 임금을 내리지 않는다 (cut = false). 2: 행정청·건축사무소 충원율 중 낮은 쪽이 ADMIN_STAFFED 아래면
  const short = TUNE.aiAdminWage === 2 ? Math.min(adminStaffing(w, c), officeStaffing(w, c)) < ADMIN_STAFFED : false;
  const guard = TUNE.aiAdminWage === 2 ? short : !!TUNE.aiAdminWage && belowAdminFloor(k);
  const cut = !guard;
  if (guard && b.wages < BUDGET_STEPS && (TUNE.aiAdminWage === 2 || adminStaffing(w, c) < ADMIN_STAFFED)) {
    step = ['wages', b.wages + 1];
  } else if (treasuryTight(w, c, k)) {
    if (losing && !cutWelfare(w, c, k)) {
      if (b.wages > 3 && cut) step = ['wages', b.wages - 1];
      else if (b.tax < BUDGET_STEPS) step = ['tax', b.tax + 1];
      else if (b.wages > 1 && cut) step = ['wages', b.wages - 1];
      else if (c.debt > 0) shrinkSchools(w, c);
    }
  } else if (!losing) {
    const rich = treasuryRich(w, c, k);
    if (b.wages > 3 && (k.wageIndex ?? 1) > 1 && cut) step = ['wages', b.wages - 1];
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

/** 왕국에서 소작농을 뺀 1인당 하루 소득 (incomeEma 합 ÷ 인원 합) */
function perCapitaIncome(w: World, kingdomId: number): number {
  let inc = 0, n = 0;
  for (const p of w.pops) {
    if (p.prof === 'peasant' || p.size <= 0 || regionById(w, p.regionId).kingdomId !== kingdomId) continue;
    inc += Math.max(0, p.incomeEma); n += p.size;
  }
  return n > 0 ? inc / n : 0;
}

/** 세법 (AI 왕국, 4주마다): 지금 세금 수준으로 두 세법이 걷을 세금(lawRevenue)을 비교해 더 걷히는 쪽으로 바꾼다 */
function chooseTaxLaw(w: World, c: Company) {
  const k = w.kingdoms.find((x) => x.governmentId === c.id);
  if (!k || w.tick % (TICKS_PER_WEEK * 4) !== 0) return;
  // 바꾸기가 끝날 때 실패했으면 LAW_COOLDOWN 동안 그 법은 다시 시작하지 않는다
  const failed = (kind: 'tax' | 'invest') => k.lawFail?.[kind] != null && w.tick - k.lawFail[kind]! < LAW_COOLDOWN;
  const st = policyStatus(w, k.id);
  // 기술로 열리고 조건이 맞는 세법 중 예상 세입이 가장 큰 것이 지금의 LAW_SWITCH 배를 넘으면 바꾸기 시작한다
  if (!k.lawChange?.tax && !(k.lawTick != null && w.tick - k.lawTick < LAW_COOLDOWN) && !failed('tax')) {
    // TUNE.pollTaxIncomeCap: 인두세가 1인당 소득의 그 비율을 넘는 세법은 고르지 않고, 지금 그 세법이면 세입을 0으로 본다 (저축에서 걷히지 않게)
    const tooHeavy = (law: TaxLaw) => TUNE.pollTaxIncomeCap > 0 && taxRates(k, law).poll > TUNE.pollTaxIncomeCap * perCapitaIncome(w, k.id);
    let best: TaxLaw = k.taxLaw, top = tooHeavy(k.taxLaw) ? 0 : lawRevenue(w, k, k.taxLaw) * LAW_SWITCH;
    for (const o of st.tax.options) {
      if (!o.eligible || o.id === k.taxLaw || tooHeavy(o.id)) continue;
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
  const wageCost = wageCostOf(m, longRunWages(c, TRADING_POST, w, r), c.state) * levels;
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
    const wages = wagesAt(c, b.typeId, w, b.regionId);
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
              revenue += out * perk * o.price(g, dS, 0, true, b.regionId) * o.sellRate(g, dS, b.regionId);
            }
            if (inp) inputCost += inp * o.price(g, 0, (inp - (cur.inputs[g] ?? 0)) * b.level, false, b.regionId);
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
          o.add(best, b.level, perk, true, b.regionId); o.add(cur, -b.level, perk, true, b.regionId);
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
      if (current.margin > 0.05 && inputsAvailable(w, cur, b.level, b) && !sdHold(w, b)) {
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
      aiTrace.on?.(w, c, 'lossCut', b.typeId, b.methodId, 0, undefined, b.regionId);
    } else if (b.utilization < 1 && current.margin > 0 && !(TUNE.starveWeeks > 0 && b.last.inputFill < RAISE_FILL) && !sdHold(w, b)) {
      applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: b.utilization + 0.1 });
      aiTrace.on?.(w, c, 'utilUp', b.typeId, b.methodId, 0, undefined, b.regionId);
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
    // 점수 흔들기는 (회사, 기술, 주) 키의 AI 난수 (rng/aiRand.ts: 다른 명령이 난수를 밀지 않는다), 폭 1 ± AI_JITTER
    const ranked = researchableTechs(c).map((id) => ({ id, s: ((deep(id) + 1) / TECH_BY_ID[id].cost) * (1 - AI_JITTER + aiRand(w, 'research', keyCompany(c.id), keyStr(id), keyWeek(w.tick)) * 2 * AI_JITTER) })).sort((a, b) => b.s - a.s);
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
  // 사무소는 수수료로 운영비를 벌지만 남는 능력에도 임금은 내고(포인트당 수수료가 오른다) 증설비는 국고가 내므로, 국고가 넉넉할 때(지출 TUNE.treasuryHighWeeks 주치 초과, 빚 없음)만 늘린다.
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
  if (!TUNE.aiReserveRule && TUNE.aiBuildNow && TUNE.devShare > 0 && TUNE.devShare < 1 && canStart()) {
    const room = (TUNE.devShare * (c.startCost ?? 0) - (c.devCost ?? 0)) / (1 - TUNE.devShare);
    const budget = Math.min(free(), room);
    const pick = budget > 0 ? pickProject(w, c, o, budget, false, undefined, 0, true, 0) : null;
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
    const pick = pickProject(w, c, o, cash, fallbacks < TUNE.lossBuildsPerWeek, out, school, false, started);
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
  if (TUNE.aiReserveRule) {
    planTrials(w, c, canStart, free, start);
    reserveLevels(w, c, canStart, free, start);
  }
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
    // TUNE.aiReserveRule: 생산 건물은 유보 자산으로 늘리고 줄인다 (reserveLevels)
    if (reserveRuled(b)) continue;
    if (w.constructions.some((k) => k.targetBuildingId === b.id)) { b.negWeeks = 0; delete b.staffPeak; continue; }
    // 굶는 건물은 지금 투입 충족으로 잰다 (장기 전망은 투입을 다 산다고 본다)
    const hungry = starving(b);
    // 징수율 하한 (TUNE.aiAdminFloor, 오버홀 07 A4): 왕국 징수율이 하한 아래인 동안 행정청은 헐지 않는다 (적자 주를 세지 않고, 올려 둔 철거 대기를 거둔다)
    if (c.state && getMethod(b.typeId, b.methodId).taxCapacity && belowAdminFloor(w.kingdoms.find((x) => x.id === regionById(w, b.regionId).kingdomId))) {
      if (b.shrinking && !b.swap) b.shrinking = 0;
      b.negWeeks = 0;
      continue;
    }
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

// ---------------------------------------------------------------- 유보 기준 증설·철거와 새 투자 (TUNE.aiReserveRule, 2026-10-25)
//
// 사용자 요청 (2026-10-25): "유보액을 기준으로 건물을 늘리고 줄였으면 좋겠는데. + 신규투자". AI가 시장을 전망하지 않고, 건물의 유보 자산과 지금 시장 신호만 본다.
// - 생산 건물 (자동·정부 건물·무역소가 아니고 유보 자산을 쌓는 건물): 매주 확률 TUNE.reserveGrowMax × clamp((유보 ÷ 상한 − TUNE.reserveGrowFrom) ÷ (1 − TUNE.reserveGrowFrom))로 1레벨 증설
//   (확률은 AI 난수 aiRand 'grow'. reserveGrowMax 0 이면 유보 자산 ≥ 상한 × RESERVE_FULL 이 RESERVE_STREAK 주 이어질 때),
//   유보 자산 0이고 주간 손익 < 0 이 TUNE.reserveShrinkWeeks 주 이어지면 1레벨 철거 (마지막 레벨이면 건물이 없어진다). 그 밖에는 아무것도 하지 않는다.
// - 새 투자: 그 상품을 내는 건물이 없는 곳에 1레벨 시험 공사. (가) 지역 시장값 ≥ 기본가 × TRIAL_PRICE 가 RESERVE_STREAK 주 이어진 상품 (그 지역에 생산 건물이 없을 때),
//   (나) 투입 충족 < STARVE_FILL 이 RESERVE_STREAK 주 이어진 건물(Building.starvedWeeks)의 가장 모자란 투입재 (그 왕국에 생산 건물이 없을 때. 광석 → 철 → 공구 사슬을 연다).
//   다 지은 뒤에는 위 증설·철거 규칙이 맡는다. 방식 바꾸기는 그대로다 (manageBuildings)
/** AI 점수 흔들기 폭: 연구·착공 점수에 1 ± 이 값의 고른 무작위를 곱한다 (0.85~1.15, 첫 커밋 9c76862 부터의 값, 근거 없음) */
export const AI_JITTER = 0.15;
/** 유보 자산이 이 비율 이상이면 찬 주로 센다 (사용자 합의 값, 근거 없음) */
export const RESERVE_FULL = 0.9;
/** 찬 주·바닥난 적자 주·비싼 주·굶은 주를 이 주 수 이어서 본다 (사용자 합의 값, 근거 없음) */
export const RESERVE_STREAK = 4;
/** 새 투자 (가): 지역 시장값이 기본가의 이 배수 이상 (사용자 합의 값, 근거 없음) */
export const TRIAL_PRICE = 1.25;

/** TUNE.aiReserveRule 로 늘리고 줄이는 건물: 자동·정부 건물(행정청·학교·사무소)·무역소가 아니고 유보 자산을 쌓는 생산 건물 */
export function reserveRuled(b: Building): boolean {
  if (!TUNE.aiReserveRule || BUILDING_BY_ID[b.typeId].auto || isGovernment(b.typeId) || b.typeId === TRADING_POST) return false;
  return hasReserve(b) && reserveCap(b) > 0;
}

/** 지역마다 상품 값이 기본가 × TRIAL_PRICE 이상인 연속 주 수 (Region.hotWeeks, 매주 runAi 앞에서 한 번) */
function countHotPrices(w: World) {
  for (const r of w.regions) {
    const hot: Partial<Record<GoodId, number>> = {};
    for (const g of GOOD_IDS) if (r.market[g].price >= GOODS[g].basePrice * TRIAL_PRICE) hot[g] = (r.hotWeeks?.[g] ?? 0) + 1;
    if (Object.keys(hot).length) r.hotWeeks = hot; else delete r.hotWeeks;
  }
}

/** 상품 g 를 내는 건물(자동 건물 제외, 지금 방식 기준)이나 공사가 regionIds 안에 있는가 */
function makes(w: World, regionIds: Set<number>, g: GoodId): boolean {
  for (const b of w.buildings) if (b.level > 0 && regionIds.has(b.regionId) && !BUILDING_BY_ID[b.typeId].auto && (getMethod(b.typeId, b.methodId).outputs[g] ?? 0) > 0) return true;
  for (const k of w.constructions) if (regionIds.has(k.regionId) && (getMethod(k.typeId, k.methodId).outputs[g] ?? 0) > 0) return true;
  return false;
}

/**
 * 새 투자 (TUNE.aiReserveRule): (가) 자기 지역에서 값이 RESERVE_STREAK 주 기본가 × TRIAL_PRICE 이상이고 그 지역에 생산 건물이 없는 상품,
 * (나) 왕국 안에서 굶는 건물(투입 충족 < STARVE_FILL 이 RESERVE_STREAK 주)의 가장 모자란 투입재(그 지역 공급 ÷ 수요 이동평균이 가장 작은 것)이고 왕국에 생산 건물이 없는 상품.
 * 상품마다 1레벨을 짓는다: (가)는 그 지역, (나)는 굶는 건물의 지역부터 자기 지역 id 순. 그 상품을 내는 방식 중 기술·땅(매장량)·일손({@link MIN_STAFFING})이 되고
 * 회사에 그 종류 건물이 그 지역에 없는 것에서 지금 시장값 하루 손익(estimateMethod)이 가장 큰 것. 주에 TUNE.startsPerWeek 건까지
 */
function planTrials(w: World, c: Company, canStart: () => boolean, free: () => number, start: (p: Pick, path: string) => boolean) {
  if (c.state && TUNE.crownDebtNoBuild && c.debt > c.cash) return;
  const own = ownRegions(w, c);
  const kingdom = new Set(own.map((r) => r.id));
  const wants: { g: GoodId; regions: Region[] }[] = [];
  const seen = new Set<GoodId>();
  for (const r of own) for (const g of GOOD_IDS) {
    if ((r.hotWeeks?.[g] ?? 0) < RESERVE_STREAK || seen.has(g) || makes(w, new Set([r.id]), g)) continue;
    seen.add(g); wants.push({ g, regions: [r] });
  }
  for (const b of w.buildings) {
    if (!kingdom.has(b.regionId) || (b.starvedWeeks ?? 0) < RESERVE_STREAK) continue;
    const mk = regionById(w, b.regionId).market;
    let short: GoodId | null = null, low = Infinity;
    for (const g of GOOD_IDS) {
      if (!((getMethod(b.typeId, b.methodId).inputs[g] ?? 0) > 0)) continue;
      const ratio = mk[g].supplyEma / Math.max(1e-9, mk[g].demandEma);
      if (ratio < low) { low = ratio; short = g; }
    }
    if (!short || seen.has(short) || makes(w, kingdom, short)) continue;
    seen.add(short);
    wants.push({ g: short, regions: [regionById(w, b.regionId), ...own.filter((r) => r.id !== b.regionId)] });
  }
  let started = 0;
  const pools = new Map<string, number>();
  for (const { g, regions } of wants) {
    if (started >= TUNE.startsPerWeek || !canStart()) break;
    let best: Pick | null = null;
    for (const r of regions) {
      for (const t of BUILDING_TYPES) {
        if (!canBuildType(c, t) || isGovernment(t.id) || t.id === TRADING_POST) continue;
        if (harvestFactor(w, r.id, t.land) < 1 || roomFor(w, r.id, t.id) < 1) continue;
        if (w.buildings.some((x) => x.companyId === c.id && x.regionId === r.id && x.typeId === t.id)) continue;
        const cost = constructionEstimate(w, c, t.id).cost;
        if (!Number.isFinite(cost) || free() < cost) continue;
        for (const m of availableMethods(c, t.id)) {
          if (!((m.outputs[g] ?? 0) > 0) || laborAvailability(w, r, m, 1, c.state, pools, c) < MIN_STAFFING()) continue;
          const v = estimateMethod(w, r.id, t.id, m.id, wagesAt(c, t.id, w, r.id), c.state).profit;
          if (!best || v > best.score) best = { regionId: r.id, typeId: t.id, methodId: m.id, levels: 1, score: v };
        }
      }
      if (best) break;
    }
    if (best && start(best, 'trial')) started++;
  }
}

/**
 * 유보 기준 증설·철거 (TUNE.aiReserveRule, 매주 배당 정산 뒤): 생산 건물마다 찬 주(유보 자산 ≥ 상한 × RESERVE_FULL)와
 * 바닥난 적자 주(유보 자산 0, 주간 손익 = profitEma × 7 < 0. 기상 조건이 걸린 주와 공사로 생긴 지(시작 건물은 0일부터) RAMP_WEEKS 주 안은 세지 않는다)를 센다.
 * 바닥난 적자가 TUNE.reserveShrinkWeeks 주면 1레벨 철거 대기, 증설 확률(TUNE.reserveGrowMax > 0, 아래)이 뽑히면 (reserveGrowMax 0 이면 찬 주가 RESERVE_STREAK 주면) 땅(매장량)이 있고 돈이 되면 1레벨 증설 (못 하면 다음 주에 다시 본다).
 * TUNE.aiGlutSD > 0 이면 증설 확률이 뽑혀도 그 지역 그 산출 상품의 예상 공급 ÷ 수요(projectedSD)가 그 값을 넘으면 그 주는 증설하지 않는다 (오버홀 03 5-1).
 * 증설 공사 중이거나 철거 중인 건물은 세지 않는다. 돈: 왕실은 새 공사에 쓸 수 있는 돈(freeCash), 민간은 저택·금융가 금고(공사 명령이 낼 곳을 고른다)
 */
function reserveLevels(w: World, c: Company, canStart: () => boolean, free: () => number, start: (p: Pick, path: string) => boolean) {
  const inDebt = c.state && !!TUNE.crownDebtNoBuild && c.debt > c.cash;
  // 증설 난수 키의 묶음 안 순번: 같은 (지역, 종류, 방식) 내 건물이 w.buildings 에 나오는 순서 (id·builtTick 은 쓰지 않는다. 다른 건물이 끼어들어도 그대로)
  const order = new Map<string, number>();
  for (const b of [...w.buildings]) {
    if (b.companyId !== c.id) continue;
    const group = `${b.regionId}|${b.typeId}|${b.methodId}`;
    const idx = order.get(group) ?? 0;
    order.set(group, idx + 1);
    if (!reserveRuled(b)) continue;
    if (b.shrinking || w.constructions.some((k) => k.targetBuildingId === b.id)) { delete b.richWeeks; delete b.brokeWeeks; continue; }
    const res = b.reserve ?? 0, cap = reserveCap(b);
    // 증설은 확률로 (2026-10-25 사용자 "확률분포로"): 유보 자산이 상한의 TUNE.reserveGrowFrom 을 넘은 만큼 확률이 오르고, 가득 차면 주에 TUNE.reserveGrowMax
    const fillR = cap > 0 ? res / cap : 0;
    const pGrow = TUNE.reserveGrowMax * clamp((fillR - TUNE.reserveGrowFrom) / Math.max(1e-9, 1 - TUNE.reserveGrowFrom), 0, 1);
    let rich = TUNE.reserveGrowMax > 0 ? aiRand(w, 'grow', keyCompany(c.id), keyRegion(b.regionId), keyStr(b.typeId), keyStr(b.methodId), keyWeek(w.tick), keyIdx(idx)) < pGrow : res >= cap * RESERVE_FULL;
    // 과잉 검사 (TUNE.aiGlutSD > 0, 오버홀 03 5-1): 그 지역 그 산출 상품(산출이 여럿이면 기본가 값이 가장 큰 것, mainOutput)의 예상 공급 ÷ 수요
    // (공사 중 레벨 산출 포함, projectedSD)가 임계를 넘으면 이번 주 증설 확률 0 (찬 주로 세지 않는다). aiRand 는 키 해시라 막아도 다른 난수가 밀리지 않는다
    if (rich && TUNE.aiGlutSD > 0) {
      const g = mainOutput(b.typeId, b.methodId);
      const sd = g ? glutSD(w, b.regionId, g) : null;
      if (sd !== null && sd > TUNE.aiGlutSD) { rich = false; aiTrace.on?.(w, c, 'glutBlock', b.typeId, b.methodId, 0, undefined, b.regionId); }
    }
    // 자기 값 효과 (TUNE.aiMarginal ≥ 1, 0b′ A3): 이 회사가 그 지역 그 상품에서 버는 하루 손익이 레벨 +1 로 늘 때만 늘린다 (growGain)
    if (rich && TUNE.aiMarginal >= 1) {
      const g = mainOutput(b.typeId, b.methodId);
      if (g) {
        const ok = growGain(w, c, b, g) > 0;
        aiTrace.on?.(w, c, ok ? 'marginOk' : 'marginBlock', b.typeId, b.methodId, 0, undefined, b.regionId);
        if (!ok) rich = false;
      }
    }
    // 새 건물(시작 건물은 0일에 생긴 것으로 본다)은 RAMP_WEEKS 동안 사람을 뽑으며 내는 적자를 세지 않는다
    const ramping = w.tick - (b.builtTick ?? 0) < RAMP_WEEKS * TICKS_PER_WEEK;
    const broke = res <= 0 && b.profitEma * TICKS_PER_WEEK < 0 && !ramping && harvestFactor(w, b.regionId, BUILDING_BY_ID[b.typeId].land) >= 1;
    const nr = rich ? (b.richWeeks ?? 0) + 1 : 0, nb = broke ? (b.brokeWeeks ?? 0) + 1 : 0;
    if (nr) b.richWeeks = nr; else delete b.richWeeks;
    if (nb) b.brokeWeeks = nb; else delete b.brokeWeeks;
    if (nb >= TUNE.reserveShrinkWeeks && keepLast(w, b)) { aiTrace.on?.(w, c, 'keepLast', b.typeId, b.methodId, 0, undefined, b.regionId); delete b.brokeWeeks; continue; }
    if (nb >= TUNE.reserveShrinkWeeks) {
      if (!applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: 1 })) aiTrace.on?.(w, c, 'reserveShrink', b.typeId, b.methodId, -1);
      delete b.brokeWeeks;
      continue;
    }
    if ((TUNE.reserveGrowMax > 0 ? !rich : nr < RESERVE_STREAK) || inDebt || !canStart()) continue;
    const at = TUNE.aiGrowWhere ? growRegion(w, c, b) : b.regionId;
    if (roomFor(w, at, b.typeId) < 1) continue;
    const cost = constructionEstimate(w, c, b.typeId).cost;
    if (TUNE.aiReserveFund && !c.state && !c.isPlayer && Number.isFinite(cost) && free() < cost) fundFromReserve(w, c, b, at, cost - free());
    if (!Number.isFinite(cost) || free() < cost) continue;
    if (start({ regionId: at, typeId: b.typeId, methodId: b.methodId, levels: 1, score: 0 }, 'reserve')) delete b.richWeeks;
  }
}

interface Pick { regionId: number; typeId: string; methodId: string; levels: number; score: number; fallback?: boolean }

/**
 * 증설 위치 (TUNE.aiGrowWhere = 1, 2026-11-01 마이크로 시제품 microB S5): 유보 증설이 뽑힌 건물 b 의 1레벨을 지을 지역.
 * 후보 = 왕국 지역 중 그 종류 부지·땅(매장량, 기상 조건 없음)이 있고 일손이 되는 곳 (laborAvailability ≥ MIN_STAFFING: 직종마다 그 지역 구직 가능 인원 ÷ 필요,
 * 기술자·전문가는 자격자만 센다). 그중 산출 상품(mainOutput)의 지역 예상 공급 ÷ 수요(glutSD, 과잉 검사와 같은 값)가 가장 낮은 곳, 같으면 b 의 지역, 그다음 지역 순서.
 * 수요가 없는 지역(glutSD null)은 후보가 아니다. 후보가 없으면 b 의 지역 (끈 것과 같다).
 * 같은 지역이면 b 를 늘리고, 다른 지역이면 그 지역의 같은 종류·방식 건물을 늘리거나 새로 짓는다 (start → ownBuildingAt).
 * 마이크로 시제품과 다른 점: 수요 없는 지역을 S/D 0 으로 보지 않고 뺀다, 같은 값이면 b 의 지역을 먼저 본다
 */
function growRegion(w: World, c: Company, b: Building): number {
  const g = mainOutput(b.typeId, b.methodId);
  if (!g) return b.regionId;
  const m = getMethod(b.typeId, b.methodId), land = BUILDING_BY_ID[b.typeId].land;
  const own = ownRegions(w, c);
  let best = b.regionId, low = Infinity;
  for (const r of [...own.filter((x) => x.id === b.regionId), ...own.filter((x) => x.id !== b.regionId)]) {
    if (roomFor(w, r.id, b.typeId) < 1 || harvestFactor(w, r.id, land) < 1) continue;
    if (laborAvailability(w, r, m, 1, c.state, undefined, c) < MIN_STAFFING()) continue;
    const sd = glutSD(w, r.id, g);
    if (sd !== null && sd < low) { low = sd; best = r.id; }
  }
  return best;
}

/**
 * 유보로 증설비 (TUNE.aiReserveFund = 1, 2026-11-01 마이크로 시제품 microB S8): 민간 AI 회사 c 의 건물 b 증설이 저택·금융가 금고(ownerFunds)가 need 만큼 모자라 막힐 때,
 * b 의 유보 자산과 회사 현금이 모두 need 이상이면 need 를 회사 현금에서 빼고 b 의 유보 자산을 그만큼 줄여, 왕국 저택·금융가 중 새 일에 쓸 돈이 0 이상이고
 * 그 지역·종류에 낼 마음(funderWeight)이 가장 큰 곳(같으면 쓸 돈이 많은 곳, id 순, chooseFunders 와 같은 순서)의 금고에 넣는다. 돈은 옮길 뿐이다 (화폐 보존).
 * 모자라면 아무것도 하지 않는다 (나눠 내지 않는다). 공사 명령이 그 금고에서 공사비를 고른다
 */
function fundFromReserve(w: World, c: Company, b: Building, regionId: number, need: number) {
  if (!(need > 0) || (b.reserve ?? 0) < need || c.cash < need) return;
  const o = ownerBuildings(w, c.kingdomId).map((x) => ({ x, free: treasuryFree(w, x), wt: funderWeight(x, regionId, b.typeId) }))
    .filter((y) => y.free >= 0).sort((p, q) => q.wt - p.wt || q.free - p.free || p.x.id - q.x.id)[0]?.x;
  if (!o) return;
  b.reserve = (b.reserve ?? 0) - need;
  c.cash -= need;
  toTreasury(o, need, 'reserveFund');
  aiTrace.on?.(w, c, 'reserveFund', b.typeId, b.methodId, 0, undefined, regionId);
}

/**
 * 마지막 공급자 지킴 (TUNE.aiKeepLastSupplier = 1, 2026-11-01 마이크로 시제품 microB S7): 건물 b 의 남는 레벨(레벨 − 철거 대기)이 1 이하이고,
 * b 가 왕국에서 그 산출 상품(mainOutput)을 내는 마지막 건물이며 (자동 건물 제외, 남는 레벨 > 0 인 건물만 센다), 왕국의 다른 건물(자동 제외)이 그 상품을 원료로 쓰면 true.
 * AI 철거 경로(reserveLevels 유보 철거, sdExit 5-2, sellDemo A2, marginExit A3)는 이런 건물을 헐지 않는다 (적자여도).
 * 이유 (마이크로 기본 세계, 시드 1~8): 공방이 유보 0·적자로 헐리면 공구가 끊겨 공구를 쓰는 건물이 차례로 무너졌다.
 * 소작지(자동 건물)가 같은 상품을 내도 세지 않는다. 공사 중인 새 생산 건물도 세지 않는다
 */
function keepLast(w: World, b: Building): boolean {
  if (!TUNE.aiKeepLastSupplier || b.level - (b.shrinking ?? 0) > 1) return false;
  const g = mainOutput(b.typeId, b.methodId);
  if (!g) return false;
  const kingdomId = regionById(w, b.regionId).kingdomId;
  let used = false;
  for (const x of w.buildings) {
    if (x === b || x.level - (x.shrinking ?? 0) <= 0 || BUILDING_BY_ID[x.typeId].auto || regionById(w, x.regionId).kingdomId !== kingdomId) continue;
    const m = getMethod(x.typeId, x.methodId);
    if ((m.outputs[g] ?? 0) > 0) return false;
    if ((m.inputs[g] ?? 0) > 0) used = true;
  }
  return used;
}

// ---------------------------------------------------------------- 팔리지 않음 기준 가동률 감축·철거 (TUNE.aiCutSD·aiDemoSD, 오버홀 03 5-2, 0b′)
//
// 0b (main be7e72f, 20년 × 시드 1~4): 곡물 S/D 2.3~2.8, 값이 하한 0.25 에 10년차부터 붙었다. 적자 4주 감축은 유보 자산이 있으면 면제되고,
// 유보 0·적자 26주 철거는 임금 바닥이 곡물값을 따라 내려가 손익이 적자로 잘 안 가서 켜지지 않았다 (docs/overhaul/0B_RESULTS.md 1장).
// 그래서 '적자'가 아니라 '팔리지 않음'(지역 지금 공급 ÷ 수요)을 퇴출 신호로 쓴다. 문턱 순서는 03 5장 1번의 AI 판단 원칙
// 증설 허용(aiGlutSD) < 감축 시작(aiCutSD) < 철거 시작(aiDemoSD) 이고 (07 5.4 표), 이 순서를 지키는 조합만 비교한다 (코드로 막지 않는다).

/**
 * 감축이 다시 올리기를 막는 동안인가 (aiCutSD > 0 일 때만): 유보 기준 생산 건물의 산출 상품(mainOutput) 지역 예상 S/D(projectedSD, 공사 중 포함)가
 * 증설 임계 aiGlutSD 를 넘으면 (aiGlutSD 가 0 이거나 aiCutSD 이상이면 aiCutSD 를 넘으면) 가동률을 올리지도, 꺼진 건물을 다시 켜지도 않는다.
 * "증설이 막힐 만큼 넘치는 동안은 다시 올리지 않는다": 감축 시작(aiCutSD)보다 낮은 선에서 다시 올리므로 [올림선, aiCutSD) 구간은 그대로 둔다
 * (같은 선에서 줄이고 올리면 주마다 오르내린다). 올리기 자체는 그 전 규칙(마진 > 0 이면 +10%)이다
 */
function sdHold(w: World, b: Building): boolean {
  if (!(TUNE.aiCutSD > 0) || !reserveRuled(b)) return false;
  const g = mainOutput(b.typeId, b.methodId);
  const sd = g ? glutSD(w, b.regionId, g) : null;
  const line = TUNE.aiGlutSD > 0 && TUNE.aiGlutSD < TUNE.aiCutSD ? TUNE.aiGlutSD : TUNE.aiCutSD;
  return sd !== null && sd > line;
}

/** 감축 하한 (manageBuildings 의 적자 감축과 같은 10%) */
export const UTIL_FLOOR = 0.1;

/**
 * 팔리지 않음 기준 감축·철거 (매주 runAi 앞에서 한 번, 회사 판단보다 먼저):
 * 1) 지역·상품마다 지금 공급 ÷ 수요(currentSD, 공사 중 제외: 감축은 지금 넘친 것을 본다)가 aiCutSD 이상인 연속 주(Region.cutWeeks),
 *    aiDemoSD 이상인 연속 주(Region.demoWeeks)를 센다. 수요가 없으면(null) 세지 않는다.
 * 2) cutWeeks ≥ aiExitWeeks 이면 그 지역에서 그 상품을 산출(mainOutput)하는 AI 회사의 유보 기준 생산 건물(reserveRuled, 켜져 있고 가동률 > 10%) 중
 *    레벨당 장기 손익(profitEma ÷ 레벨)이 가장 나쁜 하나의 가동률을 10% 줄인다 (유보 자산이 있어도). 문턱 아래로 내려갈 때까지 주마다 한 번.
 * 3) demoWeeks ≥ aiExitWeeks 이면 같은 건물 중 가동률이 하한(10%)이거나 꺼진 것(철거 대기·증설 공사 중 제외)에서 레벨당 손익이 가장 나쁜 하나를 1레벨 헌다.
 * 완충 (07 A5 범위, 근거 없음): 한 지역·상품에서 한 주에 감축 한 건물, 철거 한 건물까지. 여러 회사 건물이 함께 줄이면 EMA(하루 10%) 반응보다 빨리 줄어 지나치게 줄 수 있어서다.
 * 같은 값이면 w.buildings 순서가 앞선 건물 (결정성). 플레이어 건물은 건드리지 않지만 그 공급은 S/D 에 들어간다
 */
function sdExit(w: World) {
  const cut = TUNE.aiCutSD, demo = TUNE.aiDemoSD, need = TUNE.aiExitWeeks;
  const ai = new Map(w.companies.filter((c) => !c.isPlayer).map((c) => [c.id, c] as const));
  const groups = new Map<string, Building[]>();
  for (const b of w.buildings) {
    if (b.level <= 0 || !ai.has(b.companyId) || !reserveRuled(b)) continue;
    const g = mainOutput(b.typeId, b.methodId);
    if (!g) continue;
    const key = `${b.regionId}|${g}`;
    const list = groups.get(key);
    if (list) list.push(b); else groups.set(key, [b]);
  }
  const perLevel = (b: Building) => b.profitEma / Math.max(1, b.level);
  const worst = (list: Building[]) => list.reduce<Building | null>((x, b) => (!x || perLevel(b) < perLevel(x) ? b : x), null);
  for (const r of w.regions) {
    const cw: Partial<Record<GoodId, number>> = {}, dw: Partial<Record<GoodId, number>> = {};
    for (const g of GOOD_IDS) {
      const sd = currentSD(w, r.id, g);
      if (sd === null) continue;
      if (cut > 0 && sd >= cut) cw[g] = (r.cutWeeks?.[g] ?? 0) + 1;
      if (demo > 0 && sd >= demo) dw[g] = (r.demoWeeks?.[g] ?? 0) + 1;
    }
    if (Object.keys(cw).length) r.cutWeeks = cw; else delete r.cutWeeks;
    if (Object.keys(dw).length) r.demoWeeks = dw; else delete r.demoWeeks;
    for (const g of GOOD_IDS) {
      const list = groups.get(`${r.id}|${g}`);
      if (!list) continue;
      if ((cw[g] ?? 0) >= need) {
        const b = worst(list.filter((x) => x.active && x.utilization > UTIL_FLOOR + 1e-9));
        const c = b && ai.get(b.companyId);
        if (b && c && !applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: Math.max(UTIL_FLOOR, b.utilization - 0.1) })) aiTrace.on?.(w, c, 'sdCut', b.typeId, b.methodId, 0, undefined, r.id);
      }
      if ((dw[g] ?? 0) >= need) {
        const b = worst(list.filter((x) => (!x.active || x.utilization <= UTIL_FLOOR + 1e-9) && !x.shrinking && !w.constructions.some((k) => k.targetBuildingId === x.id) && !keepLast(w, x)));
        const c = b && ai.get(b.companyId);
        if (b && c && !applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: 1 })) aiTrace.on?.(w, c, 'sdDemo', b.typeId, b.methodId, -1, undefined, r.id);
      }
    }
  }
}

// ---------------------------------------------------------------- 곡물 균형 후보 (0b′ A1·A2·A3, 진단 .tmp/0bp/diag/RESULT.md 4.1, 기본 0 = 끔)
//
// 진단 (wt-0bp c9b2967, 20년 × 시드 1·2 × salt 0..3): 곡물 S/D 가 1.7~1.9 에 머문다. 임금 바닥이 곡물값을 따라가 농장 손익 ≈ p × (6,848σ − 2,250) − 75 로
// S/D 2.7 까지 흑자라 적자 감축(S/D 3.5 이상)이 걸리지 않고, 진입은 과잉 검사(aiGlutSD) 하나가 막는데 흉년에 열리고 풍년에 안 닫히는 한쪽 톱니다.
// 세 후보는 모두 AI 판단만 바꾼다 (세계 규칙은 그대로, CLAUDE.md 작업 방식 2). 유보 신호·방식 전환·소작지·planTrials·정부 건물은 건드리지 않는다.

/**
 * 과잉 검사가 보는 지역 예상 공급 ÷ 수요 (reserveLevels 의 aiGlutSD 검사와 sdHold). TUNE.aiGlutIdle = 0 이면 projectedSD 그대로.
 * aiGlutIdle = 1 (0b′ A1) 이면 projectedSD 의 공급에 둘을 더한다:
 *  (가) 놀고 있는 설비: 그 지역에서 g 를 내는 자동 아닌 건물마다 (1 − 가동률, 꺼진 건물은 1) × (레벨 − 철거 대기) × 레벨당 산출 × (1 + 특산 보너스),
 *  (나) 기상 조건으로 줄어든 공급 (weatherShortfall).
 * 이유 (진단 1장 3·4번): 흉년에 지역 S/D 가 문턱 아래로 잠깐 내려가면 증설이 열리고 풍년에 되돌리는 길이 없어 한쪽 톱니가 되고,
 * 5-2 감축은 가동률만 줄여 공급 이동평균이 내려가 과잉 검사가 다시 열린다 (감축 → 증설). 둘 다 설비는 그대로인데 공급이 잠깐 작아 보이는 것이다
 */
function glutSD(w: World, regionId: number, g: GoodId): number | null {
  if (!TUNE.aiGlutIdle) return projectedSD(w, regionId, g);
  let add = 0;
  for (const b of w.buildings) {
    if (b.regionId !== regionId || BUILDING_BY_ID[b.typeId].auto) continue;
    const out = getMethod(b.typeId, b.methodId).outputs[g];
    if (!out) continue;
    const idle = 1 - (b.active ? b.utilization : 0);
    if (idle > 0) add += out * Math.max(0, b.level - (b.shrinking ?? 0)) * idle * (1 + regionPerk(regionId, b.typeId));
  }
  return projectedSD(w, regionId, g, add + weatherShortfall(w, regionId, g));
}

/**
 * 기상 조건으로 줄어든 지역 공급 (A1): 조건이 걸렸던 땅의 생산자(소작지, 땅 건물) 출처별 공급 이동평균을 평년 양으로 되돌린 차 Σ q × (1/f − 1).
 * f = 그 이동평균에 남은 배율 (harvestFactorEma, 소작지는 그날 수확을 팔아 1일 전, 건물은 전날 만든 것을 팔아 2일 전). outlook.ts marketOutlook 의 되돌리기와 같은 계산.
 * 진단은 소작 공급만 되돌리자고 했으나 같은 조건이 땅 건물(농장) 산출도 줄이므로 outlook 과 같이 둘 다 되돌린다
 */
function weatherShortfall(w: World, regionId: number, g: GoodId): number {
  if (!(TUNE.harvestChance > 0)) return 0;
  let add = 0;
  for (const [src, q] of Object.entries(regionById(w, regionId).market[g].supplyByEma ?? {})) {
    const typeId = src === 'subsistence' ? src : src.startsWith('bld:') ? src.slice(4) : null;
    const land = typeId ? BUILDING_BY_ID[typeId]?.land : undefined;
    if (!land || land === 'plot') continue;
    const f = harvestFactorEma(w, regionId, land, BY_EMA, src === 'subsistence' ? 1 : 2);
    if (f < 1 && f > 0) add += q * (1 / f - 1);
  }
  return add;
}

const aiCompanies = (w: World) => new Map(w.companies.filter((c) => !c.isPlayer).map((c) => [c.id, c] as const));
const perLevelProfit = (b: Building) => b.profitEma / Math.max(1, b.level);
/** 레벨당 장기 손익이 가장 나쁜 건물 (같으면 목록에서 앞선 것 = w.buildings 순서) */
const worstPerLevel = (list: Building[]) => list.reduce<Building | null>((x, b) => (!x || perLevelProfit(b) < perLevelProfit(x) ? b : x), null);
const expanding = (w: World, b: Building) => w.constructions.some((k) => k.targetBuildingId === b.id);

/**
 * 팔리지 않음 기준 설비 철거 (TUNE.aiSellDemoSD > 0, 0b′ A2, 매주 runAi 앞에서 sdExit 다음):
 * 지역·상품마다 지금 공급 ÷ 수요(currentSD)가 aiSellDemoSD 이상인 연속 주(Region.sellWeeks)를 세고, aiSellDemoWeeks 주 이상이면
 * 그 지역에서 그 상품(mainOutput)을 내는 AI 회사의 유보 기준 생산 건물 중 레벨당 장기 손익(profitEma ÷ 레벨)이 가장 나쁜 하나를 가동률과 무관하게 1레벨 헌다
 * (철거 대기·증설 공사 중 제외. 한 지역·상품에서 주에 한 건물 한 레벨, 문턱 아래로 내려갈 때까지 주마다).
 * 5-2 (sdExit) 와 다른 점: 가동률을 먼저 줄이지 않고 설비를 줄인다 (진단 4번: 가동률만 줄이면 과잉 검사가 다시 열려 증설된다).
 * 증설 문턱 aiGlutSD 보다 높게 둬야 짓고 허는 반복이 없다 (코드로 막지 않고 그 조합만 비교한다, docs/overhaul/0BP_GRAIN_SPECS.json).
 * 농장을 헐면 그 일꾼이 소작으로 돌아가 제 곡물을 먹어 수요도 준다 (진단 5번: 줄인 공급의 약 40%). 판단에는 넣지 않았다:
 * 문턱 위에 있는 동안만 주마다 한 레벨이라 수요가 같이 줄어도 문턱 아래로 내려가면 멈춘다 (늦게 멈출 뿐 문턱 아래로 계속 헐지는 않는다)
 */
function sellDemo(w: World) {
  const line = TUNE.aiSellDemoSD, need = TUNE.aiSellDemoWeeks;
  const ai = aiCompanies(w);
  const groups = new Map<string, Building[]>();
  for (const b of w.buildings) {
    if (b.level <= 0 || !ai.has(b.companyId) || !reserveRuled(b)) continue;
    const g = mainOutput(b.typeId, b.methodId);
    if (!g) continue;
    const key = `${b.regionId}|${g}`;
    const list = groups.get(key);
    if (list) list.push(b); else groups.set(key, [b]);
  }
  for (const r of w.regions) {
    const sw: Partial<Record<GoodId, number>> = {};
    for (const g of GOOD_IDS) {
      const sd = currentSD(w, r.id, g);
      if (sd !== null && sd >= line) sw[g] = (r.sellWeeks?.[g] ?? 0) + 1;
    }
    if (Object.keys(sw).length) r.sellWeeks = sw; else delete r.sellWeeks;
    for (const g of GOOD_IDS) {
      if ((sw[g] ?? 0) < need) continue;
      const list = groups.get(`${r.id}|${g}`);
      if (!list) continue;
      const b = worstPerLevel(list.filter((x) => !x.shrinking && !expanding(w, x) && !keepLast(w, x)));
      const c = b && ai.get(b.companyId);
      if (b && c && !applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: 1 })) aiTrace.on?.(w, c, 'sellDemo', b.typeId, b.methodId, -1, undefined, r.id);
    }
  }
}

/** 가격 범위 안의 가격 공식 값 (시장 값이 따라가는 목표, market.ts updatePrices) */
function boundedPrice(g: GoodId, demand: number, supply: number): number {
  const base = GOODS[g].basePrice, [mn, mx] = priceBounds();
  return clamp(priceFormula(g, demand, supply), base * mn, base * mx);
}

/**
 * 회사가 지역에서 상품 g 를 팔아 버는 하루 매출 (A3): 지역 공급 S, 회사 몫 Q 일 때 Q × 값(S) × 팔린 비율(S).
 * 값 = priceFormula(g, 수요 이동평균 D, S) (가격 범위 안), 팔린 비율 = min(1, D ÷ S) (market.ts clearMarkets: 지역 안 모든 판매가 같은 비율로 팔린다)
 */
function ownSales(g: GoodId, D: number, S: number, Q: number): number {
  if (!(Q > 0)) return 0;
  return Q * boundedPrice(g, D, S) * (S > FLOW_ZERO ? Math.min(1, D / S) : 1);
}

/**
 * A3 의 출발점: D = 지역 수요 이동평균, S = 지역 공급 이동평균 + 모든 회사 공사 중 산출 (projectedSD 와 같은 셈) − 철거 대기 레벨의 어제 산출,
 * Q = 회사 c 의 그 지역 자동 아닌 건물 어제 산출 합 (가동률·충원·기상이 들어간 실제 값) + 자기 공사 중 산출 − 자기 철거 대기 몫. 수요가 없으면 null
 */
function ownMarket(w: World, c: Company, regionId: number, g: GoodId): { D: number; S: number; Q: number } | null {
  const mk = regionById(w, regionId).market[g];
  if (mk.demandEma <= FLOW_ZERO) return null;
  let S = mk.supplyEma, Q = 0;
  for (const k of w.constructions) {
    if (k.regionId !== regionId) continue;
    const out = getMethod(k.typeId, k.methodId).outputs[g];
    if (!out) continue;
    const q = out * (k.levels ?? 1) * (1 + regionPerk(regionId, k.typeId));
    S += q;
    if (k.companyId === c.id) Q += q;
  }
  for (const b of w.buildings) {
    if (b.regionId !== regionId || b.level <= 0 || BUILDING_BY_ID[b.typeId].auto) continue;
    const q = b.last.output[g] ?? 0;
    if (!(q > 0)) continue;
    const gone = b.shrinking ? q * Math.min(1, b.shrinking / b.level) : 0;
    S -= gone;
    if (b.companyId === c.id) Q += q - gone;
  }
  return { D: mk.demandEma, S: Math.max(0, S), Q: Math.max(0, Q) };
}

/**
 * 레벨 +1 의 회사 하루 손익 변화 (TUNE.aiMarginal ≥ 1, 0b′ A3 증설): (Q + o) × 값(S + o) × 팔린 비율(S + o) − Q × 값(S) × 팔린 비율(S) − k.
 * o = 그 방식 레벨당 산출 × (1 + 특산 보너스) (다 뽑고 다 가동), k = 그 방식 1레벨 하루 원료비 + 인건비 (estimateMethod, 지금 값·지금 임금).
 * 회사의 다른 레벨 원가는 그대로라 빠진다. 자기 몫 Q 만 보므로 지역에 농장 회사가 여럿이면 몫이 작은 회사일수록 값 효과를 덜 본다.
 * 임금은 지금 값으로 둔다: 공급이 바뀌면 곡물값을 따라 임금 바닥도 움직이지만 (진단 1번) 그 반응은 넣지 않았다 (근거 없음).
 * 산출이 여럿인 방식은 mainOutput 만 본다 (2026-11-01 데이터에는 산출이 둘 이상인 방식이 없다). 수요가 없으면 막지 않는다 (+∞)
 */
function growGain(w: World, c: Company, b: Building, g: GoodId): number {
  const mk = ownMarket(w, c, b.regionId, g);
  if (!mk) return Infinity;
  const o = (getMethod(b.typeId, b.methodId).outputs[g] ?? 0) * (1 + regionPerk(b.regionId, b.typeId));
  const e = estimateMethod(w, b.regionId, b.typeId, b.methodId, wagesAt(c, b.typeId, w, b.regionId), c.state);
  return ownSales(g, mk.D, mk.S + o, mk.Q + o) - ownSales(g, mk.D, mk.S, mk.Q) - (e.inputCost + e.wageCost);
}

/**
 * 건물 b 를 1레벨 헐 때 회사 하루 손익 변화 (A3 철거): (Q − o) × 값(S − o) × 팔린 비율(S − o) − Q × 값(S) × 팔린 비율(S) + k.
 * o, k = b 의 어제 산출, 원료비 + 인건비 ÷ 레벨 (실제 값). 임금은 지금 값 (growGain 과 같다). 수요가 없으면 −∞ (헐지 않는다)
 */
function shrinkGain(w: World, c: Company, b: Building, g: GoodId): number {
  const mk = ownMarket(w, c, b.regionId, g);
  if (!mk) return -Infinity;
  const o = (b.last.output[g] ?? 0) / b.level, k = (b.last.inputCost + b.last.wageCost) / b.level;
  return ownSales(g, mk.D, Math.max(0, mk.S - o), Math.max(0, mk.Q - o)) - ownSales(g, mk.D, mk.S, mk.Q) + k;
}

/**
 * 자기 값 효과 철거 (TUNE.aiMarginal ≥ 2, 0b′ A3, 매주 runAi 앞에서 sellDemo 다음): AI 회사마다 지역·산출 상품(mainOutput)별 유보 기준 생산 건물 묶음에서
 * 켜져 있고 증설 공사 중·새 건물(RAMP_WEEKS 안)이 아닌 건물 중 레벨당 손익이 가장 나쁜 하나 b 를 골라, shrinkGain > 0 인 주를 센다 (Region.marginWeeks, 키 "회사 id|상품").
 * aiSellDemoWeeks 주 이어지면 b 를 1레벨 헌다 (그 뒤로도 조건이 이어지는 동안 주마다). 묶음에 철거 대기가 있으면 그 주는 세지도 헐지도 않는다 (센 주는 그대로).
 * 연속 주 조건은 이동평균 흔들림에 주마다 헐고 짓는 것을 막는 완충이다 (근거 없음)
 */
function marginExit(w: World) {
  const need = TUNE.aiSellDemoWeeks;
  const ai = aiCompanies(w);
  const groups = new Map<string, { c: Company; regionId: number; g: GoodId; list: Building[] }>();
  for (const b of w.buildings) {
    const c = ai.get(b.companyId);
    if (!c || b.level <= 0 || !reserveRuled(b)) continue;
    const g = mainOutput(b.typeId, b.methodId);
    if (!g) continue;
    const key = `${c.id}|${b.regionId}|${g}`;
    const x = groups.get(key);
    if (x) x.list.push(b); else groups.set(key, { c, regionId: b.regionId, g, list: [b] });
  }
  const next = new Map<number, Record<string, number>>();
  for (const { c, regionId, g, list } of groups.values()) {
    const r = regionById(w, regionId), key = `${c.id}|${g}`, prev = r.marginWeeks?.[key] ?? 0;
    const put = (n: number) => { if (n > 0) { const m = next.get(regionId) ?? {}; m[key] = n; next.set(regionId, m); } };
    if (list.some((x) => x.shrinking)) { put(prev); continue; }
    const b = worstPerLevel(list.filter((x) => x.active && !expanding(w, x) && w.tick - (x.builtTick ?? 0) >= RAMP_WEEKS * TICKS_PER_WEEK && !keepLast(w, x)));
    if (!b || !(shrinkGain(w, c, b, g) > 0)) continue;
    const n = prev + 1;
    put(n);
    if (n >= need && !applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: 1 })) aiTrace.on?.(w, c, 'marginDemo', b.typeId, b.methodId, -1, undefined, regionId);
  }
  for (const r of w.regions) {
    const m = next.get(r.id);
    if (m) r.marginWeeks = m; else delete r.marginWeeks;
  }
}

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
export function pickProject(w: World, c: Company, o: Outlook, free: number, allowLoss = false, blocked?: { best: Pick | null }, schoolFree = 0, dev = false, call = 0): Pick | null {
  let best: Pick | null = null, least: Pick | null = null;
  // 후보의 AI 난수 키: (회사, 지역, 종류, 방식, 주, 이번 주 몇 번째 부름 call). 같은 주에 여러 번 불리므로(주에 startsPerWeek 번) 부름 순번을 넣어 부를 때마다 새로 흔든다
  const jitter = (tag: 'least' | 'pick' | 'pickDev', regionId: number, typeId: string, methodId: string) =>
    aiRand(w, tag, keyCompany(c.id), keyRegion(regionId), keyStr(typeId), keyStr(methodId), keyWeek(w.tick), keyIdx(call));
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
  const overLocal = (regionId: number, typeId: string, m: MethodDef, levels: number) => GOOD_IDS.some((g) => {
    const out = m.outputs[g] ?? 0;
    if (!(out > 0) || !GOODS[g].perishable) return false;
    const x = o.local(g, regionId);
    return out * levels * (1 + regionPerk(regionId, typeId)) > x.demand + (dev ? x.latent : 0) - x.supply;
  });
  for (const r of ownRegions(w, c)) {
    for (const t of BUILDING_TYPES) {
      if (t.id === 'builder' || !canBuildType(c, t)) continue;
      if (inDebt && !isGovernment(t.id)) continue;
      if (dev && isGovernment(t.id)) continue;
      // TUNE.aiReserveRule: 생산 건물은 전망으로 짓지 않는다 (새 투자 planTrials, 증설·철거 reserveLevels). 정부 건물·무역소만 여기서 고른다
      if (TUNE.aiReserveRule && !isGovernment(t.id) && t.id !== TRADING_POST) continue;
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
          // 지역 밖으로 못 나가는 상품(운송): 2레벨 이상 덩어리는 산출이 그 지역의 모자란 양(수요(발전 투자는 잠재 수요까지) − 공급, 공사 중 포함)을 넘지 않을 때만
          if (levels > 1 && overLocal(r.id, t.id, m, levels)) continue;
          const e = m.seats ? schoolValuation(w, c, r, m, levels, schoolSeats(w, r.id)) : t.id === TRADING_POST ? tradeValuation(w, c, r, m, levels) : valueMethod(w, o, r, c, t.id, m, levels, false, undefined, dev);
          if (laborAvailability(w, r, m, levels, c.state, pools, c) < MIN_STAFFING()) continue;
          const roi = (e.profit * TICKS_PER_YEAR) / (perLevel * levels);
          // 발전 투자: 잠재 수요까지 센 손익이 −인건비 × TUNE.devLoss 이상인 가장 큰 덩어리
          if (dev) {
            if (e.profit >= -TUNE.devLoss * e.wageCost && !choice) choice = { levels, roi };
            continue;
          }
          if (allowLoss && levels === CHUNKS[CHUNKS.length - 1] && e.profit >= -TUNE.lossTolerance * e.wageCost) {
            const s = roi + Math.abs(roi) * (jitter('least', r.id, t.id, m.id) - 0.5) * 0.3;
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
        const score = pick.roi * (1 - AI_JITTER + jitter(dev ? 'pickDev' : 'pick', r.id, t.id, m.id) * 2 * AI_JITTER) * (1 + TUNE.localBias * here);
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

