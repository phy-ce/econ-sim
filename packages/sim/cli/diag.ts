// 진단: 왕국별 국영·민간 건물, 소유주 자리와 소유 직종 인구, 운송 수급, 회사 현금
import { BUILDING_BY_ID, GOOD_IDS, OWNERS, createWorld, slots, step, workforce } from '../src';
const seed = Number(process.argv[2] ?? 1);
const years = process.argv.slice(3).map(Number);
const w = createWorld(seed, { withPlayer: false });
for (const y of years.length ? years : [2, 5, 10]) {
  while (w.tick < y * 360) step(w);
  console.log(`== y${y}`);
  for (const k of w.kingdoms) {
    const regs = w.regions.filter((r) => r.kingdomId === k.id).map((r) => r.id);
    const lv = { state: 0, private: 0 };
    const seats = { capitalist: 0, aristocrat: 0 }, filled = { capitalist: 0, aristocrat: 0 }, pop = { capitalist: 0, aristocrat: 0 };
    for (const b of w.buildings) {
      if (!regs.includes(b.regionId)) continue;
      if (!BUILDING_BY_ID[b.typeId].auto) lv[b.stateOwned ? 'state' : 'private'] += b.level;
      for (const cls of OWNERS) {
        const jobs = BUILDING_BY_ID[b.typeId].auto ? 0 : slots(b, cls);
        seats[cls] += jobs; filled[cls] += Math.min(jobs, b.employed[cls]);
      }
    }
    for (const p of w.pops) if (regs.includes(p.regionId) && (p.prof === 'capitalist' || p.prof === 'aristocrat')) pop[p.prof] += workforce(p);
    console.log(`  ${k.name} tax due ${Math.round(k.taxDue ?? 0)} cap ${Math.round(k.taxCapacity ?? 0)} regions ${regs.join(',')} levels state ${lv.state} private ${lv.private} | cap seats ${Math.round(seats.capitalist)} filled ${Math.round(filled.capitalist)} wf ${Math.round(pop.capitalist)} | aris seats ${Math.round(seats.aristocrat)} filled ${Math.round(filled.aristocrat)} wf ${Math.round(pop.aristocrat)} | pool ${Math.round(k.investmentPool)}`);
  }
  for (const r of w.regions) {
    const t = r.market.transport;
    console.log(`  r${r.id} transport D ${t.demandEma.toFixed(0)} S ${t.supplyEma.toFixed(0)} p ${t.price.toFixed(1)} | ${Object.entries(t.demandByEma ?? {}).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(' ')}`);
  }
  console.log('  ' + w.companies.map((c) => `${c.name} ${Math.round(c.cash / 1000)}k/${Math.round(c.debt / 1000)}k wk${Math.round(c.lastWeekProfit / 1000)}k`).join(' | '));
  const mob = Object.entries(w.mobility ?? {}).map(([k, v]) => `${k} ${Math.round(v / 1000)}k`).join(', ');
  console.log('  mobility ' + mob);
  void GOOD_IDS;
}
