import './lowprio';
// 곡물 수급 진단 (이슈 #11: 곡물 S/D 가 1.3~1.4 에 남는다). 세계를 바꾸지 않고 읽기만 한다.
// packages/sim 에서:
//   마이크로:  npx tsx cli/graindiag.ts [--years 10] [--seed 1] [--people 400] [--arableslack 3] [--build "farm=2,..."] [--typescale "workshop=0.15"] [--preset labor]
//   본 게임:   npx tsx cli/graindiag.ts --full [--years 10] [--seed 1]
//   공통:      [--good grain] [--tune '{"aiGlutSD":1.2}'] [--weekly 1] (주마다 한 줄도 출력) [--out 파일.jsonl] (주마다 한 줄 JSON)
// 날마다 모아 주·해 평균을 낸다 (본 게임은 대륙 합, 마이크로는 지역 합):
//   공급 출처: 소작 지대(수확 × 지대율), 소작 판매(나머지), 건물(bld:종류), 상인(trader), 회수(salvage). 소작 현물 소비(자기 먹은 양)
//   수요 출처: pop 계층별, 건물별. 값/기본가, 팔린 비율(sold ÷ supply), 공급·수요 이동평균의 비
//   그 상품을 내는 AI 생산 건물(유보 기준): 레벨(방식별), 레벨 가중 가동률, 매출·원료비·인건비·이익 (b.last 합), 유보 ÷ 상한, 적자 연속 주 최대
//   농부 시장 임금 ÷ 소작 1인 소득, 1레벨 손익분기 팔린 비율 (지금 값·임금에서 이익 = 0 이 되는 sold ÷ supply)
//   지역별 예상 S/D(projectedSD, 과잉 검사가 보는 값)의 생산 레벨 가중 평균과 구간(< 1.2, 1.2~1.5, > 1.5)에 있는 생산 레벨 비율
//   AI 판단 횟수 (aiTrace): 증설(reserve)·새 투자(trial)·과잉 막힘(glutBlock)·철거(reserveShrink·trimDemo)·가동률(lossCut·utilUp)
import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { BUILDING_BY_ID, GOODS, TICKS_PER_WEEK, TICKS_PER_YEAR, TUNE, checkTuneKeys, getMethod } from '../src/data';
import { projectedSD, mainOutput } from '../src/economy';
import { createWorld, step } from '../src/index';
import { subsistenceWage } from '../src/labor';
import { harvestShares } from '../src/market';
import { reserveCap } from '../src/finance';
import { findPop } from '../src/pops';
import { wealthOf } from '../src/types';
import { aiTrace, reserveRuled } from '../src/ai';
import { createMicroWorld, restoreMicroScale } from '../src/lab/micro';
import type { MicroBuilding } from '../src/lab/micro';
import type { GoodId, World } from '../src/types';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
const FULL = args.includes('--full');
const YEARS = Number(arg('years', '10')), SEED = Number(arg('seed', '1')), SALT = Number(arg('salt', '0'));
const G = arg('good', 'grain') as GoodId;
const WEEKLY = arg('weekly', '0') !== '0';
const OUT = arg('out', '');
const TUNE_SET: Record<string, unknown> = JSON.parse(arg('tune', '{}'));
const PRESET = arg('preset', '');
if (PRESET === 'labor') TUNE_SET.shrinkWeeks ??= 1e9; // microcheck --preset labor 와 같다 (wt-simplify 1-F 뒤로 reserveShrinkWeeks 는 shrinkWeeks: 정부 건물·무역소 적자 철거도 멈춘다)
const TYPESCALE_ARG = arg('typescale', PRESET === 'labor' ? 'workshop=0.15,textile=0.25,fiber_farm=0.25' : '');
const typeScale = TYPESCALE_ARG ? Object.fromEntries(TYPESCALE_ARG.split(',').map((x) => { const [k, v] = x.split('='); return [k, Number(v)]; })) : undefined;
const BUILD = arg('build', '');
const buildings: MicroBuilding[] | undefined = BUILD ? BUILD.split(',').map((x) => {
  const [lhs, rhs] = x.split('='); const [type, method] = lhs.split(':'); const [lv, owner] = rhs.split('@');
  return { type, ...(method ? { method } : {}), levels: Number(lv), ...(owner === 'crown' ? { owner: 'crown' as const } : {}) };
}) : undefined;
const SLACK = arg('arableslack', '');

checkTuneKeys(TUNE_SET, 'graindiag --tune');
const tuneBefore: Record<string, unknown> = {};
for (const k of Object.keys(TUNE_SET)) { tuneBefore[k] = (TUNE as Record<string, unknown>)[k]; (TUNE as Record<string, unknown>)[k] = TUNE_SET[k]; }

const w: World = FULL
  ? createWorld(SEED, { withPlayer: false, aiSalt: SALT })
  : createMicroWorld({ seed: SEED, aiSalt: SALT, people: [Number(arg('people', '400'))], ...(buildings ? { buildings } : {}), ...(typeScale ? { typeScale } : {}), ...(SLACK ? { arableSlack: Number(SLACK) } : {}) });

// ---------------------------------------------------------------- AI 판단 세기
const EV_KEYS = ['reserve', 'trial', 'glutBlock', 'reserveShrink', 'trimDemo', 'trimHold', 'trimStop', 'lossCut', 'utilUp', 'keepLast'];
let ev: Record<string, number> = {};
const makesG = (typeId: string, methodId: string) => (getMethod(typeId, methodId).outputs[G] ?? 0) > 0;
aiTrace.on = (_w, _c, path, typeId, methodId, levels) => {
  if (!typeId || !methodId || !BUILDING_BY_ID[typeId] || !makesG(typeId, methodId)) return;
  ev[path] = (ev[path] ?? 0) + (path === 'reserve' || path === 'trial' ? Math.max(1, levels) : 1);
};

// ---------------------------------------------------------------- 하루 표본
interface Acc {
  days: number;
  sRent: number; sSale: number; sBld: Record<string, number>; sTrader: number; sSalvage: number; sOther: number; ownKind: number; tenantOut: number;
  dPop: Record<string, number>; dBld: Record<string, number>; dOther: number;
  S: number; D: number; sold: number; pV: number; Sema: number; Dema: number;
  lv: Record<string, number>; utilLv: number; rev: number; inCost: number; wageCost: number; resv: number; cap: number; brokeMax: number;
  wageFarm: number; tenantInc: number; nw: number; beSigma: number; nbe: number;
  psdLv: number; lvAll: number; band: [number, number, number]; pending: number; lvMin: number;
}
const newAcc = (): Acc => ({
  days: 0, sRent: 0, sSale: 0, sBld: {}, sTrader: 0, sSalvage: 0, sOther: 0, ownKind: 0, tenantOut: 0,
  dPop: {}, dBld: {}, dOther: 0, S: 0, D: 0, sold: 0, pV: 0, Sema: 0, Dema: 0,
  lv: {}, utilLv: 0, rev: 0, inCost: 0, wageCost: 0, resv: 0, cap: 0, brokeMax: 0,
  wageFarm: 0, tenantInc: 0, nw: 0, beSigma: 0, nbe: 0, psdLv: 0, lvAll: 0, band: [0, 0, 0], pending: 0, lvMin: Infinity,
});
const add = (o: Record<string, number>, k: string, v: number) => { o[k] = (o[k] ?? 0) + v; };

function sample(a: Acc) {
  a.days++;
  let lvDay = 0;
  for (const r of w.regions) {
    const m = r.market[G];
    a.S += m.supply; a.D += m.demand; a.sold += m.sold; a.pV += m.price / GOODS[G].basePrice * m.supply; a.Sema += m.supplyEma; a.Dema += m.demandEma;
    // 소작 지대·판매 나누기
    const sub = w.buildings.find((x) => x.regionId === r.id && x.typeId === 'subsistence');
    const pop = sub ? findPop(w, r.id, 'peasant', sub.id) : undefined;
    const out = sub?.last.output?.[G] ?? 0;
    const rent = pop ? out * harvestShares(w, r, wealthOf(pop)).rent : 0;
    const subS = m.supplyBy?.subsistence ?? 0;
    a.sRent += Math.min(rent, subS); a.sSale += Math.max(0, subS - rent);
    a.tenantOut += out; a.ownKind += pop?.inKind[G] ?? 0;
    for (const [k, v] of Object.entries(m.supplyBy ?? {})) {
      if (k === 'subsistence') continue;
      if (k.startsWith('bld:')) add(a.sBld, k.slice(4), v);
      else if (k === 'trader') a.sTrader += v;
      else if (k === 'salvage') a.sSalvage += v;
      else a.sOther += v;
    }
    for (const [k, v] of Object.entries(m.demandBy ?? {})) {
      if (k.startsWith('pop:')) add(a.dPop, k.slice(4), v);
      else if (k.startsWith('bld:')) add(a.dBld, k.slice(4), v);
      else a.dOther += v;
    }
    // 생산 건물 (유보 기준)
    const psd = projectedSD(w, r.id, G);
    let lvR = 0;
    for (const b of w.buildings) {
      if (b.regionId !== r.id || b.level <= 0 || !reserveRuled(b) || mainOutput(b.typeId, b.methodId) !== G) continue;
      lvR += b.level;
      add(a.lv, b.methodId, b.level);
      a.utilLv += (b.active ? b.utilization : 0) * b.level;
      a.rev += b.last.revenue; a.inCost += b.last.inputCost; a.wageCost += b.last.wageCost;
      a.resv += b.reserve ?? 0; a.cap += reserveCap(b);
      a.brokeMax = Math.max(a.brokeMax, b.brokeWeeks ?? 0);
      // 손익분기 팔린 비율: 매출 = 산출 × 값 × σ 이므로 σ* = (원료비 + 인건비) ÷ (산출 × 값)
      const outQ = b.last.output?.[G] ?? 0;
      if (outQ > 0 && m.price > 0) { a.beSigma += (b.last.inputCost + b.last.wageCost) / (outQ * m.price) * b.level; a.nbe += b.level; }
    }
    a.lvAll += lvR; lvDay += lvR;
    if (psd !== null && lvR > 0) {
      a.psdLv += psd * lvR;
      a.band[psd < 1.2 ? 0 : psd <= 1.5 ? 1 : 2] += lvR;
    }
    for (const k of w.constructions) if (k.regionId === r.id && makesG(k.typeId, k.methodId)) a.pending += k.levels ?? 1;
    // 임금 대 소작 소득 (사람 가중: 지역마다 하나씩 평균)
    const ti = subsistenceWage(w, r);
    if (r.wages && ti > 0) { a.wageFarm += r.wages.farmer; a.tenantInc += ti; a.nw++; }
  }
  a.lvMin = Math.min(a.lvMin, lvDay);
}

const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '-');
const k = (x: number) => (FULL ? `${(x / 1e3).toFixed(0)}k` : x.toFixed(1));

function summarize(a: Acc) {
  const n = Math.max(1, a.days);
  const per = (x: number) => x / n;
  const bld = Object.fromEntries(Object.entries(a.sBld).map(([t, v]) => [t, per(v)]));
  const dPop = Object.fromEntries(Object.entries(a.dPop).map(([t, v]) => [t, per(v)]));
  const dBld = Object.fromEntries(Object.entries(a.dBld).map(([t, v]) => [t, per(v)]));
  const lvSum = Object.values(a.lv).reduce((x, y) => x + y, 0);
  return {
    S: per(a.S), D: per(a.D), sd: a.D > 0 ? a.S / a.D : NaN, sdEma: a.Dema > 0 ? a.Sema / a.Dema : NaN,
    price: a.S > 0 ? a.pV / a.S : NaN, soldR: a.S > 0 ? a.sold / a.S : NaN,
    sRent: per(a.sRent), sSale: per(a.sSale), sBld: bld, sTrader: per(a.sTrader), sSalvage: per(a.sSalvage), sOther: per(a.sOther),
    tenantOut: per(a.tenantOut), ownKind: per(a.ownKind),
    dPop, dBld, dOther: per(a.dOther),
    levels: lvSum / n, lvBy: Object.fromEntries(Object.entries(a.lv).map(([t, v]) => [t, v / n])), util: lvSum > 0 ? a.utilLv / lvSum : NaN,
    rev: per(a.rev), inCost: per(a.inCost), wageCost: per(a.wageCost), margin: a.inCost + a.wageCost > 0 ? (a.rev - a.inCost - a.wageCost) / (a.inCost + a.wageCost) : NaN,
    resvFill: a.cap > 0 ? a.resv / a.cap : NaN, brokeMax: a.brokeMax,
    wageRatio: a.tenantInc > 0 ? a.wageFarm / a.tenantInc : NaN, wageFarm: a.nw ? a.wageFarm / a.nw : NaN, tenantInc: a.nw ? a.tenantInc / a.nw : NaN,
    beSigma: a.nbe > 0 ? a.beSigma / a.nbe : NaN,
    psd: a.band[0] + a.band[1] + a.band[2] > 0 ? a.psdLv / (a.band[0] + a.band[1] + a.band[2]) : NaN,
    band: a.band.map((x) => (a.lvAll > 0 ? x / a.lvAll : 0)), pending: per(a.pending), lvMin: a.lvMin,
  };
}

type Sum = ReturnType<typeof summarize>;
const HEAD = 'S/D  S/Dema  값   팔림 | 소작지대 소작판매 농장 상인 | 현물  | 수요pop 수요bld | 레벨 최소 가동 마진  유보 손익분기σ 임금/소작 | 예상S/D <1.2 ~1.5 >1.5 공사중 | AI 증설 새투자 막힘 철거 가동↓';
function line(label: string, s: Sum, e: Record<string, number>) {
  const farm = s.sBld[(Object.entries(s.sBld).sort((x, y) => y[1] - x[1])[0] ?? ['', 0])[0]] ?? 0;
  const dPop = Object.values(s.dPop).reduce((x, y) => x + y, 0), dBld = Object.values(s.dBld).reduce((x, y) => x + y, 0);
  const demo = (e.reserveShrink ?? 0) + (e.trimDemo ?? 0);
  const cut = e.lossCut ?? 0;
  return `${label} ${f(s.sd)} ${f(s.sdEma)} ${f(s.price)} ${f(s.soldR)} | ${k(s.sRent)} ${k(s.sSale)} ${k(farm)} ${k(s.sTrader)} | ${k(s.ownKind)} | ${k(dPop)} ${k(dBld)} | ${f(s.levels, 1)} ${f(s.lvMin, 0)} ${f(s.util)} ${f(s.margin)} ${f(s.resvFill)} ${f(s.beSigma)} ${f(s.wageRatio)} | ${f(s.psd)} ${s.band.map((x) => f(x)).join(' ')} ${f(s.pending, 1)} | ${e.reserve ?? 0} ${e.trial ?? 0} ${e.glutBlock ?? 0} ${demo} ${cut}`;
}

if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, ''); }
console.log(`graindiag ${FULL ? 'full' : 'micro'} seed ${SEED} salt ${SALT} ${YEARS}y good ${G} tune ${JSON.stringify(TUNE_SET)}`);
console.log(HEAD);
let week = newAcc(), year = newAcc();
let evW: Record<string, number> = {}, evY: Record<string, number> = {};
const yearRows: Sum[] = [];
for (let d = 1; d <= YEARS * TICKS_PER_YEAR; d++) {
  ev = {};
  step(w);
  for (const [x, v] of Object.entries(ev)) { add(evW, x, v); add(evY, x, v); }
  sample(week); sample(year);
  if (d % TICKS_PER_WEEK === 0) {
    const s = summarize(week);
    if (WEEKLY) console.log(line(`w${String(d / TICKS_PER_WEEK).padStart(4)}`, s, evW));
    if (OUT) appendFileSync(OUT, JSON.stringify({ t: d, week: d / TICKS_PER_WEEK, ...s, ev: evW }) + '\n');
    week = newAcc(); evW = {};
  }
  if (d % TICKS_PER_YEAR === 0) {
    const s = summarize(year);
    yearRows.push(s);
    console.log(line(`y${String(d / TICKS_PER_YEAR).padStart(4)}`, s, evY));
    year = newAcc(); evY = {};
  }
}
// 해마다 수요 계층·건물 상세
console.log('\n해마다 수요 출처 (하루 평균), 공급 건물 출처');
for (let i = 0; i < yearRows.length; i++) {
  const s = yearRows[i];
  const top = (o: Record<string, number>) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([t, v]) => `${t} ${k(v)}`).join(', ');
  console.log(`y${i + 1}  수요 pop: ${top(s.dPop)} | bld: ${top(s.dBld)} | 공급 bld: ${top(s.sBld)} | 방식 레벨: ${Object.entries(s.lvBy).map(([t, v]) => `${t} ${f(v, 1)}`).join(', ')} | 농부 임금 ${f(s.wageFarm)} 소작 1인 ${f(s.tenantInc)} | 소작 산출 ${k(s.tenantOut)}`);
}
aiTrace.on = undefined;
if (!FULL) restoreMicroScale();
for (const k2 of Object.keys(tuneBefore)) (TUNE as Record<string, unknown>)[k2] = tuneBefore[k2];
