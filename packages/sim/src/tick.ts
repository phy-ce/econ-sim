import { GOOD_IDS, TICKS_PER_WEEK, getMethod } from './data';
import { round2 } from './rng';
import { colonyPopulation, colonySol, totalMoney, unemploymentRate } from './economy';
import { runAi } from './ai';
import { weeklyAlerts } from './alerts';
import { recordMetrics } from './metrics';
import { applyCommand } from './commands';
import { chargeInterest, collectIncomeTax, distributeInvestment, doResearch, mintMoney, payBuildings, spendBudget, weeklyBanking } from './finance';
import { adjustWages, laborMarket, migrate, payWages, syncEmployment } from './labor';
import { clearMarkets, collectOrders, harvest, newBook, resetMarkets, updatePrices } from './market';
import { aggregateHouseholds, prunePops, updateGrowth, updateLiteracy, updateQualifications } from './pops';
import { advanceConstruction, produce, progressDemolition, updateIdleOffices, updateSubsistence } from './production';
import { POP_CLASSES, SKILLS, emptyLedger, emptyWeek } from './types';
import type { GoodId, HistoryPoint, PopClass, QueuedCommand, Skill, World } from './types';

export { needSplit } from './market';
export { birthRateAt, growthAt, mortalityAt, STARVATION_LINE } from './pops';

const HISTORY_CAP = 1500;

/** 하루를 진행한다. 명령은 틱 시작 시점에 적용된다 */
export function step(w: World, commands: QueuedCommand[] = []): string[] {
  const errors: string[] = [];
  for (const q of commands) {
    const err = applyCommand(w, q.actor, q.cmd);
    if (err) errors.push(err);
  }

  updateSubsistence(w);
  updateIdleOffices(w);
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

  updateEducation(w);
  updateLiteracy(w);
  updateQualifications(w);
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
  return errors;
}

/** 교육 접근도의 바닥값과 학교가 모든 인구를 감당할 때의 최대 상승폭 */
const EDUCATION_FLOOR = 0.1;
const EDUCATION_RANGE = 0.8;

/** 교육 접근도는 학교가 감당하는 인구 비율을 향해 천천히 움직인다 */
function updateEducation(w: World) {
  const seats = new Map<number, number>();
  for (const b of w.buildings) {
    const m = getMethod(b.typeId, b.methodId);
    if (!b.active || !m.seats) continue;
    seats.set(b.regionId, (seats.get(b.regionId) ?? 0) + b.level * b.utilization * b.last.staffing * m.seats);
  }
  const pop = new Map<number, number>();
  for (const p of w.pops) pop.set(p.regionId, (pop.get(p.regionId) ?? 0) + p.size);
  for (const r of w.regions) {
    const n = pop.get(r.id) ?? 0;
    const coverage = n > 0 ? Math.min(1, (seats.get(r.id) ?? 0) / n) : 0;
    const target = EDUCATION_FLOOR + EDUCATION_RANGE * coverage;
    r.education += (target - r.education) * (target > r.education ? 0.002 : 0.0005);
  }
}

/**
 * 주간: 건물 주간 장부를 넘긴다(그 뒤의 판단은 막 끝난 주 lastWeek 를 읽는다) → 주조 → 건물 배당 → 국정 예산 → 투자 풀 → 철거 →
 * AI(보조금·방식·공사) → 건물 임금 → 국채 상환·남는 돈 → 알림 → 회사 장부 넘김
 */
function weekly(w: World) {
  for (const b of w.buildings) {
    const x = b.week;
    b.lastWeek = { revenue: round2(x.revenue), wages: round2(x.wages), inputs: round2(x.inputs), subsidy: round2(x.subsidy) };
    b.week = emptyWeek();
  }
  mintMoney(w);
  payBuildings(w);
  spendBudget(w);
  distributeInvestment(w);
  progressDemolition(w);
  runAi(w);
  adjustWages(w);
  weeklyBanking(w);
  weeklyAlerts(w);
  for (const c of w.companies) {
    c.lastWeekProfit = c.weekProfit;
    c.weekProfit = 0;
    c.lastLedger = c.ledger;
    c.ledger = emptyLedger();
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
    regionEducation[r.id] = r.education;
  }
  const sol = {} as Record<PopClass, number>;
  const population = {} as Record<PopClass, number>;
  const unemployment = {} as Record<Skill, number>;
  for (const s of POP_CLASSES) { sol[s] = colonySol(w, s); population[s] = colonyPopulation(w, s); }
  for (const s of SKILLS) unemployment[s] = unemploymentRate(w, s);
  const companyCash: Record<number, number> = {};
  const companyDebt: Record<number, number> = {};
  for (const c of w.companies) { companyCash[c.id] = c.cash; companyDebt[c.id] = c.debt; }
  w.history.push({ tick: w.tick, prices, inventory, sol, unemployment, population, regionSol, regionEducation, companyCash, companyDebt, totalMoney: totalMoney(w) });
  if (w.history.length > HISTORY_CAP) w.history.splice(0, w.history.length - HISTORY_CAP);
}
