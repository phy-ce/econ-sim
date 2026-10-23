// 교역 진단: npx tsx cli/tradediag.ts [seed] [years] ['<TUNE JSON>']
// 해마다 한 줄 JSON: 하루 평균 교역 매입액(무역소 주문 수량 × 그 지역 값, 운송 제외), 지역 간 값 차이(상품별 지역 값의 최대/최소 비, 기본가 가중 평균),
// 무역소 레벨·금고, 무역소 하루 장사 손익(tradePnlDay: 이어 있는 무역소의 금고 변화 + 회사로 넘긴 돈, 증설 완공 때 묶였던 돈이 들어오면 그만큼 크게 잡힌다)
import { GOOD_IDS, GOODS, TUNE } from '../src/data';
import { createWorld, step } from '../src/index';
import type { World } from '../src/types';

const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 20);
Object.assign(TUNE, JSON.parse(process.argv[4] ?? '{}'));
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

let sum = 0, n = 0, pnl = 0;
let prevCash = new Map<number, number>();
const days = years * 360;
for (let d = 1; d <= days; d++) {
  step(w);
  sum += dayBuy(w); n++;
  const now = new Map<number, number>();
  for (const b of w.buildings) if (b.typeId === 'trading_post') {
    now.set(b.id, b.cash ?? 0);
    const p0 = prevCash.get(b.id);
    if (p0 !== undefined) pnl += (b.cash ?? 0) - p0 + b.last.revenue;
  }
  prevCash = now;
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
      postRegions: new Set(posts.map((b) => b.regionId)).size,
      postMethods: posts.reduce((a, b) => { a[b.methodId] = (a[b.methodId] ?? 0) + b.level; return a; }, {} as Record<string, number>),
      // 지역 교역 기록 (이동평균): 산 주문액·잘린 주문액 합, 매입 가중 기대 이익률
      cutDay: Math.round(w.regions.reduce((a, r) => a + (r.trade?.cut ?? 0), 0)),
      margin: +(w.regions.reduce((a, r) => a + (r.trade?.margin ?? 0) * ((r.trade?.buy ?? 0) + (r.trade?.cut ?? 0)), 0) / Math.max(1, w.regions.reduce((a, r) => a + (r.trade?.buy ?? 0) + (r.trade?.cut ?? 0), 0))).toFixed(3),
      postProfitDay: Math.round(posts.reduce((a, b) => a + b.profitEma, 0)),
      tradePnlDay: Math.round(pnl / n),
    };
    console.log(JSON.stringify(out));
    sum = 0; n = 0; pnl = 0;
  }
}
