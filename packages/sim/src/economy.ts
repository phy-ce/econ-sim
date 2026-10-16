import { BUILDING_BY_ID, BUILDING_SCALE, GOOD_IDS, GOODS, POINT_VALUE, SKILL_DEFS, TECH_BY_ID, getMethod, scaleBonus, POP_SCALE , regionPerk } from './data';
import { clamp } from './rng';
import { POP_CLASSES, SKILLS } from './types';
import type { Building, BuildingTypeDef, Company, EventKind, GoodBag, GoodId, LandType, MethodDef, PopClass, Region, Skill, World } from './types';

// ---------------------------------------------------------------- 지역·시장

export function regionById(w: World, id: number): Region {
  const r = w.regions.find((x) => x.id === id);
  if (!r) throw new Error(`unknown region ${id}`);
  return r;
}

export const priceIn = (w: World, regionId: number, g: GoodId) => regionById(w, regionId).market[g].price;

/** 왕국 전체 기준가: 지역 가격을 거래량으로 가중 평균 */
export function colonyPrice(w: World, g: GoodId): number {
  let v = 0, q = 0;
  for (const r of w.regions) {
    const mg = r.market[g];
    const weight = mg.volumeEma + 1;
    v += mg.price * weight;
    q += weight;
  }
  return v / q;
}

/** 가장 가까운 개항장까지 몇 번 운송해야 하는가 */
export function hopsToSpaceport(w: World, regionId: number): number {
  const seen = new Set([regionId]);
  let frontier = [regionId];
  for (let d = 0; frontier.length; d++) {
    const next: number[] = [];
    for (const id of frontier) {
      const r = regionById(w, id);
      if (r.spaceport) return d;
      for (const nb of r.neighbors) if (!seen.has(nb)) { seen.add(nb); next.push(nb); }
    }
    frontier = next;
  }
  return 99;
}

/** 추정용 판매율: 가격이 기본가 이상이면 부족한 시장이므로 다 팔린다고 본다 */
/** 화물을 지역 밖으로 내보낼 때 필요한 운송 (tick.ts transportOrder 참고) */
export const RAIL_RATE = 0.06;
export const CARTAGE_RATE = 0.3;

/** 이 지역에서 화물을 내보낼 때 예상 운송비 (화물가 대비): 철도로 갈 수 있는 비율만큼 철도 운임, 나머지는 짐꾼 운임 */
export function shippingRate(w: World, regionId: number): number {
  const mt = regionById(w, regionId).market.transport;
  const railShare = mt.demandEma > 1e-6 ? clamp(mt.supplyEma / mt.demandEma, 0, 1) : mt.supplyEma > 0 ? 1 : 0;
  return railShare * RAIL_RATE * (mt.price / GOODS.transport.basePrice) + (1 - railShare) * CARTAGE_RATE;
}

/** 기본가 대비 이 배율 아래로 내려가면 개항장에 수출 수요가 생기고, FULL에서 남는 물건을 다 사 간다 (헐값) */
export const EXPORT_START = 0.75;
export const EXPORT_FULL = 0.5;

/** 이 지역에서 만든 물건을 개항장까지 실어 가 수출할 때 손에 쥐는 값 (기본가 대비): 수출 하한가에서 구간마다 운송비를 뗀다 */
export function exportNetback(w: World, regionId: number, extraValue = 0): number {
  return EXPORT_FULL * Math.pow(1 - marginalShippingRate(w, regionId, extraValue), hopsToSpaceport(w, regionId));
}

/**
 * 화물 extraValue 어치를 더 내보낼 때의 운송비 비율: 철도 운송에 남는 여유가 있는 만큼은 철도 운임,
 * 모자라는 만큼은 짐꾼 운임. extraValue 가 0이면 지금 운송비(shippingRate)와 같다.
 */
export function marginalShippingRate(w: World, regionId: number, extraValue: number): number {
  if (extraValue <= 0) return shippingRate(w, regionId);
  const mt = regionById(w, regionId).market.transport;
  const capacity = Math.max(mt.supplyEma, outputCapacity(w, regionId, 'transport'));
  const spare = Math.max(0, capacity - mt.demandEma);
  const need = (extraValue * RAIL_RATE) / GOODS.transport.basePrice;
  const railFrac = Math.min(1, spare / need);
  return railFrac * RAIL_RATE * (mt.price / GOODS.transport.basePrice) + (1 - railFrac) * CARTAGE_RATE;
}

export function expectedSellThrough(g: GoodId, mg: { price: number; sellThrough: number }): number {
  return mg.price >= GOODS[g].basePrice ? 1 : Math.max(0.3, mg.sellThrough);
}

export function regionPopulation(r: Region): number {
  return POP_CLASSES.reduce((a, s) => a + r.households[s].population, 0);
}

// ---------------------------------------------------------------- 땅

/** 지역에서 그 땅을 쓰고 있는 레벨 수 (공사 중 포함) */
export function landUsed(w: World, regionId: number, land: LandType): number {
  let n = 0;
  for (const b of w.buildings) if (b.regionId === regionId && BUILDING_BY_ID[b.typeId].land === land) n += b.level;
  for (const k of w.constructions) if (k.regionId === regionId && BUILDING_BY_ID[k.typeId].land === land) n += k.levels ?? 1;
  return n;
}

export function landFree(w: World, regionId: number, land: LandType): number {
  return regionById(w, regionId).land[land] - landUsed(w, regionId, land);
}

// ---------------------------------------------------------------- 기술

export function knowsTech(c: Company, techId: string | undefined): boolean {
  return !techId || c.research.known.includes(techId);
}

export function availableMethods(c: Company, typeId: string): MethodDef[] {
  return BUILDING_BY_ID[typeId].methods.filter((m) => knowsTech(c, m.tech));
}

/** 쓸 수 있는 생산 방식이 하나라도 있어야 지을 수 있다 */
export function canBuildType(c: Company, t: BuildingTypeDef): boolean {
  return t.methods.some((m) => knowsTech(c, m.tech));
}

/** 선행 기술을 모두 갖췄고 아직 모르는 기술 */
export function researchableTechs(c: Company): string[] {
  return Object.values(TECH_BY_ID)
    .filter((t) => !c.research.known.includes(t.id) && t.requires.every((r) => c.research.known.includes(r)))
    .map((t) => t.id);
}

// ---------------------------------------------------------------- 건물

export function slots(b: Building, skill: Skill): number {
  if (!b.active || b.idle) return 0;
  return (getMethod(b.typeId, b.methodId).workers[skill] ?? 0) * b.level * b.utilization;
}

/** 소유주가 하나도 없을 때의 효율 배율. 소유주 충원율 f 에서 OWNERLESS + (1 - OWNERLESS) × f */
export const OWNERLESS_EFFICIENCY = 0.7;

/** 지금 앉아 있는 소유주 / 소유주 일자리 (0..1) */
export function ownerFillNow(b: Building): number {
  const jobs = ownerJobs(b).jobs;
  return jobs > 0 ? clamp(b.owners / jobs, 0, 1) : 1;
}

/** 소유주 배율: 소유주 충원율(서서히 따라간 값)이 낮으면 최대 30% 덜 만든다 */
export function ownerFactor(fill: number): number {
  return OWNERLESS_EFFICIENCY + (1 - OWNERLESS_EFFICIENCY) * clamp(fill, 0, 1);
}

export interface EfficiencyParts {
  /** 숙련도 배율 0.4..1 */
  experience: number;
  /** 소유주 배율 0.7..1 과 그 바탕인 소유주 충원율(지연 반영) */
  owners: number;
  ownerFill: number;
  /** 규모의 경제 배율 1..1.5 */
  scale: number;
  /** 지역 특산 배율 */
  perk: number;
  /** 작업 인원 비율 0..1 (효율에는 곱하지 않고 생산량에 따로 곱해진다. 화면 표시용) */
  crew: number;
  /** experience × owners × scale × perk */
  total: number;
}

/** 효율의 구성 요소 (화면의 막대 표시용) */
export function efficiencyParts(b: Building): EfficiencyParts {
  const experience = 0.4 + 0.6 * b.exp;
  const ownerFill = b.ownerFill ?? ownerFillNow(b);
  const owners = ownerFactor(ownerFill);
  const scale = scaleBonus(b.level);
  const perk = 1 + regionPerk(b.regionId, b.typeId);
  return { experience, owners, ownerFill, scale, perk, crew: b.crew ?? b.last.staffing, total: experience * owners * scale * perk };
}

/** 효율: 숙련도(0.4 → 1.0), 소유주 충원(0.7 → 1.0), 규모의 경제, 지역 특산 */
export function efficiency(b: Building): number {
  return efficiencyParts(b).total;
}

/** 이 지역에 levels 개를 더 지으면 기대할 수 있는 소유주 배율 (지역의 그 소유 계층 인구 / 자리 수) */
export function expectedOwnerFactor(w: World, r: Region, typeId: string, levels = 1): number {
  const cls = BUILDING_BY_ID[typeId].land === 'plot' ? 'capitalist' : 'aristocrat';
  const jobs = regionOwnerJobs(w, r)[cls] + OWNERS_PER_LEVEL * levels;
  return ownerFactor(jobs > 0 ? r.households[cls].population / jobs : 1);
}

/** 임금 기준 가중 평균 충원율 0..1 */
export function staffing(b: Building): number {
  let need = 0;
  let have = 0;
  for (const s of SKILLS) {
    const n = slots(b, s);
    need += n * SKILL_DEFS[s].baseWage;
    have += Math.min(n, b.employed[s]) * SKILL_DEFS[s].baseWage;
  }
  return need > 0 ? have / need : 0;
}

export interface MethodEstimate {
  revenue: number;
  inputCost: number;
  wageCost: number;
  profit: number;
  margin: number;
}

function wageCostOf(method: MethodDef, wages: Record<Skill, number>): number {
  let v = 0;
  for (const s of SKILLS) v += (method.workers[s] ?? 0) * wages[s];
  return v;
}

/** 지역 시장의 현재 가격과 주어진 임금으로, 레벨 1 만원 가동 시 틱당 손익 추정 */
export function estimateMethod(
  w: World, regionId: number, typeId: string, methodId: string, wages: Record<Skill, number>,
): MethodEstimate {
  const method = getMethod(typeId, methodId);
  const mk = regionById(w, regionId).market;
  let revenue = (method.grant ?? 0) * wageCostOf(method, wages) * w.grantRatio;
  let inputCost = 0;
  for (const g of GOOD_IDS) {
    revenue += (method.outputs[g] ?? 0) * (1 + regionPerk(regionId, typeId)) * mk[g].price * expectedSellThrough(g, mk[g]);
    inputCost += (method.inputs[g] ?? 0) * mk[g].price;
  }
  const wageCost = wageCostOf(method, wages);
  const cost = inputCost + wageCost;
  const profit = revenue - cost;
  return { revenue, inputCost, wageCost, profit, margin: cost > 0 ? profit / cost : 0 };
}

/** 지역의 가동 중인 건물이 사람을 다 뽑고 돌 때 하루에 만드는 양 */
export function outputCapacity(w: World, regionId: number, g: GoodId): number {
  let q = 0;
  for (const b of w.buildings) {
    if (b.regionId !== regionId || !b.active) continue;
    const out = getMethod(b.typeId, b.methodId).outputs[g];
    if (out) q += out * b.level * b.utilization;
  }
  return q;
}

/**
 * 진입 효과를 반영한 추정: 내 산출량만큼 공급이 늘면 산출물 가격이, 내 투입량만큼 수요가 늘면 투입재 가격이
 * 가격 공식((수요/공급)^0.8)을 따라 움직인다고 보고 다시 계산한다. 지역 시장은 운송으로 이어져 있으므로
 * 가격 영향은 왕국 전체 유통량으로 계산하고, 지역에 없는 투입재는 운송비를 붙여 들여온다고 본다.
 */
export function estimateAfterEntry(
  w: World, regionId: number, typeId: string, methodId: string, wages: Record<Skill, number>, levels = 1,
  /** 이미 공사 중이라 곧 늘어날 지역 공급 ("지역id:상품" → 하루 산출) */
  pending: Record<string, number> = {},
  /** 곧 다른 건물이 공급할 투입재 (병목 사슬): 기본가에 운송비를 붙여 산다고 본다 */
  supplied: ReadonlySet<GoodId> | ReadonlyMap<GoodId, unknown> = new Set(),
): MethodEstimate & { outputPriceChange: number } {
  const method = getMethod(typeId, methodId);
  const r = regionById(w, regionId);
  const mk = r.market;
  // 이웃 시장은 운송비만큼 덜 닿는다: 철도가 충분하면 대부분 닿고, 짐꾼으로 옮겨야 하면 거의 닿지 않는다
  const reach = Math.max(0, 1 - shippingRate(w, regionId) / CARTAGE_RATE);
  let revenue = (method.grant ?? 0) * wageCostOf(method, wages) * w.grantRatio;
  let inputCost = 0, outBefore = 0, outAfter = 0;
  for (const g of GOOD_IDS) {
    const mg = mk[g];
    const out = (method.outputs[g] ?? 0) * levels * (1 + regionPerk(regionId, typeId));
    const inp = (method.inputs[g] ?? 0) * levels;
    if (out <= 0 && inp <= 0) continue;
    // 이 건물이 실제로 닿는 유통량: 지역 시장 + 운송으로 닿는 만큼의 이웃 시장 (서비스 상품은 지역 안에서만)
    const k = GOODS[g].perishable ? 0 : reach;
    // 공급은 평균 유통량과 지금 있는 건물이 다 돌 때의 생산 능력 중 큰 쪽 (갓 지은 건물은 아직 사람을 다 못 뽑았다)
    const supplyOf = (id: number) => Math.max(regionById(w, id).market[g].supplyEma, outputCapacity(w, id, g)) + (pending[`${id}:${g}`] ?? 0);
    let supply = supplyOf(regionId), demand = mg.demandEma;
    for (const nb of r.neighbors) {
      const m2 = regionById(w, nb).market[g];
      supply += supplyOf(nb) * k;
      demand += m2.demandEma * k;
    }
    if (out > 0) {
      // 들어간 뒤 가격: 가격 공식(수요/공급)^0.8 로 본 값. 지금 가격이 더 낮으면(재고 과잉) 지금 가격을 쓴다
      const base = GOODS[g].basePrice;
      const ratioPrice = base * clamp(Math.pow((demand + 1) / (supply + out + 1), 0.8), 0.25, 4);
      const p = Math.min(mg.price, ratioPrice);
      // 팔리는 비율: 수요보다 공급이 많으면 위탁분이 비례로 남는다. 남는 것은 개항장 수출 헐값(운송비 차감)에 넘긴다
      const sell = Math.min(1, (demand + 1) / (supply + out + 1));
      // 남는 물건을 실어 낼 운송: 내 화물만큼 철도 여유가 줄어드는 것까지 본다
      const surplus = out * (1 - sell);
      const netback = GOODS[g].perishable ? 0 : base * exportNetback(w, regionId, surplus * base * EXPORT_FULL);
      const unit = Math.max(p, netback);
      revenue += (method.outputs[g] ?? 0) * (1 + regionPerk(regionId, typeId)) * (unit * sell + netback * (1 - sell));
      outBefore += out * mg.price;
      outAfter += out * unit;
    }
    if (inp > 0 && supplied.has(g)) {
      inputCost += (method.inputs[g] ?? 0) * GOODS[g].basePrice * (1 + shippingRate(w, regionId));
    } else if (inp > 0) {
      // 지역에 모자라는 투입재는 이웃에서 운송비를 내고 들여온다
      const localShort = mg.supplyEma + mg.inventory * 0.05 < mg.demandEma + inp;
      const unit = localShort ? Math.max(mg.price, colonyPrice(w, g) * (1 + shippingRate(w, regionId))) : mg.price;
      // 내가 사는 만큼 수요가 늘어 값이 오른다 (가격 상한 안에서)
      const ratioBefore = clamp(Math.pow((demand + 1) / (supply + 1), 0.8), 0.25, 4);
      const ratioAfter = clamp(Math.pow((demand + inp + 1) / (supply + 1), 0.8), 0.25, 4);
      inputCost += (method.inputs[g] ?? 0) * unit * (ratioAfter / ratioBefore);
    }
  }
  const wageCost = wageCostOf(method, wages);
  const cost = inputCost + wageCost;
  const profit = revenue - cost;
  return {
    revenue, inputCost, wageCost, profit, margin: cost > 0 ? profit / cost : 0,
    outputPriceChange: outBefore > 0 ? outAfter / outBefore - 1 : 0,
  };
}

export interface ConstructionEstimate {
  /** 회사 건축사무소들이 하루에 만드는 포인트 (현재 숙련도·충원 기준) */
  pointsPerDay: number;
  /** 하루 운영비 (임금 + 투입재) */
  costPerDay: number;
  /** 사무소가 전부 이 공사에만 매달릴 때의 공기와 비용 */
  days: number;
  cost: number;
  required: number;
}

/** 회사의 건축사무소로 이 건물 1레벨을 지을 때 걸리는 날과 비용 추정 */
export function constructionEstimate(w: World, c: Company, typeId: string): ConstructionEstimate {
  const required = BUILDING_BY_ID[typeId].buildPoints;
  let pointsPerDay = 0, costPerDay = 0;
  for (const b of w.buildings) {
    if (b.companyId !== c.id || !b.active) continue;
    const m = getMethod(b.typeId, b.methodId);
    if (!m.construction) continue;
    // 대기 중(인부 해산)인 사무소는 공사가 들어오면 다시 채워지므로 만원 기준으로 본다
    const st = b.idle ? 1 : Math.max(0.3, b.last.staffing);
    pointsPerDay += m.construction * b.level * b.utilization * st * efficiency(b);
    const e = estimateMethod(w, b.regionId, b.typeId, b.methodId, c.wages);
    costPerDay += (e.wageCost + e.inputCost) * b.level * b.utilization * st;
  }
  const days = pointsPerDay > 0 ? required / pointsPerDay : Infinity;
  return { pointsPerDay, costPerDay, days, cost: pointsPerDay > 0 ? days * costPerDay : Infinity, required };
}

/** 회사가 건축사무소를 갖고 있는가 */
export function hasBuilder(w: World, c: Company): boolean {
  return w.buildings.some((b) => b.companyId === c.id && !!getMethod(b.typeId, b.methodId).construction);
}

// ---------------------------------------------------------------- 임금

/**
 * 시장임금: 전체 가동 건물의 고용 가중 평균 임금. 자기 회사 건물은 뺀다(자기 임금을 자기가 따라가지 않게).
 * 고용이 없으면 기본 임금.
 */
export function marketWage(w: World, skill: Skill, excludeCompanyId?: number): number {
  let paid = 0, n = 0;
  for (const b of w.buildings) {
    if (b.companyId === excludeCompanyId || b.employed[skill] <= 0) continue;
    const c = companyById(w, b.companyId);
    if (!c) continue;
    paid += b.employed[skill] * c.wages[skill];
    n += b.employed[skill];
  }
  return n > 0 ? paid / n : SKILL_DEFS[skill].baseWage;
}

// ---------------------------------------------------------------- 인구·고용

export function employedIn(w: World, regionId: number, skill: Skill): number {
  let n = 0;
  for (const b of w.buildings) if (b.regionId === regionId) n += b.employed[skill];
  return n;
}

export function regionUnemployment(w: World, regionId: number, skill: Skill): number {
  const pop = regionById(w, regionId).households[skill].population;
  return pop > 0 ? Math.max(0, 1 - employedIn(w, regionId, skill) / pop) : 0;
}

export function colonyPopulation(w: World, skill: PopClass): number {
  return w.regions.reduce((a, r) => a + r.households[skill].population, 0);
}

export function employedTotal(w: World, skill: Skill): number {
  let n = 0;
  for (const b of w.buildings) n += b.employed[skill];
  return n;
}

export function unemploymentRate(w: World, skill: Skill): number {
  const pop = colonyPopulation(w, skill);
  return pop > 0 ? Math.max(0, 1 - employedTotal(w, skill) / pop) : 0;
}

/** 왕국 전체 계층 생활수준 (인구 가중 평균) */
export function colonySol(w: World, skill: PopClass): number {
  let v = 0, n = 0;
  for (const r of w.regions) {
    const h = r.households[skill];
    v += h.sol * h.population;
    n += h.population;
  }
  return n > 0 ? v / n : 0;
}

// ---------------------------------------------------------------- 돈

export function totalMoney(w: World): number {
  let t = w.fund + w.bank.cash + w.traders.cash;
  for (const c of w.companies) t += c.cash;
  for (const r of w.regions) for (const s of POP_CLASSES) t += r.households[s].savings;
  return t;
}

/** 왕국 내 화폐 + 해외 계정 = 항상 일정해야 한다 (검증용) */
export function moneyIdentity(w: World): number {
  return totalMoney(w) + w.offworld.balance;
}

/** 건물 장부가: 건설 포인트 × 포인트 가치 × 레벨 */
export function bookValue(b: Building): number {
  return BUILDING_BY_ID[b.typeId].buildPoints * POINT_VALUE * b.level;
}

/** 신용 한도: 보유 건물 장부가의 절반 + 기본 한도 (ƒ3,000 × 인구 배율) */
export function creditLimit(w: World, c: Company): number {
  let book = 0;
  for (const b of w.buildings) if (b.companyId === c.id) book += bookValue(b);
  return 3000 * POP_SCALE + book * 0.5;
}

/** 부족한 현금을 은행에서 자동으로 빌린다. 실제로 빌린 금액을 돌려준다 */
export function borrow(w: World, c: Company, amount: number): number {
  const room = Math.max(0, creditLimit(w, c) - c.debt);
  const take = Math.max(0, Math.min(amount, room, w.bank.cash));
  if (take <= 0) return 0;
  w.bank.cash -= take;
  c.cash += take;
  c.debt += take;
  return take;
}

export function repay(w: World, c: Company, amount: number): number {
  const pay = Math.max(0, Math.min(amount, c.debt, c.cash));
  c.cash -= pay;
  c.debt -= pay;
  w.bank.cash += pay;
  return pay;
}

/** 한 지역의 특정 계층에 돈을 준다. 그 계층이 지역에 없으면 왕국 전체 같은 계층에 나눈다 */
export function payClassIn(w: World, r: Region, cls: PopClass, amount: number) {
  if (amount <= 0) return;
  const h = r.households[cls];
  if (h.population >= 1) { h.savings += amount; h.lastIncome += amount; return; }
  payHouseholds(w, amount, { [cls]: 1 });
}

/** 가계 전체에 (인구 × 계층 가중치) 비율대로 돈을 나눠 준다. 소득으로 잡힌다 */
export function payHouseholds(
  w: World, amount: number,
  weight: Partial<Record<PopClass, number>> = { unskilled: 1, skilled: 1, expert: 1, capitalist: 1, aristocrat: 1 },
) {
  if (amount <= 0) return;
  let total = 0;
  for (const r of w.regions) for (const s of POP_CLASSES) total += r.households[s].population * (weight[s] ?? 0);
  if (total <= 0) return;
  for (const r of w.regions) {
    for (const s of POP_CLASSES) {
      const k = weight[s] ?? 0;
      if (!k) continue;
      const h = r.households[s];
      const amt = (amount * h.population * k) / total;
      h.savings += amt;
      h.lastIncome += amt;
    }
  }
}

// ---------------------------------------------------------------- 기타

export function companyById(w: World, id: number): Company | undefined {
  return w.companies.find((c) => c.id === id);
}

export function playerCompany(w: World): Company | undefined {
  return w.companies.find((c) => c.isPlayer);
}

export function goodName(g: GoodId): string {
  return GOODS[g].name;
}

/** 360틱 = 1년, 30틱 = 1개월. hour(0..23)를 주면 시각까지 표시한다 */
export function formatDate(tick: number, hour?: number): string {
  const y = Math.floor(tick / 360) + 1;
  const mo = Math.floor((tick % 360) / 30) + 1;
  const d = (tick % 30) + 1;
  const base = `왕국력 ${y}년 ${mo}월 ${d}일`;
  return hour === undefined ? base : `${base} ${String(Math.floor(hour)).padStart(2, '0')}시`;
}

/** 기본 소유 지분: 땅에 세운 건물은 지주 귀족, 공장 부지는 자본가. 경영진(기술자·전문가)이 약간 */
/** 건물 1개당 소유주 일자리 수 */
export const OWNERS_PER_LEVEL = 1 * BUILDING_SCALE;
/** 소작농 이만큼마다 지주 귀족 일자리 하나 (빈 땅을 빌려 주는 지주) */
export const TENANTS_PER_LANDLORD = 200;

/**
 * 소유주 일자리 (빅토리아3 방식): 공장부지 건물은 자본가, 농지·산림·광맥 건물은 지주 귀족이 소유주로 앉는다.
 * 건물의 배당은 그 지역의 소유주 계층에게 간다. 일자리가 없는 소유 계층은 배당을 못 받고 점차 기술자로 내려간다.
 */
export function ownerJobs(b: Building): { cls: 'capitalist' | 'aristocrat'; jobs: number } {
  const land = BUILDING_BY_ID[b.typeId].land;
  return { cls: land === 'plot' ? 'capitalist' : 'aristocrat', jobs: OWNERS_PER_LEVEL * b.level };
}

/** 지역의 소유 계층별 일자리 수 (건물 + 소작지 지주) */
export function regionOwnerJobs(w: World, r: Region): Record<'capitalist' | 'aristocrat', number> {
  const jobs = { capitalist: 0, aristocrat: r.subsistenceWorkers / TENANTS_PER_LANDLORD };
  for (const b of w.buildings) {
    if (b.regionId !== r.id) continue;
    const o = ownerJobs(b);
    jobs[o.cls] += o.jobs;
  }
  return jobs;
}

export function newBuilding(id: number, typeId: string, regionId: number, companyId: number, methodId: string, level: number): Building {
  return {
    id, typeId, regionId, companyId, level, methodId, active: true, utilization: 1, lastSwitchTick: -1e9, exp: 0, crew: 0, idle: false,
    owners: 0,
    employed: { unskilled: 0, skilled: 0, expert: 0 }, stock: {}, unpaid: false,
    last: emptyStats(), profitEma: 0, lossWeeks: 0, pausedWeeks: 0,
  };
}

export function emptyStats() {
  return { revenue: 0, inputCost: 0, wageCost: 0, staffing: 0, inputFill: 1, output: {} as GoodBag, points: 0 };
}

const EVENT_CAP = 300;

/** opts.en: 같은 소식의 영어 문장 (화면 언어 선택용) */
export function logEvent(
  w: World, companyId: number | null, text: string,
  opts: { kind?: EventKind; regionId?: number; buildingId?: number; en?: string } = {},
) {
  w.events.push({ tick: w.tick, companyId, text, ...(opts.en ? { textEn: opts.en } : {}), kind: opts.kind ?? 'info', regionId: opts.regionId, buildingId: opts.buildingId });
  if (w.events.length > EVENT_CAP) w.events.splice(0, w.events.length - EVENT_CAP);
}

/** 같은 키의 알림은 cooldown 틱 안에 다시 띄우지 않는다. 띄웠으면 true */
export function alertOnce(
  w: World, key: string, cooldown: number, companyId: number | null, text: string,
  opts: { kind?: EventKind; regionId?: number; buildingId?: number; en?: string } = {},
): boolean {
  const last = w.alertState[key];
  if (last !== undefined && w.tick - last < cooldown) return false;
  w.alertState[key] = w.tick;
  logEvent(w, companyId, text, opts);
  return true;
}

/** 지역 1인당 평균 부 단계 (전 계층 인구 가중 평균) */
export function regionAvgWealth(r: Region): number {
  let pop = 0, sum = 0;
  for (const h of Object.values(r.households)) { pop += h.population; sum += h.population * h.wealth; }
  return pop > 0 ? sum / pop : 0;
}
