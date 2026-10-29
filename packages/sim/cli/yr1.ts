// 첫 1년 월별 경제 규모 추이 (GDP, 세입, 인구, 소득, 곡물가 등)
import { createWorld, step } from '../src/index';
const seed = Number(process.argv[2] ?? 1);
const w = createWorld(seed, { withPlayer: false });
for (let d = 0; d < 360; d++) step(w);
const sum = (f: (k: any) => number, m: any) => Object.values(m.kingdoms).reduce((a: number, k: any) => a + f(k), 0);
console.log('month gdpM pop(M) revWk(k) feesWk(k) govSpd(k) treas(M) privCash(M) pool(M) sav(M) wageIdx grainPx');
for (const m of w.metrics) {
  const g: any = (m.goods as any).grain;
  console.log([(m.tick / 30).toFixed(0), (sum((k) => k.gdp, m) / 1e6).toFixed(1), (sum((k) => k.pop, m) / 1e6).toFixed(2), (sum((k) => k.revenueWeek, m) / 1e3).toFixed(0), (sum((k) => k.feesWeek, m) / 1e3).toFixed(0), (sum((k) => k.govSpendWeek, m) / 1e3).toFixed(0), (sum((k) => k.treasury, m) / 1e6).toFixed(1), (sum((k) => k.privateCash, m) / 1e6).toFixed(1), (sum((k) => k.pool, m) / 1e6).toFixed(1), (sum((k) => k.savings, m) / 1e6).toFixed(1), (sum((k) => k.wageIndex, m) / 4).toFixed(2), g ? JSON.stringify(g).slice(0, 80) : '-'].join('\t'));
}
