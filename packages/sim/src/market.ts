import { CONSUMPTION_PER_CAPITA, GOOD_IDS, GOODS, NEEDS, SUBSISTENCE, TUNE, getMethod, needsAt, rawMax } from './data';
import { CARTAGE_RATE, RAIL_RATE, borrow, companyById, freightRate, harvestFactor, priceFormula, regionById, shippingRate, isSubsistence } from './economy';
import { landTaxValue, payLandTax, payRent, paySalvage, taxDue, taxRates } from './finance';
import { addToPool, borderCost, kingdomById, kingdomOf, payTariff } from './kingdoms';
import { findPop, payPops, payProf, workforce } from './pops';
import { clamp, round2 } from './rng';
import { POP_CLASSES, WEALTH_MAX, WEALTH_MIN } from './types';
import type { Building, Company, GoodBag, GoodId, MarketGood, NeedDef, NeedId, Pop, Region, SalvageLot, World } from './types';

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
  | { kind: 'sub'; pop: Pop; q: number; rentFrac?: number; taxFrac?: number }
  | { kind: 'trader'; q: number }
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
  foodBuy: { good: GoodId; qty: number; units: number }[];
}

/** 하루 장부: 주문, 판매 제안, 가계 구매 계획 */
export interface Book {
  orders: Order[];
  /** 시장(mkey)별 판매 제안 */
  lots: Map<number, Lot[]>;
  plans: PopPlan[];
}

const GOOD_INDEX = Object.fromEntries(GOOD_IDS.map((g, i) => [g, i])) as Record<GoodId, number>;
/** 시장 (지역, 상품) 의 숫자 키 */
const mkey = (regionId: number, g: GoodId) => regionId * GOOD_IDS.length + GOOD_INDEX[g];

export function newBook(): Book {
  return { orders: [], lots: new Map(), plans: [] };
}

function addLot(book: Book, regionId: number, g: GoodId, lot: Lot) {
  if (!(lot.q > 1e-9)) return;
  const k = mkey(regionId, g);
  const list = book.lots.get(k);
  if (list) list.push(lot); else book.lots.set(k, [lot]);
}

function addBy(by: Record<string, number> | undefined, key: string, q: number) {
  if (!by || !(q > 0)) return;
  by[key] = (by[key] ?? 0) + q;
}

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
  return { grain: wf * SUBSISTENCE.grainPerWorker, fiber: wf * SUBSISTENCE.fiberPerWorker, timber: wf * SUBSISTENCE.timberPerWorker };
}

/**
 * 소작지 수확 (빅토리아3 자급 산출): 소작농 노동 인구 × 1인당 산출.
 * 상품마다 지대(TUNE.rentShare, 그 지역 저택에 귀족이 있을 때)와 토지세 몫을 내놓고, 남은 것 중 오늘 지금 부 단계로 쓸 만큼
 * (collectOrders 와 같은 현물 사용 순서·상한) 남기고 나머지를 판다. 판매 대금은 지대 → 귀족, 토지세 → 국고, 나머지 → 소작농.
 * 그래서 소작농이 내놓는 양은 자기 필요와 부로만 정해진다 (가격·수요와는 상관없다).
 */
export function harvest(w: World, book: Book) {
  for (const b of w.buildings) {
    if (!isSubsistence(b.typeId)) continue;
    const pop = findPop(w, b.regionId, 'peasant', b.id);
    b.last.output = {};
    if (!pop || pop.size <= 0) continue;
    const r = regionById(w, b.regionId);
    const { rent, tax } = harvestShares(w, r);
    // 기상 조건이 걸리면 수확이 그만큼 줄어든다 (economy.ts harvestFactor)
    const out = harvestOutput(workforce(pop) * harvestFactor(w, r.id, 'arable'));
    // 토지 기반 과세: 걷어야 할 토지세 (팔리는 몫만, 징수율 전). 1인당 과세면 토지세율 0
    const kd = kingdomById(w, r.kingdomId);
    const land = taxRates(kd).land;
    if (land > 0) kd.landOwed = (kd.landOwed ?? 0) + landTaxValue(r, out, land);
    // 지대·토지세를 뺀 몫에서 그날 쓸 만큼 쓰고 남는 것 (GOOD_IDS 순서). 쓰는 만큼만 현물로 남는다
    const keep = 1 - rent - tax;
    const surplus = useOwnKind(pop.size, pop.wealth, GOOD_IDS.map((g) => (out[g] ?? 0) * keep));
    for (const g of GOOD_IDS) {
      const q = out[g];
      if (!q) continue;
      b.last.output[g] = q;
      const sell = q * (rent + tax) + surplus[GOOD_INDEX[g]];
      pop.inKind[g] = Math.max(0, q - sell);
      if (sell <= 1e-9) continue;
      r.market[g].supply += sell;
      addBy(r.market[g].supplyBy, 'subsistence', sell);
      addLot(book, r.id, g, { kind: 'sub', pop, q: sell, rentFrac: (q * rent) / sell, taxFrac: (q * tax) / sell });
    }
  }
}

/**
 * 소작 수확 중 남에게 가는 몫: 지대(그 지역 저택에 귀족이 있을 때만)와
 * 토지세(토지 기반 세법일 때, 수확의 토지세율(taxRates)을 징수율만큼 국고 몫으로. 상한 1 − 지대)
 */
export function harvestShares(w: World, r: Region): { rent: number; tax: number } {
  const rent = hasLandlords(w, r.id) ? TUNE.rentShare : 0;
  const kd = kingdomById(w, r.kingdomId);
  const land = taxRates(kd).land;
  const tax = land > 0 ? Math.min(1 - rent, land * (kd.taxRatio ?? 1)) : 0;
  return { rent, tax };
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

export function collectOrders(w: World, book: Book) {
  // 기업: 투입재 (2일분 보유 목표). 모자라면 자동 대출
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
          src: `bld:${b.typeId}`, regionId: b.regionId, good: g, qty: want, payer: { kind: 'company', c },
          fill: (q, cost) => { b.stock[g] = (b.stock[g] ?? 0) + q; b.last.inputCost += cost; },
        });
      }
    }
    const cost = operating.reduce((a, o) => a + o.qty * regionById(w, o.regionId).market[o.good].price, 0);
    if (c.cash < cost) borrow(w, c, cost - c.cash);
    const scale = cost > 0 ? clamp(c.cash / cost, 0, 1) : 1;
    for (const o of operating) { o.qty *= scale; if (o.qty > 1e-9) book.orders.push(o); }
  }

  // 가계 (pop 마다): 부 단계에 맞는 묶음. 현물을 먼저 쓰고, 예산이 모자라면 비례로 줄인다
  // 같은 지역·같은 부(0.1 단위)의 pop 은 그 필요를 처음 계산한 비중을 같이 쓴다
  const splits = new Map<Region, Map<number, Partial<Record<NeedId, Split>>>>();
  const splitsOf = (r: Region, wealth: number) => {
    let byRegion = splits.get(r);
    if (!byRegion) splits.set(r, (byRegion = new Map()));
    const k = Math.round(wealth * 10);
    let s = byRegion.get(k);
    if (!s) byRegion.set(k, (s = {}));
    return s;
  };
  for (const p of w.pops) {
    if (p.size < 1e-3) continue;
    const r = regionById(w, p.regionId);
    const memo = splitsOf(r, p.wealth);
    const need = needsAt(p.wealth);
    const units0 = p.size * CONSUMPTION_PER_CAPITA;
    // 상품별 수량은 GOOD_IDS 순서 배열로 센다
    const goods = GOOD_IDS.map(() => 0);
    const inKind = GOOD_IDS.map((g) => p.inKind[g] ?? 0);
    let cashCost = 0, foodNeed = 0, foodInKind = 0;
    const foodBuy: PopPlan['foodBuy'] = [];
    for (const n of NEEDS) {
      const per = need[n.id];
      if (!per) continue;
      // 현물을 먼저 쓰고 (useKind), 남은 필요를 산다
      const total = per * units0;
      const units = useKind(n, total, p.wealth, inKind);
      const isFood = n.id === 'nourishment';
      if (isFood) { foodNeed = total; foodInKind = total - units; }
      for (const opt of (memo[n.id] ??= needSplit(r, n.id, p.wealth))) {
        const qty = units * opt.units * opt.share;
        if (qty <= 0) continue;
        cashCost += qty * r.market[opt.good].price;
        if (isFood) foodBuy.push({ good: opt.good, qty, units: opt.units });
        goods[GOOD_INDEX[opt.good]] += qty;
      }
    }
    // 쓴 현물의 시장가 (소작농은 수확에서 그날 쓸 만큼만 현물로 남기므로 남는 현물은 없다)
    let inKindValue = 0;
    for (let i = 0; i < GOOD_IDS.length; i++) {
      const g = GOOD_IDS[i];
      const had = p.inKind[g] ?? 0;
      if (had > 0) inKindValue += (had - inKind[i]) * r.market[g].price;
    }
    const basketCost = cashCost + inKindValue;
    const budget = Math.max(0, Math.min(p.savings, p.incomeEma + p.savings * SAVINGS_DRAW));
    // 돈이 모자라면 식량부터 산다: 식량 몫을 먼저 채우고 남는 돈으로 나머지를 같은 비율로 산다
    const foodCost = foodBuy.reduce((a, f) => a + f.qty * r.market[f.good].price, 0);
    const foodFrac = foodCost > 0 ? Math.min(1, budget / foodCost) : 1;
    const restCost = cashCost - foodCost;
    const restFrac = restCost > 1e-9 ? clamp((budget - foodCost) / restCost, 0, 1) : 1;
    const foodQty: GoodBag = {};
    for (const f of foodBuy) { foodQty[f.good] = (foodQty[f.good] ?? 0) + f.qty; f.qty *= foodFrac; }
    for (let i = 0; i < GOOD_IDS.length; i++) {
      const all = goods[i];
      if (all <= 0) continue;
      const fq = Math.min(all, foodQty[GOOD_IDS[i]] ?? 0);
      goods[i] = fq * foodFrac + (all - fq) * restFrac;
    }
    book.plans.push({ pop: p, basketCost, inKindValue, budget, goods, foodNeed, foodInKind, foodBuy });
    const src = `pop:${p.prof}`;
    for (let i = 0; i < GOOD_IDS.length; i++) {
      const q = goods[i];
      if (q <= 1e-9) continue;
      const mg = r.market[GOOD_IDS[i]];
      mg.demand += q;
      addBy(mg.demandBy, src, q);
    }
  }

  addTraderOrders(w, book);
}

/** 대체재 선택 민감도: 클수록 싼 쪽으로 쏠린다 */
const SUBSTITUTION_EXP = 10;

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

function samePrices(prices: number[], need: NeedDef, r: Region): boolean {
  for (let i = 0; i < prices.length; i++) if (prices[i] !== r.market[need.options[i].good].price) return false;
  return true;
}

function computeSplit(need: NeedDef, prices: number[], caps: number[]): Split {
  const costs = need.options.map((o, i) => o.units * prices[i]);
  const min = Math.min(...costs);
  const weights = costs.map((c) => Math.pow(min / c, SUBSTITUTION_EXP));
  const share = new Array(weights.length).fill(0);
  const capped = new Array(weights.length).fill(false);
  let left = 1;
  for (let pass = 0; pass < weights.length && left > 1e-12; pass++) {
    const sum = weights.reduce((a, x, i) => a + (capped[i] ? 0 : x), 0);
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
  return need.options.map((o, i) => ({ ...o, share: share[i] }));
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
const SHIP_RATE = 10;
/** 팔리지 않은 상인 화물이 하루에 상하는 비율 */
const CARGO_DECAY = 0.02;

/** 이웃 지역 값이 운송비 + 관세보다 더 비싸면 상인이 싼 쪽에서 사서 다음 날 비싼 쪽에 판다 */
function addTraderOrders(w: World, book: Book) {
  const pending: { o: Order; to: number; tariff: number }[] = [];
  // 시장(mkey)별 합계는 mkey 위치의 배열로 센다
  const inTransitOf: number[] = [];
  for (const sh of w.traders.shipments) { const k = mkey(sh.to, sh.good); inTransitOf[k] = (inTransitOf[k] ?? 0) + sh.q; }
  for (const a of w.regions) {
    for (const nb of a.neighbors) {
      const b = regionById(w, nb);
      for (const g of GOOD_IDS) {
        if (GOODS[g].perishable) continue;
        const ma = a.market[g], mb = b.market[g];
        const rate = freightRate(w, a.id, b.id, g);
        const gap = (mb.price * (1 - rate)) / ma.price - 1;
        if (gap <= 0) continue;
        const inTransit = inTransitOf[mkey(b.id, g)] ?? 0;
        const unmet = Math.max(0, mb.demandEma - mb.supplyEma - inTransit);
        const flow = Math.max(ma.supplyEma, mb.demandEma);
        const q = Math.min(SHIP_RATE * gap * flow, unmet * 1.2 + flow * 0.05, ma.supplyEma * 0.9);
        if (q <= 1e-4) continue;
        const tariff = borderCost(w, a.id, b.id, g);
        pending.push({
          to: b.id, tariff,
          o: {
            src: 'trader', regionId: a.id, good: g, qty: q, payer: { kind: 'trader' },
            fill: (qq, cost) => {
              w.traders.shipments.push({ to: b.id, good: g, q: qq });
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
  const cost = pending.reduce((s, { o, tariff }) => s + o.qty * regionById(w, o.regionId).market[o.good].price * (1 + shippingRate(w, o.regionId) + tariff), 0);
  const scale = cost > 0 ? Math.min(1, Math.max(0, w.traders.cash) / cost) : 1;
  for (const { o } of pending) {
    o.qty *= scale;
    if (o.qty <= 1e-6) continue;
    book.orders.push(o);
    book.orders.push(transportOrder(w, o.regionId, o.qty * regionById(w, o.regionId).market[o.good].price, { kind: 'trader' }, 'trader'));
  }
}

// ---------------------------------------------------------------- 체결

/** 팔리지 않은 상인 화물 중 가격 신호에 공급으로 세는 비율 (같은 화물을 매일 새 공급으로 세지 않게) */
const STALE_SIGNAL = 0.02;

export function clearMarkets(w: World, book: Book) {

  // 판매 제안: 건물이 어제 만든 산출(빅토리아3처럼 재고는 없다: 그날 못 판 것은 사라진다), 전날 도착한 상인 화물
  for (const b of w.buildings) {
    const src = `bld:${b.typeId}`;
    for (const g of GOOD_IDS) {
      const q = b.outStock[g] ?? 0;
      if (q <= 1e-9) continue;
      const mg = regionById(w, b.regionId).market[g];
      mg.supply += q;
      addBy(mg.supplyBy, src, q);
      addLot(book, b.regionId, g, { kind: 'bld', b, q });
    }
  }
  for (const sh of w.traders.shipments) {
    const mg = regionById(w, sh.to).market[sh.good];
    const signal = sh.stale ? sh.q * STALE_SIGNAL : sh.q;
    mg.supply += signal;
    addBy(mg.supplyBy, 'trader', signal);
    mg.shippedIn += sh.q;
    addLot(book, sh.to, sh.good, { kind: 'trader', q: sh.q });
  }
  w.traders.shipments = [];
  // 철거 자재: 남은 양을 남은 날 수로 나눠 내놓는다 (그날 못 판 것은 사라진다)
  for (const lot of w.salvage) {
    const q = lot.q / Math.max(1, lot.days);
    lot.q -= q; lot.days -= 1;
    const mg = regionById(w, lot.regionId).market[lot.good];
    mg.supply += q;
    addBy(mg.supplyBy, 'salvage', q);
    addLot(book, lot.regionId, lot.good, { kind: 'salvage', lot, q });
  }
  w.salvage = w.salvage.filter((l) => l.days > 0 && l.q > 1e-6);

  for (const o of book.orders) {
    const mg = regionById(w, o.regionId).market[o.good];
    mg.demand += o.qty;
    addBy(mg.demandBy, o.src, o.qty);
  }

  // 시장마다: 체결률, 판매 대금 분배, 남은 물건 처리
  const buyFill: number[] = [];
  for (const r of w.regions) {
    for (const g of GOOD_IDS) {
      const mg = r.market[g];
      const lots = book.lots.get(mkey(r.id, g)) ?? [];
      const offered = lots.reduce((a, l) => a + l.q, 0);
      const sold = Math.min(mg.demand, offered);
      buyFill[mkey(r.id, g)] = mg.demand > 0 ? sold / mg.demand : 1;
      const sellFrac = offered > 0 ? sold / offered : 0;
      const p = mg.price;
      for (const lot of lots) {
        const q = lot.q * sellFrac, amt = q * p;
        switch (lot.kind) {
          case 'bld': {
            // 그날 못 판 것은 사라진다
            lot.b.outStock[g] = 0;
            const c = companyById(w, lot.b.companyId);
            if (c) c.cash += amt; else w.fund += amt;
            lot.b.last.revenue += amt;
            break;
          }
          case 'sub': {
            // 판매 대금 중 지대 몫은 저택 귀족에게. 소작농 부가 TUNE.patronWealth 아래면 귀족이 지대의 TUNE.patronShare 를 돌려준다
            const fr = lot.rentFrac ?? 0, tf = lot.taxFrac ?? 0;
            let rentAmt = amt * fr;
            // 남는 게 없는 상품은 지대 + 토지세가 판매량 전부라 부동소수점으로 합이 대금을 넘을 수 있다: 대금 안으로 묶는다
            const taxAmt = Math.min(amt - rentAmt, amt * tf);
            if (rentAmt > 0 && lot.pop.wealth < TUNE.patronWealth) rentAmt *= 1 - TUNE.patronShare;
            if (rentAmt > 0 && !payRent(w, lot.pop.regionId, rentAmt)) rentAmt = 0;
            if (taxAmt > 0) payLandTax(w, lot.pop.regionId, taxAmt);
            paySubsistence(w, lot.pop, amt - rentAmt - taxAmt);
            lot.pop.unsoldKind = (lot.pop.unsoldKind ?? 0) + (lot.q - q) * p * Math.max(0, 1 - fr - tf);
            break;
          }
          case 'salvage':
            paySalvage(w, lot.lot, amt);
            break;
          case 'trader': {
            w.traders.cash += amt;
            const left = (lot.q - q) * (1 - CARGO_DECAY);
            if (left > 1e-6) w.traders.shipments.push({ to: r.id, good: g, q: left, stale: true });
            break;
          }
        }
      }
      mg.sold = sold;
    }
  }

  // 구매자 결제 (같은 시장 안에서는 모두 같은 비율로 받는다)
  for (const o of book.orders) {
    const fr = buyFill[mkey(o.regionId, o.good)] ?? 1;
    const q = o.qty * fr;
    if (o.miss && o.qty - q > 1e-9) o.miss(o.qty - q);
    if (q <= 0) continue;
    const cost = q * regionById(w, o.regionId).market[o.good].price;
    charge(w, o.payer, cost);
    o.fill?.(q, cost);
  }

  // 가계: 결제, 충족률, 부 단계
  for (const plan of book.plans) {
    const p = plan.pop;
    const r = regionById(w, p.regionId);
    const hh = r.households[p.prof];
    let got = plan.inKindValue, spent = 0;
    for (let i = 0; i < GOOD_IDS.length; i++) {
      const want = plan.goods[i];
      if (want <= 0) continue;
      const g = GOOD_IDS[i];
      const q = want * (buyFill[mkey(r.id, g)] ?? 1);
      const cost = q * r.market[g].price;
      spent += cost;
      got += cost;
      if (hh) hh.consumed[g] = (hh.consumed[g] ?? 0) + q;
    }
    p.savings -= spent;
    p.lastSpend += spent;
    investSurplus(w, p, plan.basketCost - plan.inKindValue);
    if (hh) for (const g in p.inKind) hh.consumed[g as GoodId] = (hh.consumed[g as GoodId] ?? 0) + (p.inKind[g as GoodId] ?? 0);
    p.fulfillment = plan.basketCost > 0 ? Math.min(1, got / plan.basketCost) : 1;
    let fed = plan.foodInKind;
    for (const f of plan.foodBuy) fed += (f.qty * (buyFill[mkey(r.id, f.good)] ?? 1)) / f.units;
    p.food = plan.foodNeed > 0 ? Math.min(1, fed / plan.foodNeed) : 1;
    updateWealth(p, r, plan);
  }
}

/** 생활비를 넘는 현금 중 하루에 투자 풀로 가는 비율 */
const INVEST_RATE = 0.05;

/**
 * 팝은 저축하지 않는다 (빅토리아3): 생활비와 세금의 며칠분(TUNE.cashBufferDays)을 넘는 현금은 매일 조금씩 그 왕국 투자 풀로 간다.
 * 이것이 민간 투자의 재원이다. 쓰고 남는 소득이 꾸준하면 부 단계가 올라 쓰는 양이 는다.
 * 세금은 걷는 쪽과 같은 계산(taxDue)이다: 토지 기반 세법이면 pop 이 현금으로 낼 세금은 없다.
 */
function investSurplus(w: World, p: Pop, cashCost: number) {
  const over = (p.savings - (Math.max(0, cashCost) + taxDue(w, p)) * TUNE.cashBufferDays) * INVEST_RATE;
  if (over <= 0) return;
  p.savings -= over;
  addToPool(w, kingdomOf(w, p.regionId), p.regionId, over);
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
 * 부 단계 이동: 실제 소득(현금 소득 + 직접 쓴 현물 + 안 팔린 현물)과 생활비로만 정한다. 저축을 꺼내 쓰는 돈은 소득이 아니다.
 * 소득이 다음 단계 묶음 비용의 102%를 넘으면 오르고, 지금 단계의 98%에 못 미치면 내린다.
 * 물건이 없어 필요를 못 채운 것은 생활수준(popSol)에만 나타난다
 */
function updateWealth(p: Pop, r: Region, plan: PopPlan) {
  // 수확 전체가 소득이다 (빅토리아3): 먹은 현물 + 판 돈(현금 소득에 들어 있다) + 내놓았지만 안 팔린 현물의 시장가
  const income = Math.max(0, p.incomeEma) + plan.inKindValue + (p.unsoldKind ?? 0);
  p.unsoldKind = 0;
  const costCur = basketCostAt(r, p.size, p.wealth);
  const costNext = basketCostAt(r, p.size, Math.min(WEALTH_MAX, p.wealth + 1));
  let d = 0;
  if (p.wealth < WEALTH_MAX && income > costNext * 1.02) d = Math.min(0.03, 0.03 * (income / costNext - 1));
  else if (costCur > 0 && income < costCur * 0.98) d = -Math.min(0.03, 0.015 * (1 - income / costCur));
  p.wealth = clamp(p.wealth + d, WEALTH_MIN, WEALTH_MAX);
}

// ---------------------------------------------------------------- 가격

export const PRICE_MIN = 0.25;
export const PRICE_MAX = 1.75;
/** 하루에 목표 가격으로 다가가는 비율 */
const PRICE_SPEED = 0.03;
/** 수요·공급 평균이 하루에 따라가는 비율 */
const FLOW_EMA = 0.1;
/** 출처별 수요·공급 이동평균의 하루 비율 (outlook.ts 가 기상 조건 되돌리기에 쓴다) */
export const BY_EMA = 0.1;

function emaBy(prev: Record<string, number> | undefined, cur: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  const p = prev ?? {}, c = cur ?? {};
  // 키 순서: 어제 키, 그다음 오늘 새로 생긴 키
  for (const k in p) {
    const v = (p[k] ?? 0) * (1 - BY_EMA) + (c[k] ?? 0) * BY_EMA;
    if (v > 1e-4) out[k] = v;
  }
  for (const k in c) {
    if (Object.hasOwn(p, k)) continue;
    const v = (c[k] ?? 0) * BY_EMA;
    if (v > 1e-4) out[k] = v;
  }
  return out;
}

/** 가격을 가격 공식 쪽으로 움직인다. 화면용 재고(inventory)는 팔리지 않고 남은 상인 화물이다 */
export function updatePrices(w: World) {
  const stockOf: number[] = [];
  for (const sh of w.traders.shipments) { const k = mkey(sh.to, sh.good); stockOf[k] = (stockOf[k] ?? 0) + sh.q; }
  for (const r of w.regions) {
    for (const g of GOOD_IDS) {
      const mg: MarketGood = r.market[g];
      const base = GOODS[g].basePrice;
      mg.volumeEma = mg.volumeEma * 0.98 + mg.sold * 0.02;
      mg.demandEma = mg.demandEma * (1 - FLOW_EMA) + mg.demand * FLOW_EMA;
      mg.supplyEma = mg.supplyEma * (1 - FLOW_EMA) + mg.supply * FLOW_EMA;
      mg.demandByEma = emaBy(mg.demandByEma, mg.demandBy);
      mg.supplyByEma = emaBy(mg.supplyByEma, mg.supplyBy);
      mg.inventory = stockOf[mkey(r.id, g)] ?? 0;
      const target = priceFormula(g, mg.demandEma, mg.supplyEma);
      // 소수 2자리라 작은 차이가 0으로 반올림되지 않게, 차이가 있으면 최소 0.01은 움직인다
      const gap = target - mg.price;
      const move = Math.sign(gap) * Math.min(Math.abs(gap), Math.max(0.01, Math.abs(gap) * PRICE_SPEED));
      mg.price = round2(clamp(mg.price + move, base * PRICE_MIN, base * PRICE_MAX));
    }
  }
}
