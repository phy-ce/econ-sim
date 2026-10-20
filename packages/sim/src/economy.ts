import {
  BUILDING_BY_ID, GOOD_IDS, GOODS, HARVEST_KINDS, HARVEST_MAX_SEASONS, HARVEST_SEASON_DAYS, HARVEST_SPREAD, HARVEST_STEP, LAND_NAMES, LAND_NAMES_EN,
  MAX_POINTS_PER_LEVEL_DAY, POINT_VALUE, REGIONS, SKILL_DEFS, SUBSISTENCE, TECH_BY_ID, VEIN_NAMES, VEIN_NAMES_EN, getMethod, regionPerk, scaleBonus, TUNE,
} from './data';
import { regionNameEn } from './i18n';
import { borderCost } from './kingdoms';
import { clamp } from './rng';
import { DEPOSITS, OWNERS, SKILLS, WEALTH_MIN, crewOf, expOf, wealthOf } from './types';
import type {
  Building, BuildingTypeDef, Company, DepositId, EventKind, GoodBag, GoodId, HarvestCondition, LandType, MethodDef, Pop, PopClass, Region, Skill, World,
} from './types';

// ---------------------------------------------------------------- 지역·시장

export function regionById(w: World, id: number): Region {
  const r = w.regions.find((x) => x.id === id);
  if (!r) throw new Error(`unknown region ${id}`);
  return r;
}

export const priceIn = (w: World, regionId: number, g: GoodId) => regionById(w, regionId).market[g].price;

/** 운송 조합 운임 (화물가 대비, 운송 기본가일 때) */
export const RAIL_RATE = 0.06;
/** 운송이 모자라 짐꾼·우마차로 옮길 때 운임 (화물가 대비). 그 지역 노동자 몫이 된다 */
export const CARTAGE_RATE = 0.3;

/** 이 지역에서 화물을 내보낼 때 예상 운송비 (화물가 대비) */
export function shippingRate(w: World, regionId: number): number {
  const mt = regionById(w, regionId).market.transport;
  const railShare = mt.demandEma > 1e-6 ? clamp(mt.supplyEma / mt.demandEma, 0, 1) : mt.supplyEma > 0 ? 1 : 0;
  return railShare * RAIL_RATE * (mt.price / GOODS.transport.basePrice) + (1 - railShare) * CARTAGE_RATE;
}

/** 화물을 from 에서 to 로 옮길 때 드는 비용률 = 운송비 + (국경을 넘으면) 관세 */
export function freightRate(w: World, from: number, to: number, g: GoodId): number {
  return shippingRate(w, from) + borderCost(w, from, to, g);
}

/** 화면용: 지역 인구 (pop 합산 요약) */
export function regionPopulation(r: Region): number {
  let n = 0;
  for (const h of Object.values(r.households)) n += h.population;
  return n;
}

export function regionAvgWealth(r: Region): number {
  let pop = 0, sum = 0;
  for (const h of Object.values(r.households)) { pop += h.population; sum += h.population * h.wealth; }
  return pop > 0 ? sum / pop : 0;
}

// ---------------------------------------------------------------- 땅과 매장량

const landOf = (typeId: string) => BUILDING_BY_ID[typeId].land;

/** 지역에서 그 땅을 쓰고 있는 레벨 수 (공사 중 포함). 소작지는 빈 땅에 자동으로 생기므로 세지 않는다. 땅을 쓰지 않는 건물(행정청·학교)은 어느 땅에도 세지 않는다 */
export function landUsed(w: World, regionId: number, land: LandType): number {
  let n = 0;
  for (const b of w.buildings) if (b.regionId === regionId && landOf(b.typeId) === land && !BUILDING_BY_ID[b.typeId].auto) n += b.level;
  for (const k of w.constructions) if (k.regionId === regionId && landOf(k.typeId) === land) n += k.levels ?? 1;
  return n;
}

export function landFree(w: World, regionId: number, land: LandType): number {
  return regionById(w, regionId).land[land] - landUsed(w, regionId, land);
}

/** 매장량 중 남은 레벨 수 */
export function depositFree(w: World, regionId: number, dep: DepositId): number {
  let used = 0;
  for (const b of w.buildings) if (b.regionId === regionId && BUILDING_BY_ID[b.typeId].deposit === dep) used += b.level;
  for (const k of w.constructions) if (k.regionId === regionId && BUILDING_BY_ID[k.typeId].deposit === dep) used += k.levels ?? 1;
  return regionById(w, regionId).deposits[dep] - used;
}

/** 이 건물 종류를 몇 레벨 더 지을 수 있는가 (땅 또는 매장량). 땅을 쓰지 않는 건물은 제한이 없다 (Infinity) */
export function roomFor(w: World, regionId: number, typeId: string): number {
  const t = BUILDING_BY_ID[typeId];
  const land = t.land ? landFree(w, regionId, t.land) : Infinity;
  return t.deposit ? Math.min(depositFree(w, regionId, t.deposit), land) : land;
}

// ---------------------------------------------------------------- 기상 조건 (빅토리아3 harvest conditions)
//
// 저장하는 상태가 없다. 지역 r 에서 계절 s(90일)에 조건이 시작하는지, 그 종류·강도·길이는 (시드, r, s) 의 해시로 정한다.
// 그래서 어느 날이든 그날의 조건을 다시 계산할 수 있고, 저장·불러오기와 무작위 수열(rand)에 영향이 없다.
// - 진원지: 계절마다 TUNE.harvestChance 확률. 종류는 셋 중 고르게, 강도는 TUNE.harvestIntensity 안에서 고르게,
//   길이는 1~HARVEST_MAX_SEASONS 계절. 첫 계절(0)에는 없다
// - 번짐: 그 계절에 진원지가 된 지역의 이웃마다 HARVEST_SPREAD 확률로 같은 조건(종류·강도·기간)이 걸린다 (빅토리아3 range 1)
// - 한 지역에는 한 번에 하나: 조건이 걸린 지역은 새로 진원지가 되지도, 번져 오는 것을 받지도 않는다.
//   같은 계절이면 자기 진원지가 이웃보다 먼저다

/** 정수 4개 → 0..1 (같은 입력이면 늘 같은 값) */
function hash01(a: number, b: number, c: number, d: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be59b, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1) ^ Math.imul(d + 0x7f4a7c15, 0x9e3779b1);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 지역 regionId 가 계절 s 에 진원지가 될 패인가: 그 조건 (start·end 는 틱). 그 지역이 비어 있어야 실제로 시작한다 */
function originAt(seed: number, regionId: number, s: number): HarvestCondition | null {
  if (s < 1 || !(hash01(seed, regionId, s, 1) < TUNE.harvestChance)) return null;
  const def = HARVEST_KINDS[Math.floor(hash01(seed, regionId, s, 2) * HARVEST_KINDS.length)];
  const [lo, hi] = TUNE.harvestIntensity;
  const intensity = lo + Math.floor(hash01(seed, regionId, s, 3) * (hi - lo + 1));
  const seasons = 1 + Math.floor(hash01(seed, regionId, s, 4) * HARVEST_MAX_SEASONS);
  return {
    kind: def.id, lands: def.lands, intensity, cut: Math.min(1, intensity * HARVEST_STEP), origin: regionId,
    start: s * HARVEST_SEASON_DAYS, end: (s + seasons) * HARVEST_SEASON_DAYS,
  };
}

/**
 * 계절마다 각 지역(w.regions 순서)에 걸린 조건. 앞 계절에서 이어진 것을 알아야 새로 시작하는지 정할 수 있어서 계절 1부터 차례로 센다.
 * 값은 시드·지역·조정값만으로 정해지므로 캐시는 결과를 바꾸지 않는다 (불러온 세계는 처음부터 다시 센다)
 */
const harvestCache = {
  seed: NaN, regions: null as Region[] | null, chance: NaN, lo: NaN, hi: NaN,
  index: new Map<number, number>(), seasons: [] as (HarvestCondition | null)[][],
};

function seasonList(w: World, s: number): (HarvestCondition | null)[] {
  const h = harvestCache, [lo, hi] = TUNE.harvestIntensity;
  if (h.seed !== w.seed || h.regions !== w.regions || h.chance !== TUNE.harvestChance || h.lo !== lo || h.hi !== hi) {
    Object.assign(h, { seed: w.seed, regions: w.regions, chance: TUNE.harvestChance, lo, hi });
    h.index = new Map(w.regions.map((r, i) => [r.id, i]));
    h.seasons = [w.regions.map(() => null)];
  }
  const list = h.seasons;
  while (list.length <= s) {
    const s1 = list.length, t = s1 * HARVEST_SEASON_DAYS, prev = list[s1 - 1];
    // 지난 계절의 조건이 아직 이어지는 지역은 비어 있지 않다
    const busy = prev.map((c) => (c && t < c.end ? c : null));
    const own = w.regions.map((r, i) => (busy[i] ? null : originAt(w.seed, r.id, s1)));
    list.push(w.regions.map((r, i) => {
      if (busy[i] || own[i]) return busy[i] ?? own[i];
      for (const n of r.neighbors) {
        const o = own[h.index.get(n) ?? -1];
        if (o && hash01(w.seed, r.id, s1, 100 + n) < HARVEST_SPREAD) return o;
      }
      return null;
    }));
  }
  return list[s];
}

/** 이 지역에 tick 날 걸린 기상 조건 (없으면 null) */
export function harvestCondition(w: World, regionId: number, tick = w.tick): HarvestCondition | null {
  if (!(TUNE.harvestChance > 0) || tick < 0) return null;
  const list = seasonList(w, Math.floor(tick / HARVEST_SEASON_DAYS));
  return list[harvestCache.index.get(regionId) ?? -1] ?? null;
}

/** 이 지역 이 땅의 tick 날 산출 배율 (1 = 평년). 소작 수확과 농지·산림·광맥 건물의 투입·산출에 곱한다 (효율과 따로) */
export function harvestFactor(w: World, regionId: number, land: LandType | undefined, tick = w.tick): number {
  if (!(TUNE.harvestChance > 0) || !land || land === 'plot') return 1;
  const c = harvestCondition(w, regionId, tick);
  return c && c.lands.includes(land) ? 1 - c.cut : 1;
}

/**
 * 하루 rate 로 움직이는 이동평균(시장 공급 EMA)에 남아 있는 배율: lag 일 전부터 거꾸로 90일 동안의 배율을 그 이동평균과 같은 가중치로 더한다.
 * 조건이 시작한 직후에는 1에 가깝고, 끝난 뒤 몇 주 동안은 1보다 작다 (outlook.ts 가 줄어든 공급을 평년 양으로 되돌릴 때 쓴다)
 */
export function harvestFactorEma(w: World, regionId: number, land: LandType | undefined, rate: number, lag: number): number {
  if (!(TUNE.harvestChance > 0) || !land || land === 'plot') return 1;
  let f = 0, wt = rate;
  for (let k = 0; k < HARVEST_SEASON_DAYS; k++, wt *= 1 - rate) f += wt * harvestFactor(w, regionId, land, w.tick - lag - k);
  return f + wt / rate; // 그보다 오래된 날은 평년으로 본다 (남은 가중치 (1 − rate)^90)
}

/** 라벨: "가뭄 농지 −20% · 45일" / "Drought farmland −20% · 45 d" (조건이 없으면 null). 화면과 알림이 같이 쓴다 */
export function harvestLabel(w: World, regionId: number, en = false): string | null {
  const c = harvestCondition(w, regionId);
  if (!c) return null;
  const def = HARVEST_KINDS.find((d) => d.id === c.kind)!;
  const pct = Math.round(c.cut * 100), days = c.end - w.tick;
  return en
    ? `${def.nameEn} ${c.lands.map((l) => LAND_NAMES_EN[l].toLowerCase()).join(', ')} −${pct}% · ${days} d`
    : `${def.name} ${c.lands.map((l) => LAND_NAMES[l]).join('·')} −${pct}% · ${days}일`;
}

// ---------------------------------------------------------------- 탐광
//
// 광맥 잠재량(REGIONS veins)은 지형으로 고정이고, 그중 찾은 만큼이 Region.deposits 다 (광산은 찾은 광맥에만 짓는다).
// 시작할 때 잠재량 × TUNE.prospectStart 를 안다. 계절(90일)이 바뀌는 날마다 지역·자원마다 남은 잠재량이 있으면
// (시드, 지역, 계절, 자원) 해시로 TUNE.prospectChance 확률에 잠재량 × TUNE.prospectFind 를 찾는다.
// 무작위 수열(rand)을 쓰지 않고, 찾은 양은 deposits 에 저장되므로 저장·불러오기에도 같다.

const round10 = (x: number) => Math.max(0, Math.round(x / 10) * 10);

/** 시작할 때 알려진 광맥 */
export function knownVeins(veins: Record<DepositId, number>): Record<DepositId, number> {
  return Object.fromEntries(DEPOSITS.map((d) => [d, Math.min(veins[d], round10(veins[d] * TUNE.prospectStart))])) as Record<DepositId, number>;
}

/** 남은 (아직 못 찾은) 광맥 잠재량 */
export function veinsLeft(w: World, regionId: number, dep: DepositId): number {
  const def = REGIONS.find((d) => d.id === regionId);
  return Math.max(0, (def?.veins[dep] ?? 0) - regionById(w, regionId).deposits[dep]);
}

/** 계절이 바뀌는 날(w.tick 이 계절 첫날) 탐광: 찾은 광맥을 deposits 와 land.ore 에 더하고 그 지역 왕실에 알린다 */
export function prospect(w: World) {
  if (w.tick <= 0 || w.tick % HARVEST_SEASON_DAYS !== 0 || !(TUNE.prospectChance > 0)) return;
  const s = w.tick / HARVEST_SEASON_DAYS;
  for (const r of w.regions) {
    const def = REGIONS.find((d) => d.id === r.id);
    if (!def) continue;
    DEPOSITS.forEach((dep, i) => {
      const left = veinsLeft(w, r.id, dep);
      if (left <= 0 || !(hash01(w.seed, r.id, s, 300 + i) < TUNE.prospectChance)) return;
      const found = Math.min(left, Math.max(10, round10(def.veins[dep] * TUNE.prospectFind)));
      r.deposits[dep] += found;
      r.land.ore = DEPOSITS.reduce((a, d) => a + r.deposits[d], 0);
      const crown = w.kingdoms.find((k) => k.id === r.kingdomId)?.governmentId ?? null;
      logEvent(w, crown, `${r.name} ${VEIN_NAMES[dep]} +${found}`, { kind: 'info', regionId: r.id, en: `${regionNameEn(r.id)} ${VEIN_NAMES_EN[dep]} +${found}` });
    });
  }
}

// ---------------------------------------------------------------- 기술

export function knowsTech(c: Company, techId: string | undefined): boolean {
  return !techId || c.research.known.includes(techId);
}

export function availableMethods(c: Company, typeId: string): MethodDef[] {
  return BUILDING_BY_ID[typeId].methods.filter((m) => knowsTech(c, m.tech));
}

export function canBuildType(c: Company, t: BuildingTypeDef): boolean {
  return !t.auto && (!t.stateOnly || c.state) && t.methods.some((m) => knowsTech(c, m.tech));
}

export function researchableTechs(c: Company): string[] {
  return Object.values(TECH_BY_ID)
    .filter((t) => !c.research.known.includes(t.id) && t.requires.every((r) => c.research.known.includes(r)))
    .map((t) => t.id);
}

// ---------------------------------------------------------------- 건물

/** 건축사무소가 TUNE.officeIdleDays 일을 넘게 쉬어 인부를 해산한 상태 (그 전에는 쉬어도 일자리와 임금이 그대로다) */
export function disbanded(b: Building): boolean {
  return b.idle && (b.idleDays ?? 0) > TUNE.officeIdleDays;
}

export function slots(b: Building, skill: Skill): number {
  if (!b.active || disbanded(b)) return 0;
  return (getMethod(b.typeId, b.methodId).workers[skill] ?? 0) * b.level * b.utilization;
}

/** 정부 건물: 행정청, 건축사무소, 학교 (왕국 운영에 쓰는 건물). 왕실 것은 늘 다 가동하고 국고가 운영비를 낸다 */
export function isGovernment(typeId: string): boolean {
  const t = BUILDING_BY_ID[typeId];
  return !!t.stateOnly || t.methods.some((m) => m.construction);
}

/** 왕실이 지어도 민간이 지분을 살 수 있는 건물: 정부 건물을 뺀 모두 */
export function sellsShares(typeId: string): boolean {
  return !BUILDING_BY_ID[typeId].auto && !isGovernment(typeId);
}

/** 소작지인가 (자동 건물 중 소유 건물이 아닌 것) */
export function isSubsistence(typeId: string): boolean {
  const t = BUILDING_BY_ID[typeId];
  return !!t.auto && !t.ownership;
}

/** 소작지의 소작농 자리 (노동 인구) */
export function peasantSlots(b: Building): number {
  return isSubsistence(b.typeId) ? b.level * SUBSISTENCE.workersPerCell : 0;
}

/**
 * 이 건물을 소유하는 지역의 소유 건물: 농지·산림·광산 건물은 저택, 공장 부지 건물(과 땅을 쓰지 않는 건물)은 금융가.
 * 국영 건물은 소유 건물이 없다. share 면 국영 건물의 민간 지분 몫이 갈 곳을 찾는다 (배당·철거 대금)
 */
export function ownerBuildingOf(w: World, b: Building, share = false): Building | undefined {
  const t = BUILDING_BY_ID[b.typeId];
  if (t.auto || (b.stateOwned && !share)) return undefined;
  const typeId = !t.land || t.land === 'plot' ? 'finance' : 'manor';
  return w.buildings.find((x) => x.regionId === b.regionId && x.typeId === typeId);
}

/** 소유 건물(저택·금융가)이 가진 것: 'full' 민간 건물(배당 전부), 'share' 국영 건물의 민간 지분, 'rent' 소작지(지대, 저택만) */
export interface Holding { building: Building; kind: 'full' | 'share' | 'rent'; share: number }
export function holdingsOf(w: World, owner: Building): Holding[] {
  const out: Holding[] = [];
  for (const b of w.buildings) {
    if (b.regionId !== owner.regionId || b === owner) continue;
    if (isSubsistence(b.typeId)) { if (owner.typeId === 'manor') out.push({ building: b, kind: 'rent', share: 1 }); continue; }
    if (b.stateOwned && !b.privateShare) continue;
    if (ownerBuildingOf(w, b, true) !== owner) continue;
    out.push(b.stateOwned ? { building: b, kind: 'share', share: b.privateShare! } : { building: b, kind: 'full', share: 1 });
  }
  return out;
}

/** 이 자리는 임금 대신 배당을 받는가: 민간 건물의 소유 직종 자리 (국영 건물은 국가가 주인이라 모두 임금) */
export function paysDividend(stateOwned: boolean | undefined, s: Skill): boolean {
  return !stateOwned && (OWNERS as Skill[]).includes(s);
}

/** 건물 b 의 직종 s 자리는 임금 대신 몫(배당·지대)을 받는가: 소유 건물(저택·금융가)의 모든 자리 + paysDividend */
export function paysShare(b: Building, s: Skill): boolean {
  return !!BUILDING_BY_ID[b.typeId].ownership || paysDividend(b.stateOwned, s);
}

/** 소유 건물에서 직종 1명이 받는 몫: 소유 직종 1, 하급 귀족 TUNE.gentryShare */
export function shareWeight(s: PopClass): number {
  return s === 'gentry' ? TUNE.gentryShare : 1;
}

/** 소유 건물에서 직종 s 한 사람이 받는 하루 몫 추정: 이익 이동평균 × 1명 몫 ÷ 앉은 사람의 몫 합 (s 는 적어도 1명으로 센다) */
export function shareWage(b: Building, s: Skill): number {
  let total = 0;
  for (const k of SKILLS) total += shareWeight(k) * (k === s ? Math.max(1, b.employed[k]) : b.employed[k]);
  return (Math.max(0, b.profitEma) * shareWeight(s)) / total;
}

export function emptyJobs(): Record<Skill, number> {
  return { unskilled: 0, farmer: 0, skilled: 0, expert: 0, gentry: 0, capitalist: 0, aristocrat: 0 };
}

export interface EfficiencyParts {
  experience: number;
  scale: number;
  perk: number;
  crew: number;
  total: number;
}

export function efficiencyParts(b: Building): EfficiencyParts {
  const experience = 0.4 + 0.6 * expOf(b);
  const scale = scaleBonus(b.level);
  const perk = 1 + regionPerk(b.regionId, b.typeId);
  return { experience, scale, perk, crew: crewOf(b), total: experience * scale * perk };
}

export function efficiency(b: Building): number {
  return efficiencyParts(b).total;
}

/** 임금 기준 가중 평균 충원율 0..1 */
export function staffing(b: Building): number {
  let need = 0, have = 0;
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

/** 레벨 1 하루 인건비. 민간 건물의 소유 직종 자리는 배당을 받으므로 빼고 센다 */
export function wageCostOf(method: MethodDef, wages: Record<Skill, number>, stateOwned = true): number {
  let v = 0;
  for (const s of SKILLS) if (!paysDividend(stateOwned, s)) v += (method.workers[s] ?? 0) * wages[s];
  return v;
}

/**
 * 징수율: 행정청이 감당하는 인구 / 왕국 인구 = x 일 때 x / (1 + x) (TUNE.taxCurve = 'hyp'). 한도가 인구와 같으면 50%, 2배면 67%, 3배면 75%.
 * 'exp' 곡선이면 1 − e^(−x) (63%, 86%, 95%). 100%에는 닿지 않고, 행정청을 늘릴수록 더 걷히는 몫이 줄어든다
 */
export function collectionRatio(capacity: number, people: number): number {
  if (people <= 0) return 1;
  const x = Math.max(0, capacity) / people;
  return TUNE.taxCurve === 'hyp' ? x / (1 + x) : 1 - Math.exp(-x);
}

/** 지역 시장의 현재 가격과 주어진 임금으로 본 레벨 1 만원 가동 하루 손익 */
export function estimateMethod(w: World, regionId: number, typeId: string, methodId: string, wages: Record<Skill, number>, stateOwned = true): MethodEstimate {
  const method = getMethod(typeId, methodId);
  const mk = regionById(w, regionId).market;
  let revenue = 0;
  // 행정청: 감당하는 인구만큼의 세금. 한도가 인구보다 크면 남는 한도는 놀고 있다
  if (method.taxCapacity) {
    const k = w.kingdoms.find((x) => x.id === regionById(w, regionId).kingdomId);
    // 이 1레벨이 없을 때보다 더 걷히는 세금 (징수율 곡선의 마지막 한 칸)
    if (k) {
      const cap = k.taxCapacity ?? 0, n = k.taxDue ?? 0;
      revenue += (k.taxOwed ?? 0) * (collectionRatio(cap, n) - collectionRatio(cap - method.taxCapacity * TUNE.adminScale, n));
    }
  }
  let inputCost = 0;
  for (const g of GOOD_IDS) {
    revenue += (method.outputs[g] ?? 0) * (1 + regionPerk(regionId, typeId)) * mk[g].price * sellThrough(mk[g]);
    inputCost += (method.inputs[g] ?? 0) * mk[g].price;
  }
  const wageCost = wageCostOf(method, wages, stateOwned);
  const cost = inputCost + wageCost;
  const profit = revenue - cost;
  return { revenue, inputCost, wageCost, profit, margin: cost > 0 ? profit / cost : 0 };
}

/** 내놓은 물건 중 팔리는 비율의 추정 (평균 수요 / 평균 공급) */
export function sellThrough(mg: { demandEma: number; supplyEma: number }): number {
  return mg.supplyEma > 1e-6 ? clamp(mg.demandEma / mg.supplyEma, 0, 1) : 1;
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

/** 가격 공식 (빅토리아3): 기본가 × (1 + 0.75 × clamp((구매 − 판매) / min(구매, 판매), ±1)) */
export function priceFormula(g: GoodId, demand: number, supply: number): number {
  const base = GOODS[g].basePrice;
  const lo = Math.min(demand, supply);
  const x = lo > 1e-6 ? clamp((demand - supply) / lo, -1, 1) : demand > supply ? 1 : supply > demand ? -1 : 0;
  return base * (1 + 0.75 * x);
}

export interface ConstructionEstimate {
  pointsPerDay: number;
  costPerDay: number;
  days: number;
  cost: number;
  required: number;
}

/** 회사의 건축사무소로 이 건물 1레벨을 지을 때 걸리는 날과 비용 추정 */
/** 이 회사의 공사를 맡는 건축사무소 주인: 왕실은 자기, 민간은 그 왕국 왕실 (빅토리아3: 국가 건설 부문을 나눠 쓴다) */
export function builderOf(w: World, c: Company): Company {
  if (c.state) return c;
  const k = w.kingdoms.find((x) => x.id === c.kingdomId);
  return (k && companyById(w, k.governmentId)) ?? c;
}

/** withEstimateCache 안에서는 사무소 합계를 사무소마다 한 번만 센다 (그동안 건물이 안 바뀌는 구간에서만 쓴다) */
let officeCache: Map<number, { pointsPerDay: number; costPerDay: number }> | null = null;
export function withEstimateCache<T>(fn: () => T): T {
  officeCache = new Map();
  try { return fn(); } finally { officeCache = null; }
}

function officeTotals(w: World, builder: Company) {
  const hit = officeCache?.get(builder.id);
  if (hit) return hit;
  let pointsPerDay = 0, costPerDay = 0;
  for (const b of w.buildings) {
    if (b.companyId !== builder.id || !b.active) continue;
    const m = getMethod(b.typeId, b.methodId);
    if (!m.construction) continue;
    const st = b.idle ? 1 : Math.max(0.3, b.last.staffing);
    pointsPerDay += m.construction * b.level * b.utilization * st * efficiency(b);
    const e = estimateMethod(w, b.regionId, b.typeId, b.methodId, builder.wages);
    costPerDay += (e.wageCost + e.inputCost) * b.level * b.utilization * st;
  }
  const t = { pointsPerDay, costPerDay };
  officeCache?.set(builder.id, t);
  return t;
}

export function constructionEstimate(w: World, c: Company, typeId: string): ConstructionEstimate {
  const required = BUILDING_BY_ID[typeId].buildPoints;
  const { pointsPerDay, costPerDay } = officeTotals(w, builderOf(w, c));
  // 한 공사는 레벨당 하루 MAX_POINTS_PER_LEVEL_DAY 까지만 받는다. 비용은 쓴 포인트만큼이다
  const days = pointsPerDay > 0 ? required / Math.min(pointsPerDay, MAX_POINTS_PER_LEVEL_DAY) : Infinity;
  return { pointsPerDay, costPerDay, days, cost: pointsPerDay > 0 ? (required * costPerDay) / pointsPerDay : Infinity, required };
}

export function hasBuilder(w: World, c: Company): boolean {
  const builder = builderOf(w, c);
  return w.buildings.some((b) => b.companyId === builder.id && !!getMethod(b.typeId, b.methodId).construction);
}

// ---------------------------------------------------------------- 임금·고용

/** 시장임금: 고용 가중 평균 임금 (자기 회사 제외). 고용이 없으면 기본 임금 */
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

/** 지역의 이 직종 실업률 (노동 인구 기준) */
export function regionUnemployment(w: World, regionId: number, prof: PopClass): number {
  let all = 0, idle = 0;
  for (const p of w.pops) {
    if (p.regionId !== regionId || p.prof !== prof) continue;
    all += p.size;
    if (p.work === 0) idle += p.size;
  }
  return all > 0 ? idle / all : 0;
}

export function unemploymentRate(w: World, prof: PopClass): number {
  let all = 0, idle = 0;
  for (const p of w.pops) {
    if (p.prof !== prof) continue;
    all += p.size;
    if (p.work === 0) idle += p.size;
  }
  return all > 0 ? idle / all : 0;
}

export function colonyPopulation(w: World, prof: PopClass): number {
  let n = 0;
  for (const p of w.pops) if (p.prof === prof) n += p.size;
  return n;
}

/** 대륙 전체 직종 생활수준 (인구 가중 평균) */
/** 생활수준 (빅토리아3): 부를 바탕으로, 필요를 못 채운 만큼 깎인다 */
export function popSol(p: Pop): number {
  return Math.max(WEALTH_MIN, wealthOf(p) * p.fulfillment);
}

export function colonySol(w: World, prof: PopClass): number {
  let v = 0, n = 0;
  for (const p of w.pops) if (p.prof === prof) { v += popSol(p) * p.size; n += p.size; }
  return n > 0 ? v / n : 0;
}

// ---------------------------------------------------------------- 돈

/**
 * 주인 없는 돈(fund)을 뺀 돈 계정 전부를 정해진 순서로 f 에 넘기고 돌려받은 값으로 바꾼다.
 * 화폐 총량(totalMoney)과 센트 맞춤(round.ts roundWorld)이 이 목록 하나를 쓴다: 돈을 가진 계정을 새로 두면 여기에만 넣는다
 */
export function mapMoney(w: World, f: (x: number) => number): void {
  w.bank.cash = f(w.bank.cash);
  w.traders.cash = f(w.traders.cash);
  for (const c of w.companies) c.cash = f(c.cash);
  for (const p of w.pops) p.savings = f(p.savings);
  for (const k of w.kingdoms) k.investmentPool = f(k.investmentPool);
}

export function totalMoney(w: World): number {
  let t = w.fund;
  mapMoney(w, (x) => { t += x; return x; });
  return t;
}

/** 국가가 지금까지 새로 만든 돈 (주조 + 국채 발행 − 상환 − 이자 − 상한 소멸) */
export function netMinted(w: World): number {
  const m = w.mint;
  return m.minted + m.issued - m.retired - m.interest;
}

/** 대륙 안의 화폐 + 해외 계정 − 국가가 만든 돈 = 항상 일정해야 한다 (검증용) */
export function moneyIdentity(w: World): number {
  return totalMoney(w) - netMinted(w);
}

/** 왕국의 연간 총생산: 그 왕국 pop 의 소득 합 × 1년 */
export function kingdomGdp(w: World, kingdomId: number): number {
  let daily = 0;
  for (const p of w.pops) if (regionById(w, p.regionId).kingdomId === kingdomId) daily += p.incomeEma;
  return daily * 360;
}

export function bookValue(b: Building): number {
  return BUILDING_BY_ID[b.typeId].buildPoints * POINT_VALUE * b.level;
}

/** 신용 한도: 보유 건물 장부가의 절반 + 기본 한도. 왕국 정부는 국채 한도(연간 총생산 비례) */
export const BASE_CREDIT = 300_000;
/** 국채 한도 = 연간 총생산 × 이 비율 */
export const STATE_CREDIT_GDP = 0.25;
export function creditLimit(w: World, c: Company): number {
  if (c.state) return BASE_CREDIT + kingdomGdp(w, c.kingdomId) * STATE_CREDIT_GDP;
  let book = 0;
  for (const b of w.buildings) if (b.companyId === c.id) book += bookValue(b);
  return BASE_CREDIT + book * 0.5;
}

export function borrow(w: World, c: Company, amount: number): number {
  const room = Math.max(0, creditLimit(w, c) - c.debt);
  // 왕국 정부는 은행이 아니라 국채를 찍어 빌린다 (새 돈)
  const take = Math.max(0, Math.min(amount, room, c.state ? Infinity : w.bank.cash));
  if (take <= 0) return 0;
  if (c.state) w.mint.issued += take; else w.bank.cash -= take;
  c.cash += take;
  c.debt += take;
  return take;
}

export function repay(w: World, c: Company, amount: number): number {
  const pay = Math.max(0, Math.min(amount, c.debt, c.cash));
  c.cash -= pay;
  c.debt -= pay;
  if (c.state) w.mint.retired += pay; else w.bank.cash += pay;
  return pay;
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

export function newBuilding(id: number, typeId: string, regionId: number, companyId: number, methodId: string, level: number, stateOwned = false): Building {
  return {
    id, typeId, regionId, companyId, level, methodId, stateOwned, active: true, utilization: 1, lastSwitchTick: -1e9, exp100: 0, crew100: 0, crew: 0, idle: false,
    employed: emptyJobs(), stock: {}, outStock: {}, unpaid: false,
    last: emptyStats(), profitEma: 0, lossWeeks: 0, pausedWeeks: 0,
  };
}

export function emptyStats() {
  return { revenue: 0, inputCost: 0, wageCost: 0, staffing: 0, inputFill: 1, output: {} as GoodBag, points: 0 };
}

const EVENT_CAP = 300;

export function logEvent(
  w: World, companyId: number | null, text: string,
  opts: { kind?: EventKind; regionId?: number; buildingId?: number; en?: string } = {},
) {
  w.events.push({ tick: w.tick, companyId, text, ...(opts.en ? { textEn: opts.en } : {}), kind: opts.kind ?? 'info', regionId: opts.regionId, buildingId: opts.buildingId });
  if (w.events.length > EVENT_CAP) w.events.splice(0, w.events.length - EVENT_CAP);
}

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
