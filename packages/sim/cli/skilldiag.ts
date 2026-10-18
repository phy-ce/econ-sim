// 직종별 일자리·고용·자격자: npx tsx cli/skilldiag.ts [seed] [years]
import { createWorld, step } from '../src/index';
import { slots } from '../src/economy';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 20);
const w = createWorld(seed, { withPlayer: false });
for (let d = 1; d <= years * 360; d++) {
  step(w);
  if (w.tick % 1800 !== 0) continue;
  const row: string[] = [];
  for (const s of ['unskilled', 'skilled', 'expert'] as const) {
    let sl = 0, em = 0, office = 0;
    for (const b of w.buildings) { const n = slots(b, s); sl += n; em += b.employed[s]; if (b.typeId === 'builder') office += b.employed[s]; }
    const qual = w.pops.reduce((a, p) => a + (p.prof === s ? p.size * 0.25 : (p.quals[s] ?? 0)), 0);
    row.push(`${s} 자리 ${(sl / 1e3).toFixed(0)}k 고용 ${(em / 1e3).toFixed(0)}k (사무소 ${(office / 1e3).toFixed(0)}k) 자격자 ${(qual / 1e3).toFixed(0)}k`);
  }
  console.log(`${w.tick / 360}년 | ${row.join(' | ')}`);
}
