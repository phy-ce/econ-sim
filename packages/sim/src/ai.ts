import { BUILDING_BY_ID, buildPointsOf, BUILDING_TYPES, EDUCATION_FLOOR, EDUCATION_RANGE, GOOD_IDS, GOODS, SKILL_DEFS, TECH_BY_ID, TICKS_PER_WEEK, TICKS_PER_YEAR, TRADING_POST, TUNE, getMethod, regionPerk, tradeEscrowPerLevel, tradeReserveOf } from './data';
import { withEstimateCache, regionAvgWealth, regionPopulation, wageCostOf,
  availableMethods, ownBuildingAt, builderOf, canBuildType, disbanded, kingdomGdp, paysDividend, paysShare, companyById, constructionEstimate, creditLimit, depositFree, efficiency, estimateMethod, harvestFactor, hasBuilder, isGovernment, regionById, wagesAt, researchableTechs, roomFor, sellsShares, slots, mainOutput, methodSD, projectedSD,
  shareWage, collectionRatio, FLOW_ZERO,
} from './economy';
import { FLOW_EMA } from './market';
import { MAX_CONCURRENT_CONSTRUCTIONS, MAX_LEVELS_PER_PROJECT, applyCommand } from './commands';
import { applyStateWages, budgetMult, committedCost, favours, funderWeight, hasReserve, lawRevenue, ownerBuildings, ownerFunds, reserveCap, reserveOf, taxRates, treasuryFree } from './finance';
import { privatizeLevel } from './production';
import { policyStatus } from './policy';
import { WAGE_LADDER, subsistenceWage } from './labor';
import { baseValue, longRunWages, marketOutlook, techValue, valueMethod } from './outlook';
import type { Outlook } from './outlook';
import { kingdomById, toTreasury } from './kingdoms';
import { STAFFING_HORIZON, labourPool, laborAvailability, takeFromPool } from './staffing';
import { LITERACY_PER_WEALTH, workforce } from './pops';
import { clamp } from './rng';
import { aiRand, keyCompany, keyIdx, keyRegion, keyStr, keyWeek } from './rng/aiRand';
import { BUDGET_STEPS, INVEST_LAWS, SKILLS, isLowerJob, literacyOf } from './types';
import type { BudgetItem, Building, Company, GoodId, Kingdom, MethodDef, Pop, Region, Skill, TaxLaw, WelfareLaw, World } from './types';
import { welfareShortOf, welfareWeekly } from './welfare';

export { STAFFING_HORIZON, laborAvailability } from './staffing';

// AI: 국영과 민간이 같은 판단을 쓴다. 다른 점은 자금원(국고 / 저택·금융가 금고)과 자기 왕국 땅에만 짓는다는 것뿐이다.

/** 건설 판단 기준: 연간 이윤 / 공사비 (5년 안에 회수) */
const MIN_ROI = () => TUNE.minRoi;
export const SWITCH_COOLDOWN = TICKS_PER_WEEK * 3;
/** 방식 고르기: 투입재마다 대륙 공급(이동평균)이 필요의 이 비율 미만이면 그 방식을 고르지 않는다 (근거 없음) */
export const INPUT_SUPPLY_MIN = 0.5;
/** 무역소 방식 바꾸기: 새 방식의 하루 손익이 지금보다 이 비율 넘게 커야 바꾼다 */
export const SWITCH_MARGIN = 0.05;
/** 생산 방식 바꾸기: 레벨당 하루 손익이 지금보다 이 비율 + SWITCH_FLOOR 넘게 커야 바꾼다 (근거 없음, DESIGN 11장) */
export const SWITCH_GAIN = 0.05, SWITCH_FLOOR = 0.01;
/** 행정청 방식 바꾸기: 한도 × 원료 충족이 지금보다 이 비율 넘게 커야 바꾼다 */
export const ADMIN_SWITCH_GAIN = 0.1;
/** 공사 하나의 레벨 수 후보 (큰 것부터). 1레벨이 일꾼 500명이 되어(2026-10-22) 1,000명 시절 [5, 2, 1]의 두 배 (1은 남는 땅 한 칸용) */
export const CHUNKS = [10, 4, 2, 1];
/** 사무소를 한 번에 늘리는 레벨: 지금 사무소의 1/4 (최소 4, 1,000명 시절 2의 두 배) */
export const OFFICE_BLOCK = 4;
export const OFFICE_GROWTH = 0.25;
/** TUNE.aiMixedMethods: 옆에 새 방식으로 짓는 건물의 공사 하나 레벨 상한 (계획: 1~2레벨) */
export const MIXED_LEVELS = 2;
/** 짓기 기준: 공사 기간 안에 일자리의 이 비율 이상을 채울 사람이 있어야 한다 (건축사무소는 대신 채울 수 있는 레벨 수 officeStaffable 을 본다) */
const MIN_STAFFING = () => TUNE.minStaffing;
/** 왕실 행정청·건축사무소의 레벨 가중 충원율이 이 값 아래면 일손이 모자란 것으로 본다 (adjustBudget·adjustStatePremium, 근거 없음) */
export const ADMIN_STAFFED = 0.9;
/** 새 건물이 사람을 뽑는 주 수: 유보 철거가 이 동안의 적자를 세지 않는다. 넘침 퇴출도 쓰고, 방식을 막 바꾼 건물의 굶음 판단도 이 주 수를 쓴다 (TUNE.aiLatentInput) */
export const RAMP_WEEKS = 8;

/** 왕실 건축사무소(켜진 건물, 해산한 사무소 제외)의 가동 레벨 가중 충원율. 사무소가 없으면 1 (adjustBudget) */
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
 * path: pick 보통 후보, govInputs 왕실 원료 확보, office 건축사무소, shrink 철거, swap 땅 바꾸기 철거, switchIn·switchOut 방식 바꾸기,
 * reserve 유보 자산이 찬 건물 증설, reserveShrink 유보 자산이 바닥난 적자 건물 철거, trial 새 투자 1레벨, latentTrial 잠재 수요 새 투자 (reserveLevels·planTrials),
 * officeShrink 건축사무소 철거, schoolShrink 빚 때문에 학교 철거.
 * 철거 길은 모두 regionId 를 넘긴다 (cli/churndiag.ts 가 철거 원인을 건물에 붙인다).
 * 시뮬레이션 상태를 바꾸지 않는다 (비어 있으면 아무것도 하지 않는다)
 */
export const aiTrace: { on?: (w: World, c: Company, path: string, typeId: string, methodId: string, levels: number, o?: Outlook, regionId?: number) => void } = {};

export function runAi(w: World) {
  if (!w.config.ai) return;
  countHotPrices(w);
  if (TUNE.aiTrimSD > 0) trimExit(w);
  const outlook = marketOutlook(w);
  // 이번 주 방식 바꾸기가 함께 쓰는 일손 곳간 (지역, 직종): 한 건물이 바꾸며 더 뽑을 사람을 빼 두어, 같은 사람을 여러 건물이 세지 않는다
  const switchPools = new Map<string, number>();
  for (const c of w.companies) {
    if (c.isPlayer) continue;
    // 왕실은 세법과 정책 단계(정부 건물의 국영 임금 포함)를 정한다. 생산 건물 임금은 민간과 왕실 모두 지역 시장 임금이고, 웃돈은 민간 adjustPremium, 왕실 crownPioneerPremium 이 얹는다
    if (c.state) { chooseTaxLaw(w, c); adjustBudget(w, c); }
    // TUNE.aiStatePremium: 왕실은 정부 건물 일손이 모자라는 지역에 국영 임금 웃돈을 얹는다 (adjustStatePremium)
    if (c.state && TUNE.aiStatePremium) adjustStatePremium(w, c);
    // 임금은 지역 시장 임금이 정한다 (labor.ts updateMarketWages). AI 는 자리(가동률·증설·철거)만 정한다.
    // 민간 상회는 사람이 빠지는 지역에 웃돈을 얹는다 (adjustPremium)
    if (!c.state) adjustPremium(w, c);
    else if (TUNE.aiLatentInput >= 2 && !c.isPlayer) crownPioneerPremium(w, c);
    manageBuildings(w, c, outlook, switchPools);
    if (c.state) planResearch(w, c, outlook);
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
  // 사무소가 주는 임금: 그 지역 국영 임금
  const mine = r.stateWages ?? c.stateWages ?? c.wages;
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

/** 상회 웃돈(adjustPremium)과 왕실 선구 웃돈(crownPioneerPremium)을 한 주에 움직이는 최대 폭 (시장 임금 대비 비율). 근거: DESIGN 11 aiWagePremium 행 */
export const PREMIUM_STEP = 0.1;
/** 상회·왕실 선구 웃돈 상한 (플레이어 웃돈 손잡이 setWageOffset 의 위 끝과 같다). AI 는 웃돈만 얹으므로 아래 끝은 0 */
export const PREMIUM_MAX = 1;

/**
 * 왕실이 체인을 연다 (AI 판단, TUNE.aiLatentInput 2·3, 매주): 왕실 선구 건물(latentPioneer)이 일손 기준(TUNE.minStaffing)에 못 미치는 지역은 왕실 생산 건물 임금에 웃돈을 PREMIUM_STEP 씩 얹고 (PREMIUM_MAX 까지),
 * 일손이 찼거나 선구 건물이 없는 지역은 PREMIUM_STEP 씩 내린다. 시장 임금이 같으면 새 건물은 사람을 못 뽑는다: 시드 1 7년차 r7 기술자 곳간 1명, 빈자리 약 3,800. 시장 임금 규칙은 바뀌지 않는다
 */
function crownPioneerPremium(w: World, c: Company) {
  const short = new Set<number>(), all = new Set<number>(Object.keys(c.aiPremium ?? {}).map(Number));
  for (const b of w.buildings) {
    if (b.companyId !== c.id || b.level <= 0 || isGovernment(b.typeId) || BUILDING_BY_ID[b.typeId].auto) continue;
    if (b.last.staffing < MIN_STAFFING() && latentPioneer(w, b)) { short.add(b.regionId); all.add(b.regionId); }
  }
  const next: NonNullable<Company['aiPremium']> = {};
  for (const rid of [...all].sort((x, y) => x - y)) {
    const off = { ...(c.aiPremium?.[rid]?.off ?? emptyRecord()) };
    for (const s of SKILLS) off[s] = short.has(rid) ? Math.min(PREMIUM_MAX, off[s] + PREMIUM_STEP) : Math.max(0, off[s] - PREMIUM_STEP);
    if (SKILLS.some((s) => off[s] > 0)) next[rid] = { off, emp: emptyRecord(), vac: emptyRecord() };
  }
  if (Object.keys(next).length) c.aiPremium = next; else delete c.aiPremium;
}

/**
 * 민간 AI 상회의 지역 웃돈 (AI 판단, 2026-11-02 wt-wagelag A1, 매주). 지역마다 그 상회 생산 건물(정부·소유·소작 건물 제외)을 보고, 직종마다:
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
 * AI 왕실의 국영 건물 지역 웃돈 (TUNE.aiStatePremium, 매주). 지역마다 그 왕실의 정부 건물(행정청·건축사무소·학교: 켜져 있고 해산하지 않은 것)을 보고, 직종마다:
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
 * - 행정청 일손 (wt-wagelag A2, 오버홀 07 A4): 행정청과 건축사무소 충원율 중 낮은 쪽이 ADMIN_STAFFED 아래인 동안 국영 임금을 내리지 않고,
 *   그 점검에서는 다른 손잡이보다 먼저 국영 임금을 한 칸 올린다 (5까지). 행정청 일꾼은 국영 임금을 받으므로, 국고가 조일 때 임금을 깎으면 징수율이 더 떨어진다.
 *   (징수율 하한 aiAdminFloor 를 보던 갈래 aiAdminWage 1 과 끄는 갈래 0 은 2026-11-02 wt-simplify 1-E, 하한 자체는 1-G 에서 지웠다)
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
  // 행정청·건축사무소 충원율 중 낮은 쪽이 ADMIN_STAFFED 아래면 국영 임금을 내리지 않고(cut = false) 먼저 한 칸 올린다
  const guard = Math.min(adminStaffing(w, c), officeStaffing(w, c)) < ADMIN_STAFFED;
  const cut = !guard;
  if (guard && b.wages < BUDGET_STEPS) {
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
  if (k.welfareLaw === 'none') return false;
  if (k.budget.welfare > 1) { applyCommand(w, c.id, { type: 'setBudget', item: 'welfare', value: k.budget.welfare - 1 }); return true; }
  // 복지법은 빚을 질 때만 끈다 (지출 몇 주치가 모자란 것만으로 끄면 180일 전환 동안 다시 켜고 끄기를 되풀이한다)
  if (!pending && c.debt > 0) { applyCommand(w, c.id, { type: 'setWelfareLaw', law: 'none' }); return true; }
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
  if (big && n > 0 && !applyCommand(w, c.id, { type: 'demolish', buildingId: big.id, levels: n })) { big.swap = true; noteDemolish(w, big); aiTrace.on?.(w, c, 'schoolShrink', big.typeId, big.methodId, -n, undefined, big.regionId); }
}

/** 세법을 바꾸는 기준: 다른 세법의 예상 세입이 지금의 이 배수를 넘을 때, 마지막으로 바꾼 지 LAW_COOLDOWN 틱이 지났을 때 */
export const LAW_SWITCH = 1.2;
export const LAW_COOLDOWN = TICKS_PER_YEAR;

/** 왕국에서 소작농을 뺀 1인당 하루 소득 (incomeEma 합 ÷ 인원 합) */
export function perCapitaIncome(w: World, kingdomId: number): number {
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

/**
 * 투입재를 대륙 어딘가에서 실제로 구할 수 있는가: 투입재마다 남는 양이 필요의 INPUT_SUPPLY_MIN 이상.
 * 남는 양 = 대륙 공급 − 대륙 수요 (이동평균) + 이 건물 b 가 지금 방식으로 쓰는 양 (레벨 × 가동률, 바꾸면 풀린다. 꺼진 건물은 0)
 */
function inputsAvailable(w: World, m: MethodDef, levels: number, b?: Building): boolean {
  for (const [g, per] of Object.entries(m.inputs) as [keyof typeof GOODS, number][]) {
    if (inputSpare(w, g, b) < per * levels * INPUT_SUPPLY_MIN) return false;
  }
  return true;
}

/** 대륙에 남는 투입재 g: 공급 − 수요 (이동평균) + 건물 b 가 지금 방식으로 쓰는 양 (레벨 × 가동률, 바꾸면 풀린다. 꺼진 건물은 0) */
function inputSpare(w: World, g: GoodId, b?: Building): number {
  let avail = 0;
  for (const x of w.regions) avail += x.market[g].supplyEma - x.market[g].demandEma;
  if (b?.active) avail += (getMethod(b.typeId, b.methodId).inputs[g] ?? 0) * b.level * b.utilization;
  return avail;
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

function manageBuildings(w: World, c: Company, o: Outlook, pools: Map<string, number>) {
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
          if (m.id === cur.id || laborAvailability(w, r, m, b.level, c.state, pools, b) < MIN_STAFFING()) continue;
          const v = val(m);
          if (v > bestV) { best = m; bestV = v; }
        }
        if (best !== cur) { applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id }); takeFromPool(w, r, best, b.level, c.state, pools, b); }
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
      for (const m of usable) if (m.taxCapacity && m.id !== cur.id && kingdomInputs(w, regionById(w, b.regionId).kingdomId, m, b.level) && value(m) > value(best) * (1 + ADMIN_SWITCH_GAIN)) best = m;
      if (best.id !== cur.id && w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN) applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.id });
      continue;
    }

    // 생산 방식: 레벨당 하루 손익이 SWITCH_GAIN + SWITCH_FLOOR 넘게 나은 방식 (값이 다른 상품을 섞어 내는 방식이 있어 산출 단위로 나누지 않는다) (3주 쿨다운, 투입재를 못 구해 멈췄으면 쿨다운 없이).
    // 일손 기대(지금 재직자 포함)가 기준 미만이거나 공급이 필요의 50% 미만인 방식은 고르지 않는다.
    // 지금 방식이 반도 채워지지 않고 일손도 구할 수 없으면(understaffed), 손익이 낮아도 일손을 구할 수 있는 방식으로 바꾼다
    // TUNE.aiLatentInput: 막 바꾼 생산 건물은 RAMP_WEEKS 동안 굶은 것으로 보지 않는다 (쿨다운 없는 바꾸기를 쓰지 않고 starvedWeeks 도 세지 않는다. 새 원료는 무역으로 오는 데 시간이 든다)
    const settling = !!TUNE.aiLatentInput && w.tick - b.lastSwitchTick < RAMP_WEEKS * TICKS_PER_WEEK;
    const starved = Object.keys(cur.inputs).length > 0 && Object.keys(cur.outputs).length > 0 && b.active && b.last.inputFill < STARVE_FILL && b.last.staffing > 0 && !settling;
    const region = regionById(w, b.regionId);
    const staffable = (m: MethodDef) => laborAvailability(w, region, m, b.level, c.state, undefined, b) >= MIN_STAFFING();
    const understaffed = b.active && b.last.staffing < MIN_STAFFING() && !staffable(cur);
    if (usable.length > 1 && (starved || w.tick - b.lastSwitchTick >= SWITCH_COOLDOWN)) {
      let best = { m: cur, v: starved || understaffed ? -Infinity : current.profit };
      for (const m of usable) {
        if (m.id === cur.id || !inputsAvailable(w, m, b.level, b) || !staffable(m)) continue;
        const v = estimateMethod(w, b.regionId, b.typeId, m.id, wages, c.state).profit;
        if (v > best.v * (1 + SWITCH_GAIN) + SWITCH_FLOOR) best = { m, v };
      }
      if (best.m !== cur && !applyCommand(w, c.id, { type: 'setMethod', buildingId: b.id, methodId: best.m.id }) && aiTrace.on) {
        aiTrace.on(w, c, 'switchIn', b.typeId, best.m.id, b.level, o); aiTrace.on(w, c, 'switchOut', b.typeId, cur.id, -b.level, o);
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
    const bleeding = (hungry || !b.reserve) && harvestFactor(w, b.regionId, BUILDING_BY_ID[b.typeId].land) >= 1 && b.profitEma < 0 && (current.margin < -0.2 || actualMargin < -0.2) && !latentPioneer(w, b);
    b.lossWeeks = bleeding ? b.lossWeeks + 1 : 0;
    if (b.lossWeeks >= 4 && b.utilization > 0.1 + 1e-9) {
      applyCommand(w, c.id, { type: 'setUtilization', buildingId: b.id, utilization: Math.max(0.1, b.utilization - 0.1) });
      b.lossWeeks = 0;
      aiTrace.on?.(w, c, 'lossCut', b.typeId, b.methodId, 0, undefined, b.regionId);
    } else if (b.utilization < 1 && current.margin > 0 && !(TUNE.starveWeeks > 0 && b.last.inputFill < RAISE_FILL)) {
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
    // 국고가 넉넉할 때(treasuryRich, 왕실 공사와 같은 선)만 늘린다. 따로 있던 선 officeRichWeeks(52)는 treasuryHighWeeks(52)와 같아 2026-11-02 wt-simplify 1-F 에서 합쳤다
    const rich = c.debt <= 0 && treasuryRich(w, c, kingdomById(w, c.kingdomId));
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
  // 착공 공사비 52주 이동 합 (지운 발전 투자 devShare 의 바탕). 이제 읽는 곳이 없지만 세계 상태 칸이라 지우면 해시가 바뀐다 (SIMPLIFY_AUDIT 1-D′ 에서 지운다)
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
    if (isGovernment(pick.typeId)) toFront(w, c);
    o.add(getMethod(pick.typeId, pick.methodId), pick.levels, 1 + regionPerk(pick.regionId, pick.typeId), false, pick.regionId);
    return true;
  };
  let blocked: { best: Pick | null } | undefined;
  for (let started = 0; started < TUNE.startsPerWeek; started++) {
    if (!canStart()) break;
    // 민간 상회는 저택·금융가 금고(약정 뺀 돈)로 짓는다
    const cash = free();
    const school = schoolCash(w, c, est.costPerDay);
    if (cash <= 0 && school <= 0) break;
    const out = { best: null as Pick | null };
    const pick = pickProject(w, c, o, cash, out, school, started);
    blocked ??= out;
    if (!pick) break;
    if (!start(pick, 'pick')) break;
  }
  if (blocked?.best) swapLand(w, c, o, blocked.best);
  planTrials(w, c, canStart, free, start);
  reserveLevels(w, c, canStart, free, start);
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
      if (rebuildBlocked(w, r.id, t.id)) continue;
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
  // TUNE.aiAdminValue: 왕실 행정청은 마지막 한 칸이 아니라 평균으로 본다
  if (TUNE.aiAdminValue && c.state && m.taxCapacity) return adminAverage(w, c, o, b, r, m, fill);
  return valueMethod(w, o, r, c, b.typeId, m, 1, true, fill).profit;
}

/**
 * TUNE.aiAdminValue ≥ 1 (이슈 #4, wt-admin4): 왕실 행정청 1레벨의 평균 하루 손익 = 행정청 전체가 걷는 세금 ÷ 왕국 징세 한도 × 이 방식 1레벨 한도 − 1레벨 비용.
 * 걷는 세금 = 걷을 세금(taxOwed, 징수율 전) × 징수율. 한도가 0 이면 곡선의 첫 기울기(1 ÷ 인구)로 본다. 비용 = 짓기 판단과 같은 인건비 + 원료비 (valueMethod, 1레벨).
 * 마지막 한 칸(징수율 곡선의 끝 기울기)으로 보면 세금 수준을 내리거나 세금 기반이 줄 때 한 칸씩 계속 마이너스가 되어 행정청이 0 까지 줄었다.
 * 2 = 걷을 세금을 보통 세금 수준(3단계, 배율 1)으로 환산한다 (taxOwed ÷ 지금 세금 수준 배율)
 */
function adminAverage(w: World, c: Company, o: Outlook, b: Building, r: Region, m: MethodDef, fill?: number): number {
  const k = kingdomById(w, r.kingdomId);
  const v = valueMethod(w, o, r, c, b.typeId, m, 1, true, fill);
  const cost = (v.wageCost + v.inputCost) / v.utilization;
  const n = k.taxDue ?? 0, cap = k.taxCapacity ?? 0;
  if (!(n > 0)) return -cost;
  const perCap = cap > 1e-9 ? collectionRatio(cap, n) / cap : 1 / n;
  const owed = (k.taxOwed ?? 0) / (TUNE.aiAdminValue >= 2 ? Math.max(1e-9, budgetMult(k, 'tax')) : 1);
  return owed * perCap * m.taxCapacity! * TUNE.adminScale * (1 + regionPerk(b.regionId, b.typeId)) * (fill ?? 1) - cost;
}

/** 왕실 행정청 레벨 (철거 대기 뺀 것, TUNE.aiAdminValue: 마지막 레벨은 남긴다) */
function adminLevels(w: World, c: Company): number {
  let n = 0;
  for (const x of w.buildings) if (x.companyId === c.id && getMethod(x.typeId, x.methodId).taxCapacity) n += x.level - (x.shrinking ?? 0);
  return n;
}

/**
 * 철거 판단 (짓기와 같은 주, 같은 전망): 마지막 레벨 손익이 TUNE.shrinkWeeks 주 연속 마이너스면 레벨의 1/4(최소 1)을 철거 대기에 올린다.
 * TUNE.aiAdminValue: 왕실 행정청은 마지막 한 칸 대신 평균 손익(adminAverage)으로 보고, 왕국의 마지막 행정청 레벨은 남긴다.
 * 건물이 적자를 유보 자산으로 메우는 동안은 세지 않는다 (유보 자산이 바닥나야 센다).
 * 건축사무소는 TUNE.officeShrinkWeeks 주를 보고, 그동안 한 번도 사람이 차지 않은 레벨(일하던 주의 최고 충원율 staffPeak 로 센다)과
 * 남는 포인트 몫(많아야 1/4) 중 큰 쪽을 헌다. 쉬다가 다시 뽑는 중이라 비어 있는 레벨은 헐지 않는다. 왕국의 마지막 사무소 레벨은 남긴다.
 * 손실 때문에 헐리는 중인 건물이 다시 이익을 내면 철거를 취소한다. 증설 공사 중인 건물은 보지 않는다
 */
function reviewLevels(w: World, c: Company, o: Outlook, pointsPerDay: number) {
  for (const b of w.buildings) {
    if (b.companyId !== c.id || BUILDING_BY_ID[b.typeId].auto) continue;
    // 생산 건물은 유보 자산으로 늘리고 줄인다 (reserveLevels)
    if (reserveRuled(b)) continue;
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
        let n = Math.max(1, Math.round(b.level * 0.25));
        // TUNE.aiAdminValue: 왕국의 마지막 행정청 레벨은 남긴다 (세법이 바뀌어 세금 기반이 돌아올 때 0 에서 다시 짓지 않게)
        if (TUNE.aiAdminValue && c.state && m.taxCapacity) n = Math.min(n, adminLevels(w, c) - 1);
        if (n >= 1 && !applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: n })) { noteDemolish(w, b); aiTrace.on?.(w, c, 'shrink', b.typeId, b.methodId, -n, undefined, b.regionId); }
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
      if (n >= 1 && !applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: n })) { noteDemolish(w, b); aiTrace.on?.(w, c, 'officeShrink', b.typeId, b.methodId, -n, undefined, b.regionId); }
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
  if (!applyCommand(w, c.id, { type: 'demolish', buildingId: worst.b.id, levels: n })) { worst.b.swap = true; noteDemolish(w, worst.b); aiTrace.on?.(w, c, 'swap', worst.b.typeId, worst.b.methodId, -n, undefined, worst.b.regionId); }
}

// ---------------------------------------------------------------- 유보 기준 증설·철거와 새 투자 (2026-10-25, DECISIONS 7-27)
//
// 사용자 요청 (2026-10-25): "유보액을 기준으로 건물을 늘리고 줄였으면 좋겠는데. + 신규투자". AI가 시장을 전망하지 않고, 건물의 유보 자산과 지금 시장 신호만 본다.
// - 생산 건물 (자동·정부 건물·무역소가 아니고 유보 자산을 쌓는 건물): 매주 확률 TUNE.reserveGrowMax × clamp((유보 ÷ 상한 − TUNE.reserveGrowFrom) ÷ (1 − TUNE.reserveGrowFrom))로 1레벨 증설
//   (확률은 AI 난수 aiRand 'grow'),
//   유보 자산 0이고 주간 손익 < 0 이 TUNE.shrinkWeeks 주 이어지면 1레벨 철거 (마지막 레벨이면 건물이 없어진다). 그 밖에는 아무것도 하지 않는다.
// - 새 투자: 그 상품을 내는 건물이 없는 곳에 1레벨 시험 공사 (잠재 수요 갈래 (다)는 planTrials 주석). (가) 지역 시장값 ≥ 기본가 × TRIAL_PRICE 가 RESERVE_STREAK 주 이어진 상품 (그 지역에 생산 건물이 없을 때),
//   (나) 투입 충족 < STARVE_FILL 이 RESERVE_STREAK 주 이어진 건물(Building.starvedWeeks)의 가장 모자란 투입재 (그 왕국에 생산 건물이 없을 때. 광석 → 철 → 공구 사슬을 연다).
//   다 지은 뒤에는 위 증설·철거 규칙이 맡는다. 방식 바꾸기는 그대로다 (manageBuildings)
/** AI 점수 흔들기 폭: 연구·착공 점수에 1 ± 이 값의 고른 무작위를 곱한다 (0.85~1.15, 첫 커밋 9c76862 부터의 값, 근거 없음) */
export const AI_JITTER = 0.15;
/** 비싼 주·굶은 주를 이 주 수 이어서 본다 (사용자 합의 값, 근거 없음) */
export const RESERVE_STREAK = 4;
/** 새 투자 (가): 지역 시장값이 기본가의 이 배수 이상 (사용자 합의 값, 근거 없음) */
export const TRIAL_PRICE = 1.25;

/**
 * 다시 짓기 기다림 (TUNE.aiRebuildWait > 0, 이슈 #7): 생산 건물(waitsRebuild)의 AI 철거 명령이 받아들여질 때마다 그 지역·종류의 날을 적는다 (Region.demoAt).
 * 모든 AI 철거 길(유보 철거·reviewLevels·사무소·학교·땅 바꾸기)이 부른다. 끔이면 아무것도 하지 않는다.
 * 정부 건물·무역소는 따르지 않는다: 모든 종류에 건 비교(b5fc269, 20년 × 시드 1·2, 26·52·104주)에서 무역소·행정청 철거가 줄지 않았다 (DESIGN 11 aiRebuildWait)
 */
function noteDemolish(w: World, b: Building) {
  if (TUNE.aiRebuildWait > 0 && waitsRebuild(b.typeId)) (regionById(w, b.regionId).demoAt ??= {})[b.typeId] = w.tick;
}

/** 다시 짓기 기다림을 따르는 종류: 생산 건물 (정부 건물·무역소·자동 건물이 아닌 것, reserveRuled 와 같은 종류 거르기) */
function waitsRebuild(typeId: string): boolean {
  return !BUILDING_BY_ID[typeId].auto && !isGovernment(typeId) && typeId !== TRADING_POST;
}

/**
 * 그 지역에서 그 생산 건물 종류의 AI 철거 명령이 TUNE.aiRebuildWait 주 안에 있었는가: 그러면 AI 는 그 지역에 그 종류를 짓지도 늘리지도 않는다
 * (planTrials·reserveLevels·growRegion·secureGovInputs). 왕실·민간 어느 쪽이 헐었든 같은 지역·종류면 막는다
 */
function rebuildBlocked(w: World, regionId: number, typeId: string): boolean {
  if (!(TUNE.aiRebuildWait > 0) || !waitsRebuild(typeId)) return false;
  const t = regionById(w, regionId).demoAt?.[typeId];
  return t != null && w.tick - t < TUNE.aiRebuildWait * TICKS_PER_WEEK;
}

/** 유보 기준으로 늘리고 줄이는 건물: 자동·정부 건물(행정청·학교·사무소)·무역소가 아니고 유보 자산을 쌓는 생산 건물 */
export function reserveRuled(b: Building): boolean {
  if (BUILDING_BY_ID[b.typeId].auto || isGovernment(b.typeId) || b.typeId === TRADING_POST) return false;
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
 * 새 투자: (가) 자기 지역에서 값이 RESERVE_STREAK 주 기본가 × TRIAL_PRICE 이상이고 그 지역에 생산 건물이 없는 상품,
 * (나) 왕국 안에서 굶는 건물(투입 충족 < STARVE_FILL 이 RESERVE_STREAK 주)의 가장 모자란 투입재(그 지역 공급 ÷ 수요 이동평균이 가장 작은 것)이고 왕국에 생산 건물이 없는 상품.
 * (가)·(나)는 상품마다 1레벨을 짓는다: (가)는 그 지역, (나)는 굶는 건물의 지역부터 자기 지역 id 순. 그 상품을 내는 방식 중 기술·땅(매장량)·일손({@link MIN_STAFFING})이 되고
 * 회사에 그 종류 건물이 그 지역에 없는 것에서 지금 시장값 하루 손익(estimateMethod)이 가장 큰 것. 주에 TUNE.startsPerWeek 건까지
 * (다) 잠재 수요 latentWants (TUNE.aiLatentInput): 소비자 지역부터 그 양을 낼 레벨까지 (1레벨 제한 없음), 값 2·3 의 왕실은 일손을 보지 않고 국고로 짓는다 (DESIGN 10)
 */
function planTrials(w: World, c: Company, canStart: () => boolean, free: () => number, start: (p: Pick, path: string) => boolean) {
  // 빚이 현금보다 많은 왕실은 생산 건물을 새로 짓지 않는다
  if (c.state && c.debt > c.cash) return;
  const own = ownRegions(w, c);
  const kingdom = new Set(own.map((r) => r.id));
  const wants: { g: GoodId; regions: Region[]; qty?: number }[] = [];
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
  if (TUNE.aiLatentInput === 1 || TUNE.aiLatentInput === 3 || (TUNE.aiLatentInput === 2 && c.state)) wants.push(...latentWants(w, c, own, kingdom, seen));
  let started = 0;
  const pools = new Map<string, number>();
  for (const { g, regions, qty } of wants) {
    if (started >= TUNE.startsPerWeek || !canStart()) break;
    let best: Pick | null = null;
    // 왕실이 여는 체인(aiLatentInput 2·3): 곳간을 보지 않고 웃돈으로 데려오며 (crownPioneerPremium), 돈은 행정청 원료 공사(secureGovInputs)처럼 국고가 조이지 않으면 남길 돈 선을 넘어서 쓴다
    const pay = !!qty && TUNE.aiLatentInput >= 2 && c.state;
    const money = () => (pay ? (treasuryTight(w, c, kingdomById(w, c.kingdomId)) ? 0 : c.cash - committedCost(w, c)) : free());
    for (const r of regions) {
      for (const t of BUILDING_TYPES) {
        if (!canBuildType(c, t) || isGovernment(t.id) || t.id === TRADING_POST) continue;
        if (harvestFactor(w, r.id, t.land) < 1 || roomFor(w, r.id, t.id) < 1 || rebuildBlocked(w, r.id, t.id)) continue;
        if (w.buildings.some((x) => x.companyId === c.id && x.regionId === r.id && x.typeId === t.id)) continue;
        const cost = constructionEstimate(w, c, t.id).cost;
        if (!Number.isFinite(cost) || money() < cost) continue;
        for (const m of availableMethods(c, t.id)) {
          if (!((m.outputs[g] ?? 0) > 0) || (!pay && laborAvailability(w, r, m, 1, c.state, pools) < MIN_STAFFING())) continue;
          const v = estimateMethod(w, r.id, t.id, m.id, wagesAt(c, t.id, w, r.id), c.state).profit;
          if (!best || v > best.score) {
            // 잠재 수요(qty)는 그 양을 낼 레벨까지, 땅·돈·일손이 되는 만큼 짓는다. 다른 갈래는 1레벨
            let levels = qty ? Math.max(1, Math.min(Math.ceil(qty / m.outputs[g]!), Math.floor(roomFor(w, r.id, t.id)), Math.floor(money() / cost))) : 1;
            while (!pay && levels > 1 && laborAvailability(w, r, m, levels, c.state, pools) < MIN_STAFFING()) levels--;
            best = { regionId: r.id, typeId: t.id, methodId: m.id, levels, score: v };
          }
        }
      }
      if (best) break;
    }
    if (best && start(best, qty ? 'latentTrial' : 'trial')) started++;
  }
}

/**
 * 잠재 수요 (AI 판단, TUNE.aiLatentInput): 왕국의 건물이 기술로 열린 방식을 원료가 없어서만 못 쓰고, 일손이 되고 지금 값으로 지금 방식보다 벌 때 (방식 바꾸기와 같은 문턱),
 * 그 원료는 잠재 수요다. 수요가 0 이면 값이 기본가에 머물러 새 투자 갈래 (가)·(나)가 영영 켜지지 않기 때문이다. 양은 그 원료가 모자란 건물 중 가장 작은 건물이 바꿀 수 있는 만큼 (inputsAvailable 문턱).
 * 왕국마다 그날 한 번 센다 (세계에서 다시 계산되는 값이라 저장하지 않는다)
 */
function latentNeed(w: World, kingdomId: number): LatentNeed {
  let memo = latentMemo.get(w);
  if (!memo || memo.tick !== w.tick) { memo = { tick: w.tick, by: new Map() }; latentMemo.set(w, memo); }
  const hit = memo.by.get(kingdomId);
  if (hit) return hit;
  const need: LatentNeed = { short: new Map(), wanted: new Set() };
  const used = new Set<GoodId>();
  for (const b of w.buildings) if (b.level > 0 && regionById(w, b.regionId).kingdomId === kingdomId) for (const g of Object.keys(getMethod(b.typeId, b.methodId).inputs) as GoodId[]) used.add(g);
  for (const b of w.buildings) {
    const region = regionById(w, b.regionId);
    const now = getMethod(b.typeId, b.methodId);
    if (region.kingdomId !== kingdomId || !b.active || BUILDING_BY_ID[b.typeId].auto || (isGovernment(b.typeId) && !now.construction) || b.typeId === TRADING_POST) continue;
    const oc = companyById(w, b.companyId);
    if (!oc) continue;
    const wages = wagesAt(oc, b.typeId, w, b.regionId);
    let cur: number | undefined;
    for (const m of availableMethods(oc, b.typeId)) {
      if (m.id === b.methodId) continue;
      const inputs = Object.entries(m.inputs) as [GoodId, number][];
      for (const [g] of inputs) if (!used.has(g)) need.wanted.add(g);
      const short = inputs.filter(([g, per]) => inputSpare(w, g, b) < per * b.level * INPUT_SUPPLY_MIN);
      if (!short.length || laborAvailability(w, region, m, b.level, oc.state, undefined, b) < MIN_STAFFING()) continue;
      // 건축사무소는 하루 포인트로, 나머지는 방식 바꾸기와 같은 손익 문턱으로 본다 (manageBuildings)
      if (now.construction) { if (!((m.construction ?? 0) > now.construction)) continue; }
      else {
        cur ??= estimateMethod(w, b.regionId, b.typeId, b.methodId, wages, oc.state).profit;
        if (!(estimateMethod(w, b.regionId, b.typeId, m.id, wages, oc.state).profit > cur * (1 + SWITCH_GAIN) + SWITCH_FLOOR)) continue;
      }
      for (const [g, per] of short) {
        const qty = per * b.level * INPUT_SUPPLY_MIN - inputSpare(w, g, b), old = need.short.get(g);
        if (!old || qty < old.qty) need.short.set(g, { qty, region });
      }
    }
  }
  memo.by.set(kingdomId, need);
  return need;
}
/** short: 모자란 잠재 수요 원료와 양·소비자 지역. wanted: 기술로 열린 방식이 쓰는데 왕국에 아직 쓰는 건물이 없는 상품 (선구 건물을 소비자가 바꿀 때까지 남긴다) */
interface LatentNeed { short: Map<GoodId, { qty: number; region: Region }>; wanted: Set<GoodId> }
const latentMemo = new WeakMap<World, { tick: number; by: Map<number, LatentNeed> }>();

/** 상품 g 를 내는 모든 방식(회사 c 가 아는 것)이 쓰는 원료: 체인의 윗단 */
function upstreamOf(c: Company, g: GoodId): { h: GoodId; per: number }[] {
  const ways = BUILDING_TYPES.filter((t) => canBuildType(c, t) && !isGovernment(t.id)).flatMap((t) => availableMethods(c, t.id).filter((m) => (m.outputs[g] ?? 0) > 0));
  if (!ways.length) return [];
  return (Object.entries(ways[0].inputs) as [GoodId, number][]).filter(([h]) => ways.every((m) => (m.inputs[h] ?? 0) > 0)).map(([h, per]) => ({ h, per: per / ways[0].outputs[g]! }));
}

const marketSupply = (w: World, g: GoodId) => w.regions.reduce((a, r) => a + r.market[g].supplyEma, 0);

/**
 * 잠재 수요가 부르는 새 투자: 왕국에 생산 건물이 없는 잠재 수요 원료. 윗단 원료가 아직 시장에 없으면 윗단부터 짓고, 나올 때까지 아랫단은 기다린다
 * (같이 지으면 아랫단이 원료 없이 임금만 내다 철거된다: 시드 1 10년, 2026-11-05). 양은 latentNeed 의 양을 윗단 비율로 환산한다
 */
function latentWants(w: World, c: Company, own: Region[], kingdom: Set<number>, seen: Set<GoodId>): { g: GoodId; regions: Region[]; qty: number }[] {
  const out: { g: GoodId; regions: Region[]; qty: number }[] = [];
  const visit = (g: GoodId, qty: number, region: Region) => {
    if (seen.has(g) || makes(w, kingdom, g)) return;
    seen.add(g);
    let wait = false;
    for (const { h, per } of upstreamOf(c, g)) if (!(marketSupply(w, h) > 0)) { wait = true; visit(h, qty * per, region); }
    if (!wait) out.push({ g, regions: [region, ...own.filter((r) => r.id !== region.id)], qty });
  };
  for (const [g, x] of latentNeed(w, c.kingdomId).short) visit(g, x.qty, x.region);
  return out;
}

/** 잠재 수요 체인의 선구 건물: 왕국에서 혼자 내는 상품이 잠재 수요이거나 그 윗단이면, 소비자가 바꿀 때까지 적자여도 남기고 가동률을 깎지 않는다 */
function latentPioneer(w: World, b: Building): boolean {
  if (!TUNE.aiLatentInput) return false;
  const k = regionById(w, b.regionId).kingdomId;
  const { short, wanted } = latentNeed(w, k);
  if (!short.size && !wanted.size) return false;
  const gov = companyById(w, kingdomById(w, k).governmentId);
  if (!gov) return false;
  const chain = new Set<GoodId>();
  const up = (g: GoodId) => { if (chain.has(g)) return; chain.add(g); for (const { h } of upstreamOf(gov, g)) up(h); };
  for (const g of short.keys()) up(g);
  for (const g of wanted) up(g);
  const goods = (Object.keys(getMethod(b.typeId, b.methodId).outputs) as GoodId[]).filter((g) => chain.has(g));
  return goods.some((g) => !w.buildings.some((x) => x !== b && x.level > 0 && regionById(w, x.regionId).kingdomId === k && (getMethod(x.typeId, x.methodId).outputs[g] ?? 0) > 0));
}

/**
 * 유보 기준 증설·철거 (매주 배당 정산 뒤): 생산 건물마다 증설 확률이 뽑힌 주(Building.richWeeks)와
 * 바닥난 적자 주(유보 자산 0, 주간 손익 = profitEma × 7 < 0. 기상 조건이 걸린 주와 공사로 생긴 지(시작 건물은 0일부터) RAMP_WEEKS 주 안은 세지 않는다)를 센다.
 * 바닥난 적자가 TUNE.shrinkWeeks 주면 1레벨 철거 대기 (정부 건물·무역소의 철거 판단 reviewLevels 와 같은 주 수), 증설 확률(TUNE.reserveGrowMax, 아래)이 뽑히면 땅(매장량)이 있고 돈이 되면 1레벨 증설 (못 하면 다음 주에 다시 본다).
 * TUNE.aiGlutSD > 0 이면 증설 확률이 뽑혀도 그 지역 그 방식 산출의 예상 공급 ÷ 수요(methodSD)가 그 값을 넘으면 그 주는 증설하지 않는다 (오버홀 03 5-1).
 * 증설 공사 중이거나 철거 중인 건물은 세지 않는다. 돈: 왕실은 새 공사에 쓸 수 있는 돈(freeCash), 민간은 저택·금융가 금고(공사 명령이 낼 곳을 고른다)
 */
function reserveLevels(w: World, c: Company, canStart: () => boolean, free: () => number, start: (p: Pick, path: string) => boolean) {
  const inDebt = c.state && c.debt > c.cash;
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
    let rich = aiRand(w, 'grow', keyCompany(c.id), keyRegion(b.regionId), keyStr(b.typeId), keyStr(b.methodId), keyWeek(w.tick), keyIdx(idx)) < pGrow;
    // 과잉 검사 (TUNE.aiGlutSD > 0, 오버홀 03 5-1): 그 지역 그 방식 산출의 예상 공급 ÷ 수요 (산출이 여럿이면 기본가 값으로 가중 평균, methodSD)
    // (공사 중 레벨 산출 포함, projectedSD)가 임계를 넘으면 이번 주 증설 확률 0 (찬 주로 세지 않는다). aiRand 는 키 해시라 막아도 다른 난수가 밀리지 않는다
    if (rich && TUNE.aiGlutSD > 0) {
      const sd = methodSD(w, b.regionId, b.typeId, b.methodId);
      if (sd !== null && sd > TUNE.aiGlutSD) { rich = false; aiTrace.on?.(w, c, 'glutBlock', b.typeId, b.methodId, 0, undefined, b.regionId); }
    }
    // 새 건물(시작 건물은 0일에 생긴 것으로 본다)은 RAMP_WEEKS 동안 사람을 뽑으며 내는 적자를 세지 않는다
    const ramping = w.tick - (b.builtTick ?? 0) < RAMP_WEEKS * TICKS_PER_WEEK;
    const broke = res <= 0 && b.profitEma * TICKS_PER_WEEK < 0 && !ramping && harvestFactor(w, b.regionId, BUILDING_BY_ID[b.typeId].land) >= 1;
    // richWeeks 는 지운 reserveGrowMax 0 갈래만 읽던 상태 칸이다. 지우면 세계 해시가 바뀌어 남긴다 (SIMPLIFY_AUDIT 1-D′)
    const nr = rich ? (b.richWeeks ?? 0) + 1 : 0, nb = broke ? (b.brokeWeeks ?? 0) + 1 : 0;
    if (nr) b.richWeeks = nr; else delete b.richWeeks;
    if (nb) b.brokeWeeks = nb; else delete b.brokeWeeks;
    if (nb >= TUNE.shrinkWeeks && keepLast(w, b)) { aiTrace.on?.(w, c, 'keepLast', b.typeId, b.methodId, 0, undefined, b.regionId); delete b.brokeWeeks; continue; }
    if (nb >= TUNE.shrinkWeeks) {
      if (!applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: 1 })) { noteDemolish(w, b); aiTrace.on?.(w, c, 'reserveShrink', b.typeId, b.methodId, -1, undefined, b.regionId); }
      delete b.brokeWeeks;
      continue;
    }
    if (!rich || inDebt || !canStart()) continue;
    const at = growRegion(w, c, b);
    if (roomFor(w, at, b.typeId) < 1 || rebuildBlocked(w, at, b.typeId)) continue;
    const cost = constructionEstimate(w, c, b.typeId).cost;
    if (!c.state && !c.isPlayer && Number.isFinite(cost) && free() < cost) fundFromReserve(w, c, b, at, cost - free());
    if (!Number.isFinite(cost) || free() < cost) continue;
    if (start({ regionId: at, typeId: b.typeId, methodId: b.methodId, levels: 1, score: 0 }, 'reserve')) delete b.richWeeks;
  }
}

interface Pick { regionId: number; typeId: string; methodId: string; levels: number; score: number }

/**
 * 증설 위치 (AI 판단, 2026-11-01 마이크로 시제품 microB S5, 2026-11-02 기본): 유보 증설이 뽑힌 건물 b 의 1레벨을 지을 지역.
 * 후보 = 왕국 지역 중 그 종류 부지·땅(매장량, 기상 조건 없음)이 있고 일손이 되는 곳 (laborAvailability ≥ MIN_STAFFING: 직종마다 그 지역 구직 가능 인원 ÷ 필요,
 * 기술자·전문가는 자격자만 센다). 그중 방식 산출의 지역 예상 공급 ÷ 수요(methodSD, 과잉 검사와 같은 값)가 가장 낮은 곳, 같으면 b 의 지역, 그다음 지역 순서.
 * 수요가 없는 지역(methodSD null)은 후보가 아니다. 후보가 없으면 b 의 지역 (끈 것과 같다).
 * 같은 지역이면 b 를 늘리고, 다른 지역이면 그 지역의 같은 종류·방식 건물을 늘리거나 새로 짓는다 (start → ownBuildingAt).
 * 마이크로 시제품과 다른 점: 수요 없는 지역을 S/D 0 으로 보지 않고 뺀다, 같은 값이면 b 의 지역을 먼저 본다
 */
function growRegion(w: World, c: Company, b: Building): number {
  const m = getMethod(b.typeId, b.methodId), land = BUILDING_BY_ID[b.typeId].land;
  const own = ownRegions(w, c);
  let best = b.regionId, low = Infinity;
  for (const r of [...own.filter((x) => x.id === b.regionId), ...own.filter((x) => x.id !== b.regionId)]) {
    if (roomFor(w, r.id, b.typeId) < 1 || harvestFactor(w, r.id, land) < 1 || rebuildBlocked(w, r.id, b.typeId)) continue;
    if (laborAvailability(w, r, m, 1, c.state) < MIN_STAFFING()) continue;
    const sd = methodSD(w, r.id, b.typeId, b.methodId);
    if (sd !== null && sd < low) { low = sd; best = r.id; }
  }
  return best;
}

/**
 * 유보로 증설비 (AI 판단, 2026-11-01 마이크로 시제품 microB S8, 2026-11-02 기본): 민간 AI 회사 c 의 건물 b 증설이 저택·금융가 금고(ownerFunds)가 need 만큼 모자라 막힐 때,
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
 * 마지막 공급자 지킴 (AI 판단, 2026-11-01 마이크로 시제품 microB S7, 2026-11-02 기본): 건물 b 의 남는 레벨(레벨 − 철거 대기)이 1 이하이고,
 * b 가 왕국에서 어떤 산출 상품을 내는 마지막 건물이며 (자동 건물 제외, 남는 레벨 > 0 인 건물만 센다), 왕국의 다른 건물(자동 제외)이 그 상품을 원료로 쓰면 true. 산출이 여럿이면 상품마다 본다.
 * 잠재 수요 선구 건물(latentPioneer)은 아직 쓰는 건물이 없어도 true (TUNE.aiLatentInput).
 * AI 철거 경로(reserveLevels 유보 철거)는 이런 건물을 헐지 않는다 (적자여도).
 * 이유 (마이크로 기본 세계, 시드 1~8): 공방이 유보 0·적자로 헐리면 공구가 끊겨 공구를 쓰는 건물이 차례로 무너졌다.
 * 소작지(자동 건물)가 같은 상품을 내도 세지 않는다. 공사 중인 새 생산 건물도 세지 않는다
 */
function keepLast(w: World, b: Building): boolean {
  if (b.level - (b.shrinking ?? 0) > 1) return false;
  if (latentPioneer(w, b)) return true;
  const kingdomId = regionById(w, b.regionId).kingdomId;
  const goods = Object.keys(getMethod(b.typeId, b.methodId).outputs) as GoodId[];
  const others = new Set<GoodId>(), used = new Set<GoodId>();
  for (const x of w.buildings) {
    if (x === b || x.level - (x.shrinking ?? 0) <= 0 || BUILDING_BY_ID[x.typeId].auto || regionById(w, x.regionId).kingdomId !== kingdomId) continue;
    const m = getMethod(x.typeId, x.methodId);
    for (const g of goods) {
      if ((m.outputs[g] ?? 0) > 0) others.add(g);
      if ((m.inputs[g] ?? 0) > 0) used.add(g);
    }
  }
  return goods.some((g) => used.has(g) && !others.has(g));
}

// ---------------------------------------------------------------- 넘침 퇴출 (TUNE.aiTrimSD > 0, 이슈 #11 F3, 진단 .tmp/wt/grain11/.tmp/grain11/RESULT.md 4장, 기본 0 = 끔)
//
// 진단 (wt-grain11, main 9ba5acc): 농부 임금 바닥이 곡물값을 따라가 농장 손익이 값보다 팔린 비율에 반응하고, 손익분기 팔린 비율 약 0.65 라
// S/D 약 1.5 까지 흑자다. 진입은 과잉 검사(aiGlutSD) 하나가 막고 나가는 규칙은 켜지지 않아 S/D 가 문턱 바로 아래에 머문다.
// A2(sellDemo)처럼 문턱 위에서 주마다 헐면 마이크로에서 농장이 8 → 2~4레벨로 헐렸다가 다시 지어졌다 (F2). 그래서 헐기 전에
// "1레벨을 헐어도 진입 문턱 이상인가"를 보고, 헌 뒤에는 공급 이동평균이 따라올 때까지 그 지역 그 상품을 쉰다. 세계 규칙은 그대로다.

/**
 * 넘침 퇴출 뒤 쉬는 주: 헐린 레벨이 사라지는 1주 + 공급 이동평균(하루 FLOW_EMA)이 그 감소의 90% 를 따라가는 주 (올림).
 * 남은 몫 (1 − FLOW_EMA)^일 이 0.1 이하가 되는 날을 곱셈으로 센다 (Math.log 는 엔진마다 다를 수 있어 쓰지 않는다, test/core/mathgrep)
 */
export const TRIM_WAIT_WEEKS = (() => { let left = 1, d = 0; while (left > 0.1) { left *= 1 - FLOW_EMA; d++; } return 1 + Math.ceil(d / TICKS_PER_WEEK); })();

/**
 * 건물 b 의 1레벨 일꾼 식구가 지역 시장에서 사는 상품 g 의 하루 양: b 에서 일하는 pop 마다
 * 그 지역 그 직종 g 수요 이동평균(demandByEma "pop:직종") × (그 pop 인구 ÷ 그 지역 그 직종 인구), 합 ÷ 레벨.
 * 같은 직종 안 부의 차이는 보지 않는다 (직종 평균으로 나눈다)
 */
function workerDemandPerLevel(w: World, b: Building, g: GoodId, popsAt: Map<number, Pop[]>, classSize: Map<string, number>): number {
  const by = regionById(w, b.regionId).market[g].demandByEma;
  if (!by || b.level <= 0) return 0;
  let d = 0;
  for (const p of popsAt.get(b.id) ?? []) {
    const n = classSize.get(`${p.regionId}|${p.prof}`) ?? 0;
    if (n > 0) d += (by[`pop:${p.prof}`] ?? 0) * p.size / n;
  }
  return d / b.level;
}

/**
 * 넘침 퇴출 (TUNE.aiTrimSD > 0, 매주 runAi 앞에서, 회사 판단보다 먼저, 0일부터 TUNE.aiTrimFrom 주가 지난 뒤):
 * 지역·상품마다, 그 지역에서 그 상품(mainOutput)을 내는 AI 회사의 유보 기준 생산 건물이 있고 기다림(Region.trim)이 끝났고 그 묶음에 철거 대기가 없으면
 * 1) 예상 공급 ÷ 수요 sd = projectedSD (상품 하나의 값, 산출이 하나인 방식은 증설 과잉 검사 methodSD 와 같다: 공급 이동평균 + 공사 중 산출, ÷ 수요 이동평균) 가 aiTrimSD 이상이면
 * 2) 증설 공사 중·새 건물(RAMP_WEEKS 안)·마지막 공급자(keepLast)가 아닌 건물 중 레벨당 장기 손익이 가장 나쁜 b 를 고르고
 * 3) 1레벨을 헐 때 예상 (sd × D − o) ÷ (D − d) 가 증설 문턱 aiGlutSD (0 이면 1) 이상일 때만 1레벨 헌다.
 *    o = b 의 어제 g 산출 ÷ 레벨, d = 그 레벨 일꾼 식구가 사던 g (workerDemandPerLevel), D = 수요 이동평균.
 * 헐면 TRIM_WAIT_WEEKS 주 동안 그 지역 그 상품은 다시 보지 않는다 (Region.trim). TUNE.aiTrimPause > 0 이면 기다림이 끝난 주에
 * 예상 공급 ÷ 수요가 헐 때(sd)보다 내려가지 않았으면 헐어도 줄지 않는 곳으로 보고 aiTrimPause 주 더 쉰다 (헐린 일꾼이 소작으로 돌아가 팔고,
 * 일자리·임금이 줄어 사는 양도 줄어 d 보다 수요가 더 준다: 마이크로 진단 .tmp/wt/grain11/.tmp/grain11/f3). 플레이어 건물은 헐지 않지만 그 공급은 S/D 에 들어간다.
 * 같은 값이면 w.buildings 순서가 앞선 건물 (결정성)
 */
function trimExit(w: World) {
  if (w.tick < TUNE.aiTrimFrom * TICKS_PER_WEEK) return;
  const exit = TUNE.aiTrimSD, entry = TUNE.aiGlutSD > 0 ? TUNE.aiGlutSD : 1;
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
  let popsAt: Map<number, Pop[]> | null = null, classSize: Map<string, number> | null = null;
  const pops = () => {
    if (!popsAt || !classSize) {
      popsAt = new Map(); classSize = new Map();
      for (const p of w.pops) {
        if (p.size <= 0) continue;
        const k = `${p.regionId}|${p.prof}`;
        classSize.set(k, (classSize.get(k) ?? 0) + p.size);
        if (!p.work) continue;
        const l = popsAt.get(p.work);
        if (l) l.push(p); else popsAt.set(p.work, [p]);
      }
    }
    return { popsAt, classSize };
  };
  for (const r of w.regions) {
    // 기다림이 끝난 상품: 헐 때 S/D 를 적어 둔 것은 지금 예상 S/D 와 견줘, 내려가지 않았으면 aiTrimPause 주 더 쉰다
    if (r.trim) {
      for (const g of Object.keys(r.trim) as GoodId[]) {
        const t = r.trim[g]!;
        if (t.until > w.tick) continue;
        delete r.trim[g];
        if (t.sd == null || !(TUNE.aiTrimPause > 0)) continue;
        const now = projectedSD(w, r.id, g);
        if (now !== null && now >= t.sd) {
          r.trim[g] = { until: w.tick + TUNE.aiTrimPause * TICKS_PER_WEEK };
          const b = groups.get(`${r.id}|${g}`)?.[0], c = b && ai.get(b.companyId);
          if (b && c) aiTrace.on?.(w, c, 'trimStop', b.typeId, b.methodId, 0, undefined, r.id);
        }
      }
      if (!Object.keys(r.trim).length) delete r.trim;
    }
    for (const g of GOOD_IDS) {
      const list = groups.get(`${r.id}|${g}`);
      if (!list || r.trim?.[g] || list.some((x) => x.shrinking)) continue;
      const sd = projectedSD(w, r.id, g);
      if (sd === null || sd < exit) continue;
      const b = worstPerLevel(list.filter((x) => !expanding(w, x) && w.tick - (x.builtTick ?? 0) >= RAMP_WEEKS * TICKS_PER_WEEK && !keepLast(w, x)));
      const c = b && ai.get(b.companyId);
      if (!b || !c) continue;
      const D = r.market[g].demandEma;
      const o = (b.last.output[g] ?? 0) / b.level;
      const { popsAt: pa, classSize: cs } = pops();
      const d = workerDemandPerLevel(w, b, g, pa, cs);
      const after = D - d > FLOW_ZERO ? (sd * D - o) / (D - d) : Infinity;
      if (after < entry) { aiTrace.on?.(w, c, 'trimHold', b.typeId, b.methodId, 0, undefined, r.id); continue; }
      if (!applyCommand(w, c.id, { type: 'demolish', buildingId: b.id, levels: 1 })) {
        noteDemolish(w, b);
        (r.trim ??= {})[g] = { until: w.tick + TRIM_WAIT_WEEKS * TICKS_PER_WEEK, sd };
        aiTrace.on?.(w, c, 'trimDemo', b.typeId, b.methodId, -1, undefined, r.id);
      }
    }
  }
}

const aiCompanies = (w: World) => new Map(w.companies.filter((c) => !c.isPlayer).map((c) => [c.id, c] as const));
const perLevelProfit = (b: Building) => b.profitEma / Math.max(1, b.level);
/** 레벨당 장기 손익이 가장 나쁜 건물 (같으면 목록에서 앞선 것 = w.buildings 순서) */
const worstPerLevel = (list: Building[]) => list.reduce<Building | null>((x, b) => (!x || perLevelProfit(b) < perLevelProfit(x) ? b : x), null);
const expanding = (w: World, b: Building) => w.constructions.some((k) => k.targetBuildingId === b.id);

/**
 * 모든 후보를 같은 기준으로: 장기 손익 / 공사비. 수익률이 기준의 1.25배를 넘는 가장 큰 덩어리를 고른다.
 * 학교는 schoolFree(schoolCash)로 짓고, 공사비 + 그 레벨 인건비 TUNE.treasuryLowWeeks 주치가 있어야 한다
 */
export function pickProject(w: World, c: Company, o: Outlook, free: number, blocked?: { best: Pick | null }, schoolFree = 0, call = 0): Pick | null {
  let best: Pick | null = null;
  // 후보의 AI 난수 키: (회사, 지역, 종류, 방식, 주, 이번 주 몇 번째 부름 call). 같은 주에 여러 번 불리므로(주에 startsPerWeek 번) 부름 순번을 넣어 부를 때마다 새로 흔든다
  const jitter = (tag: 'pick', regionId: number, typeId: string, methodId: string) =>
    aiRand(w, tag, keyCompany(c.id), keyRegion(regionId), keyStr(typeId), keyStr(methodId), keyWeek(w.tick), keyIdx(call));
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
  // 빚이 현금보다 많은 왕실은 생산 건물을 짓지 않는다 (정부 건물·학교는 그대로)
  const inDebt = c.state && c.debt > c.cash;
  const overLocal = (regionId: number, typeId: string, m: MethodDef, levels: number) => GOOD_IDS.some((g) => {
    const out = m.outputs[g] ?? 0;
    if (!(out > 0) || !GOODS[g].perishable) return false;
    const x = o.local(g, regionId);
    return out * levels * (1 + regionPerk(regionId, typeId)) > x.demand - x.supply;
  });
  for (const r of ownRegions(w, c)) {
    for (const t of BUILDING_TYPES) {
      if (t.id === 'builder' || !canBuildType(c, t)) continue;
      if (inDebt && !isGovernment(t.id)) continue;
      // 생산 건물은 전망으로 짓지 않는다 (새 투자 planTrials, 증설·철거 reserveLevels). 정부 건물·무역소만 여기서 고른다
      if (!isGovernment(t.id) && t.id !== TRADING_POST) continue;
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
        if (!blocked || (t.deposit && depositFree(w, r.id, t.deposit) < 1)) continue;
        for (const m of availableMethods(c, t.id)) {
          if (otherMethod(m)) continue;
          if (laborAvailability(w, r, m, 1, c.state, pools) < MIN_STAFFING()) continue;
          const e = m.seats ? schoolValuation(w, c, r, m, 1, schoolSeats(w, r.id)) : t.id === TRADING_POST ? tradeValuation(w, c, r, m, 1) : valueMethod(w, o, r, c, t.id, m, 1);
          const roi = (e.profit * TICKS_PER_YEAR) / perLevel;
          if (e.profit > 0 && roi > MIN_ROI() && (!blocked.best || roi > blocked.best.score)) blocked.best = { regionId: r.id, typeId: t.id, methodId: m.id, levels: 1, score: roi };
        }
        continue;
      }
      for (const m of availableMethods(c, t.id)) {
        if (otherMethod(m)) continue;
        const cap = newMethod(m) ? MIXED_LEVELS : Infinity;
        let choice: { levels: number; roi: number } | null = null, top: { levels: number; roi: number } | null = null;
        for (const levels of CHUNKS) {
          if (levels > room || levels > cap || budget < perLevel * levels) continue;
          if (m.seats && budget < (perLevel + wageCostOf(m, c.stateWages ?? c.wages, c.state) * TICKS_PER_WEEK * TUNE.treasuryLowWeeks) * levels) continue;
          // 지역 밖으로 못 나가는 상품(운송): 2레벨 이상 덩어리는 산출이 그 지역의 모자란 양(수요 − 공급, 공사 중 포함)을 넘지 않을 때만
          if (levels > 1 && overLocal(r.id, t.id, m, levels)) continue;
          const e = m.seats ? schoolValuation(w, c, r, m, levels, schoolSeats(w, r.id)) : t.id === TRADING_POST ? tradeValuation(w, c, r, m, levels) : valueMethod(w, o, r, c, t.id, m, levels);
          if (laborAvailability(w, r, m, levels, c.state, pools) < MIN_STAFFING()) continue;
          const roi = (e.profit * TICKS_PER_YEAR) / (perLevel * levels);
          if (e.profit <= 0) continue;
          if (roi <= MIN_ROI()) continue;
          if (!top || roi > top.roi) top = { levels, roi };
          if (!choice && roi > MIN_ROI() * 1.25) choice = { levels, roi };
        }
        const pick = choice ?? top;
        if (!pick) continue;
        // 지역 우선 투자: 그 지역 저택·금융가 돈으로 짓는 몫만큼 가산점
        const here = c.state ? 0 : Math.min(1, localFunds(r.id, t.id) / (perLevel * pick.levels));
        const score = pick.roi * (1 - AI_JITTER + jitter('pick', r.id, t.id, m.id) * 2 * AI_JITTER) * (1 + TUNE.localBias * here);
        if (!best || score > best.score) best = { regionId: r.id, typeId: t.id, methodId: m.id, levels: pick.levels, score };
      }
    }
  }
  return best;
}

/** 방금 넣은 내 공사(목록 맨 끝)를 내 공사 맨 앞으로 옮긴다 */
function toFront(w: World, c: Company) {
  const mine = w.constructions.filter((k) => k.companyId === c.id);
  const last = mine[mine.length - 1];
  if (last && mine.length > 1) applyCommand(w, c.id, { type: 'moveConstruction', constructionId: last.id, index: 0 });
}

