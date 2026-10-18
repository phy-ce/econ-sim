// AI 시장 전망과 실제 수급 비교 (상품별): 실제 수요·공급 평균, 전망 수요·공급, 전망 가격, 실제 가격, 생산 능력
import { GOOD_IDS, GOODS, createWorld, outputCapacity, step } from '../src';
import { marketOutlook } from '../src/outlook';
const seed = Number(process.argv[2] ?? 1), year = Number(process.argv[3] ?? 4);
const w = createWorld(seed, { withPlayer: false });
while (w.tick < year * 360) step(w);
const o = marketOutlook(w);
console.log('good'.padEnd(12) + 'D'.padStart(8) + 'S'.padStart(8) + 'sold'.padStart(8) + 'cap'.padStart(8) + 'oD'.padStart(8) + 'oS'.padStart(8) + 'oP×'.padStart(6) + 'P×'.padStart(6));
for (const g of GOOD_IDS) {
  let D = 0, S = 0, sold = 0, cap = 0, p = 0;
  for (const r of w.regions) { D += r.market[g].demandEma; S += r.market[g].supplyEma; sold += r.market[g].volumeEma; cap += outputCapacity(w, r.id, g); p += r.market[g].price / GOODS[g].basePrice / w.regions.length; }
  console.log(g.padEnd(12) + [D, S, sold, cap, o.demand[g], o.supply[g]].map((x) => Math.round(x).toString().padStart(8)).join('') + (o.price(g) / GOODS[g].basePrice).toFixed(2).padStart(6) + p.toFixed(2).padStart(6));
}
