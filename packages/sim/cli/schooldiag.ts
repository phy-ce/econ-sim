// 학교 진단: npx tsx cli/schooldiag.ts [seed] [years]
import { createWorld, step } from '../src/index';
import { schoolFunding } from '../src/economy';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 20);
const w = createWorld(seed, { withPlayer: false });
for (let d = 1; d <= years * 360; d++) {
  step(w);
  if (w.tick % 1800 !== 0) continue;
  console.log(`${w.tick / 360}년 | 보조금 충족률 ` + w.kingdoms.map((k) => `${k.id}:${schoolFunding(w, k.id).toFixed(2)} 예산 ${Math.round(k.lastBudget?.education ?? 0)}`).join(' '));
  for (const r of w.regions) {
    const sc = w.buildings.filter((b) => b.regionId === r.id && b.typeId === 'school');
    const pop = w.pops.filter((p) => p.regionId === r.id).reduce((a, p) => a + p.size, 0);
    const lit = w.pops.filter((p) => p.regionId === r.id).reduce((a, p) => a + p.size * p.literacy, 0) / pop;
    console.log(`  지역${r.id} 왕국${r.kingdomId} 인구 ${(pop / 1e4).toFixed(0)}만 교육 ${r.education.toFixed(2)} 문해 ${lit.toFixed(2)} | 학교 ` +
      sc.map((b) => `${b.companyId}:${b.level}레벨 가동${b.utilization.toFixed(2)} 충원${b.last.staffing.toFixed(2)} 손익${Math.round(b.profitEma)}`).join(', '));
  }
}
