// 건축사무소 방식·광석·광산·철도 진단 (2주마다): npx tsx cli/officediag.ts '<TUNE JSON>' [seed] [시작 년] [끝 년]
import { TUNE } from '../src/data';
import { createWorld, step } from '../src/index';
const tune = JSON.parse(process.argv[2] ?? '{}'); Object.assign(TUNE, tune);
const seed = Number(process.argv[3] ?? 2), y0 = Number(process.argv[4] ?? 3), y1 = Number(process.argv[5] ?? 5);
const w = createWorld(seed, { withPlayer: false });
for (let d = 1; d <= y1 * 360; d++) {
  step(w);
  if (d < y0 * 360 || d % 14) continue;
  let S = 0, D = 0;
  for (const r of w.regions) { S += r.market.ore.supplyEma; D += r.market.ore.demandEma; }
  const offs = w.buildings.filter((b) => b.typeId === 'builder').map((b) => `${b.methodId.slice(6, 9)}${b.level}:${b.last.inputFill.toFixed(1)}${b.idle ? 'i' : ''}`);
  const mines = w.buildings.filter((b) => b.typeId === 'mine').map((b) => `${b.level}@${b.utilization.toFixed(2)}${b.active ? '' : 'x'}`);
  const rails = w.buildings.filter((b) => b.typeId === 'railway').map((b) => `r${b.regionId}:${b.level}`);
  console.log(`d${d} oreS ${S.toFixed(0)} oreD ${D.toFixed(0)} p ${(w.regions.reduce((a, r) => a + r.market.ore.price, 0) / w.regions.length).toFixed(2)} | off ${offs.join(' ')} | mine ${mines.join(' ')} | ${rails.join(' ')}`);
}
