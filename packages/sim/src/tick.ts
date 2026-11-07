import { EDUCATION_FLOOR, EDUCATION_RANGE, GOOD_IDS, TICKS_PER_WEEK, getMethod } from './data';
import { roundAll, writePool } from './round';
import { colonyPopulation, colonySol, prospect, syncLockedGoods, totalMoney, unemploymentRate } from './economy';
import { runAi } from './ai';
import { updateLaws } from './policy';
import { payWelfare } from './welfare';
import { weeklyAlerts } from './alerts';
import { recordMetrics } from './metrics';
import { applyCommandMsg } from './commands';
import { beginStep, chargeInterest, collectIncomeTax, doResearch, updateFunds, mintMoney, payDividends, spendBudget, weeklyBanking } from './finance';
import { laborMarket, migrate, payWages, syncEmployment, updateMarketWages } from './labor';
import { clearMarkets, collectOrders, harvest, newBook, resetMarkets, updatePrices } from './market';
import { aggregateHouseholds, matchNobles, prunePops, toward, updateGrowth, updateLiteracy, updateQualifications } from './pops';
import { advanceConstruction, produce, progressDemolition, updateIdleOffices, updateSubsistence } from './production';
import { POP_CLASSES, SKILLS, educationOf, emptyLedger } from './types';
import type { GoodId, HistoryPoint, PopClass, QueuedCommand, Skill, World } from './types';

export { needSplit } from './market';
export { birthRateAt, growthAt, mortalityAt, STARVATION_LINE } from './pops';

const HISTORY_CAP = 1500;

/**
 * 하루를 진행한다. 명령은 틱 시작 시점에 적용된다: 화면이 틱 사이에 넣는 명령(applyCommandMsg)과 같은 길이라
 * 명령을 어느 쪽으로 넣어도 결과가 같다
 */
export function step(w: World, commands: QueuedCommand[] = []): string[] {
  const errors: string[] = [];
  beginStep(w);
  for (const q of commands) {
    const err = applyCommandMsg(w, q.actor, q.cmd);
    if (err) errors.push(err.text);
  }

  // 틱이 음수면 시작 전 시장 돌리기다 (warmUp): 시장·임금·세금·배당만 돈다. 인구·건물·기술은 그대로 둔다
  const warm = w.tick < 0;
  if (!warm) {
    prospect(w);
    updateLaws(w);
  }
  updateSubsistence(w);
  if (!warm) updateIdleOffices(w);
  updateMarketWages(w);
  chargeInterest(w);
  if (!warm) doResearch(w);
  syncLockedGoods(w);
  laborMarket(w);
  resetMarkets(w);
  payWages(w);
  collectIncomeTax(w);

  const book = newBook();
  harvest(w, book);
  collectOrders(w, book);
  clearMarkets(w, book);
  produce(w);
  advanceConstruction(w);
  updatePrices(w);

  if (!warm) {
    updateQualifications(w);
    matchNobles(w);
    updateGrowth(w);
    migrate(w);
    prunePops(w);
  }
  syncEmployment(w);
  payWelfare(w);
  aggregateHouseholds(w);
  if (!warm) {
    updateEducation(w);
    updateLiteracy(w);
  }

  w.tick += 1;
  if (w.tick % TICKS_PER_WEEK === 0) weekly(w);
  // 하루 소득 평균은 주간 지급(배당·지대 배당·복지)까지 받은 뒤에 갱신한다
  for (const p of w.pops) {
    p.incomeEma = p.incomeEma * 0.9 + p.lastIncome * 0.1;
    // 통계용 소득: 저택·금융가 금고 방출(other)은 생산이 아니라 쌓인 돈을 돌려주는 것이라 뺀다 (세금·소비·신용 한도는 incomeEma 그대로)
    p.gdpEma = (p.gdpEma ?? p.incomeEma) * 0.9 + (p.lastIncome - (p.incomeBreakdown?.other ?? 0)) * 0.1;
  }
  recordMetrics(w);
  // 화면 표시용 사본 (round.ts)
  writePool(w);
  return errors;
}

/**
 * 시작 전 시장 돌리기: 틱 −days 에서 0 까지 시장만 돌려 가격·임금·소득·저축이 시작 세계에 맞는 값이 된 뒤 게임을 시작한다.
 * 음수 틱에는 기상 조건·탐광이 없다 (economy.ts). 기록은 지운다
 */
export function warmUp(w: World, days: number): World {
  w.tick = -days;
  while (w.tick < 0) step(w);
  w.metrics = [];
  w.history = [];
  w.events = w.events.filter((e) => e.tick >= 0);
  w.alertState = {};
  return w;
}

/** 교육 접근도(0..1)는 매일 학교가 감당하는 인구 비율을 향해 천천히 움직인다 (문해력과 같은 속도) */
function updateEducation(w: World) {
  const seats = new Map<number, number>();
  for (const b of w.buildings) {
    const m = getMethod(b.typeId, b.methodId);
    if (!b.active || !m.seats) continue;
    seats.set(b.regionId, (seats.get(b.regionId) ?? 0) + b.level * b.utilization * b.last.staffing * b.last.inputFill * m.seats);
  }
  const pop = new Map<number, number>();
  for (const p of w.pops) pop.set(p.regionId, (pop.get(p.regionId) ?? 0) + p.size);
  for (const r of w.regions) {
    const n = pop.get(r.id) ?? 0;
    const coverage = n > 0 ? Math.min(1, (seats.get(r.id) ?? 0) / n) : 0;
    r.education = toward(r.education, EDUCATION_FLOOR + EDUCATION_RANGE * coverage);
  }
}

function weekly(w: World) {
  mintMoney(w);
  spendBudget(w);
  for (const c of w.companies) payDividends(w, c);
  updateFunds(w);
  progressDemolition(w);
  if (w.tick > 0) runAi(w);
  weeklyBanking(w);
  weeklyAlerts(w);
  for (const c of w.companies) {
    c.lastWeekProfit = c.weekProfit;
    c.weekProfit = 0;
    c.lastLedger = c.ledger;
    c.ledger = emptyLedger();
    c.weekStartCash = c.cash;
  }
  recordHistory(w);
}

export function recordHistory(w: World) {
  const prices: HistoryPoint['prices'] = {};
  const inventory: HistoryPoint['inventory'] = {};
  const regionSol: Record<number, number> = {};
  const regionEducation: Record<number, number> = {};
  for (const r of w.regions) {
    prices[r.id] = {} as Record<GoodId, number>;
    inventory[r.id] = {} as Record<GoodId, number>;
    for (const g of GOOD_IDS) { prices[r.id][g] = r.market[g].price; inventory[r.id][g] = r.market[g].inventory; }
    regionSol[r.id] = r.households.unskilled.population > 0 ? r.households.unskilled.wealth : r.households.peasant.wealth;
    regionEducation[r.id] = educationOf(r);
  }
  const sol = {} as Record<PopClass, number>;
  const population = {} as Record<PopClass, number>;
  const unemployment = {} as Record<Skill, number>;
  for (const s of POP_CLASSES) { sol[s] = colonySol(w, s); population[s] = colonyPopulation(w, s); }
  for (const s of SKILLS) unemployment[s] = unemploymentRate(w, s);
  const companyCash: Record<number, number> = {};
  const companyDebt: Record<number, number> = {};
  for (const c of w.companies) { companyCash[c.id] = c.cash; companyDebt[c.id] = c.debt; }
  const point: HistoryPoint = { tick: w.tick, prices, inventory, sol, unemployment, population, regionSol, regionEducation, companyCash, companyDebt, totalMoney: totalMoney(w) };
  roundAll(point);
  w.history.push(point);
  if (w.history.length > HISTORY_CAP) w.history.splice(0, w.history.length - HISTORY_CAP);
}
