import { EDUCATION_FLOOR, EDUCATION_RANGE, GOOD_IDS, SKILL_DEFS, TICKS_PER_WEEK, getMethod } from './data';
import { round2 } from './rng';
import { roundAll, roundWorld } from './round';
import { colonyPopulation, colonySol, marketWage, prospect, totalMoney, unemploymentRate } from './economy';
import { runAi } from './ai';
import { weeklyAlerts } from './alerts';
import { recordMetrics } from './metrics';
import { applyCommandMsg } from './commands';
import { chargeInterest, collectIncomeTax, doResearch, mintMoney, payDividends, spendBudget, weeklyBanking } from './finance';
import { laborMarket, migrate, payWages, syncEmployment } from './labor';
import { clearMarkets, collectOrders, harvest, newBook, resetMarkets, updatePrices } from './market';
import { aggregateHouseholds, matchNobles, prunePops, updateGrowth, updateLiteracy, updateQualifications, weekToward } from './pops';
import { advanceConstruction, produce, progressDemolition, updateIdleOffices, updateSubsistence } from './production';
import { POP_CLASSES, SKILLS, educationOf, emptyLedger } from './types';
import type { GoodId, HistoryPoint, PopClass, QueuedCommand, Skill, World } from './types';

export { needSplit } from './market';
export { birthRateAt, growthAt, mortalityAt, STARVATION_LINE } from './pops';

const HISTORY_CAP = 1500;

/**
 * 하루를 진행한다. 명령은 틱 시작 시점에 적용된다: 화면이 틱 사이에 넣는 명령(applyCommandMsg)과 같은 길이라
 * (명령마다 저장값을 소수 둘째 자리로 맞춘다) 명령을 어느 쪽으로 넣어도 결과가 같다
 */
export function step(w: World, commands: QueuedCommand[] = []): string[] {
  const errors: string[] = [];
  for (const q of commands) {
    const err = applyCommandMsg(w, q.actor, q.cmd);
    if (err) errors.push(err.text);
  }

  prospect(w);
  updateSubsistence(w);
  updateIdleOffices(w);
  applyWagePolicy(w);
  chargeInterest(w);
  doResearch(w);
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

  updateQualifications(w);
  matchNobles(w);
  updateGrowth(w);
  migrate(w);
  prunePops(w);
  syncEmployment(w);
  aggregateHouseholds(w);

  w.tick += 1;
  if (w.tick % TICKS_PER_WEEK === 0) weekly(w);
  // 하루 소득 평균은 주간 지급(배당·지대 배당·복지·연구비)까지 받은 뒤에 갱신한다
  for (const p of w.pops) p.incomeEma = p.incomeEma * 0.9 + p.lastIncome * 0.1;
  recordMetrics(w);
  // 저장값은 소수 둘째 자리까지 (round.ts)
  roundWorld(w);
  return errors;
}

/** 시장임금 정책을 쓰는 회사(플레이어)의 임금을 매일 시장에 맞춘다 */
function applyWagePolicy(w: World) {
  for (const c of w.companies) {
    if (!c.wageOffset) continue;
    for (const s of SKILLS) {
      const base = SKILL_DEFS[s].baseWage;
      c.wages[s] = round2(Math.min(base * 10, Math.max(base * 0.1, marketWage(w, s, c.id) * (1 + c.wageOffset[s]))));
    }
  }
}

/** 교육 접근도(%)는 학교가 감당하는 인구 비율을 향해 천천히 움직인다 (문해력과 같은 속도, 주 1회 7일치) */
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
    r.education100 = weekToward(r.education100, 100 * (EDUCATION_FLOOR + EDUCATION_RANGE * coverage));
  }
}

function weekly(w: World) {
  // 교육 접근도와 문해력은 주 1회 7일치씩 움직인다 (% 단위 소수 둘째 자리에서 멈추지 않게)
  updateEducation(w);
  updateLiteracy(w);
  mintMoney(w);
  spendBudget(w);
  for (const c of w.companies) payDividends(w, c);
  progressDemolition(w);
  runAi(w);
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
