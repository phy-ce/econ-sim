// 행정청 점검: 왕국별 걷어야 할 세금, 한도, 행정청 레벨·방식·충원
import { createWorld, step } from '../src';
const w = createWorld(Number(process.argv[2] ?? 1), { withPlayer: false });
for (const y of process.argv.slice(3).map(Number)) {
  while (w.tick < y * 360) step(w);
  console.log(`== y${y}`);
  for (const k of w.kingdoms) {
    const adm = w.buildings.filter((b) => b.typeId === 'admin' && w.regions.find((r) => r.id === b.regionId)!.kingdomId === k.id);
    console.log(`  ${k.name} due ${Math.round(k.taxDue ?? 0)} cap ${Math.round(k.taxCapacity ?? 0)} | ${adm.map((b) => `${b.methodId} lv${b.level} crew${(b.crew ?? 0).toFixed(2)} emp ${Object.entries(b.employed).filter(([, v]) => v > 0).map(([s, v]) => `${s}${Math.round(v)}`).join(',')}`).join(' ; ')}`);
  }
}
