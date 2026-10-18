import { companyById, createWorld, regionById, step } from '../src/index';
const w = createWorld(1, { withPlayer: false });
for (let d = 1; d <= 60; d++) step(w);
for (const b of w.buildings) if (b.typeId === 'admin' || b.typeId === 'builder') {
  const r = regionById(w, b.regionId);
  const pops = w.pops.filter((p) => p.regionId === r.id && p.prof !== 'peasant').map((p) => `${p.prof}@${p.work}:${p.size.toFixed(0)}`).join(' ');
  const q = w.pops.filter((p) => p.regionId === r.id).reduce((a, p) => a + (p.quals?.skilled ?? 0), 0);
  console.log(r.name, b.typeId, b.level, 'staff', b.last.staffing.toFixed(2), JSON.stringify(b.employed), 'unpaid', b.unpaid, 'skilledQuals', q.toFixed(0), 'wages', JSON.stringify(companyById(w, b.companyId)!.wages), pops);
}
