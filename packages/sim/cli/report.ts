// 주요 지표 보고: npx tsx cli/report.ts [seed] [years] [out.json] ['<TUNE JSON>']
// 왕국별 연간 표를 출력하고, out.json 을 주면 매달 기록 전체(w.metrics)를 저장한다
import { writeFileSync } from 'node:fs';
import { TUNE } from '../src/data';
import { createWorld, step } from '../src/index';

const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 10), file = process.argv[4];
Object.assign(TUNE, JSON.parse(process.argv[5] ?? '{}'));
// 비교 실행에서는 플레이어 왕국도 AI가 맡는다
const w = createWorld(seed, { withPlayer: false });
for (let d = 0; d < years * 360; d++) step(w);
if (file) writeFileSync(file, JSON.stringify(w.metrics));

const M = (x: number) => (x / 1e6).toFixed(1) + 'M';
for (const k of w.kingdoms) {
  console.log(`\n${k.name}`);
  console.log('년 | 인구 | 소작농 | 실업 | 생활수준 소작/노동/기술/귀족 | 식량 노동 | 세입/주 | 국고 | 민간 | 사무소 | 포인트/일 | 대기일 | 레벨 왕실/민간 | 기술');
  for (const m of w.metrics) {
    if (m.tick % 360 !== 0) continue;
    const x = m.kingdoms[k.id];
    console.log([m.tick / 360, M(x.pop), x.peasantShare, x.joblessShare, `${x.solBy.peasant}/${x.solBy.unskilled}/${x.solBy.skilled}/${x.solBy.aristocrat}`,
      x.foodBy.unskilled, M(x.revenueWeek), M(x.treasury), M(x.privateCash), x.officeLevels, x.pointsPerDay, x.backlogDays, `${x.levelsState}/${x.levelsPrivate}`, x.techs].join(' | '));
  }
}
const last = w.metrics[w.metrics.length - 1];
console.log('\n상품 (마지막 달): 가격배율 공급/수요/판매');
for (const [g, v] of Object.entries(last.goods)) console.log(`  ${g} ×${v.ratio} ${v.supply}/${v.demand}/${v.sold}`);
