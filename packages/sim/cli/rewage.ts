// 기본 임금을 바꿨을 때 방식 산출 다시 맞추기: npx tsx cli/rewage.ts <직종> <새 기본 임금>
// 그 직종을 쓰는 산출 방식마다 지금 이익률(매출 대비)을 그대로 두고 산출을 다시 센다. 1,000 이상은 100 단위, 그 아래는 50 단위로 반올림.
// 출력: 방식 id, 상품, 지금 → 새 산출, 새 이익률
import { BUILDING_TYPES, GOODS, SKILL_DEFS } from '../src/data';
import type { GoodId, Skill } from '../src/types';
const [skill, wage] = [process.argv[2] as Skill, Number(process.argv[3])];
const cost = (ws: Record<string, number>, ins: Record<string, number>, base: Record<Skill, number>) =>
  Object.entries(ws).reduce((a, [s, n]) => a + n * base[s as Skill], 0) + Object.entries(ins).reduce((a, [g, q]) => a + q * GOODS[g as GoodId].basePrice, 0);
const old = Object.fromEntries(Object.entries(SKILL_DEFS).map(([s, d]) => [s, d.baseWage])) as Record<Skill, number>;
const neu = { ...old, [skill]: wage };
for (const t of BUILDING_TYPES) for (const m of t.methods) {
  const outs = Object.entries(m.outputs) as [GoodId, number][];
  if (t.auto || outs.length !== 1 || !(m.workers[skill]! > 0)) continue;
  const [g, q] = outs[0];
  const rev = q * GOODS[g].basePrice, c0 = cost(m.workers as never, m.inputs as never, old), margin = (rev - c0) / rev;
  const raw = cost(m.workers as never, m.inputs as never, neu) / (1 - margin) / GOODS[g].basePrice;
  const step = raw >= 1000 ? 100 : 50, out = Math.round(raw / step) * step;
  const c1 = cost(m.workers as never, m.inputs as never, neu);
  console.log(`${m.id} ${g} ${q} ${out} ${Math.round(margin * 100)}% ${Math.round((out * GOODS[g].basePrice - c1) / (out * GOODS[g].basePrice) * 100)}%`);
}
