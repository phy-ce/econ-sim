import { CLASS_DEFS, TUNE, WORKFORCE_RATIO } from './data';
import { popSol } from './economy';
import { clamp, round2 } from './rng';
import { POP_CLASSES } from './types';
import type { GoodBag, Household, Pop, PopClass, Region, World } from './types';

// pop: 같은 지역, 같은 직종, 같은 일터의 사람 묶음. 사람이 움직일 때는 저축·자격·부를 함께 들고 간다.

export const workforce = (p: Pop) => p.size * WORKFORCE_RATIO;

const PROF_INDEX = Object.fromEntries(POP_CLASSES.map((s, i) => [s, i])) as Record<PopClass, number>;
/** (지역, 직종) 의 숫자 키 */
const key = (regionId: number, prof: PopClass) => regionId * POP_CLASSES.length + PROF_INDEX[prof];
/** 일터 → (지역, 직종) → pop 색인. 직렬화하지 않고 필요할 때 다시 만든다 */
type PopIndex = Map<number, Map<number, Pop>>;
const indexes = new WeakMap<World, { map: PopIndex; n: number }>();

function put(map: PopIndex, p: Pop) {
  let byWork = map.get(p.work);
  if (!byWork) map.set(p.work, (byWork = new Map()));
  byWork.set(key(p.regionId, p.prof), p);
}

function index(w: World): PopIndex {
  let ix = indexes.get(w);
  if (!ix || ix.n !== w.pops.length) {
    const map: PopIndex = new Map();
    for (const p of w.pops) put(map, p);
    ix = { map, n: w.pops.length };
    indexes.set(w, ix);
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
    id: w.nextId++, regionId, prof, work, size: 0, savings: 0, wealth: 5, literacy: 0, quals: {}, sol: 0, growth: 0,
    incomeEma: 0, lastIncome: 0, lastSpend: 0, fulfillment: 1, food: 1, inKind: {},
  };
  w.pops.push(p);
  const ix = indexes.get(w);
  if (ix) { put(ix.map, p); ix.n = w.pops.length; }
  return p;
}

export function popsIn(w: World, regionId: number): Pop[] {
  return w.pops.filter((p) => p.regionId === regionId);
}

/** 계층 이동 누적 기록 (분석·화면용) */
function track(w: World, from: PopClass, to: PopClass, people: number) {
  if (from === to || !(people > 0)) return;
  const m = (w.mobility ??= {});
  const k = `${from}>${to}`;
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
  const carried: Partial<Record<PopClass, number>> = {};
  for (const q of Object.keys(from.quals) as PopClass[]) {
    const have = from.quals[q] ?? 0;
    const amt = q === qualified ? Math.min(have, moved) : have * frac;
    from.quals[q] = have - amt;
    carried[q] = amt;
  }
  // 직종이 바뀌면 원래 직종 자격을 들고 가고, 도착 직종의 자격은 들고 가지 않는다
  const drop = to.prof !== from.prof ? to.prof : null;
  if (drop) carried[from.prof] = (carried[from.prof] ?? 0) + moved;
  const total = to.size + people;
  const avg = (a: number, b: number) => (total > 0 ? (a * to.size + b * people) / total : b);
  to.wealth = avg(to.wealth, from.wealth);
  to.literacy = avg(to.literacy, from.literacy);
  to.food = avg(to.food, from.food);
  to.fulfillment = avg(to.fulfillment, from.fulfillment);
  const money = from.savings * frac, inc = from.incomeEma * frac;
  from.savings -= money; to.savings += money;
  from.incomeEma -= inc; to.incomeEma += inc;
  from.size -= people;
  to.size = total;
  const cap = to.size * WORKFORCE_RATIO;
  for (const q of Object.keys(carried) as PopClass[]) if (q !== drop) to.quals[q] = Math.min(cap, (to.quals[q] ?? 0) + (carried[q] ?? 0));
  track(w, from.prof, to.prof, people);
  return moved;
}

/** 다 빠져나간 pop 을 지운다. 남은 저축은 같은 지역·직종의 실업 pop 으로 (그 pop 도 이번에 지워지면 안 된다), 그것도 없으면 주인 없는 돈으로 */
export function prunePops(w: World) {
  const keep: Pop[] = [];
  for (const p of w.pops) {
    if (p.size >= 1e-3) { keep.push(p); continue; }
    if (p.savings !== 0 || p.incomeEma !== 0) {
      const heir = p.work !== 0 ? findPop(w, p.regionId, p.prof, 0) : undefined;
      if (heir && heir !== p && heir.size >= 1e-3) { heir.savings += p.savings; heir.incomeEma += p.incomeEma; } else w.fund += p.savings;
    }
  }
  if (keep.length !== w.pops.length) { w.pops = keep; indexes.delete(w); }
}

/** 조건에 맞는 pop 들에게 노동 인구 비례로 돈을 준다. 받을 pop 이 없으면 false */
export function payPops(w: World, pops: Pop[], amount: number, weight: (p: Pop) => number = (p) => p.size): boolean {
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
  const here = w.pops.filter((p) => p.regionId === regionId);
  if (!payPops(w, here.filter((p) => p.prof === prof), amount) && !payPops(w, here, amount)) w.fund += amount;
}

// ---------------------------------------------------------------- 자격 (빅토리아3 Qualifications)

/** 자격이 쌓이는 하루 속도 (계수 1, 노동 인구 1명당) */
export const QUAL_RATE = 0.00002;
/** 조건을 못 맞춘 자격이 사라지는 하루 비율 */
const QUAL_DECAY = 0.001;

/** 대상 직종별 기본 계수 (L = 문해력, W = 부). 0 이하면 자격이 쌓이지 않고 줄어든다 */
const QUAL_FACTOR: Partial<Record<PopClass, (L: number, W: number) => number>> = {
  skilled: (L) => Math.max(0, (L - TUNE.qualSkilledL) * 20),
  expert: (L, W) => (L > TUNE.qualExpertL ? (L - TUNE.qualExpertL) * 10 + W / 20 : 0),
  gentry: (L, W) => (L > TUNE.qualSkilledL ? (L - TUNE.qualSkilledL) * 10 + W / 20 : 0),
  capitalist: (L, W) => (W > 10 ? (W - 10) / 5 + 2 * L : 0),
  aristocrat: (L, W) => (W >= 15 ? ((W - 14) / 20 + Math.max(0, (W - 20) / 5)) * (0.5 + L / 2) : 0),
};
/** 출신 직종 배율: 가까운 직종에서 더 잘 옮겨 간다 */
const QUAL_FROM: Partial<Record<PopClass, Partial<Record<PopClass, number>>>> = {
  skilled: { unskilled: 2 },
  expert: { skilled: 5 },
  gentry: { aristocrat: 5, expert: 2 },
  capitalist: { aristocrat: 5, skilled: 5, expert: 5 },
  aristocrat: { capitalist: 5, gentry: 5 },
};

export function updateQualifications(w: World) {
  for (const p of w.pops) {
    const wf = workforce(p);
    if (wf <= 0) continue;
    for (const target of Object.keys(QUAL_FACTOR) as PopClass[]) {
      if (target === p.prof) continue;
      const f = QUAL_FACTOR[target]!(p.literacy, p.wealth) * (QUAL_FROM[target]?.[p.prof] ?? 1);
      const have = p.quals[target] ?? 0;
      if (f > 0) p.quals[target] = Math.min(wf, have + wf * QUAL_RATE * TUNE.qualRate * f);
      else if (have > 0) p.quals[target] = have * (1 - QUAL_DECAY);
    }
    for (const q of Object.keys(p.quals) as PopClass[]) if ((p.quals[q] ?? 0) > wf) p.quals[q] = wf;
  }
}

// ---------------------------------------------------------------- 문해력

/** 문해력은 지역 교육 접근도 + 부 단계 × 0.5% 를 향해 천천히 움직인다 (오를 땐 빠르고 내릴 땐 느리다) */
export function updateLiteracy(w: World) {
  const edu = new Map(w.regions.map((r) => [r.id, r.education]));
  for (const p of w.pops) {
    const target = clamp((edu.get(p.regionId) ?? 0) + 0.005 * p.wealth, 0, 1);
    p.literacy += (target - p.literacy) * (target > p.literacy ? 0.002 : 0.0005);
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
const SEVERE_STARVATION = 0.2;
function starvation(food: number) {
  const mild = clamp((STARVATION_LINE - food) / (STARVATION_LINE - SEVERE_STARVATION), 0, 1);
  const severe = clamp((SEVERE_STARVATION - food) / SEVERE_STARVATION, 0, 1);
  return { birth: 1 - 0.35 * mild - 0.55 * severe, mortality: 1 + 0.3 * mild + 0.7 * severe };
}

/**
 * pop 의 하루 순증가율. 출생 = 사망이 되는 생활수준은 신분마다 다르다 (TUNE.growthEq).
 * 생활수준을 그 신분의 평형점이 5가 되도록 늘이거나 줄여 빅토리아3 곡선에 넣는다
 */
export function growthAt(p: Pop): number {
  const sol = popSol(p) * (SOL_EQUILIBRIUM / TUNE.growthEq[CLASS_DEFS[p.prof].stratum]), st = starvation(p.food);
  return (birthRateAt(sol, p.literacy) * st.birth - mortalityAt(sol) * st.mortality) / DAYS_PER_MONTH;
}

export function updateGrowth(w: World) {
  for (const p of w.pops) {
    const g = growthAt(p);
    p.sol = round2(popSol(p));
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
  const byRegion = new Map<number, Region>(w.regions.map((r) => [r.id, r]));
  const sums = new Map<Region, Record<PopClass, Household>>();
  for (const r of w.regions) {
    const hh = {} as Record<PopClass, Household>;
    for (const s of POP_CLASSES) {
      // 그날 소비 기록은 이어서 쓴다
      hh[s] = emptyHousehold(s);
      hh[s].consumed = r.households?.[s]?.consumed ?? {};
    }
    sums.set(r, hh);
  }
  for (const p of w.pops) {
    const r = byRegion.get(p.regionId);
    if (!r) continue;
    const h = sums.get(r)![p.prof];
    const n = h.population + p.size;
    if (n > 0) {
      h.wealth = (h.wealth * h.population + p.wealth * p.size) / n;
      h.sol = (h.sol * h.population + popSol(p) * p.size) / n;
      h.fulfillment = (h.fulfillment * h.population + p.fulfillment * p.size) / n;
      h.food = (h.food * h.population + p.food * p.size) / n;
    }
    h.population = n;
    h.savings += p.savings;
    h.incomeEma += p.incomeEma;
    h.lastIncome += p.lastIncome;
    h.lastSpend += p.lastSpend;
    for (const [g, q] of Object.entries(p.inKind)) h.inKind[g as keyof GoodBag] = (h.inKind[g as keyof GoodBag] ?? 0) + (q ?? 0);
  }
  for (const r of w.regions) {
    const hh = sums.get(r)!;
    for (const s of POP_CLASSES) { if (hh[s].population <= 0) { hh[s].wealth = 0; hh[s].sol = 0; } }
    r.households = hh;
  }
}
