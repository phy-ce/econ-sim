// 여러 시드를 돌려 경제가 무너지는 비율을 잰다: npm run sweep -w @econ/sim -- --seeds 40 --years 10
// 판정: 2년차 이후 노동자 부 단계가 4 아래로 떨어진 적이 있으면 실패 (기아선)
import { GOOD_IDS, GOODS, TICKS_PER_YEAR, colonyPrice, colonySol, createWorld, step } from '../src/index';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const seeds = Number(arg('seeds', '30'));
const years = Number(arg('years', '10'));
const start = Number(arg('start', '1'));
const FAIL_SOL = 4;

let fails = 0;
for (let seed = start; seed < start + seeds; seed++) {
  const w = createWorld(seed, { withPlayer: true });
  let minSol = Infinity;
  let failTick = -1;
  for (let t = 0; t < years * TICKS_PER_YEAR; t++) {
    step(w);
    if (t > TICKS_PER_YEAR * 2 && t % 30 === 0) {
      const s = colonySol(w, 'unskilled');
      if (s < minSol) minSol = s;
      if (s < FAIL_SOL && failTick < 0) failTick = t;
    }
  }
  const rel = (g: (typeof GOOD_IDS)[number]) => colonyPrice(w, g) / GOODS[g].basePrice;
  const short = GOOD_IDS.filter((g) => rel(g) > 1.5).map((g) => GOODS[g].name);
  const glut = GOOD_IDS.filter((g) => rel(g) < 0.7).map((g) => GOODS[g].name);
  const ok = failTick < 0;
  if (!ok) fails++;
  console.log(`seed ${String(seed).padStart(4)} ${ok ? 'ok  ' : 'FAIL'} minSol ${minSol.toFixed(2)} 최종 ${colonySol(w, 'unskilled').toFixed(2)}/${colonySol(w, 'skilled').toFixed(2)}${ok ? '' : ` (${(failTick / TICKS_PER_YEAR).toFixed(1)}년)`} 부족: ${short.join(',') || '-'} 과잉: ${glut.join(',') || '-'}`);
}
console.log(`\n실패 ${fails}/${seeds}`);
