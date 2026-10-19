// AI 시장 전망과 실제 가격 비교: npx tsx cli/outlookchk.ts [seed] [years]
import { createWorld, step } from '../src/index';
import { GOODS } from '../src/data';
import { marketOutlook, valueMethod } from '../src/outlook';
import { getMethod } from '../src/data';
import { regionWages } from '../src/economy';
const w = createWorld(Number(process.argv[2] ?? 1), { withPlayer: false });
for (let d = 1; d <= Number(process.argv[3] ?? 15) * 360; d++) {
  step(w);
  if (d % 1800 !== 0) continue;
  const o = marketOutlook(w);
  for (const g of ['grain', 'food', 'timber', 'fuel'] as const) {
    let p = 0; for (const r of w.regions) p += r.market[g].price;
    console.log(`y${d / 360} ${g} 실제 ×${(p / w.regions.length / GOODS[g].basePrice).toFixed(2)} 전망 ×${(o.price(g, 0, 0, true) / GOODS[g].basePrice).toFixed(2)} | 전망 D ${Math.round(o.demand[g] / 1e3)}k latent ${Math.round(o.latent[g] / 1e3)}k S ${Math.round(o.supply[g] / 1e3)}k`);
  }
  const c = w.companies.find((x) => x.state)!;
  const r = w.regions.find((x) => x.kingdomId === c.kingdomId)!;
  const v = valueMethod(w, o, r, c, 'farm', getMethod('farm', 'farm_basic'), regionWages(w, r.id), 5);
  console.log(`  farm 5lv valuation`, JSON.stringify(v));
}
