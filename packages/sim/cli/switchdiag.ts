// 방식 바꾸기 진단: npx tsx cli/switchdiag.ts '<TUNE JSON>' [seed] [years]  (bash cli/fast.sh switchdiag.ts ... 로도)
// 해마다 한 줄 JSON: sw 그해 방식 바꾸기 수, back 26주 안에 이전 방식으로 되돌아간 수, low 바꾼 뒤 26주에 충원율 0.5 미만이던 수,
// tier 레벨 합 (건물 종류 안의 방식 순서 1·2·3, 사무소·학교·행정청·소유 건물 빼고), tw 공구 공방 레벨, iron 철광 레벨,
// 상품(tools·metal·fuel)마다 [대륙 수요 EMA, 공급 EMA, 잠재 수요(marketOutlook)]
import { BUILDING_BY_ID, TICKS_PER_WEEK, TICKS_PER_YEAR, TUNE, getMethod } from '../src/data';
import { createWorld, step } from '../src/index';
import { marketOutlook } from '../src/outlook';
import type { GoodId } from '../src/types';

const over = JSON.parse(process.argv[2] ?? '{}');
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 10);
Object.assign(TUNE, over);
const w = createWorld(seed, { withPlayer: false });

const GOODS_SHOWN: GoodId[] = ['tools', 'metal', 'fuel'];
const lastMethod = new Map<number, string>();
const history = new Map<number, { tick: number; from: string }[]>();
const pending: { id: number; tick: number }[] = [];
let sw = 0, back = 0, low = 0;
const shown = new Map<string, number>();
const r1 = (x: number) => Math.round(x);

for (let t = 1; t <= years * TICKS_PER_YEAR; t++) {
  step(w);
  for (const b of w.buildings) {
    const prev = lastMethod.get(b.id);
    if (prev !== undefined && prev !== b.methodId) {
      sw++;
      if (process.env.ALL) console.log(`  d${w.tick} ${b.id} ${b.typeId} r${b.regionId} c${b.companyId} L${b.level} ${prev}->${b.methodId} st${b.last.staffing.toFixed(2)} fill${b.last.inputFill.toFixed(2)}`);
      const h = history.get(b.id) ?? [];
      if (h.some((x) => x.from === b.methodId && w.tick - x.tick <= 26 * TICKS_PER_WEEK)) {
        back++;
        if (process.env.SHOW) { const k = `${b.typeId} ${prev}->${b.methodId}`; shown.set(k, (shown.get(k) ?? 0) + 1); }
      }
      h.push({ tick: w.tick, from: prev });
      history.set(b.id, h);
      pending.push({ id: b.id, tick: w.tick });
    }
    lastMethod.set(b.id, b.methodId);
  }
  for (let i = pending.length - 1; i >= 0; i--) {
    if (w.tick - pending[i].tick < 26 * TICKS_PER_WEEK) continue;
    const b = w.buildings.find((x) => x.id === pending[i].id);
    if (b && b.last.staffing < 0.5) low++;
    pending.splice(i, 1);
  }
  if (t % TICKS_PER_YEAR !== 0) continue;
  const tier = [0, 0, 0, 0];
  let tw = 0, iron = 0;
  for (const b of w.buildings) {
    const def = BUILDING_BY_ID[b.typeId];
    const m = getMethod(b.typeId, b.methodId);
    if (def.auto || def.ownership || m.construction || m.seats || m.taxCapacity) continue;
    const ladder = def.methods.filter((x) => !x.construction && !x.seats && !x.taxCapacity);
    tier[Math.min(3, ladder.indexOf(m))] += b.level;
    if (b.typeId === 'workshop') tw += b.level;
    if (b.typeId === 'mine') iron += b.level;
  }
  const o = marketOutlook(w);
  const goods: Record<string, number[]> = {};
  for (const g of GOODS_SHOWN) {
    let d = 0, s = 0;
    for (const r of w.regions) { d += r.market[g].demandEma; s += r.market[g].supplyEma; }
    goods[g] = [r1(d), r1(s), r1(o.latent[g])];
  }
  console.log(JSON.stringify({ year: t / TICKS_PER_YEAR, sw, back, low, tier: tier.slice(0, 3), tw, iron, ...goods }));
  if (process.env.SHOW) { console.log(JSON.stringify(Object.fromEntries(shown))); shown.clear(); }
  sw = 0; back = 0; low = 0;
}
