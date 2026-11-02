import {recordPopIncome} from './popIncome';
import { ABS_LIMITS, BUILDING_BY_ID, GOODS, SKILL_DEFS, TECH_BY_ID, TICKS_PER_WEEK, TUNE, WORKFORCE_RATIO, getMethod } from './data';
import { collectionRatio, companyById, estimateMethod, marketWages, levelOwnersOf, slots, regionById, constructionEstimate, efficiency, isBudgetFunded, isOwnerBuilding, isSubsistence, kingdomGdp, logEvent, officeFeeMult, paysDividend, repay, wagesAt, sellThrough, shareWeight } from './economy';
import { techNameEn } from './i18n';
import { flow, kingdomById, kingdomOf, toFinance, toTreasury } from './kingdoms';
import { addFund, fundOf, payPops } from './pops';
import { round2 } from './rng';
import { LOWER_JOBS, SKILLS, crewOf } from './types';
import { ensureWages, kingdomWageMean, subsistenceWage } from './labor';
import type { LevelOwner } from './economy';
import type { BudgetItem, Building, Company, Construction, GoodBag, GoodId, Kingdom, Pop, PopClass, Region, SalvageLot, TaxLaw, World } from './types';

// ---------------------------------------------------------------- 국채 이자

/** 일 이자율 (연 약 9%) */
export const DAILY_INTEREST = 0.00025;

export function chargeInterest(w: World) {
  for (const c of w.companies) {
    if (c.debt <= 0) continue;
    const interest = c.debt * DAILY_INTEREST;
    const paid = Math.min(interest, Math.max(0, c.cash));
    c.cash -= paid;
    // 국채 이자는 사라지는 돈이다 (빚은 왕실만 진다)
    w.mint.interest += paid;
    c.debt += interest - paid;
    c.weekProfit -= interest;
    c.ledger.interest += interest;
  }
}

// ---------------------------------------------------------------- 연구

/** 기술은 왕국 단위다: 민간은 따로 연구하지 않고 그 왕국 왕실이 연 기술을 쓴다 */
function shareTechs(w: World) {
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId);
    if (!gov) continue;
    for (const id of k.privateIds) {
      const c = companyById(w, id);
      if (!c) continue;
      c.research.known = [...gov.research.known];
      c.research.current = null;
      c.research.points = 0;
    }
  }
}

export function doResearch(w: World) {
  shareTechs(w);
}

/** 왕국 문해력 0..1: 그 왕국 pop 의 인구 가중 평균 */
export function kingdomLiteracy(w: World, kingdomId: number): number {
  let n = 0, lit = 0;
  for (const p of w.pops) if (kingdomOf(w, p.regionId) === kingdomId) { n += p.size; lit += p.size * p.literacy; }
  return n > 0 ? lit / n : 0;
}

/** 주간 연구 포인트 = TUNE.researchBase + TUNE.researchPerLiteracy × 왕국 문해력(%). 돈은 들지 않는다 */
export function researchPoints(w: World, kingdomId: number): number {
  return TUNE.researchBase + TUNE.researchPerLiteracy * kingdomLiteracy(w, kingdomId) * 100;
}

/** 연구 (매주, 왕실): 이번 주 포인트를 고른 기술에 쌓는다. 고른 기술이 없으면 포인트는 사라진다. 다 차면 기술이 열리고 남는 포인트도 사라진다 */
function advanceResearch(w: World, c: Company) {
  const r = c.research;
  const tech = r.current ? TECH_BY_ID[r.current] : undefined;
  if (!tech || r.known.includes(tech.id)) { r.current = null; r.points = 0; return; }
  r.points = researchPoints(w, c.kingdomId);
  r.progress[tech.id] = Math.min(tech.cost, (r.progress[tech.id] ?? 0) + r.points);
  if (r.progress[tech.id] >= tech.cost) {
    r.known.push(tech.id);
    r.current = null;
    logEvent(w, c.id, `기술 연구 완료: ${tech.name}. 보유 건물의 생산 방식에서 새 방식을 고를 수 있습니다.`,
      { kind: 'info', en: `Research complete: ${techNameEn(tech.id)}. New production methods can now be chosen for your buildings.` });
  }
}

// ---------------------------------------------------------------- 국정 예산 (빅토리아3 방식)

/** 하루 경제 규모: 산출이 있는 건물의 (매출 − 원료) + pop 이 받은 현물의 지역 시장가 */
export function dailyOutput(w: World, kingdomId: number): number {
  let v = 0;
  for (const b of w.buildings) {
    if (kingdomOf(w, b.regionId) !== kingdomId || !Object.keys(getMethod(b.typeId, b.methodId).outputs).length) continue;
    v += b.last.revenue - b.last.inputCost;
  }
  for (const p of w.pops) {
    if (kingdomOf(w, p.regionId) !== kingdomId) continue;
    const mk = regionById(w, p.regionId).market;
    for (const g of Object.keys(p.inKind) as GoodId[]) v += (p.inKind[g] ?? 0) * mk[g].price;
  }
  return v;
}

/** 정책 단계(1~5)의 배율: 세금 수준 TUNE.taxLevels, 국영 임금 수준 TUNE.govWageLevels. 복지 수준은 목표 생활수준 TUNE.welfareLevels */
export function budgetMult(k: Kingdom, item: BudgetItem): number {
  const table = item === 'tax' ? TUNE.taxLevels : item === 'wages' ? TUNE.govWageLevels : TUNE.welfareLevels;
  return table[k.budget[item] - 1];
}

/** 지금 세율 = 세법의 기본 세율(TUNE) × 세금 수준 배율. 세법 하나가 세금 하나만 걷는다 (land 토지세, poll 인두세, income 소득세) */
export function taxRates(k: Kingdom, law: TaxLaw = k.taxLaw): { land: number; poll: number; income: number } {
  const m = budgetMult(k, 'tax');
  return { land: law === 'land' ? TUNE.landTax * m : 0, poll: law === 'poll' ? TUNE.pollTax * m : 0, income: law === 'income' ? TUNE.incomeTax * m : 0 };
}

/**
 * 임금 지수 (매주, 빅토리아3의 '보통 임금'): 왕국 민간 건물 노동자·농부의 평균 임금 ÷ 기본 임금 (고용 가중)의 이동평균.
 * 기본 임금 대신 그 지역 소작 1인 소득 × switchPremium 으로 나눈다 (1 = 일손이 남는 지역의 균형, LABOR_MARKET.md 7장).
 * 국영 임금 계산에는 쓰지 않고, AI 가 국영 임금 단계를 고를 때 본다 (ai.ts). 민간 노동자 고용이 없으면 그대로 둔다
 */
export function updateWageIndex(w: World, k: Kingdom) {
  let paid = 0, base = 0;
  const tenant = new Map<number, number>();
  for (const b of w.buildings) {
    if (b.stateOwned || BUILDING_BY_ID[b.typeId].auto || kingdomOf(w, b.regionId) !== k.id) continue;
    const c = companyById(w, b.companyId);
    if (!c) continue;
    if (!(b.employed.unskilled > 0 || b.employed.farmer > 0)) continue;
    const r = regionById(w, b.regionId);
    let t = tenant.get(r.id);
    if (t === undefined) { t = subsistenceWage(w, r); tenant.set(r.id, t); }
    const wages = wagesAt(c, b.typeId, w, b.regionId);
    for (const s of LOWER_JOBS) { paid += b.employed[s] * wages[s]; base += b.employed[s] * t * TUNE.switchPremium; }
  }
  if (base <= 0) return;
  k.wageIndex = k.wageIndex == null ? paid / base : k.wageIndex * 0.75 + (paid / base) * 0.25;
}

/**
 * 국영 임금 (빅토리아3 정부 임금): 그 지역 시장 임금 × 국영 임금 수준 배율 × (1 + AI 왕실 웃돈). 왕실의 정부 건물(행정청·건축사무소·학교)만 이 임금을 준다.
 * 왕실 생산 건물은 민간 상회처럼 회사 임금표(wages)를 쓴다 (2026-10-23 사용자 결정, DECISIONS 6-2)
 */
export function applyStateWages(w: World, k: Kingdom) {
  const gov = companyById(w, k.governmentId);
  if (!gov) return;
  const t = (gov.stateWages ??= { ...gov.wages });
  const mult = budgetMult(k, 'wages');
  // 지역 시장 임금: 정부 건물은 그 지역 시장 임금 × 단계 배율 × (1 + AI 왕실 웃돈) (Region.stateWages). 왕실 국영 임금표는 왕국 지역들의 평균 (화면·추정용 대표값)
  for (const r of w.regions) {
    if (r.kingdomId !== k.id) continue;
    const wages = ensureWages(w, r);
    const st = (r.stateWages ??= { ...wages });
    // AI 왕실의 지역 웃돈 (TUNE.aiStatePremium, ai.ts adjustStatePremium). 없으면 시장 임금 × 단계 배율
    const prem = gov.statePremium?.[r.id];
    for (const s of SKILLS) st[s] = round2(wages[s] * mult * (prem ? 1 + prem[s] : 1));
  }
  const mean = kingdomWageMean(w, k.id, (r) => r.stateWages ?? r.wages!);
  if (mean) for (const s of SKILLS) t[s] = round2(mean[s]);
}

/**
 * 국정 예산 (매주): 금액을 편성하지 않는다. 왕실 정부 건물(행정청·건축사무소·학교)은 늘 다 가동한다. 행정청·학교는 임금과 원료를 국고에서 내고, 건축사무소는 공사 수수료로 버는 국영 사업이다 (손익이 국고로).
 * 여기서는 연구 포인트를 쌓고(돈은 들지 않는다, advanceResearch), 국영 임금을 다시 정하고, 지난주 국정 수지를 적는다 (복지는 매일 welfare.ts).
 * 국고가 모자라면 임금·원료는 국채로 낸다 (payWages, collectOrders)
 */
export function spendBudget(w: World) {
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId);
    const week = dailyOutput(w, k.id) * TICKS_PER_WEEK;
    k.output = k.output == null ? week : k.output * 0.75 + week * 0.25;
    const spent = k.spentWeek ?? { wages: 0, goods: 0 };
    const revenue = k.revenueWeek;
    k.revenueWeek = 0;
    k.spentWeek = { wages: 0, goods: 0, welfare: 0 };
    if (!gov) continue;
    advanceResearch(w, gov);
    // 지난주 국정 수지 (화면에 그대로 나가는 기록이라 소수 둘째 자리)
    const b = {
      revenue: round2(revenue), tariffs: round2(k.tariffWeek ?? 0), fees: round2(k.privateFeeWeek ?? 0), wages: round2(spent.wages), goods: round2(spent.goods),
      interest: round2(gov.ledger.interest), welfare: round2(spent.welfare ?? 0), firms: round2(spent.firms ?? 0), office: round2(spent.office ?? 0), build: round2(spent.build ?? 0),
      mint: round2(k.budgetBase?.mint ?? 0), steps: { ...k.budget },
    };
    k.lastBudget = b;
    // 국고가 내는 돈: 정부 건물(행정청·학교) + 이자 + 복지 + 왕실 공사 − 건축사무소 손익 (왕실 공사 수수료는 사무소 매출로 돌아오므로 둘을 함께 센다)
    const net = b.wages + b.goods + b.interest + b.welfare + b.build - b.office;
    k.expenseEma = k.expenseEma == null ? net : k.expenseEma * 0.75 + net * 0.25;
    // 예산 미리보기 기준값 (화면 전용)
    const base = (k.budgetBase ??= {});
    const a = budgetEmaWeight(w, 0.25);
    const ema = (old: number | undefined, x: number) => (old == null ? x : old * (1 - a) + x * a);
    base.tariffs = ema(base.tariffs, k.tariffWeek ?? 0);
    // 관세 나누기 (상품·출발 왕국): 이번 주에 없던 열쇠는 0 으로 따라간다. 거의 0 이 된 열쇠는 지운다
    const by: Record<string, number> = {};
    const wk = k.tariffWeekBy ?? {}, old = base.tariffsBy;
    for (const key of new Set([...Object.keys(old ?? {}), ...Object.keys(wk)])) {
      const v = !old ? wk[key] ?? 0 : old[key] == null ? (wk[key] ?? 0) * a : ema(old[key], wk[key] ?? 0);
      if (v >= 0.01) by[key] = v;
    }
    base.tariffsBy = by;
    k.tariffWeekBy = {};
    base.goods = ema(base.goods, b.goods);
    k.tariffWeek = 0;
    k.privateFeeWeek = 0;
    updateWageIndex(w, k);
    applyStateWages(w, k);
  }
}

// ---------------------------------------------------------------- 국고

/** 행정청 하나가 감당하는 인구. 다른 건물의 산출처럼 원료 충족률(inputFill)을 따른다 */
export function adminCapacityOf(b: Building): number {
  const m = getMethod(b.typeId, b.methodId);
  if (!m.taxCapacity || !b.active) return 0;
  return m.taxCapacity * TUNE.adminScale * b.level * b.utilization * crewOf(b) * efficiency(b) * b.last.inputFill;
}

/** 왕국 행정청이 세금을 걷을 수 있는 인구 (징세 한도) */
export function taxCapacity(w: World, kingdomId: number): number {
  let cap = 0;
  for (const b of w.buildings) if (b.active && kingdomOf(w, b.regionId) === kingdomId) cap += adminCapacityOf(b);
  return cap;
}

/**
 * 세금: 인두세(1인당 하루)와 소득세(최근 하루 소득 × 세율). 시장에서 쓰기 전에 걷고, 저축을 넘게는 못 걷는다.
 * 징수율은 행정청 한도와 인구의 비로 정한다 (collectionRatio). 모두에게 같은 비율로 덜 걷고, 못 걷은 몫은 백성 손에 남는다.
 */
/**
 * 그 pop 이 하루에 내야 할 세금 (저축 한도 전, 빅토리아3): 토지세 = 소작농 1인당 정액, 인두세 = 소작농을 뺀 1인당 정액,
 * 소득세 = 소작농을 뺀 소득(임금·배당 이동평균) × 세율 (자급 소득은 면제)
 */
export function taxDue(w: World, p: Pop, law?: TaxLaw): number {
  const k = kingdomById(w, kingdomOf(w, p.regionId));
  const t = taxRates(k, law ?? k.taxLaw);
  if (p.prof === 'peasant') return p.size * t.land;
  return p.size * t.poll + Math.max(0, p.incomeEma) * t.income;
}

/** 그 세법으로 지금 하루에 걷힐 세금 (징수율 전): pop 마다 min(저축, 낼 세금) */
export function lawRevenue(w: World, k: Kingdom, law: TaxLaw): number {
  let v = 0;
  for (const p of w.pops) if (kingdomOf(w, p.regionId) === k.id) v += Math.min(p.savings, taxDue(w, p, law));
  return v;
}

/**
 * 예산 미리보기 기준값의 이동평균 가중치 (화면 전용). 처음 8주는 경제가 빨리 자라므로 빨리 따라간다
 */
export function budgetEmaWeight(w: World, late: number): number {
  return w.tick < 8 * TICKS_PER_WEEK ? Math.min(1, late * 3) : late;
}

export function collectIncomeTax(w: World) {
  const people = new Map<number, number>(), owed = new Map<number, number>();
  // 예산 미리보기: 세금 수준 단계 1~5 각각이었다면 오늘 걷었을 pop 세금 (저축 한도 포함, 징수율 전)
  const byStep = new Map<number, number[]>();
  const due = (p: Pop) => taxDue(w, p);
  for (const p of w.pops) {
    const kid = kingdomOf(w, p.regionId);
    people.set(kid, (people.get(kid) ?? 0) + p.size);
    const d = due(p);
    owed.set(kid, (owed.get(kid) ?? 0) + Math.min(p.savings, d));
    if (d <= 0) continue;
    const k = kingdomById(w, kid), m = budgetMult(k, 'tax');
    if (m <= 0) continue;
    let arr = byStep.get(kid);
    if (!arr) byStep.set(kid, arr = TUNE.taxLevels.map(() => 0));
    TUNE.taxLevels.forEach((ms, i) => { arr![i] += Math.min(p.savings, (d / m) * ms); });
  }
  const taxOf = (p: Pop) => Math.min(p.savings, due(p));
  const ratio = new Map<number, number>();
  for (const k of w.kingdoms) {
    const n = people.get(k.id) ?? 0, cap = taxCapacity(w, k.id);
    k.taxDue = n;
    k.taxCapacity = cap;
    k.taxOwed = (k.taxOwed ?? owed.get(k.id) ?? 0) * 0.9 + (owed.get(k.id) ?? 0) * 0.1;
    const cr = collectionRatio(cap, n);
    k.taxRatio = cr;
    ratio.set(k.id, cr);
  }
  const got = new Map<number, number>();
  for (const p of w.pops) {
    const kid = kingdomOf(w, p.regionId);
    const gov = companyById(w, kingdomById(w, kid).governmentId);
    const tax = taxOf(p) * (ratio.get(kid) ?? 1);
    if (!gov || tax <= 0) continue;
    p.savings -= tax;
    p.lastIncome -= tax; recordPopIncome(p, 'tax', tax);
    gov.cash += tax;
    kingdomById(w, kid).revenueWeek += tax;
    got.set(kid, (got.get(kid) ?? 0) + tax);
  }
  // 예산 미리보기 기준: 세금 수준 단계마다 하루 세입의 이동평균 (화면 전용, sim 은 읽지 않는다).
  // pop 세금은 단계별로 저축 한도를 다시 건다
  const a = budgetEmaWeight(w, 0.1);
  for (const k of w.kingdoms) {
    const r = ratio.get(k.id) ?? 1;
    const arr = byStep.get(k.id);
    const base = (k.budgetBase ??= {});
    const old = base.taxBy;
    base.taxBy = TUNE.taxLevels.map((_ms, i) => {
      const day = (arr?.[i] ?? 0) * r;
      return old?.[i] == null ? day : old[i] * (1 - a) + day * a;
    });
  }
  // 걷힌 세금은 행정청이 한도에 기여한 비율만큼 그 행정청의 매출로 잡는다 (돈은 이미 국고에 있다).
  // 손익과 장부는 같은 날 produce 에서 다른 매출과 함께 한 번만 적는다
  for (const b of w.buildings) {
    const m = getMethod(b.typeId, b.methodId);
    const k = w.kingdoms.find((x) => x.id === kingdomOf(w, b.regionId));
    if (!m.taxCapacity || !b.active || !k || !(k.taxCapacity ?? 0)) continue;
    const share = adminCapacityOf(b) / k.taxCapacity!;
    const amt = (got.get(k.id) ?? 0) * share;
    b.last.revenue += amt;
    b.last.tax = (b.last.tax ?? 0) + amt;
  }
}

// ---------------------------------------------------------------- 주간: 세금, 배당, 소유 건물 금고

/** 소유 건물이 받은 배당·지대 중 그 금고에 남기는 비율 (빅토리아3 투자 풀 기본률: 저택 20%, 금융가 30%). 나머지를 앉은 사람·지분 주인에게 준다 */
export const KEEP_SHARE: Record<string, number> = { manor: 0.2, finance: 0.3 };

export function weeklyWageBill(w: World, c: Company): number {
  let bill = 0;
  for (const b of w.buildings) {
    if (b.companyId !== c.id || BUILDING_BY_ID[b.typeId].auto) continue;
    const wages = wagesAt(c, b.typeId, w, b.regionId);
    for (const s of SKILLS) if (!paysDividend(b.stateOwned, s)) bill += b.employed[s] * wages[s];
  }
  return bill * TICKS_PER_WEEK;
}

/** 회사가 늘 남겨 두는 현금: 기본 + 주간 임금 + 건물 유보 자산 합 (공사·투자에 쓰지 않는다) */
export function reserveOf(w: World, c: Company): number {
  return ABS_LIMITS.reserveBase + weeklyWageBill(w, c) + buildingReserves(w, c);
}

/** 진행 중인 공사를 끝내는 데 더 들 돈 */
export function committedCost(w: World, c: Company): number {
  let total = 0;
  for (const k of w.constructions) {
    if (k.companyId !== c.id) continue;
    const est = constructionEstimate(w, c, k.typeId);
    if (!Number.isFinite(est.cost)) continue;
    total += Math.max(0, est.cost * (k.levels ?? 1) * (1 - k.points / k.required));
  }
  return total;
}

/** 건물 이익 중 유보 자산으로 남기는 몫 (빅토리아3: 25~50%). 유보 자산이 가득 차면 이익을 모두 배당한다 */
export const RESERVE_SHARE = 0.35;

/** 유보 자산을 쌓는 건물: 파는 건물과 건축사무소 (국고가 운영비를 내는 행정청·학교는 이익이 없어 쌓지 않는다) */
export function hasReserve(b: Building): boolean {
  if (BUILDING_BY_ID[b.typeId].auto || isBudgetFunded(b.typeId)) return false;
  return !getMethod(b.typeId, b.methodId).seats;
}

/**
 * 방식 1레벨의 주간 산출 가치 (기본가, 만원 가동). 건축사무소는 기본 임금·기본가 원료로 센 운영비 × 수수료 배율 (기본가 수수료 매출).
 * 그 밖에 상품을 내지 않는 방식(학교·행정청)은 0
 */
export function weeklyOutputValue(typeId: string, methodId: string): number {
  const m = getMethod(typeId, methodId);
  let v = 0;
  if (m.construction) {
    for (const s of SKILLS) v += (m.workers[s] ?? 0) * SKILL_DEFS[s].baseWage;
    for (const [g, q] of Object.entries(m.inputs) as [GoodId, number][]) v += q * GOODS[g].basePrice;
    return v * officeFeeMult(methodId) * TICKS_PER_WEEK;
  }
  for (const [g, q] of Object.entries(m.outputs) as [GoodId, number][]) v += q * GOODS[g].basePrice;
  return v * TICKS_PER_WEEK;
}

/** 건물 유보 자산 상한: 레벨 × 지금 방식의 레벨당 주간 산출 가치(기본가) × TUNE.reserveWeeks. 방식을 바꿔 상한이 줄면 다음 정산에서 상한까지 줄인다 */
export function reserveCap(b: Building): number {
  return b.level * weeklyOutputValue(b.typeId, b.methodId) * TUNE.reserveWeeks;
}

/** 회사 건물 유보 자산 합 (회사 현금 중 그 몫) */
export function buildingReserves(w: World, c: Company): number {
  let t = 0;
  for (const b of w.buildings) if (b.companyId === c.id && b.reserve) t += b.reserve;
  return t;
}

/**
 * 건물 유보 자산 (빅토리아3): 돈은 회사 현금에 있고, 유보 자산은 그중 건물 몫의 표시다.
 * 이번 주 이익이 있으면 RESERVE_SHARE 를 상한까지 쌓고 나머지를 배당할 몫으로 돌려준다. 적자는 유보 자산에서 먼저 뺀다 (배당 0).
 */
function settleReserve(b: Building, weekProfit: number): number {
  const res = Math.min(b.reserve ?? 0, reserveCap(b));
  if (weekProfit <= 0) { b.reserve = Math.max(0, res + weekProfit); return 0; }
  // 유보 자산이 찰수록 적립 비율이 줄어든다 (비었으면 RESERVE_SHARE, 가득 차면 0): 배당이 한꺼번에 뛰지 않게
  const cap = reserveCap(b);
  const keep = cap > 0 ? Math.max(0, Math.min(cap - res, weekProfit * RESERVE_SHARE * (1 - res / cap))) : 0;
  b.reserve = res + keep;
  return weekProfit - keep;
}

/** 회사 현금이 유보 자산 합보다 적으면 유보 자산을 같은 비율로 줄인다. 배당에 쓸 수 있는 현금(현금 − 유보 자산)을 돌려준다 */
function fitReserves(w: World, c: Company): number {
  const total = buildingReserves(w, c);
  const cash = Math.max(0, c.cash);
  if (total > cash) {
    for (const b of w.buildings) if (b.companyId === c.id && b.reserve) b.reserve = Math.floor((b.reserve * cash) / total * 100) / 100;
    return 0;
  }
  return cash - total;
}

/**
 * 소유 건물 o 가 받은 배당·지대: KEEP_SHARE 는 o 의 금고에 남기고, 나머지를 나눈다.
 * 저택: 앉은 귀족·하급 귀족에게 몫(shareWeight × 인원)대로 (TUNE.manorShares 이면 저택도 지분 주인에게 지분 수대로, payHolders). 금융가: 먼저 성과급(TUNE.financeBonus)을 일하는 전문가에게, 나머지를 지분 수대로.
 * 받을 사람이 없으면 금고로
 */
function payOwners(w: World, o: Building, amount: number, source:'dividends'|'rent' = 'dividends') {
  if (amount <= 0) return;
  o.last.revenue += amount;
  flow(`divIn.${o.typeId}`, amount);
  if (o.typeId === 'finance') { payFinance(w, o, amount); return; }
  if (TUNE.manorShares && o.typeId === 'manor') { payHolders(w, o, amount, source); return; }
  const pops = w.pops.filter((p) => p.work === o.id && p.size > 0);
  let total = 0;
  for (const p of pops) total += p.size * shareWeight(p.prof);
  if (total <= 0) { toTreasury(o, amount, 'noSeat'); return; }
  const keep = amount * (KEEP_SHARE[o.typeId] ?? 0);
  toTreasury(o, keep, 'keep');
  const rest = amount - keep;
  flow(`toPops.${o.typeId}`, rest);
  for (const p of pops) payPops(w, [p], (rest * p.size * shareWeight(p.prof)) / total, undefined, source);
}

/** 금융가 배당: 성과급 → 일하는 전문가, 금고 몫 → 금고, 나머지 → 지분 주인 (지분 수대로) */
function payFinance(w: World, o: Building, amount: number) {
  const staff = w.pops.filter((p) => p.work === o.id && p.size > 0);
  const bonus = staff.length ? amount * TUNE.financeBonus : 0;
  if (bonus > 0) payPops(w, staff, bonus, undefined, 'wages');
  const rest = amount - bonus;
  const holders: Pop[] = [];
  let units = 0;
  for (const p of w.pops) { const u = fundOf(p, o.id); if (u > 0) { holders.push(p); units += u; } }
  if (units <= 0) { toTreasury(o, rest, 'noSeat'); return; }
  const keep = rest * (KEEP_SHARE.finance ?? 0);
  toTreasury(o, keep, 'keep');
  flow('toPops.finance', rest - keep);
  payPops(w, holders, rest - keep, (p) => fundOf(p, o.id), 'dividends');
}

// ---------------------------------------------------------------- 저택 지분 (TUNE.manorShares, docs/overhaul/MANOR_SHARES.md 1단계)
// 저택 지분은 금융가 지분과 같은 Pop.fund 에 든다 (건물 id 가 겹치지 않는다). 상급·하급 귀족만 사고, 지분 값(nav)에 저택에서 사고 저택에 판다.
// 돈 길: 사기 = pop 저축 → 저택 금고, 팔기·되사기 = 저택 금고 → pop 저축. 지분 수와 지분 값은 돈이 아니다.

/** 저택 지분을 가질 수 있는 직종 (상급·하급 귀족) */
export const isNoble = (prof: PopClass) => prof === 'aristocrat' || prof === 'gentry';

/** 저택 o 의 지분 주인과 지분 합 */
function holdersOf(w: World, o: Building): { pops: Pop[]; units: number } {
  const pops: Pop[] = [];
  let units = 0;
  for (const p of w.pops) { const u = fundOf(p, o.id); if (u > 0) { pops.push(p); units += u; } }
  return { pops, units };
}

/** 저택 배당·지대 (지분 켬): KEEP_SHARE 는 금고, 나머지는 지분 주인에게 지분 수대로. 지분이 없으면 금고로 */
function payHolders(w: World, o: Building, amount: number, source: 'dividends' | 'rent') {
  const { pops, units } = holdersOf(w, o);
  if (units <= 0) { toTreasury(o, amount, 'noSeat'); return; }
  const keep = amount * (KEEP_SHARE[o.typeId] ?? 0);
  toTreasury(o, keep, 'keep');
  flow(`toPops.${o.typeId}`, amount - keep);
  payPops(w, pops, amount - keep, (p) => fundOf(p, o.id), source);
}

type LevelsOf = Map<number, { typeId: string; n: number }[]>;

/** 소유 건물 o 의 자산 = 금고 + 가진 레벨 × 그 건물 1레벨 공사비 추정 (지분 값의 분자). levelsOf = 소유 건물 id → 가진 레벨 */
function ownerAssets(w: World, o: Building, levelsOf: LevelsOf): number {
  const firm = companyById(w, kingdomById(w, kingdomOf(w, o.regionId)).privateIds[0]);
  let assets = Math.max(0, o.cash ?? 0);
  if (firm) for (const x of levelsOf.get(o.id) ?? []) { const c = constructionEstimate(w, firm, x.typeId).cost; if (Number.isFinite(c)) assets += c * x.n; }
  return assets;
}

/** 소유 건물 id → 가진 레벨 목록 (어느 지역 건물이든) */
function ownedLevels(w: World): LevelsOf {
  const levelsOf: LevelsOf = new Map();
  for (const b of w.buildings) if (b.owners) for (const [id, n] of Object.entries(b.owners)) { const l = levelsOf.get(Number(id)) ?? []; l.push({ typeId: b.typeId, n }); levelsOf.set(Number(id), l); }
  return levelsOf;
}

/**
 * 저택 지분 발행 (지분이 하나도 없는 저택): 자산(금고 + 가진 레벨 값)을 지분 값 1 의 지분으로 만들어 그 지역 귀족에게 준다.
 * 상급 귀족 1명 1몫, 하급 귀족 1명 TUNE.gentryShare 몫 (일터와 상관없다). 켜는 첫날(createWorld)과, 매주(updateFunds) 지분이 0 이 된 저택. 돈은 움직이지 않는다
 */
function issueManorUnits(w: World, o: Building, assets: number) {
  const nobles = w.pops.filter((p) => p.regionId === o.regionId && isNoble(p.prof) && p.size > 0);
  let n = 0;
  for (const p of nobles) n += p.size * shareWeight(p.prof);
  o.nav = 1;
  if (!(n > 0) || !(assets > 0)) return;
  for (const p of nobles) addFund(p, o.id, (assets * p.size * shareWeight(p.prof)) / n);
}

/** 켜는 첫날: 지분이 없는 모든 저택에 지분을 만든다 (world.ts createWorld, lab/micro.ts). TUNE.manorShares 가 0 이면 아무것도 하지 않는다 */
export function initManorShares(w: World) {
  if (!TUNE.manorShares) return;
  const levelsOf = ownedLevels(w);
  for (const o of w.buildings) {
    if (o.typeId !== 'manor') continue;
    if (w.pops.some((p) => fundOf(p, o.id) > 0)) continue;
    issueManorUnits(w, o, ownerAssets(w, o, levelsOf));
  }
}

/** 틱마다 한 번 재는 소유 건물별 지분 합 (AI 수익률 판단용, 그 틱 처음 물을 때의 값) */
const unitsCache = new WeakMap<World, { tick: number; units: Map<number, number> }>();
export function unitsSnapshot(w: World): Map<number, number> {
  let c = unitsCache.get(w);
  if (!c || c.tick !== w.tick) {
    const units = new Map<number, number>();
    for (const p of w.pops) { const f = p.fund; if (f) for (let i = 0; i < f.id.length; i++) units.set(f.id[i], (units.get(f.id[i]) ?? 0) + f.u[i]); }
    c = { tick: w.tick, units };
    unitsCache.set(w, c);
  }
  return c.units;
}

/**
 * 지분 1개 값에 대한 주인 몫 배당의 주간 수익률 (AI 판단): 받은 배당·지대 이동평균(profitEma, 부재 지주 몫이 오간 뒤 받은 돈) × 7
 * × (1 − 금고 몫) [금융가는 × (1 − 성과급)] ÷ (지분 수 × 지분 값). 지분이 없으면 0
 */
export function unitYield(w: World, o: Building): number {
  const u = unitsSnapshot(w).get(o.id) ?? 0;
  if (!(u > 0)) return 0;
  const bonus = o.typeId === 'finance' ? TUNE.financeBonus : 0;
  return (Math.max(0, o.profitEma) * TICKS_PER_WEEK * (1 - (KEEP_SHARE[o.typeId] ?? 0)) * (1 - bonus)) / (u * Math.max(0.01, o.nav ?? 1));
}

/**
 * step() 마다 하나씩 느는 번호 (하루 안 캐시용). 틱 번호는 하루 중간(주간 처리 직전, tick.ts)에 바뀌어, 틱 번호로 묶은 캐시는 주간 처리에서 만든 값이
 * 다음 날 앞부분까지 남는다. 저장/불러오기를 해도 같은 결과가 되게 step 마다 새로 잰다 (tick.ts step 이 맨 앞에서 부른다)
 */
const stepNo = new WeakMap<World, number>();
export function beginStep(w: World) { stepNo.set(w, (stepNo.get(w) ?? 0) + 1); }
export const stepOf = (w: World): number => stepNo.get(w) ?? 0;

/** 저택 지대를 자산으로 세는 주 수 (AI 판단 TUNE.nobleChoice, ownerViews: 지대 × 7 × 이 값을 저택 자산에 넣는다) */
export const RENT_ASSET_WEEKS = 52;

/** 소유 건물 하나를 AI 가 보는 값 (TUNE.nobleChoice): 새 돈의 기대 주간 수익률 y, 좋아하는 종류 1레벨 공사비 평균 level */
export interface OwnerView { y: number; level: number }
const viewCache = new WeakMap<World, { step: number; m: Map<number, OwnerView> }>();

/**
 * 새 돈의 기대 수익률 (AI 판단, TUNE.nobleChoice 1, 하루(step)마다 처음 물을 때 정한다). 지분 값(세계 규칙)은 그대로 두고 귀족·소유 건물이 판단에만 쓴다.
 * - 새 레벨 수익률 r: 그 왕국 민간 건물(주인이 있는 레벨) 중 그 소유 건물이 좋아하는 종류(favours: 저택은 땅 건물, 금융가는 그 밖)의
 *   주간 배당 추정(profitEma × 7 × (1 − 준비금 몫) × 주인 레벨 ÷ 레벨) 합 ÷ (주인 레벨 × 1레벨 공사비) 합. 1레벨 공사비 평균이 level.
 * - 기대 수익률 = (받는 배당·지대 이동평균 × 7 + r × (금고 + 낸 공사비 + level)) × 주인 몫 ÷ (가진 레벨 값 + 금고 + 낸 공사비 + 저택은 지대 × RENT_ASSET_WEEKS + level).
 *   주인 몫 = 1 − 금고 몫 [금융가는 × (1 − 성과급)]. 금고와 짓고 있는 공사는 새 레벨 수익률로 벌 돈으로 센다. level 한 개를 미리 넣어 두어
 *   가진 것이 없는 금융가(차가운 시작)는 r 로 본다. 저택의 지대(소작지 수확 × rentShare × 7)는 RENT_ASSET_WEEKS 주치를 자산에 넣어, 지분 값에 지대가 빠져 수익률이 부풀어 보이는 것을 판단에서 뺀다
 */
export function ownerViews(w: World): Map<number, OwnerView> {
  const c = viewCache.get(w);
  if (c && c.step === stepOf(w)) return c.m;
  const costs = new Map<string, number>();
  const costOf = (kid: number, typeId: string): number => {
    const key = `${kid}|${typeId}`;
    let v = costs.get(key);
    if (v === undefined) {
      const firm = companyById(w, kingdomById(w, kid).privateIds[0]);
      v = firm ? constructionEstimate(w, firm, typeId).cost : NaN;
      costs.set(key, v);
    }
    return v;
  };
  // 왕국·종류(땅 1 / 그 밖 0)별 배당·공사비·레벨 합, 소유 건물 id → 가진 레벨
  const acc = new Map<string, { div: number; cost: number; lv: number }>();
  const levelsOf: LevelsOf = new Map();
  for (const b of w.buildings) {
    if (!b.owners) continue;
    let owned = 0;
    for (const [id, n] of Object.entries(b.owners)) {
      owned += n;
      const l = levelsOf.get(Number(id)) ?? [];
      l.push({ typeId: b.typeId, n });
      levelsOf.set(Number(id), l);
    }
    if (!(owned > 0) || !(b.level > 0)) continue;
    const kid = kingdomOf(w, b.regionId);
    const cost = costOf(kid, b.typeId);
    if (!Number.isFinite(cost) || !(cost > 0)) continue;
    const key = `${kid}|${landType(b.typeId) ? 1 : 0}`;
    const a = acc.get(key) ?? { div: 0, cost: 0, lv: 0 };
    a.div += (Math.max(0, b.profitEma) * TICKS_PER_WEEK * (1 - RESERVE_SHARE) * owned) / b.level;
    a.cost += cost * owned;
    a.lv += owned;
    acc.set(key, a);
  }
  // 소유 건물이 짓고 있는 공사에 이미 낸 돈 (약정 비율로 나눈 spent)
  const spent = new Map<number, number>();
  for (const k of w.constructions) {
    if (!k.funders) continue;
    let tot = 0;
    for (const v of Object.values(k.funders)) tot += v;
    if (tot > 0) for (const [id, v] of Object.entries(k.funders)) spent.set(Number(id), (spent.get(Number(id)) ?? 0) + (k.spent * v) / tot);
  }
  const m = new Map<number, OwnerView>();
  for (const o of w.buildings) {
    if (!isOwnerBuilding(o.typeId)) continue;
    const kid = kingdomOf(w, o.regionId);
    const manor = o.typeId === 'manor';
    const a = acc.get(`${kid}|${manor ? 1 : 0}`), b = acc.get(`${kid}|${manor ? 0 : 1}`);
    const r = a && a.cost > 0 ? a.div / a.cost : 0;
    // 좋아하는 종류의 레벨이 왕국에 없으면 다른 종류의 1레벨 공사비 평균
    const level = a && a.lv > 0 ? a.cost / a.lv : b && b.lv > 0 ? b.cost / b.lv : 0;
    let lv = 0;
    for (const x of levelsOf.get(o.id) ?? []) { const cost = costOf(kid, x.typeId); if (Number.isFinite(cost)) lv += cost * x.n; }
    let rent = 0;
    if (manor) {
      const sub = w.buildings.find((x) => x.regionId === o.regionId && isSubsistence(x.typeId));
      if (sub) { const mk = regionById(w, o.regionId).market; for (const [g, q] of Object.entries(sub.last.output)) rent += (q ?? 0) * mk[g as GoodId].price * TUNE.rentShare * TICKS_PER_WEEK; }
    }
    const net = (1 - (KEEP_SHARE[o.typeId] ?? 0)) * (1 - (manor ? 0 : TUNE.financeBonus));
    const idle = Math.max(0, o.cash ?? 0) + (spent.get(o.id) ?? 0);
    const value = lv + idle + rent * RENT_ASSET_WEEKS + level;
    const y = value > 0 ? ((Math.max(0, o.profitEma) * TICKS_PER_WEEK + r * (idle + level)) * net) / value : 0;
    m.set(o.id, { y, level });
  }
  viewCache.set(w, { step: stepOf(w), m });
  return m;
}

/** 귀족이 지분을 고르는 수익률 (AI 판단): TUNE.nobleChoice 1 이면 새 돈의 기대 수익률(ownerViews), 0 이면 지난 배당 ÷ 지분 값(unitYield) */
export function choiceYield(w: World, o: Building): number {
  return TUNE.nobleChoice ? (ownerViews(w).get(o.id)?.y ?? 0) : unitYield(w, o);
}

/** 틱마다 id → 건물 (같은 id 면 뒤의 것) */
const bIndex = new WeakMap<World, { tick: number; n: number; m: Map<number, Building> }>();
export function buildingIndex(w: World): Map<number, Building> {
  let c = bIndex.get(w);
  if (!c || c.tick !== w.tick || c.n !== w.buildings.length) {
    const m = new Map<number, Building>();
    for (const b of w.buildings) m.set(b.id, b);
    c = { tick: w.tick, n: w.buildings.length, m };
    bIndex.set(w, c);
  }
  return c.m;
}

/**
 * 귀족 pop 의 저택 지분 팔기 (지분 켬, market.ts investSurplus): 현금이 생활비 cashBufferDays 일치보다 need 만큼 모자라면 수익률(choiceYield)이 낮은 저택 지분부터
 * 지분 값에 저택에 판다 (저택 금고의 약정 뺀 돈까지). 판 지분은 없어진다
 */
export function sellManorUnits(w: World, p: Pop, need: number) {
  const f = p.fund;
  if (!f || !(need > 0)) return;
  const byId = buildingIndex(w);
  const held: Building[] = [];
  for (let i = 0; i < f.id.length; i++) { const o = byId.get(f.id[i]); if (o && o.typeId === 'manor' && f.u[i] > 0) held.push(o); }
  if (!held.length) return;
  held.sort((a, b) => choiceYield(w, a) - choiceYield(w, b) || a.id - b.id);
  for (const o of held) {
    if (!(need > 1e-9)) break;
    const nav = Math.max(0.01, o.nav ?? 1);
    const pay = Math.min(need, fundOf(p, o.id) * nav, Math.max(0, treasuryFree(w, o)));
    if (!(pay > 0)) continue;
    addFund(p, o.id, -pay / nav);
    o.cash = (o.cash ?? 0) - pay;
    p.savings += pay;
    need -= pay;
    flow('msell.manor', pay);
  }
}

/**
 * 저택 지분 운영 (매주, 지분 켬, updateFunds 에서): 귀족이 아니게 된 pop 의 저택 지분을 지분 값에 되산다 (금고의 약정 뺀 돈까지, 못 낸 몫은 다음 주),
 * 지분이 하나도 없으면 그 지역 귀족에게 새로 발행하고, 지분 값을 다시 잰다
 */
function updateManorShares(w: World, levelsOf: LevelsOf) {
  for (const o of w.buildings) {
    if (o.typeId !== 'manor') continue;
    const nav0 = Math.max(0.01, o.nav ?? 1);
    let u = 0;
    for (const p of w.pops) {
      const have = fundOf(p, o.id);
      if (!(have > 0)) continue;
      if (!isNoble(p.prof)) {
        const pay = Math.min(have * nav0, Math.max(0, treasuryFree(w, o)));
        if (pay > 0) {
          addFund(p, o.id, -pay / nav0);
          o.cash = (o.cash ?? 0) - pay;
          p.savings += pay;
          flow('mbuyback.manor', pay);
        }
      }
      u += fundOf(p, o.id);
    }
    const assets = ownerAssets(w, o, levelsOf);
    if (!(u > 1e-9)) { issueManorUnits(w, o, assets); continue; }
    o.nav = Math.max(0.01, assets / u);
  }
}

/**
 * 금융가 운영 (매주): 일하는 전문가에게 보장 임금(TUNE.financeWage × 인원 × 7)을 금고에서 주고, 지분 값(nav)을 다시 잰다.
 * 지분 값 = (금고 + 가진 레벨 × 그 건물 1레벨 공사비 추정) ÷ 지분 수 (지분이 없으면 1)
 */
export function updateFunds(w: World) {
  releaseTreasuries(w);
  const units = new Map<number, number>();
  for (const p of w.pops) { const f = p.fund; if (f) for (let i = 0; i < f.id.length; i++) units.set(f.id[i], (units.get(f.id[i]) ?? 0) + f.u[i]); }
  const levelsOf = ownedLevels(w);
  if (TUNE.manorShares) updateManorShares(w, levelsOf);
  for (const o of w.buildings) {
    if (o.typeId !== 'finance') continue;
    const staff = w.pops.filter((p) => p.work === o.id && p.size > 0);
    let wf = 0;
    for (const p of staff) wf += p.size;
    const pay = Math.min(Math.max(0, o.cash ?? 0), TUNE.financeWage * WORKFORCE_RATIO * wf * TICKS_PER_WEEK);
    if (pay > 0 && staff.length) { o.cash = (o.cash ?? 0) - pay; flow('staff.finance', pay); payPops(w, staff, pay, undefined, 'wages'); }
    const firm = companyById(w, kingdomById(w, kingdomOf(w, o.regionId)).privateIds[0]);
    let assets = Math.max(0, o.cash ?? 0);
    if (firm) for (const x of levelsOf.get(o.id) ?? []) { const c = constructionEstimate(w, firm, x.typeId).cost; if (Number.isFinite(c)) assets += c * x.n; }
    const u = units.get(o.id) ?? 0;
    o.nav = u > 0 ? Math.max(0.01, assets / u) : 1;
  }
}

/** 금고가 목표를 넘으면 매주 넘는 돈의 이 비율을 주인에게 돌려준다 (TUNE.treasuryKeepWeeks). 근거 없음 */
export const TREASURY_RELEASE = 0.25;

/**
 * 소유 건물 금고 목표: 아직 낼 공사 약정액 + 주간 배당·지대 수입(profitEma × 7) × TUNE.treasuryKeepWeeks.
 * TUNE.nobleChoice 1 (AI 판단): 약정 뺀 몫은 적어도 좋아하는 종류 1레벨 공사비 평균(ownerViews level). 수입이 없는 금융가(차가운 시작)도 1레벨을 낼 돈까지 새 지분을 판다
 */
export function treasuryTarget(w: World, o: Building): number {
  const keep = Math.max(0, o.profitEma) * TICKS_PER_WEEK * TUNE.treasuryKeepWeeks;
  const floor = TUNE.nobleChoice ? (ownerViews(w).get(o.id)?.level ?? 0) : 0;
  return (o.cash ?? 0) - treasuryFree(w, o) + Math.max(keep, floor);
}

/**
 * 넘는 금고 돌려주기 (매주, TUNE.treasuryKeepWeeks 주, 0 이면 끔): 저택·금융가 금고가 목표(treasuryTarget)를 넘으면 넘는 돈의 TREASURY_RELEASE 를
 * 금융가와 지분을 켠 저택(TUNE.manorShares)은 지분 주인에게 지분 수대로, 지분을 끈 저택은 앉은 귀족·하급 귀족에게 몫(shareWeight × 인원)대로 준다 (배당과 같은 나눔). 받을 사람이 없으면 그대로 둔다.
 * 진단: main ca544ed 5년 × 시드 1·2에서 두 금고 합이 7,500만 → 1억 9,400만~2억 2,700만(전체 돈의 약 65%)으로 쌓였다
 */
/**
 * 금고가 목표를 넘은 금융가 (TUNE.treasuryKeepWeeks > 0): 새 지분을 팔지 않는다 (market.ts investSurplus: 투자자는 현금을 그대로 든다).
 * 팔면 돌려준 돈이 그날 바로 지분 값으로 되돌아와 돌고, 그때마다 소득으로 잡힌다. 틱마다 처음 물을 때의 금고로 정한다
 */
const overCache = new WeakMap<World, { tick: number; over: Map<number, boolean> }>();
export function treasuryOver(w: World, o: Building): boolean {
  if (!(TUNE.treasuryKeepWeeks > 0)) return false;
  let c = overCache.get(w);
  if (!c || c.tick !== w.tick) { c = { tick: w.tick, over: new Map() }; overCache.set(w, c); }
  let v = c.over.get(o.id);
  if (v === undefined) { v = (o.cash ?? 0) > treasuryTarget(w, o); c.over.set(o.id, v); }
  return v;
}

function releaseTreasuries(w: World) {
  if (!(TUNE.treasuryKeepWeeks > 0)) return;
  for (const o of w.buildings) {
    if (o.typeId !== 'manor' && o.typeId !== 'finance') continue;
    const out = (Math.max(0, o.cash ?? 0) - treasuryTarget(w, o)) * TREASURY_RELEASE;
    if (!(out > 0)) continue;
    // 금융가와 지분을 켠 저택(TUNE.manorShares)은 지분 주인에게 지분 수대로
    const fin = o.typeId === 'finance' || !!TUNE.manorShares;
    const pops = fin ? w.pops.filter((p) => fundOf(p, o.id) > 0) : w.pops.filter((p) => p.work === o.id && p.size > 0);
    const weight = fin ? (p: Pop) => fundOf(p, o.id) : (p: Pop) => p.size * shareWeight(p.prof);
    if (!pops.some((p) => weight(p) > 0)) continue;
    o.cash = (o.cash ?? 0) - out;
    flow(`release.${o.typeId}`, out);
    payPops(w, pops, out, weight, 'other');
  }
}

/**
 * 배당 (빅토리아3 방식): 건물마다 지난주 이익에서 준비금을 뺀 몫을 레벨 주인에게 레벨 수대로 나눈다.
 * 민간 건물의 레벨 주인은 저택·금융가(공사비를 낸 곳)이고, 그 몫은 지분 주인(지분을 끈 저택은 앉은 귀족)의 소득이 된다 (일부는 그 금고로).
 * 왕실 건물은 레벨이 모두 국가 것이라 이익이 국고에 남는다 (유보 자산만 정산한다).
 */
export function payDividends(w: World, c: Company) {
  const mine = w.buildings.filter((b) => b.companyId === c.id && !BUILDING_BY_ID[b.typeId].auto);
  // 화면 표시용 기록 (b.payout): 주초 유보 자산과 이번 주 배당을 적는다. sim은 읽지 않는다
  const res0 = new Map(mine.map((b) => [b, b.reserve ?? 0] as const));
  const paid = new Map<Building, Record<number, number>>(mine.map((b) => [b, {}] as const));
  const record = (crown?: Map<Building, number>) => {
    for (const b of mine) b.payout = { reserve: (b.reserve ?? 0) - res0.get(b)!, paid: paid.get(b)!, ...(crown?.has(b) ? { crown: crown.get(b)! } : {}) };
  };
  if (c.state) {
    // 왕실 건물(생산 건물·건축사무소): 유보 자산을 정산하고 남는 이익이 국고 몫(배당)이다. 돈은 이미 국고에 있다
    const crown = new Map<Building, number>();
    for (const b of mine) if (hasReserve(b)) crown.set(b, settleReserve(b, b.profitEma * TICKS_PER_WEEK));
    fitReserves(w, c);
    record(crown);
    return;
  }
  const byId = new Map(w.buildings.map((b) => [b.id, b] as const));
  const toOwner = new Map<Building, number>();
  const due = new Map<Building, number>();
  for (const b of mine) due.set(b, hasReserve(b) ? settleReserve(b, b.profitEma * TICKS_PER_WEEK) : Math.max(0, b.profitEma) * TICKS_PER_WEEK * (1 - RESERVE_SHARE));
  // 민간 상회는 운영 자금(주간 임금 + 원료 × TUNE.firmBufferWeeks)을 남기고 배당한다 (임금과 원료는 판매 대금보다 먼저 나간다).
  // 운영 자금이 모자라면 레벨 주인(저택·금융가)이 가진 레벨 수대로 금고에서 채운다 (callCapital). 하루 운영비는 opsDay
  let ops = 0;
  for (const b of mine) ops += opsDay(w, c, b);
  const buffer = ops * TICKS_PER_WEEK * TUNE.firmBufferWeeks;
  const spare = fitReserves(w, c);
  if (spare < buffer) { callCapital(w, c, mine, byId, buffer - spare); record(); return; }
  let free = spare - buffer;
  for (const b of mine) {
    const profit = Math.min(free, due.get(b)!);
    if (profit <= 0) continue;
    free -= profit;
    c.cash -= profit;
    c.ledger.dividends += profit;
    const owners = Object.keys(b.owners ?? {}).map(Number).sort((x, y) => x - y);
    const n = owners.reduce((a, id) => a + b.owners![id], 0);
    const rec = paid.get(b)!;
    const fin = () => w.buildings.find((x) => x.regionId === b.regionId && x.typeId === 'finance')?.id ?? 0;
    if (n <= 0) { toFinance(w, b.regionId, profit, 'noOwner'); rec[fin()] = (rec[fin()] ?? 0) + profit; continue; }
    for (const id of owners) {
      const o = byId.get(id);
      let amt = (profit * b.owners![id]) / n;
      // 부재 지주 몫 (TUNE.absenteeShare): 자기 지역 밖 건물의 배당 중 이 비율은 그 건물 지역의 저택으로 간다 (옮길 뿐이라 돈은 그대로다)
      if (o && TUNE.absenteeShare > 0 && o.regionId !== b.regionId) {
        const local = w.buildings.find((x) => x.regionId === b.regionId && x.typeId === 'manor');
        if (local) {
          const cut = amt * TUNE.absenteeShare;
          amt -= cut;
          toOwner.set(local, (toOwner.get(local) ?? 0) + cut);
          flow('absentee.manor', cut);
          rec[local.id] = (rec[local.id] ?? 0) + cut;
        }
      }
      if (o) toOwner.set(o, (toOwner.get(o) ?? 0) + amt); else toFinance(w, b.regionId, amt);
      const key = o ? id : fin();
      rec[key] = (rec[key] ?? 0) + amt;
    }
  }
  for (const [o, amt] of toOwner) payOwners(w, o, amt);
  record();
}

/**
 * 민간 건물 b 의 하루 운영비 (운영 자금을 셀 때): 오늘 실제로 쓴 임금 + 원료.
 * AI 판단 (DECISIONS 7-40): 지금 값·임금으로 원료를 다 채워 돌리면 흑자인 생산 건물은 그 계획 운영비
 * (레벨 × 가동률 × 지금 일손 비율, market.ts collectOrders 가 원료를 사는 양과 같다)와 큰 쪽.
 * 실제로 쓴 돈만 세면 현금이 0 이 된 상회는 임금·원료를 못 내 그 값이 0 이 되고, 운영 자금도 0 으로 보여 주인이 채우지 않았다 (현금 0 함정)
 */
function opsDay(w: World, c: Company, b: Building): number {
  const paid = b.last.wageCost + b.last.inputCost;
  if (!b.active) return paid;
  const m = getMethod(b.typeId, b.methodId);
  if (m.construction || m.seats) return paid;
  const e = estimateMethod(w, b.regionId, b.typeId, b.methodId, wagesAt(c, b.typeId, w, b.regionId), b.stateOwned);
  if (!(e.profit > 0)) return paid;
  return Math.max(paid, (e.wageCost + e.inputCost) * b.level * b.utilization * Math.max(b.last.staffing, b.crew ?? 0));
}

/** 민간 상회의 운영 자금이 need 만큼 모자라면 그 상회 건물의 레벨 주인이 가진 레벨 수대로 금고(약정 뺀 돈)에서 낸다 (낼 수 있는 만큼) */
function callCapital(w: World, c: Company, mine: Building[], byId: Map<number, Building>, need: number) {
  const levels = new Map<number, number>();
  let total = 0;
  for (const b of mine) for (const [id, n] of Object.entries(b.owners ?? {})) { levels.set(Number(id), (levels.get(Number(id)) ?? 0) + n); total += n; }
  if (total <= 0) return;
  for (const id of [...levels.keys()].sort((a, b) => a - b)) {
    const o = byId.get(id);
    if (!o) continue;
    const amt = Math.min((need * levels.get(id)!) / total, Math.max(0, treasuryFree(w, o)));
    if (amt <= 0) continue;
    o.cash = (o.cash ?? 0) - amt;
    flow(`call.${o.typeId}`, amt);
    c.cash += amt; c.ledger.investment += amt;
  }
}

/** 철거 자재 판매 대금: 헐린 레벨의 주인이 받는다. 저택·금융가 레벨이면 그 금고로, 국영 레벨이면 국고(건물 주인 회사)로 */
export function paySalvage(w: World, lot: SalvageLot, amt: number) {
  const o = lot.ownerId != null ? w.buildings.find((x) => x.id === lot.ownerId) : undefined;
  if (o) { toTreasury(o, amt, 'salvage'); return; }
  const c = companyById(w, lot.companyId);
  if (c) { c.cash += amt; c.weekProfit += amt; c.ledger.sales += amt; } else w.fund += amt;
}

/** 소작지 현금 지대: 그 지역 저택에 준다 (TUNE.manorShares 이면 지분 주인에게, 아니면 앉은 귀족에게, 일부는 저택 금고로). 저택이 없거나 (지분을 끈 때) 앉은 사람이 없으면 false */
export function payRent(w: World, regionId: number, amount: number): boolean {
  const manor = w.buildings.find((x) => x.regionId === regionId && x.typeId === 'manor');
  if (!manor) return false;
  // 지분 켬(TUNE.manorShares): 지대는 지분 주인에게 (지분이 없으면 저택 금고로, payHolders)
  if (!TUNE.manorShares && !w.pops.some((p) => p.work === manor.id && p.size > 0)) return false;
  payOwners(w, manor, amount, 'rent');
  return true;
}

// ---------------------------------------------------------------- 소유 건물 금고와 민간 공사비

/** 공사 k 에서 소유 건물 ownerId 가 아직 낼 약정액: 약정액 − 이미 낸 몫 (공사비는 약정액 비율로 나눠 낸다) */
function pledgeLeft(k: Construction, ownerId: number): number {
  const f = k.funders;
  if (!f || !f[ownerId]) return 0;
  let total = 0;
  for (const v of Object.values(f)) total += v;
  return total > 0 ? Math.max(0, f[ownerId] - (k.spent * f[ownerId]) / total) : 0;
}

/** 소유 건물이 새 일에 쓸 수 있는 금고 돈: 금고 − 진행 중 공사에 아직 낼 약정액 */
export function treasuryFree(w: World, o: Building): number {
  let left = 0;
  for (const k of w.constructions) if (k.funders?.[o.id]) left += pledgeLeft(k, o.id);
  return (o.cash ?? 0) - left;
}

/** 왕국의 소유 건물(저택·금융가) */
export function ownerBuildings(w: World, kingdomId: number): Building[] {
  const mine = new Set(w.regions.filter((r) => r.kingdomId === kingdomId).map((r) => r.id));
  return w.buildings.filter((b) => mine.has(b.regionId) && isOwnerBuilding(b.typeId));
}

/** 땅 건물 (농지·산림·광맥을 쓰는 건물) */
function landType(typeId: string): boolean {
  const land = BUILDING_BY_ID[typeId].land;
  return land === 'arable' || land === 'forest' || land === 'ore';
}

/** 저택은 땅 건물(농지·산림·광맥)을, 금융가는 그 밖의 건물을 더 좋아한다 (AI 성향) */
export function favours(o: Building, typeId: string): boolean {
  return o.typeId === 'manor' ? landType(typeId) : !landType(typeId);
}

/** 소유 건물이 이 지역·이 건물에 돈을 낼 마음 (AI 성향): 같은 지역 × (1 + TUNE.localBias), 좋아하지 않는 종류 × TUNE.ownerTilt */
export function funderWeight(o: Building, regionId: number, typeId: string): number {
  return (o.regionId === regionId ? 1 + TUNE.localBias : 1) * (favours(o, typeId) ? 1 : TUNE.ownerTilt);
}

/**
 * 민간 공사의 돈줄 (AI 판단): 왕국 저택·금융가 중 마음(funderWeight)이 큰 곳부터, 낼 수 있는 만큼 레벨 단위로 맡긴다.
 * 레벨 단위로 다 못 맡기면 남은 레벨은 남은 금고 돈을 모아 함께 낸다. 모자라면 null.
 * financeFirst (TUNE.lawSteer, policy.ts lawSteer): 금융가를 마음과 상관없이 먼저 세운다 (금융가가 낼 수 있는 만큼 맡고 나머지를 저택이 함께 낸다).
 * 돌려주는 값: 소유 건물 id → 약정액 (합 = 레벨당 공사비 × 레벨)
 */
export function chooseFunders(w: World, kingdomId: number, regionId: number, typeId: string, levels: number, perLevel: number, financeFirst = false): Record<number, number> | null {
  if (!(perLevel > 0) || !Number.isFinite(perLevel)) return null;
  const fin = (o: Building) => (financeFirst && o.typeId === 'finance' ? 1 : 0);
  const cands = ownerBuildings(w, kingdomId).map((o) => ({ o, free: treasuryFree(w, o), wt: funderWeight(o, regionId, typeId) }))
    .filter((x) => x.free > 0).sort((a, b) => fin(b.o) - fin(a.o) || b.wt - a.wt || b.free - a.free || a.o.id - b.o.id);
  const out: Record<number, number> = {};
  let left = levels;
  for (const x of cands) {
    if (left <= 0) break;
    const n = Math.min(left, Math.floor(x.free / perLevel));
    if (n <= 0) continue;
    out[x.o.id] = n * perLevel;
    x.free -= n * perLevel;
    left -= n;
  }
  if (left > 0) {
    // 남은 몫이 공사비의 10억분의 1 아래면 다 모은 것으로 본다 (부동소수점 오차)
    let need = left * perLevel;
    const done = perLevel * 1e-9;
    for (const x of cands) {
      if (need <= done) break;
      const give = Math.min(need, x.free);
      if (!(give > 0)) continue;
      out[x.o.id] = (out[x.o.id] ?? 0) + give;
      need -= give;
    }
    if (need > done) return null;
  }
  return out;
}

/** 왕국 저택·금융가 금고 중 새 공사에 쓸 수 있는 돈의 합 */
export function ownerFunds(w: World, kingdomId: number): number {
  let t = 0;
  for (const o of ownerBuildings(w, kingdomId)) t += Math.max(0, treasuryFree(w, o));
  return t;
}

/**
 * 왕실이 남는 돈으로 국채를 갚는다. 주인 없는 돈은 지역 금융가 금고로 간다 (인구 비례).
 * 돈이 어디에도 고이지 않게 하는 일반 규칙.
 */
export function weeklyBanking(w: World) {
  for (const c of w.companies) {
    if (c.debt <= 0) continue;
    const spare = c.cash - weeklyWageBill(w, c) * 2 - buildingReserves(w, c);
    if (spare > 0) repay(w, c, spare * 0.2);
  }
  const pool = Math.max(0, w.fund);
  w.fund -= pool;
  if (pool <= 0) return;
  const popOf = new Map<number, number>();
  let total = 0;
  for (const p of w.pops) { popOf.set(p.regionId, (popOf.get(p.regionId) ?? 0) + p.size); total += p.size; }
  if (total <= 0) { w.fund += pool; return; }
  for (const r of w.regions) toFinance(w, r.id, (pool * (popOf.get(r.id) ?? 0)) / total, 'ownerless');
}

// ---------------------------------------------------------------- 주조와 보유고 (빅토리아3 방식)

/** 주조: 왕국마다 매주 기본액 + 주간 총생산 × 비율만큼 국고에 새 돈이 생긴다 */
export const MINT_BASE = ABS_LIMITS.mintBase;
export const MINT_RATE = 0.03;

/** 국고가 쓸 곳: 준비금 + 진행 중 공사 + 석 달 공사비 */
export function treasuryNeed(w: World, c: Company): number {
  return reserveOf(w, c) + committedCost(w, c) + constructionEstimate(w, c, 'farm').costPerDay * 90;
}

export function mintMoney(w: World) {
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId);
    if (!gov) continue;
    const amt = ABS_LIMITS.mintBase + (kingdomGdp(w, k.id) * TICKS_PER_WEEK / 360) * MINT_RATE;
    // 예산 미리보기 기준값 (화면 전용): 이번 주 주조액 (주 1회만 바뀐다)
    (k.budgetBase ??= {}).mint = amt;
    gov.cash += amt;
    gov.weekProfit += amt;
    gov.ledger.mint += amt;
    k.revenueWeek += amt;
    w.mint.minted += amt;
  }
}

/** 건물 레벨 주인 한 줄 + 지분 비율과 지난주 받은 배당 (화면용, buildingEcon) */
export interface OwnerShare extends LevelOwner {
  /** 레벨 비율 0..1 (levels ÷ 건물 레벨) */
  share: number;
  /** 지난 주간 정산에서 이 주인이 받은 배당 (국가: 유보 자산을 뺀 이익, 국고에 남는다) */
  dividendWeek: number;
}

/** 건물 하나의 수지·지분 (화면용 순수 함수). day = 오늘(마지막 하루) 장부, week = 주 단위 */
export interface BuildingEcon {
  /** 하루: 매출(행정청은 세금 몫, 건축사무소는 공사 수수료), 그중 세금 몫, 그중 공사 수수료, 원료비, 임금(민간 건물의 소유 직종은 임금 대신 배당이라 빠진다), 이익 = 매출 − 원료비 − 임금 */
  day: { sales: number; tax: number; fee: number; inputs: number; wages: number; profit: number };
  /** 이익률 = 하루 이익 ÷ 매출 (매출이 0이면 null) */
  margin: number | null;
  /** 주간 이익 = profitEma × 7 (이동평균), 레벨당 주간 이익 */
  profitWeek: number;
  profitWeekPerLevel: number;
  /** 유보 자산을 쌓는 건물인가, 지금 유보 자산, 상한, 지난주 증감 */
  hasReserve: boolean;
  reserve: number;
  reserveCap: number;
  reserveWeek: number;
  /** 지난주 배당 합과 주인별 내역 (주인이 없는 몫은 ownerless 로). 국영 건물은 국고 몫 (payout.crown) */
  dividendsWeek: number;
  owners: OwnerShare[];
  /** 주인 목록에 없는 곳(주인 없는 레벨 → 지역 금융가)으로 간 지난주 배당: 소유 건물 id(0 = 주인 없는 돈) → 금액 */
  ownerless: Record<number, number>;
  /** 충원율 0..1, 고용(노동 인구), 일자리(노동 인구, 가동률 반영) */
  staffing: number;
  employed: number;
  jobs: number;
}

export function buildingEcon(w: World, b: Building): BuildingEcon {
  const L = b.last;
  const profit = L.revenue - L.inputCost - L.wageCost;
  const paid = b.payout?.paid ?? {};
  const owners: OwnerShare[] = levelOwnersOf(w, b).map((o) => ({
    ...o,
    share: b.level > 0 ? o.levels / b.level : 0,
    dividendWeek: o.ownerBuildingId !== undefined ? round2(paid[o.ownerBuildingId] ?? 0) : o.owner === 'state' ? round2(b.payout?.crown ?? 0) : 0,
  }));
  const ownerless: Record<number, number> = {};
  let dividendsWeek = b.payout?.crown ?? 0;
  for (const id of Object.keys(paid).map(Number)) {
    dividendsWeek += paid[id];
    if (!owners.some((o) => o.ownerBuildingId === id)) ownerless[id] = round2(paid[id]);
  }
  let employed = 0, jobs = 0;
  for (const s of SKILLS) { employed += b.employed[s]; jobs += slots(b, s); }
  const week = b.profitEma * TICKS_PER_WEEK;
  return {
    day: { sales: round2(L.revenue), tax: round2(L.tax ?? 0), fee: round2(L.fee ?? 0), inputs: round2(L.inputCost), wages: round2(L.wageCost), profit: round2(profit) },
    margin: L.revenue > 0 ? profit / L.revenue : null,
    profitWeek: round2(week),
    profitWeekPerLevel: b.level > 0 ? round2(week / b.level) : 0,
    hasReserve: hasReserve(b),
    reserve: round2(b.reserve ?? 0),
    reserveCap: hasReserve(b) ? reserveCap(b) : 0,
    reserveWeek: round2(b.payout?.reserve ?? 0),
    dividendsWeek: round2(dividendsWeek),
    owners,
    ownerless,
    staffing: crewOf(b),
    employed: round2(employed),
    jobs: round2(jobs),
  };
}
