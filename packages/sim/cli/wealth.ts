// 1인당 부 추적: 연도별 직종 부·충족·1인당 소득, 지역 평균 부
import { POP_CLASSES, createWorld, regionAvgWealth, step } from '../src/index';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 10), every = Number(process.argv[4] ?? 180);
const w = createWorld(seed, { withPlayer: false });
const show0 = true;
for (let d = 1; d <= 360 * years; d++) {
  step(w);
  if (d % every) continue;
  const avg = w.regions.reduce((a, r) => a + regionAvgWealth(r), 0) / w.regions.length;
  const row = POP_CLASSES.map((s) => {
    let n = 0, wl = 0, f = 0, inc = 0, food = 0, sl = 0;
    for (const r of w.regions) { const h = r.households[s]; n += h.population; wl += h.wealth * h.population; sl += h.sol * h.population; f += h.fulfillment * h.population; inc += h.incomeEma; food += h.food * h.population; }
    return n > 0 ? `${s.slice(0, 4)} w${(wl / n).toFixed(1)} sol${(sl / n).toFixed(1)} f${(f / n).toFixed(2)} fd${(food / n).toFixed(2)} inc${(inc / n * 1000).toFixed(1)}` : `${s.slice(0, 4)} -`;
  }).join(' | ');
  console.log(`d${d} avg ${avg.toFixed(2)} | ${row}`);
}
