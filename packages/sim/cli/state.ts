import { companyById, createWorld, regionById, step } from '../src/index';
const days = Number(process.argv[2] ?? 360);
const w = createWorld(1, { withPlayer: false });
for (let d = 1; d <= days; d++) step(w);
for (const k of w.kingdoms) {
  const ids = [k.governmentId, ...k.privateIds];
  console.log(k.nameEn, 'buildings:', w.buildings.filter((b) => ids.includes(b.companyId)).map((b) => `${companyById(w, b.companyId)!.state ? 'G' : 'P'}:${b.typeId}${b.level}@${regionById(w, b.regionId).id} st${b.last.staffing.toFixed(2)} pf${b.profitEma.toFixed(0)}`).join(' '));
  console.log('   queue:', w.constructions.filter((x) => ids.includes(x.companyId)).map((x) => `${companyById(w, x.companyId)!.state ? 'G' : 'P'}:${x.typeId}x${x.levels ?? 1} ${x.points}/${x.required}`).join(' '));
}
const r = w.regions[0]; console.log(Object.entries(r.market).map(([g, m]) => `${g} ${m.price}`).join(', '));
