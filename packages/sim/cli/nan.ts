// NaN 추적: 처음 NaN 이 생기는 틱과 위치
import { createWorld, step } from '../src';
const w = createWorld(1, { withPlayer: false });
for (let t = 0; t < 30; t++) {
  step(w);
  const bad: string[] = [];
  for (const c of w.companies) if (!Number.isFinite(c.cash)) bad.push(`co ${c.name} cash`);
  for (const c of w.companies) for (const [k, v] of Object.entries(c.wages)) if (!Number.isFinite(v)) bad.push(`co ${c.name} wage ${k}`);
  for (const p of w.pops) if (!Number.isFinite(p.savings)) bad.push(`pop ${p.prof} ${p.work}`);
  for (const k of w.kingdoms) if (!Number.isFinite(k.investmentPool) || !Number.isFinite(k.taxDue ?? 0)) bad.push(`kingdom ${k.name}`);
  for (const b of w.buildings) if (!Number.isFinite(b.last.wageCost)) bad.push(`b ${b.typeId} wage`);
  if (bad.length) { console.log(t, bad.slice(0, 8).join(' | ')); break; }
}
