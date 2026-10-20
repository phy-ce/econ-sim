// 부에 따른 필요 묶음을 노동력(일꾼-일) 기준으로: npx tsx cli/laborbasket.ts
// 필요 묶음을 노동력(일꾼-일) 기준으로: 상품 1개에 들어간 노동 = 직접 노동 + 원료에 들어간 노동 (기본 방식 기준)
import { BUILDING_TYPES, GOODS, GOOD_IDS, NEEDS, needsAt, rawMax, SUBSISTENCE, CONSUMPTION_PER_CAPITA } from '../src/index';
type G = string;
// 상품마다 기본 방식 하나: 기술이 없거나 가장 먼저 나오는 방식 중 그 상품을 가장 많이 내는 것
const pick: Record<G, { b: string; m: any }> = {};
for (const t of BUILDING_TYPES) {
  if (t.id === 'subsistence') continue;
  for (const m of t.methods) {
    for (const [g, q] of Object.entries(m.outputs ?? {})) {
      if (!q) continue;
      const cur = pick[g];
      const better = !cur || (!m.tech && cur.m.tech) || ((!m.tech) === (!cur.m.tech) && (q as number) > (cur.m.outputs[g] ?? 0));
      if (better) pick[g] = { b: t.id, m };
    }
  }
}
const workersOf = (m: any) => Object.values(m.workers ?? {}).reduce((a: number, b: any) => a + (b as number), 0) as number;
const L: Record<G, number> = {};
for (let it = 0; it < 50; it++) {
  for (const g of GOOD_IDS) {
    const p = pick[g];
    if (!p) continue;
    const out = p.m.outputs as Record<G, number>;
    // 여러 상품을 내면 노동을 값(기본가) 비율로 나눈다
    const valOut = Object.entries(out).reduce((a, [h, q]) => a + q * GOODS[h as keyof typeof GOODS].basePrice, 0);
    const inLab = Object.entries(p.m.inputs ?? {}).reduce((a, [h, q]) => a + (q as number) * (L[h] ?? 0), 0);
    const share = (out[g] * GOODS[g as keyof typeof GOODS].basePrice) / valOut;
    L[g] = ((workersOf(p.m) + inLab) * share) / out[g];
  }
}
// 소작지 (값 비율로 나눔): 일꾼 1명이 하루에 내는 산출
const sub = SUBSISTENCE as any;
const subOut: Record<G, number> = sub.output;
const subVal = Object.entries(subOut).reduce((a, [h, q]) => a + q * GOODS[h as keyof typeof GOODS].basePrice, 0);
const Lsub: Record<G, number> = {};
for (const [h, q] of Object.entries(subOut)) Lsub[h] = (GOODS[h as keyof typeof GOODS].basePrice * q / subVal) / q;
console.log('good | made by (base method) | labour-days per unit | per 1 value at base price | tenant farm');
for (const g of GOOD_IDS) console.log(`${g} | ${pick[g]?.b ?? '-'}/${pick[g]?.m.id ?? '-'} | ${(L[g] ?? NaN).toFixed(4)} | ${((L[g] ?? NaN) / GOODS[g].basePrice).toFixed(4)} | ${Lsub[g] ? Lsub[g].toFixed(4) : ''}`);
// 필요 묶음: 원자재 상한(rawMax) 안에서는 원자재, 나머지는 가공품. 상한 없는 선택지는 기본가에서 반반
function basketLabour(W: number, rawFrom: 'farm' | 'tenant') {
  const need = needsAt(W) as Record<string, number>;
  let lab = 0; const by: Record<string, number> = {};
  for (const n of NEEDS) {
    const v = need[n.id]; if (!(v > 0)) continue;
    let l = 0; const opts = n.options;
    const capped = opts.filter((o: any) => o.max != null);
    if (opts.length === 1) l = v / GOODS[opts[0].good].basePrice * lab1(opts[0].good, rawFrom);
    else if (capped.length) {
      const raw = capped[0], rest = opts.filter((o: any) => o !== raw);
      const share = rawMax(raw.max, W);
      l = v * share / GOODS[raw.good].basePrice * lab1(raw.good, rawFrom) + rest.reduce((a: number, o: (typeof opts)[number]) => a + v * (1 - share) / rest.length / GOODS[o.good].basePrice * lab1(o.good, rawFrom), 0);
    } else l = opts.reduce((a: number, o: (typeof opts)[number]) => a + v / opts.length / GOODS[o.good].basePrice * lab1(o.good, rawFrom), 0);
    by[n.id] = l; lab += l;
  }
  return { lab, by };
}
function lab1(g: G, rawFrom: string) { return rawFrom === 'tenant' && Lsub[g] ? Lsub[g] : L[g]; }
console.log('\nW | basket value | labour-days per consumption unit (farm raw / tenant raw) | per person | x of W=1 | food+meat labour share');
const base = basketLabour(1, 'farm').lab;
for (const W of [1, 3, 5, 8, 10, 15, 20, 30, 40, 50]) {
  const v = Object.values(needsAt(W) as Record<string, number>).reduce((a, b) => a + b, 0);
  const f = basketLabour(W, 'farm'), t = basketLabour(W, 'tenant');
  const foodL = (f.by.nourishment ?? 0) + (f.by.meat ?? 0);
  console.log(`${W} | ${v.toFixed(2)} | ${f.lab.toFixed(3)} / ${t.lab.toFixed(3)} | ${(f.lab * CONSUMPTION_PER_CAPITA).toFixed(3)} | ${(f.lab / base).toFixed(1)} | ${(foodL / f.lab * 100).toFixed(0)}%`);
}
console.log('\nneed breakdown (labour-days per consumption unit, farm raw):');
for (const W of [3, 10, 30]) console.log(W, JSON.stringify(Object.fromEntries(Object.entries(basketLabour(W, 'farm').by).map(([k, x]) => [k, +x.toFixed(3)]))));
