import { BUILDING_BY_ID, GOOD_IDS, GOODS, NEEDS, SCHOOL_CAPACITY, SKILL_DEFS, SUBSISTENCE, TECH_BY_ID, TICKS_PER_WEEK, getMethod, needsAt, POP_SCALE } from './data';
import {
  bookValue, borrow, colonyPopulation, colonySol, companyById, creditLimit, efficiency, ownerFillNow, emptyStats, employedIn, landFree, logEvent, newBuilding,
  marketWage, payClassIn, payHouseholds, regionById, regionPopulation, regionUnemployment, repay, slots, staffing, totalMoney, unemploymentRate, ownerJobs, regionOwnerJobs, shippingRate, RAIL_RATE, CARTAGE_RATE, EXPORT_START, EXPORT_FULL, exportNetback,
} from './economy';
import { runAi } from './ai';
import { weeklyAlerts } from './alerts';
import { applyCommand } from './commands';
import { buildingNameEn, companyNameEn, regionNameEn, techNameEn } from './i18n';
import { clamp } from './rng';
import { POP_CLASSES, SKILLS, WEALTH_MAX, WEALTH_MIN } from './types';
import type {
  Building, Company, GoodBag, GoodId, HistoryPoint, Household, MarketGood, NeedId, PopClass, QueuedCommand, Region, Skill, World,
} from './types';

const HISTORY_CAP = 1500;

/** 한 틱(하루)을 진행한다. 명령은 틱 시작 시점에 적용된다 */
export function step(w: World, commands: QueuedCommand[] = []): string[] {
  const errors: string[] = [];
  for (const q of commands) {
    const err = applyCommand(w, q.actor, q.cmd);
    if (err) errors.push(err);
  }

  for (const c of w.companies) c.revenueEma *= 0.98;
  for (const r of w.regions) {
    for (const s of POP_CLASSES) r.households[s].lastIncome = 0;
    for (const g of GOOD_IDS) {
      const mg = r.market[g];
      mg.demand = 0; mg.sold = 0; mg.shippedIn = 0; mg.shippedOut = 0;
      // 공급은 그날 새로 나온 물량만 센다 (생산·소작 판매·수입·도착 화물). 어제 생산분이나 안 팔려 다시 내놓은
      // 위탁분을 또 세면 공급이 두 번 잡혀 가격 신호가 틀어진다
      mg.supply = 0;
      mg.demandBy = {};
      mg.supplyBy = {};
    }
  }
  deliverInbound(w);
  // 공사가 없는 건축사무소는 인부를 해산한다 (대기 비용이 회사를 말려 죽이지 않게)
  for (const b of w.buildings) {
    if (!getMethod(b.typeId, b.methodId).construction) continue;
    b.idle = !w.constructions.some((k) => k.companyId === b.companyId);
  }
  applyWagePolicy(w);
  chargeInterest(w);
  doResearch(w);
  for (const r of w.regions) laborMarket(w, r);
  payWages(w);
  payGrantsAndFund(w);
  subsistence(w);
  const orders = collectOrders(w);
  clearMarkets(w, orders);
  produce(w);
  advanceConstruction(w);
  updatePrices(w);
  updatePopulation(w);

  w.tick += 1;
  if (w.tick % TICKS_PER_WEEK === 0) weekly(w);
  return errors;
}

// ---------------------------------------------------------------- 수요·공급 출처

function addBy(by: Record<string, number> | undefined, key: string, q: number) {
  if (!by || !(q > 0)) return;
  by[key] = (by[key] ?? 0) + q;
}

/** 출처별 내역의 이동평균. 거의 사라진 출처는 지운다 */
const BY_EMA = 0.1;
function emaBy(prev: Record<string, number> | undefined, cur: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  const c = cur ?? {};
  if (prev) for (const k in prev) {
    const v = prev[k] * (1 - BY_EMA) + (c[k] ?? 0) * BY_EMA;
    if (v > 1e-4) out[k] = v;
  }
  for (const k in c) if (!(k in out) && !(prev && k in prev)) out[k] = c[k] * BY_EMA;
  return out;
}

// ---------------------------------------------------------------- 운송 도착

/** 전날 이웃 지역에서 사 온 투입재를 건물 창고에 넣는다. 건물이 사라졌으면 지역 창고로 간다 */
function deliverInbound(w: World) {
  for (const it of w.traders.inbound) {
    const b = w.buildings.find((x) => x.id === it.buildingId);
    if (b) b.stock[it.good] = (b.stock[it.good] ?? 0) + it.q;
    else w.regions[0].market[it.good].inventory += it.q;
  }
  w.traders.inbound = [];
}

// ---------------------------------------------------------------- 임금 정책

/** 시장임금 정책을 쓰는 회사의 임금을 매일 시장에 맞춘다 */
function applyWagePolicy(w: World) {
  for (const c of w.companies) {
    if (!c.wageOffset) continue;
    for (const s of SKILLS) {
      const base = SKILL_DEFS[s].baseWage;
      c.wages[s] = Math.min(base * 10, Math.max(base * 0.1, marketWage(w, s, c.id) * (1 + c.wageOffset[s])));
    }
  }
}

// ---------------------------------------------------------------- 은행

/** 일 이자율 (연 약 9%) */
export const DAILY_INTEREST = 0.00025;

function chargeInterest(w: World) {
  for (const c of w.companies) {
    if (c.debt <= 0) continue;
    const interest = c.debt * DAILY_INTEREST;
    const paid = Math.min(interest, Math.max(0, c.cash));
    c.cash -= paid;
    w.bank.cash += paid;
    c.debt += interest - paid; // 못 낸 이자는 원금에 붙는다
    c.weekProfit -= interest;
  }
}

/** 이 주 수만큼 연속 부실이면 AI 회사는 파산한다 */
const BANKRUPTCY_WEEKS = 12;
/** 개척 첫해에는 파산시키지 않는다 */
const BANKRUPTCY_GRACE_TICKS = 360;
/** 파산 경매 가격: 장부가 대비 */
const AUCTION_RATE = 0.3;

/** 부실이 이 주 수 이어지면 플레이어 건물이 하나씩 압류된다 (이후 같은 간격으로 반복) */
export const SEIZURE_WEEKS = 4;
/** 부실 판정: 대출이 한도의 이 비율을 넘고 현금이 하루 임금에 못 미칠 때 */
export const DISTRESS_DEBT_RATIO = 0.9;

/** 회사가 지금 부실 상태인가 (UI 경고용으로도 쓴다) */
export function isDistressed(w: World, c: Company): boolean {
  let daily = 0;
  for (const b of w.buildings) if (b.companyId === c.id) for (const s of SKILLS) daily += b.employed[s] * c.wages[s];
  return c.debt > creditLimit(w, c) * DISTRESS_DEBT_RATIO && c.cash < daily;
}

/**
 * 은행 관리: 신용 한도 근처에서 현금이 바닥난 회사는 매주 부실로 센다.
 *  - 플레이어: 1주째 경고, 2주째 재경고, 4주째부터 4주마다 건물 한 곳을 경매로 넘겨 빚을 갚는다 (단계적 압류).
 *  - AI: 가장 큰 적자 건물을 멈추고, 12주 연속이면 파산한다.
 */
function restructure(w: World) {
  for (const c of w.companies) {
    const distressed = isDistressed(w, c);
    const was = c.distressWeeks;
    c.distressWeeks = distressed ? c.distressWeeks + 1 : 0;
    if (c.isPlayer && !distressed && was > 0) {
      logEvent(w, c.id, '은행 관리가 풀렸습니다. 현금과 대출이 안전선 안으로 돌아왔습니다.',
        { kind: 'info', en: 'Bank supervision has ended. Cash and debt are back within the safe line.' });
    }
    if (!distressed) continue;
    if (c.isPlayer) {
      const left = SEIZURE_WEEKS - c.distressWeeks;
      if (c.distressWeeks === 1) {
        logEvent(w, c.id, `은행 경고: 대출이 한도의 90%를 넘었고 현금이 하루 임금에 못 미칩니다. ${left}주 안에 회복하지 못하면 건물 한 곳이 압류됩니다. 적자 건물을 멈추거나 임금을 낮춰 현금을 확보하세요.`,
          { kind: 'danger', en: `Bank warning: debt is over 90% of your limit and cash is below a day of wages. If you do not recover within ${left} week${left === 1 ? '' : 's'}, one building will be seized. Stop loss-making buildings or lower wages to raise cash.` });
      } else if (c.distressWeeks < SEIZURE_WEEKS) {
        logEvent(w, c.id, `은행 경고: 부실 ${c.distressWeeks}주째. ${left}주 뒤 건물 한 곳이 압류됩니다.`,
          { kind: 'danger', en: `Bank warning: week ${c.distressWeeks} of distress. One building will be seized in ${left} week${left === 1 ? '' : 's'}.` });
      }
      if (c.distressWeeks >= SEIZURE_WEEKS && (c.distressWeeks - SEIZURE_WEEKS) % SEIZURE_WEEKS === 0) seizeOne(w, c);
      continue;
    }
    if (c.distressWeeks >= BANKRUPTCY_WEEKS && w.tick >= BANKRUPTCY_GRACE_TICKS) { bankrupt(w, c); continue; }
    if (w.tick - c.lastRestructureTick < TICKS_PER_WEEK * 4) continue;
    const worst = w.buildings
      .filter((b) => b.companyId === c.id && b.active && b.profitEma < 0)
      .sort((a, b) => a.profitEma - b.profitEma)[0];
    if (!worst) continue;
    c.lastRestructureTick = w.tick;
    worst.active = false;
    worst.employed = { unskilled: 0, skilled: 0, expert: 0 };
    logEvent(w, c.id, `은행 관리: ${BUILDING_BY_ID[worst.typeId].name}(#${worst.id}) 가동 중단`,
      { kind: 'warn', regionId: worst.regionId, buildingId: worst.id, en: `Bank supervision: ${buildingNameEn(worst.typeId)} (#${worst.id}) shut down` });
  }
}

/** 건물 하나를 장부가 30%에 살 수 있는 AI 회사 (현금 많은 순). 없으면 undefined */
function findBuyer(w: World, seller: Company, b: Building, price: number): Company | undefined {
  const tech = getMethod(b.typeId, b.methodId).tech;
  return w.companies
    .filter((x) => !x.isPlayer && x.id !== seller.id && x.distressWeeks === 0 && x.cash > price * 2
      && (!tech || x.research.known.includes(tech)))
    .sort((a, b2) => b2.cash - a.cash)[0];
}

/** 건물을 다른 회사로 넘긴다. 대금은 판 회사 현금으로 들어간다 */
function transferBuilding(w: World, from: Company, to: Company, b: Building, price: number) {
  to.cash -= price;
  from.cash += price;
  // 판 회사가 이 건물에 걸어 둔 증설 공사는 새 건물 공사로 바꾼다
  for (const k of w.constructions) if (k.companyId === from.id && k.targetBuildingId === b.id) k.targetBuildingId = null;
  // 산 회사가 같은 지역에 같은 건물을 이미 갖고 있으면 하나로 합친다 (생산 방식은 기존 건물 것으로 통일)
  const same = w.buildings.find((x) => x !== b && x.companyId === to.id && x.regionId === b.regionId && x.typeId === b.typeId);
  if (same) {
    const total = same.level + b.level;
    same.exp = (same.exp * same.level + b.exp * b.level * (b.methodId === same.methodId ? 1 : 0.5)) / total;
    same.level = total;
    for (const s of SKILLS) same.employed[s] += b.employed[s];
    for (const g of Object.keys(b.stock) as GoodId[]) same.stock[g] = (same.stock[g] ?? 0) + (b.stock[g] ?? 0);
    if (!same.active) { same.active = true; same.utilization = 0.5; }
    w.buildings.splice(w.buildings.indexOf(b), 1);
    return;
  }
  b.companyId = to.id;
  b.lossWeeks = 0;
  b.pausedWeeks = 0;
  if (!b.active) { b.active = true; b.utilization = 0.5; }
}

/**
 * 단계적 압류 (플레이어): 장부가가 가장 낮은 건물 한 곳을 경매로 넘기고, 대금 전액으로 빚을 갚는다.
 * 살 회사가 없으면 가장 큰 적자 건물을 멈춘다.
 */
function seizeOne(w: World, c: Company) {
  const assets = w.buildings.filter((b) => b.companyId === c.id).sort((a, b) => bookValue(a) - bookValue(b));
  for (const b of assets) {
    const price = bookValue(b) * AUCTION_RATE;
    const buyer = findBuyer(w, c, b, price);
    if (!buyer) continue;
    const name = `${regionById(w, b.regionId).name} ${BUILDING_BY_ID[b.typeId].name}(#${b.id})`;
    const nameEn = `${regionNameEn(b.regionId)} ${buildingNameEn(b.typeId)} (#${b.id})`;
    transferBuilding(w, c, buyer, b, price);
    const paid = repay(w, c, price);
    logEvent(w, c.id, `은행 압류: ${name}이(가) ${buyer.name}에 ƒ${Math.round(price)}에 넘어갔습니다. 빚 ƒ${Math.round(paid)} 상환, 남은 빚 ƒ${Math.round(c.debt)}.`,
      { kind: 'danger', regionId: b.regionId, en: `Bank seizure: ${nameEn} went to ${companyNameEn(buyer)} for ƒ${Math.round(price)}. ƒ${Math.round(paid)} of debt repaid, ƒ${Math.round(c.debt)} still owed.` });
    return;
  }
  const worst = assets.filter((b) => b.active && b.profitEma < 0).sort((a, b) => a.profitEma - b.profitEma)[0];
  if (!worst) { logEvent(w, c.id, '은행 경고: 압류할 건물을 사겠다는 회사가 없어 이번 주는 넘어갑니다.', { kind: 'warn', en: 'Bank warning: no house is willing to buy a seized building, so nothing is taken this week.' }); return; }
  worst.active = false;
  worst.employed = { unskilled: 0, skilled: 0, expert: 0 };
  logEvent(w, c.id, `은행 관리: 살 회사가 없어 ${BUILDING_BY_ID[worst.typeId].name}(#${worst.id}) 가동을 중단시켰습니다.`,
    { kind: 'danger', regionId: worst.regionId, buildingId: worst.id, en: `Bank supervision: no buyer was found, so ${buildingNameEn(worst.typeId)} (#${worst.id}) has been shut down.` });
}

/**
 * 파산 (AI): 건물을 현금이 가장 많은 다른 AI 회사에 장부가 30%로 넘기고, 대금은 은행 빚을 갚는 데 쓴다.
 * 남은 빚은 탕감된다. 회사는 빈손으로 다시 시작한다(기술은 유지).
 */
function bankrupt(w: World, c: Company) {
  const assets = w.buildings.filter((b) => b.companyId === c.id).sort((a, b) => b.profitEma - a.profitEma);
  let sold = 0;
  for (const b of assets) {
    const price = bookValue(b) * AUCTION_RATE;
    const buyer = findBuyer(w, c, b, price);
    if (!buyer) continue;
    transferBuilding(w, c, buyer, b, price);
    sold += 1;
    logEvent(w, buyer.id, `${c.name}의 ${BUILDING_BY_ID[b.typeId].name}(#${b.id}) 인수 (ƒ${Math.round(price)})`,
      { regionId: b.regionId, buildingId: b.id, en: `Acquired ${companyNameEn(c)}'s ${buildingNameEn(b.typeId)} (#${b.id}) for ƒ${Math.round(price)}` });
  }
  repay(w, c, c.cash);
  const forgiven = c.debt;
  c.debt = 0;
  c.distressWeeks = 0;
  for (const s of SKILLS) c.wages[s] = SKILL_DEFS[s].baseWage;
  logEvent(w, c.id, `파산 처리: 건물 ${sold}곳 매각, 남은 빚 ƒ${Math.round(forgiven)} 탕감`,
    { kind: 'warn', en: `Bankruptcy: ${sold} building${sold === 1 ? '' : 's'} sold, remaining debt of ƒ${Math.round(forgiven)} written off` });
}

function weeklyBanking(w: World) {
  // 여유 현금이 있으면 대출 일부 상환 (주간 임금의 2배를 넘는 현금의 20%)
  for (const c of w.companies) {
    if (c.debt <= 0) continue;
    let bill = 0;
    for (const b of w.buildings) if (b.companyId === c.id) for (const s of SKILLS) bill += b.employed[s] * c.wages[s];
    const spare = c.cash - bill * TICKS_PER_WEEK * 2;
    if (spare > 0) repay(w, c, spare * 0.2);
  }
  // 은행은 자본의 2배, 상인 조합은 1.2배를 넘게 쌓은 돈을 기금으로 넘긴다
  const bankExcess = w.bank.cash - w.bank.capital * 2;
  if (bankExcess > 0) { w.bank.cash -= bankExcess; w.fund += bankExcess; }
  const traderExcess = w.traders.cash - w.traders.capital * 1.2;
  if (traderExcess > 0) { w.traders.cash -= traderExcess; w.fund += traderExcess; }
}

// ---------------------------------------------------------------- 연구

/** 연구비는 연구원(전문가·기술자) 가계의 소득이 된다 */
const RESEARCHER_WEIGHT: Partial<Record<PopClass, number>> = { skilled: 0.3, expert: 1 };

function doResearch(w: World) {
  for (const c of w.companies) {
    const r = c.research;
    if (!r.current || r.budget <= 0) continue;
    const tech = TECH_BY_ID[r.current];
    if (!tech || r.known.includes(tech.id)) { r.current = null; continue; }
    const spend = Math.min(r.budget, Math.max(0, c.cash), tech.cost - (r.progress[tech.id] ?? 0));
    if (spend <= 0) continue;
    c.cash -= spend;
    c.weekProfit -= spend;
    payHouseholds(w, spend, RESEARCHER_WEIGHT);
    r.progress[tech.id] = (r.progress[tech.id] ?? 0) + spend;
    if (r.progress[tech.id] >= tech.cost - 1e-6) {
      r.known.push(tech.id);
      r.current = null;
      logEvent(w, c.id, `기술 연구 완료: ${tech.name}. 보유 건물의 생산 방식에서 새 방식을 고를 수 있습니다.`,
        { kind: 'info', en: `Research complete: ${techNameEn(tech.id)}. New production methods can now be chosen for your buildings.` });
    }
  }
}

// ---------------------------------------------------------------- 노동시장 (지역 단위)

const RESERVATION = 0.3; // 기본 임금의 30% 미만이면 일하지 않음
const HIRE_RATE = 0.02; // 틱당 최대 충원 비율
const SWITCH_RATE = 0.01; // 틱당 최대 이직 비율
const SWITCH_PREMIUM = 1.15; // 이 배율 이상 임금 차이가 나야 이직

function laborMarket(w: World, r: Region) {
  const wageOf = (b: Building, s: Skill) => companyById(w, b.companyId)!.wages[s];
  const local = w.buildings.filter((b) => b.regionId === r.id);

  for (const s of SKILLS) {
    // 1) 일자리 축소·체불에 따른 이탈
    let unemployed = r.households[s].population;
    for (const b of local) {
      const cap = slots(b, s);
      if (b.employed[s] > cap) b.employed[s] = cap;
      if (b.unpaid) b.employed[s] *= 0.97;
      unemployed -= b.employed[s];
    }
    // 인구가 줄어 고용자가 인구를 넘으면 비례 감원
    if (unemployed < 0) {
      const emp = local.reduce((a, b) => a + b.employed[s], 0);
      const keep = r.households[s].population / emp;
      for (const b of local) b.employed[s] *= keep;
      unemployed = 0;
    }

    // 노동자는 농민으로 돌아가 현물로 버는 것보다 조금이라도 더 줘야 공장에 남는다
    const minWage = s === 'unskilled'
      ? Math.max(SKILL_DEFS[s].baseWage * RESERVATION, r.subsistenceIncome * 1.05)
      : SKILL_DEFS[s].baseWage * RESERVATION;
    const vacancies = local
      .filter((b) => slots(b, s) - b.employed[s] > 0.01 && wageOf(b, s) >= minWage)
      .sort((a, b) => wageOf(b, s) - wageOf(a, s) || a.id - b.id);

    // 2) 실업자 채용 (임금 높은 곳부터)
    const hireLeft = new Map<number, number>();
    for (const b of vacancies) {
      const cap = slots(b, s);
      const room = Math.min(cap - b.employed[s], Math.max(3, cap * HIRE_RATE));
      const h = Math.min(room, unemployed);
      b.employed[s] += h;
      unemployed -= h;
      hireLeft.set(b.id, room - h);
    }

    // 3) 더 좋은 임금으로 이직
    for (const b of vacancies) {
      let room = Math.min(hireLeft.get(b.id) ?? 0, slots(b, s) - b.employed[s]);
      if (room <= 0.01) continue;
      const w0 = wageOf(b, s);
      const sources = local
        .filter((x) => x.id !== b.id && x.employed[s] > 0.5 && wageOf(x, s) * SWITCH_PREMIUM < w0)
        .sort((a, c) => wageOf(a, s) - wageOf(c, s) || a.id - c.id);
      for (const src of sources) {
        if (room <= 0.01) break;
        const mv = Math.min(room, src.employed[s] * SWITCH_RATE);
        src.employed[s] -= mv;
        b.employed[s] += mv;
        room -= mv;
      }
    }
  }
}

function payWages(w: World) {
  for (const c of w.companies) {
    const list = w.buildings.filter((b) => b.companyId === c.id);
    let bill = 0;
    for (const b of list) for (const s of SKILLS) bill += b.employed[s] * c.wages[s];
    if (c.cash < bill) borrow(w, c, bill - c.cash);
    const ratio = bill > 0 ? Math.min(1, c.cash / bill) : 1;
    for (const b of list) {
      const hh = regionById(w, b.regionId).households;
      let paid = 0;
      for (const s of SKILLS) {
        const amt = b.employed[s] * c.wages[s] * ratio;
        hh[s].savings += amt;
        hh[s].lastIncome += amt;
        paid += amt;
      }
      c.cash -= paid;
      b.unpaid = ratio < 0.999;
      b.last = { ...emptyStats(), wageCost: paid, staffing: staffing(b) };
    }
  }
}

/**
 * 국고: 매 틱 잔액의 1/7을 쓴다. 학교 보조금(인건비 × 배율)을 먼저 주고, 남은 돈은 계층 가중치대로 나눈다.
 */
const FUND_WEIGHT: Record<PopClass, number> = { unskilled: 0.1, skilled: 0.5, expert: 1, peasant: 0.02, capitalist: 4, aristocrat: 4 };

function payGrantsAndFund(w: World) {
  const pool = Math.max(0, w.fund) / TICKS_PER_WEEK;
  let need = 0;
  const schools: Building[] = [];
  for (const b of w.buildings) {
    const grant = getMethod(b.typeId, b.methodId).grant;
    if (!grant || !b.active) continue;
    need += grant * b.last.wageCost;
    schools.push(b);
  }
  const ratio = need > 0 ? Math.min(1, pool / need) : 1;
  w.grantRatio = w.grantRatio * 0.9 + ratio * 0.1;
  let spent = 0;
  for (const b of schools) {
    const amt = getMethod(b.typeId, b.methodId).grant! * b.last.wageCost * ratio;
    const c = companyById(w, b.companyId);
    if (c) c.cash += amt;
    b.last.revenue += amt;
    spent += amt;
  }
  const rest = pool - spent;
  w.fund -= pool;
  // 식민지 행정: 남은 기금은 상층에 훨씬 많이 돌아간다 (1인당 가중치)
  payHouseholds(w, rest, FUND_WEIGHT);
}

// ---------------------------------------------------------------- 주문 수집

type Payer =
  | { kind: 'company'; c: Company }
  | { kind: 'household'; h: { savings: number; lastSpend: number } }
  | { kind: 'offworld' }
  | { kind: 'trader' };

interface Order {
  /** 수요 출처 키 (MarketGood.demandBy) */
  src: string;
  regionId: number;
  good: GoodId;
  qty: number;
  /** 체결 시 콜백 (받은 수량, 지불 금액) */
  fill: (qty: number, cost: number) => void;
  payer: Payer;
  /** 이웃 지역에서 사 오는 주문 (운송 주문이 따로 붙는다) */
  remote?: boolean;
  /** 체결 뒤 못 산 수량으로 호출된다 (운송: 모자란 만큼 짐꾼 운임을 낸다) */
  miss?: (qty: number) => void;
}

interface HouseholdPlan {
  regionId: number;
  skill: PopClass;
  /** 소비 묶음 전체 가치 (현물 포함) */
  basketCost: number;
  inKindValue: number;
  /** 예산으로 살 수 있었던 비율 */
  budgetFrac: number;
  /** 오늘 쓸 수 있는 돈 (소득 + 저축에서 헐어 쓰는 몫) */
  budget: number;
  /** 시장에서 사려던 양 (예산 축소 전) */
  goods: GoodBag;
  /** 식량 필요 단위, 현물로 채운 단위, 시장에서 사려던 식량 (품목, 수량, 1단위당 수량) */
  foodNeed: number;
  foodInKind: number;
  foodBuy: { good: GoodId; qty: number; units: number }[];
}

interface Orders {
  list: Order[];
  /** 가계의 단계별 구매 계획 (체결 후 만족도 계산용) */
  plans: HouseholdPlan[];
}

function collectOrders(w: World): Orders {
  const list: Order[] = [];

  // 기업: 생산 투입재 + 건설 자재. 운영 투입재는 부족하면 자동 대출, 건설 자재는 남은 현금으로만 산다
  for (const c of w.companies) {
    const operating: Order[] = [];
    for (const b of w.buildings) {
      if (b.companyId !== c.id || !b.active) continue;
      const method = getMethod(b.typeId, b.methodId);
      const st = b.last.staffing;
      for (const g of GOOD_IDS) {
        const per = method.inputs[g];
        if (!per) continue;
        const need = per * b.level * b.utilization * st;
        const want = Math.max(0, need * 2 - (b.stock[g] ?? 0)); // 2틱분 보유 목표
        if (want <= 0) continue;
        // 지역 시장에 있는 만큼은 현지에서, 모자라는 만큼은 가장 싼 이웃 지역에서 사 온다 (다음 날 도착, 운송비 10%)
        const local = regionById(w, b.regionId).market[g];
        const localAvail = Math.max(0, local.inventory + local.consigned.reduce((a, l) => a + l.q, 0));
        const here = Math.min(want, localAvail);
        if (here > 1e-9) {
          operating.push({
            src: `bld:${b.typeId}`, regionId: b.regionId, good: g, qty: here, payer: { kind: 'company', c },
            fill: (q, cost) => {
              b.stock[g] = (b.stock[g] ?? 0) + q;
              b.last.inputCost += cost;
            },
          });
        }
        const away = want - here;
        if (away > 1e-9) {
          let bestNb: number | null = null, bestPrice = Infinity;
          for (const nb of regionById(w, b.regionId).neighbors) {
            const m2 = regionById(w, nb).market[g];
            const avail = m2.inventory + m2.consigned.reduce((a, l) => a + l.q, 0);
            if (avail < away * 0.2) continue;
            if (m2.price < bestPrice) { bestPrice = m2.price; bestNb = nb; }
          }
          if (bestNb !== null) {
            const bid = b.id;
            operating.push({
              src: `bld:${b.typeId}`, regionId: bestNb, good: g, qty: away, payer: { kind: 'company', c }, remote: true,
              fill: (q, cost) => {
                w.traders.inbound.push({ buildingId: bid, good: g, q });
                b.last.inputCost += cost;
              },
            });
            operating.push(transportOrder(w, bestNb, away * bestPrice, { kind: 'company', c }, `bld:${b.typeId}`, (cost) => { b.last.inputCost += cost; }));
          }
        }
      }
    }
    const costOf = (o: Order) => o.qty * regionById(w, o.regionId).market[o.good].price;
    const opCost = operating.reduce((a, o) => a + costOf(o), 0);
    if (c.cash < opCost) borrow(w, c, opCost - c.cash);
    const opScale = opCost > 0 ? Math.min(1, Math.max(0, c.cash) / opCost) : 1;
    for (const o of operating) { o.qty *= opScale; if (o.qty > 1e-9) list.push(o); }
  }

  // 가계: 부 단계에 맞는 소비 묶음을 지역 시장에서 산다. 현물(농민)이 먼저 쓰이고, 예산이 모자라면 전체를 비례 축소
  const plans: HouseholdPlan[] = [];
  for (const r of w.regions) {
    for (const s of POP_CLASSES) {
      const h = r.households[s];
      for (const g of GOOD_IDS) h.consumed[g] = 0;
      if (h.population < 0.5) continue;
      const need = needsAt(h.wealth);
      const goods: GoodBag = {};
      let basketCost = 0;
      let inKindValue = 0;
      let foodNeed = 0, foodInKind = 0;
      const foodBuy: HouseholdPlan['foodBuy'] = [];
      const inKind: GoodBag = { ...h.inKind };
      for (const n of NEEDS) {
        const perCap = need[n.id];
        if (!perCap) continue;
        let units = perCap * h.population;
        const isFood = n.id === 'nourishment';
        if (isFood) foodNeed = units;
        // 현물로 채울 수 있는 만큼 먼저 채운다 (농민의 자기 생산물)
        for (const opt of n.options) {
          const avail = inKind[opt.good] ?? 0;
          if (avail <= 0 || units <= 0) continue;
          const use = Math.min(units, avail / opt.units);
          const qty = use * opt.units;
          inKind[opt.good] = avail - qty;
          units -= use;
          if (isFood) foodInKind += use;
          const value = qty * r.market[opt.good].price;
          inKindValue += value;
          basketCost += value;
          h.consumed[opt.good] = (h.consumed[opt.good] ?? 0) + qty;
        }
        // 나머지는 가격에 따라 선택지를 나눠 시장에서 산다
        for (const opt of needSplit(r, n.id)) {
          const qty = units * opt.units * opt.share;
          if (qty <= 0) continue;
          basketCost += qty * r.market[opt.good].price;
          if (isFood) foodBuy.push({ good: opt.good, qty, units: opt.units });
          goods[opt.good] = (goods[opt.good] ?? 0) + qty;
        }
      }
      const cashCost = basketCost - inKindValue;
      // 부 단계가 낮을수록 저축을 빨리 헐어 쓴다
      const drawRate = h.wealth < 5 ? 0.04 : 0.02;
      const budget = Math.max(0, Math.min(h.savings, h.incomeEma + h.savings * drawRate));
      const budgetFrac = cashCost > 0 ? Math.min(1, budget / cashCost) : 1;
      plans.push({ regionId: r.id, skill: s, basketCost, inKindValue, budgetFrac, budget, goods, foodNeed, foodInKind, foodBuy });
      for (const g of GOOD_IDS) {
        const q = (goods[g] ?? 0) * budgetFrac;
        if (q <= 1e-9) continue;
        list.push({
          src: `pop:${s}`, regionId: r.id, good: g, qty: q, payer: { kind: 'household', h },
          fill: (qq) => { h.consumed[g] = (h.consumed[g] ?? 0) + qq; },
        });
      }
    }
  }

  addTraderOrders(w, list);
  return { list, plans };
}

/** 대체재 선택 민감도. 값이 클수록 싼 쪽으로 쏠린다 */
const SUBSTITUTION_EXP = 10;

/** 수요 단위 비용^-k 에 비례해서 선택지별 비중을 나눈다 (한꺼번에 쏠리지 않게) */
export function needSplit(r: Region, needId: NeedId) {
  const need = NEEDS.find((n) => n.id === needId)!;
  const costs = need.options.map((o) => (o.units * r.market[o.good].price) / (o.appeal ?? 1));
  const min = Math.min(...costs);
  const weights = costs.map((c) => Math.pow(min / c, SUBSTITUTION_EXP));
  const sum = weights.reduce((a, b) => a + b, 0);
  return need.options.map((o, i) => ({ ...o, share: weights[i] / sum }));
}

// ---------------------------------------------------------------- 지역 간 운송

/** 운송 판매자 표시 */
const TRADER = -2;
/**
 * 화물을 지역 밖으로 옮기려면 출발 지역 시장에서 운송(철도가 만든다)을 사야 한다.
 * 화물 가치 ƒ1당 운송 RAIL_RATE/운송 기본가 단위가 필요하다 (기본가에서 화물가의 6%).
 * 운송을 다 못 사면 모자란 만큼 짐꾼·마차로 옮기는데 화물가의 30%가 들고, 그 돈은 그 지역 노동자 몫이 된다.
 */
function chargePayer(w: World, payer: Payer, amount: number) {
  switch (payer.kind) {
    case 'company': payer.c.cash -= amount; break;
    case 'offworld': w.offworld.balance -= amount; break;
    case 'trader': w.traders.cash -= amount; break;
    case 'household': payer.h.savings -= amount; payer.h.lastSpend += amount; break;
  }
}

/** 화물 가치 value 를 regionId 에서 내보내는 데 필요한 운송 주문. 못 산 만큼은 짐꾼 운임을 물린다 */
function transportOrder(w: World, regionId: number, value: number, payer: Payer, src: string, onCost?: (cost: number) => void): Order {
  const per = RAIL_RATE / GOODS.transport.basePrice;
  return {
    src,
    regionId, good: 'transport', qty: value * per, payer,
    fill: (_q, cost) => onCost?.(cost),
    miss: (q) => {
      const fee = (q / per) * CARTAGE_RATE;
      if (fee <= 1e-9) return;
      chargePayer(w, payer, fee);
      payClassIn(w, regionById(w, regionId), 'unskilled', fee);
      onCost?.(fee);
    },
  };
}
/** 운송비를 넘는 가격 차 1%당 평균 유통량의 몇 %를 옮기는가 */
const SHIP_RATE = 10;

/** 이웃 지역 가격이 운송비보다 더 비싸면 상인이 싼 쪽에서 사서 다음 날 비싼 쪽에 판다 */
function addTraderOrders(w: World, list: Order[]) {
  const pending: Order[] = [];
  for (const a of w.regions) {
    const rate = shippingRate(w, a.id);
    for (const nb of a.neighbors) {
      const b = regionById(w, nb);
      for (const g of GOOD_IDS) {
        if (GOODS[g].perishable) continue; // 운송 같은 서비스는 옮길 수 없다
        const ma = a.market[g], mb = b.market[g];
        const flow = Math.max(ma.supplyEma, mb.demandEma) + ma.inventory * 0.05;
        // 1) 국내 거래: 운송비를 빼고도 남는 가격 차만큼, 도착지에서 아직 못 채운 수요까지 (이미 가는 중인 화물은 뺀다)
        const gap = (mb.price * (1 - rate)) / ma.price - 1;
        const inTransit = w.traders.shipments.filter((s) => s.to === b.id && s.good === g).reduce((s, x) => s + x.q, 0);
        const unmet = Math.max(0, mb.demandEma - mb.supplyEma - inTransit);
        const qDomestic = gap > 0 ? Math.min(SHIP_RATE * gap * flow, unmet * 1.2) : 0;
        // 2) 수출길: 도착지에서 개항장까지 실어 가 수출하면 받을 값(헐값)이 여기 값보다 운송비 이상 비싸면 양 제한 없이 보낸다
        const exportGap = (GOODS[g].basePrice * exportNetback(w, b.id) * (1 - rate)) / ma.price - 1;
        const qExport = exportGap > 0 ? SHIP_RATE * exportGap * flow : 0;
        const q = Math.min(Math.max(qDomestic, qExport), ma.supplyEma * 0.9 + ma.inventory * 0.1);
        if (q <= 1e-4) continue;
        pending.push({
          src: 'trader', regionId: a.id, good: g, qty: q, payer: { kind: 'trader' },
          fill: (qq) => {
            w.traders.shipments.push({ to: b.id, good: g, q: qq });
            ma.shippedOut += qq;
          },
        });
      }
    }
  }
  const cost = pending.reduce((s, o) => s + o.qty * regionById(w, o.regionId).market[o.good].price * (1 + shippingRate(w, o.regionId)), 0);
  const scale = cost > 0 ? Math.min(1, w.traders.cash / cost) : 1;
  for (const o of pending) {
    o.qty *= scale;
    if (o.qty <= 1e-6) continue;
    list.push(o);
    list.push(transportOrder(w, o.regionId, o.qty * regionById(w, o.regionId).market[o.good].price, { kind: 'trader' }, 'trader'));
  }
}

// ---------------------------------------------------------------- 해외 무역 (개항장만)

/** 수입·수출 위탁분의 판매자 표시 */
const OFFWORLD = -1;
/** 기본가 대비 이 배율부터 수입이 들어오기 시작해 FULL에서 최대가 된다 */
const IMPORT_START = 1.3;
const IMPORT_FULL = 1.8;
/** 틱당 최대 교역량 = 수요(또는 공급)의 이 비율 */
const TRADE_CAP = 0.5;
/** 해외 계정이 쌓아둔 왕국 화폐 중 매 틱 왕국 상품 구매에 다시 쓰는 비율 */
const RECYCLE_RATE = 0.03;
/** 해외 계정 잔액이 이 값을 넘으면 수입이 줄어든다 (외화 부족) */
const IMPORT_CREDIT = 15000 * POP_SCALE;

const ramp = (x: number, from: number, to: number) => clamp((x - from) / (to - from), 0, 1);

/** 해외 시장이 하루에 사 가거나 팔 수 있는 상품별 상한 (왕국 기준 재고의 3%) */
export function foreignQuota(g: GoodId): number {
  return GOODS[g].minStock * 0.03;
}

function addExports(w: World, r: Region, list: Order[]) {
  const budget = Math.max(0, w.offworld.balance) * RECYCLE_RATE;
  const appetite = {} as Record<GoodId, number>;
  let sum = 0;
  for (const g of GOOD_IDS) {
    const mg = r.market[g];
    appetite[g] = (mg.supplyEma * mg.price) / Math.max(0.5, mg.price / GOODS[g].basePrice);
    sum += appetite[g];
  }
  for (const g of GOOD_IDS) {
    const mg = r.market[g];
    const rel = mg.price / GOODS[g].basePrice;
    const floorQ = (mg.supplyEma + mg.inventory * 0.05 + GOODS[g].minStock * 0.01) * ramp(rel, EXPORT_START, EXPORT_FULL);
    const recycleQ = sum > 0 ? Math.min((budget * appetite[g]) / sum / mg.price, mg.supplyEma * 0.3) : 0;
    // 해외 시장이 사 갈 수 있는 양에는 한도가 있다
    const q = Math.min(floorQ + recycleQ, foreignQuota(g));
    if (q <= 1e-6 || GOODS[g].perishable) continue;
    list.push({
      src: 'export', regionId: r.id, good: g, qty: q, payer: { kind: 'offworld' },
      fill: (qq) => { w.offworld.exports[g] = (w.offworld.exports[g] ?? 0) + qq; },
    });
    // 배에 싣는 운송은 해외 상인이 개항장에서 산다
    list.push(transportOrder(w, r.id, q * mg.price, { kind: 'offworld' }, 'export'));
  }
}

function addImports(w: World, r: Region, list: Order[]) {
  for (const g of GOOD_IDS) {
    const mg = r.market[g];
    if (GOODS[g].perishable) continue;
    const domestic = mg.consigned.reduce((a, l) => a + l.q, 0);
    // 개항장 자체 부족분 + 내륙의 못 채운 수요(상인이 실어 나른다). 가격 신호는 왕국에서 가장 비싼 지역 기준
    let inlandUnmet = 0, maxRel = mg.price / GOODS[g].basePrice;
    for (const x of w.regions) {
      if (x.id === r.id) continue;
      const m2 = x.market[g];
      inlandUnmet += Math.max(0, m2.demandEma - m2.supplyEma);
      maxRel = Math.max(maxRel, m2.price / GOODS[g].basePrice);
    }
    const inTransit = w.traders.shipments.filter((s) => s.good === g).reduce((s, x) => s + x.q, 0);
    const shortfall = Math.max(0, mg.demand - domestic - mg.inventory * 0.2) + Math.max(0, inlandUnmet - inTransit - mg.inventory * 0.2);
    const credit = clamp(1 - w.offworld.balance / IMPORT_CREDIT, 0, 1);
    const cap = ((mg.demandEma + inlandUnmet) * TRADE_CAP + GOODS[g].minStock * 0.01) * ramp(maxRel, IMPORT_START, IMPORT_FULL) * credit;
    // 해외 시장도 무한하지 않다: 상품별 하루 수입 상한
    const q = Math.min(shortfall, cap, foreignQuota(g) - (w.offworld.imports[g] ?? 0));
    if (q <= 1e-6) continue;
    mg.consigned.push({ b: OFFWORLD, c: OFFWORLD, q });
    mg.supply += q;
    addBy(mg.supplyBy, 'import', q);
    w.offworld.imports[g] = (w.offworld.imports[g] ?? 0) + q;
    // 부두에서 내리는 운송도 개항장 시장에서 산다
    const t = transportOrder(w, r.id, q * mg.price, { kind: 'offworld' }, 'import');
    list.push(t);
    r.market.transport.demand += t.qty;
    addBy(r.market.transport.demandBy, 'import', t.qty);
  }
}

// ---------------------------------------------------------------- 시장 체결 (지역 단위)

function clearMarkets(w: World, orders: Orders) {
  w.offworld.exports = {};
  w.offworld.imports = {};
  for (const r of w.regions) if (r.spaceport) addExports(w, r, orders.list);

  // 전날 출발한 화물이 도착해 위탁된다
  for (const sh of w.traders.shipments) {
    const mg = regionById(w, sh.to).market[sh.good];
    mg.consigned.push({ b: TRADER, c: TRADER, q: sh.q });
    mg.supply += sh.q;
    addBy(mg.supplyBy, 'trader', sh.q);
    mg.shippedIn += sh.q;
  }
  w.traders.shipments = [];

  for (const o of orders.list) {
    const mg = regionById(w, o.regionId).market[o.good];
    mg.demand += o.qty;
    addBy(mg.demandBy, o.src, o.qty);
  }
  for (const r of w.regions) if (r.spaceport) addImports(w, r, orders.list);

  // 공급 = 위탁분 + 지역 창고 재고. 부족하면 모든 구매자에게 같은 비율로 배분.
  // 위탁분이 먼저 팔리고 판매자에게 대금이 간다. 창고분 판매 대금은 국고으로 간다.
  const fillRatio = new Map<string, number>();
  for (const r of w.regions) {
    for (const g of GOOD_IDS) {
      const mg = r.market[g];
      const consigned = mg.consigned.reduce((a, l) => a + l.q, 0);
      const available = consigned + Math.max(0, mg.inventory);
      const fr = mg.demand > 0 ? Math.min(1, available / mg.demand) : 1;
      fillRatio.set(`${r.id}:${g}`, fr);
      const sold = mg.demand * fr;
      const fromConsigned = Math.min(sold, consigned);
      const fromStock = sold - fromConsigned;
      const p = mg.price;
      for (const lot of mg.consigned) {
        const amt = consigned > 0 ? fromConsigned * (lot.q / consigned) * p : 0;
        if (lot.c === OFFWORLD) { w.offworld.balance += amt; continue; }
        if (lot.c === TRADER) { w.traders.cash += amt; continue; }
        if (lot.c === SUBSISTENCE_SELLER) {
          paySubsistence(w, regionById(w, lot.b), amt);
          continue;
        }
        const c = companyById(w, lot.c);
        if (c) c.cash += amt;
        const b = w.buildings.find((x) => x.id === lot.b);
        if (b) b.last.revenue += amt;
      }
      w.fund += fromStock * p;
      // 안 팔린 위탁분: 상인 조합 화물은 다음 날 다시 내놓고(조금 상함), 나머지는 지역 창고로 간다
      const unsoldFrac = consigned > 0 ? 1 - fromConsigned / consigned : 0;
      const carry: typeof mg.consigned = [];
      let toStock = 0;
      for (const lot of mg.consigned) {
        const left = lot.q * unsoldFrac;
        if (left <= 1e-9) continue;
        if (lot.c === TRADER) carry.push({ ...lot, q: left * (1 - STOCK_DECAY) }); else toStock += left;
      }
      mg.inventory = Math.max(0, mg.inventory - fromStock) + toStock;
      mg.inventory *= 1 - STOCK_DECAY;
      // 창고에는 한도가 있다: 목표 재고(약 열흘 유통량)의 3배를 넘는 몫은 보관하지 못하고 버려진다
      mg.inventory = Math.min(mg.inventory, mg.target * STOCK_CAP);
      if (GOODS[g].perishable) mg.inventory = 0;
      if (consigned > 0) mg.sellThrough = mg.sellThrough * 0.95 + (fromConsigned / consigned) * 0.05;
      mg.consigned = carry;
      mg.sold = sold;
    }
    for (const s of POP_CLASSES) r.households[s].lastSpend = 0;
  }

  for (const o of orders.list) {
    const q = o.qty * fillRatio.get(`${o.regionId}:${o.good}`)!;
    if (o.miss && o.qty - q > 1e-9) o.miss(o.qty - q);
    if (q <= 0) continue;
    const cost = q * regionById(w, o.regionId).market[o.good].price;
    chargePayer(w, o.payer, cost);
    o.fill(q, cost);
  }

  // 충족률과 부 단계 갱신
  for (const plan of orders.plans) {
    const r = regionById(w, plan.regionId);
    const h = r.households[plan.skill];
    let got = plan.inKindValue;
    for (const g of GOOD_IDS) {
      const q = plan.goods[g];
      if (!q) continue;
      got += q * plan.budgetFrac * fillRatio.get(`${r.id}:${g}`)! * r.market[g].price;
    }
    h.fulfillment = plan.basketCost > 0 ? Math.min(1, got / plan.basketCost) : 1;
    let fed = plan.foodInKind;
    for (const f of plan.foodBuy) fed += (f.qty * plan.budgetFrac * fillRatio.get(`${r.id}:${f.good}`)!) / f.units;
    h.food = plan.foodNeed > 0 ? Math.min(1, fed / plan.foodNeed) : 1;
    updateWealth(h, r, plan);
    h.sol = h.wealth;
  }
}

/**
 * 부 단계 이동 (빅토리아3 방식): 하루 쓸 수 있는 돈(소득 + 저축에서 헐어 쓰는 몫 + 현물)이 다음 단계 묶음 비용의 102%를 넘으면 오르고,
 * 지금 단계 비용의 98%에 못 미치면 내린다. 물건이 없어 못 샀을 때도 내린다. 모아 둔 돈이 많으면 그만큼 더 잘 산다.
 */
function updateWealth(h: Household, r: Region, plan: HouseholdPlan) {
  const income = Math.max(h.incomeEma, plan.budget) + plan.inKindValue;
  const costAt = (wealth: number) => {
    const need = needsAt(wealth);
    let v = 0;
    for (const n of NEEDS) {
      const perCap = need[n.id];
      if (!perCap) continue;
      for (const opt of needSplit(r, n.id)) v += perCap * h.population * opt.units * opt.share * r.market[opt.good].price;
    }
    return v;
  };
  const costCur = costAt(h.wealth);
  const costNext = costAt(Math.min(WEALTH_MAX, h.wealth + 1));
  let d = 0;
  if (h.wealth < WEALTH_MAX && income > costNext * 1.02) d = Math.min(0.03, 0.03 * (income / costNext - 1));
  else if (costCur > 0 && income < costCur * 0.98) d = -Math.min(0.03, 0.015 * (1 - income / costCur));
  if (h.fulfillment < 0.98) d -= 0.01 * (1 - h.fulfillment);
  h.wealth = clamp(h.wealth + d, WEALTH_MIN, WEALTH_MAX);
}

// ---------------------------------------------------------------- 생산

/** 지역 창고 재고의 틱당 손실률 (부패·관리비) */
const STOCK_DECAY = 0.005;
/** 창고 한도 = 목표 재고 × 이 배율 */
const STOCK_CAP = 3;

/** 자급 농업 판매자 표시 (lot.b 에는 지역 id) */
const SUBSISTENCE_SELLER = -3;

/**
 * 자급 농업: 농민은 빈 농지·산림에서 낮은 생산성으로 일한다. 산출의 일부는 현물로 직접 소비하고,
 * 나머지는 지역 시장에 위탁된다. 판매 대금은 땅 주인인 지주 귀족이 전부 가져간다.
 * 땅이 모자라 경작하지 못한 농민은 아무것도 얻지 못한다.
 */
function subsistence(w: World) {
  for (const r of w.regions) {
    const h = r.households.peasant;
    const arableCap = Math.max(0, landFree(w, r.id, 'arable')) * SUBSISTENCE.workersPerArable;
    const forestCap = Math.max(0, landFree(w, r.id, 'forest')) * SUBSISTENCE.workersPerForest;
    const onFarm = Math.min(h.population, arableCap);
    const inForest = Math.min(h.population - onFarm, forestCap);
    r.subsistenceWorkers = onFarm + inForest;
    const out: GoodBag = {
      grain: onFarm * SUBSISTENCE.grainPerWorker + inForest * SUBSISTENCE.forestGrainPerWorker,
      fiber: onFarm * SUBSISTENCE.fiberPerWorker,
      timber: onFarm * SUBSISTENCE.firewoodPerWorker + inForest * SUBSISTENCE.timberPerWorker,
    };
    h.inKind = {};
    let inKindValue = 0;
    for (const g of GOOD_IDS) {
      const q = out[g];
      if (!q || q <= 1e-6) continue;
      // 먹을 곡물은 먼저 남긴다: 식량 필요분(곡물 5단위 = 식량 1)까지는 팔지 않는다
      const food = g === 'grain' ? needsAt(h.wealth).nourishment * h.population * 5 : 0;
      const keep = Math.max(q * SUBSISTENCE.inKindShare, Math.min(q, food));
      h.inKind[g] = keep;
      inKindValue += keep * r.market[g].price; // 지역 시세로 평가 (아래 이동평균이 곡물값 급등을 눌러 준다)
      const sell = q - keep;
      r.market[g].supply += sell;
      addBy(r.market[g].supplyBy, 'subsistence', sell);
      r.market[g].consigned.push({ b: r.id, c: SUBSISTENCE_SELLER, q: sell });
    }
    if (h.population > 1) {
      r.subsistenceIncome = r.subsistenceIncome * 0.98 + (inKindValue / h.population) * 0.02;
    }
  }
}

/** 소작 판매 대금: 지대는 그 지역 지주 귀족에게(없으면 왕국 전체 지주에게), 나머지는 소작농의 현금 소득 */
function paySubsistence(w: World, r: Region, amt: number) {
  const rent = amt * SUBSISTENCE.rentShare;
  payClassIn(w, r, 'aristocrat', rent);
  const h = r.households.peasant;
  h.savings += amt - rent;
  h.lastIncome += amt - rent;
}

/** 숙련도가 하루에 오르는 양 (약 한 달이면 최대 효율) */
const EXP_GAIN = 0.035;
/** 작업 인원이 충원율을 따라가는 하루 비율 (약 2주에 절반) */
const CREW_RATE = 0.08;

function produce(w: World) {
  for (const c of w.companies) { c.buildPoints = 0; c.buildCost = 0; }
  for (const b of w.buildings) {
    if (!b.active) continue;
    const c = companyById(w, b.companyId)!;
    const method = getMethod(b.typeId, b.methodId);
    // 생산은 충원율을 바로 따르지 않고 작업 인원(crew)이 서서히 따라간 만큼 돈다
    b.crew = (b.crew ?? b.last.staffing) + (b.last.staffing - (b.crew ?? b.last.staffing)) * CREW_RATE;
    // 소유주 충원율도 같은 속도로 따라간다 (소유주가 떠나거나 새로 와도 효율은 서서히 바뀐다)
    const of = ownerFillNow(b);
    b.ownerFill = (b.ownerFill ?? of) + (of - (b.ownerFill ?? of)) * CREW_RATE;
    const st = b.crew;
    b.last.points = 0;
    if (st > 1e-4) {
      const idle = b.idle;
      const eff = efficiency(b);
      let fill = 1;
      for (const g of GOOD_IDS) {
        const per = method.inputs[g];
        if (!per) continue;
        const need = per * b.level * b.utilization * st;
        fill = Math.min(fill, need > 0 ? (b.stock[g] ?? 0) / need : 1);
      }
      fill = idle ? 0 : clamp(fill, 0, 1);
      for (const g of GOOD_IDS) {
        const per = method.inputs[g];
        if (!per) continue;
        b.stock[g] = Math.max(0, (b.stock[g] ?? 0) - per * b.level * b.utilization * st * fill);
      }
      b.last.inputFill = idle ? 1 : fill;
      const scale = b.level * b.utilization * st * fill * eff;
      const mk = regionById(w, b.regionId).market;
      for (const g of GOOD_IDS) {
        const per = method.outputs[g];
        if (!per) continue;
        const qty = per * scale;
        b.last.output[g] = qty;
        mk[g].supply += qty;
        addBy(mk[g].supplyBy, `bld:${b.typeId}`, qty);
        if (qty > 0) mk[g].consigned.push({ b: b.id, c: c.id, q: qty });
      }
      if (method.construction && !idle) {
        b.last.points = method.construction * scale;
        c.buildPoints += b.last.points;
        c.buildCost += b.last.wageCost + b.last.inputCost;
      }
      b.exp = Math.min(1, b.exp + EXP_GAIN);
    } else {
      b.last.inputFill = 0;
    }
    c.revenueEma += b.last.revenue * 0.02;
    const profit = b.last.revenue - b.last.inputCost - b.last.wageCost;
    b.profitEma = b.profitEma * 0.95 + profit * 0.05;
    c.weekProfit += profit;
  }
  allocateConstruction(w);
}

/** 오늘 만든 건설 포인트를 회사의 공사에 순서대로 배분한다. 운영비는 포인트 비율로 공사에 기록된다 */
function allocateConstruction(w: World) {
  for (const c of w.companies) {
    let pts = c.buildPoints;
    if (pts <= 0) continue;
    const costPerPoint = c.buildCost / c.buildPoints;
    for (const k of w.constructions) {
      if (k.companyId !== c.id || pts <= 0) continue;
      const take = Math.min(pts, k.required - k.points);
      k.points += take;
      k.spent += take * costPerPoint;
      pts -= take;
    }
  }
}

function advanceConstruction(w: World) {
  const done: number[] = [];
  for (const k of w.constructions) {
    k.ticksElapsed += 1;
    if (k.points >= k.required - 1e-6) done.push(k.id);
  }
  for (const id of done) {
    const k = w.constructions.find((x) => x.id === id)!;
    w.constructions = w.constructions.filter((x) => x.id !== id);
    const def = BUILDING_BY_ID[k.typeId];
    const rname = regionById(w, k.regionId).name;
    // 증설 대상이 없더라도 같은 회사가 같은 지역에 같은 건물을 이미 가졌으면 그 건물에 합친다
    const target = (k.targetBuildingId != null ? w.buildings.find((b) => b.id === k.targetBuildingId) : undefined)
      ?? w.buildings.find((b) => b.companyId === k.companyId && b.regionId === k.regionId && b.typeId === k.typeId);
    if (target) {
      // 늘어난 만큼 새 인력이 섞이므로 숙련도가 희석된다
      const add = k.levels ?? 1;
      target.exp *= target.level / (target.level + add);
      target.level += add;
      logEvent(w, k.companyId, `${rname} ${def.name} 증설 완료 → ${target.level}레벨`,
        { regionId: k.regionId, buildingId: target.id, en: `${regionNameEn(k.regionId)} ${buildingNameEn(k.typeId)} expanded to ${target.level} levels` });
    } else {
      const b = newBuilding(w.nextId++, k.typeId, k.regionId, k.companyId, k.methodId, k.levels ?? 1);
      w.buildings.push(b);
      logEvent(w, k.companyId, `${rname} ${def.name} 신규 건설 완료. 사람을 뽑기 시작합니다.`,
        { regionId: k.regionId, buildingId: b.id, en: `New ${buildingNameEn(k.typeId).toLowerCase()} completed in ${regionNameEn(k.regionId)}. Hiring has begun.` });
    }
  }
}

// ---------------------------------------------------------------- 가격

export const PRICE_MIN = 0.25;
export const PRICE_MAX = 4;
/** 틱당 목표 가격으로 다가가는 비율 */
const PRICE_SPEED = 0.1;
/** 수요·공급 평균이 하루에 따라가는 비율 (가격 반응과 함께 약 2주에 변화의 절반이 반영된다) */
const FLOW_EMA = 0.1;

/**
 * 목표 가격 = 기본가 × (수요/공급)^0.8 × 재고 보정
 * 재고가 목표보다 적으면 크게 올리고(^0.35), 많으면 조금 약하게 내린다(^0.25).
 */
export function targetPrice(g: GoodId, mg: MarketGood): number {
  const ratio = (mg.demandEma + 1e-3) / (mg.supplyEma + 1e-3);
  const stockRatio = (mg.target * 1.1 + 1) / (Math.max(0, mg.inventory) + mg.target * 0.1 + 1);
  const stock = GOODS[g].perishable ? 1 : Math.pow(stockRatio, stockRatio > 1 ? 0.35 : 0.25);
  const base = GOODS[g].basePrice;
  return clamp(base * Math.pow(ratio, 0.8) * stock, base * PRICE_MIN, base * PRICE_MAX);
}

function updatePrices(w: World) {
  const total = w.regions.reduce((a, r) => a + regionPopulation(r), 0);
  for (const r of w.regions) {
    const share = regionPopulation(r) / total;
    for (const g of GOOD_IDS) {
      const mg = r.market[g];
      const base = GOODS[g].basePrice;
      const vol = Math.max(mg.demand, mg.supply);
      mg.volumeEma = mg.volumeEma * 0.98 + vol * 0.02;
      mg.demandEma = mg.demandEma * (1 - FLOW_EMA) + mg.demand * FLOW_EMA;
      mg.supplyEma = mg.supplyEma * (1 - FLOW_EMA) + mg.supply * FLOW_EMA;
      mg.demandByEma = emaBy(mg.demandByEma, mg.demandBy);
      mg.supplyByEma = emaBy(mg.supplyByEma, mg.supplyBy);
      mg.target = Math.max(GOODS[g].minStock * share, mg.volumeEma * 10);
      mg.price = clamp(mg.price + (targetPrice(g, mg) - mg.price) * PRICE_SPEED, base * PRICE_MIN, base * PRICE_MAX);
    }
  }
}

// ---------------------------------------------------------------- 인구·교육 (지역 단위)


/**
 * 부 단계에 따른 하루 인구 증가율 (빅토리아3 곡선을 단순화).
 * 5 아래는 가난으로 조금씩 줄고, 5~15에서 빠르게 늘고, 그 위로는 출생률이 떨어져 완만해진다.
 * 굶어 죽는 것은 부가 아니라 식량 충족률로 정한다 (starvationAt).
 */
export function growthAt(wealth: number): number {
  if (wealth < 5) return -0.00002 * (5 - wealth);
  if (wealth <= 15) return 0.00001 * (wealth - 5);
  return Math.max(0.00003, 0.0001 - 0.000005 * (wealth - 15));
}

/** 식량 충족률이 90% 아래로 내려가면 굶어 죽는다. 절반만 먹으면 하루 0.022% (연 8%) 줄어든다 */
export const STARVATION_LINE = 0.9;
export function starvationAt(food: number): number {
  return food < STARVATION_LINE ? 0.0005 * (STARVATION_LINE - food) : 0;
}

function updatePopulation(w: World) {
  for (const r of w.regions) {
    const pop = regionPopulation(r);
    for (const s of POP_CLASSES) {
      const h = r.households[s];
      h.incomeEma = h.incomeEma * 0.9 + h.lastIncome * 0.1;
      const growth = growthAt(h.wealth) - starvationAt(h.food ?? 1);
      h.population = Math.max(0, h.population * (1 + growth));
    }
    updateEducation(w, r);
    peasantsToLaborers(w, r);
    promote(w, r, 'unskilled', 'skilled');
    promote(w, r, 'skilled', 'expert');
    demote(w, r, 'expert', 'skilled');
    demote(w, r, 'skilled', 'unskilled');
    laborersToPeasants(w, r);
    seatOwners(w, r);
  }
  migrate(w);
  famineMigration(w);
  wageMigration(w);
  // 인구가 줄거나 옮겨 가서 고용자가 지역 인구를 넘으면 그날 바로 비례 감원한다
  for (const r of w.regions) {
    for (const s of SKILLS) {
      const emp = employedIn(w, r.id, s);
      const pop = r.households[s].population;
      if (emp > pop && emp > 0) {
        const keep = pop / emp;
        for (const b of w.buildings) if (b.regionId === r.id) b.employed[s] *= keep;
      }
    }
  }
}

/**
 * 상층 진입 자격과 속도: 위로 갈수록 어렵다. 지역 교육 수준, 부 단계, 1인당 저축을 모두 넘어야 하고,
 * 하루에 원래 계층 인구의 rate 비율까지만 (빈 소유주 자리 안에서) 올라간다.
 */
export const OWNER_REQ = {
  capitalist: { education: 0.4, wealth: 12, savings: 80, rate: 0.0001 },
  aristocrat: { education: 0.5, wealth: 12, savings: 100, rate: 0.00005 },
} as const;
/** 땅이 없는(자리보다 많은) 지주 귀족이 빈 자본가 자리로 옮겨 가는 하루 최대 비율 (몰락 귀족의 산업 투자) */
const ARISTO_TO_CAPITALIST = 0.0005;
/** 부유한 자본가가 빈 지주 자리로 옮겨 가는 하루 최대 비율 (신흥 부자의 땅 매입)과 자격 */
const CAPITALIST_TO_ARISTO = { rate: 0.0001, wealth: 18, savings: 150, education: 0.5 } as const;
/** 자리가 없는 소유 계층이 기술자로 내려가는 하루 비율 (남는 인원 대비) */
const OWNER_SURPLUS_DEMOTE = 0.0005;

/** 계층 이동 누적 기록 (분석·화면용): "from>to" → 사람 수 */
function track(w: World, from: PopClass, to: PopClass, n: number) {
  if (!(n > 0)) return;
  const m = (w.mobility ??= {});
  const k = `${from}>${to}`;
  m[k] = (m[k] ?? 0) + n;
}
function moveClass(w: World, r: Region, from: PopClass, to: PopClass, n: number) {
  const a = r.households[from];
  n = Math.min(n, a.population);
  if (!(n > 0)) return;
  move(a, r.households[to], n);
  track(w, from, to, n);
}

/**
 * 소유주 일자리 배정과 이동 (지역 단위).
 *  1) 상층끼리의 전환: 자리 없는 지주 → 빈 자본가 자리, 부유한 자본가 → 빈 지주 자리 (더 느리고 까다롭다).
 *  2) 그래도 빈 자리는 교육 수준이 높은 지역에서만, 부유한 전문가(먼저)와 기술자가 아주 느리게 채운다.
 *  3) 자리보다 많은 소유 계층은 천천히 기술자로 내려간다.
 *  4) 지역에 있는 자본가·지주가 그 지역 건물의 소유주 자리에 앉는다 (모든 건물에 같은 비율로).
 *     새 건물도 그날 바로 지역의 기존 소유 계층으로 채워지므로, 사람이 남아 있는 한 승급을 기다리지 않는다.
 */
function seatOwners(w: World, r: Region) {
  const jobs = regionOwnerJobs(w, r);
  const H = r.households;
  // 1) 상층끼리의 전환
  const surplusAristo = H.aristocrat.population - jobs.aristocrat;
  const vacantCap = jobs.capitalist - H.capitalist.population;
  if (surplusAristo > 0 && vacantCap > 0) {
    moveClass(w, r, 'aristocrat', 'capitalist', Math.min(surplusAristo, vacantCap, H.aristocrat.population * ARISTO_TO_CAPITALIST));
  }
  const vacantAristo = jobs.aristocrat - H.aristocrat.population;
  const cap = H.capitalist;
  if (vacantAristo > 0 && cap.population >= 1 && r.education >= CAPITALIST_TO_ARISTO.education
    && cap.wealth >= CAPITALIST_TO_ARISTO.wealth && cap.savings / cap.population >= CAPITALIST_TO_ARISTO.savings) {
    moveClass(w, r, 'capitalist', 'aristocrat', Math.min(vacantAristo, cap.population * CAPITALIST_TO_ARISTO.rate));
  }
  for (const cls of ['capitalist', 'aristocrat'] as const) {
    const h = H[cls];
    const gap = jobs[cls] - h.population;
    if (gap >= 1) {
      // 2) 중층에서 상층으로: 교육이 높은 지역에서만, 전문가가 먼저
      const req = OWNER_REQ[cls];
      if (r.education < req.education) continue;
      let left = gap;
      for (const src of ['expert', 'skilled'] as const) {
        const s = H[src];
        if (left <= 0 || s.population < 1 || s.wealth < req.wealth || s.savings / s.population < req.savings) continue;
        const n = Math.min(left, s.population * req.rate);
        moveClass(w, r, src, cls, n);
        left -= n;
      }
    } else if (gap <= -1) {
      // 3) 자리 없는 소유 계층은 천천히 기술자로
      moveClass(w, r, cls, 'skilled', -gap * OWNER_SURPLUS_DEMOTE);
    }
  }
  // 4) 자리 배정 (이동을 반영한 뒤)
  for (const cls of ['capitalist', 'aristocrat'] as const) {
    const seated = jobs[cls] > 0 ? Math.min(1, H[cls].population / jobs[cls]) : 0;
    for (const b of w.buildings) {
      if (b.regionId !== r.id) continue;
      const o = ownerJobs(b);
      if (o.cls === cls) b.owners = o.jobs * seated;
    }
  }
}

/** 소작농이 노동자로 옮겨 가는 하루 최대 비율 (× 문해력 0.25 + 1.5 × 교육). 새 공장은 몇 주~몇 달에 걸쳐 찬다 */
export const PEASANT_TO_LABORER = 0.002;
/** 노동자 빈자리가 실업 노동자보다 많으면 농민이 공장으로 간다 */
function peasantsToLaborers(w: World, r: Region) {
  const peasants = r.households.peasant;
  if (peasants.population < 1) return;
  let vacancy = 0;
  for (const b of w.buildings) if (b.regionId === r.id) vacancy += Math.max(0, slots(b, 'unskilled') - b.employed.unskilled);
  const idle = r.households.unskilled.population * regionUnemployment(w, r.id, 'unskilled');
  const gap = vacancy - idle;
  if (gap < 1) return;
  // 공장 일자리는 소작보다 낫지만 땅을 떠나는 데는 시간이 걸린다. 글을 읽고 셈을 할 줄 아는 사람이 먼저 간다:
  // 교육 수준이 낮은 지역은 옮겨 가는 속도가 느리다 (교육 10% → 0.4배, 50% → 1배, 상한 1.5배)
  const literacy = clamp(0.25 + 1.5 * r.education, 0.25, 1.5);
  // 교육이 공장 노동자로 일할 수 있는 사람의 상한도 정한다: 하층 중 노동자 비율 ≤ 25% + 교육 × 2 (최대 95%)
  const laborers = r.households.unskilled.population;
  const room = clamp(0.25 + 2 * r.education, 0.25, 0.95) * (laborers + peasants.population) - laborers;
  if (room < 1) return;
  moveClass(w, r, 'peasant', 'unskilled', Math.min(gap * 0.5, room, peasants.population * PEASANT_TO_LABORER * literacy));
}

/** 일자리를 못 구한 노동자는 땅이 남아 있으면 농민으로 돌아간다 */
function laborersToPeasants(w: World, r: Region) {
  const ur = regionUnemployment(w, r.id, 'unskilled');
  if (ur < 0.1) return;
  const landCap = landFree(w, r.id, 'arable') * SUBSISTENCE.workersPerArable + landFree(w, r.id, 'forest') * SUBSISTENCE.workersPerForest;
  const room = landCap - r.households.peasant.population;
  if (room < 1) return;
  const h = r.households.unskilled;
  moveClass(w, r, 'unskilled', 'peasant', Math.min(room, h.population * ur * 0.001));
}

/** 교육 수준의 바닥값과, 학교가 모든 인구를 감당할 때의 최대 상승폭 */
const EDUCATION_FLOOR = 0.1;
const EDUCATION_RANGE = 0.8;

/** 교육 수준은 학교가 감당하는 인구 비율을 목표로 천천히 움직인다 (오를 땐 빠르고 내릴 땐 느리다) */
function updateEducation(w: World, r: Region) {
  let seats = 0;
  for (const b of w.buildings) {
    if (b.regionId !== r.id || !getMethod(b.typeId, b.methodId).grant || !b.active) continue;
    seats += b.level * b.utilization * b.last.staffing * SCHOOL_CAPACITY;
  }
  const pop = regionPopulation(r);
  const coverage = pop > 0 ? Math.min(1, seats / pop) : 0;
  const target = EDUCATION_FLOOR + EDUCATION_RANGE * coverage;
  const rate = target > r.education ? 0.002 : 0.0005;
  r.education += (target - r.education) * rate;
}

/** 교육 수준에 따른 상위 직종 인구 비율 상한 */
export function skillShareCap(education: number, to: Skill): number {
  if (to === 'skilled') return 0.04 + 0.4 * education;
  return 0.002 + 0.08 * Math.max(0, education - 0.25);
}

/** 승급 자격: 부 단계와 1인당 저축 (가난하면 교육을 받아도 올라가지 못한다) */
const PROMOTE_REQ = { skilled: { wealth: 6, savings: 8 }, expert: { wealth: 9, savings: 30 } } as const;

/** 상위 직종 빈자리가 있으면 승급이 일어난다. 속도와 상한은 지역 교육 수준이, 자격은 부와 저축이 정한다 */
function promote(w: World, r: Region, from: Skill, to: Skill) {
  const a = r.households[from];
  const b = r.households[to];
  if (a.population < 1) return;
  const req = PROMOTE_REQ[to as 'skilled' | 'expert'];
  if (a.wealth < req.wealth || a.savings / a.population < req.savings) return;
  if (regionUnemployment(w, r.id, to) > 0.05) return;
  const pop = regionPopulation(r);
  if (b.population / pop >= skillShareCap(r.education, to)) return;
  const learn = to === 'skilled' ? r.education : Math.max(0, r.education - 0.25) * 2;
  if (learn <= 0) return;
  let vacancy = 0;
  for (const x of w.buildings) if (x.regionId === r.id) vacancy += Math.max(0, slots(x, to) - x.employed[to]);
  if (vacancy < 1) return;
  // 위 직종 임금이 평소 비율보다 높을수록 더 많은 사람이 배워서 올라간다 (최대 4배)
  const premium = (marketWage(w, to) / Math.max(1e-6, marketWage(w, from))) / (SKILL_DEFS[to].baseWage / SKILL_DEFS[from].baseWage);
  const pull = clamp(premium * premium, 0.5, 4);
  const n = Math.min(a.population * 0.0004 * learn * pull, vacancy * 0.02);
  moveClass(w, r, from, to, n);
}

function demote(w: World, r: Region, from: Skill, to: Skill) {
  const ur = regionUnemployment(w, r.id, from);
  if (ur < 0.15) return;
  moveClass(w, r, from, to, r.households[from].population * ur * 0.0005);
}

function move(a: { population: number; savings: number }, b: { population: number; savings: number }, n: number) {
  if (n <= 0 || a.population <= 0) return;
  const money = a.savings * (n / a.population);
  a.population -= n; a.savings -= money;
  b.population += n; b.savings += money;
}

/** 기근이 심할 때 하루에 떠나는 최대 비율 (식량 차이 0.5 이상에서 최대) */
const FAMINE_MOVE_MAX = 0.001;
/** 기근 이주 계층: 소유 계층은 땅·공장에 묶여 있으므로 떠나지 않는다 */
const FAMINE_MOVERS: PopClass[] = ['peasant', 'unskilled', 'skilled', 'expert'];

/**
 * 기근 이주: 식량 충족률이 기아선(STARVATION_LINE) 아래인 계층은 더 잘 먹는 이웃 지역으로 떠난다.
 * 차이가 클수록 많이(하루 최대 0.1%), 저축은 사람 수에 비례해 들고 간다.
 * 소작농은 도착 지역에 빌릴 땅이 남아 있으면 소작농으로, 없으면 노동자(일자리를 찾는 사람)로 정착한다.
 */
function famineMigration(w: World) {
  for (const r of w.regions) {
    for (const cls of FAMINE_MOVERS) {
      const h = r.households[cls];
      if (h.population < 1 || h.food >= STARVATION_LINE) continue;
      let best: Region | null = null, bestFood = h.food + 0.05;
      for (const nb of r.neighbors) {
        const n = regionById(w, nb);
        const nh = n.households[cls];
        const food = nh.population >= 1 ? nh.food : 1;
        if (food > bestFood + 1e-9) { best = n; bestFood = food; }
      }
      if (!best) continue;
      const n = h.population * Math.min(FAMINE_MOVE_MAX, (bestFood - h.food) * 0.002);
      if (n <= 0) continue;
      let to = best.households[cls];
      if (cls === 'peasant') {
        const room = landFree(w, best.id, 'arable') * SUBSISTENCE.workersPerArable + landFree(w, best.id, 'forest') * SUBSISTENCE.workersPerForest
          - best.households.peasant.population;
        if (room < n) to = best.households.unskilled;
      }
      move(h, to, n);
      r.famineOut += n;
      r.famineTo[best.id] = (r.famineTo[best.id] ?? 0) + n;
    }
  }
}

/** 이웃 지역 평균 임금이 이 배율을 넘게 높아야 임금 이주가 시작되고, WAGE_MOVE_FULL 배에서 최대가 된다 */
const WAGE_MOVE_START = 1.3;
const WAGE_MOVE_FULL = 2;
/** 임금 이주의 하루 최대 비율 */
const WAGE_MOVE_MAX = 0.0005;

/** 지역에서 고용된 사람 1인당 실제로 받는 평균 임금 (고용이 없으면 null) */
export function regionAvgWage(w: World, regionId: number, s: Skill): number | null {
  let paid = 0, n = 0;
  for (const b of w.buildings) {
    if (b.regionId !== regionId || b.employed[s] <= 0) continue;
    const c = companyById(w, b.companyId);
    if (!c) continue;
    paid += b.employed[s] * c.wages[s];
    n += b.employed[s];
  }
  return n > 0 ? paid / n : null;
}

/**
 * 임금 이주: 노동자·기술자는 이웃 지역의 평균 임금이 30% 넘게 높고, 그곳에 빈자리가 있거나 실업률이 더 낮으면
 * 조금씩 옮겨 간다 (임금 차이에 비례해 하루 최대 0.05%, 두 배 차이에서 최대). 저축은 사람 수에 비례해 들고 간다.
 */
function wageMigration(w: World) {
  for (const s of ['unskilled', 'skilled'] as const) {
    const wage = new Map<number, number | null>();
    const vacancy = new Map<number, number>();
    for (const r of w.regions) {
      wage.set(r.id, regionAvgWage(w, r.id, s));
      let v = 0;
      for (const b of w.buildings) if (b.regionId === r.id) v += Math.max(0, slots(b, s) - b.employed[s]);
      vacancy.set(r.id, v);
    }
    for (const r of w.regions) {
      const h = r.households[s];
      if (h.population < 1) continue;
      // 일자리가 없는 지역의 사람은 그 지역에서 받을 수 있는 임금을 시장임금의 절반으로 본다
      const here = wage.get(r.id) ?? marketWage(w, s) * 0.5;
      if (!(here > 0)) continue;
      const ur = regionUnemployment(w, r.id, s);
      let best: Region | null = null, bestRatio = WAGE_MOVE_START;
      for (const nb of r.neighbors) {
        const there = wage.get(nb);
        if (there == null) continue;
        const ratio = there / here;
        if (ratio <= bestRatio + 1e-9) continue;
        if (vacancy.get(nb)! < 1 && regionUnemployment(w, nb, s) >= ur) continue;
        best = regionById(w, nb); bestRatio = ratio;
      }
      if (!best) continue;
      const share = WAGE_MOVE_MAX * clamp((bestRatio - WAGE_MOVE_START) / (WAGE_MOVE_FULL - WAGE_MOVE_START), 0, 1);
      const n = h.population * share;
      if (!(n > 0)) continue;
      move(h, best.households[s], n);
      r.wageOut = (r.wageOut ?? 0) + n;
      r.wageTo ??= {};
      r.wageTo[best.id] = (r.wageTo[best.id] ?? 0) + n;
    }
  }
}

/** 실업이 심한 지역의 사람들은 실업률이 낮은 이웃 지역으로 조금씩 옮겨 간다 */
function migrate(w: World) {
  for (const s of SKILLS) {
    for (const r of w.regions) {
      const ur = regionUnemployment(w, r.id, s);
      if (ur < 0.05) continue;
      let best: Region | null = null;
      let bestRate = ur - 0.05;
      for (const nb of r.neighbors) {
        const n = regionById(w, nb);
        const un = regionUnemployment(w, n.id, s);
        if (un < bestRate) { best = n; bestRate = un; }
      }
      if (!best) continue;
      const h = r.households[s];
      move(h, best.households[s], h.population * (ur - bestRate) * 0.003);
    }
  }
}

// ---------------------------------------------------------------- 주간 처리

const TAX_RATE = 0.1;

function weekly(w: World) {
  // 법인세 → 국고
  for (const c of w.companies) {
    if (c.weekProfit > 0) {
      const tax = Math.min(Math.max(0, c.cash), c.weekProfit * TAX_RATE);
      c.cash -= tax;
      w.fund += tax;
    }
  }
  restructure(w);
  investSavings(w);
  runAi(w);
  weeklyBanking(w);
  weeklyAlerts(w);

  for (const c of w.companies) {
    c.lastWeekProfit = c.weekProfit;
    c.weekProfit = 0;
    c.weekStartCash = c.cash;
  }
  recordHistory(w);
}

/**
 * 가계의 잉여 저축(소득 20일치 초과분) 일부가 투자로 흘러간다.
 * 절반은 기업 지분 투자(자산이 크고 최근 이윤이 큰 회사일수록 더 많이. 건물이 없는 회사는 받지 못한다),
 * 절반은 은행 예금(대출 재원).
 */
/** 주당 지분 투자 유입 상한 (건물 장부가 대비) */
const EQUITY_CAP = 0.15;
/** 건물이 없는 상회의 투자 가중치와 주당 상한 */
const VENTURE_WEIGHT = 20 * POP_SCALE;
const VENTURE_CAP = 600 * POP_SCALE;

function investSavings(w: World) {
  let pool = 0;
  for (const r of w.regions) {
    for (const s of POP_CLASSES) {
      const h = r.households[s];
      const keep = Math.max(h.incomeEma * 20, h.population * 5);
      const excess = h.savings - keep;
      if (excess > 0) {
        const amt = excess * 0.25;
        h.savings -= amt;
        pool += amt;
      }
    }
  }
  if (pool <= 0) return;
  w.bank.cash += pool * 0.5;
  const equity = pool * 0.5;
  const weights = w.companies.map((c) => {
    if (c.isPlayer) return 0; // 플레이어는 가계 지분 투자를 받지 않는다 (자본은 대출로)
    let book = 0;
    for (const b of w.buildings) if (b.companyId === c.id) book += bookValue(b);
    // 이미 쓰지 못한 현금이 자산보다 많은 회사에는 돈을 더 맡기지 않는다
    if (book > 0 && c.cash > book) return 0;
    // 건물이 없는 상회는 새 사업으로 보고 작은 창업 투자를 받는다 (영원히 죽지 않게)
    return book > 0 ? book * 0.01 + Math.max(0, c.weekProfit) : VENTURE_WEIGHT;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) { w.bank.cash += equity; return; }
  // 한 회사가 한 주에 받을 수 있는 지분 투자는 자산의 3%까지. 넘치는 돈은 은행 예금이 된다
  let leftover = 0;
  w.companies.forEach((c, i) => {
    let book = 0;
    for (const b of w.buildings) if (b.companyId === c.id) book += bookValue(b);
    const share = (equity * weights[i]) / sum;
    const take = Math.min(share, book > 0 ? book * EQUITY_CAP : VENTURE_CAP);
    c.cash += take;
    leftover += share - take;
  });
  w.bank.cash += leftover;
}

export function recordHistory(w: World) {
  const prices: HistoryPoint['prices'] = {};
  const inventory: HistoryPoint['inventory'] = {};
  const regionSol: Record<number, number> = {};
  const regionEducation: Record<number, number> = {};
  for (const r of w.regions) {
    prices[r.id] = {} as Record<GoodId, number>;
    inventory[r.id] = {} as Record<GoodId, number>;
    for (const g of GOOD_IDS) {
      prices[r.id][g] = r.market[g].price;
      inventory[r.id][g] = r.market[g].inventory;
    }
    regionSol[r.id] = r.households.unskilled.wealth;
    regionEducation[r.id] = r.education;
  }
  const sol = {} as Record<PopClass, number>;
  const unemployment = {} as Record<Skill, number>;
  const population = {} as Record<PopClass, number>;
  for (const s of POP_CLASSES) {
    sol[s] = colonySol(w, s);
    population[s] = colonyPopulation(w, s);
  }
  for (const s of SKILLS) unemployment[s] = unemploymentRate(w, s);
  const companyCash: Record<number, number> = {};
  const companyDebt: Record<number, number> = {};
  for (const c of w.companies) { companyCash[c.id] = c.cash; companyDebt[c.id] = c.debt; }
  w.history.push({
    tick: w.tick, prices, inventory, sol, unemployment, population, regionSol, regionEducation,
    companyCash, companyDebt, totalMoney: totalMoney(w),
  });
  if (w.history.length > HISTORY_CAP) w.history.splice(0, w.history.length - HISTORY_CAP);
}
