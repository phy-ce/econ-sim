// 진단: 연도별 건물 종류·방식별 레벨, 평균 효율 구성, 소유주 빈자리, 회사 현금·공사, 계층 이동 누적
// 사용: npx tsx packages/sim/cli/diag.ts [seed] [years...]
import { BUILDING_TYPES, createWorld, efficiencyParts, ownerJobs, regionOwnerJobs, step } from '../src';
const seed = Number(process.argv[2] ?? 1);
const years = process.argv.slice(3).map(Number);
const w = createWorld(seed, { withPlayer: false });
for (const y of years.length ? years : [2, 5, 10, 15]) {
  while (w.tick < y * 360) step(w);
  const lv: Record<string, number> = {};
  let effSum = 0, ownSum = 0, expSum = 0, n = 0;
  for (const b of w.buildings) {
    const k = `${b.methodId}`;
    lv[k] = (lv[k] ?? 0) + b.level;
    const e = efficiencyParts(b);
    effSum += e.total * b.level; ownSum += e.owners * b.level; expSum += e.experience * b.level; n += b.level;
  }
  let capJobs = 0, capPop = 0, arJobs = 0, arPop = 0;
  for (const r of w.regions) {
    const j = regionOwnerJobs(w, r);
    capJobs += j.capitalist; arJobs += j.aristocrat;
    capPop += r.households.capitalist.population; arPop += r.households.aristocrat.population;
    void ownerJobs;
  }
  let vacCap = 0, vacAr = 0;
  for (const r of w.regions) {
    const j = regionOwnerJobs(w, r);
    vacCap += Math.max(0, j.capitalist - r.households.capitalist.population);
    vacAr += Math.max(0, j.aristocrat - r.households.aristocrat.population);
  }
  console.log(`== y${y}`);
  console.log('levels: ' + Object.entries(lv).sort().map(([k, v]) => `${k} ${v}`).join(', '));
  console.log(`eff avg ${(effSum / n).toFixed(2)} owners ${(ownSum / n).toFixed(2)} exp ${(expSum / n).toFixed(2)}`);
  console.log(`owner seats: capitalist ${Math.round(capJobs)} (pop ${Math.round(capPop)}, vacant ${Math.round(vacCap)}), aristocrat ${Math.round(arJobs)} (pop ${Math.round(arPop)}, vacant ${Math.round(vacAr)})`);
  console.log('companies: ' + w.companies.map((c) => `#${c.id} cash ${Math.round(c.cash / 1000)}k debt ${Math.round(c.debt / 1000)}k builds ${w.constructions.filter((k) => k.companyId === c.id).length} known ${c.research.known.length}`).join(' | '));
  console.log('mobility: ' + Object.entries(w.mobility ?? {}).map(([k, v]) => `${k} ${Math.round(v)}`).join(', '));
  void BUILDING_TYPES;
}
