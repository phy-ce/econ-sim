import { BUILDING_BY_ID, GOODS, SKILL_DEFS, TECH_BY_ID, TICKS_PER_WEEK, TUNE, getMethod } from './data';
import { collectionRatio, companyById, regionById, constructionEstimate, efficiency, isGovernment, isOwnerBuilding, kingdomGdp, logEvent, paysDividend, repay, sellThrough, shareWeight } from './economy';
import { techNameEn } from './i18n';
import { kingdomById, kingdomOf, toFinance, toTreasury } from './kingdoms';
import { tenantSaleBag } from './market';
import { payPops } from './pops';
import { round2 } from './rng';
import { LOWER_JOBS, SKILLS, crewOf } from './types';
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
      c.research.budget = 0;
    }
  }
}

/** 연구비는 그 왕국 연구원(전문가·기술자) pop 의 소득이 된다 */
export const RESEARCHER_WEIGHT: Partial<Record<PopClass, number>> = { skilled: 0.3, expert: 1 };

export function doResearch(w: World) {
  shareTechs(w);
}

/** 연구비를 쓴다: 그 왕국 연구원 pop 의 소득이 되고 진행 중인 기술에 쌓인다. 쓴 돈을 돌려준다 */
function fundResearch(w: World, c: Company, amount: number): number {
  const r = c.research;
  const tech = r.current ? TECH_BY_ID[r.current] : undefined;
  if (!tech || r.known.includes(tech.id)) { r.current = null; return 0; }
  const spend = Math.min(amount, Math.max(0, c.cash), tech.cost - (r.progress[tech.id] ?? 0));
  if (spend <= 0) return 0;
  c.cash -= spend;
  c.weekProfit -= spend;
  c.ledger.research += spend;
  const mine = w.pops.filter((p) => kingdomOf(w, p.regionId) === c.kingdomId && RESEARCHER_WEIGHT[p.prof]);
  if (!payPops(w, mine, spend, (p) => p.size * (RESEARCHER_WEIGHT[p.prof] ?? 0))) {
    const all = w.pops.filter((p) => RESEARCHER_WEIGHT[p.prof]);
    if (!payPops(w, all, spend, (p) => p.size * (RESEARCHER_WEIGHT[p.prof] ?? 0))) w.fund += spend;
  }
  r.progress[tech.id] = (r.progress[tech.id] ?? 0) + spend;
  if (r.progress[tech.id] >= tech.cost - 1e-6) {
    r.known.push(tech.id);
    r.current = null;
    logEvent(w, c.id, `기술 연구 완료: ${tech.name}. 보유 건물의 생산 방식에서 새 방식을 고를 수 있습니다.`,
      { kind: 'info', en: `Research complete: ${techNameEn(tech.id)}. New production methods can now be chosen for your buildings.` });
  }
  return spend;
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

/** 정책 단계(1~5)의 배율: 세금 수준 TUNE.taxLevels, 국영 임금 수준 TUNE.govWageLevels, 연구비 수준 TUNE.researchLevels */
export function budgetMult(k: Kingdom, item: BudgetItem): number {
  const table = item === 'tax' ? TUNE.taxLevels : item === 'wages' ? TUNE.govWageLevels : TUNE.researchLevels;
  return table[k.budget[item] - 1];
}

/** 지금 세율 = 세법의 기본 세율(TUNE) × 세금 수준 배율. 토지 기반은 토지세만, 1인당은 인두세와 소득세만 걷는다 */
export function taxRates(k: Kingdom, law: TaxLaw = k.taxLaw): { land: number; poll: number; income: number } {
  const m = budgetMult(k, 'tax');
  return law === 'land' ? { land: TUNE.landTax * m, poll: 0, income: 0 } : { land: 0, poll: TUNE.pollTax * m, income: TUNE.incomeTax * m };
}

/**
 * 임금 지수 (매주, 빅토리아3의 '보통 임금'): 왕국 민간 건물 노동자·농부의 평균 임금 ÷ 기본 임금 (고용 가중)의 이동평균.
 * 국영 임금은 이 지수에 직종별 기본 임금(노동자 10, 기술자 15, 전문가 40 …)을 곱한다. 민간 노동자 고용이 없으면 그대로 둔다
 */
export function updateWageIndex(w: World, k: Kingdom) {
  let paid = 0, base = 0;
  for (const b of w.buildings) {
    if (b.stateOwned || BUILDING_BY_ID[b.typeId].auto || kingdomOf(w, b.regionId) !== k.id) continue;
    const c = companyById(w, b.companyId);
    if (!c) continue;
    for (const s of LOWER_JOBS) { paid += b.employed[s] * c.wages[s]; base += b.employed[s] * SKILL_DEFS[s].baseWage; }
  }
  if (base <= 0) return;
  k.wageIndex = round2(k.wageIndex == null ? paid / base : k.wageIndex * 0.75 + (paid / base) * 0.25);
}

/** 국영 임금 (빅토리아3 정부 임금): 기본 임금 × 임금 지수 × 국영 임금 수준 배율. 왕실의 모든 건물이 이 임금을 준다 */
export function applyStateWages(w: World, k: Kingdom) {
  const gov = companyById(w, k.governmentId);
  if (!gov) return;
  for (const s of SKILLS) gov.wages[s] = round2(SKILL_DEFS[s].baseWage * (k.wageIndex ?? 1) * budgetMult(k, 'wages'));
}

/**
 * 국정 예산 (매주): 금액을 편성하지 않는다. 왕실 정부 건물(행정청·건축사무소·학교)은 늘 다 가동하고 임금과 원료를 국고에서 낸다.
 * 여기서는 연구비(주간 경제 규모 × TUNE.researchShare × 연구비 수준 배율)를 내고, 국영 임금을 다시 정하고, 지난주 국정 수지를 적는다.
 * 국고가 모자라면 임금·원료는 국채로 낸다 (payWages, collectOrders). 연구비는 현금이 있는 만큼만 낸다
 */
export function spendBudget(w: World) {
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId);
    const week = dailyOutput(w, k.id) * TICKS_PER_WEEK;
    k.output = round2(k.output == null ? week : k.output * 0.75 + week * 0.25);
    const spent = k.spentWeek ?? { wages: 0, goods: 0 };
    const revenue = k.revenueWeek;
    k.revenueWeek = 0;
    k.spentWeek = { wages: 0, goods: 0 };
    if (!gov) continue;
    const research = fundResearch(w, gov, k.output * TUNE.researchShare * budgetMult(k, 'research'));
    gov.research.budget = round2(research / TICKS_PER_WEEK);
    const b = { revenue: round2(revenue), tariffs: round2(k.tariffWeek ?? 0), fees: round2(gov.ledger.buildFees), wages: round2(spent.wages), goods: round2(spent.goods), research: round2(research), interest: round2(gov.ledger.interest) };
    k.lastBudget = b;
    const net = b.wages + b.goods + b.research + b.interest - b.fees;
    k.expenseEma = round2(k.expenseEma == null ? net : k.expenseEma * 0.75 + net * 0.25);
    // 예산 미리보기 기준값 (화면 전용). 수수료는 건축사무소 임금 몫(국영 임금 배율 1로 환산)과 나머지로 나눈다
    const base = (k.budgetBase ??= {});
    const a = budgetEmaWeight(w, 0.25);
    const ema = (old: number | undefined, x: number) => round2(old == null ? x : old * (1 - a) + x * a);
    const fw = k.feeWageWeek ?? 0;
    base.tariffs = ema(base.tariffs, k.tariffWeek ?? 0);
    base.feesWage = ema(base.feesWage, fw);
    base.feesOther = ema(base.feesOther, Math.max(0, b.fees - fw * budgetMult(k, 'wages')));
    base.goods = ema(base.goods, b.goods);
    k.tariffWeek = 0;
    k.feeWageWeek = 0;
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
/** 그 pop 이 하루에 내야 할 세금 (인두세 + 소득세, 저축 한도 전). 토지 기반 과세면 0 (토지세는 수확에서 걷는다) */
export function taxDue(w: World, p: Pop, law?: TaxLaw): number {
  const k = kingdomById(w, kingdomOf(w, p.regionId));
  const t = taxRates(k, law ?? k.taxLaw);
  return p.size * t.poll * (p.prof === 'peasant' ? TUNE.peasantPoll : 1) + Math.max(0, p.incomeEma) * t.income;
}

/**
 * 그 세법으로 지금 하루에 걷힐 세금 (징수율 전). 토지 기반 = 소작지 판매분 대금 × 토지세율 (landTaxValue),
 * 1인당 = pop 마다 min(저축, 낼 세금)
 */
export function lawRevenue(w: World, k: Kingdom, law: TaxLaw): number {
  if (law === 'land') {
    let v = 0;
    for (const b of w.buildings) {
      if (b.typeId !== 'subsistence' || kingdomOf(w, b.regionId) !== k.id) continue;
      v += landTaxValue(regionById(w, b.regionId), tenantSaleBag(w, b), taxRates(k, 'land').land);
    }
    return v;
  }
  let v = 0;
  for (const p of w.pops) if (kingdomOf(w, p.regionId) === k.id) v += Math.min(p.savings, taxDue(w, p, 'capita'));
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
    // 토지세는 어제 지대에서 걷힌 몫을 더한다
    owed.set(k.id, (owed.get(k.id) ?? 0) + (k.landOwed ?? 0));
    k.taxOwed = (k.taxOwed ?? owed.get(k.id) ?? 0) * 0.9 + (owed.get(k.id) ?? 0) * 0.1;
    k.taxRatio = round2(collectionRatio(cap, n));
    ratio.set(k.id, collectionRatio(cap, n));
  }
  const got = new Map<number, number>(), landGot = new Map<number, number>();
  for (const k of w.kingdoms) {
    got.set(k.id, k.landGot ?? 0); landGot.set(k.id, k.landGot ?? 0); k.landGot = 0; k.landOwed = 0;
  }
  for (const p of w.pops) {
    const kid = kingdomOf(w, p.regionId);
    const gov = companyById(w, kingdomById(w, kid).governmentId);
    const tax = taxOf(p) * (ratio.get(kid) ?? 1);
    if (!gov || tax <= 0) continue;
    p.savings -= tax;
    p.lastIncome -= tax;
    gov.cash += tax;
    kingdomById(w, kid).revenueWeek += tax;
    got.set(kid, (got.get(kid) ?? 0) + tax);
  }
  // 예산 미리보기 기준: 세금 수준 단계마다 하루 세입의 이동평균 (화면 전용, sim 은 읽지 않는다).
  // pop 세금은 단계별로 저축 한도를 다시 걸고, 토지세는 배율에 비례한다
  const a = budgetEmaWeight(w, 0.1);
  for (const k of w.kingdoms) {
    const m = budgetMult(k, 'tax'), r = ratio.get(k.id) ?? 1, land = landGot.get(k.id) ?? 0;
    const arr = byStep.get(k.id);
    const base = (k.budgetBase ??= {});
    const old = base.taxBy;
    base.taxBy = TUNE.taxLevels.map((ms, i) => {
      const day = (arr?.[i] ?? 0) * r + (m > 0 ? land * ms / m : 0);
      return round2(old?.[i] == null ? day : old[i] * (1 - a) + day * a);
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

/** 소유 건물에서 받은 몫 중 그 소유 건물 금고에 남기는 비율 (빅토리아3 기본률: 금융가 30%, 저택 20%) */
export const INVEST_SHARE: Partial<Record<PopClass, number>> = { capitalist: 0.3, aristocrat: 0.2, gentry: 0.2 };

export function weeklyWageBill(w: World, c: Company): number {
  let bill = 0;
  for (const b of w.buildings) if (b.companyId === c.id && !BUILDING_BY_ID[b.typeId].auto) for (const s of SKILLS) if (!paysDividend(b.stateOwned, s)) bill += b.employed[s] * c.wages[s];
  return bill * TICKS_PER_WEEK;
}

/** 회사가 늘 남겨 두는 현금: 기본 + 주간 임금 + 주간 연구비 + 건물 유보 자산 합 (공사·투자에 쓰지 않는다) */
export function reserveOf(w: World, c: Company): number {
  return 50_000 + weeklyWageBill(w, c) + c.research.budget * TICKS_PER_WEEK + buildingReserves(w, c);
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

/** 유보 자산을 쌓는 건물: 파는 건물 (정부 건물·학교·건축사무소는 이익이 없어 쌓지 않는다) */
export function hasReserve(b: Building): boolean {
  if (BUILDING_BY_ID[b.typeId].auto || isGovernment(b.typeId)) return false;
  const m = getMethod(b.typeId, b.methodId);
  return !m.construction && !m.seats;
}

/** 방식 1레벨의 주간 산출 가치 (기본가, 만원 가동). 상품을 내지 않는 방식(건축사무소·학교·행정청)은 0 */
export function weeklyOutputValue(typeId: string, methodId: string): number {
  let v = 0;
  for (const [g, q] of Object.entries(getMethod(typeId, methodId).outputs) as [GoodId, number][]) v += q * GOODS[g].basePrice;
  return v * TICKS_PER_WEEK;
}

/** 건물 유보 자산 상한: 레벨 × 지금 방식의 레벨당 주간 산출 가치(기본가) × TUNE.reserveWeeks. 방식을 바꿔 상한이 줄면 다음 정산에서 상한까지 줄인다 */
export function reserveCap(b: Building): number {
  return round2(b.level * weeklyOutputValue(b.typeId, b.methodId) * TUNE.reserveWeeks);
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
  if (weekProfit <= 0) { b.reserve = round2(Math.max(0, res + weekProfit)); return 0; }
  // 유보 자산이 찰수록 적립 비율이 줄어든다 (비었으면 RESERVE_SHARE, 가득 차면 0): 배당이 한꺼번에 뛰지 않게
  const cap = reserveCap(b);
  const keep = cap > 0 ? Math.max(0, Math.min(cap - res, weekProfit * RESERVE_SHARE * (1 - res / cap))) : 0;
  b.reserve = round2(res + keep);
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

/** 소유 건물 o 에 앉은 pop 에게 배당·지대를 몫(shareWeight × 인원)대로 나눠 준다: 받은 몫의 일부(INVEST_SHARE)는 o 의 금고로. 앉은 사람이 없으면 모두 금고로 */
function payOwners(w: World, o: Building, amount: number) {
  if (amount <= 0) return;
  o.last.revenue += amount;
  const pops = w.pops.filter((p) => p.work === o.id && p.size > 0);
  let total = 0;
  for (const p of pops) total += p.size * shareWeight(p.prof);
  if (total <= 0) { toTreasury(o, amount); return; }
  for (const p of pops) {
    const amt = (amount * p.size * shareWeight(p.prof)) / total;
    const invest = amt * (INVEST_SHARE[p.prof] ?? 0);
    toTreasury(o, invest);
    payPops(w, [p], amt - invest);
  }
}

/**
 * 배당 (빅토리아3 방식): 건물마다 지난주 이익에서 준비금을 뺀 몫을 레벨 주인에게 레벨 수대로 나눈다.
 * 민간 건물의 레벨 주인은 저택·금융가(공사비를 낸 곳)이고, 그 몫은 거기 앉은 귀족·자본가의 소득이 된다 (일부는 그 금고로).
 * 왕실 건물은 레벨이 모두 국가 것이라 이익이 국고에 남는다 (유보 자산만 정산한다).
 */
export function payDividends(w: World, c: Company) {
  const mine = w.buildings.filter((b) => b.companyId === c.id && !BUILDING_BY_ID[b.typeId].auto);
  if (c.state) {
    for (const b of mine) if (hasReserve(b)) settleReserve(b, b.profitEma * TICKS_PER_WEEK);
    fitReserves(w, c);
    return;
  }
  const byId = new Map(w.buildings.map((b) => [b.id, b] as const));
  const toOwner = new Map<Building, number>();
  const due = new Map<Building, number>();
  for (const b of mine) due.set(b, hasReserve(b) ? settleReserve(b, b.profitEma * TICKS_PER_WEEK) : Math.max(0, b.profitEma) * TICKS_PER_WEEK * (1 - RESERVE_SHARE));
  let free = fitReserves(w, c);
  for (const b of mine) {
    const profit = Math.min(free, due.get(b)!);
    if (profit <= 0) continue;
    free -= profit;
    c.cash -= profit;
    c.ledger.dividends += profit;
    const owners = Object.keys(b.owners ?? {}).map(Number).sort((x, y) => x - y);
    const n = owners.reduce((a, id) => a + b.owners![id], 0);
    if (n <= 0) { toFinance(w, b.regionId, profit); continue; }
    for (const id of owners) {
      const o = byId.get(id);
      const amt = (profit * b.owners![id]) / n;
      if (o) toOwner.set(o, (toOwner.get(o) ?? 0) + amt); else toFinance(w, b.regionId, amt);
    }
  }
  for (const [o, amt] of toOwner) payOwners(w, o, amt);
}

/** 철거 자재 판매 대금: 헐린 레벨의 주인이 받는다. 저택·금융가 레벨이면 그 금고로, 국영 레벨이면 국고(건물 주인 회사)로 */
export function paySalvage(w: World, lot: SalvageLot, amt: number) {
  const o = lot.ownerId != null ? w.buildings.find((x) => x.id === lot.ownerId) : undefined;
  if (o) { toTreasury(o, amt); return; }
  const c = companyById(w, lot.companyId);
  if (c) { c.cash += amt; c.weekProfit += amt; c.ledger.sales += amt; } else w.fund += amt;
}

/** 소작지 수확 out 에서 토지세율 rate 만큼 걷어 팔 때 받을 대금: 시장가 × 팔리는 비율 (안 팔리는 곡물은 세입이 되지 않는다) */
export function landTaxValue(r: Region, out: GoodBag, rate: number): number {
  let v = 0;
  for (const g of Object.keys(out) as GoodId[]) v += (out[g] ?? 0) * r.market[g].price * sellThrough(r.market[g]);
  return v * rate;
}

/** 토지세 판매 대금은 국고로 (행정청 손익용으로 걷힌 몫을 센다) */
export function payLandTax(w: World, regionId: number, amount: number) {
  const k = kingdomById(w, kingdomOf(w, regionId));
  const gov = companyById(w, k.governmentId);
  if (!gov) { w.fund += amount; return; }
  gov.cash += amount;
  k.revenueWeek += amount;
  k.landGot = (k.landGot ?? 0) + amount;
}

/** 소작지 현금 지대: 그 지역 저택에 앉은 귀족에게 준다 (배당처럼 일부는 저택 금고로). 받을 사람이 없으면 false */
export function payRent(w: World, regionId: number, amount: number): boolean {
  const manor = w.buildings.find((x) => x.regionId === regionId && x.typeId === 'manor');
  if (!manor) return false;
  if (!w.pops.some((p) => p.work === manor.id && p.size > 0)) return false;
  payOwners(w, manor, amount);
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

/** 저택은 땅 건물(농지·산림·광맥)을, 금융가는 그 밖의 건물을 더 좋아한다 (AI 성향) */
export function favours(o: Building, typeId: string): boolean {
  const land = BUILDING_BY_ID[typeId].land;
  const landBuilding = land === 'arable' || land === 'forest' || land === 'ore';
  return o.typeId === 'manor' ? landBuilding : !landBuilding;
}

/** 소유 건물이 이 지역·이 건물에 돈을 낼 마음 (AI 성향): 같은 지역 × (1 + TUNE.localBias), 좋아하지 않는 종류 × TUNE.ownerTilt */
export function funderWeight(o: Building, regionId: number, typeId: string): number {
  return (o.regionId === regionId ? 1 + TUNE.localBias : 1) * (favours(o, typeId) ? 1 : TUNE.ownerTilt);
}

/**
 * 민간 공사의 돈줄 (AI 판단): 왕국 저택·금융가 중 마음(funderWeight)이 큰 곳부터, 낼 수 있는 만큼 레벨 단위로 맡긴다.
 * 레벨 단위로 다 못 맡기면 남은 레벨은 남은 금고 돈을 모아 함께 낸다. 모자라면 null.
 * 돌려주는 값: 소유 건물 id → 약정액 (합 = 레벨당 공사비 × 레벨)
 */
export function chooseFunders(w: World, kingdomId: number, regionId: number, typeId: string, levels: number, perLevel: number): Record<number, number> | null {
  if (!(perLevel > 0) || !Number.isFinite(perLevel)) return null;
  const cands = ownerBuildings(w, kingdomId).map((o) => ({ o, free: treasuryFree(w, o), wt: funderWeight(o, regionId, typeId) }))
    .filter((x) => x.free > 0).sort((a, b) => b.wt - a.wt || b.free - a.free || a.o.id - b.o.id);
  const out: Record<number, number> = {};
  let left = levels;
  for (const x of cands) {
    if (left <= 0) break;
    const n = Math.min(left, Math.floor(x.free / perLevel));
    if (n <= 0) continue;
    out[x.o.id] = round2(n * perLevel);
    x.free -= n * perLevel;
    left -= n;
  }
  if (left > 0) {
    let need = left * perLevel;
    for (const x of cands) {
      if (need <= 0.005) break;
      const give = Math.min(need, x.free);
      if (give <= 0) continue;
      out[x.o.id] = round2((out[x.o.id] ?? 0) + give);
      need -= give;
    }
    if (need > 0.005) return null;
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
 * 왕실이 남는 돈으로 국채를 갚는다. 상인 조합이 자본보다 크게 쌓은 돈과 주인 없는 돈은 지역 금융가 금고로 간다 (인구 비례).
 * 돈이 어디에도 고이지 않게 하는 일반 규칙.
 */
export function weeklyBanking(w: World) {
  for (const c of w.companies) {
    if (c.debt <= 0) continue;
    const spare = c.cash - weeklyWageBill(w, c) * 2 - buildingReserves(w, c);
    if (spare > 0) repay(w, c, spare * 0.2);
  }
  let pool = Math.max(0, w.fund);
  w.fund -= pool;
  const traderExcess = w.traders.cash - w.traders.capital * 1.2;
  if (traderExcess > 0) { w.traders.cash -= traderExcess; pool += traderExcess; }
  if (pool <= 0) return;
  const popOf = new Map<number, number>();
  let total = 0;
  for (const p of w.pops) { popOf.set(p.regionId, (popOf.get(p.regionId) ?? 0) + p.size); total += p.size; }
  if (total <= 0) { w.fund += pool; return; }
  for (const r of w.regions) toFinance(w, r.id, (pool * (popOf.get(r.id) ?? 0)) / total);
}

// ---------------------------------------------------------------- 주조와 보유고 (빅토리아3 방식)

/** 주조: 왕국마다 매주 기본액 + 주간 총생산 × 비율만큼 국고에 새 돈이 생긴다 */
export const MINT_BASE = 1_000;
export const MINT_RATE = 0.03;

/** 국고가 쓸 곳: 준비금 + 진행 중 공사 + 석 달 공사비 + 진행 중 연구의 남은 비용 */
export function treasuryNeed(w: World, c: Company): number {
  const t = c.research.current ? TECH_BY_ID[c.research.current] : undefined;
  const research = t ? Math.max(0, t.cost - (c.research.progress[t.id] ?? 0)) : 0;
  return reserveOf(w, c) + committedCost(w, c) + constructionEstimate(w, c, 'farm').costPerDay * 90 + research;
}

export function mintMoney(w: World) {
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId);
    if (!gov) continue;
    const amt = MINT_BASE + (kingdomGdp(w, k.id) * TICKS_PER_WEEK / 360) * MINT_RATE;
    // 예산 미리보기 기준값 (화면 전용): 이번 주 주조액 (주 1회만 바뀐다)
    (k.budgetBase ??= {}).mint = round2(amt);
    gov.cash += amt;
    gov.weekProfit += amt;
    gov.ledger.mint += amt;
    k.revenueWeek += amt;
    w.mint.minted += amt;
  }
}
