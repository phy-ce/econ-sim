// 첫 40일 일별 소득 (incomeEma 합, 그날 lastIncome 합, 출처별)
import { createWorld, step } from '../src/index';
const w = createWorld(1, { withPlayer: false });
const e0 = w.pops.reduce((a, p) => a + p.incomeEma, 0);
console.log('start incomeEma sum', e0.toFixed(0), 'GDP/yr', (e0 * 360 / 1e6).toFixed(0) + 'M');
for (let d = 1; d <= 45; d++) {
  step(w);
  if (d > 6 && d % 3) continue;
  const src: Record<string, number> = {};
  let li = 0, em = 0;
  for (const p of w.pops) { li += p.lastIncome; em += p.incomeEma; for (const [k, v] of Object.entries((p as any).incomeBreakdown ?? {})) src[k] = (src[k] ?? 0) + (v as number); }
  console.log(`d${d} ema ${(em * 360 / 1e6).toFixed(0)}M/yr  today ${(li / 1e3).toFixed(0)}k  ` + Object.entries(src).map(([k, v]) => `${k} ${(v / 1e3).toFixed(0)}k`).join(' '));
}
