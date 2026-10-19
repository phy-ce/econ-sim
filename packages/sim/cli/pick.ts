import { BUILDING_TYPES, TICKS_PER_YEAR } from '../src/data';
import { availableMethods, canBuildType, companyById, constructionEstimate, createWorld, regionWages, roomFor, step } from '../src/index';
import { marketOutlook, valueMethod } from '../src/outlook';
import { laborAvailability } from '../src/ai';
const w = createWorld(1, { withPlayer: false });
for (let d = 1; d <= 120; d++) step(w);
const o = marketOutlook(w);
for (const id of [100, 3]) {
  const c = companyById(w, id)!;
  console.log(c.name, 'cash', c.cash.toFixed(0));
  for (const r of w.regions.filter((x) => x.kingdomId === c.kingdomId)) for (const t of BUILDING_TYPES) {
    if (t.id === 'builder' || !canBuildType(c, t) || roomFor(w, r.id, t.id) < 1) continue;
    const cost = constructionEstimate(w, c, t.id).cost;
    for (const m of availableMethods(c, t.id)) {
      const e = valueMethod(w, o, r, c, t.id, m, regionWages(w, r.id), 1);
      console.log(' ', r.name, t.id, 'cost', (cost / 1e6).toFixed(2) + 'M', 'profit/d', e.profit.toFixed(0), 'roi', ((e.profit * TICKS_PER_YEAR) / cost).toFixed(2), 'labor', laborAvailability(w, r, m, 1, c.state).toFixed(2));
    }
  }
}
