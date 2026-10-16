// 시드별 계층별 부 단계 곡선 (연도별): 농민 / 노동자 / 기술자 / 자본가 / 지주, 실업률, 농민 비율
import { TICKS_PER_YEAR, colonyPopulation, colonySol, createWorld, step, unemploymentRate } from '../src/index';
const years = [1, 3, 5, 8, 12, 15];
const seedsArg = process.argv.indexOf("--seeds");
const seedList = seedsArg >= 0 ? process.argv[seedsArg + 1].split(",").map(Number) : [1, 2, 3, 4];
for (const seed of seedList) {
  const w = createWorld(seed, { withPlayer: true });
  const out: string[] = [];
  const line = () => {
    const p = colonyPopulation(w, 'peasant'), u = colonyPopulation(w, 'unskilled');
    return `${['peasant', 'unskilled', 'skilled', 'capitalist', 'aristocrat'].map((c) => colonySol(w, c as never).toFixed(1)).join('/')} 실업${(unemploymentRate(w, 'unskilled') * 100).toFixed(0)}% 농민${Math.round((p / (p + u)) * 100)}%`;
  };
  out.push(`0y ${line()}`);
  for (let y = 1; y <= 15; y++) {
    for (let t = 0; t < TICKS_PER_YEAR; t++) step(w);
    if (years.includes(y)) out.push(`${y}y ${line()}`);
  }
  const wage = w.companies.filter((c) => !c.isPlayer).map((c) => c.wages.unskilled.toFixed(2)).join(',');
  console.log(`seed ${seed}\n  ${out.join('\n  ')}\n  노동자 임금 ${wage} | 인구 농민${Math.round(colonyPopulation(w, 'peasant'))} 노동자${Math.round(colonyPopulation(w, 'unskilled'))} 기술자${Math.round(colonyPopulation(w, 'skilled'))}`);
}
