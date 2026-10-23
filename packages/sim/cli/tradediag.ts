// 교역 진단: npx tsx cli/tradediag.ts [seed] [years]
// 해마다 한 줄 JSON: 하루 평균 교역 매입액(상인 주문 수량 × 그 지역 값, 운송 제외), 지역 간 값 차이(상품별 지역 값의 최대/최소 비, 기본가 가중 평균)
import { GOOD_IDS, GOODS } from '../src/data';
import { createWorld, step } from '../src/index';
import type { World } from '../src/types';

const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 20);
const w: World = createWorld(seed);

function dayBuy(w: World): number {
  let v = 0;
  for (const r of w.regions) for (const g of GOOD_IDS) {
    if (g === 'transport') continue;
    const mg = r.market[g];
    v += (mg.demandBy?.trader ?? 0) * mg.price;
  }
  return v;
}

/** 상품별 지역 값 최대/최소 비 (운송·썩는 상품 제외), 기본가 가중 평균 */
function priceGap(w: World): number {
  let s = 0, wt = 0;
  for (const g of GOOD_IDS) {
    if (GOODS[g].perishable) continue;
    const ps = w.regions.map((r) => r.market[g].price);
    const lo = Math.min(...ps), hi = Math.max(...ps);
    if (!(lo > 0)) continue;
    s += (hi / lo) * GOODS[g].basePrice; wt += GOODS[g].basePrice;
  }
  return wt > 0 ? s / wt : 1;
}

let sum = 0, n = 0;
const days = years * 360;
for (let d = 1; d <= days; d++) {
  step(w);
  sum += dayBuy(w); n++;
  if (d % 360 === 0) {
    const m = w.metrics[w.metrics.length - 1];
    let gdp = 0, pop = 0;
    if (m) for (const k of Object.values(m.kingdoms) as any[]) gdp += k.gdp ?? 0;
    for (const p of w.pops) pop += p.size;
    const posts = w.buildings.filter((b) => b.typeId === 'trading_post');
    const out: Record<string, unknown> = {
      seed, year: d / 360, tradeBuyDay: Math.round(sum / n), gap: +priceGap(w).toFixed(3), gdp: Math.round(gdp), pop: Math.round(pop),
      traderCash: Math.round(((w as any).traders?.cash ?? 0)),
      postLv: posts.reduce((a, b) => a + b.level, 0), postN: posts.length, postCash: Math.round(posts.reduce((a, b) => a + (b.cash ?? 0), 0)),
    };
    console.log(JSON.stringify(out));
    sum = 0; n = 0;
  }
}
