// 모든 생산 방식의 레벨당 경제성 (기본가, 기본 임금): 산출 가치, 투입 가치, 임금, 이윤, 마진, 공사비 대비 연 수익률
import { BUILDING_TYPES, GOOD_IDS, GOODS, SKILL_DEFS, SKILLS } from '../src';
/** 건설 포인트 1점의 대략적인 비용 (목조 건설 사무소 기준: 임금 + 목재 / 포인트) */
const m0 = BUILDING_TYPES.find((t) => t.id === 'builder')!.methods[0];
const pointCost = (SKILLS.reduce((a, s) => a + (m0.workers[s] ?? 0) * SKILL_DEFS[s].baseWage, 0) + GOOD_IDS.reduce((a, g) => a + (m0.inputs[g] ?? 0) * GOODS[g].basePrice, 0)) / m0.construction!;
console.log(`point cost ≈ ƒ${pointCost.toFixed(2)}`);
console.log('method'.padEnd(18) + 'out'.padStart(8) + 'in'.padStart(8) + 'wage'.padStart(8) + 'profit'.padStart(8) + 'margin'.padStart(8) + 'ROI/yr'.padStart(9) + '  workers');
for (const t of BUILDING_TYPES) {
  if (t.auto) continue;
  for (const m of t.methods) {
    const out = GOOD_IDS.reduce((a, g) => a + (m.outputs[g] ?? 0) * GOODS[g].basePrice, 0);
    const inp = GOOD_IDS.reduce((a, g) => a + (m.inputs[g] ?? 0) * GOODS[g].basePrice, 0);
    const wage = SKILLS.reduce((a, s) => a + (m.workers[s] ?? 0) * SKILL_DEFS[s].baseWage, 0);
    const profit = out - inp - wage;
    const cost = t.buildPoints * pointCost;
    const wk = SKILLS.map((s) => m.workers[s] ?? 0).join('/');
    console.log(m.id.padEnd(18) + out.toFixed(0).padStart(8) + inp.toFixed(0).padStart(8) + wage.toFixed(0).padStart(8) + profit.toFixed(0).padStart(8)
      + `${((profit / Math.max(1, inp + wage)) * 100).toFixed(0)}%`.padStart(8) + (m.construction ? '-' : `${((profit * 360 / cost) * 100).toFixed(0)}%`).padStart(9) + '  ' + wk);
  }
}
