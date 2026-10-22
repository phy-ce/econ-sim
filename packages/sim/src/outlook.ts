import { BUILDING_BY_ID, GOOD_IDS, GOODS, NEEDS, SKILL_DEFS, TUNE, getMethod, needsAt, regionPerk } from './data';
import { extraNeed, poolKey, poolOf } from './staffing';
import { availableMethods, collectionRatio, harvestFactorEma, regionAvgWealth, regionById, shippingRate, wageCostOf } from './economy';
import { BY_EMA, needSharesAt } from './market';
import { clamp } from './rng';
import { SKILLS } from './types';
import type { Building, Company, GoodId, Kingdom, MethodDef, NeedDef, Region, Skill, World } from './types';

/**
 * 시장 전망: AI 투자 판단의 공통 바탕. 상품마다 대륙 전체의 앞으로의 수요와 공급을 세고 그 비율로 장기 가격을 본다.
 * - 수요 = 지금 수요 + 공사 중인 건물의 투입 + 대체 수요 (+ 잠재 수요: 더 나은 방식으로 바꾸면 쓸 투입. 파는 쪽 가격에만 센다)
 * - 공급 = 지금 공급 + 공사 중인 건물의 산출
 * 같은 주에 착공하면 전망에 바로 반영해(add) 여럿이 같은 빈자리로 몰리지 않게 한다.
 */
export interface Outlook {
  demand: Record<GoodId, number>;
  latent: Record<GoodId, number>;
  supply: Record<GoodId, number>;
  /** withLatent: 잠재 수요까지 센 가격 (파는 쪽). 사는 쪽(원료비)은 false */
  price(g: GoodId, dS?: number, dD?: number, withLatent?: boolean): number;
  /** 공급 dS 를 더했을 때 대륙 공급 중 팔리는 비율 0..1 (수요 = 지금 + 잠재 + 그 값에서 돌아오는 수요) */
  sellRate(g: GoodId, dS?: number): number;
  /**
   * 남는 투입재 (TUNE.aiInputFill): 대륙 공급(이동평균, 기상 조건 보정, 절반 넘게 지은 공사의 산출) − 대륙 수요(이동평균) − 공사 중 건물의 투입.
   * 같은 주에 착공을 정하면 add 가 그 투입을 뺀다 (주간 공유 풀: 여러 공사가 같은 남는 양을 다시 세지 않는다)
   */
  spare: Record<GoodId, number>;
  /**
   * 이 방식 levels 레벨의 투입 충족 0..1 = 투입재마다 min(1, 남는 양 ÷ 필요) 중 가장 작은 값 (생산은 가장 모자란 투입을 따른다).
   * 아무도 만들지도 쓰지도 않는 투입재(대륙 공급·수요 < 1, 공사 중 포함)는 1로 본다 (첫 공사)
   */
  fill(m: MethodDef, levels: number): number;
  /** now: 이미 있는 건물이 방식을 바꾼 것이라 산출도 바로 남는 양에 더한다 (새 공사는 산출을 더하지 않는다) */
  add(m: MethodDef, levels: number, perk: number, now?: boolean): void;
}

/** 아무도 만들지 않는 투입재는 곧 누군가 공급한다고 보고 이 배율로 친다 */
const UNSUPPLIED_INPUT = 1.25;
const PRODUCIBLE = new Set<GoodId>(Object.values(BUILDING_BY_ID).flatMap((t) => t.methods.flatMap((m) => GOOD_IDS.filter((g) => (m.outputs[g] ?? 0) > 0))));

/** 장기 가격: 가격 공식과 같은 모양 (수요/공급 비율) */
function longRunPrice(g: GoodId, D: number, S: number): number {
  const base = GOODS[g].basePrice;
  const lo = Math.min(D, S);
  const x = lo > 1e-6 ? clamp((D - S) / lo, -1, 1) : D > S ? 1 : -1;
  return base * (1 + 0.75 * x);
}

export function marketOutlook(w: World): Outlook {
  const demand = {} as Record<GoodId, number>;
  const latent = {} as Record<GoodId, number>;
  const supply = {} as Record<GoodId, number>;
  for (const g of GOOD_IDS) {
    let d = 0, s = 0;
    for (const r of w.regions) { d += r.market[g].demandEma; s += r.market[g].supplyEma; }
    demand[g] = d; latent[g] = 0; supply[g] = Math.max(0, s);
  }
  const spare = {} as Record<GoodId, number>;
  // 기상 조건으로 줄어든 공급은 일시적이다: 조건이 걸렸던 땅의 생산자(소작지·건물) 공급을 평년 양으로 되돌려 센다.
  // 공급 EMA 에 남아 있는 배율로 나눈다 (조건이 막 시작했으면 덜, 막 끝났으면 아직 조금). 소작지는 그날 수확을 팔고(1일 전),
  // 건물은 전날 만든 것을 판다(2일 전)
  if (TUNE.harvestChance > 0) for (const r of w.regions) {
    const ema = new Map<string, number>();
    for (const g of GOOD_IDS) for (const [src, q] of Object.entries(r.market[g].supplyByEma ?? {})) {
      const typeId = src === 'subsistence' ? src : src.startsWith('bld:') ? src.slice(4) : null;
      const land = typeId ? BUILDING_BY_ID[typeId].land : undefined;
      if (!land || land === 'plot') continue;
      const lag = src === 'subsistence' ? 1 : 2, key = `${land}:${lag}`;
      let f = ema.get(key);
      if (f === undefined) ema.set(key, (f = harvestFactorEma(w, r.id, land, BY_EMA, lag)));
      if (f < 1 && f > 0) supply[g] += q * (1 / f - 1);
    }
  }
  for (const g of GOOD_IDS) spare[g] = supply[g] - demand[g];
  for (const k of w.constructions) {
    const m = getMethod(k.typeId, k.methodId);
    const perk = 1 + regionPerk(k.regionId, k.typeId);
    // 남는 투입재에는 절반 넘게 지은 공사의 산출만 센다 (막 시작한 공사의 산출을 믿고 지으면 원료가 끊긴다, ai.ts switchSpare 와 같다)
    const half = k.points >= k.required / 2;
    for (const g of GOOD_IDS) {
      const out = (m.outputs[g] ?? 0) * perk * (k.levels ?? 1), inp = (m.inputs[g] ?? 0) * (k.levels ?? 1);
      supply[g] += out;
      demand[g] += inp;
      spare[g] -= inp;
      if (half) spare[g] += out;
    }
  }
  // 잠재 수요: 기본가로 따져 지금 방식보다 나은 방식이 있으면 그 방식이 더 쓰는 투입재.
  // TUNE.latentFeasible: 실제로 바꿀 수 있는 몫만 센다. 일손 = 지역·직종마다 곳간 ÷ 그 지역 후보들이 더 필요한 사람 (후보 순서와 무관),
  // 투입 = 세는 상품을 뺀 다른 새 투입재가 남는 양으로 얼마나 채워지는가 (세는 상품 자신으로 막으면 공구·금속이 시작되지 못한다)
  const cands: { b: Building; r: Region; cur: MethodDef; best: MethodDef; state: boolean }[] = [];
  for (const b of w.buildings) {
    const c = w.companies.find((x) => x.id === b.companyId);
    if (!c || !b.active || BUILDING_BY_ID[b.typeId].auto) continue;
    const cur = getMethod(b.typeId, b.methodId);
    if (cur.construction || cur.seats) continue;
    let best: MethodDef | null = null, bestV = baseValue(cur, c);
    for (const m of availableMethods(c, b.typeId)) {
      if (m.id === cur.id) continue;
      const v = baseValue(m, c);
      if (v > bestV * 1.05) { best = m; bestV = v; }
    }
    if (best) cands.push({ b, r: regionById(w, b.regionId), cur, best, state: c.state });
  }
  const feasible = !!TUNE.latentFeasible;
  const need = new Map<string, number>();
  const pools = new Map<string, number>();
  if (feasible) for (const x of cands) for (const [s, n] of Object.entries(extraNeed(x.best, x.b.level, x.state, x.b)) as [Skill, number][]) {
    const k = poolKey(x.r, s);
    need.set(k, (need.get(k) ?? 0) + n);
  }
  const room = {} as Record<GoodId, number>;
  for (const g of GOOD_IDS) room[g] = supply[g] - demand[g];
  for (const x of cands) {
    let fL = 1;
    if (feasible) for (const [s] of Object.entries(extraNeed(x.best, x.b.level, x.state, x.b)) as [Skill, number][]) {
      const n = need.get(poolKey(x.r, s)) ?? 0;
      if (n > 0) fL = Math.min(fL, clamp(poolOf(w, x.r, s, pools) / n, 0, 1));
    }
    const extra = {} as Partial<Record<GoodId, number>>;
    for (const g of GOOD_IDS) {
      const e = ((x.best.inputs[g] ?? 0) - (x.cur.inputs[g] ?? 0)) * x.b.level;
      if (e > 0) extra[g] = e;
    }
    for (const [g, e] of Object.entries(extra) as [GoodId, number][]) {
      let fI = 1;
      if (feasible) for (const [h, eh] of Object.entries(extra) as [GoodId, number][]) if (h !== g) fI = Math.min(fI, clamp(room[h] / eh, 0, 1));
      latent[g] += e * (feasible ? fL * fI : 1);
    }
  }
  // 대체 수요: 가공품이 비싸서 원자재로 버티는 가계 수요의 절반은 값이 내려가면 돌아온다 (공장의 원료 수요는 대체하지 않는다)
  const household = (g: GoodId) => w.regions.reduce((a, r) => a + Object.entries(r.market[g].demandByEma ?? {}).reduce((x, [k, v]) => x + (k.startsWith('pop:') ? v : 0), 0), 0);
  const sub = TUNE.subReturn ? returnableDemand(w) : null;
  if (!sub) for (const n of NEEDS) for (const opt of n.options) {
    if (!opt.appeal || opt.appeal <= 1) continue;
    for (const other of n.options) if (other !== opt) demand[opt.good] += (household(other.good) / other.units) * opt.units * 0.5;
  }
  return {
    demand, latent, supply, spare,
    fill(m, levels) {
      let f = 1;
      if (!(levels > 0)) return f;
      for (const k in m.inputs) {
        const g = k as GoodId, need = (m.inputs[g] ?? 0) * levels;
        if (!(need > 0)) continue;
        // 첫 공사: 아무도 만들지도(공사 중 포함) 쓰지도 않는 투입재는 다 채운다고 본다. 그 수요를 보고 원료 건물이 들어온다
        // (막으면 광석 → 철처럼 수요가 없어 아무도 원료를 만들지 않는 사슬이 영원히 시작되지 않는다). 착공하면 add 가 수요를 더해 다음 공사는 막힌다
        if (PRODUCIBLE.has(g) && supply[g] < 1 && demand[g] < 1) continue;
        f = Math.min(f, clamp(spare[g] / need, 0, 1));
      }
      return f;
    },
    price(g, dS = 0, dD = 0, withLatent = true) {
      const S = supply[g] + dS, D = demand[g] + dD + (withLatent ? latent[g] : 0);
      if (S < 1 && dD > 0) return GOODS[g].basePrice * UNSUPPLIED_INPUT;
      const back = sub?.get(g);
      if (!back) return longRunPrice(g, D, S);
      // 돌아오는 수요는 값이 낮을수록 크다: 장기 가격 = 그 값에서 돌아오는 수요까지 센 가격이 되는 값 (격자에서 찾아 선형 보간)
      const base = GOODS[g].basePrice;
      let prev = 0;
      for (let i = 0; i < SUB_GRID.length; i++) {
        const p = base * SUB_GRID[i], gap = longRunPrice(g, D + back[i], S) - p;
        if (gap <= 0) {
          if (i === 0) return p;
          const p0 = base * SUB_GRID[i - 1];
          return p0 + ((p - p0) * prev) / (prev - gap);
        }
        prev = gap;
      }
      return base * SUB_GRID[SUB_GRID.length - 1];
    },
    sellRate(g, dS = 0) {
      const S = supply[g] + dS;
      if (S < 1e-6) return 1;
      let D = demand[g] + latent[g];
      const back = sub?.get(g);
      if (back) {
        const x = this.price(g, dS) / GOODS[g].basePrice;
        const i = Math.min(SUB_GRID.length - 2, Math.max(0, Math.floor((x - SUB_GRID[0]) / 0.05)));
        const t = clamp((x - SUB_GRID[i]) / 0.05, 0, 1);
        D += back[i] * (1 - t) + back[i + 1] * t;
      }
      return Math.min(1, D / S);
    },
    add(m, levels, perk, now = false) {
      for (const g of GOOD_IDS) {
        const out = (m.outputs[g] ?? 0) * levels * perk, inp = (m.inputs[g] ?? 0) * levels;
        supply[g] += out;
        demand[g] += inp;
        spare[g] -= inp;
        if (now) spare[g] += out;
      }
    },
  };
}

/** 돌아오는 수요를 셀 가공품 값 격자 (기본가 배율, 장기 가격의 범위 0.25~1.75) */
const SUB_GRID = Array.from({ length: 31 }, (_, i) => 0.25 + 0.05 * i);

/**
 * 돌아오는 수요 (TUNE.subReturn): 가공품 값이 격자의 값일 때, 지금 원자재로 그 필요를 채우는 가계 수요 중 가공품으로 옮겨 올 양.
 * 가계가 실제로 고르는 규칙(needSharesAt: 지역 값과 부의 상한)으로 센다. 원자재 가계 수요는 필요별로 나눈다
 * (목재는 난방과 생활용품: 지역 평균 부의 필요량 × 지금 비중으로). 이미 가공품을 사는 수요는 지금 수요에 들어 있으므로 더하지 않는다
 */
function returnableDemand(w: World): Map<GoodId, number[]> {
  const out = new Map<GoodId, number[]>();
  for (const r of w.regions) {
    const L = regionAvgWealth(r), amount = needsAt(L);
    const local = (n: NeedDef) => n.options.map((o) => r.market[o.good].price);
    const hh = (g: GoodId) => { let x = 0; for (const [k, v] of Object.entries(r.market[g].demandByEma ?? {})) if (k.startsWith('pop:')) x += v; return x; };
    // 원자재 g 의 가계 수요 중 필요 n 의 몫
    const rawShare = (g: GoodId, n: NeedDef) => {
      let mine = 0, all = 0;
      for (const m of NEEDS) {
        const i = m.options.findIndex((o) => o.good === g);
        if (i < 0) continue;
        const x = amount[m.id] * needSharesAt(m.id, local(m), L)[i] * m.options[i].units;
        all += x;
        if (m === n) mine = x;
      }
      return all > 0 ? mine / all : 0;
    };
    for (const n of NEEDS) n.options.forEach((opt, pi) => {
      if (!opt.appeal || opt.appeal <= 1) return;
      const prices = local(n), now = needSharesAt(n.id, prices, L);
      const arr = out.get(opt.good) ?? new Array(SUB_GRID.length).fill(0);
      n.options.forEach((raw, ri) => {
        if (ri === pi || now[ri] < 1e-6) return;
        const units = (hh(raw.good) * rawShare(raw.good, n)) / raw.units;
        if (!(units > 0)) return;
        for (let i = 0; i < SUB_GRID.length; i++) {
          const p = prices.slice();
          p[pi] = GOODS[opt.good].basePrice * SUB_GRID[i];
          const moved = units * Math.max(0, 1 - needSharesAt(n.id, p, L)[ri] / now[ri]);
          arr[i] += moved * opt.units;
        }
      });
      out.set(opt.good, arr);
    });
  }
  return out;
}

/** 기본가 기준 하루 이윤 (방식끼리 비교용) */
export function baseValue(m: MethodDef, c: Company): number {
  let v = 0;
  for (const g of GOOD_IDS) v += ((m.outputs[g] ?? 0) - (m.inputs[g] ?? 0)) * GOODS[g].basePrice;
  return v - wageCostOf(m, c.wages, c.state);
}

export interface Valuation { revenue: number; inputCost: number; wageCost: number; profit: number; utilization: number }

/**
 * 새로 지을지 판단할 때 쓰는 장기 임금: 민간은 지금 임금과 기본 임금 × TUNE.investWage 중 큰 값.
 * 왕실 임금은 정책(국영 임금 수준)이 정하므로 지금 임금 그대로 본다
 */
function longRunWages(c: Company): Record<Skill, number> {
  if (c.state) return c.wages;
  const out = {} as Record<Skill, number>;
  for (const s of SKILLS) out[s] = Math.max(c.wages[s], SKILL_DEFS[s].baseWage * TUNE.investWage);
  return out;
}

/**
 * 한 지역에 이 방식으로 levels 개를 새로 돌릴 때의 장기 하루 손익 (가장 이익이 나는 가동률로).
 * existing: 이미 돌고 있는 레벨의 손익 (그 산출과 투입은 이미 전망에 들어 있으므로 더하지 않는다). 짓기와 철거를 같은 계산으로 비교한다.
 * 산출물은 전량 팔린다고 본다 (남는 공급은 가격으로 나타난다). 값은 들어간 뒤의 장기 가격과 현지 가격의 평균이고,
 * 지역 밖으로 나가는 몫은 운송비를 뺀다. 투입재도 같은 규칙: 사들인 뒤의 장기 가격(잠재 수요 제외)과 현지 가격의 평균.
 */
export function valueMethod(w: World, o: Outlook, r: Region, c: Company, typeId: string, m: MethodDef, levels = 1, existing = false, fill?: number): Valuation {
  const fixed = valueFixed(w, r, c, typeId, m);
  let best: Valuation | null = null;
  for (const u of [1, 0.75, 0.5, 0.25]) {
    const v = valueAt(o, r, c, m, levels * u, existing, fixed, fill);
    if (!best || v.profit > best.profit) best = { ...v, utilization: u };
  }
  return best!;
}

/** valueAt 에서 가동률과 무관한 값 (가동률마다 다시 세지 않는다) */
interface ValueFixed {
  perk: number;
  ship: number;
  /** 행정청: 그 왕국과 공사 중인 행정청까지 센 지금 징수 한도 */
  kingdom?: Kingdom;
  cap: number;
  /** 레벨 1 장기 인건비 */
  wage: number;
  /** 이 방식이 쓰거나 만드는 상품 (GOOD_IDS 순서) */
  goods: GoodId[];
}

const goodsCache = new WeakMap<MethodDef, GoodId[]>();
function goodsOf(m: MethodDef): GoodId[] {
  let gs = goodsCache.get(m);
  if (!gs) goodsCache.set(m, (gs = GOOD_IDS.filter((g) => (m.outputs[g] ?? 0) !== 0 || (m.inputs[g] ?? 0) !== 0)));
  return gs;
}

function valueFixed(w: World, r: Region, c: Company, typeId: string, m: MethodDef): ValueFixed {
  const perk = 1 + regionPerk(r.id, typeId);
  const ship = shippingRate(w, r.id);
  let kingdom: Kingdom | undefined, cap = 0;
  if (m.taxCapacity && c.state) {
    kingdom = w.kingdoms.find((x) => x.id === r.kingdomId);
    // 공사 중인 행정청의 한도도 이미 있는 것으로 친다
    let pending = 0;
    for (const x of w.constructions) {
      const pm = getMethod(x.typeId, x.methodId);
      if (pm.taxCapacity && regionById(w, x.regionId).kingdomId === r.kingdomId) pending += pm.taxCapacity * (x.levels ?? 1);
    }
    if (kingdom) cap = (kingdom.taxCapacity ?? 0) + pending * TUNE.adminScale;
  }
  // 새로 지을지 판단할 때는 장기 임금으로 본다 (longRunWages)
  const wage = wageCostOf(m, longRunWages(c), c.state);
  return { perk, ship, kingdom, cap, wage, goods: goodsOf(m) };
}

/**
 * 투입 충족 (fill): 주어지면 그 값, 아니면 새로 짓는 레벨(existing = false)이고 TUNE.aiInputFill 이면 전망의 남는 투입재로 채우는 비율 (Outlook.fill,
 * 가동률마다 그 필요로 센다). 매출(행정청 세금 몫 포함)과 원료비에 곱하고 인건비는 그대로 낸다 (생산은 가장 모자란 투입을 따른다)
 */
function valueAt(o: Outlook, r: Region, c: Company, m: MethodDef, levels: number, existing: boolean, fixed: ValueFixed, fillIn?: number): Omit<Valuation, 'utilization'> {
  const { perk, ship } = fixed;
  let revenue = 0, inputCost = 0;
  // 쓰지도 만들지도 않는 상품은 산출·투입이 0 이라 건너뛴다
  for (const g of fixed.goods) {
    const out = (m.outputs[g] ?? 0) * levels * perk;
    if (out > 0) {
      const p = o.price(g, existing ? 0 : out, 0);
      const outside = GOODS[g].perishable ? 0 : clamp(1 - r.market[g].demandEma / out, 0, 1);
      const unit = (1 - outside) * (p + r.market[g].price) / 2 + outside * p * (1 - ship);
      // TUNE.sellThrough: 대륙 수요를 넘는 산출은 팔리지 않는다고 본다
      revenue += out * unit * (TUNE.sellThrough ? o.sellRate(g, existing ? 0 : out) : 1);
    }
    const inp = (m.inputs[g] ?? 0) * levels;
    if (inp > 0) {
      const dD = existing ? 0 : inp;
      const lr = PRODUCIBLE.has(g) ? Math.min(o.price(g, 0, dD, false), GOODS[g].basePrice * UNSUPPLIED_INPUT) : o.price(g, 0, dD, false);
      const p = (lr + r.market[g].price) / 2;
      const imported = GOODS[g].perishable ? 0 : clamp(1 - r.market[g].supplyEma / inp, 0, 1);
      inputCost += inp * p * (1 + ship * imported);
    }
  }
  // 행정청: 지금 한도 때문에 못 걷는 세금을 이만큼 더 걷는다
  if (m.taxCapacity && c.state) {
    const k = fixed.kingdom;
    // 늘어난 한도만큼 징수율 곡선이 오르는 몫 × 걷어야 할 세금
    if (k) {
      const cap = fixed.cap, n = k.taxDue ?? 0, add = m.taxCapacity * TUNE.adminScale * levels * perk;
      revenue += (k.taxOwed ?? 0) * (existing ? collectionRatio(cap, n) - collectionRatio(Math.max(0, cap - add), n) : collectionRatio(cap + add, n) - collectionRatio(cap, n));
    }
  }
  const fill = fillIn ?? (!existing && TUNE.aiInputFill ? o.fill(m, levels) : 1);
  if (fill < 1) { revenue *= fill; inputCost *= fill; }
  const wageCost = fixed.wage * levels;
  return { revenue, inputCost, wageCost, profit: revenue - inputCost - wageCost };
}

/** 이 기술을 열면 회사가 얻는 하루 가치 추정 */
export function techValue(w: World, o: Outlook, c: Company, techId: string): number {
  let value = 0;
  const home = w.regions.find((r) => r.kingdomId === c.kingdomId)!;
  for (const t of Object.values(BUILDING_BY_ID)) {
    for (const m of t.methods) {
      if (m.tech !== techId) continue;
      for (const b of w.buildings) {
        if (b.companyId !== c.id || b.typeId !== t.id) continue;
        const r = regionById(w, b.regionId);
        value += Math.max(0, valueMethod(w, o, r, c, t.id, m, b.level).profit - valueMethod(w, o, r, c, t.id, getMethod(b.typeId, b.methodId), b.level).profit);
      }
      value += Math.max(0, valueMethod(w, o, home, c, t.id, m, 1).profit);
    }
  }
  return value;
}

/**
 * 화면의 건설 후보 미리보기: AI가 짓기 전에 보는 것과 같은 계산(valueMethod)을 1레벨 기준으로 돌려준다.
 * wages 는 보는 회사의 임금이다. outputPriceChange 는 들어간 뒤 첫 산출물의 장기 가격 변화율이다
 */
export function estimateAfterEntry(
  w: World, regionId: number, typeId: string, methodId: string, wages: Record<Skill, number>, levels = 1,
): Valuation & { margin: number; outputPriceChange: number } {
  const r = regionById(w, regionId);
  const owner = w.companies.find((c) => c.wages === wages) ?? w.companies.find((c) => c.state && c.kingdomId === r.kingdomId)!;
  const m = getMethod(typeId, methodId);
  const o = marketOutlook(w);
  const v = valueMethod(w, o, r, { ...owner, wages }, typeId, m, levels);
  const g = GOOD_IDS.find((x) => (m.outputs[x] ?? 0) > 0);
  const before = g ? o.price(g, 0, 0, true) : 0;
  const after = g ? o.price(g, (m.outputs[g] ?? 0) * levels, 0, true) : 0;
  const per = (x: number) => x / levels;
  const cost = per(v.inputCost) + per(v.wageCost);
  return {
    revenue: per(v.revenue), inputCost: per(v.inputCost), wageCost: per(v.wageCost), profit: per(v.profit), utilization: v.utilization,
    margin: cost > 0 ? per(v.profit) / cost : 0, outputPriceChange: before > 0 ? after / before - 1 : 0,
  };
}
