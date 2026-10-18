// 시드별 직종별 부 곡선 (연도별): 소작농 / 노동자 / 기술자 / 전문가 / 자본가 / 귀족, 노동자 실업률, 하층 중 소작농 비율
import { TICKS_PER_YEAR, colonyPopulation, colonySol, createWorld, step, unemploymentRate } from '../src/index';
const years = [1, 3, 5, 8, 12, 15];
const seedsArg = process.argv.indexOf('--seeds');
const seedList = seedsArg >= 0 ? process.argv[seedsArg + 1].split(',').map(Number) : [1, 2];
for (const seed of seedList) {
  const w = createWorld(seed, { withPlayer: false });
  const line = () => {
    const p = colonyPopulation(w, 'peasant'), u = colonyPopulation(w, 'unskilled');
    return `${(['peasant', 'unskilled', 'skilled', 'expert', 'capitalist', 'aristocrat'] as const).map((c) => colonySol(w, c).toFixed(1)).join('/')} 실업${(unemploymentRate(w, 'unskilled') * 100).toFixed(0)}% 소작농${Math.round((p / (p + u)) * 100)}%`;
  };
  const out = [`0y ${line()}`];
  for (let y = 1; y <= Math.max(...years); y++) {
    for (let t = 0; t < TICKS_PER_YEAR; t++) step(w);
    if (years.includes(y)) out.push(`${y}y ${line()}`);
  }
  console.log(`seed ${seed}\n  ${out.join('\n  ')}`);
}
