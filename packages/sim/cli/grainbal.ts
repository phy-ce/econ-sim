// 원자재 수급 진단: npx tsx cli/grainbal.ts [seed] [days,...]  (기본 시드 1, 1·30·180·360·1800·7200일)
// 날마다: 계층 비율(소작농 = 소작지 + 땅 없음), 노동자 일자리, 곡물·목재·섬유의 대륙 공급/수요(출처별)와 지역별 값(기본가 대비)
import { GOODS, TUNE, SUBSISTENCE } from '../src/data';
import { createWorld, step } from '../src/index';
import type { GoodId, World } from '../src/types';

const seed = Number(process.argv[2] ?? 1);
const days = (process.argv[3] ?? '1,30,180,360,1800,7200').split(',').map(Number);
const over = process.argv[4] ? JSON.parse(process.argv[4]) : {};
const { subsistence, ...tune } = over;
Object.assign(TUNE, tune);
if (subsistence) Object.assign(SUBSISTENCE, subsistence);
const w = createWorld(seed, { withPlayer: false });
const k = (x: number) => `${Math.round(x / 1e3)}k`;

function report(w: World) {
  const by: Record<string, number> = {};
  let total = 0, jobless = 0;
  for (const p of w.pops) {
    const key = p.prof === 'peasant' ? (p.work === 0 ? 'peasant(무토지)' : 'peasant') : p.work === 0 ? `${p.prof}(실업)` : p.prof;
    by[key] = (by[key] ?? 0) + p.size; total += p.size;
    if (p.work === 0 && p.prof !== 'peasant') jobless += p.size;
  }
  console.log(`day ${w.tick} 인구 ${(total / 1e6).toFixed(2)}M  ` + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${(100 * n / total).toFixed(1)}%`).join(', '));
  const lv: Record<string, number> = {};
  for (const b of w.buildings) if (b.typeId !== 'subsistence' && b.typeId !== 'manor' && b.typeId !== 'finance') lv[b.typeId] = (lv[b.typeId] ?? 0) + b.level;
  console.log('  건물 ' + Object.entries(lv).map(([t, n]) => `${t} ${n}`).join(', '));
  for (const g of ['grain', 'timber', 'fiber', 'food'] as GoodId[]) {
    const sBy: Record<string, number> = {}, dBy: Record<string, number> = {};
    let s = 0, d = 0;
    for (const r of w.regions) {
      const m = r.market[g];
      for (const [x, v] of Object.entries(m.supplyBy ?? {})) { sBy[x] = (sBy[x] ?? 0) + v; s += v; }
      for (const [x, v] of Object.entries(m.demandBy ?? {})) { dBy[x] = (dBy[x] ?? 0) + v; d += v; }
    }
    const fmt = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([x, v]) => `${x} ${k(v)}`).join(', ');
    const prices = w.regions.map((r) => `r${r.id}:${(r.market[g].price / GOODS[g].basePrice).toFixed(2)}`).join(' ');
    console.log(`  ${g} 공급 ${k(s)} 수요 ${k(d)} (비 ${(s / Math.max(1, d)).toFixed(2)})  값 ${prices}\n    공급: ${fmt(sBy)}\n    수요: ${fmt(dBy)}`);
  }
}

const last = Math.max(...days);
for (let d = 1; d <= last; d++) {
  step(w);
  if (days.includes(d)) report(w);
}
