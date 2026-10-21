import { CONSUMPTION_PER_CAPITA, GOOD_IDS, GOODS, NEEDS, SUBSISTENCE, TUNE, WORKFORCE_RATIO, getMethod, needsAt, rawMax } from './data';
import { CARTAGE_RATE, RAIL_RATE, borrow, harvestFactor, priceFormula, regionById, sellThrough, shippingRate, isSubsistence } from './economy';
import { financeIdle, payRent, paySalvage, taxDue, taxRates } from './finance';
import { borderCost, kingdomById, kingdomOf, payTariff, toTreasury } from './kingdoms';
import { INVEST_CLASSES } from './policy';
import { addFund, findPop, payPops, payProf, workforce } from './pops';
import { clamp } from './rng';
import { POP_CLASSES, WEALTH_MAX, WEALTH_MIN, wealthOf } from './types';
import type { Building, Company, GoodBag, GoodId, MarketGood, NeedDef, NeedId, Pop, Region, SalvageLot, Shipment, World } from './types';

// 시장 (지역마다 하나): 그날 나온 구매 주문과 판매 제안을 한 가격으로 체결한다.
// 건물 산출은 그날 못 팔면 사라진다 (재고 없음). 상인 화물만 남겨 두었다가 다음 날 다시 내놓는다 (하루 2% 상함).
// 지역 밖으로 나가는 화물은 운송비를, 국경을 넘으면 관세를 더 낸다.

type Payer = { kind: 'company'; c: Company } | { kind: 'trader' };

interface Order {
  src: string;
  regionId: number;
  good: GoodId;
  qty: number;
  payer: Payer;
  fill?: (q: number, cost: number) => void;
  /** 못 산 수량 (운송: 모자란 만큼 짐꾼 운임) */
  miss?: (q: number) => void;
}

type Lot =
  | { kind: 'bld'; b: Building; q: number }
  | { kind: 'sub'; pop: Pop; q: number }
  /** 지대: 수확에서 떼어 바로 파는 몫. 대금은 그 지역 저택으로 */
  | { kind: 'rent'; regionId: number; q: number }
  /** 한 시장의 상인 화물 전부 (화물 순서대로의 수량). 시장 안에서 상인 화물 제안은 건물 제안 뒤·철거 자재 앞에 이어 붙으므로 한 묶음이어도 순서가 같다 */
  | { kind: 'traders'; qs: number[] }
  | { kind: 'salvage'; lot: SalvageLot; q: number };

interface PopPlan {
  pop: Pop;
  basketCost: number;
  inKindValue: number;
  budget: number;
  /** 살 수량 (GOOD_IDS 순서) */
  goods: number[];
  foodNeed: number;
  foodInKind: number;
  foodBuy: { good: GoodId; gi: number; qty: number; units: number }[];
}

/** 하루 장부: 주문, 판매 제안, 가계 구매 계획 */
export interface Book {
  orders: Order[];
  /** 시장(mkey)별 판매 제안 */
  lots: Map<number, Lot[]>;
  plans: PopPlan[];
  /** 오늘 산 상인 화물: 도착 시장(mkey)마다 하나로 합친다 (출발지는 남기지 않는다) */
  fresh: Map<number, Shipment>;
}

const GOOD_INDEX = Object.fromEntries(GOOD_IDS.map((g, i) => [g, i])) as Record<GoodId, number>;
/** 시장 (지역, 상품) 의 숫자 키 */
const mkey = (regionId: number, g: GoodId) => regionId * GOOD_IDS.length + GOOD_INDEX[g];

export function newBook(): Book {
  return { orders: [], lots: new Map(), plans: [], fresh: new Map() };
}

function addLot(book: Book, regionId: number, g: GoodId, lot: Exclude<Lot, { kind: 'traders' }>) {
  if (!(lot.q > 1e-9)) return;
  const k = mkey(regionId, g);
  const list = book.lots.get(k);
  if (list) list.push(lot); else book.lots.set(k, [lot]);
}

function addBy(by: Record<string, number> | undefined, key: string, q: number) {
  if (!by || !(q > 0)) return;
  by[key] = (by[key] ?? 0) + q;
}

// ---------------------------------------------------------------- 하루 표 (속도용)
// 값은 needSplit·basketCostAt 과 같다 (같은 계산을 같은 순서로). 찾는 길만 짧다: 지역마다 상품 순서 가격 배열과
// 필요별 비중(그 필요의 선택지 가격이 바뀌면 지운다)을 지역 객체에 붙여 둔다 (WeakMap: 세계·불러오기마다 새로 만든다).
// 시장 단계(collectOrders·clearMarkets) 시작마다 지금 가격에 맞추고, 그 단계 안에서는 가격이 바뀌지 않는다

const NG = GOOD_IDS.length;
const NEED_COUNT = NEEDS.length;
const NEED_IDS = NEEDS.map((n) => n.id);
const FOOD_NEED = NEEDS.findIndex((n) => n.id === 'nourishment');
/** 필요마다 상한(max)이 있는 선택지 */
const NEED_CAPPED = NEEDS.map((n) => n.options.filter((o) => o.max != null));

/** 비중 한 칸: 상품 위치, 필요 단위, 비중, 그 단계의 가격 */
interface Pick { gi: number; good: GoodId; units: number; share: number; price: number }
interface NeedCache { prices: number[]; weights: number[] | null; one: Pick[] | null; byKey: Map<number | string, Pick[]> }
interface RegionDay { r: Region; price: number[]; mg: MarketGood[]; needs: NeedCache[] }
const regionDayCache = new WeakMap<Region, RegionDay>();

/** 지역별 표를 지금 가격에 맞춰 지역 id 위치에 담아 돌려준다 (regionById 처럼 같은 id 는 앞의 지역) */
function regionDays(w: World): RegionDay[] {
  const out: RegionDay[] = [];
  for (const r of w.regions) {
    let d = regionDayCache.get(r);
    if (!d) {
      d = { r, price: new Array(NG).fill(0), mg: [], needs: NEEDS.map((n) => ({ prices: n.options.map(() => NaN), weights: null, one: null, byKey: new Map() })) };
      regionDayCache.set(r, d);
    }
    for (let i = 0; i < NG; i++) { const mg = r.market[GOOD_IDS[i]]; d.mg[i] = mg; d.price[i] = mg.price; }
    for (let ni = 0; ni < NEED_COUNT; ni++) {
      const nc = d.needs[ni], opts = NEEDS[ni].options;
      let same = true;
      for (let i = 0; i < opts.length; i++) {
        const p = d.price[GOOD_INDEX[opts[i].good]];
        if (nc.prices[i] !== p) { same = false; nc.prices[i] = p; }
      }
      if (!same) { nc.weights = null; nc.one = null; nc.byKey.clear(); }
    }
    if (out[r.id] === undefined) out[r.id] = d;
  }
  return out;
}

function dayOf(days: RegionDay[], w: World, id: number): RegionDay {
  const d = days[id];
  if (d) return d;
  regionById(w, id); // 없는 지역: regionById 와 같은 오류
  throw new Error(`unknown region ${id}`);
}

/** needSplit(r, 필요, wealth) 와 같은 비중 (가격·상한이 같으면 같은 결과) */
function pickOf(d: RegionDay, ni: number, wealth: number): Pick[] {
  const nc = d.needs[ni];
  const capped = NEED_CAPPED[ni];
  if (capped.length === 0) return (nc.one ??= makePicks(nc, ni, wealth));
  const key = capped.length === 1 ? rawMax(capped[0].max, wealth) : capped.map((o) => rawMax(o.max, wealth)).join(',');
  let s = nc.byKey.get(key);
  if (!s) nc.byKey.set(key, (s = makePicks(nc, ni, wealth)));
  return s;
}

function makePicks(nc: NeedCache, ni: number, wealth: number): Pick[] {
  const need = NEEDS[ni];
  // computeSplit(need, 가격, 상한) 과 같은 계산. 무게는 가격으로만 정해지므로 상한 키끼리 같이 쓴다
  const share = splitShares((nc.weights ??= splitWeights(need, nc.prices)), need.options.map((o) => rawMax(o.max, wealth)));
  return need.options.map((o, i) => ({ gi: GOOD_INDEX[o.good], good: o.good, units: o.units, share: share[i], price: nc.prices[i] }));
}

/** basketCostAt 과 같은 값 (하루 표로) */
function basketCostDay(d: RegionDay, size: number, wealth: number): number {
  const units = size * CONSUMPTION_PER_CAPITA;
  const need = needsAt(wealth);
  let v = 0;
  for (let ni = 0; ni < NEED_COUNT; ni++) {
    const per = need[NEED_IDS[ni]];
    if (!per) continue;
    for (const o of pickOf(d, ni, wealth)) v += per * units * o.units * o.share * o.price;
  }
  return v;
}

/** 출처 이름 (매번 새 문자열을 만들지 않게) */
const POP_SRC = Object.fromEntries(POP_CLASSES.map((s) => [s, `pop:${s}`])) as Record<string, string>;
const BLD_SRC = new Map<string, string>();
const bldSrc = (typeId: string) => {
  let s = BLD_SRC.get(typeId);
  if (s === undefined) BLD_SRC.set(typeId, (s = `bld:${typeId}`));
  return s;
};

export function resetMarkets(w: World) {
  for (const r of w.regions) {
    for (const g of GOOD_IDS) {
      const mg = r.market[g];
      mg.demand = 0; mg.supply = 0; mg.sold = 0; mg.shippedIn = 0; mg.shippedOut = 0;
      mg.demandBy = {}; mg.supplyBy = {};
    }
    for (const s of POP_CLASSES) if (r.households[s]) r.households[s].consumed = {};
  }
  for (const p of w.pops) { p.lastIncome = 0; p.lastSpend = 0; p.inKind = {}; }
}

// ---------------------------------------------------------------- 소작

/** 소작지 노동 인구 wf 의 하루 수확 */
function harvestOutput(wf: number): GoodBag {
  const bag: GoodBag = {};
  for (const [g, q] of Object.entries(SUBSISTENCE.output) as [GoodId, number][]) bag[g] = wf * q;
  return bag;
}

/**
 * 소작지 수확 (빅토리아3 자급 산출): 소작농 노동 인구 × 1인당 산출.
 * 지대: 수확의 TUNE.rentShare 를 먼저 떼어 바로 시장에 팔고 대금은 그 지역 저택으로 간다 (그 지역 저택에 귀족이 있을 때. 소작농 부가 patronWealth 아래면 patronShare 만큼 덜 뗀다).
 * 남은 수확에서 식구가 그날 쓸 만큼 남기고 나머지를 판다 (splitHarvest). 판매 대금은 소작농 것이다 (토지세는 1인당 정액으로 따로 걷는다).
 */
export function harvest(w: World, book: Book) {
  for (const b of w.buildings) {
    if (!isSubsistence(b.typeId)) continue;
    const pop = findPop(w, b.regionId, 'peasant', b.id);
    b.last.output = {};
    if (!pop || pop.size <= 0) continue;
    const r = regionById(w, b.regionId);
    const { rent } = harvestShares(w, r, wealthOf(pop));
    // 기상 조건이 걸리면 수확이 그만큼 줄어든다 (economy.ts harvestFactor)
    const out = harvestOutput(workforce(pop) * harvestFactor(w, r.id, 'arable'));
    const { own, sell } = splitHarvest(pop.size, wealthOf(pop), GOOD_IDS.map((g) => (out[g] ?? 0) * (1 - rent)));
    for (let i = 0; i < NG; i++) {
      const g = GOOD_IDS[i], q = out[g];
      if (!q) continue;
      b.last.output[g] = q;
      pop.inKind[g] = own[i];
      const rq = q * rent;
      if (rq > 1e-9) {
        r.market[g].supply += rq;
        addBy(r.market[g].supplyBy, 'subsistence', rq);
        addLot(book, r.id, g, { kind: 'rent', regionId: r.id, q: rq });
      }
      if (sell[i] <= 1e-9) continue;
      r.market[g].supply += sell[i];
      addBy(r.market[g].supplyBy, 'subsistence', sell[i]);
      addLot(book, r.id, g, { kind: 'sub', pop, q: sell[i] });
    }
  }
}

/**
 * 소작지의 남에게 가는 몫: rent = 수확 중 지대로 떼는 비율 (그 지역 저택에 귀족이 있을 때만, 부 wealth 가 patronWealth 아래면 patronShare 만큼 덜),
 * tax = 소작농 노동 인구 1명(식구 포함)이 하루에 내는 토지세 (토지세 세법일 때, 정액 × 징수율)
 */
export function harvestShares(w: World, r: Region, wealth = WEALTH_MAX): { rent: number; tax: number } {
  const base = hasLandlords(w, r.id) ? TUNE.rentShare : 0;
  const rent = wealth < TUNE.patronWealth ? base * (1 - TUNE.patronShare) : base;
  const kd = kingdomById(w, r.kingdomId);
  const tax = (taxRates(kd).land * (kd.taxRatio ?? 1)) / WORKFORCE_RATIO;
  return { rent, tax };
}

/**
 * 소작지 수확 out(GOOD_IDS 순서)을 size 명, 부 wealth 인 소작농이 나누는 법 (현물 사용 순서·상한은 collectOrders 와 같다).
 * 그날 지금 부 단계로 쓸 만큼 쓰고(own) 나머지를 판다(sell). 수확이 필요보다 적으면 다 쓰고 팔지 않는다
 */
export function splitHarvest(size: number, wealth: number, out: number[]): { own: number[]; sell: number[] } {
  const left = useOwnKind(size, wealth, out.slice());
  return { own: out.map((x, i) => Math.max(0, x - left[i])), sell: left.map((x) => Math.max(0, x)) };
}

function bagOf(q: number[]): GoodBag {
  const bag: GoodBag = {};
  for (let i = 0; i < NG; i++) if (q[i] > 0) bag[GOOD_IDS[i]] = q[i];
  return bag;
}

/**
 * 소작농 노동 인구 1인당 하루 소득: 판매 대금(시장 판매율만큼) 중 지대·토지세(후원 포함)를 뺀 것 + 그날 쓴 현물의 시장가.
 * 쓰고 남아 버려지는 현물은 소득이 아니다
 */
export function tenantIncomePerWorker(w: World, r: Region, wealth: number): number {
  const out = harvestOutput(harvestFactor(w, r.id, 'arable'));
  const sh = harvestShares(w, r, wealth);
  const { own, sell } = splitHarvest(1 / WORKFORCE_RATIO, wealth, GOOD_IDS.map((g) => (out[g] ?? 0) * (1 - sh.rent)));
  let v = 0;
  for (let i = 0; i < NG; i++) {
    const mg = r.market[GOOD_IDS[i]];
    v += sell[i] * mg.price * sellThrough(mg) + own[i] * mg.price;
  }
  v -= sh.tax;
  return v;
}

/** 소작농 시작 부: 그 부의 소득(tenantIncomePerWorker × 노동 인구)으로 묶음 비용을 감당하는 가장 높은 단계 */
export function affordableTenantWealth(w: World, r: Region, size: number, wf: number): number {
  let L = WEALTH_MIN;
  while (L < WEALTH_MAX && basketCostAt(r, size, L + 1) <= tenantIncomePerWorker(w, r, L + 1) * wf) L++;
  return L;
}

/** 그 지역 저택에 귀족이 앉아 있는가 (소작지 지대를 받을 사람) */
function hasLandlords(w: World, regionId: number): boolean {
  const manor = w.buildings.find((x) => x.regionId === regionId && x.typeId === 'manor');
  const lords = manor ? findPop(w, regionId, 'aristocrat', manor.id) : undefined;
  return !!lords && lords.size > 0;
}

/** 현물 판매 대금은 판 pop 에게 */
function paySubsistence(w: World, pop: Pop, amount: number) {
  if (!payPops(w, [pop], amount)) w.fund += amount;
}

// ---------------------------------------------------------------- 주문

/** 가계가 하루에 저축에서 꺼내 쓸 수 있는 비율 */
export const SAVINGS_DRAW = 0.02;

/** 식량 상품별 원래 계획량 (pop 하나를 처리하는 동안만 쓰고 0으로 되돌린다) */
const FOOD_Q = new Float64Array(NG);

export function collectOrders(w: World, book: Book) {
  const days = regionDays(w);
  // 기업: 투입재 (2일분 보유 목표). 모자라면 왕실은 국채로 빌리고, 그래도 모자라면(민간은 바로) 현금만큼 줄인다
  for (const c of w.companies) {
    const operating: Order[] = [];
    for (const b of w.buildings) {
      if (b.companyId !== c.id || !b.active) continue;
      const method = getMethod(b.typeId, b.methodId);
      const st = Math.max(b.last.staffing, b.crew ?? 0);
      for (const g of GOOD_IDS) {
        const per = method.inputs[g];
        if (!per) continue;
        const want = Math.max(0, per * b.level * b.utilization * st * 2 - (b.stock[g] ?? 0));
        if (want <= 1e-9) continue;
        operating.push({
          src: bldSrc(b.typeId), regionId: b.regionId, good: g, qty: want, payer: { kind: 'company', c },
          fill: (q, cost) => { b.stock[g] = (b.stock[g] ?? 0) + q; b.last.inputCost += cost; },
        });
      }
    }
    let cost = 0;
    for (const o of operating) cost = cost + o.qty * dayOf(days, w, o.regionId).price[GOOD_INDEX[o.good]];
    if (c.cash < cost) borrow(w, c, cost - c.cash);
    const scale = cost > 0 ? clamp(c.cash / cost, 0, 1) : 1;
    for (const o of operating) { o.qty *= scale; if (o.qty > 1e-9) book.orders.push(o); }
  }

  // 가계 (pop 마다): 부 단계에 맞는 묶음. 현물을 먼저 쓰고, 예산이 모자라면 비례로 줄인다
  // 같은 지역·같은 부(0.1 단위)의 pop 은 그 필요를 처음 계산한 비중을 같이 쓴다 (지역 id → 부 키 → 필요별 비중)
  const groups: Map<number, (Pick[] | undefined)[]>[] = [];
  for (const p of w.pops) {
    if (p.size < 1e-3) continue;
    const d = dayOf(days, w, p.regionId);
    let byWealth = groups[d.r.id];
    if (!byWealth) groups[d.r.id] = byWealth = new Map();
    const L = wealthOf(p);
    const wk = Math.round(L * 10);
    let memo = byWealth.get(wk);
    if (!memo) byWealth.set(wk, (memo = new Array(NEED_COUNT)));
    const need = needsAt(L);
    const units0 = p.size * CONSUMPTION_PER_CAPITA;
    // 상품별 수량은 GOOD_IDS 순서 배열로 센다
    const goods: number[] = new Array(NG).fill(0);
    // 현물이 없으면 (소작농 말고는 늘) 현물 쓰기를 건너뛴다: 다 0 이면 useKind 는 필요를 그대로 돌려준다
    let inKind: number[] | null = null;
    for (const _g in p.inKind) { inKind = GOOD_IDS.map((g) => p.inKind[g] ?? 0); break; }
    let cashCost = 0, foodNeed = 0, foodInKind = 0;
    const foodBuy: PopPlan['foodBuy'] = [];
    for (let ni = 0; ni < NEED_COUNT; ni++) {
      const per = need[NEED_IDS[ni]];
      if (!per) continue;
      // 현물을 먼저 쓰고 (useKind), 남은 필요를 산다
      const total = per * units0;
      const units = inKind ? useKind(NEEDS[ni], total, L, inKind) : total;
      const isFood = ni === FOOD_NEED;
      if (isFood) { foodNeed = total; foodInKind = total - units; }
      for (const opt of (memo[ni] ??= pickOf(d, ni, L))) {
        const qty = units * opt.units * opt.share;
        if (qty <= 0) continue;
        cashCost += qty * opt.price;
        if (isFood) foodBuy.push({ good: opt.good, gi: opt.gi, qty, units: opt.units });
        goods[opt.gi] += qty;
      }
    }
    // 쓴 현물의 시장가 (소작농은 수확에서 그날 쓸 만큼만 현물로 남기므로 남는 현물은 없다)
    let inKindValue = 0;
    if (inKind) for (let i = 0; i < NG; i++) {
      const had = p.inKind[GOOD_IDS[i]] ?? 0;
      if (had > 0) inKindValue += (had - inKind[i]) * d.price[i];
    }
    const basketCost = cashCost + inKindValue;
    const budget = Math.max(0, Math.min(p.savings, p.incomeEma + p.savings * SAVINGS_DRAW));
    // 돈이 모자라면 식량부터 산다: 식량 몫을 먼저 채우고 남는 돈으로 나머지를 같은 비율로 산다
    let foodCost = 0;
    for (const f of foodBuy) foodCost = foodCost + f.qty * d.price[f.gi];
    const foodFrac = foodCost > 0 ? Math.min(1, budget / foodCost) : 1;
    const restCost = cashCost - foodCost;
    const restFrac = restCost > 1e-9 ? clamp((budget - foodCost) / restCost, 0, 1) : 1;
    for (const f of foodBuy) { FOOD_Q[f.gi] = FOOD_Q[f.gi] + f.qty; f.qty *= foodFrac; }
    for (let i = 0; i < NG; i++) {
      const all = goods[i];
      if (all <= 0) continue;
      const fq = Math.min(all, FOOD_Q[i]);
      goods[i] = fq * foodFrac + (all - fq) * restFrac;
    }
    for (const f of foodBuy) FOOD_Q[f.gi] = 0;
    book.plans.push({ pop: p, basketCost, inKindValue, budget, goods, foodNeed, foodInKind, foodBuy });
    const src = POP_SRC[p.prof] ?? `pop:${p.prof}`;
    for (let i = 0; i < NG; i++) {
      const q = goods[i];
      if (q <= 1e-9) continue;
      const mg = d.mg[i];
      mg.demand += q;
      addBy(mg.demandBy, src, q);
    }
  }

  addTraderOrders(w, book, days);
}

/** 대체재 선택 민감도: 클수록 싼 쪽으로 쏠린다 */
export const SUBSTITUTION_EXP = 10;

/** 필요 단위 비용^-k 에 비례해서 선택지별 비중을 나누고, 상품별 최대 비중(max)을 넘는 몫은 나머지에 다시 나눈다 */
type Split = (NeedDef['options'][number] & { share: number })[];
const NEED_BY_ID = new Map(NEEDS.map((n) => [n.id, n]));
/** 필요마다 상한(max)이 있는 선택지. 나머지 선택지의 상한은 늘 1 이다 */
const CAPPED = new Map(NEEDS.map((n) => [n.id, n.options.filter((o) => o.max != null)]));
/** 같은 지역·같은 가격·같은 상한이면 같은 결과라 재사용한다 (가격이 하나라도 바뀌면 다시 계산) */
const splitCache = new WeakMap<Region, Map<NeedId, Map<number | string, { prices: number[]; split: Split }>>>();

/** 그 지역 가격에서 부 wealth 인 pop 이 필요를 상품별로 나눠 사는 비중 (원자재 상한은 rawMax) */
export function needSplit(r: Region, needId: NeedId, wealth = Infinity): Split {
  const need = NEED_BY_ID.get(needId)!;
  // 캐시 키: 상한이 있는 선택지의 상한 (그것이 상한 목록 전체를 정한다)
  const capped = CAPPED.get(needId)!;
  const key = capped.length === 0 ? 0 : capped.length === 1 ? rawMax(capped[0].max, wealth) : capped.map((o) => rawMax(o.max, wealth)).join(',');
  let byRegion = splitCache.get(r);
  if (!byRegion) splitCache.set(r, (byRegion = new Map()));
  let byNeed = byRegion.get(needId);
  if (!byNeed) byRegion.set(needId, (byNeed = new Map()));
  const hit = byNeed.get(key);
  if (hit && samePrices(hit.prices, need, r)) return hit.split;
  const prices = need.options.map((o) => r.market[o.good].price);
  const caps = need.options.map((o) => rawMax(o.max, wealth));
  const split = computeSplit(need, prices, caps);
  byNeed.set(key, { prices, split });
  return split;
}

/** 선택지 가격(need.options 순서)이 prices 일 때 부 wealth 인 pop 의 선택지별 비중 (AI 전망용, 캐시 없음) */
export function needSharesAt(needId: NeedId, prices: number[], wealth: number): number[] {
  const need = NEED_BY_ID.get(needId)!;
  return splitShares(splitWeights(need, prices), need.options.map((o) => rawMax(o.max, wealth)));
}

function samePrices(prices: number[], need: NeedDef, r: Region): boolean {
  for (let i = 0; i < prices.length; i++) if (prices[i] !== r.market[need.options[i].good].price) return false;
  return true;
}

function computeSplit(need: NeedDef, prices: number[], caps: number[]): Split {
  const share = splitShares(splitWeights(need, prices), caps);
  return need.options.map((o, i) => ({ ...o, share: share[i] }));
}

/** 선택지별 무게: (가장 싼 필요 단위 비용 / 그 선택지 비용)^k. 가격으로만 정해진다 */
function splitWeights(need: NeedDef, prices: number[]): number[] {
  const costs = need.options.map((o, i) => o.units * prices[i]);
  const min = Math.min(...costs);
  return costs.map((c) => Math.pow(min / c, SUBSTITUTION_EXP));
}

/** 무게대로 나누고 상한(caps)을 넘는 몫은 나머지에 다시 나눈 비중 */
function splitShares(weights: number[], caps: number[]): number[] {
  const share = new Array(weights.length).fill(0);
  const capped = new Array(weights.length).fill(false);
  let left = 1;
  for (let pass = 0; pass < weights.length && left > 1e-12; pass++) {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum = sum + (capped[i] ? 0 : weights[i]);
    if (sum <= 0) break;
    let spill = 0;
    for (let i = 0; i < weights.length; i++) {
      if (capped[i]) continue;
      const max = caps[i];
      const want = share[i] + (left * weights[i]) / sum;
      if (want > max) { spill += want - max; share[i] = max; capped[i] = true; } else share[i] = want;
    }
    left = spill;
  }
  return share;
}

// ---------------------------------------------------------------- 운송과 교역

function charge(w: World, payer: Payer, amount: number) {
  switch (payer.kind) {
    case 'company': payer.c.cash -= amount; break;
    case 'trader': w.traders.cash -= amount; break;
  }
}

/** 화물 value 어치를 regionId 에서 내보내는 데 필요한 운송 주문. 못 산 만큼은 짐꾼 운임을 내고, 그 돈은 그 지역 노동자 몫이다 */
function transportOrder(w: World, regionId: number, value: number, payer: Payer, src: string): Order {
  const per = RAIL_RATE / GOODS.transport.basePrice;
  return {
    src, regionId, good: 'transport', qty: value * per, payer,
    miss: (q) => {
      const fee = (q / per) * CARTAGE_RATE;
      if (fee <= 1e-9) return;
      charge(w, payer, fee);
      payProf(w, regionId, 'unskilled', fee);
    },
  };
}

/** 운송비와 관세를 넘는 가격 차 1%당 평균 유통량의 몇 %를 옮기는가 */
export const SHIP_RATE = 10;
/** 팔리지 않은 상인 화물이 하루에 상하는 비율 */
export const CARGO_DECAY = 0.02;
/** 묵은 화물이 이만큼(단위) 아래로 줄면 없어진다 */
export const CARGO_MIN = 1;

/**
 * 상인 화물의 시장(mkey)별 수량 합 (화물 순서대로). 화물 목록은 이 파일만 바꾸고, updatePrices 뒤로 다음 날 addTraderOrders 까지는
 * 그대로라 같은 목록(같은 배열·같은 길이)이면 센 것을 다시 쓴다. 세계마다 따로다 (불러오면 새로 센다)
 */
const shipSums = new WeakMap<World, { list: Shipment[]; n: number; sums: number[] }>();
function shipmentSums(w: World): number[] {
  const list = w.traders.shipments;
  const c = shipSums.get(w);
  if (c && c.list === list && c.n === list.length) return c.sums;
  const sums: number[] = [];
  for (const sh of list) { const k = mkey(sh.to, sh.good); sums[k] = (sums[k] ?? 0) + sh.q; }
  shipSums.set(w, { list, n: list.length, sums });
  return sums;
}

/** 이웃 지역 값이 운송비 + 관세보다 더 비싸면 상인이 싼 쪽에서 사서 다음 날 비싼 쪽에 판다 */
function addTraderOrders(w: World, book: Book, days: RegionDay[]) {
  const pending: { o: Order; to: number; tariff: number; ship: number; ma: MarketGood }[] = [];
  // 시장(mkey)별 합계는 mkey 위치의 배열로 센다
  const inTransitOf = shipmentSums(w);
  for (const a of w.regions) {
    // 운송비율은 출발 지역 운송 시장으로만 정해진다 (freightRate = shippingRate + borderCost)
    let ship: number | undefined;
    for (const nb of a.neighbors) {
      const b = dayOf(days, w, nb).r;
      for (let gi = 0; gi < NG; gi++) {
        const g = GOOD_IDS[gi];
        if (GOODS[g].perishable) continue;
        const ma = a.market[g], mb = b.market[g];
        const tariff = borderCost(w, a.id, b.id, g);
        const rate = (ship ??= shippingRate(w, a.id)) + tariff;
        const gap = (mb.price * (1 - rate)) / ma.price - 1;
        if (gap <= 0) continue;
        const inTransit = inTransitOf[b.id * NG + gi] ?? 0;
        const unmet = Math.max(0, mb.demandEma - mb.supplyEma - inTransit);
        const flow = Math.max(ma.supplyEma, mb.demandEma);
        const q = Math.min(SHIP_RATE * gap * flow, unmet * 1.2 + flow * 0.05, ma.supplyEma * 0.9);
        if (q <= 1e-4) continue;
        pending.push({
          to: b.id, tariff, ship, ma,
          o: {
            src: 'trader', regionId: a.id, good: g, qty: q, payer: { kind: 'trader' },
            fill: (qq, cost) => {
              // 같은 시장으로 가는 오늘 화물은 하나로 합친다 (팔리는 비율·공급 신호·재고가 합과 같다)
              const k = b.id * NG + gi;
              const sh = book.fresh.get(k);
              if (sh) sh.q += qq;
              else {
                const s: Shipment = { to: b.id, good: g, q: qq };
                book.fresh.set(k, s);
                w.traders.shipments.push(s);
              }
              ma.shippedOut += qq;
              // 관세는 화물가 기준으로 도착 왕국 국고에
              const duty = cost * tariff;
              if (duty > 0) { w.traders.cash -= duty; payTariff(w, b.id, duty); }
            },
          },
        });
      }
    }
  }
  let cost = 0;
  for (const { o, tariff, ship, ma } of pending) cost = cost + o.qty * ma.price * (1 + ship + tariff);
  const scale = cost > 0 ? Math.min(1, Math.max(0, w.traders.cash) / cost) : 1;
  for (const { o, ma } of pending) {
    o.qty *= scale;
    if (o.qty <= 1e-6) continue;
    book.orders.push(o);
    book.orders.push(transportOrder(w, o.regionId, o.qty * ma.price, { kind: 'trader' }, 'trader'));
  }
}

// ---------------------------------------------------------------- 체결

/** 팔리지 않은 상인 화물 중 가격 신호에 공급으로 세는 비율 (같은 화물을 매일 새 공급으로 세지 않게) */
export const STALE_SIGNAL = 0.02;

/** 한 시장의 상인 화물 합계 (clearMarkets 안에서만) */
interface TradeAcc { mk: number; mg: MarketGood; supply: number; shippedIn: number; by: number | undefined; qs: number[] }

export function clearMarkets(w: World, book: Book) {
  const days = regionDays(w);

  // 판매 제안: 건물이 어제 만든 산출(빅토리아3처럼 재고는 없다: 그날 못 판 것은 사라진다), 전날 도착한 상인 화물
  // (건물 하나는 시장마다 판매 제안을 하나만 내므로, 건물 안에서 상품을 도는 순서는 결과에 상관없다)
  for (const b of w.buildings) {
    let src: string | undefined, market: Region['market'] | undefined;
    for (const k in b.outStock) {
      const g = k as GoodId;
      const q = b.outStock[g] ?? 0;
      if (q <= 1e-9) continue;
      const mg = (market ??= dayOf(days, w, b.regionId).r.market)[g];
      mg.supply += q;
      addBy(mg.supplyBy, (src ??= bldSrc(b.typeId)), q);
      addLot(book, b.regionId, g, { kind: 'bld', b, q });
    }
  }
  // 상인 화물: 시장마다 화물 순서대로 공급·도착량·출처별 공급을 더하고 (그동안 그 시장의 이 값들은 다른 데서 바뀌지 않는다),
  // 판매 제안은 시장마다 한 묶음으로 낸다
  const trade: TradeAcc[] = [], tradeOrder: TradeAcc[] = [];
  for (const sh of w.traders.shipments) {
    const mk = sh.to * NG + GOOD_INDEX[sh.good];
    let a = trade[mk];
    if (!a) {
      const mg = dayOf(days, w, sh.to).r.market[sh.good];
      a = trade[mk] = { mk, mg, supply: mg.supply, shippedIn: mg.shippedIn, by: undefined, qs: [] };
      tradeOrder.push(a);
    }
    const signal = sh.stale ? sh.q * STALE_SIGNAL : sh.q;
    a.supply += signal;
    // addBy(supplyBy, 'trader', signal) 와 같은 합
    if (signal > 0 && a.mg.supplyBy) a.by = (a.by ?? a.mg.supplyBy.trader ?? 0) + signal;
    a.shippedIn += sh.q;
    if (sh.q > 1e-9) a.qs.push(sh.q);
  }
  for (const a of tradeOrder) {
    a.mg.supply = a.supply;
    a.mg.shippedIn = a.shippedIn;
    if (a.by !== undefined) a.mg.supplyBy!.trader = a.by;
    if (a.qs.length === 0) continue;
    const list = book.lots.get(a.mk), lot: Lot = { kind: 'traders', qs: a.qs };
    if (list) list.push(lot); else book.lots.set(a.mk, [lot]);
  }
  w.traders.shipments = [];
  // 철거 자재: 남은 양을 남은 날 수로 나눠 내놓는다 (그날 못 판 것은 사라진다)
  for (const lot of w.salvage) {
    const q = lot.q / Math.max(1, lot.days);
    lot.q -= q; lot.days -= 1;
    const mg = dayOf(days, w, lot.regionId).r.market[lot.good];
    mg.supply += q;
    addBy(mg.supplyBy, 'salvage', q);
    addLot(book, lot.regionId, lot.good, { kind: 'salvage', lot, q });
  }
  w.salvage = w.salvage.filter((l) => l.days > 0 && l.q > 1e-6);

  for (const o of book.orders) {
    const mg = dayOf(days, w, o.regionId).r.market[o.good];
    mg.demand += o.qty;
    addBy(mg.demandBy, o.src, o.qty);
  }

  // 시장마다: 체결률, 판매 대금 분배, 남은 물건 처리
  const companyOf = new Map<number, Company>();
  for (const c of w.companies) if (!companyOf.has(c.id)) companyOf.set(c.id, c);
  const buyFill: number[] = [];
  for (const r of w.regions) {
    for (let gi = 0; gi < NG; gi++) {
      const g = GOOD_IDS[gi];
      const mg = r.market[g];
      const mk = r.id * NG + gi;
      const lots = book.lots.get(mk);
      let offered = 0;
      if (lots) for (const l of lots) {
        if (l.kind === 'traders') for (const q of l.qs) offered = offered + q;
        else offered = offered + l.q;
      }
      const sold = Math.min(mg.demand, offered);
      buyFill[mk] = mg.demand > 0 ? sold / mg.demand : 1;
      if (!lots) { mg.sold = sold; continue; }
      const sellFrac = offered > 0 ? sold / offered : 0;
      const p = mg.price;
      for (const lot of lots) {
        if (lot.kind === 'traders') {
          // 팔리지 않은 화물은 하루 2% 상하고 시장마다 묵은 화물 하나로 합친다. CARGO_MIN 아래로 줄면 없어진다
          let unsold = 0;
          for (const q0 of lot.qs) {
            const q = q0 * sellFrac, amt = q * p;
            w.traders.cash += amt;
            unsold += q0 - q;
          }
          const left = unsold * (1 - CARGO_DECAY);
          if (left >= CARGO_MIN) w.traders.shipments.push({ to: r.id, good: g, q: left, stale: true });
          continue;
        }
        const q = lot.q * sellFrac, amt = q * p;
        switch (lot.kind) {
          case 'bld': {
            // 그날 못 판 것은 사라진다
            lot.b.outStock[g] = 0;
            const c = companyOf.get(lot.b.companyId);
            if (c) c.cash += amt; else w.fund += amt;
            lot.b.last.revenue += amt;
            break;
          }
          case 'sub':
            paySubsistence(w, lot.pop, amt);
            break;
          case 'rent':
            // 지대 판매 대금은 그 지역 저택으로 (받을 귀족이 없으면 주인 없는 돈)
            if (!payRent(w, lot.regionId, amt)) w.fund += amt;
            break;
          case 'salvage':
            paySalvage(w, lot.lot, amt);
            break;
        }
      }
      mg.sold = sold;
    }
  }

  // 구매자 결제 (같은 시장 안에서는 모두 같은 비율로 받는다)
  for (const o of book.orders) {
    const gi = GOOD_INDEX[o.good];
    const fr = buyFill[o.regionId * NG + gi] ?? 1;
    const q = o.qty * fr;
    if (o.miss && o.qty - q > 1e-9) o.miss(o.qty - q);
    if (q <= 0) continue;
    const cost = q * dayOf(days, w, o.regionId).price[gi];
    charge(w, o.payer, cost);
    o.fill?.(q, cost);
  }

  // 가계: 결제, 충족률, 부 단계
  for (const plan of book.plans) {
    const p = plan.pop;
    const d = dayOf(days, w, p.regionId);
    const r = d.r;
    const hh = r.households[p.prof];
    const base = r.id * NG;
    let got = plan.inKindValue, spent = 0;
    for (let i = 0; i < NG; i++) {
      const want = plan.goods[i];
      if (want <= 0) continue;
      const q = want * (buyFill[base + i] ?? 1);
      const cost = q * d.price[i];
      spent += cost;
      got += cost;
      if (hh) { const g = GOOD_IDS[i]; hh.consumed[g] = (hh.consumed[g] ?? 0) + q; }
    }
    p.savings -= spent;
    p.lastSpend += spent;
    investSurplus(w, p, plan.basketCost - plan.inKindValue);
    if (hh) for (const g in p.inKind) hh.consumed[g as GoodId] = (hh.consumed[g as GoodId] ?? 0) + (p.inKind[g as GoodId] ?? 0);
    p.fulfillment = plan.basketCost > 0 ? Math.min(1, got / plan.basketCost) : 1;
    let fed = plan.foodInKind;
    for (const f of plan.foodBuy) fed += (f.qty * (buyFill[base + f.gi] ?? 1)) / f.units;
    p.food = plan.foodNeed > 0 ? Math.min(1, fed / plan.foodNeed) : 1;
    updateWealth(p, d, plan);
  }
}

/** 생활비를 넘는 현금 중 하루에 금고로 가는 비율 */
export const INVEST_RATE = 0.05;

/**
 * 팝의 남는 현금 (빅토리아3 투자 풀 대신 금융가 펀드): 생활비와 세금의 며칠분(TUNE.cashBufferDays)을 넘는 현금의 INVEST_RATE 가 매일
 * 그 지역 금융가 지분을 사는 데 쓰인다 (투자법이 허용한 계층만). 이것이 민간 투자의 재원이다. 쓰고 남는 소득이 꾸준하면 부 단계가 올라 쓰는 양이 는다.
 * 투자법 밖 계층은 저축을 그대로 들고 있는다. 소작농만 예외: 생활비와 세금의 TUNE.peasantKeepWeeks 주치를 넘는 저축은 그날 그 지역 저택 금고로 간다
 * (지분도 대가도 없다. 저택이 없는 지역이면 그 왕국에서 id 가 가장 작은 저택).
 * 세금은 걷는 쪽과 같은 계산(taxDue)이다: 토지 기반 세법이면 pop 이 현금으로 낼 세금은 없다.
 */
function investSurplus(w: World, p: Pop, cashCost: number) {
  const daily = Math.max(0, cashCost) + taxDue(w, p);
  if (p.prof === 'peasant') {
    const extra = p.savings - daily * 7 * TUNE.peasantKeepWeeks;
    const m = extra > 0 ? manorOf(w, p.regionId) : undefined;
    if (!m) return;
    p.savings -= extra;
    toTreasury(m, extra, 'skim');
    return;
  }
  const k = kingdomById(w, kingdomOf(w, p.regionId));
  if (!INVEST_CLASSES[k.investLaw].includes(p.prof)) return;
  const over = (p.savings - daily * TUNE.cashBufferDays) * INVEST_RATE;
  if (over <= 0) return;
  // 투자법이 허용한 계층은 그 지역 금융가 지분을 산다 (지분 가격 nav)
  const f = financeOf(w, p.regionId);
  if (!f || financeIdle(w, f)) return;
  p.savings -= over;
  toTreasury(f, over, 'units');
  addFund(p, f.id, over / Math.max(0.01, f.nav ?? 1));
}

/** 소작농 저축이 가는 저택: 그 지역 저택, 없으면 그 왕국에서 id 가 가장 작은 저택 (날마다 같은 세계면 다시 찾지 않는다) */
const manorCache = new WeakMap<World, { tick: number; byRegion: Map<number, Building>; byKingdom: Map<number, Building> }>();
function manorOf(w: World, regionId: number): Building | undefined {
  let c = manorCache.get(w);
  if (!c || c.tick !== w.tick) {
    c = { tick: w.tick, byRegion: new Map(), byKingdom: new Map() };
    for (const b of w.buildings) {
      if (b.typeId !== 'manor') continue;
      c.byRegion.set(b.regionId, b);
      const kid = kingdomOf(w, b.regionId), cur = c.byKingdom.get(kid);
      if (!cur || b.id < cur.id) c.byKingdom.set(kid, b);
    }
    manorCache.set(w, c);
  }
  return c.byRegion.get(regionId) ?? c.byKingdom.get(kingdomOf(w, regionId));
}

/** 지역의 금융가 (지역 id → 건물, 날마다 같은 세계면 다시 찾지 않는다) */
const financeCache = new WeakMap<World, { tick: number; byRegion: Map<number, Building> }>();
function financeOf(w: World, regionId: number): Building | undefined {
  let c = financeCache.get(w);
  if (!c || c.tick !== w.tick) {
    c = { tick: w.tick, byRegion: new Map() };
    for (const b of w.buildings) if (b.typeId === 'finance') c.byRegion.set(b.regionId, b);
    financeCache.set(w, c);
  }
  return c.byRegion.get(regionId);
}

/** 그 부 단계의 하루 소비 묶음 비용 (지역 가격 기준) */
export function basketCostAt(r: Region, size: number, wealth: number): number {
  const units = size * CONSUMPTION_PER_CAPITA;
  const need = needsAt(wealth);
  let v = 0;
  for (const n of NEEDS) {
    const per = need[n.id];
    if (!per) continue;
    for (const opt of needSplit(r, n.id, wealth)) v += per * units * opt.units * opt.share * r.market[opt.good].price;
  }
  return v;
}

/**
 * 필요 하나(units 단위)를 가진 현물로 채운다. 가계 주문(collectOrders)과 소작농 판매(useOwnKind)가 같이 쓰는 규칙:
 * 선택지 순서로, 상품마다 그 상품이 채울 수 있는 최대 비중(rawMax)까지만 쓴다.
 * left(GOOD_IDS 순서 수량)에서 쓴 만큼 빼고, 현물로 못 채운 필요 단위를 돌려준다
 */
function useKind(n: NeedDef, units: number, wealth: number, left: number[]): number {
  const total = units;
  for (const opt of n.options) {
    const i = GOOD_INDEX[opt.good];
    const a = left[i];
    if (a <= 0 || units <= 0) continue;
    const use = Math.min(units, a / opt.units, rawMax(opt.max, wealth) * total);
    left[i] = a - use * opt.units;
    units -= use;
  }
  return units;
}

/** size 명, 부 wealth 인 pop 이 현물 left(GOOD_IDS 순서) 로 오늘 필요를 채우고 남는 양 (left 를 그 양으로 바꿔 돌려준다) */
function useOwnKind(size: number, wealth: number, left: number[]): number[] {
  const units0 = size * CONSUMPTION_PER_CAPITA;
  const need = needsAt(wealth);
  for (const n of NEEDS) {
    const per = need[n.id];
    if (per) useKind(n, per * units0, wealth, left);
  }
  return left;
}

/** 하루 소득으로 감당할 수 있는 가장 높은 부 단계 (시작 부) */
export function affordableWealth(r: Region, size: number, income: number): number {
  let L = WEALTH_MIN;
  while (L < WEALTH_MAX && basketCostAt(r, size, L + 1) <= income) L++;
  return L;
}

/**
 * 부 단계 이동: 실제 소득(현금 소득 + 직접 쓴 현물)과 생활비로만 정한다. 저축을 꺼내 쓰는 돈과, 내놓았지만 안 팔리고 사라진 물건은 소득이 아니다.
 * 소득이 다음 단계 묶음 비용의 102%를 넘으면 오르고, 지금 단계의 98%에 못 미치면 내린다.
 * 물건이 없어 필요를 못 채운 것은 생활수준(popSol)에만 나타난다
 */
function updateWealth(p: Pop, rd: RegionDay, plan: PopPlan) {
  // 소득 = 판 돈(현금 소득에 들어 있다) + 먹고 쓴 현물
  const income = Math.max(0, p.incomeEma) + plan.inKindValue;
  const L = wealthOf(p);
  const costCur = basketCostDay(rd, p.size, L);
  const costNext = basketCostDay(rd, p.size, Math.min(WEALTH_MAX, L + 1));
  let d = 0;
  if (L < WEALTH_MAX && income > costNext * 1.02) d = Math.min(0.03, 0.03 * (income / costNext - 1));
  else if (costCur > 0 && income < costCur * 0.98) d = -Math.min(0.03, 0.015 * (1 - income / costCur));
  p.wealth = clamp(p.wealth + d, WEALTH_MIN, WEALTH_MAX);
}

// ---------------------------------------------------------------- 가격

export const PRICE_MIN = 0.25;
export const PRICE_MAX = 1.75;
/** 하루에 목표 가격으로 다가가는 비율 */
export const PRICE_SPEED = 0.03;
/** 수요·공급 평균이 하루에 따라가는 비율 */
export const FLOW_EMA = 0.1;

/** 수요·공급 이동평균 하루치 */
function flowEma(ema: number, cur: number): number {
  return ema * (1 - FLOW_EMA) + cur * FLOW_EMA;
}
/** 출처별 수요·공급 이동평균의 하루 비율 (outlook.ts 가 기상 조건 되돌리기에 쓴다) */
export const BY_EMA = 0.1;
/** 출처별 이동평균이 이 값 이하로 내려가면 지운다 (사라진 출처가 목록에 끝없이 남지 않게) */
const BY_EMA_MIN = 0.05;

/** 출처별 이동평균 (새 객체) */
function emaBy(prev: Record<string, number> | undefined, cur: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  const p = prev ?? {}, c = cur ?? {};
  // 키 순서: 어제 키, 그다음 오늘 새로 생긴 키
  for (const k in p) {
    const v = (p[k] ?? 0) * (1 - BY_EMA) + (c[k] ?? 0) * BY_EMA;
    if (v > BY_EMA_MIN) out[k] = v;
  }
  for (const k in c) {
    if (Object.hasOwn(p, k)) continue;
    const v = (c[k] ?? 0) * BY_EMA;
    if (v > BY_EMA_MIN) out[k] = v;
  }
  return out;
}

/** 가격을 가격 공식 쪽으로 움직인다. 화면용 재고(inventory)는 팔리지 않고 남은 상인 화물이다 */
export function updatePrices(w: World) {
  const stockOf = shipmentSums(w);
  for (const r of w.regions) {
    for (const g of GOOD_IDS) {
      const mg: MarketGood = r.market[g];
      const base = GOODS[g].basePrice;
      mg.volumeEma = mg.volumeEma * 0.98 + mg.sold * 0.02;
      mg.demandEma = flowEma(mg.demandEma, mg.demand);
      mg.supplyEma = flowEma(mg.supplyEma, mg.supply);
      mg.demandByEma = emaBy(mg.demandByEma, mg.demandBy);
      mg.supplyByEma = emaBy(mg.supplyByEma, mg.supplyBy);
      mg.inventory = stockOf[mkey(r.id, g)] ?? 0;
      // 흐름이 끊긴 시장은 이동평균이 둘 다 같은 비율로 줄어 마지막 쏠림이 남으므로, 가격이 쏠린 쪽 끝으로 간다
      const target = priceFormula(g, mg.demandEma, mg.supplyEma);
      mg.price = clamp(mg.price + (target - mg.price) * PRICE_SPEED, base * PRICE_MIN, base * PRICE_MAX);
    }
  }
}
