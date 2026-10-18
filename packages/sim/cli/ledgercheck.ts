// 회사별 주간 현금 변화와 지난주 손익·장부 비교: npx tsx cli/ledgercheck.ts [seed] [weeks]
import { createWorld, step } from '../src/index';
import { TICKS_PER_WEEK } from '../src/data';
const w = createWorld(Number(process.argv[2] ?? 1));
const weeks = Number(process.argv[3] ?? 30);
const k = (x: number) => (x / 1e3).toFixed(0) + 'k';
for (let wk = 1; wk <= weeks; wk++) {
  const start = new Map(w.companies.map((c) => [c.id, { cash: c.cash, debt: c.debt }]));
  for (let d = 0; d < TICKS_PER_WEEK; d++) step(w);
  if (wk % 10 !== 0) continue;
  console.log(`--- week ${wk}`);
  for (const c of w.companies) {
    const s = start.get(c.id)!;
    const dCash = c.cash - s.cash, dDebt = c.debt - s.debt;
    const L = c.lastLedger;
    const flows = Object.entries(L).filter(([, v]) => Math.abs(v) > 1).map(([kk, v]) => `${kk} ${k(v)}`).join(', ');
    console.log(`${c.name}${c.isPlayer ? '(P)' : ''} Δcash ${k(dCash)} profit ${k(c.lastWeekProfit)} diff ${k(dCash - c.lastWeekProfit)} Δdebt ${k(dDebt)} | ${flows}`);
  }
}
