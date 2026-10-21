import { CLASS_DEFS, TICKS_PER_WEEK, TUNE, WORKFORCE_RATIO } from './data';
import { popSol } from './economy';
import { clamp, round2 } from './rng';
import { POP_CLASSES, wealthOf } from './types';
import type { GoodBag, Household, Pop, PopClass, Region, World } from './types';

// pop: 같은 지역, 같은 직종, 같은 일터의 사람 묶음. 사람이 움직일 때는 저축·자격·부를 함께 들고 간다.

export const workforce = (p: Pop) => p.size * WORKFORCE_RATIO;

const PROF_INDEX = Object.fromEntries(POP_CLASSES.map((s, i) => [s, i])) as Record<PopClass, number>;
/** (지역, 직종) 의 숫자 키 */
const key = (regionId: number, prof: PopClass) => regionId * POP_CLASSES.length + PROF_INDEX[prof];
/** 일터 → (지역, 직종) → pop 색인. 직렬화하지 않고 필요할 때 다시 만든다 */
type PopIndex = Map<number, Map<number, Pop>>;
interface Indexed { map: PopIndex; n: number }
const indexes = new WeakMap<World, Indexed>();
/** 마지막으로 쓴 세계와 그 색인 (매번 WeakMap 을 찾지 않게). 늘 indexes.get(lastWorld) 와 같다 */
let lastWorld: World | null = null, lastIndexed: Indexed | undefined;

function indexed(w: World): Indexed | undefined {
  if (w !== lastWorld) { lastWorld = w; lastIndexed = indexes.get(w); }
  return lastIndexed;
}

function put(map: PopIndex, p: Pop) {
  let byWork = map.get(p.work);
  if (!byWork) map.set(p.work, (byWork = new Map()));
  byWork.set(key(p.regionId, p.prof), p);
}

function index(w: World): PopIndex {
  let ix = indexed(w);
  if (!ix || ix.n !== w.pops.length) {
    const map: PopIndex = new Map();
    for (const p of w.pops) put(map, p);
    ix = { map, n: w.pops.length };
    indexes.set(w, ix);
    lastIndexed = ix;
  }
  return ix.map;
}

export function findPop(w: World, regionId: number, prof: PopClass, work: number): Pop | undefined {
  return index(w).get(work)?.get(key(regionId, prof));
}

/** 그 자리의 pop. 없으면 빈 pop 을 만든다 */
export function getPop(w: World, regionId: number, prof: PopClass, work: number): Pop {
  const found = findPop(w, regionId, prof, work);
  if (found) return found;
  const p: Pop = {
    id: w.nextId++, regionId, prof, work, size: 0, savings: 0, wealth100: 500, literacy100: 0, wealth: 5, literacy: 0, quals: {}, sol: 0, growth: 0,
    incomeEma: 0, lastIncome: 0, lastSpend: 0, fulfillment: 1, food: 1, inKind: {},
  };
  w.pops.push(p);
  const ix = indexed(w);
  if (ix) { put(ix.map, p); ix.n = w.pops.length; }
  return p;
}

export function popsIn(w: World, regionId: number): Pop[] {
  return w.pops.filter((p) => p.regionId === regionId);
}

/** 금융가 b 의 지분 수 (없으면 0) */
export function fundOf(p: Pop, b: number): number {
  const f = p.fund;
  if (!f) return 0;
  const ids = f.id;
  for (let i = 0; i < ids.length; i++) if (ids[i] === b) return f.u[i];
  return 0;
}

/** 금융가 b 의 지분을 units 만큼 더한다 (없으면 id 순서 자리에 새로 넣는다) */
export function addFund(p: Pop, b: number, units: number): void {
  const f = (p.fund ??= { id: [], u: [] });
  const ids = f.id;
  let i = 0;
  for (; i < ids.length && ids[i] < b; i++);
  if (ids[i] === b) f.u[i] = f.u[i] + units;
  else if (i === ids.length) { ids.push(b); f.u.push(0 + units); }
  else { ids.splice(i, 0, b); f.u.splice(i, 0, 0 + units); }
}

/** 계층 이동 기록의 키 `출발>도착` (미리 만들어 둔다) */
const MOBILITY_KEY = Object.fromEntries(
  POP_CLASSES.map((a) => [a, Object.fromEntries(POP_CLASSES.map((b) => [b, `${a}>${b}`]))]),
) as Record<PopClass, Record<PopClass, string>>;

/** 계층 이동 누적 기록 (분석·화면용) */
function track(w: World, from: PopClass, to: PopClass, people: number) {
  if (from === to || !(people > 0)) return;
  const m = (w.mobility ??= {});
  const k = MOBILITY_KEY[from][to];
  m[k] = (m[k] ?? 0) + people;
}

/**
 * 노동 인구 workers 명(과 그 부양가족)을 from 에서 to 로 옮긴다. 저축·소득·자격은 사람 수에 비례해 들고 가고,
 * 부·문해력·충족률은 도착 pop 에서 인구 가중 평균이 된다.
 * qualified 를 주면 옮겨 가는 사람은 그 직종 자격자 중에서 뽑힌 것이다 (그 자격은 쓰여서 줄어든다).
 * 직종이 바뀌면 원래 직종의 자격은 들고 간다 (빅토리아3).
 */
export function movePeople(w: World, from: Pop, to: Pop, workers: number, qualified?: PopClass): number {
  if (from === to || !(workers > 0) || from.size <= 0) return 0;
  const frac = Math.min(1, workers / WORKFORCE_RATIO / from.size);
  const people = from.size * frac;
  const moved = people * WORKFORCE_RATIO;
  const fromProf = from.prof, toProf = to.prof;
  const total = to.size + people;
  const cap = total * WORKFORCE_RATIO;
  // 자격: 출발 pop 에서 덜어 도착 pop 에 더한다 (도착 pop 에 새 키는 출발 pop 의 키 순서대로, 원래 직종 키는 맨 뒤에 생긴다).
  // 직종이 바뀌면 원래 직종 자격을 들고 가고, 도착 직종의 자격은 들고 가지 않는다
  const fq = from.quals, tq = to.quals;
  const change = toProf !== fromProf;
  let ownCarried = false;
  for (const k in fq) {
    const q = k as PopClass;
    const have = fq[q] ?? 0;
    const amt = q === qualified ? Math.min(have, moved) : have * frac;
    fq[q] = have - amt;
    if (!change) tq[q] = Math.min(cap, (tq[q] ?? 0) + amt);
    else if (q === fromProf) { ownCarried = true; tq[q] = Math.min(cap, (tq[q] ?? 0) + (amt + moved)); }
    else if (q !== toProf) tq[q] = Math.min(cap, (tq[q] ?? 0) + amt);
  }
  if (change && !ownCarried) tq[fromProf] = Math.min(cap, (tq[fromProf] ?? 0) + moved);
  // 부·문해력·충족률은 인구 가중 평균
  const before = to.size;
  if (total > 0) {
    to.wealth100 = (to.wealth100 * before + from.wealth100 * people) / total;
    to.literacy100 = (to.literacy100 * before + from.literacy100 * people) / total;
    to.food = (to.food * before + from.food * people) / total;
    to.fulfillment = (to.fulfillment * before + from.fulfillment * people) / total;
  } else {
    to.wealth100 = from.wealth100;
    to.literacy100 = from.literacy100;
    to.food = from.food;
    to.fulfillment = from.fulfillment;
  }
  const money = from.savings * frac, inc = from.incomeEma * frac;
  from.savings -= money; to.savings += money;
  // 금융가 지분도 사람을 따라간다
  const ff = from.fund;
  if (ff) for (let i = 0; i < ff.id.length; i++) { const u = ff.u[i] * frac; ff.u[i] -= u; addFund(to, ff.id[i], u); }
  from.incomeEma -= inc; to.incomeEma += inc;
  from.size -= people;
  to.size = total;
  track(w, fromProf, toProf, people);
  return moved;
}

/** 다 빠져나간 pop 을 지운다. 남은 저축은 같은 지역·직종의 실업 pop 으로 (그 pop 도 이번에 지워지면 안 된다), 그것도 없으면 주인 없는 돈으로 */
export function prunePops(w: World) {
  const pops = w.pops;
  // 남길 목록은 지울 pop 이 처음 나올 때 만든다
  let keep: Pop[] | null = null;
  for (let i = 0; i < pops.length; i++) {
    const p = pops[i];
    if (p.size >= 1e-3) { if (keep) keep.push(p); continue; }
    if (!keep) keep = pops.slice(0, i);
    if (p.savings !== 0 || p.incomeEma !== 0 || p.fund) {
      const heir = p.work !== 0 ? findPop(w, p.regionId, p.prof, 0) : undefined;
      if (heir && heir !== p && heir.size >= 1e-3) {
        heir.savings += p.savings; heir.incomeEma += p.incomeEma;
        const pf = p.fund;
        if (pf) for (let j = 0; j < pf.id.length; j++) addFund(heir, pf.id[j], pf.u[j]);
      } else w.fund += p.savings;
    }
  }
  if (keep) {
    w.pops = keep;
    indexes.delete(w);
    if (lastWorld === w) lastIndexed = undefined;
  }
}

const bySize = (p: Pop) => p.size;

/** 조건에 맞는 pop 들에게 노동 인구 비례로 돈을 준다. 받을 pop 이 없으면 false */
export function payPops(w: World, pops: Pop[], amount: number, weight: (p: Pop) => number = bySize): boolean {
  if (amount <= 0) return true;
  let total = 0;
  for (const p of pops) total += weight(p);
  if (total <= 0) return false;
  for (const p of pops) {
    const amt = (amount * weight(p)) / total;
    p.savings += amt;
    p.lastIncome += amt;
  }
  return true;
}

/** 지역의 그 직종에게 돈을 준다. 그 직종이 없으면 지역 전체, 그것도 없으면 주인 없는 돈 */
export function payProf(w: World, regionId: number, prof: PopClass, amount: number) {
  if (amount <= 0) return;
  // payPops 와 같은 계산을 목록 없이 한다
  let mine = 0, all = 0;
  for (const p of w.pops) {
    if (p.regionId !== regionId) continue;
    if (p.prof === prof) mine += p.size;
    all += p.size;
  }
  if (!(mine <= 0)) {
    for (const p of w.pops) {
      if (p.regionId !== regionId || p.prof !== prof) continue;
      const amt = (amount * p.size) / mine;
      p.savings += amt;
      p.lastIncome += amt;
    }
  } else if (!(all <= 0)) {
    for (const p of w.pops) {
      if (p.regionId !== regionId) continue;
      const amt = (amount * p.size) / all;
      p.savings += amt;
      p.lastIncome += amt;
    }
  } else w.fund += amount;
}

// ---------------------------------------------------------------- 자격 (빅토리아3 Qualifications)

/** 자격이 쌓이는 하루 속도 (계수 1, 노동 인구 1명당) */
export const QUAL_RATE = 0.00002;
/** 조건을 못 맞춘 자격이 사라지는 하루 비율 */
export const QUAL_DECAY = 0.001;

/** 대상 직종별 기본 계수 (L = 문해력, W = 부). 0 이하면 자격이 쌓이지 않고 줄어든다 */
export const QUAL_FACTOR: Partial<Record<PopClass, (L: number, W: number) => number>> = {
  skilled: (L) => Math.max(0, (L - TUNE.qualSkilledL) * 20),
  expert: (L, W) => (L > TUNE.qualExpertL ? (L - TUNE.qualExpertL) * 10 + W / 20 : 0),
  gentry: (L, W) => (L > TUNE.qualSkilledL ? (L - TUNE.qualSkilledL) * 10 + W / 20 : 0),
  capitalist: (L, W) => (W > 10 ? (W - 10) / 5 + 2 * L : 0),
  aristocrat: (L, W) => (W >= 15 ? ((W - 14) / 20 + Math.max(0, (W - 20) / 5)) * (0.5 + L / 2) : 0),
};
/** 출신 직종 배율: 가까운 직종에서 더 잘 옮겨 간다 */
export const QUAL_FROM: Partial<Record<PopClass, Partial<Record<PopClass, number>>>> = {
  skilled: { unskilled: 2, farmer: 2 },
  expert: { skilled: 5 },
  gentry: { aristocrat: 5, expert: 2 },
  capitalist: { aristocrat: 5, skilled: 5, expert: 5 },
  aristocrat: { capitalist: 5, gentry: 5 },
};
const QUAL_TARGETS = Object.keys(QUAL_FACTOR) as PopClass[];
const QUAL_FNS = QUAL_TARGETS.map((t) => QUAL_FACTOR[t]!);
/** [대상 순번][출신 직종 순번] 의 출신 직종 배율 */
const QUAL_FROM_BY = QUAL_TARGETS.map((t) => POP_CLASSES.map((s) => QUAL_FROM[t]?.[s] ?? 1));

export function updateQualifications(w: World) {
  for (const p of w.pops) {
    const wf = workforce(p);
    if (wf <= 0) continue;
    const quals = p.quals, prof = p.prof, from = PROF_INDEX[prof];
    const L = p.literacy100 / 100, W = wealthOf(p);
    for (let i = 0; i < QUAL_TARGETS.length; i++) {
      const target = QUAL_TARGETS[i];
      if (target === prof) continue;
      const f = QUAL_FNS[i](L, W) * QUAL_FROM_BY[i][from];
      const have = quals[target] ?? 0;
      if (f > 0) quals[target] = Math.min(wf, have + wf * QUAL_RATE * TUNE.qualRate * f);
      else if (have > 0) quals[target] = have * (1 - QUAL_DECAY);
    }
    for (const k in quals) {
      const q = k as PopClass;
      if ((quals[q] ?? 0) > wf) quals[q] = wf;
    }
  }
}

/**
 * 저택 상급 귀족 자리 규칙(TUNE.nobleSeats)이 있으면 상급 귀족 수는 저택 자리에 맞춰 간다 (부와 상관없이):
 * 자리가 없는(실업) 상급 귀족은 하루 TUNE.nobleAdjust 씩 하급 귀족이 되고, 빈 자리는 하루 빈 자리 × nobleAdjust 만큼
 * 그 지역의 저택에 앉은 하급 귀족, 그다음 실업 하급 귀족이 채운다
 */
export function matchNobles(w: World) {
  const rate = TUNE.nobleAdjust;
  if (TUNE.nobleSeats === 'fit' || !(rate > 0)) return;
  const n = w.pops.length;
  for (let i = 0; i < n; i++) {
    const p = w.pops[i];
    if (p.prof !== 'aristocrat' || p.work !== 0 || p.size <= 0) continue;
    movePeople(w, p, getPop(w, p.regionId, 'gentry', 0), workforce(p) * rate);
  }
  for (const b of w.buildings) {
    if (b.typeId !== 'manor' || b.nobleSeats === undefined) continue;
    const seated = findPop(w, b.regionId, 'aristocrat', b.id);
    let gap = (b.nobleSeats - (seated ? workforce(seated) : 0)) * rate;
    if (!(gap > 1e-6)) continue;
    const dest = seated ?? getPop(w, b.regionId, 'aristocrat', b.id);
    for (const work of [b.id, 0]) {
      const src = findPop(w, b.regionId, 'gentry', work);
      if (!src || src.size <= 0 || gap <= 1e-6) continue;
      gap -= movePeople(w, src, dest, Math.min(gap, workforce(src)));
    }
  }
}

// ---------------------------------------------------------------- 문해력

/** 문해력 목표에 더하는 부 1단계의 몫 */
export const LITERACY_PER_WEALTH = 0.005;
/** 문해력과 교육 접근도가 목표로 다가가는 하루 비율 (오를 때, 내릴 때). 주 1회 7일치씩 움직인다 */
export const LITERACY_UP = 0.002;
export const LITERACY_DOWN = 0.0005;

/** value 를 target 쪽으로 7일치 움직인다 (문해력·교육 접근도, % 단위) */
export function weekToward(value: number, target: number): number {
  return value + (target - value) * TICKS_PER_WEEK * (target > value ? LITERACY_UP : LITERACY_DOWN);
}

/**
 * 문해력은 지역 교육 접근도 + 부 단계 × 0.5% 를 향해 천천히 움직인다 (오를 땐 빠르고 내릴 땐 느리다). 주 1회 7일치.
 * % 단위로 저장하므로 하루마다 움직이면 소수 둘째 자리에서 멈춘다 (하루 변화가 대개 0.005%p 미만이다)
 */
export function updateLiteracy(w: World) {
  const edu = new Map(w.regions.map((r) => [r.id, r.education100]));
  for (const p of w.pops) {
    const target = clamp((edu.get(p.regionId) ?? 0) + 100 * LITERACY_PER_WEALTH * wealthOf(p), 0, 100);
    p.literacy100 = weekToward(p.literacy100, target);
  }
}

// ---------------------------------------------------------------- 인구 증감

// 빅토리아3 인구 증감 (00_defines.txt Pop growth). 출생률·사망률은 생활수준(SoL)으로 정하고, 값은 달마다라 30으로 나눈다.
// SoL 5 에서 출생 = 사망, 10 부터 출생률이 내려가고, 15 에서 순증가가 가장 크고, 25 부터 바뀌지 않는다
const MAX_BIRTH = 0.0045, MIN_BIRTH = 0.0006, MAX_MORTALITY = 0.0055, MIN_MORTALITY = 0.00045;
const SOL_EQUILIBRIUM = 5, SOL_TRANSITION = 10, SOL_GROWTH_MAX = 15, SOL_STABLE = 25;
const GROWTH_MAX_MORTALITY_MULT = 0.35;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 360;
const lerp = (x: number, x0: number, x1: number, y0: number, y1: number) => y0 + ((clamp(x, x0, x1) - x0) * (y1 - y0)) / (x1 - x0);
const BIRTH_AT_GROWTH_MAX = lerp(SOL_GROWTH_MAX, SOL_TRANSITION, SOL_STABLE, MAX_BIRTH, MIN_BIRTH);
const MORTALITY_AT_GROWTH_MAX = BIRTH_AT_GROWTH_MAX * GROWTH_MAX_MORTALITY_MULT;

/** 달마다 출생률: SoL 10 까지 최대, 25 까지 최소로 내려간다. 문해력 100% 면 −10% */
export function birthRateAt(sol: number, literacy = 0): number {
  return lerp(sol, SOL_TRANSITION, SOL_STABLE, MAX_BIRTH, MIN_BIRTH) * (1 - 0.1 * clamp(literacy, 0, 1));
}

/** 달마다 사망률: SoL 0~5 굶주림 구간, 5~15 빠르게, 15~25 천천히 내려간다 */
export function mortalityAt(sol: number): number {
  if (sol < SOL_EQUILIBRIUM) return lerp(sol, 0, SOL_EQUILIBRIUM, MAX_MORTALITY, MAX_BIRTH);
  if (sol < SOL_GROWTH_MAX) return lerp(sol, SOL_EQUILIBRIUM, SOL_GROWTH_MAX, MAX_BIRTH, MORTALITY_AT_GROWTH_MAX);
  return lerp(sol, SOL_GROWTH_MAX, SOL_STABLE, MORTALITY_AT_GROWTH_MAX, MIN_MORTALITY);
}

/** 식량 부족 (빅토리아3): 식량 충족 40% 아래부터 출생 −35%·사망 +30% 까지, 20% 아래로 출생 −90%·사망 +100% 까지 */
export const STARVATION_LINE = 0.4;
export const SEVERE_STARVATION = 0.2;

/** 생활수준이 sol0 (popSol) 인 pop 의 하루 순증가율 */
function growthWith(p: Pop, sol0: number): number {
  const sol = sol0 * (SOL_EQUILIBRIUM / TUNE.growthEq[CLASS_DEFS[p.prof].stratum]);
  const mild = clamp((STARVATION_LINE - p.food) / (STARVATION_LINE - SEVERE_STARVATION), 0, 1);
  const severe = clamp((SEVERE_STARVATION - p.food) / SEVERE_STARVATION, 0, 1);
  const birth = 1 - 0.35 * mild - 0.55 * severe, mortality = 1 + 0.3 * mild + 0.7 * severe;
  return (birthRateAt(sol, p.literacy100 / 100) * birth - mortalityAt(sol) * mortality) / DAYS_PER_MONTH;
}

/**
 * pop 의 하루 순증가율. 출생 = 사망이 되는 생활수준은 신분마다 다르다 (TUNE.growthEq).
 * 생활수준을 그 신분의 평형점이 5가 되도록 늘이거나 줄여 빅토리아3 곡선에 넣는다
 */
export function growthAt(p: Pop): number {
  return growthWith(p, popSol(p));
}

export function updateGrowth(w: World) {
  for (const p of w.pops) {
    const sol = popSol(p);
    const g = growthWith(p, sol);
    p.sol = round2(sol);
    p.growth = round2(((1 + g) ** DAYS_PER_YEAR - 1) * 100);
    p.size = Math.max(0, p.size * (1 + g));
  }
}

// ---------------------------------------------------------------- 화면용 요약

const emptyHousehold = (s: PopClass): Household => ({
  skill: s, population: 0, savings: 0, wealth: 0, sol: 0, fulfillment: 1, food: 1, inKind: {}, incomeEma: 0, lastIncome: 0, lastSpend: 0, consumed: {},
});

/** pop 을 지역·직종별로 합쳐 region.households 를 채운다 (화면과 기존 함수용) */
export function aggregateHouseholds(w: World) {
  const sums = new Map<Region, Record<PopClass, Household>>();
  /** 지역 id → 그 지역 합계 (id 가 겹치면 뒤의 지역) */
  const byId = new Map<number, Record<PopClass, Household>>();
  for (const r of w.regions) {
    const hh = {} as Record<PopClass, Household>;
    for (const s of POP_CLASSES) {
      // 그날 소비 기록은 이어서 쓴다
      hh[s] = emptyHousehold(s);
      hh[s].consumed = r.households?.[s]?.consumed ?? {};
    }
    sums.set(r, hh);
    byId.set(r.id, hh);
  }
  for (const p of w.pops) {
    const hh = byId.get(p.regionId);
    if (!hh) continue;
    const h = hh[p.prof];
    const n = h.population + p.size;
    if (n > 0) {
      h.wealth = (h.wealth * h.population + wealthOf(p) * p.size) / n;
      h.sol = (h.sol * h.population + popSol(p) * p.size) / n;
      h.fulfillment = (h.fulfillment * h.population + p.fulfillment * p.size) / n;
      h.food = (h.food * h.population + p.food * p.size) / n;
    }
    h.population = n;
    h.savings += p.savings;
    h.incomeEma += p.incomeEma;
    h.lastIncome += p.lastIncome;
    h.lastSpend += p.lastSpend;
    const kind = p.inKind, sum = h.inKind;
    for (const k in kind) {
      const g = k as keyof GoodBag;
      sum[g] = (sum[g] ?? 0) + (kind[g] ?? 0);
    }
  }
  for (const r of w.regions) {
    const hh = sums.get(r)!;
    for (const s of POP_CLASSES) { if (hh[s].population <= 0) { hh[s].wealth = 0; hh[s].sol = 0; } }
    r.households = hh;
  }
}
