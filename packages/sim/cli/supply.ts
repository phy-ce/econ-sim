// 상품 공급원별 하루 공급과 판매: npx tsx cli/supply.ts [good] [seed] [years]
import { createWorld, step } from '../src/index';
import type { GoodId } from '../src/types';
const g = (process.argv[2] ?? 'grain') as GoodId, seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 20);
const w = createWorld(seed, { withPlayer: false });
for (let d = 1; d <= years * 360; d++) {
  step(w);
  if (d % 1800 !== 0) continue;
  const by: Record<string, number> = {}, dby: Record<string, number> = {};
  let s = 0, dm = 0, sold = 0;
  for (const r of w.regions) {
    const m = r.market[g];
    s += m.supplyEma; dm += m.demandEma; sold += m.volumeEma;
    for (const [k, v] of Object.entries(m.supplyByEma ?? {})) by[k] = (by[k] ?? 0) + (v as number);
    for (const [k, v] of Object.entries(m.demandByEma ?? {})) dby[k] = (dby[k] ?? 0) + (v as number);
  }
  const fmt = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${Math.round(v / 1e3)}k`).join(', ');
  console.log(`y${d / 360} ${g} supply ${Math.round(s / 1e3)}k demand ${Math.round(dm / 1e3)}k sold ${Math.round(sold / 1e3)}k\n  공급: ${fmt(by)}\n  수요: ${fmt(dby)}`);
}
