// 상품별: 실제 판매량(=소비+투입 체결), 건물 생산량, 소작농 판매, 수입·수출, 가격/기본가, 건물 1개 산출이 판매량의 몇 %인지
import { createWorld, step, GOOD_IDS, GOODS, BUILDING_TYPES } from '../src';
const w = createWorld(Number(process.argv[2] ?? 1), { withPlayer: false });
const perBuilding: Record<string, number> = {};
for (const t of BUILDING_TYPES) for (const m of t.methods) if (!m.tech || ['milling', 'charcoal', 'spinning', 'bloomery', 'wagonway', 'guilds'].includes(m.tech))
  for (const g of GOOD_IDS) if (m.outputs[g] && !perBuilding[g]) perBuilding[g] = m.outputs[g]!;
for (const y of [2, 6, 12]) {
  const acc: Record<string, { sold: number; prod: number; sub: number; imp: number; exp: number; pv: number; v: number }> = {};
  for (const g of GOOD_IDS) acc[g] = { sold: 0, prod: 0, sub: 0, imp: 0, exp: 0, pv: 0, v: 0 };
  const start = y * 360 - 30;
  while (w.tick < start) step(w);
  for (let d = 0; d < 30; d++) {
    step(w);
    for (const g of GOOD_IDS) {
      const a = acc[g];
      for (const r of w.regions) {
        const m = r.market[g];
        a.sold += m.sold ?? 0;
        for (const [k, v] of Object.entries(m.supplyBy ?? {})) { if (k.startsWith('bld:')) a.prod += v; if (k === 'subsistence') a.sub += v; }
        a.pv += m.price * (m.sold ?? 0); a.v += m.sold ?? 0;
      }
      a.imp += w.offworld.imports[g] ?? 0; a.exp += w.offworld.exports[g] ?? 0;
    }
  }
  console.log(`== y${y} (30일 평균, 하루)`);
  console.log('상품'.padEnd(12) + '판매'.padStart(9) + '건물공급'.padStart(9) + '소작농'.padStart(9) + '수입'.padStart(8) + '수출'.padStart(8) + '  가격×  건물1개/판매' + '판매액ƒ'.padStart(11));
  for (const g of GOOD_IDS) {
    const a = acc[g]; const n = (x: number) => (Math.abs(x) >= 100 ? Math.round(x) : +x.toFixed(1)).toString(); const f = (x: number) => n(x / 30).padStart(9);
    const p = a.v > 0 ? a.pv / a.v / GOODS[g].basePrice : 0;
    const share = a.sold > 0 && perBuilding[g] ? (perBuilding[g] / (a.sold / 30) * 100).toFixed(1) + '%' : '-';
    console.log(g.padEnd(12) + f(a.sold) + f(a.prod) + f(a.sub) + n(a.imp / 30).padStart(8) + n(a.exp / 30).padStart(8) + `  ${p.toFixed(2)}`.padStart(7) + `  ${share}`.padStart(10) + Math.round(a.pv / 30).toString().padStart(11));
  }
}
