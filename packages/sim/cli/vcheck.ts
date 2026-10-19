// 판단 점검: 돌아가는 건물의 실제 레벨당 손익 vs 같은 방식 1레벨 신규 예측
import { BUILDING_BY_ID, GOOD_IDS, createWorld, efficiency, getMethod, regionById, step, companyById } from '../src/index';
import { marketOutlook, valueMethod } from '../src/outlook';
const w = createWorld(Number(process.argv[2] ?? 1), { withPlayer: false });
for (let d = 1; d <= 360 * Number(process.argv[3] ?? 5); d++) step(w);
const o = marketOutlook(w);
const seen = new Set<string>();
for (const b of [...w.buildings].sort((a, b2) => b2.level - a.level)) {
  if (BUILDING_BY_ID[b.typeId].auto || !b.active || seen.has(b.methodId)) continue;
  seen.add(b.methodId);
  const c = companyById(w, b.companyId)!, r = regionById(w, b.regionId), m = getMethod(b.typeId, b.methodId);
  const run = b.level * b.utilization * (b.crew100 !== undefined ? b.crew100 / 100 : 1);
  const L = b.level;
  const v = valueMethod(w, o, r, c, b.typeId, m, 1);
  const goods = GOOD_IDS.filter((g) => m.outputs[g] || m.inputs[g]).map((g) => `${g}${m.outputs[g] ? '+' : '-'} p${r.market[g].price.toFixed(1)} oP${o.price(g).toFixed(1)} D${Math.round(o.demand[g])} S${Math.round(o.supply[g])} lD${Math.round(r.market[g].demandEma)}`).join(' ; ');
  console.log(`${b.methodId}@${r.id} ${c.state ? 'S' : 'P'} lv${L} run${run.toFixed(0)} eff${efficiency(b).toFixed(2)} | 실제/lv rev ${(b.last.revenue / L).toFixed(1)} in ${(b.last.inputCost / L).toFixed(1)} wage ${(b.last.wageCost / L).toFixed(1)} pEma ${(b.profitEma / L).toFixed(1)} | 예측 rev ${v.revenue.toFixed(1)} in ${v.inputCost.toFixed(1)} wage ${v.wageCost.toFixed(1)} u${v.utilization}`);
  console.log('    ' + goods);
}
