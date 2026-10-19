import { BUILDING_BY_ID, GOOD_IDS, GOODS, REGIONS, SKILL_DEFS, SUBSISTENCE, TICKS_PER_WEEK, TIER_COUNTS, TIER_JITTER, TIERS, TUNE, WORKFORCE_RATIO, getMethod } from './data';
import { collectionRatio, emptyJobs, isGovernment, newBuilding, paysDividend, slots, wageCostOf } from './economy';
import { aggregateHouseholds, findPop, getPop, movePeople, workforce } from './pops';
import { updateOwnership, updateSubsistence } from './production';
import { subsistenceWage, syncEmployment } from './labor';
import { affordableWealth } from './market';
import { applyStateWages, taxCapacity, updateWageIndex } from './finance';
import { round2 } from './rng';
import { roundWorld } from './round';
import type { Company, GoodId, Kingdom, MarketGood, PopClass, Region, Skill, World } from './types';
import { SKILLS, emptyLedger } from './types';

/** 민간 상회의 시작 자금 (농장 약 다섯 레벨 공사비). 왕실 국고는 startTreasury 가 정한다 */
export const START_CASH = 30_000_000;
const BANK_CAPITAL = 300_000_000;
const TRADER_CAPITAL = 100_000_000;
/** 시작 정책 단계: 세금 수준, 국영 임금 수준, 연구비 수준 모두 보통(3) */
const DEFAULT_BUDGET = { tax: 3, wages: 3, research: 3 };
/** 플레이어 회사 id (화면이 이 값을 쓴다) */
export const PLAYER_ID = 100;

const KINGDOMS = [
  { id: 1, name: '에스테라', nameEn: 'Estera', color: '#e11d48', gov: { id: PLAYER_ID, name: '에스테라 왕실' }, firm: { id: 3, name: '에스테라 민간', color: '#f59e0b' } },
  { id: 2, name: '벨로니아', nameEn: 'Belonia', color: '#3b82f6', gov: { id: 1, name: '벨로니아 왕실' }, firm: { id: 4, name: '벨로니아 민간', color: '#60a5fa' } },
  { id: 3, name: '카르텐', nameEn: 'Karten', color: '#10b981', gov: { id: 2, name: '카르텐 왕실' }, firm: { id: 5, name: '카르텐 민간', color: '#34d399' } },
];

/** 1인당 시작 저축 (부양가족 포함 1인 기준) */
const START_SAVINGS: Record<PopClass, number> = { peasant: 5, unskilled: 20, skilled: 100, expert: 300, gentry: 200, capitalist: 500, aristocrat: 500 };
/** 처음부터 아는 기술: 손베틀·손가구·목공구 등 수공업 방식 */
const START_TECHS = ['spinning', 'guilds'];
/** 왕실이 갖고 시작하는 건축사무소 레벨 (목조 4 × 10레벨 = 하루 약 40포인트. 공사 하나는 레벨당 하루 10포인트까지라 농장 1레벨은 약 60일) */
const START_OFFICE_LEVELS = 10;
/** 상층의 시작 문해력 */
const UPPER_LITERACY = 0.6;

export interface CreateWorldOptions {
  withPlayer?: boolean;
  playerName?: string;
  /** 플레이어 왕실의 시작 국고 (없으면 다른 왕실과 같은 규칙, startTreasury) */
  playerCash?: number;
  ai?: boolean;
}

/** 시드 RNG (월드가 생기기 전에 쓰는 것) */
function seeded(seed: number) {
  let s = seed | 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 지역을 왕국 수만큼 무작위로 나눈다. 조건: 각 왕국은 2지역 이상이고 자기 지역끼리 이웃으로 이어진다.
 * 무작위 씨앗 지역에서 번갈아 이웃으로 넓혀 가고, 조건을 못 맞추면 다시 뽑는다.
 */
export function splitKingdoms(seed: number, count = KINGDOMS.length): Record<number, number> {
  const rnd = seeded(seed * 7919 + 17);
  const ids = REGIONS.map((r) => r.id);
  const nb = new Map(REGIONS.map((r) => [r.id, r.neighbors]));
  for (let attempt = 0; attempt < 200; attempt++) {
    const owner: Record<number, number> = {};
    const pool = [...ids];
    for (let k = 1; k <= count; k++) owner[pool.splice(Math.floor(rnd() * pool.length), 1)[0]] = k;
    let progress = true;
    while (Object.keys(owner).length < ids.length && progress) {
      progress = false;
      for (let k = 1; k <= count; k++) {
        const frontier = ids.filter((id) => owner[id] === undefined && Object.entries(owner).some(([r, o]) => o === k && nb.get(Number(r))!.includes(id)));
        if (!frontier.length) continue;
        owner[frontier[Math.floor(rnd() * frontier.length)]] = k;
        progress = true;
      }
    }
    if (Object.keys(owner).length < ids.length) continue;
    const sizes = Array.from({ length: count }, (_, i) => ids.filter((id) => owner[id] === i + 1).length);
    if (sizes.every((n) => n >= 2)) return owner;
  }
  throw new Error('kingdom split failed');
}

function newCompany(id: number, name: string, color: string, kingdomId: number, state: boolean, isPlayer: boolean, cash: number): Company {
  const wages = Object.fromEntries(SKILLS.map((s) => [s, SKILL_DEFS[s].baseWage * (isPlayer ? 1 : 0.8)])) as Record<Skill, number>;
  return {
    id, name, color, isPlayer, kingdomId, state, cash, wages,
    // 왕실 임금은 정책(국영 임금 수준)이 정한다. 시장임금 정책은 민간 플레이어만 쓴다
    wageOffset: isPlayer && !state ? emptyJobs() : null,
    weekProfit: 0, lastWeekProfit: 0, weekStartCash: cash, debt: 0, revenueEma: 0, ledger: emptyLedger(), lastLedger: emptyLedger(),
    distressWeeks: 0, buildPoints: 0, buildCost: 0,
    research: { budget: 0, current: null, progress: {}, known: [...START_TECHS] },
  };
}

function newMarket(): Record<GoodId, MarketGood> {
  const market = {} as Record<GoodId, MarketGood>;
  for (const g of GOOD_IDS) {
    market[g] = {
      price: GOODS[g].basePrice, inventory: 0, demand: 0, supply: 0, demandEma: 0, supplyEma: 0,
      sold: 0, volumeEma: 0, shippedIn: 0, shippedOut: 0, demandBy: {}, supplyBy: {}, demandByEma: {}, supplyByEma: {},
    };
  }
  return market;
}

/** 시드로 정한 지역 시작값: 티어, 인구(계층별), 교육, 경작지·부지 칸, 시작 농장 레벨 */
interface RegionStart { tier: number; population: Record<PopClass, number>; education: number; arable: number; plot: number; farms: number }

/**
 * 지역 티어를 시드로 배정하고(TIER_COUNTS, 각 왕국에 티어 2 이상 하나 이상), 티어 수치에 ±TIER_JITTER 를 준다.
 * 경작지 = 소작농 노동 인구 ÷ 소작지 1칸 인원 × arableSlack + 시작 농장 칸
 */
export function regionStarts(seed: number, owner: Record<number, number>): Map<number, RegionStart> {
  const rnd = seeded(seed * 104729 + 3);
  const ids = REGIONS.map((r) => r.id);
  let tierOf: Record<number, number> = {};
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = [...ids];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    tierOf = {};
    let i = 0;
    TIER_COUNTS.forEach((n, t) => { for (let j = 0; j < n; j++) tierOf[order[i++]] = t; });
    const ok = KINGDOMS.every((k) => ids.some((id) => owner[id] === k.id && tierOf[id] <= 1));
    if (ok) break;
  }
  const jit = () => 1 + (rnd() * 2 - 1) * TIER_JITTER;
  const out = new Map<number, RegionStart>();
  for (const id of ids) {
    const t = TIERS[tierOf[id]];
    const total = Math.round((t.pop[0] + rnd() * (t.pop[1] - t.pop[0])) / 1000) * 1000;
    const aristocrat = Math.round(total * t.aristocrat * jit()), skilled = Math.round(total * t.skilled * jit()), expert = Math.round(total * t.expert * jit());
    const gentry = Math.round(total * t.gentry);
    const peasant = total - aristocrat - gentry - skilled - expert;
    const farms = Math.round((total / 100_000) * t.farms * jit());
    const arable = Math.ceil(((peasant + skilled + expert) * WORKFORCE_RATIO / SUBSISTENCE.workersPerCell) * t.arableSlack * jit()) + farms;
    out.set(id, {
      tier: tierOf[id] + 1,
      population: { peasant, unskilled: 0, skilled, expert, gentry, capitalist: 0, aristocrat },
      education: Math.round(t.education * jit() * 100) / 100, arable, plot: Math.ceil((total / 100_000) * t.plot * jit()), farms,
    });
  }
  return out;
}

export function createWorld(seed = 1, opts: CreateWorldOptions = {}): World {
  const { withPlayer = true, playerName, playerCash, ai = true } = opts;
  const owner = splitKingdoms(seed);
  const starts = regionStarts(seed, owner);

  const regions: Region[] = REGIONS.map((def) => {
    const st = starts.get(def.id)!;
    return {
      id: def.id, name: def.name, description: def.description, spaceport: def.spaceport, neighbors: [...def.neighbors],
      kingdomId: owner[def.id], tier: st.tier,
      land: { arable: st.arable, forest: def.forest, plot: st.plot, ore: def.deposits.iron + def.deposits.coal }, deposits: { ...def.deposits },
      education100: Math.round(st.education * 100), households: {} as Region['households'], market: newMarket(),
    };
  });

  const kingdoms: Kingdom[] = KINGDOMS.map((k) => ({
    id: k.id, name: k.name, nameEn: k.nameEn, color: k.color, governmentId: k.gov.id, privateIds: [k.firm.id], tariff: {}, investmentPool: 0, taxLaw: TUNE.taxLaw, budget: { ...DEFAULT_BUDGET }, revenueWeek: 0,
  }));
  const companies: Company[] = [];
  for (const k of KINGDOMS) {
    const player = withPlayer && k.gov.id === PLAYER_ID;
    companies.push(newCompany(k.gov.id, player && playerName ? playerName : k.gov.name, k.color, k.id, true, player, 0));
    companies.push(newCompany(k.firm.id, k.firm.name, k.firm.color, k.id, false, false, START_CASH));
  }

  const w: World = {
    version: 5, config: { ai }, tick: 0, seed, rngState: seed | 0, nextId: 1000,
    regions, kingdoms, pops: [], fund: 0, metrics: [],
    bank: { cash: BANK_CAPITAL, capital: BANK_CAPITAL },
    traders: { cash: TRADER_CAPITAL, capital: TRADER_CAPITAL, shipments: [] },
    mint: { minted: 0, issued: 0, retired: 0, interest: 0 },
    companies, buildings: [], constructions: [], salvage: [],
    history: [], events: [{ tick: 0, companyId: null, text: '대륙의 시장이 열렸습니다.', textEn: 'The markets of the continent are open.', kind: 'info' }], alertState: {},
  };

  // 왕실은 자기 왕국에서 공장 부지가 가장 넓은 지역에 건축사무소를 갖고 시작한다 (민간 공사도 이곳이 맡는다).
  // 행정청은 왕국 인구를 다 감당하는 레벨로 시작한다
  for (const c of companies.filter((x) => x.state)) {
    const mine = regions.filter((r) => r.kingdomId === c.kingdomId);
    const home = [...mine].sort((a, b) => b.land.plot - a.land.plot || a.id - b.id)[0];
    w.buildings.push(newBuilding(w.nextId++, 'builder', home.id, c.id, 'build_manual', START_OFFICE_LEVELS, c.state));
    const people = mine.reduce((a, r) => a + Object.values(starts.get(r.id)!.population).reduce((x, y) => x + y, 0), 0);
    const admin = getMethod('admin', 'admin_hereditary');
    w.buildings.push(newBuilding(w.nextId++, 'admin', home.id, c.id, admin.id, Math.max(1, Math.ceil((people * TUNE.adminStart) / (admin.taxCapacity! * TUNE.adminScale))), true));
  }
  // 티어에 따른 시작 민간 곡물 농장 (일꾼은 첫날부터 소작농에서 뽑는다)
  for (const r of regions) {
    const firm = companies.find((c) => !c.state && c.kingdomId === r.kingdomId);
    const levels = Math.min(starts.get(r.id)!.farms, r.land.arable);
    if (firm && levels > 0) w.buildings.push(newBuilding(w.nextId++, 'farm', r.id, firm.id, 'farm_basic', levels, false));
  }
  updateSubsistence(w);

  // 시작 pop: 하층은 전부 소작농. 숙련 인력은 소작지에 있으면서 자격만 갖고 있다. 상층은 아직 자리가 없다
  for (const d of REGIONS) {
    const r = regions.find((x) => x.id === d.id)!;
    const def = starts.get(d.id)!;
    const subs = w.buildings.find((b) => b.regionId === r.id && b.typeId === 'subsistence')!;
    const peasants = def.population.peasant + def.population.skilled + def.population.expert + def.population.unskilled;
    const room = (subs.level * SUBSISTENCE.workersPerCell) / WORKFORCE_RATIO;
    const savings = def.population.peasant * START_SAVINGS.peasant + def.population.skilled * START_SAVINGS.skilled + def.population.expert * START_SAVINGS.expert;
    const placed = Math.min(peasants, room);
    const parts: [number, number][] = [[subs.id, placed], [0, peasants - placed]];
    for (const [work, size] of parts) {
      if (size <= 0) continue;
      const p = getPop(w, r.id, 'peasant', work);
      const share = size / peasants;
      p.size = size; p.savings = savings * share; p.literacy100 = r.education100;
      p.quals = { skilled: def.population.skilled * WORKFORCE_RATIO * share, expert: def.population.expert * WORKFORCE_RATIO * share };
    }
    for (const cls of ['gentry', 'capitalist', 'aristocrat'] as const) {
      const size = def.population[cls];
      if (size <= 0) continue;
      const p = getPop(w, r.id, cls, 0);
      p.size = size; p.savings = size * START_SAVINGS[cls]; p.literacy100 = UPPER_LITERACY * 100;
    }
  }
  // 귀족은 저택, 자본가는 금융가에서 일하며 시작한다
  updateOwnership(w);
  for (const o of w.buildings.filter((x) => BUILDING_BY_ID[x.typeId].ownership)) {
    const free = getPop(w, o.regionId, BUILDING_BY_ID[o.typeId].ownership!, 0);
    if (free.size > 0) movePeople(w, free, getPop(w, o.regionId, free.prof, o.id), workforce(free));
  }
  // 시작 건물(건축사무소·행정청·농장)은 이미 돌던 건물이라 일꾼이 찬 채로 시작한다: 그 지역 소작농에서 데려온다 (위 직종은 자격자만)
  for (const b of w.buildings.filter((x) => !BUILDING_BY_ID[x.typeId].auto)) {
    const subs = w.buildings.find((x) => x.regionId === b.regionId && x.typeId === 'subsistence');
    const src = subs && findPop(w, b.regionId, 'peasant', subs.id);
    if (!src) continue;
    for (const s of SKILLS) {
      const n = slots(b, s);
      if (n <= 0 || paysDividend(b.stateOwned, s)) continue;
      // 그 직종 실업자가 있으면 먼저 데려온다
      const own = findPop(w, b.regionId, s, 0);
      const fromOwn = own ? Math.min(n, workforce(own)) : 0;
      if (own && fromOwn > 0) movePeople(w, own, getPop(w, b.regionId, s, b.id), fromOwn);
      if (n - fromOwn > 0) movePeople(w, src, getPop(w, b.regionId, s, b.id), n - fromOwn, s === 'unskilled' ? undefined : s);
    }
    b.exp = 1;
  }
  syncEmployment(w);
  // 시작 징수율: 매일 징수(finance.ts collectIncomeTax)와 같은 규칙. 행정청은 아직 사람이 없어 한도가 0이라 0이다
  for (const k of kingdoms) {
    let people = 0;
    for (const p of w.pops) if (regions.find((r) => r.id === p.regionId)?.kingdomId === k.id) people += p.size;
    k.taxRatio = round2(collectionRatio(taxCapacity(w, k.id), people));
  }
  // 시작 부: 하루 소득으로 감당할 수 있는 단계 (모든 pop 같은 규칙, 부 이동(updateWealth)과 같은 소득). 처음에는 아무도 현금 소득이 없다.
  // 소작농의 소득은 지대·토지세를 내고 남은 수확의 시장가다 (직접 쓰는 현물 + 파는 남는 것, subsistenceWage)
  for (const r of regions) {
    const subs = w.buildings.find((x) => x.regionId === r.id && x.typeId === 'subsistence');
    const tenants = subs ? findPop(w, r.id, 'peasant', subs.id) : undefined;
    for (const p of w.pops.filter((x) => x.regionId === r.id)) {
      p.wealth100 = 100 * affordableWealth(r, p.size, p === tenants ? subsistenceWage(w, r) * workforce(p) : p.incomeEma);
    }
  }
  // 국영 임금: 시작 민간 임금에서 임금 지수를 잡고 그 임금으로 시작한다. 그다음 그 임금으로 왕실 시작 국고를 정한다
  for (const k of kingdoms) {
    updateWageIndex(w, k);
    applyStateWages(w, k);
    const gov = companies.find((c) => c.id === k.governmentId)!;
    gov.cash = gov.weekStartCash = gov.isPlayer && playerCash != null ? playerCash : startTreasury(w, gov);
  }
  aggregateHouseholds(w);
  // 저장값은 소수 둘째 자리까지 (round.ts): 시작 저축의 센트 아래는 주인 없는 돈으로
  roundWorld(w);
  return w;
}

/**
 * 왕실 시작 국고 = 시작 정부 건물(행정청·건축사무소)을 다 돌리는 주간 운영비 × TUNE.startTreasuryWeeks.
 * 운영비는 시작 국영 임금과 기본가 원료로 센다 (연구비는 경제 규모가 잡히기 전이라 넣지 않는다)
 */
function startTreasury(w: World, gov: Company): number {
  let daily = 0;
  for (const b of w.buildings) {
    if (b.companyId !== gov.id || !isGovernment(b.typeId)) continue;
    const m = getMethod(b.typeId, b.methodId);
    let inputs = 0;
    for (const g of GOOD_IDS) inputs += (m.inputs[g] ?? 0) * GOODS[g].basePrice;
    daily += (wageCostOf(m, gov.wages, true) + inputs) * b.level;
  }
  return round2(daily * TICKS_PER_WEEK * TUNE.startTreasuryWeeks);
}
