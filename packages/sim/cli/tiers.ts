// 시드별 지역 티어와 시작값: npx tsx cli/tiers.ts [seed...]
import { createWorld } from '../src/index';
for (const seed of (process.argv.slice(2).length ? process.argv.slice(2) : ['1', '2']).map(Number)) {
  const w = createWorld(seed, { withPlayer: false });
  console.log(`--- seed ${seed}`);
  for (const r of w.regions) {
    const pop = w.pops.filter((p) => p.regionId === r.id).reduce((a, p) => a + p.size, 0);
    const farms = w.buildings.filter((b) => b.regionId === r.id && b.typeId === 'farm').reduce((a, b) => a + b.level, 0);
    console.log(`  ${r.name} 왕국${r.kingdomId} 티어${r.tier} 인구 ${Math.round(pop / 1e3)}k 교육 ${r.education} 땅 농${r.land.arable}/산${r.land.forest}/부${r.land.plot}/광${r.land.ore} 시작농장 ${farms}`);
  }
  console.log(`  총인구 ${Math.round(w.pops.reduce((a, p) => a + p.size, 0) / 1e3)}k`);
}
