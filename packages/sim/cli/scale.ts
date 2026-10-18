// 상품별 (30일 평균, 하루): 실제 판매량, 건물 산출, 소작(지대·잉여) 공급, 수입·수출, 가격/기본가, 건물 1레벨 산출이 판매량의 몇 %인지
import { BUILDING_TYPES, GOOD_IDS, GOODS, createWorld, step } from '../src';
const w = createWorld(Number(process.argv[2] ?? 1), { withPlayer: false });
const perLevel: Record<string, number> = {};
for (const t of BUILDING_TYPES) for (const m of t.methods) for (const g of GOOD_IDS) if (m.outputs[g] && !perLevel[g]) perLevel[g] = m.outputs[g]!;
for (const y of [2, 6, 12]) {
  const acc: Record<string, { sold: number; prod: number; sub: number; imp: number; exp: number; pv: number }> = {};
  for (const g of GOOD_IDS) acc[g] = { sold: 0, prod: 0, sub: 0, imp: 0, exp: 0, pv: 0 };
  while (w.tick < y * 360 - 30) step(w);
  for (let d = 0; d < 30; d++) {
    step(w);
    for (const g of GOOD_IDS) {
      const a = acc[g];
      for (const r of w.regions) {
        const m = r.market[g];
        a.sold += m.sold; a.pv += m.price * m.sold;
        for (const [k, v] of Object.entries(m.supplyBy ?? {})) { if (k.startsWith('bld:')) a.prod += v; if (k === 'subsistence') a.sub += v; }
      }
      
    }
  }
  console.log(`== y${y}`);
  console.log('good'.padEnd(12) + 'sold'.padStart(9) + 'bld'.padStart(9) + 'subs'.padStart(9) + 'imp'.padStart(8) + 'exp'.padStart(8) + '  price×  level/sold');
  for (const g of GOOD_IDS) {
    const a = acc[g];
    const f = (x: number) => Math.round(x / 30).toString().padStart(9);
    const p = a.sold > 0 ? a.pv / a.sold / GOODS[g].basePrice : 0;
    const share = a.sold > 0 && perLevel[g] ? `${((perLevel[g] / (a.sold / 30)) * 100).toFixed(2)}%` : '-';
    console.log(g.padEnd(12) + f(a.sold) + f(a.prod) + f(a.sub) + Math.round(a.imp / 30).toString().padStart(8) + Math.round(a.exp / 30).toString().padStart(8) + `  ${p.toFixed(2)}`.padStart(8) + share.padStart(12));
  }
}
