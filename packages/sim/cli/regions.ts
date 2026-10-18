// 지역별 계층 인구·부·생활수준과 건물: npx tsx cli/regions.ts [seed] [years]
import { createWorld, step } from '../src/index';
import { BUILDING_BY_ID } from '../src/data';
import { POP_CLASSES } from '../src/types';
const w = createWorld(Number(process.argv[2] ?? 1), { withPlayer: false });
for (let d = 0; d < Number(process.argv[3] ?? 5) * 360; d++) step(w);
for (const r of w.regions) {
  const pops = w.pops.filter((p) => p.regionId === r.id);
  const tot = pops.reduce((a, p) => a + p.size, 0);
  const avgSol = pops.reduce((a, p) => a + p.sol * p.size, 0) / tot;
  const cls = POP_CLASSES.map((s) => {
    const ps = pops.filter((p) => p.prof === s), n = ps.reduce((a, p) => a + p.size, 0);
    return n > 0 ? `${s.slice(0, 4)} ${Math.round(n / 1e3)}k sol ${(ps.reduce((a, p) => a + p.sol * p.size, 0) / n).toFixed(1)}` : '';
  }).filter(Boolean).join(' | ');
  const blds = w.buildings.filter((b) => b.regionId === r.id && !BUILDING_BY_ID[b.typeId].auto).map((b) => `${b.typeId}${b.level}`).join(' ');
  console.log(`${r.name} (k${r.kingdomId}${r.spaceport ? ', 항구' : ''}) 인구 ${Math.round(tot / 1e3)}k 평균 생활수준 ${avgSol.toFixed(2)} 땅 농${r.land.arable}/산${r.land.forest}/부${r.land.plot}\n  ${cls}\n  건물: ${blds}`);
}
