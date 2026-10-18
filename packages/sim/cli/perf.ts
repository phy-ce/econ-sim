// 단계별 실행 시간: npx tsx cli/perf.ts [years]
import { createWorld, step } from '../src/index';
import { TICKS_PER_WEEK } from '../src/data';
import { chargeInterest, collectIncomeTax, distributeInvestment, doResearch, mintMoney, payDividends, spendBudget, weeklyBanking } from '../src/finance';
import { laborMarket, migrate, payWages, syncEmployment } from '../src/labor';
import { clearMarkets, collectOrders, harvest, newBook, resetMarkets, updatePrices } from '../src/market';
import { advanceConstruction, produce, updateIdleOffices, updateSubsistence } from '../src/production';
import { aggregateHouseholds, prunePops, updateGrowth, updateLiteracy, updateQualifications } from '../src/pops';
import { recordMetrics } from '../src/metrics';
import { runAi } from '../src/ai';
const w = createWorld(1, { withPlayer: false });
for (let d = 0; d < 360 * 3; d++) step(w);
const t: Record<string, number> = {};
const run = (k: string, f: () => void) => { const a = performance.now(); f(); t[k] = (t[k] ?? 0) + performance.now() - a; };
const days = Number(process.argv[2] ?? 1) * 360;
const t0 = performance.now();
for (let d = 0; d < days; d++) {
  run('subsistence', () => { updateSubsistence(w); updateIdleOffices(w); chargeInterest(w); doResearch(w); });
  run('laborMarket', () => laborMarket(w));
  run('wages+tax', () => { resetMarkets(w); payWages(w); collectIncomeTax(w); });
  const book = newBook();
  run('harvest+orders', () => { harvest(w, book); collectOrders(w, book); });
  run('clearMarkets', () => clearMarkets(w, book));
  run('produce+build', () => { produce(w); advanceConstruction(w); });
  run('prices', () => updatePrices(w));
  run('pops', () => { updateLiteracy(w); updateQualifications(w); updateGrowth(w); migrate(w); for (const p of w.pops) p.incomeEma = p.incomeEma * 0.9 + p.lastIncome * 0.1; prunePops(w); syncEmployment(w); aggregateHouseholds(w); });
  w.tick++;
  if (w.tick % TICKS_PER_WEEK === 0) run('weekly(ai 등)', () => { mintMoney(w); spendBudget(w); for (const c of w.companies) payDividends(w, c); distributeInvestment(w); runAi(w); weeklyBanking(w); });
  run('metrics', () => recordMetrics(w));
}
const total = performance.now() - t0;
console.log(`하루 평균 ${(total / days).toFixed(2)}ms, pop ${w.pops.length}개, 건물 ${w.buildings.length}개`);
for (const [k, v] of Object.entries(t).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)} ${(v / days).toFixed(2)}ms (${Math.round(v / total * 100)}%)`);
