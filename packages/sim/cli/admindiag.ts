// 행정청 충원 진단 (AI 왕국만, 본 게임 lab 과 같은 시작: 플레이어 왕실 방치, aiSalt):
//   bash cli/fast.sh admindiag.ts [seed] [years] [salt] [--every N] [--json out.jsonl] [--run 이름] [--micro 인구]
// 매주 표본을 해마다 평균해 왕국마다 한 줄: 행정청 충원(레벨 가중), 징수율, 국영 임금 단계, 행정청이 있는 지역의 하급 귀족 소득 비교
// (저택 1인 몫 ÷ 국영 하급 귀족 임금, 시장 하급 귀족 임금 ÷ 소작 1인 소득), 하급 귀족 일터, 행정청 레벨·전문 관료제 비율.
// --every N 이면 N 일마다 지역별 줄도 찍는다. TUNE 은 환경변수 TUNE='{"key":value}' 로 덮는다.
import { createWorld, step, TUNE, getMethod, shareWage, PLAYER_ID } from '../src/index';
import { subsistenceWage } from '../src/labor';
import { workforce } from '../src/pops';
import { appendFileSync } from 'node:fs';
import { createMicroWorld } from '../src/lab/micro';
if (process.env.TUNE) Object.assign(TUNE, JSON.parse(process.env.TUNE));
const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const seed = Number(pos[0] ?? 1), years = Number(pos[1] ?? 2), salt = Number(pos[2] ?? 0);
const every = Number(opt('--every') ?? 0), json = opt('--json'), run = opt('--run') ?? 'run';
// --micro N: 마이크로 세계 (인구 N, cli/microcheck.ts --preset labor 와 같은 축소·TUNE)
const micro = Number(opt('--micro') ?? 0);
if (micro) TUNE.reserveShrinkWeeks = 1e9;
const w = micro ? createMicroWorld({ seed, aiSalt: salt, people: [micro], typeScale: { workshop: 0.15, textile: 0.25, fiber_farm: 0.25 } }) : createWorld(seed, { withPlayer: true, aiSalt: salt });
const ai = micro ? w.kingdoms : w.kingdoms.filter((k) => k.governmentId !== PLAYER_ID);
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '-'), k1 = (x: number) => (micro ? x.toFixed(1) : (x / 1e3).toFixed(1) + 'k');
type Acc = Record<string, number>;
const acc = new Map<number, Acc>();
const add = (a: Acc, k: string, v: number, wt = 1) => { if (!Number.isFinite(v)) return; a[k] = (a[k] ?? 0) + v * wt; a[k + '#'] = (a[k + '#'] ?? 0) + wt; };
const avg = (a: Acc, k: string) => (a[k + '#'] ? a[k] / a[k + '#'] : NaN);

function sample(print: boolean) {
  for (const k of ai) {
    const a = acc.get(k.id) ?? {}; acc.set(k.id, a);
    const regs = w.regions.filter((r) => r.kingdomId === k.id);
    let lv = 0, st = 0, prof = 0;
    for (const r of regs) {
      const adm = w.buildings.filter((b) => b.typeId === 'admin' && b.regionId === r.id && b.companyId === k.governmentId && b.active);
      let rl = 0, rs = 0, gSlots = 0, gEmp = 0;
      for (const b of adm) {
        const m = getMethod(b.typeId, b.methodId);
        if (!m.taxCapacity) continue;
        rl += b.level; rs += b.last.staffing * b.level;
        if (m.id === 'admin_professional') prof += b.level;
        gSlots += (m.workers.gentry ?? 0) * b.level; gEmp += b.employed.gentry;
      }
      lv += rl; st += rs;
      if (!(gSlots > 0)) continue;
      // 세습 관료제 행정청이 있는 지역: 하급 귀족 소득 비교 (자리 가중)
      const man = w.buildings.find((b) => b.regionId === r.id && b.typeId === 'manor');
      const share = man ? shareWage(man, 'gentry') : 0;
      const state = r.stateWages?.gentry ?? 0, market = r.wages?.gentry ?? 0, tenant = subsistenceWage(w, r);
      add(a, 'manorVsState', share / state, gSlots); add(a, 'marketVsTenant', market / tenant, gSlots); add(a, 'gFill', gEmp / gSlots, gSlots);
      add(a, 'share', share, gSlots); add(a, 'state', state, gSlots); add(a, 'market', market, gSlots);
      let gwf = 0, gMan = 0;
      for (const p of w.pops) if (p.regionId === r.id && p.prof === 'gentry') { const f = workforce(p); gwf += f; if (man && p.work === man.id) gMan += f; }
      add(a, 'gentryInManor', gMan / Math.max(1, gwf), gSlots);
      if (print) console.log(`    d${w.tick} K${k.id} R${r.id} 행정청 lv${rl} 귀족 ${k1(gEmp)}/${k1(gSlots)} | 저택몫 ${f2(share)} 국영 ${f2(state)} 시장 ${f2(market)} 소작 ${f2(tenant)} | 하급귀족 ${k1(gwf)} 저택 ${k1(gMan)} | 저택 이익EMA ${f2(man?.profitEma ?? 0)} 앉은 귀족 ${k1(man?.employed.aristocrat ?? 0)}`);
    }
    add(a, 'adminSt', lv > 0 ? st / lv : NaN); add(a, 'taxRatio', k.taxRatio ?? 0); add(a, 'step', k.budget.wages);
    add(a, 'zeroWeeks', lv > 0 && st / lv < 0.1 ? 1 : 0); add(a, 'adminLv', lv); add(a, 'profShare', lv > 0 ? prof / lv : NaN);
    a.lvEnd = lv; a.profEnd = prof;
    a.printing = w.companies.find((c) => c.id === k.governmentId)?.research.known.includes('printing') ? 1 : 0;
  }
}

const out: Record<string, unknown>[] = [];
for (let d = 1; d <= years * 360; d++) {
  step(w);
  if (every && w.tick % every === 0) { console.log(`  == d${w.tick}`); sample(true); }
  else if (w.tick % 7 === 0) sample(false);
  if (w.tick % 360 !== 0) continue;
  const y = w.tick / 360;
  const row: Record<string, number> = {};
  const keys = ['adminSt', 'taxRatio', 'step', 'zeroWeeks', 'manorVsState', 'marketVsTenant', 'gFill', 'gentryInManor', 'share', 'state', 'market', 'adminLv', 'profShare'];
  for (const k of ai) {
    const a = acc.get(k.id)!;
    console.log(`y${y} K${k.id} 행정청충원 ${f2(avg(a, 'adminSt'))} 0.1미만주비율 ${f2(avg(a, 'zeroWeeks'))} 징수율 ${f2(avg(a, 'taxRatio'))} 국영단계 ${f2(avg(a, 'step'))}`
      + ` | 세습행정청 지역: 저택몫/국영 ${f2(avg(a, 'manorVsState'))} (몫 ${f2(avg(a, 'share'))} 국영 ${f2(avg(a, 'state'))} 시장 ${f2(avg(a, 'market'))}) 시장/소작 ${f2(avg(a, 'marketVsTenant'))} 귀족자리채움 ${f2(avg(a, 'gFill'))} 저택에앉은비율 ${f2(avg(a, 'gentryInManor'))}`
      + ` | 행정청 lv 평균 ${f2(avg(a, 'adminLv'))} 끝 ${a.lvEnd} 전문 ${a.profEnd} 인쇄술 ${a.printing}`);
    for (const key of keys) row[key] = (row[key] ?? 0) + avg(a, key) / ai.length;
    acc.set(k.id, {});
  }
  out.push({ y, seed, salt, run, ...row });
}
if (json) for (const r of out) appendFileSync(json, JSON.stringify(r) + '\n');
