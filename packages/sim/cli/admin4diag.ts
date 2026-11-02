// 행정청 레벨 감축 진단 (이슈 #4, wt-admin4): 본 게임 lab 과 같은 시작 (플레이어 왕실 방치·고정 연구, aiSalt), 매주 표본의 해 평균을 왕국마다 한 줄.
//   bash cli/fast.sh admin4diag.ts [seed] [years] [salt] [--json out.jsonl] [--run 이름]      (TUNE='{"key":value}' 로 덮는다)
// 줄: 행정청 레벨 (세습·전문), 충원, 징수율 (해 평균·해 안 최저·연말), 한도 ÷ 인구 x, 걷을 세금 taxOwed (하루),
// AI 가 보는 마지막 1레벨 손익 (valueMethod existing: 매출 = 징수율 곡선 마지막 칸 × taxOwed, 인건비, 원료비), 1레벨 평균 세수 (taxOwed × 징수율 ÷ 레벨),
// 손익 < 0 인 주 비율, 철거·증설·방식 바꾸기 레벨, 종이 충족, 국영 하급 귀족·기술자 임금, 저택 1인 몫, 국고·빚.
import './lowprio';
import { appendFileSync } from 'node:fs';
import { createWorld, step, TUNE, getMethod, shareWage, PLAYER_ID, kingdomGdp, policyStatus, taxRates } from '../src/index';
import { lawRevenue } from '../src/finance';
import { wagesAt, wageCostOf, collectionRatio, regionById } from '../src/economy';
import { marketOutlook, valueMethod } from '../src/outlook';
import { aiTrace } from '../src/ai';
import { applyFixedResearch } from '../src/lab/run';
import type { Building, World } from '../src/types';

if (process.env.TUNE) Object.assign(TUNE, JSON.parse(process.env.TUNE));
const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const seed = Number(pos[0] ?? 1), years = Number(pos[1] ?? 20), salt = Number(pos[2] ?? 0);
const json = opt('--json'), run = opt('--run') ?? 'run';
const w: World = createWorld(seed, { withPlayer: true, aiSalt: salt });
const ai = w.kingdoms.filter((k) => k.governmentId !== PLAYER_ID);
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '-');
const f0 = (x: number) => (Number.isFinite(x) ? x.toFixed(0) : '-');

type Acc = Record<string, number>;
const acc = new Map<number, Acc>();
const ev = new Map<number, Acc>();
const add = (a: Acc, k: string, v: number, wt = 1) => { if (!Number.isFinite(v)) return; a[k] = (a[k] ?? 0) + v * wt; a[k + '#'] = (a[k + '#'] ?? 0) + wt; };
const avg = (a: Acc, k: string) => (a[k + '#'] ? a[k] / a[k + '#'] : NaN);
const bump = (kid: number, key: string, v: number) => { const e = ev.get(kid) ?? {}; ev.set(kid, e); e[key] = (e[key] ?? 0) + v; };

// AI 판단 기록: 행정청 철거·증설
aiTrace.on = (tw, c, path, typeId, _m, levels) => {
  if (tw !== w || typeId !== 'admin') return;
  const k = w.kingdoms.find((x) => x.governmentId === c.id);
  if (!k) return;
  if (path === 'shrink') bump(k.id, 'shrink', -levels);
  else if (levels > 0) bump(k.id, 'built', levels);
};
const lastMethod = new Map<number, string>();
const minCR = new Map<number, number>();

function adminOf(kid: number, govId: number): Building[] {
  return w.buildings.filter((b) => b.typeId === 'admin' && b.companyId === govId && regionById(w, b.regionId).kingdomId === kid && b.level > 0);
}

function sample() {
  const o = marketOutlook(w);
  for (const k of ai) {
    const a = acc.get(k.id) ?? {}; acc.set(k.id, a);
    const gov = w.companies.find((c) => c.id === k.governmentId)!;
    const adm = adminOf(k.id, gov.id);
    let L = 0, Lp = 0, st = 0, rev = 0, wage = 0, inp = 0, prof = 0, neg = 0, negW = 0, paperFill = 0, paperLv = 0, gW = 0, gWm = 0, sW = 0, man = 0, gN = 0, sN = 0;
    for (const b of adm) {
      const m = getMethod(b.typeId, b.methodId);
      if (!m.taxCapacity) continue;
      if (lastMethod.has(b.id) && lastMethod.get(b.id) !== b.methodId) bump(k.id, m.inputs.paper ? 'toProf' : 'toHered', b.level);
      lastMethod.set(b.id, b.methodId);
      L += b.level; st += b.last.staffing * b.level;
      if (m.inputs.paper) { Lp += b.level; paperFill += b.last.inputFill * b.level; paperLv += b.level; }
      const r = regionById(w, b.regionId);
      const hungry = TUNE.starveWeeks > 0 && (b.starvedWeeks ?? 0) >= TUNE.starveWeeks;
      const v = valueMethod(w, o, r, gov, b.typeId, m, 1, true, hungry ? b.last.inputFill : undefined);
      rev += v.revenue / v.utilization * b.level; wage += v.wageCost / v.utilization * b.level; inp += v.inputCost / v.utilization * b.level; prof += v.profit * b.level;
      if (v.profit < 0) neg += b.level;
      negW = Math.max(negW, b.negWeeks ?? 0);
      const wg = wagesAt(gov, 'admin', w, r.id);
      if (m.workers.gentry) { gW += wg.gentry * b.level; gWm += (r.wages?.gentry ?? 0) * b.level; const mn = w.buildings.find((x) => x.regionId === r.id && x.typeId === 'manor'); man += (mn ? shareWage(mn, 'gentry') : 0) * b.level; gN += b.level; }
      if (m.workers.skilled) { sW += wg.skilled * b.level; sN += b.level; }
      void wageCostOf;
    }
    const cr = k.taxRatio ?? 0, people = k.taxDue ?? 0, cap = k.taxCapacity ?? 0, owed = k.taxOwed ?? 0;
    minCR.set(k.id, Math.min(minCR.get(k.id) ?? 1, cr));
    add(a, 'L', L); add(a, 'Lp', Lp); add(a, 'st', L > 0 ? st / L : NaN); add(a, 'cr', cr); add(a, 'x', people > 0 ? cap / people : NaN);
    add(a, 'owed', owed); add(a, 'people', people / 1e6);
    if (L > 0) {
      add(a, 'mRev', rev / L); add(a, 'wage', wage / L); add(a, 'inp', inp / L); add(a, 'mProf', prof / L); add(a, 'negSh', neg / L);
      add(a, 'avgRev', (owed * cr) / L);
      // 전체를 헐었을 때 잃는 세금 ÷ 레벨 (평균) − 레벨당 비용
      add(a, 'avgProf', (owed * cr) / L - (wage + inp) / L);
    }
    add(a, 'negW', negW);
    if (paperLv > 0) add(a, 'paperFill', paperFill / paperLv);
    if (gN > 0) { add(a, 'gW', gW / gN); add(a, 'gWm', gWm / gN); add(a, 'manShare', man / gN); }
    if (sN > 0) add(a, 'sW', sW / sN);
    a.Lend = L; a.Lpend = Lp; a.crEnd = cr; a.cash = gov.cash / 1e6; a.debt = gov.debt / 1e6; a.gdp = kingdomGdp(w, k.id) / 1e6;
    a.printing = gov.research.known.includes('printing') ? 1 : 0;
    a.taxStep = k.budget.tax;
    // 세법: 지금 법, 바꾸는 중, 고를 수 있는 법, 법마다 예상 세입 (징수율 전), 소작농 비율, 인두세 ÷ 1인 소득
    a.law = ['land', 'poll', 'income'].indexOf(k.taxLaw);
    a.lawPending = k.lawChange?.tax ? ['land', 'poll', 'income'].indexOf(k.lawChange.tax.to) : -1;
    if (w.tick % 28 === 0) {
      const st = policyStatus(w, k.id);
      a.pollOk = st.tax.options.find((o) => o.id === 'poll')?.eligible ? 1 : 0;
      a.pollUnlocked = st.tax.options.find((o) => o.id === 'poll')?.unlocked ? 1 : 0;
      a.finRatio = st.financeRatio;
      add(a, 'revLand', lawRevenue(w, k, 'land')); add(a, 'revPoll', lawRevenue(w, k, 'poll'));
      let peas = 0, all = 0, inc = 0, np = 0;
      for (const p of w.pops) { if (regionById(w, p.regionId).kingdomId !== k.id) continue; all += p.size; if (p.prof === 'peasant') peas += p.size; else { inc += Math.max(0, p.incomeEma); np += p.size; } }
      add(a, 'peasSh', all > 0 ? peas / all : NaN);
      add(a, 'pollVsInc', np > 0 && inc > 0 ? taxRates(k, 'poll').poll / (inc / np) : NaN);
    }
    // 행정청 1레벨 감당 인구 ÷ 인구 (곡선 위 한 칸 크기)
    a.step = people > 0 ? getMethod('admin', 'admin_hereditary').taxCapacity! * TUNE.adminScale / people : NaN;
    void collectionRatio;
  }
}

const out: Record<string, unknown>[] = [];
const end = years * 360;
while (w.tick < end) {
  applyFixedResearch(w, PLAYER_ID);
  step(w);
  if (w.tick % 7 === 0) sample();
  if (w.tick % 360 !== 0) continue;
  const y = w.tick / 360;
  const row: Record<string, number | string> = { y, seed, salt, run };
  for (const k of ai) {
    const a = acc.get(k.id)!, e = ev.get(k.id) ?? {};
    const mn = minCR.get(k.id) ?? NaN;
    console.log(`y${y} K${k.id} lv ${f0(a.Lend)} (전문 ${f0(a.Lpend)}) 충원 ${f2(avg(a, 'st'))} | 징수 평균 ${f2(avg(a, 'cr'))} 최저 ${f2(mn)} 연말 ${f2(a.crEnd)} x ${f2(avg(a, 'x'))} 한칸 ${f2(a.step)}`
      + ` | 걷을세금 ${f0(avg(a, 'owed'))}/일 인구 ${f2(avg(a, 'people'))}M 세금단계 ${a.taxStep}`
      + ` | 1lv: 마지막칸 ${f0(avg(a, 'mRev'))} 평균 ${f0(avg(a, 'avgRev'))} 임금 ${f0(avg(a, 'wage'))} 원료 ${f0(avg(a, 'inp'))} 손익 ${f0(avg(a, 'mProf'))} 음수비율 ${f2(avg(a, 'negSh'))} negW최대 ${f0(avg(a, 'negW'))}`
      + ` | 철거 ${e.shrink ?? 0} 증설 ${e.built ?? 0} →전문 ${e.toProf ?? 0} →세습 ${e.toHered ?? 0} 종이 ${f2(avg(a, 'paperFill'))} 인쇄 ${a.printing}`
      + ` | 법 ${['토지', '인두', '소득'][a.law]}${a.lawPending >= 0 ? '→' + ['토지', '인두', '소득'][a.lawPending] : ''} 인두열림 ${a.pollUnlocked} 가능 ${a.pollOk} 금융 ${f2(a.finRatio)} 세입 토지 ${f0(avg(a, 'revLand'))} 인두 ${f0(avg(a, 'revPoll'))} 소작비율 ${f2(avg(a, 'peasSh'))} 인두/소득 ${f2(avg(a, 'pollVsInc'))}`
      + ` | 귀족 국영 ${f2(avg(a, 'gW'))} 시장 ${f2(avg(a, 'gWm'))} 저택몫 ${f2(avg(a, 'manShare'))} 기술자 국영 ${f2(avg(a, 'sW'))} | 국고 ${f2(a.cash)} 빚 ${f2(a.debt)} GDP ${f2(a.gdp)}`);
    const p = `k${k.id}.`;
    row[p + 'L'] = a.Lend; row[p + 'Lp'] = a.Lpend; row[p + 'st'] = avg(a, 'st'); row[p + 'cr'] = avg(a, 'cr'); row[p + 'crMin'] = mn; row[p + 'crEnd'] = a.crEnd;
    row[p + 'x'] = avg(a, 'x'); row[p + 'owed'] = avg(a, 'owed'); row[p + 'mRev'] = avg(a, 'mRev'); row[p + 'avgRev'] = avg(a, 'avgRev'); row[p + 'wage'] = avg(a, 'wage');
    row[p + 'inp'] = avg(a, 'inp'); row[p + 'mProf'] = avg(a, 'mProf'); row[p + 'negSh'] = avg(a, 'negSh'); row[p + 'shrink'] = e.shrink ?? 0; row[p + 'built'] = e.built ?? 0;
    row[p + 'toProf'] = e.toProf ?? 0; row[p + 'paperFill'] = avg(a, 'paperFill'); row[p + 'gW'] = avg(a, 'gW'); row[p + 'manShare'] = avg(a, 'manShare'); row[p + 'sW'] = avg(a, 'sW');
    row[p + 'cash'] = a.cash; row[p + 'debt'] = a.debt; row[p + 'gdp'] = a.gdp; row[p + 'people'] = avg(a, 'people');
    row[p + 'law'] = a.law; row[p + 'revLand'] = avg(a, 'revLand'); row[p + 'revPoll'] = avg(a, 'revPoll'); row[p + 'peasSh'] = avg(a, 'peasSh'); row[p + 'pollVsInc'] = avg(a, 'pollVsInc'); row[p + 'pollOk'] = a.pollOk; row[p + 'finRatio'] = a.finRatio; row[p + 'taxStep'] = a.taxStep;
    acc.set(k.id, {}); ev.set(k.id, {}); minCR.delete(k.id);
  }
  // AI 왕국 합·평균
  const ks = ai.map((k) => `k${k.id}.`);
  const sum = (key: string) => ks.reduce((s, p) => s + (Number(row[p + key]) || 0), 0);
  const mean = (key: string) => sum(key) / ks.length;
  Object.assign(row, { L: sum('L'), Lp: sum('Lp'), cr: mean('cr'), crMin: Math.min(...ks.map((p) => Number(row[p + 'crMin']))), crEnd: mean('crEnd'), shrink: sum('shrink'), built: sum('built'), cash: sum('cash'), debt: sum('debt'), gdp: sum('gdp') });
  out.push(row);
  if (json) appendFileSync(json, JSON.stringify(row) + '\n');
}
