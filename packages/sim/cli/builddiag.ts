// 건물이 어느 길로 늘어나는가: npx tsx cli/builddiag.ts '<TUNE JSON>' [seed] [years] [good]
// AI 판단(ai.ts aiTrace)이 공사를 넣고·헐고·방식을 바꿀 때마다 길별로 레벨을 센다 (왕실 S / 민간 P).
// 길: pick 보통 후보, loss 손해 후보, govInputs 왕실 원료 확보, office 사무소, shrink 철거, swap 땅 바꾸기 철거, switchIn·switchOut 방식 바꾸기.
// 해마다 한 줄 (good, 기본 fiber): 그 상품을 만드는 건물에 대해
//   lv 연말 레벨 S/P, 길별 그해 레벨, S/D 연말 대륙 공급 ÷ 수요 (이동평균),
//   pickGlut: pick 으로 넣은 레벨 중 넣을 때 (지금 수요 + 공사 중 투입) ÷ (공급 + 공사 중 산출 + 이 공사의 산출) < 1 이었던 레벨
//   (잠재 수요를 빼면 다 팔리지 않는 양을 보고 지은 것)
// 마지막에 30년 합계, 그리고 연말 공급 ÷ 수요 > 1.5 인 상품마다 그 상품을 만드는 건물의 길별 합계 (해마다 그해 넘친 상품만 더한다).
// PROBE=1: 그 상품 건물의 pick 마다 한 줄 (지역, 레벨, 전망 가격 전·후 ÷ 기본가, 현지 가격 ÷ 기본가, 대륙 수요·공급·잠재, 1레벨 장기 손익 항목, 가동률, 회사 임금)
// 시뮬레이션 상태를 바꾸지 않고 무작위 수열을 쓰지 않는다 (같은 시드면 결과가 sweep 과 같다)
import { aiTrace } from '../src/ai';
import { BUILDING_BY_ID, GOOD_IDS, GOODS, TICKS_PER_YEAR, TUNE, getMethod } from '../src/data';
import { createWorld, step } from '../src/index';
import { regionById } from '../src/economy';
import { valueMethod } from '../src/outlook';
import type { GoodId } from '../src/types';

Object.assign(TUNE, JSON.parse(process.argv[2] ?? '{}'));
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 30);
const focus = (process.argv[5] ?? 'fiber') as GoodId;
const w = createWorld(seed, { withPlayer: false });
const PATHS = ['pick', 'loss', 'govInputs', 'switchIn', 'switchOut', 'shrink', 'swap'] as const;
const makes = (typeId: string, g: GoodId) => BUILDING_BY_ID[typeId].methods.some((m) => (m.outputs[g] ?? 0) > 0);

type Acc = Record<string, number>;
let year: Record<GoodId, Acc> = {} as Record<GoodId, Acc>;
const total: Acc = {};
const glutTotal: Record<string, Acc> = {};
const add = (a: Acc, k: string, v: number) => { a[k] = (a[k] ?? 0) + v; };
const reset = () => { year = {} as Record<GoodId, Acc>; for (const g of GOOD_IDS) year[g] = {}; };
reset();

let yNow = 1;
aiTrace.on = (_w, c, path, typeId, methodId, levels, o, regionId) => {
  if (process.env.PROBE && path === 'pick' && o && regionId != null && makes(typeId, focus)) {
    const m = getMethod(typeId, methodId), r = regionById(w, regionId), out = (m.outputs[focus] ?? 0) * levels, base = GOODS[focus].basePrice;
    const v = valueMethod(w, o, r, c, typeId, m, levels);
    const f = (x: number) => x.toFixed(2), k = (x: number) => Math.round(x / 1000);
    console.log(`  probe y${yNow} ${c.state ? 'S' : 'P'} r${regionId} ${methodId} x${levels} | p ${f(o.price(focus) / base)}->${f(o.price(focus, out) / base)} local ${f(r.market[focus].price / base)} | D ${k(o.demand[focus])}k S ${k(o.supply[focus])}k L ${k(o.latent[focus])}k out ${k(out)}k | rev ${Math.round(v.revenue)} inp ${Math.round(v.inputCost)} wage ${Math.round(v.wageCost)} profit ${Math.round(v.profit)} u ${v.utilization} | wages ${Object.values(c.wages).map((x) => f(x)).join('/')}`);
  }
  const key = `${path}${c.state ? 'S' : 'P'}`;
  const m = getMethod(typeId, methodId);
  for (const g of GOOD_IDS) {
    if (!makes(typeId, g)) continue;
    add(year[g], key, levels);
    // 보통 후보: 잠재 수요를 빼면 이 산출이 다 팔렸을까 (공급에 이 공사의 산출을 더해서)
    if (path === 'pick' && o && (m.outputs[g] ?? 0) > 0) {
      const out = (m.outputs[g] ?? 0) * levels;
      if (o.demand[g] < o.supply[g] + out) add(year[g], 'pickGlut', levels);
      if (o.demand[g] + o.latent[g] >= o.supply[g] + out && o.demand[g] < o.supply[g] + out) add(year[g], 'pickLatent', levels);
    }
  }
};

const cols = [...PATHS.flatMap((p) => [`${p}S`, `${p}P`]), 'pickGlut', 'pickLatent'];
console.log(`seed ${seed} good ${focus} | year lvS lvP S/D | ${cols.join(' ')}`);
for (let y = 1; y <= years; y++) {
  yNow = y;
  for (let t = 0; t < TICKS_PER_YEAR; t++) step(w);
  let lvS = 0, lvP = 0;
  for (const b of w.buildings) if (makes(b.typeId, focus)) { if (b.stateOwned) lvS += b.level; else lvP += b.level; }
  const sd = (g: GoodId) => {
    let s = 0, d = 0;
    for (const r of w.regions) { s += r.market[g].supplyEma; d += r.market[g].demandEma; }
    return d > 1e-6 ? s / d : 0;
  };
  const a = year[focus];
  console.log(`${y} ${lvS} ${lvP} ${sd(focus).toFixed(2)} | ${cols.map((k) => Math.round(a[k] ?? 0)).join(' ')}`);
  for (const k of cols) add(total, k, a[k] ?? 0);
  for (const g of GOOD_IDS) {
    if (sd(g) <= 1.5) continue;
    glutTotal[g] ??= {};
    add(glutTotal[g], 'years', 1);
    for (const k of cols) add(glutTotal[g], k, year[g][k] ?? 0);
  }
  reset();
}
console.log(`total ${focus} | ${cols.map((k) => `${k}=${Math.round(total[k] ?? 0)}`).join(' ')}`);
for (const [g, a] of Object.entries(glutTotal)) console.log(`glut ${g} (${a.years}y) | ${cols.filter((k) => a[k]).map((k) => `${k}=${Math.round(a[k])}`).join(' ')}`);
