// 초반 정체 진단: 왕국별 국고·사무소·공사·투자 풀·연구, 곡물 수급
import { BUILDING_BY_ID, GOODS, companyById, constructionEstimate, createWorld, step } from '../src/index';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 6), every = Number(process.argv[4] ?? 120);
const w = createWorld(seed, { withPlayer: false });
const k$ = (v: number) => `${(v / 1000).toFixed(0)}k`;
for (let d = 1; d <= 360 * years; d++) {
  step(w);
  if (d % every) continue;
  console.log(`--- d${d}`);
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId)!, firm = companyById(w, k.privateIds[0])!;
    const est = constructionEstimate(w, gov, 'farm');
    const office = w.buildings.filter((b) => b.companyId === gov.id && b.typeId === 'builder').reduce((a, b) => a + b.level, 0);
    const ks = w.constructions.filter((x) => { const o = companyById(w, x.companyId); return o && o.kingdomId === k.id; });
    const left = (cid: number) => ks.filter((x) => x.companyId === cid).reduce((a, x) => a + x.required - x.points, 0);
    const lv = (cid: number) => w.buildings.filter((b) => b.companyId === cid && !BUILDING_BY_ID[b.typeId].auto && b.typeId !== 'builder' && b.typeId !== 'admin').reduce((a, b) => a + b.level, 0);
    const r = gov.research;
    console.log(`${k.nameEn.padEnd(8)} gov ${k$(gov.cash)}/${k$(gov.debt)} office ${office} pts/d ${est.pointsPerDay.toFixed(0)} cost/d ${k$(est.costPerDay)} | q gov ${ks.filter((x) => x.companyId === gov.id).length}(${(left(gov.id) / Math.max(1, est.pointsPerDay)).toFixed(0)}d) firm ${ks.filter((x) => x.companyId === firm.id).length}(${(left(firm.id) / Math.max(1, est.pointsPerDay)).toFixed(0)}d) | lv gov ${lv(gov.id)} firm ${lv(firm.id)} | firm ${k$(firm.cash)} pool ${k$(k.investmentPool)} | res ${r.current ?? '-'} ${k$(r.progress[r.current ?? ''] ?? 0)} b${r.budget.toFixed(0)} known ${r.known.length} | tax ${((k.taxCapacity ?? 0) / Math.max(1, k.taxDue ?? 0) * 100).toFixed(0)}%`);
  }
  let gd = 0, gs = 0, px = 0;
  for (const r of w.regions) { gd += r.market.grain.demandEma; gs += r.market.grain.supplyEma; px += r.market.grain.price; }
  console.log(`grain s/d ${(gs / gd).toFixed(2)} px ${(px / w.regions.length / GOODS.grain.basePrice).toFixed(2)}`);
}
