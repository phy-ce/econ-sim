// 하층 생활수준 진단: npx tsx cli/soldiag.ts '<TUNE JSON>' [seed] [years]
// 직종 × 고용/실업별 1인당 하루: 현금 소득, 현물 가치, 인두세·소득세, 지금 부 단계 생활비, 부 5 생활비, 그리고 부·충족률·생활수준
import { GOODS, TUNE } from '../src/data';
import { createWorld, step } from '../src/index';
import { basketCostAt } from '../src/market';
import { kingdomOf, kingdomById } from '../src/kingdoms';
import { companyById } from '../src/economy';
import { taxDue } from '../src/finance';

const over = JSON.parse(process.argv[2] ?? '{}');
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 20);
Object.assign(TUNE, over);
const w = createWorld(seed, { withPlayer: false });
const at = new Set([30, 360, 720, 1440, 1800, 3600, 5040, 7200].filter((d) => d <= years * 360));
const f = (x: number) => x.toFixed(2);
const report = () => {
  console.log(`\n=== ${(w.tick / 360).toFixed(1)}년 | 곡물 ×${f(w.regions.reduce((a, r) => a + r.market.grain.price, 0) / w.regions.length / GOODS.grain.basePrice)}`);
  console.log('직종/상태 인구(만) | 부 충족 SoL 식량 | 1인당: 현금소득 현물 세금 저축 | 생활비: 지금부 부3 부5 | 임금(노동자1명)');
  for (const prof of ['peasant', 'unskilled', 'skilled'] as const) for (const job of [true, false]) {
    const ps = w.pops.filter((p) => p.prof === prof && (p.work !== 0) === job && p.size > 0);
    const n = ps.reduce((a, p) => a + p.size, 0);
    if (n < 1000) continue;
    let wealth = 0, ful = 0, sol = 0, food = 0, cash = 0, kind = 0, tax = 0, sav = 0, cCur = 0, c3 = 0, c5 = 0, wage = 0;
    for (const p of ps) {
      const r = w.regions.find((x) => x.id === p.regionId)!;
      const k = kingdomById(w, kingdomOf(w, p.regionId));
      wealth += p.wealth * p.size; ful += p.fulfillment * p.size; sol += p.sol * p.size; food += p.food * p.size;
      cash += p.incomeEma; sav += p.savings;
      for (const [g, q] of Object.entries(p.inKind)) kind += (q ?? 0) * r.market[g as keyof typeof r.market].price;
      tax += taxDue(w, p) * (k.taxRatio ?? 1);
      cCur += basketCostAt(r, p.size, p.wealth); c3 += basketCostAt(r, p.size, 3); c5 += basketCostAt(r, p.size, 5);
      const b = w.buildings.find((x) => x.id === p.work);
      const c = b ? companyById(w, b.companyId) : undefined;
      if (c && prof !== 'peasant') wage += (c.wages[prof] ?? 0) * p.size;
    }
    console.log(`${prof}/${job ? '고용' : '실업'} ${(n / 1e4).toFixed(0)} | ${f(wealth / n)} ${f(ful / n)} ${f(sol / n)} ${f(food / n)} | ${f(cash / n)} ${f(kind / n)} ${f(tax / n)} ${f(sav / n)} | ${f(cCur / n)} ${f(c3 / n)} ${f(c5 / n)} | ${f(wage / n)}`);
  }
};
for (let d = 1; d <= years * 360; d++) { step(w); if (at.has(w.tick)) report(); }
