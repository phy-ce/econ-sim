import { TECH_BY_ID, TICKS_PER_WEEK, TUNE, getMethod } from './data';
import { borrow, collectionRatio, companyById, regionById, constructionEstimate, efficiency, fullCost, hasOwnCash, kingdomGdp, logEvent, ownerBuildingOf, repay, sellThrough } from './economy';
import { techNameEn } from './i18n';
import { addToPool, kingdomById, kingdomOf } from './kingdoms';
import { payPops } from './pops';
import { round2 } from './rng';
import { emptyKingdomWeek } from './types';
import type { BudgetItem, Building, Company, GoodBag, GoodId, Kingdom, Pop, PopClass, Region, SalvageLot, TaxLaw, World } from './types';

// ---------------------------------------------------------------- 국채

/** 일 이자율 (연 약 9%) */
export const DAILY_INTEREST = 0.00025;

/** 국채 이자 (왕실만 빌린다). 이자는 사라지는 돈이다 */
export function chargeInterest(w: World) {
  for (const c of w.companies) {
    if (!c.state || c.debt <= 0) continue;
    const interest = c.debt * DAILY_INTEREST;
    const paid = Math.min(interest, Math.max(0, c.cash));
    c.cash -= paid;
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
const RESEARCHER_WEIGHT: Partial<Record<PopClass, number>> = { skilled: 0.3, expert: 1 };

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

/** 정책 단계(1~5)의 배율: 세금 수준 TUNE.taxLevels, 연구비 수준 TUNE.researchLevels */
export function budgetMult(k: Kingdom, item: BudgetItem): number {
  const table = item === 'tax' ? TUNE.taxLevels : TUNE.researchLevels;
  return table[k.budget[item] - 1];
}

/** 지금 세율 = 세법의 기본 세율(TUNE) × 세금 수준 배율. 토지 기반은 토지세만, 1인당은 인두세와 소득세만 걷는다 */
export function taxRates(k: Kingdom, law: TaxLaw = k.taxLaw): { land: number; poll: number; income: number } {
  const m = budgetMult(k, 'tax');
  return law === 'land' ? { land: TUNE.landTax * m, poll: 0, income: 0 } : { land: 0, poll: TUNE.pollTax * m, income: TUNE.incomeTax * m };
}

/**
 * 국정 예산 (매주): 금액을 편성하지 않는다. 왕실 정부 건물(행정청·건축사무소·학교)은 늘 다 가동하고 임금과 원료를 국고에서 낸다.
 * 여기서는 연구비(주간 경제 규모 × TUNE.researchShare × 연구비 수준 배율)를 내고, 지난주 국정 수지를 적는다.
 * 국고가 모자라면 정부 건물 임금·원료와 보조금은 국채로 낸다 (payWages, collectOrders, settleSubsidy). 연구비는 현금이 있는 만큼만 낸다
 */
export function spendBudget(w: World) {
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId);
    const week = dailyOutput(w, k.id) * TICKS_PER_WEEK;
    k.output = round2(k.output == null ? week : k.output * 0.75 + week * 0.25);
    const spent = k.spentWeek ?? emptyKingdomWeek();
    const revenue = k.revenueWeek;
    k.revenueWeek = 0;
    k.spentWeek = emptyKingdomWeek();
    if (!gov) continue;
    const research = fundResearch(w, gov, k.output * TUNE.researchShare * budgetMult(k, 'research'));
    gov.research.budget = round2(research / TICKS_PER_WEEK);
    const b = {
      revenue: round2(revenue), fees: round2(gov.ledger.buildFees), dividends: round2(spent.dividends),
      wages: round2(spent.wages), goods: round2(spent.goods), research: round2(research), interest: round2(gov.ledger.interest), subsidies: round2(spent.subsidies),
    };
    k.lastBudget = b;
    const net = b.wages + b.goods + b.research + b.interest + b.subsidies - b.fees;
    k.expenseEma = round2(k.expenseEma == null ? net : k.expenseEma * 0.75 + net * 0.25);
  }
}

// ---------------------------------------------------------------- 건물 현금·보조금

/** 그 지역 왕국의 국고 (왕실 회사) */
export function treasuryOf(w: World, regionId: number): Company | undefined {
  return companyById(w, kingdomById(w, kingdomOf(w, regionId)).governmentId);
}

/**
 * 건물 준비금: 만원 가동 주간 비용(임금 + 원료)의 이 주 수. 조정값이 아니다: 2·4·8주를 20년 × 시드 1~8로 비교해
 * 인구·소작농 비율·건물 레벨·노동자 생활수준 어느 것도 뚜렷이 달라지지 않았다
 */
export const RESERVE_WEEKS = 4;

/** 건물 준비금 상한: 만원 가동 주간 비용(임금 + 원료) × RESERVE_WEEKS. 이보다 많은 현금은 매주 주인에게 간다 */
export function reserveCap(w: World, b: Building): number {
  return fullCost(w, b) * TICKS_PER_WEEK * RESERVE_WEEKS;
}

/**
 * 보조금 정산 (빅토리아3 SUBSIDIES_MIN_GAIN = 0): 보조금 건물의 이번 주 수지(매출 − 임금 − 원료 − 곧 낼 돈 spend)가 마이너스인 만큼
 * 그 왕국 국고가 건물 현금에 넣는다. 같은 주에 흑자로 돌아서면 더 받은 몫은 국고로 돌려준다.
 * 그래서 한 주에 받은 보조금은 max(0, −수지)이고 보조 뒤 수지는 0이다. 국고가 모자라면 국채로 낸다
 */
export function settleSubsidy(w: World, b: Building, spend = 0) {
  if (!b.subsidized) return;
  const gov = treasuryOf(w, b.regionId);
  if (!gov) return;
  const bal = b.week.revenue - b.week.wages - b.week.inputs - spend;
  let d = round2(round2(Math.max(0, -bal)) - b.week.subsidy);
  if (d > 0) {
    if (gov.cash < d) borrow(w, gov, d - gov.cash);
    d = Math.min(d, Math.max(0, gov.cash));
  } else d = Math.max(d, -Math.max(0, b.cash));
  if (d === 0) return;
  gov.cash -= d;
  b.cash += d;
  b.week.subsidy += d;
  (kingdomById(w, gov.kingdomId).spentWeek ??= emptyKingdomWeek()).subsidies += d;
  gov.weekProfit -= d;
  const owner = companyById(w, b.companyId);
  if (owner) { owner.ledger.subsidies += d; owner.weekProfit += d; }
}

/** 건물 현금을 소수 2자리로 맞춘다. 반올림 차이는 주인 없는 돈(fund)으로 간다 (화폐 보존) */
export function roundCash(w: World, b: Building) {
  const r = round2(b.cash);
  if (r === b.cash) return;
  w.fund += b.cash - r;
  b.cash = r;
}

/**
 * 건물 배당 (매주, 빅토리아3 방식): 자기 현금이 있는 건물마다 준비금 상한(reserveCap)을 넘는 현금을 주인에게 보낸다.
 * 민간 건물은 지역 소유 건물(농지·산림·광산은 저택, 공장 부지는 금융가)로 가고, 거기 앉은 귀족·자본가의 소득이 된다 (일부는 투자 풀로).
 * 왕실 생산 건물은 국고로 가고, 민간 지분(privateShare) 몫만 소유 건물로 간다. 소유 건물에 아무도 없으면 그 몫은 투자 풀로 간다.
 * 건물마다 자기 돈만 나누므로 건물 순서와 무관하다
 */
export function payBuildings(w: World) {
  const toOwner = new Map<Building, number>();
  const give = (b: Building, o: Building | undefined, amt: number) => {
    if (amt <= 0) return;
    if (o) toOwner.set(o, (toOwner.get(o) ?? 0) + amt);
    else addToPool(w, kingdomOf(w, b.regionId), b.regionId, amt);
  };
  for (const b of w.buildings) {
    if (!hasOwnCash(b) || b.cash <= 0) continue;
    const pay = round2(b.cash - reserveCap(w, b));
    if (pay <= 0) continue;
    const c = companyById(w, b.companyId);
    b.cash -= pay;
    if (c) c.ledger.dividends += pay;
    if (!b.stateOwned) { give(b, ownerBuildingOf(w, b), pay); continue; }
    const share = round2(pay * (b.privateShare ?? 0));
    give(b, ownerBuildingOf(w, b, true), share);
    const gov = treasuryOf(w, b.regionId);
    if (gov) { gov.cash += pay - share; (kingdomById(w, gov.kingdomId).spentWeek ??= emptyKingdomWeek()).dividends += pay - share; }
    else w.fund += pay - share;
  }
  for (const [o, amt] of toOwner) {
    o.last.revenue += amt;
    payOwners(w, kingdomOf(w, o.regionId), o.regionId, w.pops.filter((p) => p.work === o.id), amt);
  }
}

// ---------------------------------------------------------------- 국고

/** 왕국 행정청이 세금을 걷을 수 있는 인구 (징세 한도) */
export function taxCapacity(w: World, kingdomId: number): number {
  let cap = 0;
  for (const b of w.buildings) {
    if (!b.active || kingdomOf(w, b.regionId) !== kingdomId) continue;
    const m = getMethod(b.typeId, b.methodId);
    if (m.taxCapacity) cap += m.taxCapacity * TUNE.adminScale * b.level * b.utilization * (b.crew ?? b.last.staffing) * efficiency(b);
  }
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
 * 그 세법으로 지금 하루에 걷힐 세금 (징수율 전). 토지 기반 = 소작지 수확 × 토지세율의 판매 대금 (landTaxValue),
 * 1인당 = pop 마다 min(저축, 낼 세금)
 */
export function lawRevenue(w: World, k: Kingdom, law: TaxLaw): number {
  if (law === 'land') {
    let v = 0;
    for (const b of w.buildings) {
      if (b.typeId !== 'subsistence' || kingdomOf(w, b.regionId) !== k.id) continue;
      v += landTaxValue(regionById(w, b.regionId), b.last.output, taxRates(k, 'land').land);
    }
    return v;
  }
  let v = 0;
  for (const p of w.pops) if (kingdomOf(w, p.regionId) === k.id) v += Math.min(p.savings, taxDue(w, p, 'capita'));
  return v;
}

export function collectIncomeTax(w: World) {
  const people = new Map<number, number>(), owed = new Map<number, number>();
  const taxOf = (p: Pop) => Math.min(p.savings, taxDue(w, p));
  for (const p of w.pops) {
    const kid = kingdomOf(w, p.regionId);
    people.set(kid, (people.get(kid) ?? 0) + p.size);
    owed.set(kid, (owed.get(kid) ?? 0) + taxOf(p));
  }
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
  const got = new Map<number, number>();
  for (const k of w.kingdoms) {
    got.set(k.id, k.landGot ?? 0); k.landGot = 0; k.landOwed = 0;
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
  // 걷힌 세금은 행정청이 한도에 기여한 비율만큼 그 행정청의 매출로 잡는다 (돈은 이미 국고에 있다).
  // 손익과 장부는 같은 날 produce 에서 다른 매출과 함께 한 번만 적는다
  for (const b of w.buildings) {
    const m = getMethod(b.typeId, b.methodId);
    const k = w.kingdoms.find((x) => x.id === kingdomOf(w, b.regionId));
    if (!m.taxCapacity || !b.active || !k || !(k.taxCapacity ?? 0)) continue;
    const share = (m.taxCapacity * TUNE.adminScale * b.level * b.utilization * (b.crew ?? b.last.staffing) * efficiency(b)) / k.taxCapacity!;
    const amt = (got.get(k.id) ?? 0) * share;
    b.last.revenue += amt;
    b.last.tax = (b.last.tax ?? 0) + amt;
  }
}

// ---------------------------------------------------------------- 주간: 세금, 배당, 투자 풀

/** 소유 직종이 배당에서 투자 풀로 넣는 비율 (빅토리아3 기본률) */
const INVEST_SHARE: Record<'capitalist' | 'aristocrat', number> = { capitalist: 0.3, aristocrat: 0.2 };

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

/** 소유 직종에게 배당을 준다: 받은 몫의 일부는 그 왕국 투자 풀로 */
function payOwners(w: World, kingdomId: number, regionId: number, pops: Pop[], amount: number) {
  let total = 0;
  for (const p of pops) total += p.size;
  if (total <= 0) { addToPool(w, kingdomId, regionId, amount); return; }
  for (const p of pops) {
    const amt = (amount * p.size) / total;
    const invest = amt * INVEST_SHARE[p.prof as 'capitalist' | 'aristocrat'];
    addToPool(w, kingdomId, p.regionId, invest);
    payPops(w, [p], amt - invest);
  }
}

/** 철거 자재 판매 대금: 소유 건물(저택·금융가) 몫은 그 귀족·자본가에게 (배당과 같은 길), 나머지는 건물 주인 회사에 */
export function paySalvage(w: World, lot: SalvageLot, amt: number) {
  const toOwner = amt * lot.ownerShare;
  const o = lot.ownerId != null ? w.buildings.find((x) => x.id === lot.ownerId) : undefined;
  const kid = kingdomOf(w, lot.regionId);
  if (toOwner > 0) {
    if (o) { o.last.revenue += toOwner; payOwners(w, kid, o.regionId, w.pops.filter((p) => p.work === o.id), toOwner); }
    else addToPool(w, kid, lot.regionId, toOwner);
  }
  const rest = amt - toOwner;
  if (rest <= 0) return;
  const c = companyById(w, lot.companyId);
  if (c) { c.cash += rest; c.weekProfit += rest; c.ledger.sales += rest; } else w.fund += rest;
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

/** 소작지 현금 지대: 그 지역 저택에 앉은 귀족에게 준다 (배당처럼 일부는 투자 풀로). 받을 사람이 없으면 false */
export function payRent(w: World, regionId: number, amount: number): boolean {
  const manor = w.buildings.find((x) => x.regionId === regionId && x.typeId === 'manor');
  if (!manor) return false;
  const seated = w.pops.filter((p) => p.work === manor.id && p.size > 0);
  if (seated.length === 0) return false;
  manor.last.revenue += amount;
  payOwners(w, kingdomOf(w, regionId), regionId, seated, amount);
  return true;
}

/** 투자 풀은 매주 그 왕국 민간 투자 자금(민간 상회 현금)이 된다. 민간 공사비와 새 민간 건물의 시작 현금이 여기서 나간다 */
export function distributeInvestment(w: World) {
  for (const k of w.kingdoms) {
    const firms = k.privateIds.map((id) => companyById(w, id)).filter((c): c is Company => !!c);
    if (firms.length === 0 || k.investmentPool <= 0) continue;
    const each = k.investmentPool / firms.length;
    for (const c of firms) {
      c.cash += each; c.ledger.investment += each;
      for (const [rid, v] of Object.entries(k.poolByRegion ?? {})) (c.regionFunds ??= {})[Number(rid)] = (c.regionFunds[Number(rid)] ?? 0) + v / firms.length;
    }
    k.investmentPool = 0;
    k.poolByRegion = {};
    // 지역 표시가 붙은 돈은 회사 현금보다 클 수 없다 (다른 데 쓴 만큼 비례로 줄인다)
    for (const c of firms) {
      const tagged = Object.values(c.regionFunds ?? {}).reduce((a, v) => a + v, 0);
      if (tagged > Math.max(0, c.cash) && tagged > 0) for (const rid of Object.keys(c.regionFunds!)) c.regionFunds![Number(rid)] *= Math.max(0, c.cash) / tagged;
    }
  }
}

/**
 * 은행·상인 조합이 자본보다 크게 쌓은 돈과 주인 없는 돈은 은행 자본을 먼저 채우고, 남으면 왕국 투자 풀로 간다 (인구 비례).
 * 돈이 어디에도 고이지 않게 하는 일반 규칙.
 */
export function weeklyBanking(w: World) {
  // 국채 상환: 국고 중 국정 지출 2주치를 넘는 몫의 20%
  for (const c of w.companies) {
    if (!c.state || c.debt <= 0) continue;
    const spare = c.cash - Math.max(0, kingdomById(w, c.kingdomId).expenseEma ?? 0) * 2;
    if (spare > 0) repay(w, c, spare * 0.2);
  }
  let pool = Math.max(0, w.fund);
  w.fund -= pool;
  const bankExcess = w.bank.cash - w.bank.capital * 2;
  if (bankExcess > 0) { w.bank.cash -= bankExcess; pool += bankExcess; }
  const traderExcess = w.traders.cash - w.traders.capital * 1.2;
  if (traderExcess > 0) { w.traders.cash -= traderExcess; pool += traderExcess; }
  // 파산으로 떼인 돈 때문에 은행 자본이 줄었으면 먼저 채운다
  const refill = Math.min(pool, Math.max(0, w.bank.capital - w.bank.cash));
  w.bank.cash += refill;
  pool -= refill;
  if (pool <= 0) return;
  const popOf = new Map<number, number>();
  for (const p of w.pops) { const k = kingdomOf(w, p.regionId); popOf.set(k, (popOf.get(k) ?? 0) + p.size); }
  const total = [...popOf.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) { w.fund += pool; return; }
  for (const k of w.kingdoms) addToPool(w, k.id, null, (pool * (popOf.get(k.id) ?? 0)) / total);
}

// ---------------------------------------------------------------- 주조와 보유고 (빅토리아3 방식)

/** 주조: 왕국마다 매주 기본액 + 주간 총생산 × 비율만큼 국고에 새 돈이 생긴다 */
export const MINT_BASE = 1_000;
export const MINT_RATE = 0.03;

export function mintMoney(w: World) {
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId);
    if (!gov) continue;
    const amt = MINT_BASE + (kingdomGdp(w, k.id) * TICKS_PER_WEEK / 360) * MINT_RATE;
    gov.cash += amt;
    gov.weekProfit += amt;
    gov.ledger.mint += amt;
    k.revenueWeek += amt;
    w.mint.minted += amt;
  }
}
