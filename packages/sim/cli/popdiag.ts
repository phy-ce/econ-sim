// 인구·건설 진단: npx tsx cli/popdiag.ts '<TUNE JSON>' [seed] [years]
// 매년 직종별 인구·생활수준·식량·연 증감률, 건물 종류별 착공(왕실/민간/손해 짓기)과 손익을 대륙 합계로 출력한다
import { TUNE } from '../src/data';
import { createWorld, step } from '../src/index';
import { POP_CLASSES } from '../src/types';

const over = JSON.parse(process.argv[2] ?? '{}');
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 20);
Object.assign(TUNE, over);
const w = createWorld(seed, { withPlayer: false });
const starts: Record<string, Record<string, number>> = {};
let lastYear = 0;
console.log('year | ' + POP_CLASSES.map((s) => `${s} 인구(만)/SoL/식량/증감%`).join(' | '));
for (let d = 1; d <= years * 360; d++) {
  step(w);
  const m = w.metrics[w.metrics.length - 1];
  if (!m || m.tick !== w.tick) continue;
  for (const k of Object.values(m.kingdoms)) for (const [key, v] of Object.entries(k.starts)) {
    const [t, kind] = key.split('|');
    (starts[t] ??= { s: 0, p: 0, loss: 0, d: 0 })[kind] += v;
  }
  if (w.tick % 360 !== 0) continue;
  const y = w.tick / 360;
  const ks = Object.values(m.kingdoms);
  const cells = POP_CLASSES.map((s) => {
    const n = ks.reduce((a, k) => a + k.popBy[s], 0);
    const avg = (f: (k: (typeof ks)[number]) => number) => (n > 0 ? ks.reduce((a, k) => a + f(k) * k.popBy[s], 0) / n : 0);
    return `${(n / 1e4).toFixed(0)}/${avg((k) => k.solBy[s]).toFixed(2)}/${avg((k) => k.foodBy[s]).toFixed(2)}/${avg((k) => k.growthBy[s]).toFixed(1)}`;
  });
  console.log(`${y} | ${cells.join(' | ')} | 총 ${(ks.reduce((a, k) => a + k.pop, 0) / 1e4).toFixed(0)}만`);
  if (y % 5 === 0) {
    const types = new Set([...Object.keys(starts), ...ks.flatMap((k) => Object.keys(k.typeBy))]);
    console.log(`  [${lastYear + 1}~${y}년 착공 왕실/민간/손해, 철거 | ${y}년 레벨, 일꾼/일자리, 하루 손익, 적자 레벨]`);
    for (const t of [...types].sort()) {
      const st = starts[t] ?? { s: 0, p: 0, loss: 0, d: 0 };
      const lv = ks.reduce((a, k) => a + (k.levelsBy[t] ?? 0), 0);
      const tb = ks.map((k) => k.typeBy[t]).filter((x) => !!x);
      const emp = tb.reduce((a, x) => a + x.employed, 0), sl = tb.reduce((a, x) => a + x.slots, 0);
      const pr = tb.reduce((a, x) => a + x.profit, 0), ll = tb.reduce((a, x) => a + x.lossLevels, 0);
      console.log(`  ${t.padEnd(12)} ${st.s}/${st.p}/${st.loss}, -${st.d} | ${lv}, ${emp}/${sl}, ${pr}, ${ll}`);
    }
    for (const k of Object.keys(starts)) delete starts[k];
    lastYear = y;
  }
}
