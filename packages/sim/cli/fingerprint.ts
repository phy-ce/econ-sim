// 결정성 확인용 지문: 몇 년 돌린 뒤 세계 상태 해시. 성능 개선 전후로 같아야 한다. npx tsx cli/fingerprint.ts [seed] [years]
import { createHash } from 'node:crypto';
import { createWorld, step } from '../src/index';
const w = createWorld(Number(process.argv[2] ?? 1), { withPlayer: false });
for (let d = 0; d < Number(process.argv[3] ?? 3) * 360; d++) step(w);
const snap = JSON.stringify({ pops: w.pops, buildings: w.buildings, companies: w.companies, regions: w.regions.map((r) => r.market), metrics: w.metrics });
console.log(createHash('sha256').update(snap).digest('hex').slice(0, 16), `pops ${w.pops.length} buildings ${w.buildings.length}`);
