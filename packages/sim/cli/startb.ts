// 시작 건물 목록과 직원 충원
import { createWorld, regionById } from '../src/index';
const w = createWorld(Number(process.argv[2] ?? 1), { withPlayer: false });
for (const b of w.buildings) if (b.typeId !== 'subsistence') console.log(regionById(w, b.regionId).name, b.typeId, 'lv', b.level, 'co', b.companyId, JSON.stringify(b.employed));
