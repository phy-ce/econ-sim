import { BUILDING_TYPES, LAND_NAMES, LAND_TYPES, REGIONS, SUBSISTENCE, createWorld, landUsed } from '../src/index';
const w = createWorld(1);
console.log('건물 종류 → 땅:', BUILDING_TYPES.map((t) => `${t.name}=${LAND_NAMES[t.land]}`).join(', '));
console.log('\n지역 | ' + LAND_TYPES.map((l) => `${LAND_NAMES[l]} 사용/전체`).join(' | ') + ' | 농민 | 빈 농지+산림 수용 | 하층 합계');
let tot = { arable: 0, forest: 0, ore: 0, plot: 0 } as Record<string, number>;
for (const r of w.regions) {
  const cells = LAND_TYPES.map((l) => { tot[l] += r.land[l]; return `${landUsed(w, r.id, l)}/${r.land[l]}`; });
  const cap = (r.land.arable - landUsed(w, r.id, 'arable')) * SUBSISTENCE.workersPerArable + (r.land.forest - landUsed(w, r.id, 'forest')) * SUBSISTENCE.workersPerForest;
  const peas = Math.round(r.households.peasant.population);
  console.log(`${r.name.padEnd(7)} | ${cells.join(' | ')} | ${peas} | ${cap} | ${Math.round(r.households.unskilled.population) + peas}`);
}
console.log('합계', tot);
const def = REGIONS.reduce((a, r) => a + r.population.unskilled + r.population.skilled + r.population.expert, 0);
console.log('정의된 하층+중층 인구', def, '/ 농지 총 수용(노동자 100/칸)', tot.arable * 100, '/ 농장 1레벨 일자리 104');
