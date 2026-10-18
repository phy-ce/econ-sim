// 단계별로 회사 현금 변화와 손익(weekProfit) 변화를 비교해 어긋나는 단계를 찾는다: npx tsx cli/phasecheck.ts [companyName]
import { createWorld, step } from '../src/index';
import { TICKS_PER_WEEK } from '../src/data';
import { chargeInterest, collectIncomeTax, distributeInvestment, doResearch, mintMoney, payDividends, spendBudget, weeklyBanking } from '../src/finance';
import { laborMarket, payWages } from '../src/labor';
import { clearMarkets, collectOrders, harvest, newBook, resetMarkets, updatePrices } from '../src/market';
import { advanceConstruction, produce, updateIdleOffices, updateSubsistence } from '../src/production';
import { runAi } from '../src/ai';
import type { World } from '../src/types';
const w = createWorld(1);
for (let d = 0; d < TICKS_PER_WEEK * 9; d++) step(w);
const name = process.argv[2] ?? '에스테라 왕실';
const c = w.companies.find((x) => x.name === name)!;
const acc: Record<string, [number, number]> = {};
const run = (label: string, f: () => void) => { const c0 = c.cash, p0 = c.weekProfit; f(); const a = (acc[label] ??= [0, 0]); a[0] += c.cash - c0; a[1] += c.weekProfit - p0; };
for (let d = 0; d < TICKS_PER_WEEK; d++) {
  run('subsistence', () => { updateSubsistence(w); updateIdleOffices(w); });
  run('interest', () => chargeInterest(w));
  run('research', () => doResearch(w));
  run('labor', () => laborMarket(w));
  run('reset', () => resetMarkets(w));
  run('wages', () => payWages(w));
  run('tax', () => collectIncomeTax(w));
  const book = newBook();
  run('harvest+orders', () => { harvest(w, book); collectOrders(w, book); });
  run('clear', () => clearMarkets(w, book));
  run('produce', () => produce(w));
  run('construction', () => advanceConstruction(w));
  run('prices', () => updatePrices(w));
  w.tick += 1;
  if (w.tick % TICKS_PER_WEEK === 0) {
    run('mint', () => mintMoney(w));
    run('budget', () => spendBudget(w));
    run('dividends', () => { for (const x of w.companies) payDividends(w, x); });
    run('invest', () => distributeInvestment(w));
    run('ai', () => runAi(w as World));
    run('banking', () => weeklyBanking(w));
  }
}
let tc = 0, tp = 0;
for (const [k, [dc, dp]] of Object.entries(acc)) { tc += dc; tp += dp; if (Math.abs(dc) > 1 || Math.abs(dp) > 1) console.log(`${k.padEnd(16)} Δcash ${(dc / 1e3).toFixed(0)}k Δprofit ${(dp / 1e3).toFixed(0)}k diff ${((dc - dp) / 1e3).toFixed(0)}k`); }
console.log(`합계 Δcash ${(tc / 1e3).toFixed(0)}k Δprofit ${(tp / 1e3).toFixed(0)}k`);
