import { BUILDING_BY_ID, GOOD_IDS, GOODS, getMethod, regionPerk } from './data';
import { availableMethods, outputCapacity, regionById, shippingRate } from './economy';
import { clamp } from './rng';
import { SKILLS } from './types';
import type { Company, GoodId, MethodDef, Region, Skill, World } from './types';

/**
 * 시장 전망: AI 투자 판단의 공통 바탕.
 * 상품마다 왕국 전체의 "앞으로의 수요"와 "앞으로의 공급 능력"을 세고, 그 비율로 장기 가격을 예상한다.
 * - 수요 = 지금 수요 + 공사 중인 건물이 쓸 투입재 + 잠재 수요(더 나은 방식으로 바꾸면 쓰게 될 투입재)
 * - 공급 = max(지금 공급, 가동 중인 건물의 생산 능력) + 공사 중인 건물의 산출
 * 같은 주에 다른 회사가 착공하면 전망에 바로 반영해(add) 여럿이 같은 빈자리로 몰리지 않게 한다.
 */
export interface Outlook {
  demand: Record<GoodId, number>;
  supply: Record<GoodId, number>;
  /** 공급 dS, 수요 dD 가 더해졌을 때의 장기 가격 */
  price(g: GoodId, dS?: number, dD?: number): number;
  /** 착공을 전망에 반영한다 */
  add(m: MethodDef, levels: number, perk: number): void;
}

/** 아무도 만들지 않는 투입재는 곧 누군가 공급한다고 보고 이 배율로 친다 */
const UNSUPPLIED_INPUT = 1.25;

/** 어떤 건물이든 만들 수 있는 상품 */
const PRODUCIBLE = new Set<GoodId>(Object.values(BUILDING_BY_ID).flatMap((t) => t.methods.flatMap((m) => GOOD_IDS.filter((g) => (m.outputs[g] ?? 0) > 0))));

export function marketOutlook(w: World): Outlook {
  const demand = {} as Record<GoodId, number>;
  const supply = {} as Record<GoodId, number>;
  for (const g of GOOD_IDS) {
    let d = 0, s = 0, cap = 0;
    for (const r of w.regions) {
      d += r.market[g].demandEma;
      s += r.market[g].supplyEma;
      cap += outputCapacity(w, r.id, g);
    }
    demand[g] = d;
    supply[g] = Math.max(s, cap);
  }
  for (const k of w.constructions) {
    const m = getMethod(k.typeId, k.methodId);
    const perk = 1 + regionPerk(k.regionId, k.typeId);
    for (const g of GOOD_IDS) {
      supply[g] += (m.outputs[g] ?? 0) * perk;
      demand[g] += m.inputs[g] ?? 0;
    }
  }
  // 잠재 수요: 기본가로 따졌을 때 지금 방식보다 나은 방식이 있으면, 그 방식의 투입재 중 지금 안 쓰는 몫이 수요다
  for (const b of w.buildings) {
    const c = w.companies.find((x) => x.id === b.companyId);
    if (!c || !b.active) continue;
    const cur = getMethod(b.typeId, b.methodId);
    if (cur.construction || cur.grant) continue;
    const curV = baseValue(cur, c.wages);
    let best: MethodDef | null = null, bestV = curV;
    for (const m of availableMethods(c, b.typeId)) {
      if (m.id === cur.id || m.grant) continue;
      const v = baseValue(m, c.wages);
      if (v > bestV * 1.05) { best = m; bestV = v; }
    }
    if (!best) continue;
    for (const g of GOOD_IDS) {
      const extra = (best.inputs[g] ?? 0) - (cur.inputs[g] ?? 0);
      if (extra > 0) demand[g] += extra * b.level;
    }
  }
  const o: Outlook = {
    demand, supply,
    price(g, dS = 0, dD = 0) {
      const base = GOODS[g].basePrice;
      const S = supply[g] + dS, D = demand[g] + dD;
      if (S < 1 && dD > 0) return base * UNSUPPLIED_INPUT;
      return base * clamp(Math.pow((D + 1) / (S + 1), 0.8), 0.25, 4);
    },
    add(m, levels, perk) {
      for (const g of GOOD_IDS) {
        supply[g] += (m.outputs[g] ?? 0) * levels * perk;
        demand[g] += (m.inputs[g] ?? 0) * levels;
      }
    },
  };
  return o;
}

/** 기본가 기준 하루 이윤 (방식끼리 비교용, 시장 상황과 무관) */
function baseValue(m: MethodDef, wages: Record<Skill, number>): number {
  let v = 0;
  for (const g of GOOD_IDS) v += ((m.outputs[g] ?? 0) - (m.inputs[g] ?? 0)) * GOODS[g].basePrice;
  for (const s of SKILLS) v -= (m.workers[s] ?? 0) * wages[s];
  return v;
}

export interface Valuation { revenue: number; inputCost: number; wageCost: number; profit: number }

/**
 * 한 지역에 이 방식으로 levels 개를 새로 돌릴 때의 장기 하루 손익.
 * 산출물: 내가 들어간 뒤의 장기 가격, 지역 밖으로 팔리는 몫은 운송비를 뺀다. 수요보다 많이 만들면 남는 몫은 수출 하한가.
 * 투입재: 내가 사들인 뒤의 장기 가격, 지역 밖에서 들여오는 몫은 운송비를 더한다.
 */
export function valueMethod(
  w: World, o: Outlook, r: Region, typeId: string, m: MethodDef, wages: Record<Skill, number>, levels = 1,
): Valuation & { utilization: number } {
  // 처음부터 만원 가동한다고 보지 않는다: 가장 이익이 나는 가동률로 평가한다 (수요가 작으면 줄여서 돌린다)
  let best: Valuation & { utilization: number } | null = null;
  for (const u of [1, 0.75, 0.5, 0.25]) {
    const v = valueAt(w, o, r, typeId, m, wages, levels * u);
    if (!best || v.profit > best.profit) best = { ...v, utilization: u };
  }
  return best!;
}

function valueAt(
  w: World, o: Outlook, r: Region, typeId: string, m: MethodDef, wages: Record<Skill, number>, levels: number,
): Valuation {
  const perk = 1 + regionPerk(r.id, typeId);
  const ship = shippingRate(w, r.id);
  let revenue = 0, inputCost = 0;
  for (const g of GOOD_IDS) {
    const out = (m.outputs[g] ?? 0) * levels * perk;
    if (out > 0) {
      const p = o.price(g, out, 0);
      const D = o.demand[g], S = o.supply[g];
      // 팔리는 비율: 왕국 공급이 수요를 넘으면 위탁분이 비례로 남는다
      const sell = Math.min(1, (D + 1) / (S + out + 1));
      // 지역 밖으로 나가는 몫: 지역 수요가 감당 못 하는 만큼
      const local = r.market[g].demandEma;
      const outside = GOODS[g].perishable ? 0 : clamp(1 - local / out, 0, 1);
      const unit = p * (1 - ship * outside);
      const dump = GOODS[g].perishable ? 0 : GOODS[g].basePrice * 0.35 * (1 - ship);
      revenue += out * (unit * sell + dump * (1 - sell));
    }
    const inp = (m.inputs[g] ?? 0) * levels;
    if (inp > 0) {
      // 왕국에서 만들 수 있는 상품이면 장기적으로는 누군가 기본가 근처에 공급한다 (지금의 품귀 가격이 영원하지 않다)
      const p = PRODUCIBLE.has(g) ? Math.min(o.price(g, 0, inp), GOODS[g].basePrice * UNSUPPLIED_INPUT) : o.price(g, 0, inp);
      const local = r.market[g].supplyEma;
      const imported = GOODS[g].perishable ? 0 : clamp(1 - local / inp, 0, 1);
      inputCost += inp * p * (1 + ship * imported);
    }
  }
  if (m.grant) revenue += m.grant * wageOf(m, wages) * levels * w.grantRatio;
  const wageCost = wageOf(m, wages) * levels;
  return { revenue, inputCost, wageCost, profit: revenue - inputCost - wageCost };
}

function wageOf(m: MethodDef, wages: Record<Skill, number>): number {
  let v = 0;
  for (const s of SKILLS) v += (m.workers[s] ?? 0) * wages[s];
  return v;
}

/** 이 기술을 열면 회사가 얻는 하루 가치 추정: 기술이 여는 방식 중 가장 나은 것의 장기 이윤 (지금 쓰는 방식 대비 개선분) */
export function techValue(w: World, o: Outlook, c: Company, techId: string): number {
  let value = 0;
  const port = regionById(w, 1);
  for (const t of Object.values(BUILDING_BY_ID)) {
    for (const m of t.methods) {
      if (m.tech !== techId) continue;
      // 이미 가진 같은 종류 건물이 이 방식으로 바뀌면 얻는 개선
      for (const b of w.buildings) {
        if (b.companyId !== c.id || b.typeId !== t.id) continue;
        const r = regionById(w, b.regionId);
        const gain = valueMethod(w, o, r, t.id, m, c.wages, b.level).profit - valueMethod(w, o, r, t.id, getMethod(b.typeId, b.methodId), c.wages, b.level).profit;
        value += Math.max(0, gain);
      }
      // 새 건물 하나를 지을 수 있게 되는 가치
      value += Math.max(0, valueMethod(w, o, port, t.id, m, c.wages, 1).profit);
    }
  }
  return value;
}
