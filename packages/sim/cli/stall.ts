// 장기 진단: 해마다 왕국별 소작농 비중, 건물 레벨(왕실/민간), 현금, 투자 풀, 공사 대기, 사무소 포인트
import { BUILDING_BY_ID, colonyPopulation, companyById, constructionEstimate, createWorld, step } from '../src/index';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 20);
const w = createWorld(seed, { withPlayer: false });
const M = (v: number) => `${(v / 1e6).toFixed(0)}M`;
for (let y = 1; y <= years; y++) {
  for (let d = 0; d < 360; d++) step(w);
  const total = w.pops.reduce((a, p) => a + p.size, 0);
  console.log(`y${y} peasant ${(colonyPopulation(w, 'peasant') / total * 100).toFixed(0)}% pop ${(total / 1e6).toFixed(2)}M`);
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId)!, firm = companyById(w, k.privateIds[0])!;
    const lv = (id: number) => w.buildings.filter((b) => b.companyId === id && !BUILDING_BY_ID[b.typeId].auto && b.typeId !== 'builder' && b.typeId !== 'admin').reduce((a, b) => a + b.level, 0);
    const q = (id: number) => w.constructions.filter((x) => x.companyId === id).length;
    const est = constructionEstimate(w, gov, 'farm');
    const unemployed = w.pops.filter((p) => p.work === 0 && w.regions.find((r) => r.id === p.regionId)!.kingdomId === k.id).reduce((a, p) => a + p.size, 0);
    console.log(`  ${k.nameEn.padEnd(8)} lv G${lv(gov.id)} P${lv(firm.id)} | cash G${M(gov.cash)} P${M(firm.cash)} debt P${M(firm.debt)} pool ${M(k.investmentPool)} | q G${q(gov.id)} P${q(firm.id)} pts ${est.pointsPerDay.toFixed(0)} | profit P/wk ${M(firm.lastWeekProfit)} | jobless ${(unemployed / 1e3).toFixed(0)}k`);
  }
}
