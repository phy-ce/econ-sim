// 직종별 고용·생활수준과 상층이 일하는 곳: npx tsx cli/classdiag.ts '<TUNE JSON>' [seed] [years]
// 직종마다 노동 인구(천)·실업률·평균 생활수준, 하급 귀족·귀족·자본가가 일하는 건물 종류, 하급 귀족 자격자의 지금 직종
import { TUNE } from '../src/data';
import { createWorld, step } from '../src/index';
import { workforce } from '../src/pops';
import { POP_CLASSES } from '../src/types';

const over = JSON.parse(process.argv[2] ?? '{}');
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 20);
Object.assign(TUNE, over);
const w = createWorld(seed, { withPlayer: false });
const k0 = (x: number) => (x / 1000).toFixed(0);
for (let d = 1; d <= years * 360; d++) {
  step(w);
  if (w.tick % 1800 !== 0 && d !== years * 360) continue;
  const typeOf = new Map(w.buildings.map((b) => [b.id, b.typeId]));
  console.log(`\n=== ${w.tick / 360}년`);
  const row: string[] = [];
  for (const c of POP_CLASSES) {
    let wf = 0, idle = 0, sol = 0, size = 0;
    for (const p of w.pops) if (p.prof === c) { const f = workforce(p); wf += f; if (p.work === 0) idle += f; sol += p.sol * p.size; size += p.size; }
    row.push(`${c} ${k0(wf)}k 실업 ${(100 * idle / Math.max(1, wf)).toFixed(1)}% SoL ${(sol / Math.max(1, size)).toFixed(2)}`);
  }
  console.log(row.join(' | '));
  for (const c of ['gentry', 'aristocrat', 'capitalist'] as const) {
    const at = new Map<string, number>();
    for (const p of w.pops) if (p.prof === c) { const k = p.work === 0 ? '(실업)' : typeOf.get(p.work) ?? '?'; at.set(k, (at.get(k) ?? 0) + workforce(p)); }
    const quals = new Map<string, number>();
    for (const p of w.pops) if (p.prof !== c && (p.quals[c] ?? 0) > 0) quals.set(p.prof, (quals.get(p.prof) ?? 0) + (p.quals[c] ?? 0));
    console.log(`${c} 일터: ${[...at].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${k0(v)}k`).join(', ')} | 자격자 직종: ${[...quals].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${k0(v)}k`).join(', ')}`);
  }
}
