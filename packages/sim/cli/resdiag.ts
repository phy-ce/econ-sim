// 유보 기준 AI 진단 (TUNE.aiReserveRule): 주마다 생산 건물의 유보 자산·상한·주간 손익·연속 주 수를 종류별로 찍는다.
// npx tsx cli/resdiag.ts <주 수> [시드] [TUNE JSON]
import { BUILDING_BY_ID, TICKS_PER_WEEK, TUNE } from '../src/data';
import { reserveCap } from '../src/finance';
import { aiTrace, reserveRuled } from '../src/ai';
import { createWorld, step } from '../src/index';

const weeks = Number(process.argv[2] ?? 20), seed = Number(process.argv[3] ?? 1);
Object.assign(TUNE, JSON.parse(process.argv[4] ?? '{}'));
const w = createWorld(seed);
const ev: string[] = [];
aiTrace.on = (_w, c, path, t, m, lv, _o, r) => { if (path === 'reserve' || path === 'reserveShrink' || path === 'trial') ev.push(`${path}:${c.state ? 's' : 'p'}:${t}/${m}${r != null ? '@' + r : ''}:${lv}`); };
for (let wk = 1; wk <= weeks; wk++) {
  for (let d = 0; d < TICKS_PER_WEEK; d++) step(w);
  const by = new Map<string, { n: number; lv: number; res: number; cap: number; prof: number; rich: number; broke: number; staff: number }>();
  for (const b of w.buildings) {
    if (!reserveRuled(b)) continue;
    const k = b.typeId;
    const x = by.get(k) ?? { n: 0, lv: 0, res: 0, cap: 0, prof: 0, rich: 0, broke: 0, staff: 0 };
    x.n++; x.lv += b.level; x.res += b.reserve ?? 0; x.cap += reserveCap(b); x.prof += b.profitEma * TICKS_PER_WEEK; x.rich += b.richWeeks ? 1 : 0; x.broke += b.brokeWeeks ? 1 : 0; x.staff += b.last.staffing * b.level;
    by.set(k, x);
  }
  console.log(`w${wk} ` + [...by].map(([k, x]) => `${k} n${x.n} lv${x.lv} res${Math.round(x.res / 1e3)}k/${Math.round(x.cap / 1e3)}k wk${Math.round(x.prof / 1e3)}k st${(x.staff / x.lv).toFixed(2)} r${x.rich} b${x.broke}`).join(' | '));
  if (ev.length) console.log('   ' + ev.splice(0).join(' '));
}
