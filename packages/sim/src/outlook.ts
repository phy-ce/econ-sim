import { BUILDING_BY_ID, GOOD_IDS, GOODS, NEEDS, SKILL_DEFS, TUNE, getMethod, regionPerk } from './data';
import { availableMethods, collectionRatio, regionById, shippingRate, wageCostOf } from './economy';
import { clamp } from './rng';
import { SKILLS } from './types';
import type { Company, GoodId, Kingdom, MethodDef, Region, Skill, World } from './types';

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
  add(m: MethodDef, levels: number, perk: number): void;
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
  for (const k of w.constructions) {
    const m = getMethod(k.typeId, k.methodId);
    const perk = 1 + regionPerk(k.regionId, k.typeId);
    for (const g of GOOD_IDS) {
      supply[g] += (m.outputs[g] ?? 0) * perk * (k.levels ?? 1);
      demand[g] += (m.inputs[g] ?? 0) * (k.levels ?? 1);
    }
  }
  // 잠재 수요: 기본가로 따져 지금 방식보다 나은 방식이 있으면 그 방식이 더 쓰는 투입재
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
    if (best) for (const g of GOOD_IDS) {
      const extra = (best.inputs[g] ?? 0) - (cur.inputs[g] ?? 0);
      if (extra > 0) latent[g] += extra * b.level;
    }
  }
  // 대체 수요: 가공품이 비싸서 원자재로 버티는 가계 수요의 절반은 값이 내려가면 돌아온다 (공장의 원료 수요는 대체하지 않는다)
  const household = (g: GoodId) => w.regions.reduce((a, r) => a + Object.entries(r.market[g].demandByEma ?? {}).reduce((x, [k, v]) => x + (k.startsWith('pop:') ? v : 0), 0), 0);
  for (const n of NEEDS) for (const opt of n.options) {
    if (!opt.appeal || opt.appeal <= 1) continue;
    for (const other of n.options) if (other !== opt) demand[opt.good] += (household(other.good) / other.units) * opt.units * 0.5;
  }
  return {
    demand, latent, supply,
    price(g, dS = 0, dD = 0, withLatent = true) {
      const S = supply[g] + dS, D = demand[g] + dD + (withLatent ? latent[g] : 0);
      if (S < 1 && dD > 0) return GOODS[g].basePrice * UNSUPPLIED_INPUT;
      return longRunPrice(g, D, S);
    },
    add(m, levels, perk) {
      for (const g of GOOD_IDS) {
        supply[g] += (m.outputs[g] ?? 0) * levels * perk;
        demand[g] += (m.inputs[g] ?? 0) * levels;
      }
    },
  };
}

/** 기본가 기준 하루 이윤 (방식끼리 비교용) */
function baseValue(m: MethodDef, c: Company): number {
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
export function valueMethod(w: World, o: Outlook, r: Region, c: Company, typeId: string, m: MethodDef, levels = 1, existing = false): Valuation {
  const fixed = valueFixed(w, r, c, typeId, m);
  let best: Valuation | null = null;
  for (const u of [1, 0.75, 0.5, 0.25]) {
    const v = valueAt(o, r, c, m, levels * u, existing, fixed);
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

function valueAt(o: Outlook, r: Region, c: Company, m: MethodDef, levels: number, existing: boolean, fixed: ValueFixed): Omit<Valuation, 'utilization'> {
  const { perk, ship } = fixed;
  let revenue = 0, inputCost = 0;
  // 쓰지도 만들지도 않는 상품은 산출·투입이 0 이라 건너뛴다
  for (const g of fixed.goods) {
    const out = (m.outputs[g] ?? 0) * levels * perk;
    if (out > 0) {
      const p = o.price(g, existing ? 0 : out, 0);
      const outside = GOODS[g].perishable ? 0 : clamp(1 - r.market[g].demandEma / out, 0, 1);
      const unit = (1 - outside) * (p + r.market[g].price) / 2 + outside * p * (1 - ship);
      revenue += out * unit;
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
