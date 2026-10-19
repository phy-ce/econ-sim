// 학교 진단: npx tsx cli/schooldiag.ts [seed] [years]
// 해마다 왕국별: 학교 레벨, 자리 / 인구, 문해력, 기술자 자격자(기술자 + 다른 직종의 기술자 자격)와 한 해 늘어난 수, 세금 수준, 국고(지출 몇 주치), 빚.
// 5년마다 지역별 학교 상세
import { createWorld, educationOf, literacyOf, step } from '../src/index';
import { companyById } from '../src/economy';
import { getMethod } from '../src/data';
import { workforce } from '../src/pops';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 20);
const w = createWorld(seed, { withPlayer: false });
const lastQs = new Map<number, number>();
const demolished = new Map<number, number>();
const prevLevel = new Map<number, number>();
for (let d = 1; d <= years * 360; d++) {
  step(w);
  if (w.tick % 7 === 0) {
    const now = new Map<number, number>();
    for (const b of w.buildings) if (b.typeId === 'school') now.set(b.id, b.level);
    for (const [id, lv] of prevLevel) {
      const k = w.regions.find((r) => r.id === (w.buildings.find((b) => b.id === id)?.regionId ?? -1))?.kingdomId ?? 0;
      const drop = Math.max(0, lv - (now.get(id) ?? 0));
      if (drop) demolished.set(k, (demolished.get(k) ?? 0) + drop);
    }
    prevLevel.clear();
    for (const [id, lv] of now) prevLevel.set(id, lv);
  }
  if (w.tick % 360 !== 0) continue;
  const parts: string[] = [];
  for (const k of w.kingdoms) {
    const regs = new Set(w.regions.filter((r) => r.kingdomId === k.id).map((r) => r.id));
    let n = 0, lit = 0, qs = 0, seats = 0, lv = 0;
    for (const p of w.pops) if (regs.has(p.regionId)) { n += p.size; lit += p.size * literacyOf(p); qs += p.prof === 'skilled' ? workforce(p) : (p.quals.skilled ?? 0); }
    for (const b of w.buildings) if (regs.has(b.regionId) && b.typeId === 'school') { lv += b.level; seats += b.level * (getMethod(b.typeId, b.methodId).seats ?? 0) * b.last.staffing; }
    const g = companyById(w, k.governmentId)!;
    const weeks = (k.expenseEma ?? 0) > 0 ? g.cash / k.expenseEma! : Infinity;
    const dq = qs - (lastQs.get(k.id) ?? qs);
    lastQs.set(k.id, qs);
    parts.push(`왕국${k.id} 학교 ${lv}레벨 자리/인구 ${(seats / n).toFixed(2)} 문해 ${(lit / n).toFixed(2)} 기술자격 ${(qs / 1e3).toFixed(0)}천(+${(dq / 1e3).toFixed(1)}) 세금${k.budget.tax} 연구${k.budget.research} 국고 ${weeks.toFixed(0)}주 빚 ${Math.round(g.debt)} 학교철거 ${demolished.get(k.id) ?? 0}`);
  }
  console.log(`${w.tick / 360}년 | ` + parts.join(' | '));
  if (w.tick % 1800 !== 0) continue;
  for (const r of w.regions) {
    const sc = w.buildings.filter((b) => b.regionId === r.id && b.typeId === 'school');
    const pop = w.pops.filter((p) => p.regionId === r.id).reduce((a, p) => a + p.size, 0);
    const lit = w.pops.filter((p) => p.regionId === r.id).reduce((a, p) => a + p.size * literacyOf(p), 0) / pop;
    console.log(`  지역${r.id} 왕국${r.kingdomId} 인구 ${(pop / 1e4).toFixed(0)}만 교육 ${educationOf(r).toFixed(2)} 문해 ${lit.toFixed(2)} | 학교 ` +
      sc.map((b) => `${b.methodId}:${b.level}레벨 충원${b.last.staffing.toFixed(2)} 손익${Math.round(b.profitEma)}`).join(', '));
  }
}
