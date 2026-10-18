// 5년차 회사 임금과 지역 가격, 건물별 실제 이익 분포
import { BUILDING_BY_ID, createWorld, step } from '../src/index';
const w = createWorld(Number(process.argv[2] ?? 1), { withPlayer: false });
for (let d = 1; d <= 360 * Number(process.argv[3] ?? 5); d++) step(w);
for (const c of w.companies) console.log(c.name, Object.entries(c.wages).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' '));
const by: Record<string, { lv: number; p: number }> = {};
for (const b of w.buildings) { if (BUILDING_BY_ID[b.typeId].auto) continue; const x = (by[b.methodId] ??= { lv: 0, p: 0 }); x.lv += b.level; x.p += b.profitEma; }
console.log(Object.entries(by).map(([k, v]) => `${k} ${v.lv}lv ${(v.p / v.lv).toFixed(1)}/lv`).join(' | '));
let own = { state: 0, priv: 0 }; for (const b of w.buildings) if (!BUILDING_BY_ID[b.typeId].auto) own[b.stateOwned ? 'state' : 'priv'] += b.level;
console.log('levels', own);
