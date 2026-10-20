// 학교·행정청 방식별 레벨과 하급 귀족 고용: npx tsx cli/schoolmeth.ts [seed] [years]
import { createWorld, step } from '../src/index';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 6);
const w = createWorld(seed, { withPlayer: false });
for (let d = 0; d <= years * 360; d++) {
  if (d > 0) step(w);
  if (w.tick % 1800 !== 0) continue;
  const by = new Map<string, [number, number]>();
  for (const b of w.buildings) if (b.typeId === 'school' || b.typeId === 'admin') {
    const k = `k${w.regions.find((r) => r.id === b.regionId)!.kingdomId}:${b.methodId}:${b.stateOwned ? 's' : 'p'}`;
    const x = by.get(k) ?? [0, 0]; x[0] += b.level; x[1] += b.employed.gentry; by.set(k, x);
  }
  console.log(`${(w.tick / 360).toFixed(1)}년 ` + [...by].map(([m, [l, g]]) => `${m} lv${l} g${Math.round(g)}`).join(' | '));
}
