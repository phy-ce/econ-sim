// 하급 귀족·귀족: 인원, 일터별 노동 인구, 생활수준, 하루 소득: npx tsx cli/gentrydiag.ts [seed] [years]
import { createWorld, step } from '../src/index';
import { workforce } from '../src/pops';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 10);
const w = createWorld(seed, { withPlayer: false });
for (let d = 0; d <= years * 360; d++) {
  if (d > 0) step(w);
  if (w.tick % (360 * Number(process.env.EVERY ?? 2)) !== 0) continue;
  const row: string[] = [];
  for (const cls of ['gentry', 'aristocrat'] as const) {
    let n = 0, wf = 0, sol = 0, inc = 0;
    const by = new Map<string, number>();
    for (const p of w.pops) {
      if (p.prof !== cls) continue;
      const f = workforce(p);
      n += p.size; wf += f; sol += p.sol * f; inc += p.incomeEma;
      const t = p.work === 0 ? '실업' : w.buildings.find((b) => b.id === p.work)?.typeId ?? '?';
      by.set(t, (by.get(t) ?? 0) + f);
    }
    const parts = [...by].sort((a, b) => b[1] - a[1]).map(([t, x]) => `${t} ${(x / 1e3).toFixed(1)}k`).join(' ');
    let qs = 0; for (const p of w.pops) if (p.prof === cls) qs += p.quals.skilled ?? 0;
    row.push(`${cls} 기술자격 ${(qs / 1e3).toFixed(1)}k 인구 ${(n / 1e3).toFixed(0)}k sol ${(sol / Math.max(1, wf)).toFixed(2)} 1인 소득 ${(inc / Math.max(1, wf)).toFixed(1)} [${parts}]`);
  }
  console.log(`${w.tick / 360}년 | ${row.join(' | ')}`);
}
