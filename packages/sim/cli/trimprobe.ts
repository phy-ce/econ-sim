import './lowprio';
// 넘침 퇴출 진단 (이슈 #11 F3): 마이크로·본 게임에서 곡물 농장 1레벨의 산출 o 와 그 일꾼 식구의 곡물 수요 d (ai.ts workerDemandPerLevel 과 같은 셈)를 주마다 낸다.
//   npx tsx cli/trimprobe.ts [--full] [--weeks 200] [--seed 1] [--tune '{..}'] (마이크로 설정은 graindiag 진단과 같다)
import { TICKS_PER_WEEK, overrideTune } from '../src/data';
import { createWorld, step } from '../src/index';
import { mainOutput } from '../src/economy';
import { reserveRuled } from '../src/ai';
import { createMicroWorld, restoreMicroScale } from '../src/lab/micro';
import { workforce } from '../src/pops';
import type { World } from '../src/types';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
const FULL = args.includes('--full');
const WEEKS = Number(arg('weeks', '200')), SEED = Number(arg('seed', '1')), EVERY = Number(arg('every', '13'));
overrideTune(JSON.parse(arg('tune', '{}')), 'trimprobe --tune');
const w: World = FULL ? createWorld(SEED, { withPlayer: false })
  : createMicroWorld({ seed: SEED, people: [400], typeScale: { farm: 0.25, workshop: 0.15, textile: 0.25, fiber_farm: 0.25 },
    buildings: [{ type: 'farm', method: 'farm_tools', levels: 8 }, { type: 'fiber_farm', levels: 1 }, { type: 'lumber', levels: 1 }, { type: 'textile', method: 'textile_hand', levels: 1 }, { type: 'workshop', levels: 1 }, { type: 'builder', levels: 1, owner: 'crown' }, { type: 'admin', levels: 1, owner: 'crown' }] });
for (let wk = 1; wk <= WEEKS; wk++) {
  for (let d = 0; d < TICKS_PER_WEEK; d++) step(w);
  if (wk % EVERY) continue;
  const cls = new Map<string, number>();
  for (const p of w.pops) cls.set(`${p.regionId}|${p.prof}`, (cls.get(`${p.regionId}|${p.prof}`) ?? 0) + p.size);
  let O = 0, Dd = 0, L = 0, ppl = 0, wf = 0, S = 0, D = 0;
  for (const r of w.regions) { S += r.market.grain.supplyEma; D += r.market.grain.demandEma; }
  for (const b of w.buildings) {
    if (b.level <= 0 || !reserveRuled(b) || mainOutput(b.typeId, b.methodId) !== 'grain') continue;
    const by = w.regions.find((r) => r.id === b.regionId)!.market.grain.demandByEma ?? {};
    L += b.level; O += b.last.output.grain ?? 0;
    for (const p of w.pops) if (p.work === b.id) { ppl += p.size; wf += workforce(p); Dd += (by[`pop:${p.prof}`] ?? 0) * p.size / (cls.get(`${p.regionId}|${p.prof}`) ?? 1); }
  }
  let pop = 0; for (const p of w.pops) pop += p.size;
  console.log(`w${wk} levels ${L} o/lv ${(O / Math.max(1, L)).toFixed(2)} d/lv ${(Dd / Math.max(1, L)).toFixed(2)} d/o ${(Dd / Math.max(1e-9, O)).toFixed(2)} people/lv ${(ppl / Math.max(1, L)).toFixed(1)} workers/lv ${(wf / Math.max(1, L)).toFixed(1)} S/D ${(S / D).toFixed(2)} D/person ${(D / pop).toFixed(3)}`);
}
if (!FULL) restoreMicroScale();
