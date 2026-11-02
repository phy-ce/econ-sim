// 마이크로 세계 균형 점검 (src/lab/micro.ts, 2026-11-01 사용자 지시: 작은 모델에서 모든 사람을 추적하며 먼저 확인한다).
// packages/sim 에서:  npx tsx cli/microcheck.ts [--years 10] [--seed 1] [--at 360] [--runs base,jobs,cloth,people,control] [--every 7] [--out 파일접두] [--scale 0.02] [--people 400] [--floors 0]
//                       [--build "farm=2,lumber=1,workshop=1,builder=1@crown,admin=1@crown"]  (시작 건물: 종류[:방식]=레벨[@crown])
//                       [--tune '{"wageTargetSpeed":0.05}']  (실행마다 TUNE 을 바꾸고 끝나면 되돌린다. TUNE 에 없는 키면 멈춘다)
//                       [--typescale "workshop=0.15,textile=0.25"]  (건물 종류별 추가 축소, micro.ts MicroOptions.typeScale)
//                       [--preset labor]  (노동시장 검증용 살아 있는 세계: typescale workshop=0.15,textile=0.25,fiber_farm=0.25 + TUNE shrinkWeeks 1e9 (1-F 뒤로 정부 건물·무역소 적자 철거도 멈춘다).
//                                         기본 세계는 공방·방직 1레벨이 지역 수요의 몇 배라 값이 바닥에 붙어 적자 → 유보 규칙으로 헐리고 → 공구가 끊겨 3년차에 생산 건물이 0 이 된다)
//                       [--arableslack 1] [--moneypeople 400]  (소작지 칸 배율, 돈 문턱을 셀 인구: 시작 인구만 줄이는 비교용, micro.ts MicroOptions)
//                       [--quakeloss 0.25 --quakeyears 3]  (quake·quaketwo 실행의 소작지 손실 비율·기간)
//                       [--sections abcdj]  (j = 노동시장 판정 J1~J4·M 시나리오·해마다 직종 소득 표)
//                       (k = 상회 현금 표: 해마다 민간 상회 현금 평균·최저, 현금 0 인 날 수, 원료 충족(레벨 가중), 민간 생산 레벨·고용, 주인(저택·금융가) 금고 합, 운전자금 넣은 돈)
//                       (m = 저택 거둠 표: 소작농 저축·부·생활수준, 상급·하급 귀족 1인 소득·부·생활수준·자리, 저택 금고·필요·거둠, 공산품 지출·소비재 공장 레벨,
//                        민간 공사 약정, 직종 소득 순서. 조합은 --tune 으로 실행마다 바꾼다: manorTargetMult, manorGentrySeats, manorShares, absenteeShare)
//                       (n = 귀족 하루 추적 (wt-manor 저택 지분): 날마다 상급·하급 귀족 pop 마다 일터·인원·저축·그날 소득(출처별)·저택/금융가 지분·생활수준을
//                        <접두>-<이름>-nobles.jsonl 에 쓰고, 해마다 1인 하루 소득 최저·평균·최고, 출처별 몫(배당·지대·임금·기타), 하급 귀족 실업률, 행정청 충원, 저택 지분 값을 낸다)
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
//   quake   --at 일에 소작지 재해: 지역 0 소작지 칸의 --quakeloss(기본 25%)를 --quakeyears(기본 3)년 동안 못 쓴다 (economy.ts SCRIPTED_QUAKES, 2026-11-01 사용자 "소작지가 지진 같은 것에 의해 변동")
//   drain   --at 일부터 --draindays(기본 14)일 동안 매일 민간 상회 현금을 0 으로 (그 돈을 레벨 주인 저택·금융가 금고로 옮긴다, 현금 0 함정 재현, DECISIONS 7-40).
//           하루만 비우면 원료 재고 2일분으로 판 돈이 들어와 스스로 풀린다 (main d964485, labor 시드 1). 여러 날 비우면 원료 재고가 바닥난 채 현금 0 이 된다
//   quaketwo 지역 2개(two 와 같은 시작)에서 지역 0 에 같은 재해 (이주를 보려고)
//   drought --at 일부터 --droughtdays(기본 180)일 동안 지역 0 소작지·농지 산출 × (1 − --droughtcut, 기본 0.2) (economy.ts SCRIPTED_HARVESTS 가뭄,
//           wt-wagelag: 곡물값이 뛰어 소작 소득이 시장 임금보다 빨리 오를 때 .tmp/y1/RESULT.md)
//
// 점검 (주 단위 표본):
//   (a) 상품: S/D(공급·수요 이동평균의 비) > 1.05 인 주에 다음 주 가격이 내렸나(또는 바닥), < 0.95 면 올랐나(또는 천장). 12주 뒤 |ln S/D| 가 줄었나. 해마다 S/D
//   (b) 노동: 회사·직종별 빈자리율 > 5% 인 주에 다음 주 임금이 올랐나, < 2% 면 내렸나. 실업(구직자) > 빈자리 인 주에 임금이 내렸나. 임금이 오른 뒤 4주 안에 고용이 늘었나
//   (c) 노동자(일하는 노동자·농부) 1인 소득·부·생활수준 대 소작농. 해마다
//   (d) 화폐: 매일 moneyIdentity 어긋남 (화폐 총량 대비)
//   (w) 임금 지연 표 (wt-wagelag): 4주마다 노동자 시장 임금 ÷ 소작 1인 소득, 상회 노동자 임금(웃돈 포함) ÷ 소작, 생산 고용(민간·왕실 생산 건물), 건축사무소·행정청 충원율,
//       곡물값/기본가, 국영 임금 단계, 세전 흐름(pop 소득 wages+dividends+rent+sales 주 합). --out 이 있으면 <접두>-<이름>-w.json 에 주마다 값을 쓴다
//   (q) 재해 실행(quake·quaketwo, 재해 없는 실행은 같은 날짜 대조): 지역마다 소작지 칸·일하는 소작농·노동자·실업 소작농·인구, 노동자 시장 임금, 소작 1인 소득, 곡물 S/D·값, 생활수준. 해마다와 재해 앞뒤 주
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { BUILDING_BY_ID, GOODS, TICKS_PER_WEEK, TICKS_PER_YEAR, TUNE, getMethod, checkTuneKeys, overrideTune } from '../src/data';
import { subsistenceWage } from '../src/labor';
import { companyById, isGovernment, wagesAt } from '../src/economy';
import { FLOW } from '../src/kingdoms';
import { manorNeed } from '../src/market';
import { workforce } from '../src/pops';
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
const TUNE_SET: Record<string, unknown> = { ...(PRESET === 'labor' ? { shrinkWeeks: 1e9 } : {}), ...JSON.parse(arg('tune', '{}')) };
const TYPESCALE_ARG = arg('typescale', PRESET === 'labor' ? 'workshop=0.15,textile=0.25,fiber_farm=0.25' : '');
const typeScale: Record<string, number> | undefined = TYPESCALE_ARG ? Object.fromEntries(TYPESCALE_ARG.split(',').map((x) => { const [k, v] = x.split('='); return [k, Number(v)]; })) : undefined;
const SECTIONS = arg('sections', 'abcd');
/** 재해 실행(quake·quaketwo)의 손실 비율·기간(년) */
const DRAIN_DAYS = Number(arg('draindays', '14'));
const QLOSS = Number(arg('quakeloss', '0.25')), QYEARS = Number(arg('quakeyears', '3'));
/** 흉작 실행(drought)의 산출 감소율·기간(일) */
const DCUT = Number(arg('droughtcut', '0.2')), DDAYS = Number(arg('droughtdays', '180'));

/** 실행 안의 TUNE 충격 (관측용 개입, 실행이 끝나면 되돌린다) */
type LabShock = MicroShock | { t: number; kind: 'tune'; set: Record<string, number> };
export interface RunDef { name: string; opts: MicroOptions; shocks: LabShock[] }
const SLACK = arg('arableslack', ''), MONEY_PEOPLE = arg('moneypeople', '');
const baseOpts: MicroOptions = {
  seed: SEED, scale: SCALE, people: [PEOPLE], floors: FLOORS, ...(buildings ? { buildings } : {}), ...(typeScale ? { typeScale } : {}),
  ...(SLACK ? { arableSlack: Number(SLACK) } : {}), ...(MONEY_PEOPLE ? { moneyPeople: Number(MONEY_PEOPLE) } : {}),
};
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
  quake: { name: 'quake', opts: baseOpts, shocks: [{ t: AT, kind: 'quake', loss: QLOSS, years: QYEARS }] },
  drain: { name: 'drain', opts: baseOpts, shocks: Array.from({ length: DRAIN_DAYS }, (_, i) => ({ t: AT + i, kind: 'drain' as const })) },
  drought: { name: 'drought', opts: baseOpts, shocks: [{ t: AT, kind: 'harvest', cut: DCUT, days: DDAYS }] },
  quaketwo: { name: 'quaketwo', opts: { ...baseOpts, people: [PEOPLE, PEOPLE] }, shocks: [{ t: AT, kind: 'quake', loss: QLOSS, years: QYEARS, region: 0 }] },
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
  /** 재해 표(q)용, 지역 id 순서: 소작지 칸, 일하는 소작농·일하는 노동자(노동자+농부)·실업 소작농 (노동 인구), 인구, 노동자 시장 임금, 소작 1인 소득, 곡물 S/D·값/기본가, 노동자·소작 생활수준 */
  reg: RegWeek[];
  /** 저택 거둠 표(m)용 (run 이 세계에서 직접 잰다) */
  mn?: ManorWeek;
}
interface Per { inc: number; sav: number; wealth: number; sol: number; n: number }
/**
 * 저택 거둠 표(m): 1인 값(식구 포함, 소득은 incomeEma ÷ 인원), 저택 금고 합·하루 필요 합(market.ts manorNeed)·지난주 거둔 돈·금고 돌려줌,
 * 공산품 하루 지출(수요 이동평균 × 값)·상품별 수요, 소비재 공장 레벨, 민간 공사 수·남은 약정, 지역 0 민간 전문가 임금
 */
interface ManorWeek {
  peas: Per; work: Per; arist: Per; gentry: Per;
  gSeat: number; gOther: number; gIdle: number; aSeat: number;
  cash: number; need: number; skim: number; release: number; cons: Record<string, number>; consSpend: number; consLv: number; pledge: number; privCons: number; expertW: number;
  /** 저택 지분 (TUNE.manorShares): 저택 지분 합, 지분 값 평균, 행정청 충원 (레벨 가중) */
  units: number; nav: number; adminSt: number;
}
const CONS_GOODS = ['cloth', 'furniture', 'liquor', 'luxury_cloth', 'luxury_furniture'];
let flowLast = { skim: 0, release: 0 };
function manorWeek(w: World): ManorWeek {
  const acc = (): Per => ({ inc: 0, sav: 0, wealth: 0, sol: 0, n: 0 });
  const peas = acc(), work = acc(), arist = acc(), gentry = acc();
  let gSeat = 0, gOther = 0, gIdle = 0, aSeat = 0;
  const manorIds = new Set(w.buildings.filter((b) => b.typeId === 'manor').map((b) => b.id));
  for (const p of w.pops) {
    if (p.size <= 0) continue;
    const a = p.prof === 'peasant' ? peas : (p.prof === 'unskilled' || p.prof === 'farmer') && p.work ? work : p.prof === 'aristocrat' ? arist : p.prof === 'gentry' ? gentry : null;
    if (p.prof === 'gentry') { if (manorIds.has(p.work)) gSeat += workforce(p); else if (p.work) gOther += workforce(p); else gIdle += workforce(p); }
    if (p.prof === 'aristocrat' && manorIds.has(p.work)) aSeat += workforce(p);
    if (!a) continue;
    a.inc += p.incomeEma; a.sav += p.savings; a.wealth += p.wealth * p.size; a.sol += p.sol * p.size; a.n += p.size;
  }
  for (const a of [peas, work, arist, gentry]) if (a.n > 0) { a.inc /= a.n; a.sav /= a.n; a.wealth /= a.n; a.sol /= a.n; }
  let cash = 0, need = 0;
  for (const b of w.buildings) if (b.typeId === 'manor') { cash += b.cash ?? 0; need += manorNeed(w, b); }
  const skimNow = FLOW['skim.manor'] ?? 0, relNow = FLOW['release.manor'] ?? 0;
  const skim = skimNow - flowLast.skim, release = relNow - flowLast.release;
  flowLast = { skim: skimNow, release: relNow };
  const cons: Record<string, number> = {};
  let consSpend = 0;
  for (const r of w.regions) for (const g of CONS_GOODS) {
    const m = r.market[g as keyof typeof r.market];
    if (!m) continue;
    cons[g] = (cons[g] ?? 0) + m.demandEma;
    consSpend += m.demandEma * m.price;
  }
  let consLv = 0;
  for (const b of w.buildings) {
    if (BUILDING_BY_ID[b.typeId].auto || isGovernment(b.typeId)) continue;
    const out = getMethod(b.typeId, b.methodId).outputs as Record<string, number | undefined>;
    if (CONS_GOODS.some((g) => (out[g] ?? 0) > 0)) consLv += b.level;
  }
  let pledge = 0, privCons = 0;
  for (const k of w.constructions) {
    if (!k.funders) continue;
    privCons++;
    pledge += Math.max(0, Object.values(k.funders).reduce((x, y) => x + y, 0) - k.spent);
  }
  const k0 = w.kingdoms[0], firm = k0 ? companyById(w, k0.privateIds[0]) : undefined;
  const expertW = firm ? wagesAt(firm, 'manor', w, w.regions[0].id).expert : NaN;
  let units = 0, nav = 0, nm = 0, aS = 0, aL = 0;
  for (const b of w.buildings) {
    if (b.typeId === 'manor') { nav += b.nav ?? 1; nm++; for (const p of w.pops) if (p.fund) for (let i = 0; i < p.fund.id.length; i++) if (p.fund.id[i] === b.id) units += p.fund.u[i]; }
    if (b.typeId === 'admin') { aS += b.last.staffing * b.level; aL += b.level; }
  }
  return { peas, work, arist, gentry, gSeat, gOther, gIdle, aSeat, cash, need, skim, release, cons, consSpend, consLv, pledge, privCons, expertW, units, nav: nm ? nav / nm : NaN, adminSt: aL ? aS / aL : NaN };
}
interface RegWeek { cells: number; tenants: number; workers: number; idle: number; pop: number; wage: number; tenantInc: number; grainSD: number; grainP: number; solW: number; solT: number }

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
    reg: regionSummary(row),
  };
}

/** 재해 표(q)용 지역별 요약 (지역 id 순서) */
function regionSummary(row: MicroRow): RegWeek[] {
  const ids = [...new Set(row.labor.map((l) => l.r))].sort((a, b) => a - b);
  return ids.map((r) => {
    let tenants = 0, workers = 0, idle = 0, pop = 0, solW = 0, nW = 0, solT = 0, nT = 0;
    for (const p of row.pops) {
      if (p.r !== r) continue;
      pop += p.size;
      if (p.prof === 'peasant' && p.workType === 'subsistence') { tenants += p.wf; solT += p.sol * p.size; nT += p.size; }
      else if (p.prof === 'peasant' && !p.work) idle += p.wf;
      else if ((p.prof === 'unskilled' || p.prof === 'farmer') && p.work) { workers += p.wf; solW += p.sol * p.size; nW += p.size; }
    }
    const g = row.mkts.find((m) => m.r === r && m.g === 'grain');
    const lab = row.labor.find((l) => l.r === r && l.s === 'unskilled');
    return {
      cells: row.blds.find((b) => b.r === r && b.type === 'subsistence')?.lvl ?? 0, tenants, workers, idle, pop,
      wage: lab?.market ?? NaN, tenantInc: lab?.tenantInc ?? NaN,
      grainSD: g && g.Dema > 1e-6 ? g.Sema / g.Dema : NaN, grainP: g ? g.p / g.base : NaN,
      solW: nW > 0 ? solW / nW : NaN, solT: nT > 0 ? solT / nT : NaN,
    };
  });
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

/** 상회 현금 표(k)용 하루 표본: 민간 상회 현금, 원료 충족(원료 쓰는 민간 건물의 레벨 가중), 민간 생산 레벨·고용, 주인 금고 합, 운전자금(call.*) 누계 */
interface CashDay { t: number; cash: number; fill: number; lv: number; emp: number; owner: number; call: number }
function cashDay(w: World): CashDay {
  const firm = companyById(w, w.kingdoms[0].privateIds[0])!;
  let fl = 0, fw = 0, lv = 0, emp = 0, owner = 0;
  for (const b of w.buildings) {
    if (b.typeId === 'manor' || b.typeId === 'finance') owner += b.cash ?? 0;
    if (b.companyId !== firm.id || BUILDING_BY_ID[b.typeId].auto) continue;
    lv += b.level;
    for (const k of Object.keys(b.employed) as (keyof typeof b.employed)[]) emp += b.employed[k] ?? 0;
    if (Object.keys(getMethod(b.typeId, b.methodId).inputs).length) { fl += b.level * b.last.inputFill; fw += b.level; }
  }
  return { t: w.tick, cash: firm.cash, fill: fw > 0 ? fl / fw : NaN, lv, emp, owner, call: (FLOW['call.manor'] ?? 0) + (FLOW['call.finance'] ?? 0) };
}
/** 임금 지연 표(w) 주 표본: wt-wagelag */
interface LagWeek { t: number; wageMkt: number; wagePaid: number; tenant: number; prodEmp: number; prodJobs: number; office: number; admin: number; grain: number; stateStep: number; flow: number }
const lagFlow = { v: 0 };
function lagWeek(w: World): LagWeek {
  const r0 = w.regions[0];
  const k0 = w.kingdoms[0];
  const firm = companyById(w, k0.privateIds[0]);
  const tenant = subsistenceWage(w, r0);
  let prodEmp = 0, prodJobs = 0, offSt = 0, offLv = 0, admSt = 0, admLv = 0;
  for (const b of w.buildings) {
    const def = BUILDING_BY_ID[b.typeId];
    if (def.auto || def.ownership || b.level <= 0) continue;
    const m = getMethod(b.typeId, b.methodId);
    if (isGovernment(b.typeId)) {
      if (m.construction && b.active) { offSt += b.last.staffing * b.level; offLv += b.level; }
      if (m.taxCapacity && b.active) { admSt += b.last.staffing * b.level; admLv += b.level; }
      continue;
    }
    if (!Object.keys(m.outputs).length) continue;
    for (const s of Object.keys(m.workers) as (keyof typeof m.workers)[]) { prodJobs += (m.workers[s] ?? 0) * b.level; prodEmp += b.employed[s] ?? 0; }
  }
  const g = r0.market.grain;
  const flow = lagFlow.v; lagFlow.v = 0;
  return {
    t: w.tick, wageMkt: r0.wages?.unskilled ?? NaN, wagePaid: firm ? wagesAt(firm, 'farm', w, r0.id).unskilled : NaN, tenant, prodEmp, prodJobs,
    office: offLv > 0 ? offSt / offLv : NaN, admin: admLv > 0 ? admSt / admLv : NaN, grain: g ? g.price / GOODS.grain.basePrice : NaN, stateStep: k0.budget.wages, flow,
  };
}
/** (w) 날마다 지역 0 시장 임금 (직종 순서 SKILLS)·소작 1인 소득: 임금 경로 추적 (wt-wagespeed) */
let wageDays: number[][] = [];
function wageDay(w: World): number[] {
  const r0 = w.regions[0];
  return [w.tick, ...Object.values(r0.wages ?? {}).map((v) => Math.round(v * 1e4) / 1e4), Math.round(subsistenceWage(w, r0) * 1e4) / 1e4];
}
function lagDay(w: World) {
  for (const p of w.pops) { const br = p.incomeBreakdown as Record<string, number> | undefined; if (br) lagFlow.v += (br.wages ?? 0) + (br.dividends ?? 0) + (br.rent ?? 0) + (br.sales ?? 0); }
}
/** (w) 임금 지연 표: 4주마다 */
function lagTable(r: RunResult) {
  const ws = r.lag ?? [];
  console.log(`
(w) 임금 지연 [${r.def.name}] 지역 0: 시장 임금·상회 임금(웃돈 포함)·소작 1인 소득, 생산 고용/자리, 사무소·행정청 충원, 곡물값/기본, 국영 임금 단계, 세전 흐름(4주 합)`);
  console.log('주'.padEnd(5) + ['시장', '상회', '소작', '시장÷소작', '상회÷소작', '고용', '자리', '사무소', '행정청', '곡물', '국영', '세전'].map((c) => pad(c, 10)).join(''));
  for (let i = 0; i < ws.length; i += 4) {
    const x = ws[i], fl = ws.slice(Math.max(1, i - 3), i + 1).reduce((a, y) => a + y.flow, 0);
    console.log(String(Math.round(x.t / TICKS_PER_WEEK)).padEnd(5) + [f2(x.wageMkt), f2(x.wagePaid), f2(x.tenant), f2(x.wageMkt / x.tenant), f2(x.wagePaid / x.tenant), f2(x.prodEmp), f2(x.prodJobs), f2(x.office), f2(x.admin), f2(x.grain), String(x.stateStep), f2(fl)].map((v) => pad(v, 10)).join(''));
  }
}
export interface RunResult { lag?: LagWeek[]; wageDays?: number[][]; def: RunDef; weeks: Week[]; days?: CashDay[]; nobles: NobleDay[]; drift: number; driftAbs: number; driftTick: number; ms: number; rows: number; hash: string; same?: boolean }

const stateHash = (w: World) => createHash('sha1').update(JSON.stringify({ ...w, config: { ...w.config, rulesHash: '' } })).digest('hex').slice(0, 12);

/** J1 결정성: 같은 시드로 다시 돌리며 중간(reloadAt 일)에 JSON 저장/불러오기를 한 번 해서 끝 상태가 같은지 */
function replay(def: RunDef, reloadAt: number): string {
  const saved: Record<string, unknown> = {};
  for (const k of Object.keys(TUNE_SET)) saved[k] = (TUNE as Record<string, unknown>)[k];
  overrideTune(TUNE_SET, 'microcheck --tune');
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
  checkTuneKeys(s.set, `microcheck 충격 (${s.t}일)`);
  for (const [k, v] of Object.entries(s.set)) { if (!(k in tuneSaved)) tuneSaved[k] = (TUNE as unknown as Record<string, number>)[k]; (TUNE as unknown as Record<string, number>)[k] = v; }
}

function run(def: RunDef): RunResult {
  const t0 = Date.now();
  const saved: Record<string, unknown> = {};
  for (const k of Object.keys(TUNE_SET)) saved[k] = (TUNE as Record<string, unknown>)[k];
  overrideTune(TUNE_SET, 'microcheck --tune');
  const tuneSaved: Record<string, number> = {};
  const w = createMicroWorld(def.opts);
  const file = OUT ? `${OUT}-${def.name}.jsonl` : '';
  if (file) { mkdirSync(dirname(file) || '.', { recursive: true }); writeFileSync(file, JSON.stringify({ kind: 'meta', run: def.name, opts: def.opts, shocks: def.shocks, info: microInfo(w) }) + '\n'); }
  const weeks: Week[] = [];
  const m0 = moneyIdentity(w);
  let drift = 0, driftAbs = 0, driftTick = 0, rows = 0;
  const shocks = [...def.shocks];
  const days: CashDay[] = [];
  const nobles: NobleDay[] = [];
  const lag: LagWeek[] = [];
  wageDays = [];
  lagFlow.v = 0;
  if (SECTIONS.includes('w')) lag.push(lagWeek(w));
  const call0 = (FLOW['call.manor'] ?? 0) + (FLOW['call.finance'] ?? 0);
  let buf: string[] = [];
  const write = (row: MicroRow) => { if (!file) return; buf.push(JSON.stringify(row)); rows++; if (buf.length >= 50) { appendFileSync(file, buf.join('\n') + '\n'); buf = []; } };
  write(microTrace(w));
  flowLast = { skim: FLOW['skim.manor'] ?? 0, release: FLOW['release.manor'] ?? 0 };
  for (let d = 0; d < YEARS * TICKS_PER_YEAR; d++) {
    for (const s of shocks) if (s.t === w.tick) applyShock(w, s, tuneSaved);
    step(w);
    if (SECTIONS.includes('k')) { const cd = cashDay(w); cd.call -= call0; days.push(cd); }
    if (SECTIONS.includes('w')) { lagDay(w); if (w.tick % TICKS_PER_WEEK === 0) lag.push(lagWeek(w)); wageDays.push(wageDay(w)); }
    if (SECTIONS.includes('n')) nobleDay(w, nobles, file ? `${OUT}-${def.name}-nobles.jsonl` : '');
    const dev = Math.abs(moneyIdentity(w) - m0);
    const rel = dev / Math.max(1, totalMoney(w));
    if (rel > drift) { drift = rel; driftAbs = dev; driftTick = w.tick; }
    const sample = w.tick % TICKS_PER_WEEK === 0, out = w.tick % EVERY === 0;
    if (sample || out) {
      const row = microTrace(w);
      if (sample) { const wk = summarizeWeek(row); if (SECTIONS.includes('m')) wk.mn = manorWeek(w); weeks.push(wk); }
      if (out) write(row);
    }
  }
  if (file && buf.length) appendFileSync(file, buf.join('\n') + '\n');
  const hash = stateHash(w);
  Object.assign(TUNE, tuneSaved);
  restoreMicroScale();
  Object.assign(TUNE, saved);
  if (nobleBuf.length) { appendFileSync(`${OUT}-${def.name}-nobles.jsonl`, nobleBuf.join('\n') + '\n'); nobleBuf = []; }
  return { def, weeks, days, lag, wageDays, nobles, drift, driftAbs, driftTick, ms: Date.now() - t0, rows, hash };
}

// ---------------------------------------------------------------- 표

const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '-');
const pct = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '-');
const pad = (s: string, n: number) => s.padStart(n);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const gmean = (xs: number[]) => { const v = xs.filter((x) => x > 0 && Number.isFinite(x)); return v.length ? Math.exp(mean(v.map(Math.log))) : NaN; };
const byYear = (r: RunResult) => Array.from({ length: YEARS }, (_, y) => r.weeks.filter((wk) => wk.t > y * TICKS_PER_YEAR && wk.t <= (y + 1) * TICKS_PER_YEAR));
const FLOOR = 0.25, CEIL = 1.75; // market.ts PRICE_MIN·PRICE_MAX

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

/** (q) 재해 표: 지역마다 해마다 평균과 재해 앞뒤 주 (재해가 없는 실행은 --at·--quakeyears 날짜로 같은 표) */
function quakeTable(r: RunResult) {
  // 재해 없는 실행(base)은 같은 날짜로 대조 표를 낸다
  const q = (r.def.shocks.find((x) => x.kind === 'quake') as { t: number; years: number } | undefined) ?? { t: AT, years: QYEARS };
  const end = q.t + Math.round(q.years * TICKS_PER_YEAR);
  const nReg = r.weeks[0]?.reg.length ?? 0;
  const cols = '칸 소작 노동자 실업소작 인구 시장임금 소작소득 곡물S/D 곡물값 노동SoL 소작SoL'.split(' ');
  const line = (label: string, xs: RegWeek[]) => {
    const m = (f: (x: RegWeek) => number) => mean(xs.map(f).filter((v) => Number.isFinite(v)));
    const vals = [m((x) => x.cells), m((x) => x.tenants), m((x) => x.workers), m((x) => x.idle), m((x) => x.pop), m((x) => x.wage), m((x) => x.tenantInc), m((x) => x.grainSD), m((x) => x.grainP), m((x) => x.solW), m((x) => x.solT)];
    console.log(label.padEnd(12) + vals.map((v, i) => pad(i < 5 ? (Number.isFinite(v) ? v.toFixed(1) : '-') : f2(v), 9)).join(''));
  };
  for (let ri = 0; ri < nReg; ri++) {
    console.log('');
    console.log(`(q) 재해 [${r.def.name}] 지역 ${ri}${!r.def.shocks.some((x) => x.kind === 'quake') ? ' (재해 없음, 같은 날짜 대조)' : ri === 0 ? ' (재해 지역)' : ''}: ${q.t}일 ~ ${end}일. 노동 인구(칸·인구 제외), 시장 임금 = 노동자 (wageMarket 0 이면 고용 가중 평균), 소득은 1인 하루`);
    console.log('년/주'.padEnd(12) + cols.map((c) => pad(c, 9)).join(''));
    byYear(r).forEach((ws, y) => line(`${y + 1}년`, ws.map((wk) => wk.reg[ri]).filter(Boolean)));
    const at = (t: number) => r.weeks.filter((wk) => wk.t > t - TICKS_PER_WEEK && wk.t <= t).map((wk) => wk.reg[ri]).filter(Boolean);
    const marks: [string, number][] = [['재해 전 1주', q.t], ['+1주', q.t + 7], ['+2주', q.t + 14], ['+4주', q.t + 28], ['+13주', q.t + 91], ['+26주', q.t + 182], ['+52주', q.t + 364], ['+104주', q.t + 728],
      ['끝 직전', end], ['끝 +1주', end + 7], ['끝 +4주', end + 28], ['끝 +13주', end + 91], ['끝 +26주', end + 182], ['끝 +52주', end + 364]];
    for (const [label, t] of marks) if (t <= YEARS * TICKS_PER_YEAR) line(label, at(t));
  }
}

/** (n) 귀족 하루 값: 상급·하급 귀족 1인 그날 소득(식구 포함)과 출처별 합, 하급 귀족 실업 비율 */
interface NobleDay { t: number; aInc: number; gInc: number; gIdleInc: number; src: Record<string, number>; gJobless: number }
let nobleBuf: string[] = [];
function nobleDay(w: World, out: NobleDay[], file: string) {
  let an = 0, ai = 0, gn = 0, gi = 0, gin = 0, gii = 0;
  const src: Record<string, number> = {};
  for (const p of w.pops) {
    if ((p.prof !== 'aristocrat' && p.prof !== 'gentry') || p.size <= 0) continue;
    if (p.prof === 'aristocrat') { an += p.size; ai += p.lastIncome; } else { gn += p.size; gi += p.lastIncome; if (p.work === 0) { gin += p.size; gii += p.lastIncome; } }
    for (const [k, v] of Object.entries(p.incomeBreakdown ?? {})) src[`${p.prof[0]}.${k}`] = (src[`${p.prof[0]}.${k}`] ?? 0) + (v ?? 0);
    if (file) {
      const units: Record<string, number> = {};
      if (p.fund) for (let i = 0; i < p.fund.id.length; i++) { const b = w.buildings.find((x) => x.id === p.fund!.id[i]); units[`${b?.typeId ?? '?'}${p.fund.id[i]}`] = p.fund.u[i]; }
      const work = p.work ? w.buildings.find((x) => x.id === p.work)?.typeId ?? '?' : '';
      nobleBuf.push(JSON.stringify({ t: w.tick, id: p.id, r: p.regionId, prof: p.prof, work, size: p.size, sav: p.savings, inc: p.lastIncome, src: p.incomeBreakdown ?? {}, units, sol: p.sol }));
      if (nobleBuf.length >= 200) { appendFileSync(file, nobleBuf.join('\n') + '\n'); nobleBuf = []; }
    }
  }
  out.push({ t: w.tick, aInc: an ? ai / an : NaN, gInc: gn ? gi / gn : NaN, gIdleInc: gin ? gii / gin : NaN, src, gJobless: gn ? gin / gn : NaN });
}

/** (n) 귀족 하루 추적 표: 해마다 1인 하루 소득 최저·평균·최고 (상급·하급), 실업 하급 귀족 1인 소득, 출처별 몫, 하급 귀족 실업률, 행정청 충원·저택 지분 값 (주 표본 평균) */
function nobleTable(r: RunResult) {
  const tag = `${r.def.name} manorShares=${TUNE_SET.manorShares ?? TUNE.manorShares} absenteeShare=${TUNE_SET.absenteeShare ?? TUNE.absenteeShare}`;
  console.log(`
(n) 귀족 하루 추적 [${tag}]: 1인 하루 소득 (최저/평균/최고), 실업 하급 귀족 1인, 출처별 몫 (배당·지대·임금·기타 ÷ 합), 하급 귀족 실업률, 행정청 충원, 저택 지분 값`);
  console.log('년'.padEnd(4) + ['상급min', '상급avg', '상급max', '하급min', '하급avg', '하급max', '실업하급', '배당%', '지대%', '임금%', '기타%', '하급실업', '행정충원', '지분값'].map((c) => pad(c, 9)).join(''));
  const yw = byYear(r);
  for (let y = 0; y < YEARS; y++) {
    const ds = r.nobles.filter((d) => d.t > y * TICKS_PER_YEAR && d.t <= (y + 1) * TICKS_PER_YEAR);
    if (!ds.length) continue;
    const st = (f: (d: NobleDay) => number) => { const v = ds.map(f).filter(Number.isFinite); return v.length ? [Math.min(...v), mean(v), Math.max(...v)] : [NaN, NaN, NaN]; };
    const tot: Record<string, number> = {};
    for (const d of ds) for (const [k, v] of Object.entries(d.src)) { const s = k.slice(2); tot[s] = (tot[s] ?? 0) + v; }
    const all = Object.values(tot).reduce((a, b) => a + b, 0) || NaN;
    const mn = yw[y].map((wk) => wk.mn).filter((x): x is ManorWeek => !!x);
    console.log(String(y + 1).padEnd(4) + [...st((d) => d.aInc), ...st((d) => d.gInc), mean(ds.map((d) => d.gIdleInc).filter(Number.isFinite)),
      (tot.dividends ?? 0) / all * 100, (tot.rent ?? 0) / all * 100, (tot.wages ?? 0) / all * 100, (tot.other ?? 0) / all * 100,
      mean(ds.map((d) => d.gJobless)), mean(mn.map((x) => x.adminSt)), mean(mn.map((x) => x.nav))].map((v) => pad(f2(v), 9)).join(''));
  }
}

/** (m) 저택 거둠 표: 해마다 평균 (1인 값은 식구 포함, 소득은 하루) */
function manorTable(r: RunResult) {
  const yw = byYear(r);
  const ys = yw.map((ws) => ws.map((wk) => wk.mn).filter((x): x is ManorWeek => !!x));
  const m = (xs: ManorWeek[], f: (x: ManorWeek) => number) => mean(xs.map(f).filter((v) => Number.isFinite(v)));
  const tag = `${r.def.name} manorTargetMult=${TUNE_SET.manorTargetMult ?? TUNE.manorTargetMult} manorGentrySeats=${TUNE_SET.manorGentrySeats ?? TUNE.manorGentrySeats}`;
  console.log(`\n(m1) 하층 [${tag}]: 소작농(모든 소작 pop)·노동자(일하는 노동자·농부) 1인 저축·부·생활수준·하루 소득(현물 빼고), 곡물 S/D·값/기본가`);
  console.log('년'.padEnd(4) + ['소작저축', '소작부', '소작SoL', '소작소득', '노동저축', '노동부', '노동SoL', '노동소득', '곡물S/D', '곡물값'].map((c) => pad(c, 9)).join(''));
  ys.forEach((xs, y) => {
    const ws = yw[y];
    const sd = gmean(ws.map((wk) => (wk.goods.grain && wk.goods.grain.D > 1e-6 ? wk.goods.grain.S / wk.goods.grain.D : NaN)));
    const gp = mean(ws.filter((wk) => wk.goods.grain).map((wk) => wk.goods.grain.p / wk.goods.grain.base));
    console.log(String(y + 1).padEnd(4) + [m(xs, (x) => x.peas.sav), m(xs, (x) => x.peas.wealth), m(xs, (x) => x.peas.sol), m(xs, (x) => x.peas.inc), m(xs, (x) => x.work.sav), m(xs, (x) => x.work.wealth), m(xs, (x) => x.work.sol), m(xs, (x) => x.work.inc), sd, gp].map((v) => pad(f2(v), 9)).join(''));
  });
  console.log(`\n(m2) 귀족 [${tag}]: 상급·하급 귀족 1인 하루 소득·부·생활수준, 노동 인구(저택에 앉음), 하급 귀족 다른 일자리·실업, 지역 0 전문가 임금, 귀족 1인 소득 ÷ 전문가 임금`);
  console.log('년'.padEnd(4) + ['귀족소득', '귀족부', '귀족SoL', '귀족앉음', '하급소득', '하급부', '하급SoL', '하급앉음', '하급딴일', '하급실업', '전문가임금', '귀족/전문'].map((c) => pad(c, 9)).join(''));
  ys.forEach((xs) => {
    const ai = m(xs, (x) => x.arist.inc), ew = m(xs, (x) => x.expertW);
    console.log(String(ys.indexOf(xs) + 1).padEnd(4) + [ai, m(xs, (x) => x.arist.wealth), m(xs, (x) => x.arist.sol), m(xs, (x) => x.aSeat), m(xs, (x) => x.gentry.inc), m(xs, (x) => x.gentry.wealth), m(xs, (x) => x.gentry.sol), m(xs, (x) => x.gSeat), m(xs, (x) => x.gOther), m(xs, (x) => x.gIdle), ew, ai / ew].map((v) => pad(f2(v), 9)).join(''));
  });
  console.log(`\n(m3) 돈의 길 [${tag}]: 저택 금고(연 평균)·하루 필요 합·거둔 돈(1년 합)·금고 돌려줌(1년 합), 공산품 하루 지출(수요 × 값)·의복 수요, 소비재 공장 레벨, 민간 공사 수·남은 약정, 생산 레벨`);
  console.log('년'.padEnd(4) + ['저택금고', '필요/일', '거둠/년', '돌려줌/년', '공산지출', '의복수요', '소비재Lv', '민간공사', '약정', '생산Lv'].map((c) => pad(c, 10)).join(''));
  ys.forEach((xs, y) => {
    const sum = (f: (x: ManorWeek) => number) => xs.reduce((a, x) => a + f(x), 0);
    console.log(String(y + 1).padEnd(4) + [m(xs, (x) => x.cash), m(xs, (x) => x.need), sum((x) => x.skim), sum((x) => x.release), m(xs, (x) => x.consSpend), m(xs, (x) => x.cons.cloth ?? 0), m(xs, (x) => x.consLv), m(xs, (x) => x.privCons), m(xs, (x) => x.pledge), mean(yw[y].map((wk) => wk.levels))].map((v) => pad(f2(v), 10)).join(''));
  });
  const order = ['tenant', 'labour', 'skilled', 'expert', 'gentry', 'aristocrat', 'capitalist'];
  console.log(`\n(m4) 직종 1인 하루 소득 (일하는 pop, 소작은 현물 포함) [${tag}]: 순서 판정 = (소작 ≈ 노동자) < 기술자 < 전문가 < 귀족·자본가 (있는 직종만)`);
  console.log('년'.padEnd(4) + order.map((c) => pad(c, 11)).join('') + '  순서');
  yw.forEach((ws, y) => {
    const v = Object.fromEntries(order.map((k) => [k, mean(ws.map((wk) => wk.cls[k]).filter((x): x is number => Number.isFinite(x)))]));
    const low = Math.max(v.tenant, Number.isFinite(v.labour) ? v.labour : -Infinity);
    const tops = ['aristocrat', 'capitalist'].map((k) => v[k]).filter((x) => Number.isFinite(x));
    const chain = [low, v.skilled, v.expert, tops.length ? Math.min(...tops) : NaN].filter((x) => Number.isFinite(x));
    const ok = chain.every((x, i) => i === 0 || x > chain[i - 1]);
    console.log(String(y + 1).padEnd(4) + order.map((k) => pad(f2(v[k]), 11)).join('') + '  ' + (ok ? '맞음' : '어긋남'));
  });
  return ys.map((xs, y) => ({
    year: y + 1, peasSav: m(xs, (x) => x.peas.sav), peasWealth: m(xs, (x) => x.peas.wealth), peasSol: m(xs, (x) => x.peas.sol), workWealth: m(xs, (x) => x.work.wealth), workSol: m(xs, (x) => x.work.sol),
    aristInc: m(xs, (x) => x.arist.inc), aristWealth: m(xs, (x) => x.arist.wealth), aristSol: m(xs, (x) => x.arist.sol), gentryInc: m(xs, (x) => x.gentry.inc), gentrySol: m(xs, (x) => x.gentry.sol),
    gSeat: m(xs, (x) => x.gSeat), gOther: m(xs, (x) => x.gOther), gIdle: m(xs, (x) => x.gIdle), expertW: m(xs, (x) => x.expertW),
    cash: m(xs, (x) => x.cash), skim: xs.reduce((a, x) => a + x.skim, 0), consSpend: m(xs, (x) => x.consSpend), consLv: m(xs, (x) => x.consLv), pledge: m(xs, (x) => x.pledge),
  }));
}

/** (k) 상회 현금 표: 해마다. 현금 0 인 날 = 상회 현금 < 1 플로린 */
function cashTable(r: RunResult) {
  const ds = r.days ?? [];
  console.log(`
(k) 상회 현금 [${r.def.name}]: 현금 평균·최저, 현금 0 인 날(< 1), 원료 충족(레벨 가중 평균), 민간 생산 레벨·고용(평균), 주인 금고 합(평균), 운전자금 넣은 돈(1년 합)`);
  console.log('년'.padEnd(4) + ['현금', '최저', '0인날', '원료충족', '생산Lv', '고용', '주인금고', '운전자금'].map((c) => pad(c, 10)).join(''));
  const out = [];
  let callPrev = 0;
  for (let y = 0; y < YEARS; y++) {
    const xs = ds.filter((d) => d.t > y * TICKS_PER_YEAR && d.t <= (y + 1) * TICKS_PER_YEAR);
    if (!xs.length) continue;
    const call = xs[xs.length - 1].call - callPrev; callPrev = xs[xs.length - 1].call;
    const row = { year: y + 1, cash: mean(xs.map((d) => d.cash)), min: Math.min(...xs.map((d) => d.cash)), zero: xs.filter((d) => d.cash < 1).length,
      fill: mean(xs.map((d) => d.fill).filter(Number.isFinite)), lv: mean(xs.map((d) => d.lv)), emp: mean(xs.map((d) => d.emp)), owner: mean(xs.map((d) => d.owner)), call };
    out.push(row);
    console.log(String(y + 1).padEnd(4) + [f2(row.cash), f2(row.min), String(row.zero), pct(row.fill), f2(row.lv), f2(row.emp), f2(row.owner), f2(row.call)].map((v) => pad(v, 10)).join(''));
  }
  return out;
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
    manor: SECTIONS.includes('m') ? manorTable(r) : undefined,
    nobleTable: SECTIONS.includes('n') ? nobleTable(r) : undefined,
    cash: SECTIONS.includes('k') ? cashTable(r) : undefined,
  };
  if (OUT) appendFileSync(`${OUT}-${name}.jsonl`, JSON.stringify(summary) + '\n');
  if (SECTIONS.includes('q')) quakeTable(r);
  if (SECTIONS.includes('w')) { lagTable(r); if (OUT) writeFileSync(`${OUT}-${name}-w.json`, JSON.stringify({ run: name, seed: SEED, tune: TUNE_SET, at: AT, lag: r.lag, days: r.wageDays })); }
}
const base = results.find((r) => r.def.name === 'base');
if (base && SECTIONS.includes('d')) shockTable(base, results.filter((r) => r.def.shocks.length > 0));
