// 건축사무소 레벨과 부지 사용: npx tsx cli/officeland.ts [seed] [years]
import { createWorld, step } from '../src/index';
import { BUILDING_BY_ID } from '../src/data';
const w = createWorld(Number(process.argv[2] ?? 1), { withPlayer: false });
for (let d = 1; d <= Number(process.argv[3] ?? 20) * 360; d++) {
  step(w);
  if (d % 1800 !== 0) continue;
  for (const k of w.kingdoms) {
    const rs = w.regions.filter((r) => r.kingdomId === k.id);
    const plot = rs.reduce((a, r) => a + r.land.plot, 0);
    const lv = (pred: (t: string) => boolean) => w.buildings.filter((b) => rs.some((r) => r.id === b.regionId) && pred(b.typeId)).reduce((a, b) => a + b.level, 0);
    const office = lv((t) => t === 'builder'), admin = lv((t) => t === 'admin'), plotUsed = lv((t) => BUILDING_BY_ID[t].land === 'plot' && !BUILDING_BY_ID[t].auto);
    const q = w.constructions.filter((c) => w.companies.find((x) => x.id === c.companyId)?.kingdomId === k.id).reduce((a, c) => a + c.required - c.points, 0);
    console.log(`y${d / 360} ${k.name} 부지 ${plot}칸 중 사용 ${plotUsed} (사무소 ${office}, 행정청 ${admin}) | 대기 ${Math.round(q)}pt`);
  }
}
