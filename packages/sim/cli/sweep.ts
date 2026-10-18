// 조정값 비교: npx tsx cli/sweep.ts '<TUNE JSON>' [seed] [years]
// 주요 지표(w.metrics)에서 5년마다 대륙 합계를 뽑아 한 줄 JSON으로 출력한다
import { TUNE } from '../src/data';
import { createWorld, step } from '../src/index';
import type { MetricPoint } from '../src/index';

const over = JSON.parse(process.argv[2] ?? '{}');
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 10);
Object.assign(TUNE, over);
// 비교 실행에서는 플레이어 왕국도 AI가 맡는다
const w = createWorld(seed, { withPlayer: false });
for (let d = 0; d < years * 360; d++) step(w);

// 플레이어 왕국은 연구를 고르지 않으므로 기술 수에서 뺀다
const playerKingdom = w.companies.find((c) => c.isPlayer)?.kingdomId;
const sum = (m: MetricPoint, f: (k: MetricPoint['kingdoms'][number]) => number) => Object.values(m.kingdoms).reduce((a, k) => a + f(k), 0);
const out: Record<string, unknown> = { tune: over, seed };
for (const m of w.metrics) {
  const y = m.tick / 360;
  if (!Number.isInteger(y) || y % 5 !== 0) continue;
  const pop = sum(m, (k) => k.pop);
  out[`y${y}`] = {
    pop: +(pop / 1e6).toFixed(2),
    peas: +(sum(m, (k) => k.popBy.peasant) / pop).toFixed(2),
    jobless: +(sum(m, (k) => k.joblessShare * k.pop) / pop).toFixed(3),
    levels: sum(m, (k) => k.levelsState + k.levelsPrivate),
    techs: Math.min(...Object.entries(m.kingdoms).filter(([id]) => Number(id) !== playerKingdom).map(([, k]) => k.techs)),
    revWk: Math.round(sum(m, (k) => k.revenueWeek) / 1e3),
    pts: Math.round(sum(m, (k) => k.pointsPerDay)),
    grain: m.goods.grain.ratio,
    classGap: m.classGap,
    regionGap: m.regionGap,
    taxRatio: +(sum(m, (k) => k.taxRatio * k.pop) / pop).toFixed(2),
    solPeas: +(sum(m, (k) => k.solBy.peasant * k.popBy.peasant) / Math.max(1, sum(m, (k) => k.popBy.peasant))).toFixed(2),
    foodPeas: +(sum(m, (k) => k.foodBy.peasant * k.popBy.peasant) / Math.max(1, sum(m, (k) => k.popBy.peasant))).toFixed(2),
    solUnsk: +(sum(m, (k) => k.solBy.unskilled * k.popBy.unskilled) / Math.max(1, sum(m, (k) => k.popBy.unskilled))).toFixed(2),
  };
}
const after1 = w.metrics.filter((m) => m.tick > 360);
out.foodMin = Math.min(...after1.map((m) => {
  const n = sum(m, (k) => k.popBy.unskilled);
  return n > 0 ? sum(m, (k) => k.foodBy.unskilled * k.popBy.unskilled) / n : 1;
})).toFixed(2);
console.log(JSON.stringify(out));
