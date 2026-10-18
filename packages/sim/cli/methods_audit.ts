// 생산 방식 점검 (기본가·기본 임금 기준): 레벨당 하루 임금, 원료비, 매출, 이익률
import { BUILDING_TYPES, GOODS, SKILL_DEFS } from '../src/data';
import type { GoodId, Skill } from '../src/types';
for (const t of BUILDING_TYPES) for (const m of t.methods) {
  if (t.auto) continue;
  const wage = (Object.entries(m.workers) as [Skill, number][]).reduce((a, [s, n]) => a + n * SKILL_DEFS[s].baseWage, 0);
  const input = (Object.entries(m.inputs) as [GoodId, number][]).reduce((a, [g, q]) => a + q * GOODS[g].basePrice, 0);
  const rev = (Object.entries(m.outputs) as [GoodId, number][]).reduce((a, [g, q]) => a + q * GOODS[g].basePrice, 0);
  const w = Object.entries(m.workers).filter(([, n]) => n).map(([s, n]) => `${s[0]}${n}`).join(' ');
  const i = Object.entries(m.inputs).map(([g, q]) => `${g} ${q}`).join(', ');
  const o = Object.entries(m.outputs).map(([g, q]) => `${g} ${q}`).join(', ') || (m.construction ? `건설 ${m.construction}` : m.taxCapacity ? `징세 ${m.taxCapacity}` : '');
  console.log(`${t.id}/${m.id} | ${w} | ${i || '-'} → ${o} | 임금 ${wage} 원료 ${input} 매출 ${rev} | 이익 ${rev - wage - input} (${rev > 0 ? Math.round((rev - wage - input) / rev * 100) : '-'}%)`);
}

// 제안: 이익률 = 20% + 방식 단계 × 10%. 산출 = (임금 + 원료) / (1 − 이익률) / 기본가, 1000 이상은 100 단위, 그 아래는 50 단위로 반올림
if (process.argv[2] === 'propose') {
  console.log('\n--- 제안');
  for (const t of BUILDING_TYPES) {
    if (t.auto) continue;
    t.methods.forEach((m, idx) => {
      const outs = Object.entries(m.outputs) as [GoodId, number][];
      if (outs.length !== 1) return;
      const [g, q] = outs[0];
      const wage = (Object.entries(m.workers) as [Skill, number][]).reduce((a, [s, n]) => a + n * SKILL_DEFS[s].baseWage, 0);
      const input = (Object.entries(m.inputs) as [GoodId, number][]).reduce((a, [gg, qq]) => a + qq * GOODS[gg].basePrice, 0);
      const margin = 0.2 + 0.1 * idx;
      const raw = (wage + input) / (1 - margin) / GOODS[g].basePrice;
      const step = raw >= 1000 ? 100 : 50;
      const out = Math.round(raw / step) * step;
      const rev = out * GOODS[g].basePrice;
      console.log(`${t.id}/${m.id} | ${g} ${q} → ${out} | 이익률 ${Math.round((rev - wage - input) / rev * 100)}% (목표 ${Math.round(margin * 100)}%)`);
    });
  }
}
