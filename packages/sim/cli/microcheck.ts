// 마이크로 세계 균형 점검 (src/lab/micro.ts, 2026-11-01 사용자 지시: 작은 모델에서 모든 사람을 추적하며 먼저 확인한다).
// packages/sim 에서:  npx tsx cli/microcheck.ts [--years 10] [--seed 1] [--at 360] [--runs base,jobs,cloth,people,control] [--every 7] [--out 파일접두] [--scale 0.02] [--people 400] [--floors 0]
//                       [--build "farm=2,lumber=1,workshop=1,builder=1@crown,admin=1@crown"]  (시작 건물: 종류[:방식]=레벨[@crown])
//                       [--tune '{"wageMarket":1,"wageMarketRate":0.005}']  (실행마다 TUNE 을 바꾸고 끝나면 되돌린다)
//                       [--typescale "workshop=0.15,textile=0.25"]  (건물 종류별 추가 축소, micro.ts MicroOptions.typeScale)
//                       [--preset labor]  (노동시장 검증용 살아 있는 세계: typescale workshop=0.15,textile=0.25,fiber_farm=0.25 + TUNE reserveShrinkWeeks 1e9.
//                                         기본 세계는 공방·방직 1레벨이 지역 수요의 몇 배라 값이 바닥에 붙어 적자 → 유보 규칙으로 헐리고 → 공구가 끊겨 3년차에 생산 건물이 0 이 된다)
//                       [--sections abcdj]  (j = 노동시장 판정 J1~J4·M 시나리오·해마다 직종 소득 표)
//   (빠르게: bash cli/fast.sh microcheck.ts ...)
// 실행마다 <접두>-<이름>.jsonl 에 관측 줄(src/lab/microtrace.ts, --every 일마다: pop·건물·시장·노동시장·회사·화폐 전부)과 끝에 요약 줄 하나를 쓴다.
// 판정은 시험 실패가 아니라 표다 (사용자: 시험은 코드 문제만 판정한다). 종료 코드는 늘 0 (실행 오류만 1).
//
// 실행 (같은 시드·같은 시작):
//   base    충격 없음
//   jobs    --at 일에 민간 곡물 농장 2레벨을 공사 없이 더한다 (땅도 2칸 더함): 농부 일자리 +20(배율 1/50), 곡물 공급 + (일손 수요·공급 충격)
//   cloth   --at 일부터 의복 필요(clothing·standard_clothing) × 1.5 (상품 수요 충격)
//   people  --at 일에 소작농 100명(식구 포함, 저축 0) 추가 (일손 공급 충격)
//   control 축소 대조: 배율 1, 인구 × 50, 계층 반올림 단위 50 (축소가 결과를 바꾸는지. 값은 1인당이라 같은 표로 읽는다)
//   jobsbig --at 일에 민간 곡물 농장 4레벨 (농부 일자리 +40, 소작 예비를 거의 다 쓰는 일손 부족, LABOR_MARKET.md M2)
//   cut     --at 일에 곡물 농장을 없앤다 (일손 과잉, M3)
//   rent    --at 일에 지대(TUNE.rentShare) +0.2, 26주 뒤 되돌림 (바깥 선택지 충격, M4)
//   skill   --at 일에 장인 가구(furniture_luxury) 2레벨: 기술자 자리 약 +5, 자격자보다 많다 (숙련 부족, M5)
//   two     지역 2개 (인구 --people 씩), 시작 건물은 지역 0 에만 (지역 0 일손 부족·지역 1 과잉, M6)
//
// 점검 (주 단위 표본):
//   (a) 상품: S/D(공급·수요 이동평균의 비) > 1.05 인 주에 다음 주 가격이 내렸나(또는 바닥), < 0.95 면 올랐나(또는 천장). 12주 뒤 |ln S/D| 가 줄었나. 해마다 S/D
//   (b) 노동: 회사·직종별 빈자리율 > 5% 인 주에 다음 주 임금이 올랐나, < 2% 면 내렸나. 실업(구직자) > 빈자리 인 주에 임금이 내렸나. 임금이 오른 뒤 4주 안에 고용이 늘었나
//   (c) 노동자(일하는 노동자·농부) 1인 소득·부·생활수준 대 소작농. 해마다
//   (d) 화폐: 매일 moneyIdentity 어긋남 (화폐 총량 대비)
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { BUILDING_BY_ID, TICKS_PER_WEEK, TICKS_PER_YEAR, TUNE } from '../src/data';
import { isGovernment } from '../src/economy';
import { step } from '../src/index';
import { createHash } from 'node:crypto';
import { applyMicroShock, createMicroWorld, microInfo, restoreMicroScale } from '../src/lab/micro';
import type { MicroBuilding, MicroOptions, MicroShock } from '../src/lab/micro';
import { microTrace } from '../src/lab/microtrace';
import type { MicroRow } from '../src/lab/microtrace';
import type { World } from '../src/types';
import { laborJudge, laborYearly } from './microjudge';
import { moneyIdentity, totalMoney } from '../src/index';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
const YEARS = Number(arg('years', '10')), SEED = Number(arg('seed', '1')), AT = Number(arg('at', '360')), EVERY = Number(arg('every', '7'));
const OUT = arg('out', '');
const RUNS = arg('runs', 'base,jobs,cloth,people,control').split(',');
const SCALE = Number(arg('scale', String(1 / 50))), PEOPLE = Number(arg('people', '400')), FLOORS = arg('floors', '1') !== '0';
/** --build "farm=2,textile:textile_hand=1,builder=1@crown" → 시작 건물 (없으면 기본 MICRO_DEFAULT_BUILDINGS) */
const BUILD = arg('build', '');
const buildings: MicroBuilding[] | undefined = BUILD ? BUILD.split(',').map((x) => {
  const [lhs, rhs] = x.split('='); const [type, method] = lhs.split(':'); const [lv, owner] = rhs.split('@');
  return { type, ...(method ? { method } : {}), levels: Number(lv), ...(owner === 'crown' ? { owner: 'crown' as const } : {}) };
}) : undefined;
const KEY_GOODS = ['grain', 'fiber', 'timber', 'cloth', 'tools', 'furniture', 'liquor'];
const PRESET = arg('preset', '');
const TUNE_SET: Record<string, unknown> = { ...(PRESET === 'labor' ? { reserveShrinkWeeks: 1e9 } : {}), ...JSON.parse(arg('tune', '{}')) };
const TYPESCALE_ARG = arg('typescale', PRESET === 'labor' ? 'workshop=0.15,textile=0.25,fiber_farm=0.25' : '');
const typeScale: Record<string, number> | undefined = TYPESCALE_ARG ? Object.fromEntries(TYPESCALE_ARG.split(',').map((x) => { const [k, v] = x.split('='); return [k, Number(v)]; })) : undefined;
const SECTIONS = arg('sections', 'abcd');

/** 실행 안의 TUNE 충격 (관측용 개입, 실행이 끝나면 되돌린다) */
type LabShock = MicroShock | { t: number; kind: 'tune'; set: Record<string, number> };
export interface RunDef { name: string; opts: MicroOptions; shocks: LabShock[] }
const baseOpts: MicroOptions = { seed: SEED, scale: SCALE, people: [PEOPLE], floors: FLOORS, ...(buildings ? { buildings } : {}), ...(typeScale ? { typeScale } : {}) };
const RENT0 = TUNE.rentShare;
const DEFS: Record<string, RunDef> = {
  base: { name: 'base', opts: baseOpts, shocks: [] },
  jobs: { name: 'jobs', opts: baseOpts, shocks: [{ t: AT, kind: 'build', type: 'farm', levels: 2 }] },
  jobsbig: { name: 'jobsbig', opts: baseOpts, shocks: [{ t: AT, kind: 'build', type: 'farm', levels: 4 }] },
  cut: { name: 'cut', opts: baseOpts, shocks: [{ t: AT, kind: 'remove', type: 'farm' }] },
  rent: { name: 'rent', opts: baseOpts, shocks: [{ t: AT, kind: 'tune', set: { rentShare: RENT0 + 0.2 } }, { t: AT + 26 * TICKS_PER_WEEK, kind: 'tune', set: { rentShare: RENT0 } }] },
  skill: { name: 'skill', opts: baseOpts, shocks: [{ t: AT, kind: 'build', type: 'furniture', method: 'furniture_luxury', levels: 2 }] },
  two: { name: 'two', opts: { ...baseOpts, people: [PEOPLE, PEOPLE] }, shocks: [] },
  cloth: { name: 'cloth', opts: baseOpts, shocks: [{ t: AT, kind: 'need', mul: { clothing: 1.5, standard_clothing: 1.5 } }] },
  people: { name: 'people', opts: baseOpts, shocks: [{ t: AT, kind: 'people', n: Math.round(PEOPLE / 4) }] },
  control: { name: 'control', opts: { ...baseOpts, scale: 1, people: [PEOPLE * Math.round(1 / SCALE)], personUnit: Math.round(1 / SCALE) }, shocks: [] },
};

/** 주 표본 하나 (1인당·비율로 줄인 값) */
export interface Week {
  t: number;
  goods: Record<string, { p: number; base: number; S: number; D: number }>;
  /** 회사id:직종 → 자리·고용·임금 (정부 건물 빼고) */
  jobs: Record<string, { cap: number; emp: number; wage: number }>;
  /** 노동자·농부: 빈자리, 실업 구직자, 소작 노동 인구, 노동 인구 전체 */
  lowVac: number; lowUnemp: number; tenants: number; lowWf: number;
  tenantInc: number;
  worker: { inc: number; wealth: number; sol: number; n: number };
  tenant: { inc: number; wealth: number; sol: number; n: number };
  levels: number; buildings: string;
  firmCash: number; crownCash: number; crownDebt: number; cons: number;
  /** 회사 id → 지난주 손익 */
  profit: Record<string, number>;
  /** 노동시장 판정용: 지역마다 직종마다 시장 임금·자리 D·오려는 사람 S·고용, 소작 1인 소득 */
  lab: { r: number; s: string; w: number; D: number; S: number; emp: number; vac: number }[];
  tenantBy: Record<number, number>;
  /** 계층 1인 하루 소득 (식구 포함, 일하는 사람만, 소작은 현물 포함): 소작·노동자(노동자+농부)·기술자·전문가·하급 귀족·상급 귀족·자본가 */
  cls: Record<string, number>;
}

function summarizeWeek(row: MicroRow): Week {
  const goods: Week['goods'] = {};
  for (const m of row.mkts) if (m.r === row.mkts[0]?.r) goods[m.g] = { p: m.p, base: m.base, S: m.Sema, D: m.Dema };
  const jobs: Week['jobs'] = {};
  for (const b of row.blds) {
    if (BUILDING_BY_ID[b.type].auto || isGovernment(b.type)) continue;
    for (const s of Object.keys(b.slots) as (keyof typeof b.slots)[]) {
      const k = `${b.co}:${s}`;
      const j = (jobs[k] ??= { cap: 0, emp: 0, wage: b.wage[s] ?? 0 });
      j.cap += b.slots[s] ?? 0; j.emp += b.emp[s] ?? 0; j.wage = b.wage[s] ?? j.wage;
    }
  }
  let lowVac = 0, lowUnemp = 0, tenants = 0, tenantInc = 0;
  for (const l of row.labor) if (l.s === 'unskilled' || l.s === 'farmer') { lowVac += l.vac; tenants = l.tenants; tenantInc = l.tenantInc; }
  const lowRows = row.labor.filter((l) => l.s === 'unskilled');
  lowUnemp = lowRows.reduce((a, l) => a + l.unemp, 0);
  const acc = () => ({ inc: 0, wealth: 0, sol: 0, n: 0 });
  const worker = acc(), tenant = acc();
  let lowWf = 0;
  for (const p of row.pops) {
    const lower = p.prof === 'unskilled' || p.prof === 'farmer' || p.prof === 'peasant';
    if (lower) lowWf += p.wf;
    const a = (p.prof === 'unskilled' || p.prof === 'farmer') && p.work ? worker : p.prof === 'peasant' && p.workType === 'subsistence' ? tenant : null;
    if (!a) continue;
    a.inc += p.incEma + p.kind; a.wealth += p.wealth * p.size; a.sol += p.sol * p.size; a.n += p.size;
  }
  for (const a of [worker, tenant]) if (a.n > 0) { a.inc /= a.n; a.wealth /= a.n; a.sol /= a.n; }
  const prod = row.blds.filter((b) => !BUILDING_BY_ID[b.type].auto && !isGovernment(b.type));
  return {
    t: row.t, goods, jobs, lowVac, lowUnemp, tenants, lowWf, tenantInc, worker, tenant,
    levels: prod.reduce((a, b) => a + b.lvl, 0), buildings: prod.map((b) => `${b.type}${b.lvl}`).join(' '),
    firmCash: row.cos.find((c) => !c.state)?.cash ?? 0, crownCash: row.cos.find((c) => c.state)?.cash ?? 0, crownDebt: row.cos.find((c) => c.state)?.debt ?? 0, cons: row.constructions.length,
    profit: Object.fromEntries(row.cos.map((c) => [String(c.id), c.lastWeekProfit])),
    lab: row.labor.map((l) => ({ r: l.r, s: l.s, w: l.market, D: l.D, S: l.S, emp: l.emp, vac: l.vac })),
    tenantBy: Object.fromEntries(row.labor.filter((l) => l.s === 'unskilled').map((l) => [l.r, l.tenantInc])),
    cls: classIncome(row),
  };
}

/** 계층 1인 하루 소득 (일하는 pop 만): (incomeEma + 현물) ÷ 인원 */
function classIncome(row: MicroRow): Record<string, number> {
  const acc: Record<string, { inc: number; n: number }> = {};
  for (const p of row.pops) {
    if (!p.work) continue;
    const k = p.prof === 'peasant' ? (p.workType === 'subsistence' ? 'tenant' : null) : p.prof === 'unskilled' || p.prof === 'farmer' ? 'labour' : p.prof;
    if (!k) continue;
    const a = (acc[k] ??= { inc: 0, n: 0 });
    a.inc += p.incEma + p.kind; a.n += p.size;
  }
  return Object.fromEntries(Object.entries(acc).filter(([, a]) => a.n > 0).map(([k, a]) => [k, a.inc / a.n]));
}

export interface RunResult { def: RunDef; weeks: Week[]; drift: number; driftAbs: number; driftTick: number; ms: number; rows: number; hash: string; same?: boolean }

const stateHash = (w: World) => createHash('sha1').update(JSON.stringify({ ...w, config: { ...w.config, rulesHash: '' } })).digest('hex').slice(0, 12);

/** J1 결정성: 같은 시드로 다시 돌리며 중간(reloadAt 일)에 JSON 저장/불러오기를 한 번 해서 끝 상태가 같은지 */
function replay(def: RunDef, reloadAt: number): string {
  const saved: Record<string, unknown> = {};
  for (const k of Object.keys(TUNE_SET)) saved[k] = (TUNE as Record<string, unknown>)[k];
  Object.assign(TUNE, TUNE_SET);
  const tuneSaved: Record<string, number> = {};
  let w = createMicroWorld(def.opts);
  const shocks = [...def.shocks];
  for (let d = 0; d < YEARS * TICKS_PER_YEAR; d++) {
    for (const s of shocks) if (s.t === w.tick) applyShock(w, s, tuneSaved);
    if (w.tick === reloadAt) w = JSON.parse(JSON.stringify(w)) as World;
    step(w);
  }
  const h = stateHash(w);
  Object.assign(TUNE, tuneSaved);
  restoreMicroScale();
  Object.assign(TUNE, saved);
  return h;
}

function applyShock(w: World, s: LabShock, tuneSaved: Record<string, number>) {
  if (s.kind !== 'tune') { applyMicroShock(w, s); return; }
  for (const [k, v] of Object.entries(s.set)) { if (!(k in tuneSaved)) tuneSaved[k] = (TUNE as unknown as Record<string, number>)[k]; (TUNE as unknown as Record<string, number>)[k] = v; }
}

function run(def: RunDef): RunResult {
  const t0 = Date.now();
  const saved: Record<string, unknown> = {};
  for (const k of Object.keys(TUNE_SET)) saved[k] = (TUNE as Record<string, unknown>)[k];
  Object.assign(TUNE, TUNE_SET);
  const tuneSaved: Record<string, number> = {};
  const w = createMicroWorld(def.opts);
  const file = OUT ? `${OUT}-${def.name}.jsonl` : '';
  if (file) { mkdirSync(dirname(file) || '.', { recursive: true }); writeFileSync(file, JSON.stringify({ kind: 'meta', run: def.name, opts: def.opts, shocks: def.shocks, info: microInfo(w) }) + '\n'); }
  const weeks: Week[] = [];
  const m0 = moneyIdentity(w);
  let drift = 0, driftAbs = 0, driftTick = 0, rows = 0;
  const shocks = [...def.shocks];
  let buf: string[] = [];
  const write = (row: MicroRow) => { if (!file) return; buf.push(JSON.stringify(row)); rows++; if (buf.length >= 50) { appendFileSync(file, buf.join('\n') + '\n'); buf = []; } };
  write(microTrace(w));
  for (let d = 0; d < YEARS * TICKS_PER_YEAR; d++) {
    for (const s of shocks) if (s.t === w.tick) applyShock(w, s, tuneSaved);
    step(w);
    const dev = Math.abs(moneyIdentity(w) - m0);
    const rel = dev / Math.max(1, totalMoney(w));
    if (rel > drift) { drift = rel; driftAbs = dev; driftTick = w.tick; }
    const sample = w.tick % TICKS_PER_WEEK === 0, out = w.tick % EVERY === 0;
    if (sample || out) {
      const row = microTrace(w);
      if (sample) weeks.push(summarizeWeek(row));
      if (out) write(row);
    }
  }
  if (file && buf.length) appendFileSync(file, buf.join('\n') + '\n');
  const hash = stateHash(w);
  Object.assign(TUNE, tuneSaved);
  restoreMicroScale();
  Object.assign(TUNE, saved);
  return { def, weeks, drift, driftAbs, driftTick, ms: Date.now() - t0, rows, hash };
}

// ---------------------------------------------------------------- 표

const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '-');
const pct = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '-');
const pad = (s: string, n: number) => s.padStart(n);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const gmean = (xs: number[]) => { const v = xs.filter((x) => x > 0 && Number.isFinite(x)); return v.length ? Math.exp(mean(v.map(Math.log))) : NaN; };
const byYear = (r: RunResult) => Array.from({ length: YEARS }, (_, y) => r.weeks.filter((wk) => wk.t > y * TICKS_PER_YEAR && wk.t <= (y + 1) * TICKS_PER_YEAR));
const FLOOR = 0.25, CEIL = 1.75; // economy.ts priceBounds 기본

/** (a) 상품 점검 */
function goodsCheck(r: RunResult) {
  const out: Record<string, unknown> = {};
  console.log(`\n(a) 상품 [${r.def.name}]  S/D>1.05 주: 다음 주 값 내림(바닥 포함) / 12주 뒤 |ln S/D| 줄어듦,  S/D<0.95 주: 값 오름(천장 포함) / 12주 뒤 줄어듦,  |S/D−1|<0.1 인 주 (마지막 2년)`);
  console.log('상품'.padEnd(10) + pad('과잉주', 7) + pad('값↓', 6) + pad('수렴', 6) + pad('부족주', 7) + pad('값↑', 6) + pad('수렴', 6) + pad('균형(끝2년)', 12) + pad('바닥주', 7) + pad('천장주', 7));
  const goods = new Set<string>();
  for (const wk of r.weeks) for (const g in wk.goods) goods.add(g);
  for (const g of [...goods].sort()) {
    let glut = 0, glutDown = 0, glutConv = 0, glutN12 = 0, short = 0, shortUp = 0, shortConv = 0, shortN12 = 0, floor = 0, ceil = 0, band = 0, bandN = 0;
    const ws = r.weeks;
    for (let i = 0; i + 1 < ws.length; i++) {
      const a = ws[i].goods[g], b = ws[i + 1].goods[g];
      if (!a || !b || !(a.D > 1e-6) || !(a.S > 1e-6)) continue;
      const sd = a.S / a.D, atF = a.p <= a.base * FLOOR * 1.0001, atC = a.p >= a.base * CEIL * 0.9999;
      if (atF) floor++;
      if (atC) ceil++;
      if (ws[i].t > (YEARS - 2) * TICKS_PER_YEAR) { bandN++; if (Math.abs(sd - 1) < 0.1) band++; }
      const c = ws[i + 12]?.goods[g];
      const conv = c && c.D > 1e-6 && c.S > 1e-6 ? Math.abs(Math.log(c.S / c.D)) < Math.abs(Math.log(sd)) : null;
      if (sd > 1.05) { glut++; if (b.p < a.p - 1e-12 || atF) glutDown++; if (conv !== null) { glutN12++; if (conv) glutConv++; } }
      if (sd < 0.95) { short++; if (b.p > a.p + 1e-12 || atC) shortUp++; if (conv !== null) { shortN12++; if (conv) shortConv++; } }
    }
    const row = { glut, glutDown: glutDown / glut, glutConv: glutConv / glutN12, short, shortUp: shortUp / short, shortConv: shortConv / shortN12, band: band / bandN, floor, ceil };
    out[g] = row;
    console.log(g.padEnd(10) + pad(String(glut), 7) + pad(pct(row.glutDown), 6) + pad(pct(row.glutConv), 6) + pad(String(short), 7) + pad(pct(row.shortUp), 6) + pad(pct(row.shortConv), 6) + pad(pct(row.band), 12) + pad(String(floor), 7) + pad(String(ceil), 7));
  }
  console.log(`\n해마다 S/D (기하 평균) · 값/기본가 [${r.def.name}]`);
  console.log('년'.padEnd(4) + KEY_GOODS.map((g) => pad(g, 16)).join(''));
  byYear(r).forEach((ws, y) => {
    console.log(String(y + 1).padEnd(4) + KEY_GOODS.map((g) => {
      const sd = gmean(ws.map((wk) => (wk.goods[g] && wk.goods[g].D > 1e-6 ? wk.goods[g].S / wk.goods[g].D : NaN)));
      const p = mean(ws.filter((wk) => wk.goods[g]).map((wk) => wk.goods[g].p / wk.goods[g].base));
      return pad(`${f2(sd)}·${f2(p)}`, 16);
    }).join(''));
  });
  return out;
}

/** (b) 노동 점검 */
function laborCheck(r: RunResult) {
  const out: Record<string, unknown> = {};
  console.log(`\n(b) 노동 [${r.def.name}]  회사:직종별. 빈자리>5% 주: 다음 주 임금↑,  빈자리<2% 주: 임금↓,  실업>빈자리 주: 임금↓,  임금↑ 뒤 4주 안 고용↑,  부족 주 중 회사 지난주 적자(임금 −2% 가 먼저),  임금이 바닥(소작 소득 × ${TUNE.wageOutside})인 주`);
  console.log('회사:직종'.padEnd(14) + pad('주', 5) + pad('부족주', 7) + pad('임금↑', 7) + pad('충분주', 7) + pad('임금↓', 7) + pad('실업>빈', 8) + pad('임금↓', 7) + pad('↑뒤고용↑', 10) + pad('부족주중적자', 12) + pad('바닥주', 7));
  const keys = new Set<string>();
  for (const wk of r.weeks) for (const k in wk.jobs) keys.add(k);
  for (const k of [...keys].sort()) {
    const ws = r.weeks;
    let n = 0, short = 0, up = 0, full = 0, down = 0, slack = 0, slackDown = 0, ups = 0, upsHire = 0, shortLoss = 0, atFloor = 0;
    const co = k.split(':')[0];
    const lower = k.endsWith(':unskilled') || k.endsWith(':farmer');
    for (let i = 0; i + 1 < ws.length; i++) {
      const a = ws[i].jobs[k], b = ws[i + 1].jobs[k];
      if (!a || !b || !(a.cap > 1e-9)) continue;
      n++;
      const vac = (a.cap - a.emp) / a.cap;
      if (vac > 0.05) { short++; if (b.wage > a.wage + 1e-12) up++; if ((ws[i + 1].profit[co] ?? 0) < 0) shortLoss++; }
      if (lower && b.wage <= ws[i + 1].tenantInc * TUNE.wageOutside * 1.001) atFloor++;
      if (vac < 0.02) { full++; if (b.wage < a.wage - 1e-12) down++; }
      if (lower && ws[i].lowUnemp > ws[i].lowVac) { slack++; if (b.wage < a.wage - 1e-12) slackDown++; }
      if (b.wage > a.wage + 1e-12) {
        const later = ws[i + 5]?.jobs[k];
        if (later) { ups++; if (later.emp > b.emp + 1e-9) upsHire++; }
      }
    }
    const row = { n, short, up: up / short, shortLoss: shortLoss / short, full, down: down / full, slack, slackDown: slackDown / slack, ups, upsHire: upsHire / ups, atFloor: atFloor / n };
    out[k] = row;
    console.log(k.padEnd(14) + pad(String(n), 5) + pad(String(short), 7) + pad(pct(row.up), 7) + pad(String(full), 7) + pad(pct(row.down), 7) + pad(lower ? String(slack) : '-', 8) + pad(lower ? pct(row.slackDown) : '-', 7) + pad(`${pct(row.upsHire)}/${ups}`, 10) + pad(pct(row.shortLoss), 12) + pad(lower ? pct(row.atFloor) : '-', 7));
  }
  const firm = r.weeks.find((wk) => Object.keys(wk.jobs).length)?.jobs ? Object.keys(r.weeks.flatMap((wk) => Object.keys(wk.jobs)).reduce((a, k) => ({ ...a, [k.split(':')[0]]: 1 }), {} as Record<string, number>)) : [];
  console.log(`\n해마다 노동시장 [${r.def.name}]  임금 = 회사 노동자 임금(주 평균), 바닥 = 소작 1인 소득 × ${TUNE.wageOutside}, 빈자리율·실업은 노동자·농부·소작 노동 인구 대비`);
  console.log('년'.padEnd(4) + firm.map((c) => pad(`임금${c}`, 9)).join('') + pad('바닥', 7) + pad('빈자리', 8) + pad('실업', 7) + pad('소작', 7) + pad('생산레벨', 9) + pad('상회돈', 8) + pad('국고', 8) + pad('국채', 8) + pad('공사', 5) + '  건물(연말)');
  byYear(r).forEach((ws, y) => {
    const wage = (c: string) => mean(ws.map((wk) => wk.jobs[`${c}:unskilled`]?.wage ?? wk.jobs[`${c}:farmer`]?.wage).filter((x): x is number => x !== undefined));
    console.log(String(y + 1).padEnd(4) + firm.map((c) => pad(f2(wage(c)), 9)).join('') + pad(f2(mean(ws.map((wk) => wk.tenantInc)) * TUNE.wageOutside), 7)
      + pad(pct(mean(ws.map((wk) => wk.lowVac / wk.lowWf))), 8) + pad(pct(mean(ws.map((wk) => wk.lowUnemp / wk.lowWf))), 7) + pad(pct(mean(ws.map((wk) => wk.tenants / wk.lowWf))), 7)
      + pad(f2(mean(ws.map((wk) => wk.levels))), 9) + pad(String(Math.round(mean(ws.map((wk) => wk.firmCash)))), 8) + pad(String(Math.round(mean(ws.map((wk) => wk.crownCash)))), 8)
      + pad(String(Math.round(mean(ws.map((wk) => wk.crownDebt)))), 8) + pad(f2(mean(ws.map((wk) => wk.cons))), 5) + '  ' + (ws[ws.length - 1]?.buildings ?? ''));
  });
  return out;
}

/** (c) 노동자 대 소작농 */
function classCheck(r: RunResult) {
  console.log(`\n(c) 노동자(일하는 노동자·농부) 대 소작농 [${r.def.name}]: 1인 하루 소득(식구 포함, 소작은 현물 시장가 포함)·부·생활수준, 해마다 평균. 판정 = 노동자 부 > 소작 부`);
  console.log('년'.padEnd(4) + pad('노동자소득', 11) + pad('소작소득', 9) + pad('배율', 7) + pad('노동자부', 9) + pad('소작부', 8) + pad('노동자SoL', 10) + pad('소작SoL', 9) + '  판정');
  const out: { year: number; ratio: number; wealthRatio: number; ok: boolean }[] = [];
  byYear(r).forEach((ws, y) => {
    const wi = mean(ws.filter((wk) => wk.worker.n > 0).map((wk) => wk.worker.inc)), ti = mean(ws.map((wk) => wk.tenant.inc));
    const ww = mean(ws.filter((wk) => wk.worker.n > 0).map((wk) => wk.worker.wealth)), tw = mean(ws.map((wk) => wk.tenant.wealth));
    const wsol = mean(ws.filter((wk) => wk.worker.n > 0).map((wk) => wk.worker.sol)), tsol = mean(ws.map((wk) => wk.tenant.sol));
    const ok = ww > tw;
    out.push({ year: y + 1, ratio: wi / ti, wealthRatio: ww / tw, ok });
    console.log(String(y + 1).padEnd(4) + pad(f2(wi), 11) + pad(f2(ti), 9) + pad(f2(wi / ti), 7) + pad(f2(ww), 9) + pad(f2(tw), 8) + pad(f2(wsol), 10) + pad(f2(tsol), 9) + '  ' + (Number.isNaN(wi) ? '노동자 없음' : ok ? '노동자가 부유' : ww === tw ? '같음' : '아님'));
  });
  return out;
}

/** 충격 반응: 충격 실행 − 기준 실행 (같은 주), 충격 전 4주와 뒤 1~4·5~13·14~52주 평균 */
function shockTable(base: RunResult, others: RunResult[]) {
  if (!others.length) return;
  const at = Math.floor(AT / TICKS_PER_WEEK);
  type M = [string, (wk: Week) => number];
  const metrics: M[] = [
    ['곡물값/기본', (wk) => wk.goods.grain ? wk.goods.grain.p / wk.goods.grain.base : NaN],
    ['곡물 S/D', (wk) => wk.goods.grain && wk.goods.grain.D > 1e-6 ? wk.goods.grain.S / wk.goods.grain.D : NaN],
    ['의복값/기본', (wk) => wk.goods.cloth ? wk.goods.cloth.p / wk.goods.cloth.base : NaN],
    ['의복 S/D', (wk) => wk.goods.cloth && wk.goods.cloth.D > 1e-6 ? wk.goods.cloth.S / wk.goods.cloth.D : NaN],
    ['민간 농부임금', (wk) => Object.entries(wk.jobs).find(([k]) => k.endsWith(':farmer') && !k.startsWith('100:'))?.[1].wage ?? NaN],
    ['민간 노동자임금', (wk) => Object.entries(wk.jobs).find(([k]) => k.endsWith(':unskilled') && !k.startsWith('100:'))?.[1].wage ?? NaN],
    ['빈자리(하층)', (wk) => wk.lowVac],
    ['실업(하층)', (wk) => wk.lowUnemp],
    ['소작 노동인구', (wk) => wk.tenants],
    ['노동자/소작 소득', (wk) => wk.tenant.inc > 0 && wk.worker.n > 0 ? wk.worker.inc / wk.tenant.inc : NaN],
    ['생산 레벨', (wk) => wk.levels],
  ];
  const win = (ws: Week[], a: number, b: number, f: (wk: Week) => number) => mean(ws.slice(Math.max(0, at + a), at + b).map(f).filter((x) => Number.isFinite(x)));
  for (const o of others) {
    console.log(`\n충격 반응 [${o.def.name}] (${o.def.shocks.map((s) => `${s.t}일 ${s.kind}`).join(', ')}): 기준 실행 값 → 충격 실행 − 기준 (주 창)`);
    console.log('지표'.padEnd(16) + pad('충격 전 4주', 12) + pad('Δ 1~4주', 10) + pad('Δ 5~13주', 10) + pad('Δ 14~52주', 11) + pad('Δ 2년차', 10));
    for (const [name, f] of metrics) {
      const pre = win(base.weeks, -4, 0, f);
      const d = (a: number, b: number) => win(o.weeks, a, b, f) - win(base.weeks, a, b, f);
      console.log(name.padEnd(16) + pad(f2(pre), 12) + pad(f2(d(0, 4)), 10) + pad(f2(d(4, 13)), 10) + pad(f2(d(13, 52)), 11) + pad(f2(d(52, 104)), 10));
    }
  }
}

// ---------------------------------------------------------------- 실행

const results: RunResult[] = [];
for (const name of RUNS) {
  const def = DEFS[name];
  if (!def) throw new Error(`실행 이름 ${name} 없음 (${Object.keys(DEFS).join(', ')})`);
  const r = run(def);
  if (SECTIONS.includes('j') && def.name === 'base') { r.same = replay(def, Math.floor((YEARS * TICKS_PER_YEAR) / 2)) === r.hash; }
  results.push(r);
  console.log(`\n==== ${name}: ${YEARS}년 × 시드 ${SEED}, ${r.ms}ms, 관측 줄 ${r.rows}${OUT ? ` → ${OUT}-${name}.jsonl` : ''}`);
  console.log(`(d) 화폐: 매일 moneyIdentity 어긋남 최대 ${r.drift.toExponential(2)} (화폐 총량 대비), ${r.driftAbs.toExponential(2)} 플로린, ${r.driftTick}일`);
  const summary = {
    kind: 'summary', run: name, years: YEARS, seed: SEED, tune: TUNE_SET, typeScale,
    goods: SECTIONS.includes('a') ? goodsCheck(r) : undefined, labor: SECTIONS.includes('b') ? laborCheck(r) : undefined, classes: SECTIONS.includes('c') ? classCheck(r) : undefined,
    money: { drift: r.drift, abs: r.driftAbs, tick: r.driftTick },
    judge: SECTIONS.includes('j') ? laborJudge(r, AT, YEARS) : undefined, yearly: SECTIONS.includes('j') ? laborYearly(r, YEARS) : undefined,
  };
  if (OUT) appendFileSync(`${OUT}-${name}.jsonl`, JSON.stringify(summary) + '\n');
}
const base = results.find((r) => r.def.name === 'base');
if (base && SECTIONS.includes('d')) shockTable(base, results.filter((r) => r.def.shocks.length > 0));
