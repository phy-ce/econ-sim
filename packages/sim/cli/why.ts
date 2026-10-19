// 국가 공사 후보가 어디서 떨어지는지: 후보(지역×건물×방식×1레벨/20레벨)마다 손익·수익률·일손
import { BUILDING_TYPES, TICKS_PER_YEAR, availableMethods, canBuildType, constructionEstimate, createWorld, regionWages, roomFor, step } from '../src/index';
import { laborAvailability } from '../src/ai';
import { marketOutlook, valueMethod } from '../src/outlook';
const seed = Number(process.argv[2] ?? 1), year = Number(process.argv[3] ?? 5);
const w = createWorld(seed, { withPlayer: false });
for (let d = 1; d <= 360 * year; d++) step(w);
const o = marketOutlook(w);
for (const c of w.companies) {
  const rows: string[] = [];
  const tally = { profitNeg: 0, labor: 0, lowRoi: 0, ok: 0 };
  for (const r of w.regions.filter((x) => x.kingdomId === c.kingdomId)) for (const t of BUILDING_TYPES) {
    if (t.id === 'builder' || t.auto || !canBuildType(c, t) || roomFor(w, r.id, t.id) < 1) continue;
    const per = constructionEstimate(w, c, t.id).cost;
    for (const m of availableMethods(c, t.id)) {
      const e = valueMethod(w, o, r, c, t.id, m, regionWages(w, r.id), 1);
      const la = laborAvailability(w, r, m, 1);
      const roi = (e.profit * TICKS_PER_YEAR) / per;
      const why = e.profit <= 0 ? 'profitNeg' : la < 0.5 ? 'labor' : roi <= 0.4 ? 'lowRoi' : 'ok';
      tally[why]++;
      rows.push(`${r.id}:${m.id} p${e.profit.toFixed(0)} roi${roi.toFixed(2)} lab${la.toFixed(2)} ${why}`);
    }
  }
  console.log(`${c.name} ${JSON.stringify(tally)}`);
  console.log('   ' + rows.sort().join(' | '));
}
