import { createWorld, step } from '../src/index';
import { constructionEstimate, builderOf, companyById } from '../src/economy';
import { committedCost } from '../src/finance';
const w = createWorld(1, { withPlayer: false });
for (let d = 1; d <= 360 * 10; d++) {
  step(w);
  if (d % 720 !== 0) continue;
  for (const c of w.companies.filter((x) => !x.state)) {
    const e = constructionEstimate(w, c, 'farm'), b = builderOf(w, c);
    const q = w.constructions.filter((k) => { const o = companyById(w, k.companyId); return !!o && builderOf(w, o) === b; });
    const mine = q.filter((k) => k.companyId === c.id);
    console.log(`y${d / 360} ${c.name} cash ${(c.cash / 1e6).toFixed(0)}M buildings ${(w.buildings.filter((b) => b.companyId === c.id).reduce((a, b) => a + b.cash, 0) / 1e6).toFixed(1)}M committed ${(committedCost(w, c) / 1e6).toFixed(0)}M | 사무소 포인트 ${e.pointsPerDay.toFixed(0)}/일, 대기 ${q.reduce((a, k) => a + k.required - k.points, 0).toFixed(0)}pt (${(q.reduce((a, k) => a + k.required - k.points, 0) / Math.max(1, e.pointsPerDay)).toFixed(0)}일) 내 공사 ${mine.length}건 | 레벨당 공사비 ${(e.cost / 1e6).toFixed(1)}M`);
  }
}
const S = (globalThis as any).AIS as Record<string, number>;
for (const [k, v] of Object.entries(S).sort()) if (k.includes('firm')) console.log(k, v);
