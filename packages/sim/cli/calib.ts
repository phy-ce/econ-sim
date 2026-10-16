// 상품별 왕국 가격(거래량 가중)/기본가, 공급/수요 비율: 연도별, 시드별
import { createWorld, step, GOOD_IDS, GOODS } from '../src';
const years = [1, 3, 5, 8, 12];
const seeds = (process.argv[2] ?? '1,2').split(',').map(Number);
const acc: Record<string, number[][]> = {};
for (const seed of seeds) {
  const w = createWorld(seed, { withPlayer: false });
  for (const y of years) {
    while (w.tick < y * 360) step(w);
    for (const g of GOOD_IDS) {
      let pv = 0, vol = 0, d = 0, s = 0;
      for (const r of w.regions) { const m = r.market[g]; const v = m.demandEma + m.supplyEma + 1e-6; pv += m.price * v; vol += v; d += m.demandEma; s += m.supplyEma; }
      (acc[g] ??= []).push([pv / vol / GOODS[g].basePrice, s / Math.max(1, d), d]);
    }
  }
}
console.log('good'.padEnd(12) + years.map((y) => `y${y}`.padStart(16)).join(''));
for (const g of GOOD_IDS) {
  const row = years.map((_, i) => {
    const xs = seeds.map((_, k) => acc[g][k * years.length + i]);
    const p = xs.reduce((a, x) => a + x[0], 0) / xs.length, sd = xs.reduce((a, x) => a + x[1], 0) / xs.length, d = xs.reduce((a, x) => a + x[2], 0) / xs.length;
    return `${p.toFixed(2)}×/${sd.toFixed(1)}/${d >= 1e4 ? (d / 1e4).toFixed(0) + '만' : Math.round(d)}`.padStart(16);
  });
  console.log(g.padEnd(12) + row.join(''));
}
console.log('(가격/기본가 × / 공급÷수요 / 하루 수요)');
