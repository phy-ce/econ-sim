// 0b 측정 지표 수집기 (오버홀 0b, docs/overhaul/01_VISION.md 10장 "0b 측정 항목 표", 10_ARCHITECTURE.md 3.1·3.8).
// 세계를 읽기만 한다: step 사이에 불러 상태를 읽고 lab 쪽 누적기에만 쓴다 (test/gate/lab.test.ts 가 lab 실행과 그냥 step 의 세계 해시가 같은지 본다).
// 해마다 연말(w.tick % 360 === 0)에 왕국별 한 줄과 왕국 합계 한 줄(k: 'all')을 낸다. 키 목록과 정의는 LAB_KEYS (아래)와 cli/labsum.py 가 같이 쓴다.
// 날마다 세는 값(체류일·바닥에 붙은 주·한계 켜진 날)은 after() 가 step 뒤에 센다. 지표 정의가 문서에 없는 것은 넣지 않는다 (DEFINED_NOT 목록).
import { BUILDING_BY_ID, BUILDING_TYPES, CLASS_DEFS, CONSUMPTION_PER_CAPITA, GOOD_IDS, GOODS, NEEDS, SKILL_DEFS, TECH_BY_ID, TECH_COST, TICKS_PER_WEEK, TICKS_PER_YEAR, TRADING_POST, TUNE, WORKFORCE_RATIO, getMethod, needsAt } from '../data';
import {
  FLOW_ZERO, builderOf, companyById, constructionEstimate, creditLimit, estimateMethod, harvestCondition, harvestFactor, isGovernment, isOwnerBuilding, kingdomGdp, paysDividend,
  slots, totalMoney, wagesAt,
} from '../economy';
import { kingdomLiteracy } from '../finance';
import { FLOW } from '../kingdoms';
import { subsistenceWage } from '../labor';
import { PRICE_MAX, PRICE_MIN, basketCostAt, needSharesAt, postUsable } from '../market';
import { lawUnlocked } from '../policy';
import { workforce } from '../pops';
import { ipowBin } from '../rng/ipow';
import { INVEST_LAWS, POP_CLASSES, SKILLS, TAX_LAWS, WEALTH_MIN, WELFARE_LAWS, isLowerJob } from '../types';
import type { Building, Company, GoodId, Kingdom, PopClass, PopIncomeSource, Skill, World } from '../types';

/** 해마다 한 줄 (jsonl). 숫자 칸과 안쪽 사전(report.py 가 "a.b" 로 펼친다) */
export type LabRow = Record<string, unknown>;

/** 허브 상품 6개 (06 문서 6.6: 공구·석탄·목재·철·기계·종이) */
export const HUB_GOODS: GoodId[] = ['tools', 'fuel', 'timber', 'metal', 'electronics', 'paper'];
/** 필요 묶음 상품 (한계 K3, 08 3.5): NEEDS 선택지에 나오는 상품 */
export const NEED_GOODS: GoodId[] = GOOD_IDS.filter((g) => NEEDS.some((n) => n.options.some((o) => o.good === g)));
/** 임금 위치(X03-W)를 보는 직종: 회사 임금표가 정하는 일자리 직종 (소유 직종·하급 귀족 제외) */
export const WAGE_JOBS: Skill[] = ['unskilled', 'farmer', 'skilled', 'expert'];
const SOURCES: PopIncomeSource[] = ['wages', 'dividends', 'rent', 'sales', 'welfare', 'other', 'tax'];
const NC = POP_CLASSES.length, NS = SOURCES.length;
const CI = Object.fromEntries(POP_CLASSES.map((c, i) => [c, i])) as Record<PopClass, number>;
const SI = Object.fromEntries(SOURCES.map((s, i) => [s, i])) as Record<PopIncomeSource, number>;
const LOWER = POP_CLASSES.map((c) => CLASS_DEFS[c].stratum === 'lower');
const UPPER = POP_CLASSES.map((c) => CLASS_DEFS[c].stratum === 'upper');
/** 시대 IV (가장 비싼 기술 값) */
const ERA4_COST = TECH_COST[TECH_COST.length - 1];
const MAX_TIER = 4;

/** 방식 단계 (methods_audit.ts 의 사다리): 같은 건물에서 첫 산출 상품이 같은 방식들 중 몇 번째인가 (1부터). 건축사무소는 공사 포인트 사다리 */
const TIER = new Map<string, number>();
for (const t of BUILDING_TYPES) {
  const seen = new Map<string, number>();
  for (const m of t.methods) {
    const key = m.construction ? 'construction' : (Object.keys(m.outputs)[0] ?? '-');
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    TIER.set(`${t.id}|${m.id}`, n);
  }
}
export const methodTier = (typeId: string, methodId: string): number => TIER.get(`${typeId}|${methodId}`) ?? 1;
/** 같은 사다리의 다음 방식 (없으면 undefined) */
export function nextMethod(typeId: string, methodId: string): string | undefined {
  const t = BUILDING_BY_ID[typeId];
  const cur = t.methods.find((m) => m.id === methodId);
  if (!cur) return undefined;
  const key = (m: typeof cur) => (m.construction ? 'construction' : (Object.keys(m.outputs)[0] ?? '-'));
  const same = t.methods.filter((m) => key(m) === key(cur));
  return same[same.indexOf(cur) + 1]?.id;
}

/** 설계 이익률 (methods_audit.ts 와 같은 셈): 기본가·기본 임금에서 (매출 − 임금 − 원료) ÷ 매출. 기본 방식은 20% (CLAUDE.md 건물 숫자 규칙) */
const DESIGN_MARGIN = new Map<string, number>();
for (const t of BUILDING_TYPES) for (const m of t.methods) {
  let rev = 0, cost = 0;
  for (const [g, q] of Object.entries(m.outputs)) rev += (q ?? 0) * GOODS[g as GoodId].basePrice;
  for (const [g, q] of Object.entries(m.inputs)) cost += (q ?? 0) * GOODS[g as GoodId].basePrice;
  for (const [s, n] of Object.entries(m.workers)) cost += (n ?? 0) * SKILL_DEFS[s as Skill].baseWage;
  if (rev > 0) DESIGN_MARGIN.set(`${t.id}.${m.id}`, (rev - cost) / rev);
}
/** '지은 지 52주 안' (07 4.5 (d) 짓고 부수기 지수) */
const QUICK_TICKS = 52 * TICKS_PER_WEEK;

/** 생산 건물 (단계 통계·노동 몫): 자동 건물·정부 건물·산출 없는 건물(무역소) 제외 */
function isProduction(b: Building): boolean {
  const t = BUILDING_BY_ID[b.typeId];
  return !t.auto && !isGovernment(b.typeId) && Object.keys(getMethod(b.typeId, b.methodId).outputs).length > 0;
}

/** 기본가에서 부 wealth 의 1인 하루 묶음 비용 (basketCostAt 과 같은 식, 가격만 기본가) */
function basketAtBase(wealth: number): number {
  const units = CONSUMPTION_PER_CAPITA;
  const need = needsAt(wealth);
  let v = 0;
  for (const n of NEEDS) {
    const per = need[n.id];
    if (!per) continue;
    const share = needSharesAt(n.id, n.options.map((o) => GOODS[o.good].basePrice), wealth);
    n.options.forEach((o, i) => { v += per * units * o.units * share[i] * GOODS[o.good].basePrice; });
  }
  return v;
}

/** (1 + growth/100) 의 360제곱근 = pop 의 하루 증가 배율 (updateGrowth 의 1 + g). Math.pow 대신 뉴턴 반복 (mathgrep.test) */
function dailyFactor(growthPct: number): number {
  const x = 1 + growthPct / 100;
  if (!(x > 0)) return 1;
  let y = 1 + (x - 1) / TICKS_PER_YEAR;
  for (let i = 0; i < 4; i++) {
    const p = ipowBin(y, TICKS_PER_YEAR - 1);
    y -= (p * y - x) / (TICKS_PER_YEAR * p);
  }
  return y;
}

/** 대칭 표본 규칙 (08 4.1): 매주 넘음 여부 하나, 최근 4주 중 3주 이상 넘음 = 켜짐, 3주 이상 아님 = 꺼짐, 2·2 면 그대로 */
class Sym {
  samples: boolean[] = [];
  on = false;
  judged = false;
  firstOn: boolean | null = null;
  push(x: boolean) {
    this.samples.push(x);
    if (this.samples.length > 4) this.samples.shift();
    if (this.samples.length < 4) return;
    const n = this.samples.filter(Boolean).length;
    if (n >= 3) this.on = true; else if (n <= 1) this.on = false;
    if (!this.judged) { this.judged = true; this.firstOn = this.on; }
  }
}

/** 한계 하나 (왕국 단위): 칸마다 대칭 규칙, 하나라도 켜지면 켜짐 */
class Limit {
  cells = new Map<string, Sym>();
  on = false;
  days = 0;
  raw = 0;
  flips = 0;
  firstOn: number | null = null;
  week(samples: Map<string, boolean>) {
    for (const [k, x] of samples) { let c = this.cells.get(k); if (!c) this.cells.set(k, (c = new Sym())); c.push(x); }
    // 이번 주 표본이 없는 칸은 넘음 아님으로 센다 (인구가 문턱 아래로 내려간 칸 등)
    for (const [k, c] of this.cells) if (!samples.has(k)) c.push(false);
    let on = false, anyRaw = false;
    for (const c of this.cells.values()) { if (c.on) on = true; }
    for (const x of samples.values()) if (x) anyRaw = true;
    if (this.firstOn === null && [...this.cells.values()].some((c) => c.judged)) this.firstOn = [...this.cells.values()].filter((c) => c.firstOn).length;
    if (on !== this.on) this.flips++;
    this.on = on;
    if (on) this.days += TICKS_PER_WEEK;
    if (anyRaw) this.raw += TICKS_PER_WEEK;
  }
  take() { const o = { days: this.days, raw: this.raw, flips: this.flips }; this.days = 0; this.raw = 0; this.flips = 0; return o; }
}

/** 범위(왕국 하나 또는 대륙)의 한 해 누적 */
class Acc {
  days = 0;
  weeks = 0;
  // 생활수준 연평균 (통과 기준 b)
  solPeas = 0; nPeas = 0; solUnsk = 0; nUnsk = 0;
  // 직종 × 소득 원천 (pop.incomeBreakdown, 하루 합의 한 해 합), 소비 (lastSpend)
  inc = new Float64Array(NC * NS);
  spend = new Float64Array(NC);
  sav0 = new Float64Array(NC);
  // L6 하층 소득 ÷ 생활비: 한 해 합과 마지막 7일
  lowNum = 0; lowDen = 0;
  lowRing: [number, number][] = [];
  // 부담률 (05 8.1): 직종별 7일 합 고리 (세금, 세금·복지 전 소득), 100% 초과 일수
  burdenRing: Float64Array[] = [];
  burdenDays = new Float64Array(NC);
  // 이주 (X01-c): 해 동안 왕국 간 순이주 (인구 변화 − 자연 증가)
  mig = 0;
  // 교역 (X01-c): 무역소 매입액 (shippedOut × 값)
  trade = 0;
  // 곡물값 (지역·날 평균)
  grain = 0; grainN = 0;
  // 기상 걸린 지역·날
  harvDays = 0;
  // 허브 상품 공급·수요 (하루 합)
  hubS = new Float64Array(HUB_GOODS.length);
  hubD = new Float64Array(HUB_GOODS.length);
  // 방식 단계별: 임금, 부가가치 (하루), 배당 (주), 하층 임금·바닥 (주, 고용 가중), 레벨 (연말)
  tWage = new Float64Array(MAX_TIER + 1);
  tVa = new Float64Array(MAX_TIER + 1);
  tDiv = new Float64Array(MAX_TIER + 1);
  tWf = new Float64Array(MAX_TIER + 1);
  tFl = new Float64Array(MAX_TIER + 1);
  // 임금 위치 (X03-W, 주마다 고용 가중): 바닥·천장·3배 상한에 붙은 고용, 바닥 > 천장, 임금 ÷ 바닥
  wEmp = new Float64Array(WAGE_JOBS.length);
  wFloor = new Float64Array(WAGE_JOBS.length);
  wCeil = new Float64Array(WAGE_JOBS.length);
  wCap = new Float64Array(WAGE_JOBS.length);
  wFgtC = new Float64Array(WAGE_JOBS.length);
  wRatio = new Float64Array(WAGE_JOBS.length);
  // 정책 (05 S0): 날마다 세금·복지·국영 임금 단계, 세금 1·5 단계 날 수, 부채 ÷ 한도 (주)
  taxStep = 0; tax1 = 0; tax5 = 0; welStep = 0; wageStep = 0;
  debtMax = 0; debt75 = 0;
  lawFails = 0;
  // 0b′ 5-1 비교 지표 (03 5장 1번): 팔린 비율(가치), 짓고 부수기 (레벨), 금고 새 약정, 유보 증설 착공·과잉 검사로 막힌 증설
  soldV = 0; supV = 0;
  demoLv = 0; quickDemo = 0; startLv = 0; builtLv = 0; pledgeNew = 0;
  growStarts = 0; glutBlock = 0;
  constructor() { for (let c = 0; c < NC; c++) this.burdenRing.push(new Float64Array(0)); }
}

interface GoodAcc {
  sd: number; sdN: number; rsd: Float64Array; rsdN: Float64Array; lo: number; hi: number; n: number; sup: number; dem: number; sub: number; bld: number; tin: number; tout: number; hh: number; price: number;
  /** 해 안 S/D 최소·최대 (대륙, 지역별) */
  cMin: number; cMax: number; rMin: Float64Array; rMax: Float64Array;
  /** 팔린 양 × 값, 내놓은 양 × 값 (하루 합) */
  soldV: number; supV: number;
}
/** 건물 레벨 기록 (짓고 부수기): 레벨마다 완공 날(시작 레벨·지은 날을 모르는 레벨은 −Infinity), 지역·종류 키 */
interface LevelRec { lv: number; ticks: number[]; key: string; regionId: number }
interface RegionAcc { cond: number; hf: number; grain: number; sales: number; floor: number }

const sig = (x: number) => (Number.isFinite(x) ? (x === 0 || Number.isInteger(x) ? x : Number(x.toPrecision(6))) : null);
const div = (a: number, b: number) => (b !== 0 ? a / b : null);
const M = 1e6, K = 1e3;

export interface CollectorOptions { run: string; seed: number; salt: number }

/** 0b 지표 수집기: new → (step 할 때마다) after(w) → 연말이면 줄을 돌려준다 */
export class Collector {
  readonly kingdoms: Kingdom[];
  /** 범위 번호: 0..nk−1 = w.kingdoms 순서, nk = 대륙 */
  readonly nk: number;
  readonly regionScope = new Map<number, number>();
  acc: Acc[] = [];
  goods = new Map<GoodId, GoodAcc>();
  regions = new Map<number, RegionAcc>();
  limits: { k1: Limit; k2: Limit; k3: Limit; k3near: Limit; k4a: Limit; k4b: Limit }[] = [];
  popBefore: number[] = [];
  lawFailSeen: { tax?: number; invest?: number }[] = [];
  /** 왕국마다 단계별 첫 기술 해, 법이 열린 해 (연말 줄에 그 뒤로 계속 적는다) */
  tierYear: Record<number, number>[] = [];
  lawYear: Record<string, number>[] = [];
  readonly base1 = basketAtBase(1);
  readonly base5 = basketAtBase(5);
  /** 짓고 부수기: 건물 id → 레벨 기록, 본 공사 id → (지역·종류 키, 레벨 수) */
  levels = new Map<number, LevelRec>();
  cons = new Map<number, [string, number]>();
  /** 연초 금고 합 (범위별), 연초 저택 거둠 누계 (kingdoms.ts FLOW) */
  vault0: number[] = [];
  skim0 = 0;
  /** 건물 종류.방식별 한 해 [매출, 원료비, 임금] (대륙) */
  margin = new Map<string, [number, number, number]>();

  constructor(w: World, readonly opt: CollectorOptions) {
    this.kingdoms = [...w.kingdoms];
    this.nk = this.kingdoms.length;
    this.kingdoms.forEach((k, i) => { for (const r of w.regions) if (r.kingdomId === k.id) this.regionScope.set(r.id, i); });
    for (let i = 0; i <= this.nk; i++) this.acc.push(new Acc());
    for (const g of GOOD_IDS) this.goods.set(g, this.newGood(w));
    for (const r of w.regions) this.regions.set(r.id, { cond: 0, hf: 0, grain: 0, sales: 0, floor: 0 });
    for (let i = 0; i < this.nk; i++) {
      this.limits.push({ k1: new Limit(), k2: new Limit(), k3: new Limit(), k3near: new Limit(), k4a: new Limit(), k4b: new Limit() });
      this.lawFailSeen.push({ ...(this.kingdoms[i].lawFail ?? {}) });
      this.tierYear.push({}); this.lawYear.push({});
    }
    this.popBefore = this.scopePops(w);
    for (const b of w.buildings) if (!BUILDING_BY_ID[b.typeId].auto) this.levels.set(b.id, { lv: b.level, ticks: new Array(b.level).fill(-Infinity), key: `${b.regionId}|${b.typeId}`, regionId: b.regionId });
    for (const k of w.constructions) this.cons.set(k.id, [`${k.regionId}|${k.typeId}`, k.levels ?? 1]);
    this.startYear(w);
    this.techs(w, 0);
  }

  /** ai.ts aiTrace 로 받는 AI 판단 기록 (run.ts 가 이어 준다): 유보 증설 착공('reserve', 레벨), 과잉 검사로 막힌 증설('glutBlock', 건물·주) */
  trace(path: string, regionId: number | undefined, levels: number) {
    if (path !== 'reserve' && path !== 'glutBlock') return;
    const s = regionId == null ? -1 : this.scopeOf(regionId);
    for (const a of s >= 0 ? [this.acc[s], this.acc[this.nk]] : [this.acc[this.nk]]) {
      if (path === 'reserve') a.growStarts += levels; else a.glutBlock++;
    }
  }

  private newGood(w: World): GoodAcc {
    const n = w.regions.length;
    return {
      sd: 0, sdN: 0, rsd: new Float64Array(n), rsdN: new Float64Array(n), lo: 0, hi: 0, n: 0, sup: 0, dem: 0, sub: 0, bld: 0, tin: 0, tout: 0, hh: 0, price: 0,
      cMin: Infinity, cMax: -Infinity, rMin: new Float64Array(n).fill(Infinity), rMax: new Float64Array(n).fill(-Infinity), soldV: 0, supV: 0,
    };
  }

  private scopeOf(regionId: number): number { return this.regionScope.get(regionId) ?? -1; }

  private scopePops(w: World): number[] {
    const n = new Array(this.nk + 1).fill(0);
    for (const p of w.pops) { const s = this.scopeOf(p.regionId); if (s >= 0) n[s] += p.size; n[this.nk] += p.size; }
    return n;
  }

  private startYear(w: World) {
    this.vault0 = new Array(this.nk + 1).fill(0);
    for (const b of w.buildings) {
      if (!isOwnerBuilding(b.typeId)) continue;
      const s = this.scopeOf(b.regionId);
      if (s >= 0) this.vault0[s] += b.cash ?? 0;
      this.vault0[this.nk] += b.cash ?? 0;
    }
    this.skim0 = FLOW['skim.manor'] ?? 0;
    this.margin.clear();
    for (const a of this.acc) a.sav0.fill(0);
    for (const p of w.pops) {
      const s = this.scopeOf(p.regionId);
      if (s >= 0) this.acc[s].sav0[CI[p.prof]] += p.savings;
      this.acc[this.nk].sav0[CI[p.prof]] += p.savings;
    }
  }

  private gov(w: World, i: number): Company | undefined { return companyById(w, this.kingdoms[i].governmentId); }

  /** step 한 번 뒤에 부른다. 연말이면 그해 줄들을 돌려준다 */
  after(w: World): LabRow[] {
    this.daily(w);
    if (w.tick % TICKS_PER_WEEK === 0) this.weekly(w);
    if (w.tick % TICKS_PER_YEAR !== 0) return [];
    const rows = this.year(w);
    this.acc = this.acc.map(() => new Acc());
    for (const g of GOOD_IDS) this.goods.set(g, this.newGood(w));
    for (const r of this.regions.values()) { r.cond = 0; r.hf = 0; r.grain = 0; r.sales = 0; r.floor = 0; }
    this.startYear(w);
    return rows;
  }

  // ------------------------------------------------------------ 날마다
  private daily(w: World) {
    const nk = this.nk, all = this.acc[nk];
    for (const a of this.acc) a.days++;
    // 지역 시장: 곡물값, 체류일, S/D, 공급 분해, 교역, 허브
    const [mn, mx] = [PRICE_MIN, PRICE_MAX];
    w.regions.forEach((r, ri) => {
      const s = this.scopeOf(r.id);
      const gr = r.market.grain.price / GOODS.grain.basePrice;
      for (const a of s >= 0 ? [this.acc[s], all] : [all]) { a.grain += gr; a.grainN++; }
      const ra = this.regions.get(r.id)!;
      ra.grain += gr;
      const cond = harvestCondition(w, r.id);
      if (cond) { ra.cond++; if (s >= 0) this.acc[s].harvDays++; all.harvDays++; }
      ra.hf += harvestFactor(w, r.id, 'arable');
      ra.floor += subsistenceWage(w, r) * TUNE.wageOutside;
      for (const g of GOOD_IDS) {
        const m = r.market[g], base = GOODS[g].basePrice, ga = this.goods.get(g)!;
        const ratio = m.price / base;
        ga.n++; ga.price += ratio;
        if (ratio <= mn * 1.05) ga.lo++;
        if (ratio >= mx * 0.95) ga.hi++;
        if (m.demandEma > FLOW_ZERO) {
          const q = m.supplyEma / m.demandEma;
          ga.rsd[ri] += q; ga.rsdN[ri]++;
          if (q < ga.rMin[ri]) ga.rMin[ri] = q;
          if (q > ga.rMax[ri]) ga.rMax[ri] = q;
        }
        const sv = m.sold * m.price, pv = m.supply * m.price;
        ga.soldV += sv; ga.supV += pv;
        for (const a of s >= 0 ? [this.acc[s], all] : [all]) { a.soldV += sv; a.supV += pv; }
        ga.sup += m.supply; ga.dem += m.demand; ga.tin += m.shippedIn; ga.tout += m.shippedOut;
        if (m.supplyBy) for (const key in m.supplyBy) { const q = m.supplyBy[key]; if (key === 'subsistence') ga.sub += q; else if (key.startsWith('bld:')) ga.bld += q; }
        if (m.demandBy) for (const key in m.demandBy) if (key.startsWith('pop:')) ga.hh += m.demandBy[key];
        const tv = m.shippedOut * m.price;
        if (tv > 0) { if (s >= 0) this.acc[s].trade += tv; all.trade += tv; }
        const hi = HUB_GOODS.indexOf(g);
        if (hi >= 0) for (const a of s >= 0 ? [this.acc[s], all] : [all]) { a.hubS[hi] += m.supply; a.hubD[hi] += m.demand; }
      }
    });
    // 대륙 S/D (지역 합 이동평균의 비, 수요 이동평균이 FLOW_ZERO 이하인 날은 세지 않는다)
    for (const g of GOOD_IDS) {
      let s = 0, d = 0;
      for (const r of w.regions) { s += r.market[g].supplyEma; d += r.market[g].demandEma; }
      const ga = this.goods.get(g)!;
      if (d > FLOW_ZERO) { const q = s / d; ga.sd += q; ga.sdN++; if (q < ga.cMin) ga.cMin = q; if (q > ga.cMax) ga.cMax = q; }
    }
    // pop: 소득 원천·소비·생활수준·L6·부담률·이주
    const basket1 = new Map<number, number>();
    for (const r of w.regions) basket1.set(r.id, basketCostAt(r, 1, WEALTH_MIN));
    const regionById = new Map(w.regions.map((r) => [r.id, r] as const));
    const dayTax: Float64Array[] = this.acc.map(() => new Float64Array(NC));
    const dayGross: Float64Array[] = this.acc.map(() => new Float64Array(NC));
    const lowNum = new Float64Array(nk + 1), lowDen = new Float64Array(nk + 1);
    const natural = new Float64Array(nk + 1), popNow = new Float64Array(nk + 1);
    for (const p of w.pops) {
      const s = this.scopeOf(p.regionId);
      const scopes = s >= 0 ? [s, nk] : [nk];
      const c = CI[p.prof];
      const r = regionById.get(p.regionId);
      const nat = p.size > 0 ? p.size * (1 - 1 / dailyFactor(p.growth)) : 0;
      let gross = 0, tax = 0;
      const br = p.incomeBreakdown;
      if (br) for (const k in br) { const v = br[k as PopIncomeSource] ?? 0; if (k === 'tax') tax += v; else if (k !== 'welfare') gross += v; }
      let inKind = 0;
      if (r) for (const g in p.inKind) inKind += (p.inKind[g as GoodId] ?? 0) * r.market[g as GoodId].price;
      if (p.prof === 'peasant' && br?.sales) this.regions.get(p.regionId)!.sales += br.sales;
      for (const si of scopes) {
        const a = this.acc[si];
        if (br) for (const k in br) a.inc[c * NS + SI[k as PopIncomeSource]] += br[k as PopIncomeSource] ?? 0;
        a.spend[c] += p.lastSpend;
        if (p.prof === 'peasant') { a.solPeas += p.sol * p.size; a.nPeas += p.size; }
        if (p.prof === 'unskilled') { a.solUnsk += p.sol * p.size; a.nUnsk += p.size; }
        if (LOWER[c] && r) { lowNum[si] += Math.max(0, p.incomeEma) + inKind; lowDen[si] += (basket1.get(r.id) ?? 0) * p.size; }
        dayTax[si][c] += tax; dayGross[si][c] += gross;
        natural[si] += nat; popNow[si] += p.size;
      }
    }
    for (let si = 0; si <= nk; si++) {
      const a = this.acc[si];
      a.lowNum += lowNum[si]; a.lowDen += lowDen[si];
      a.lowRing.push([lowNum[si], lowDen[si]]);
      if (a.lowRing.length > 7) a.lowRing.shift();
      for (let c = 0; c < NC; c++) {
        let ring = a.burdenRing[c];
        const next = new Float64Array(Math.min(14, ring.length + 2));
        next.set(ring.length >= 14 ? ring.subarray(2) : ring);
        next[next.length - 2] = dayTax[si][c]; next[next.length - 1] = dayGross[si][c];
        a.burdenRing[c] = ring = next;
        let t = 0, g = 0;
        for (let i = 0; i < ring.length; i += 2) { t += ring[i]; g += ring[i + 1]; }
        if (ring.length >= 14 && t > 0 && t > g) a.burdenDays[c]++;
      }
      a.mig += popNow[si] - this.popBefore[si] - natural[si];
    }
    this.popBefore = Array.from(popNow);
    // 방식 단계별 임금·부가가치 (생산 건물)
    for (const b of w.buildings) {
      if (!isProduction(b)) continue;
      const s = this.scopeOf(b.regionId), t = Math.min(MAX_TIER, methodTier(b.typeId, b.methodId));
      for (const si of s >= 0 ? [s, nk] : [nk]) { this.acc[si].tWage[t] += b.last.wageCost; this.acc[si].tVa[t] += b.last.revenue - b.last.inputCost; }
      const key = `${b.typeId}.${b.methodId}`;
      const mg = this.margin.get(key);
      if (mg) { mg[0] += b.last.revenue; mg[1] += b.last.inputCost; mg[2] += b.last.wageCost; }
      else this.margin.set(key, [b.last.revenue, b.last.inputCost, b.last.wageCost]);
    }
    this.trackLevels(w);
    // 정책 단계
    this.kingdoms.forEach((k, i) => {
      for (const a of [this.acc[i], all]) {
        const f = a === all ? 1 / nk : 1;
        a.taxStep += k.budget.tax * f; a.welStep += k.budget.welfare * f; a.wageStep += k.budget.wages * f;
        if (k.budget.tax === 1) a.tax1 += f;
        if (k.budget.tax === 5) a.tax5 += f;
      }
    });
  }

  /**
   * 짓고 부수기 (07 4.5 (d), 03 4.3 "지은 지 52주 안에 헐린 레벨"): 날마다 건물 레벨과 공사 목록을 앞날과 견준다.
   * 새 공사 = 착공 레벨 (그 공사의 저택·금융가 약정액 합 = 새 약정). 같은 (지역, 종류) 안에서 그날 사라진 공사의 레벨까지의 늘어남 = 완공 (그날을 레벨에 적는다),
   * 그 밖의 늘어남 = 민영화로 옮겨 온 레벨. 같은 (지역, 종류)의 줄어듦 중 옮겨 온 레벨만큼은 옮겨 간 레벨(지은 날을 넘긴다), 나머지 = 헐린 레벨.
   * 헐린 레벨은 그 건물에서 가장 최근에 지은 레벨로 본다 (그래서 52주 안 수는 상한이다). 시작 건물의 레벨은 지은 날이 없어 52주 안으로 세지 않는다.
   * 자동 건물(소작지·저택·금융가: 레벨이 사람 수를 따라 저절로 바뀐다)은 세지 않는다. 착공 레벨은 모든 공사 (자동 건물은 공사로 짓지 않는다)
   */
  private trackLevels(w: World) {
    const nk = this.nk;
    const scopes = (regionId: number) => { const s = this.scopeOf(regionId); return s >= 0 ? [this.acc[s], this.acc[nk]] : [this.acc[nk]]; };
    // 공사: 새로 생긴 것 (착공), 사라진 것 (완공 또는 취소)
    const built = new Map<string, number>();
    const live = new Set<number>();
    for (const k of w.constructions) {
      live.add(k.id);
      if (this.cons.has(k.id)) continue;
      const lv = k.levels ?? 1;
      this.cons.set(k.id, [`${k.regionId}|${k.typeId}`, lv]);
      let pledge = 0;
      if (k.funders) for (const v of Object.values(k.funders)) pledge += v;
      for (const a of scopes(k.regionId)) { a.startLv += lv; a.pledgeNew += pledge; }
    }
    for (const [id, [key, lv]] of this.cons) if (!live.has(id)) { built.set(key, (built.get(key) ?? 0) + lv); this.cons.delete(id); }
    // 건물 레벨 변화 (w.buildings 순서, 사라진 건물은 기록 순서)
    const gains: [Building, LevelRec, number][] = [], drops: [LevelRec, number][] = [];
    const seen = new Set<number>();
    for (const b of w.buildings) {
      if (BUILDING_BY_ID[b.typeId].auto) continue;
      seen.add(b.id);
      let rec = this.levels.get(b.id);
      if (!rec) { rec = { lv: 0, ticks: [], key: `${b.regionId}|${b.typeId}`, regionId: b.regionId }; this.levels.set(b.id, rec); }
      if (b.level > rec.lv) gains.push([b, rec, b.level - rec.lv]);
      else if (b.level < rec.lv) drops.push([rec, rec.lv - b.level]);
    }
    for (const [id, rec] of this.levels) if (!seen.has(id)) { if (rec.lv > 0) drops.push([rec, rec.lv]); this.levels.delete(id); }
    if (!gains.length && !drops.length) return;
    // 늘어남: 완공 몫과 옮겨 온 몫
    const movedIn = new Map<string, number>();
    const inQueue: [LevelRec, number][] = [];
    for (const [b, rec, n] of gains) {
      const c = Math.min(n, built.get(rec.key) ?? 0);
      built.set(rec.key, (built.get(rec.key) ?? 0) - c);
      for (let i = 0; i < c; i++) rec.ticks.push(w.tick);
      for (const a of scopes(b.regionId)) a.builtLv += c;
      if (n > c) { movedIn.set(rec.key, (movedIn.get(rec.key) ?? 0) + n - c); inQueue.push([rec, n - c]); }
      rec.lv = b.level;
    }
    // 줄어듦: 옮겨 간 몫(민영화)과 헐린 몫
    const passed = new Map<string, number[]>();
    for (const [rec, n] of drops) {
      const mv = Math.min(n, movedIn.get(rec.key) ?? 0);
      movedIn.set(rec.key, (movedIn.get(rec.key) ?? 0) - mv);
      for (let i = 0; i < n; i++) {
        const t = rec.ticks.pop() ?? -Infinity;
        if (i < mv) { const q = passed.get(rec.key) ?? []; q.push(t); passed.set(rec.key, q); continue; }
        for (const a of scopes(rec.regionId)) { a.demoLv++; if (w.tick - t < QUICK_TICKS) a.quickDemo++; }
      }
      rec.lv -= n;
    }
    for (const [rec, n] of inQueue) {
      for (let i = 0; i < n; i++) rec.ticks.push(passed.get(rec.key)?.shift() ?? -Infinity);
      rec.ticks.sort((x, y) => x - y);
    }
  }

  // ------------------------------------------------------------ 주마다
  private weekly(w: World) {
    const nk = this.nk, all = this.acc[nk];
    for (const a of this.acc) a.weeks++;
    const regionById = new Map(w.regions.map((r) => [r.id, r] as const));
    const floorOf = new Map<number, number>();
    for (const r of w.regions) floorOf.set(r.id, subsistenceWage(w, r) * TUNE.wageOutside);
    // 단계별 배당 (지난주 payout) 과 하층 임금 ÷ 바닥
    for (const b of w.buildings) {
      if (!isProduction(b)) continue;
      const s = this.scopeOf(b.regionId), t = Math.min(MAX_TIER, methodTier(b.typeId, b.methodId));
      let dv = 0;
      if (b.payout) { for (const id in b.payout.paid) dv += b.payout.paid[id]; dv += b.payout.crown ?? 0; }
      const c = companyById(w, b.companyId);
      let wf = 0, fl = 0;
      if (c) for (const sk of ['unskilled', 'farmer'] as const) {
        const e = b.employed[sk];
        if (e > 0) { wf += e * c.wages[sk]; fl += e * (floorOf.get(b.regionId) ?? 0); }
      }
      for (const si of s >= 0 ? [s, nk] : [nk]) { const a = this.acc[si]; a.tDiv[t] += dv; a.tWf[t] += wf; a.tFl[t] += fl; }
    }
    // 임금 위치 (ai.ts adjustWages 와 같은 바닥·천장 식, 주간 표본)
    for (const c of w.companies) {
      const i = this.kingdoms.findIndex((k) => k.id === c.kingdomId);
      const mine = w.buildings.filter((b) => b.companyId === c.id && !BUILDING_BY_ID[b.typeId].auto && !(c.state && isGovernment(b.typeId)));
      if (!mine.length) continue;
      let va = 0, baseBill = 0;
      for (const b of mine) {
        const m = getMethod(b.typeId, b.methodId);
        if (!b.active || !Object.keys(m.outputs).length) continue;
        const e = estimateMethod(w, b.regionId, b.typeId, b.methodId, c.wages, c.state);
        va += (e.revenue - e.inputCost) * b.level * b.utilization;
        for (const s of SKILLS) if (!paysDividend(c.state, s)) baseBill += slots(b, s) * SKILL_DEFS[s].baseWage;
      }
      const ceilMult = baseBill > 0 ? (Math.max(0, va) * TUNE.wageCeil) / baseBill : Infinity;
      WAGE_JOBS.forEach((s, j) => {
        if (paysDividend(c.state, s)) return;
        let cap = 0, emp = 0, outside = 0;
        for (const b of mine) {
          const n = slots(b, s);
          if (n <= 0) continue;
          cap += n; emp += b.employed[s];
          const r = regionById.get(b.regionId)!;
          outside += (isLowerJob(s) ? subsistenceWage(w, r) : s === 'skilled' ? c.wages.unskilled : c.wages.skilled) * n;
        }
        if (cap <= 0 || emp <= 0) return;
        const floor = (outside / cap) * TUNE.wageOutside, ceiling = SKILL_DEFS[s].baseWage * ceilMult, wage = c.wages[s];
        for (const a of i >= 0 ? [this.acc[i], all] : [all]) {
          a.wEmp[j] += emp;
          if (wage <= floor * 1.02) a.wFloor[j] += emp;
          if (wage >= ceiling * 0.98) a.wCeil[j] += emp;
          if (wage >= SKILL_DEFS[s].baseWage * 3 * 0.98) a.wCap[j] += emp;
          if (floor > ceiling) a.wFgtC[j] += emp;
          if (floor > 0) a.wRatio[j] += (emp * wage) / floor;
        }
      });
    }
    // 부채 ÷ 한도, lawFailed, 한계 K1~K4
    this.kingdoms.forEach((k, i) => {
      const gov = this.gov(w, i);
      if (gov) {
        const lim = creditLimit(w, gov), r = lim > 0 ? gov.debt / lim : 0;
        for (const a of [this.acc[i], all]) { a.debtMax = Math.max(a.debtMax, r); if (r >= 0.75) a.debt75 += TICKS_PER_WEEK / (a === all ? nk : 1); }
        this.limits[i].k2.week(new Map([['k', gov.debt >= lim]]));
      }
      const seen = this.lawFailSeen[i];
      for (const kind of ['tax', 'invest'] as const) {
        const t = k.lawFail?.[kind];
        if (t != null && t !== seen[kind]) { seen[kind] = t; this.acc[i].lawFails++; all.lawFails++; }
      }
    });
    // K1: 지역·직종 칸 식량 < 0.4 이고 인구 ≥ 5,000. K4: 생활수준 하한에 붙은 소작농 인구 비율 ≥ 50% / 75%
    const cellFood = new Map<string, [number, number, number]>();
    const k4 = this.kingdoms.map(() => [0, 0]);
    for (const p of w.pops) {
      const s = this.scopeOf(p.regionId);
      if (s < 0 || p.size <= 0) continue;
      const key = `${p.regionId}|${p.prof}`;
      const e = cellFood.get(key) ?? [s, 0, 0];
      e[1] += p.food * p.size; e[2] += p.size;
      cellFood.set(key, e);
      if (p.prof === 'peasant') { k4[s][1] += p.size; if (p.sol <= WEALTH_MIN + 1e-9) k4[s][0] += p.size; }
    }
    for (let i = 0; i < nk; i++) {
      const k1 = new Map<string, boolean>();
      for (const [key, [s, f, n]] of cellFood) if (s === i && n >= 5000) k1.set(key, f / n < 0.4);
      this.limits[i].k1.week(k1);
      const share = k4[i][1] > 0 ? k4[i][0] / k4[i][1] : 0;
      this.limits[i].k4a.week(new Map([['k', share >= 0.5]]));
      this.limits[i].k4b.week(new Map([['k', share >= 0.75]]));
      const k3 = new Map<string, boolean>(), k3n = new Map<string, boolean>();
      for (const r of w.regions) {
        if (this.scopeOf(r.id) !== i) continue;
        for (const g of NEED_GOODS) {
          const x = r.market[g].price / GOODS[g].basePrice;
          k3.set(`${r.id}|${g}`, x <= PRICE_MIN || x >= PRICE_MAX);
          k3n.set(`${r.id}|${g}`, x <= PRICE_MIN * 1.05 || x >= PRICE_MAX * 0.95);
        }
      }
      this.limits[i].k3.week(k3);
      this.limits[i].k3near.week(k3n);
    }
    this.techs(w, w.tick / TICKS_PER_YEAR);
  }

  /** 단계별 첫 기술 해와 법이 열린 해 (0.1년 단위, 주마다) */
  private techs(w: World, yr: number) {
    this.kingdoms.forEach((k, i) => {
      const gov = this.gov(w, i);
      if (!gov) return;
      for (const id of gov.research.known) {
        const tier = TECH_COST.indexOf(TECH_BY_ID[id]?.cost ?? -1);
        if (tier > 0 && this.tierYear[i][tier] == null) this.tierYear[i][tier] = Math.round(yr * 10) / 10;
      }
      for (const law of [...TAX_LAWS, ...INVEST_LAWS]) if (this.lawYear[i][law] == null && lawUnlocked(w, k, law)) this.lawYear[i][law] = Math.round(yr * 10) / 10;
    });
  }

  // ------------------------------------------------------------ 연말
  private year(w: World): LabRow[] {
    const y = w.tick / TICKS_PER_YEAR, nk = this.nk;
    const rows: LabRow[] = [];
    const head = (k: number | 'all') => ({ y, seed: this.opt.seed, salt: this.opt.salt, run: this.opt.run, k });
    for (let i = 0; i <= nk; i++) {
      const k = i < nk ? this.kingdoms[i] : undefined;
      const row: LabRow = { ...head(k ? k.id : 'all'), ...this.scopeRow(w, i) };
      if (i === nk) Object.assign(row, this.continentRow(w));
      rows.push(row);
    }
    return rows;
  }

  /** 범위 i 의 연말 값 (왕국 또는 대륙) */
  private scopeRow(w: World, i: number): LabRow {
    const nk = this.nk, isAll = i === nk, a = this.acc[i];
    const inScope = (regionId: number) => isAll || this.scopeOf(regionId) === i;
    const ks = isAll ? this.kingdoms.map((_, j) => j) : [i];
    // pop 연말 값
    const n = new Float64Array(NC), sol = new Float64Array(NC), food = new Float64Array(NC), ful = new Float64Array(NC), jobless = new Float64Array(NC), wf = new Float64Array(NC), sav = new Float64Array(NC);
    let lit = 0, money = 0, k4n = 0, k4d = 0;
    const regionSol = new Map<number, [number, number]>();
    for (const p of w.pops) {
      if (!inScope(p.regionId)) continue;
      const c = CI[p.prof];
      n[c] += p.size; sol[c] += p.sol * p.size; food[c] += p.food * p.size; ful[c] += p.fulfillment * p.size; wf[c] += workforce(p); sav[c] += p.savings;
      if (p.work === 0) jobless[c] += p.size;
      lit += p.literacy * p.size;
      if (!isAll) money += p.savings;
      const rs = regionSol.get(p.regionId) ?? [0, 0];
      rs[0] += p.sol * p.size; rs[1] += p.size;
      regionSol.set(p.regionId, rs);
      if (p.prof === 'peasant') { k4d += p.size; if (p.sol <= WEALTH_MIN + 1e-9) k4n += p.size; }
    }
    const pop = n.reduce((x, v) => x + v, 0);
    const lower = (f: Float64Array) => { let s = 0, d = 0; POP_CLASSES.forEach((_, c) => { if (LOWER[c]) { s += f[c]; d += n[c]; } }); return div(s, d); };
    let up = 0, upN = 0, lo = 0, loN = 0;
    POP_CLASSES.forEach((_, c) => { if (UPPER[c]) { up += sol[c]; upN += n[c]; } else if (LOWER[c]) { lo += sol[c]; loN += n[c]; } });
    const rsol = [...regionSol.values()].filter(([, m]) => m > 0).map(([s, m]) => s / m);
    // 돈·정부
    let cash = 0, debt = 0, gdp = 0, taxRatioW = 0, backlog = 0, backlogN = 0, debtLim = 0, limSum = 0;
    for (const j of ks) {
      const k = this.kingdoms[j], gov = this.gov(w, j);
      const g = kingdomGdp(w, k.id);
      gdp += g;
      let kp = 0;
      for (const p of w.pops) if (this.scopeOf(p.regionId) === j) kp += p.size;
      taxRatioW += (k.taxRatio ?? 0) * kp;
      if (!gov) continue;
      cash += gov.cash; debt += gov.debt;
      const lim = creditLimit(w, gov);
      debtLim += gov.debt; limSum += lim;
      // 대기 일수 (metrics.ts backlogDays 와 같은 셈)
      const builder = builderOf(w, gov), est = constructionEstimate(w, gov, 'farm');
      const q = w.constructions.filter((x) => { const o = companyById(w, x.companyId); return !!o && builderOf(w, o) === builder; }).reduce((s, x) => s + x.required - x.points, 0);
      if (est.pointsPerDay > 0) { backlog += q / est.pointsPerDay; backlogN++; }
    }
    if (isAll) money = totalMoney(w);
    else {
      for (const c of w.companies) if (c.kingdomId === this.kingdoms[i].id) money += c.cash;
      for (const b of w.buildings) if (b.cash !== undefined && this.scopeOf(b.regionId) === i) money += b.cash;
      for (const x of w.constructions) if (x.escrow !== undefined && companyById(w, x.companyId)?.kingdomId === this.kingdoms[i].id) money += x.escrow;
    }
    // 임금 (고용 가중, metrics.ts labor 와 같은 셈) 과 소작 소득
    const paid = new Float64Array(SKILLS.length), emp = new Float64Array(SKILLS.length);
    const tierLv = new Float64Array(MAX_TIER + 1);
    let posts = 0;
    const lvByType: Record<string, number[]> = {};
    for (const b of w.buildings) {
      if (!inScope(b.regionId) || BUILDING_BY_ID[b.typeId].auto) continue;
      const c = companyById(w, b.companyId);
      SKILLS.forEach((s, j) => { emp[j] += b.employed[s]; paid[j] += b.employed[s] * (c ? wagesAt(c, b.typeId)[s] : 0); });
      if (b.typeId === TRADING_POST && b.level > 0 && postUsable(b) > 0) posts++;
      if (isProduction(b)) {
        const t = Math.min(MAX_TIER, methodTier(b.typeId, b.methodId));
        tierLv[t] += b.level;
        (lvByType[b.typeId] ??= new Array(MAX_TIER + 1).fill(0))[t] += b.level;
      }
    }
    const wageOf = (s: Skill) => div(paid[SKILLS.indexOf(s)], emp[SKILLS.indexOf(s)]);
    // 0b′ 5-1: 저택·금융가 금고 합, 남은 금고 공사 약정액 (약정 − 낸 공사비, finance.ts pledgeLeft 의 합), 행정청 인원·레벨
    let vault = 0, pledge = 0, adminStaff = 0, adminLv = 0;
    for (const b of w.buildings) {
      if (!inScope(b.regionId)) continue;
      if (isOwnerBuilding(b.typeId)) vault += b.cash ?? 0;
      if (b.typeId === 'admin') { adminLv += b.level; for (const s of SKILLS) adminStaff += b.employed[s]; }
    }
    for (const x of w.constructions) {
      if (!x.funders || !inScope(x.regionId)) continue;
      let tot = 0;
      for (const v of Object.values(x.funders)) tot += v;
      pledge += Math.max(0, tot - x.spent);
    }
    let pi = 0, pw = 0, bk1 = 0, bk5 = 0, bkw = 0, bkWorker = 0;
    for (const r of w.regions) {
      if (!inScope(r.id)) continue;
      let peas = 0, people = 0;
      for (const p of w.pops) if (p.regionId === r.id) { people += p.size; if (p.prof === 'peasant' && p.work !== 0) peas += workforce(p); }
      pi += subsistenceWage(w, r) * peas; pw += peas;
      bk1 += (basketCostAt(r, 1, 1) / this.base1) * people; bk5 += (basketCostAt(r, 1, 5) / this.base5) * people; bkw += people;
      bkWorker += basketCostAt(r, 1 / WORKFORCE_RATIO, 1) * people;
    }
    const peasantIncome = div(pi, pw), basket1 = div(bk1, bkw);
    // 곡물 가격비 연말 값 (08 3.3.1 #4 goods.grain.ratio 와 같은 지역 단순 평균, 범위 안 지역만)
    let gSum = 0, gN = 0;
    for (const r of w.regions) if (inScope(r.id)) { gSum += r.market.grain.price / GOODS.grain.basePrice; gN++; }
    const grainEnd = gN > 0 ? gSum / gN : NaN;
    const wU = wageOf('unskilled');
    // 소득 흐름 (직종별 한 해 합, 백만)
    const cls: Record<string, Record<string, number | null>> = {};
    let welLow = 0, grossLow = 0, gdpPre = 0, taxY = 0;
    POP_CLASSES.forEach((c, ci) => {
      const get = (s: PopIncomeSource) => a.inc[ci * NS + SI[s]];
      const gross = get('wages') + get('dividends') + get('rent') + get('sales') + get('other');
      const income = gross + get('welfare');
      if (LOWER[ci]) { welLow += get('welfare'); grossLow += income; }
      gdpPre += get('wages') + get('dividends') + get('rent') + get('sales');
      taxY += get('tax');
      cls[c] = {
        inc: sig(income / M), spend: sig(a.spend[ci] / M), tax: sig(get('tax') / M), dSav: sig((sav[ci] - a.sav0[ci]) / M),
        wages: sig(get('wages') / M), dividends: sig(get('dividends') / M), rent: sig(get('rent') / M), sales: sig(get('sales') / M), welfare: sig(get('welfare') / M), other: sig(get('other') / M),
        burden: sig(div(get('tax'), gross) ?? NaN), burdenDays: a.burdenDays[ci],
      };
    });
    const ring = a.lowRing.reduce((s, [x, d]) => [s[0] + x, s[1] + d], [0, 0]);
    // 단계별
    const tier: Record<string, Record<string, number | null>> = {};
    const lvTot = tierLv.reduce((s, v) => s + v, 0);
    let wSum = 0, dSum = 0, vaSum = 0;
    for (let t = 1; t <= MAX_TIER; t++) {
      wSum += a.tWage[t]; vaSum += a.tVa[t]; dSum += a.tDiv[t];
      if (!tierLv[t] && !a.tWage[t] && !a.tDiv[t]) continue;
      // 임금은 하루 합, 배당은 주 합이다: 같은 한 해 합으로 견준다
      tier[t] = {
        lv: sig(div(tierLv[t], lvTot) ?? NaN), lab: sig(div(a.tWage[t], a.tWage[t] + a.tDiv[t]) ?? NaN), labVA: sig(div(a.tWage[t], a.tVa[t]) ?? NaN),
        div: sig(div(a.tDiv[t], a.tVa[t]) ?? NaN), wf: sig(div(a.tWf[t], a.tFl[t]) ?? NaN),
      };
    }
    const wpos: Record<string, Record<string, number | null>> = {};
    WAGE_JOBS.forEach((s, j) => {
      if (!a.wEmp[j]) return;
      wpos[s] = { floor: sig(a.wFloor[j] / a.wEmp[j]), ceil: sig(a.wCeil[j] / a.wEmp[j]), cap3: sig(a.wCap[j] / a.wEmp[j]), fgtc: sig(a.wFgtC[j] / a.wEmp[j]), ratio: sig(a.wRatio[j] / a.wEmp[j]) };
    });
    const hub: Record<string, number | null> = {};
    HUB_GOODS.forEach((g, j) => { hub[g] = sig(div(a.hubS[j], a.hubD[j]) ?? NaN); });
    const real: Record<string, number | null> = {};
    for (const s of WAGE_JOBS) { const v = wageOf(s); real[s] = v != null && basket1 ? sig(v / basket1) : null; }
    const wage: Record<string, number | null> = {};
    for (const s of WAGE_JOBS) wage[s] = sig(wageOf(s) ?? NaN);
    // 한계 (왕국 단위, 대륙 줄은 왕국 합)
    const lim: Record<string, number | null> = {};
    for (const name of ['k1', 'k2', 'k3', 'k3near', 'k4a', 'k4b'] as const) {
      let d = 0, raw = 0, flips = 0, first = 0;
      for (const j of ks) { const L = this.limits[j][name]; d += L.days; raw += L.raw; flips += L.flips; first += L.firstOn ?? 0; }
      lim[name] = d; lim[name + 'Raw'] = raw; lim[name + 'Flips'] = flips;
      if (w.tick === TICKS_PER_YEAR) lim[name + 'First'] = first;
    }
    if (i === nk) for (let j = 0; j < nk; j++) for (const L of Object.values(this.limits[j])) L.take();
    // 기술·법 (왕국 줄만)
    const tech: Record<string, number> = {};
    if (!isAll) {
      const gov = this.gov(w, i);
      tech.techs = gov?.research.known.length ?? 0;
      for (const [t, yy] of Object.entries(this.tierYear[i])) tech['tierY.' + t] = yy;
      for (const [l, yy] of Object.entries(this.lawYear[i])) tech['lawY.' + l] = yy;
      if (this.tierYear[i][TECH_COST.indexOf(ERA4_COST)] != null) tech.era4Y = this.tierYear[i][TECH_COST.indexOf(ERA4_COST)];
    }
    const k = isAll ? undefined : this.kingdoms[i];
    const d = Math.max(1, a.days);
    return {
      // 핵심·카드 지표 (08 3.3.1)
      pop: sig(pop / M), peas: sig(div(n[CI.peasant], pop) ?? NaN), jobless: sig(div(jobless.reduce((s, v) => s + v, 0), pop) ?? NaN),
      solPeas: sig(div(sol[CI.peasant], n[CI.peasant]) ?? NaN), solUnsk: sig(div(sol[CI.unskilled], n[CI.unskilled]) ?? NaN),
      solPeasAvg: sig(div(a.solPeas, a.nPeas) ?? NaN), solUnskAvg: sig(div(a.solUnsk, a.nUnsk) ?? NaN),
      solLower: sig(lower(sol) ?? NaN), fulfil: sig(lower(ful) ?? NaN), foodLow: sig(lower(food) ?? NaN),
      grain: sig(grainEnd), grainAvg: sig(div(a.grain, a.grainN) ?? NaN), gdp: sig(gdp / M), gdpPre: sig(gdpPre / M),
      'stock.gov': sig(cash / M), 'stock.govDebt': sig(debt / M), treasury: sig((cash - debt) / M), debtLimit: sig(div(debtLim, limSum) ?? NaN),
      taxRatio: sig(div(taxRatioW, pop) ?? NaN), lit: sig(isAll ? (div(lit, pop) ?? NaN) : kingdomLiteracy(w, k!.id)),
      classGap: sig(upN > 0 && loN > 0 && lo > 0 ? up / upN / (lo / loN) : NaN), regionGap: sig(rsol.length && Math.min(...rsol) > 0 ? Math.max(...rsol) / Math.min(...rsol) : NaN),
      welShare: sig(div(welLow, grossLow) ?? NaN),
      // 04 L6·L7
      lowInc: sig(div(ring[0], ring[1]) ?? NaN), lowIncAvg: sig(div(a.lowNum, a.lowDen) ?? NaN),
      wagePeas: sig(wU != null && peasantIncome ? wU / peasantIncome : NaN), peasantIncome: sig(peasantIncome ?? NaN),
      wage, realW: real, realWageU04: sig(wU != null && bkw > 0 ? wU / (bkWorker / bkw) : NaN),
      // 06 6.6 검토 후보
      hub, labShare: sig(div(wSum, wSum + dSum) ?? NaN), labShareVA: sig(div(wSum, vaSum) ?? NaN), backlog: sig(div(backlog, backlogN) ?? NaN),
      // X01-c·e
      tradeGdp: sig(div(a.trade, gdp) ?? NaN), tradeY: sig(a.trade / M), posts, netMig: sig(div(a.mig, pop) ?? NaN),
      'stock.total': sig(money / M), basket1: sig(basket1 ?? NaN), basket5: sig(div(bk5, bkw) ?? NaN), revY: sig(taxY / M), peasK: sig(n[CI.peasant] / K),
      // X03-S·W
      cls, wpos,
      // X06-8·9
      tier,
      // X05-S0
      taxStep: sig(a.taxStep / d), tax1Sh: sig(a.tax1 / d), tax5Sh: sig(a.tax5 / d), welS: sig(a.welStep / d), wageStep: sig(a.wageStep / d),
      ...(k ? { taxIdx: TAX_LAWS.indexOf(k.taxLaw), invIdx: INVEST_LAWS.indexOf(k.investLaw), welL: WELFARE_LAWS.indexOf(k.welfareLaw ?? 'none'),
        tWeeks: sig((k.expenseEma ?? 0) > 0 ? cash / k.expenseEma! : NaN) } : {}),
      lawFails: a.lawFails, debtMax: sig(a.debtMax), debt75: sig(a.debt75),
      // 0b′ 5-1 (03 5장 1번·4.3): 팔린 비율(가치), 귀족 직종(상급·하급 귀족) 저축 합, 금고 합·해마다 증가율, 금고 공사 약정 (남은 것, 올해 새로), 짓고 부수기, 유보 증설, 행정청
      sellV: sig(div(a.soldV, a.supV) ?? NaN), savNoble: sig((sav[CI.gentry] + sav[CI.aristocrat]) / M),
      vault: sig(vault / M), vaultG: sig(this.vault0[i] > 0 ? (vault - this.vault0[i]) / this.vault0[i] : NaN), pledge: sig(pledge / M), pledgeNew: sig(a.pledgeNew / M),
      startLv: a.startLv, builtLv: a.builtLv, demoLv: a.demoLv, quickDemo: a.quickDemo, quickIdx: sig(div(a.quickDemo, a.startLv) ?? NaN),
      growStarts: a.growStarts, glutBlock: a.glutBlock, lvProd: lvTot, adminStaff: sig(adminStaff / K), adminLv,
      // X08-H (왕국 단위 요약), 08 3.5 한계
      harvDays: a.harvDays, k4Share: sig(div(k4n, k4d) ?? NaN), lim,
      ...tech,
      ...(isAll ? { lvType: Object.fromEntries(Object.entries(lvByType).map(([t, v]) => [t, Object.fromEntries(v.map((x, j) => [j, x]).filter(([j, x]) => j > 0 && x > 0))])) } : {}),
    };
  }

  /** 대륙 줄에만 붙는 것: 상품별 (X03 a·D, E1f), 지역별 수확 (X08-H) */
  private continentRow(w: World): LabRow {
    const sd: Record<string, number | null> = {}, sdMax: Record<string, number | null> = {}, sdAvg: Record<string, number | null> = {};
    const lo: Record<string, number | null> = {}, hi: Record<string, number | null> = {}, price: Record<string, number | null> = {};
    const sup: Record<string, number | null> = {}, dem: Record<string, number | null> = {}, subSup: Record<string, number | null> = {}, bldSup: Record<string, number | null> = {};
    const tIn: Record<string, number | null> = {}, tOut: Record<string, number | null> = {}, hh: Record<string, number | null> = {}, cap: Record<string, number | null> = {}, capLv: Record<string, number | null> = {};
    const capQ = new Map<GoodId, number>(), capL = new Map<GoodId, number>();
    for (const b of w.buildings) {
      if (BUILDING_BY_ID[b.typeId].auto) continue;
      const m = getMethod(b.typeId, b.methodId);
      for (const g of Object.keys(m.outputs) as GoodId[]) { capQ.set(g, (capQ.get(g) ?? 0) + (m.outputs[g] ?? 0) * b.level); capL.set(g, (capL.get(g) ?? 0) + b.level); }
    }
    const nd = Math.max(1, this.acc[this.nk].days);
    for (const g of GOOD_IDS) {
      const a = this.goods.get(g)!;
      sd[g] = a.sdN ? sig(a.sd / a.sdN) : null;
      const rs: number[] = [];
      for (let i = 0; i < a.rsd.length; i++) if (a.rsdN[i] > 0) rs.push(a.rsd[i] / a.rsdN[i]);
      sdMax[g] = rs.length ? sig(Math.max(...rs)) : null;
      sdAvg[g] = rs.length ? sig(rs.reduce((s, v) => s + v, 0) / rs.length) : null;
      lo[g] = sig(a.lo / Math.max(1, a.n)); hi[g] = sig(a.hi / Math.max(1, a.n)); price[g] = sig(a.price / Math.max(1, a.n));
      sup[g] = sig(a.sup / nd / K); dem[g] = sig(a.dem / nd / K); subSup[g] = sig(a.sub / nd / K); bldSup[g] = sig(a.bld / nd / K);
      tIn[g] = sig(a.tin / nd / K); tOut[g] = sig(a.tout / nd / K); hh[g] = sig(a.hh / nd / K);
      cap[g] = sig((capQ.get(g) ?? 0) / K); capLv[g] = capL.get(g) ?? 0;
    }
    // 0b′ 5-1: 해 안 S/D 진동 폭 (최대 − 최소; 대륙, 지역 중앙값·최대. 수요가 아주 작은 지역의 폭이 평균을 덮어 중앙값을 쓴다), 상품별 팔린 비율(가치)
    const sdSwing: Record<string, number | null> = {}, sdSwingR: Record<string, number | null> = {}, sdSwingRMax: Record<string, number | null> = {}, sellG: Record<string, number | null> = {};
    for (const g of GOOD_IDS) {
      const a = this.goods.get(g)!;
      sdSwing[g] = a.sdN ? sig(a.cMax - a.cMin) : null;
      const sw: number[] = [];
      for (let i = 0; i < a.rMin.length; i++) if (a.rsdN[i] > 0) sw.push(a.rMax[i] - a.rMin[i]);
      sw.sort((x, y) => x - y);
      sdSwingR[g] = sw.length ? sig(sw.length % 2 ? sw[(sw.length - 1) / 2] : (sw[sw.length / 2 - 1] + sw[sw.length / 2]) / 2) : null;
      sdSwingRMax[g] = sw.length ? sig(Math.max(...sw)) : null;
      sellG[g] = a.supV > 0 ? sig(a.soldV / a.supV) : null;
    }
    // 실제 이익률 ÷ 설계 이익률 (건물 종류.방식별 한 해 합: (매출 − 원료 − 임금) ÷ 매출), 기본 방식(1단계) 묶음은 ÷ 20%
    const margR: Record<string, number | null> = {};
    let r1 = 0, p1 = 0;
    for (const [key, [rev, inp, wage]] of this.margin) {
      const dm = DESIGN_MARGIN.get(key);
      if (!(rev > 0) || !dm) continue;
      margR[key] = sig((rev - inp - wage) / rev / dm);
      const [typeId, methodId] = key.split('.');
      if (methodTier(typeId, methodId) === 1) { r1 += rev; p1 += rev - inp - wage; }
    }
    const skim = (FLOW['skim.manor'] ?? 0) - this.skim0;
    const reg: Record<string, Record<string, number | null>> = {};
    for (const r of w.regions) {
      const a = this.regions.get(r.id)!;
      reg[r.id] = { k: r.kingdomId, cond: sig(a.cond / nd), hf: sig(a.hf / nd), grain: sig(a.grain / nd), sales: sig(a.sales / K), floor: sig(a.floor / nd) };
    }
    return { sd, sdMax, sdAvg, lo, hi, price, sup, dem, subSup, bldSup, tIn, tOut, hh, cap, capLv, reg, sdSwing, sdSwingR, sdSwingRMax, sellG, margR, margR1: sig(r1 > 0 ? p1 / r1 / 0.2 : NaN), skim: sig(skim / M) };
  }
}

/**
 * 문서에 요구는 있으나 정의가 없거나 이 도구가 재지 않는 지표 (cli/labsum.py 가 표에 같이 적는다).
 * 이유가 바뀌면 이 목록을 고친다
 */
export const DEFINED_NOT: { item: string; why: string }[] = [
  { item: '실질 임금 연결 지수 (03 E1b 의 (나), 매년 실제 구매량 연결)', why: '정의는 있으나 지역·계층별 구매량 연결 계산이 이 도구에 없다. 고정 묶음(가) 판 realW.* 만 낸다' },
  { item: '허브 상품 충족률의 왕국 한 값', why: '06 6.6 은 상품마다 공급 ÷ 수요만 정의한다. hub.<상품> 여섯 개로 낸다' },
  { item: '대기 일수 E7 기준 단위', why: '08 3.3.1 기준 단위 근거 없음, 비율 지표도 아니라 E7 판정을 하지 않는다 (값은 backlog)' },
  { item: '올리지 못한 레벨의 원인 4가지 비율, 일자리 장부 (06 8.1 2·5)', why: 'AI 판단 안의 값이라 세계 상태만 읽어서는 못 센다 (methoddiag 가 필요). 짓고 허는 반복은 레벨 기록으로 센다 (quickDemo·quickIdx, 같은 (회사, 지역, 종류)의 같은 해 착공·철거 "되풀이" 수는 아직 없다)' },
  { item: '저택 거둠의 왕국별 값', why: 'kingdoms.ts FLOW 가 대륙 합 누계라 대륙 줄의 skim 만 낸다' },
  { item: '표지 채널 부담·궤적 이탈 (08 8.2 #8, 4.2)', why: '궤적 이탈의 W·k 후보가 정해지지 않았다 (잡음 폭이 나온 뒤)' },
  { item: '미지급 이탈 잔존율 (05 8.3 고갈 처방)', why: '건물별 일꾼 추적이 필요하다. 왕실 생산 건물이 없는 판에서는 0 이다' },
  { item: '세입 중 복지로 되돌아간 몫, 복지 문턱 전환 비율 (05 8.1)', why: 'pop 하루 단위의 같은 주 짝 계산이 필요하다 (이번 묶음에서 뺌)' },
  { item: '체인 끝 분포', why: '분해 체인(1a)이 없다 (10 3.8)' },
];
