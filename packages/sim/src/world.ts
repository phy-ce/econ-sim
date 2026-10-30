import { BUILDING_BY_ID, GOOD_IDS, GOODS, REGIONS, SKILL_DEFS, SUBSISTENCE, TICKS_PER_WEEK, TIER_COUNTS, TIER_JITTER, TIERS, TRADING_POST, TUNE, WORKFORCE_RATIO, getMethod, tradeReserveOf } from './data';
import { collectionRatio, emptyJobs, knownVeins, isGovernment, newBuilding, paysDividend, slots, wageCostOf } from './economy';
import { addFund, aggregateHouseholds, findPop, getPop, movePeople, workforce } from './pops';
import { updateOwnership, updateSubsistence } from './production';
import { syncEmployment } from './labor';
import { affordableTenantWealth, affordableWealth } from './market';
import { applyStateWages, taxCapacity, updateWageIndex } from './finance';
import { writePool } from './round';
import type { Company, GoodId, Kingdom, MarketGood, PopClass, Region, Skill, World } from './types';
import { SKILLS, emptyLedger, isLowerJob } from './types';

/** 민간 상회의 시작 자금 (농장 약 다섯 레벨 공사비). 왕실 국고는 startTreasury 가 정한다 */
export const START_CASH = 30_000_000;
/** 그중 민간 상회가 운영 자금으로 갖는 돈. 나머지는 왕국 저택·금융가 금고로 (지역 인구 비례, 저택과 금융가 반씩) */
export const START_FIRM_CASH = 5_000_000;
/** 왕국마다 시작 무역소 레벨 (인구가 가장 많은 지역, 민간 상회 것). 금고는 가득(레벨 × 기본 유보액) 찬 채로 시작한다 (2026-10-23 사용자 설계) */
export const START_TRADE_LEVELS = 1;
/** 시작 정책 단계: 세금 수준, 국영 임금 수준, 복지 수준 모두 보통(3) */
const DEFAULT_BUDGET = { tax: 3, wages: 3, welfare: 3 };
/** 플레이어 회사 id (화면이 이 값을 쓴다) */
export const PLAYER_ID = 100;

const KINGDOMS = [
  { id: 1, name: '에스테라', nameEn: 'Estera', color: '#e11d48', gov: { id: PLAYER_ID, name: '에스테라 왕실' }, firm: { id: 3, name: '에스테라 민간', color: '#f59e0b' } },
  { id: 2, name: '벨로니아', nameEn: 'Belonia', color: '#3b82f6', gov: { id: 1, name: '벨로니아 왕실' }, firm: { id: 4, name: '벨로니아 민간', color: '#60a5fa' } },
  { id: 3, name: '카르텐', nameEn: 'Karten', color: '#10b981', gov: { id: 2, name: '카르텐 왕실' }, firm: { id: 5, name: '카르텐 민간', color: '#34d399' } },
];

/** 1인당 시작 저축 (부양가족 포함 1인 기준) */
const START_SAVINGS: Record<PopClass, number> = { peasant: 5, unskilled: 20, farmer: 20, skilled: 100, expert: 300, gentry: 200, capitalist: 500, aristocrat: 500 };
/** 처음부터 아는 기술: 손베틀·손가구·목공구 등 수공업 방식 */
export const START_TECHS = ['spinning', 'guilds'];
/** 왕실이 갖고 시작하는 건축사무소 레벨 (목조 2 × 20레벨 = 하루 약 40포인트. 공사 하나는 레벨당 하루 10포인트까지라 농장 1레벨(200점)은 약 20일).
 *  1레벨이 일꾼 500명이 되어 1,000명 시절 10레벨과 같은 인원·포인트 */
export const START_OFFICE_LEVELS = 20;
/** 왕실마다 시작 학교 레벨 (인구가 가장 많은 지역, 귀족 가정교사) */
export const START_SCHOOL_LEVELS = 1;
/** 상층의 시작 문해력 */
const UPPER_LITERACY = 0.6;

export interface CreateWorldOptions {
  withPlayer?: boolean;
  playerName?: string;
  /** 플레이어 왕실의 시작 국고 (없으면 다른 왕실과 같은 규칙, startTreasury) */
  playerCash?: number;
  ai?: boolean;
  /** AI 난수의 소금 (config.aiSalt, rng/aiRand.ts). 기본 0. 시작 세계는 이 칸 말고는 같다 */
  aiSalt?: number;
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
    // 플레이어는 시장임금 정책(시장 임금 + 0%)으로 시작한다. 왕실도 생산 건물 임금은 이것으로 정하고, 정부 건물 임금은 국영 임금 단계가 정한다
    wageOffset: isPlayer ? emptyJobs() : null,
    weekProfit: 0, lastWeekProfit: 0, weekStartCash: cash, debt: 0, revenueEma: 0, ledger: emptyLedger(), lastLedger: emptyLedger(),
    distressWeeks: 0, buildPoints: 0, buildCost: 0,
    research: { points: 0, current: null, progress: {}, known: [...START_TECHS] },
  };
}

/** 한 지역의 새 상품 시장 (기본가, 거래 없음). 옛 저장에 없는 상품도 이것으로 채운다 (compat.ts) */
export function newMarketGood(g: GoodId): MarketGood {
  return {
    price: GOODS[g].basePrice, inventory: 0, demand: 0, supply: 0, demandEma: 0, supplyEma: 0,
    sold: 0, volumeEma: 0, shippedIn: 0, shippedOut: 0, demandBy: {}, supplyBy: {}, demandByEma: {}, supplyByEma: {},
  };
}

function newMarket(): Record<GoodId, MarketGood> {
  const market = {} as Record<GoodId, MarketGood>;
  for (const g of GOOD_IDS) market[g] = newMarketGood(g);
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
    const aristocrat = Math.round(total * t.aristocrat * TUNE.aristStart * jit()), skilled = Math.round(total * t.skilled * jit()), expert = Math.round(total * t.expert * jit());
    const gentry = Math.round(total * t.gentry);
    const peasant = total - aristocrat - gentry - skilled - expert;
    const farms = Math.round((total / 100_000) * t.farms * jit());
    const arable = Math.ceil(((peasant + skilled + expert) * WORKFORCE_RATIO / SUBSISTENCE.workersPerCell) * t.arableSlack * jit()) + farms;
    out.set(id, {
      tier: tierOf[id] + 1,
      population: { peasant, unskilled: 0, farmer: 0, skilled, expert, gentry, capitalist: 0, aristocrat },
      education: Math.round(t.education * jit() * 100) / 100, arable, plot: Math.ceil((total / 100_000) * t.plot * jit()), farms,
    });
  }
  return out;
}

export function createWorld(seed = 1, opts: CreateWorldOptions = {}): World {
  const { withPlayer = true, playerName, playerCash, ai = true, aiSalt = 0 } = opts;
  const owner = splitKingdoms(seed);
  const starts = regionStarts(seed, owner);

  const regions: Region[] = REGIONS.map((def) => {
    const st = starts.get(def.id)!;
    const deposits = knownVeins(def.veins);
    return {
      id: def.id, name: def.name, description: def.description, spaceport: def.spaceport, neighbors: [...def.neighbors],
      kingdomId: owner[def.id], tier: st.tier,
      land: { arable: st.arable, forest: def.forest, plot: st.plot, ore: deposits.iron + deposits.coal }, deposits,
      education: st.education, households: {} as Region['households'], market: newMarket(),
    };
  });

  const kingdoms: Kingdom[] = KINGDOMS.map((k) => ({
    id: k.id, name: k.name, nameEn: k.nameEn, color: k.color, governmentId: k.gov.id, privateIds: [k.firm.id], tariff: {}, investmentPool: 0, taxLaw: TUNE.taxLaw, investLaw: 'nobles', welfareLaw: 'none', budget: { ...DEFAULT_BUDGET }, revenueWeek: 0,
  }));
  const companies: Company[] = [];
  for (const k of KINGDOMS) {
    const player = withPlayer && k.gov.id === PLAYER_ID;
    companies.push(newCompany(k.gov.id, player && playerName ? playerName : k.gov.name, k.color, k.id, true, player, 0));
    companies.push(newCompany(k.firm.id, k.firm.name, k.firm.color, k.id, false, false, START_FIRM_CASH));
  }

  const w: World = {
    version: 18, config: { ai, aiSalt }, tick: 0, seed, rngState: seed | 0, nextId: 1000,
    regions, kingdoms, pops: [], fund: 0, metrics: [],
    traders: { cash: 0, capital: 0, shipments: [] },
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
    // 학교 START_SCHOOL_LEVELS 레벨 (귀족 가정교사, 기술 없이 여는 방식): 왕국에서 인구가 가장 많은 지역. 문해력이 연구 속도를 정한다
    const popOf = (r: Region) => Object.values(starts.get(r.id)!.population).reduce((x, y) => x + y, 0);
    const capital = [...mine].sort((a, b) => popOf(b) - popOf(a) || a.id - b.id)[0];
    w.buildings.push(newBuilding(w.nextId++, 'school', capital.id, c.id, 'school_tutor', START_SCHOOL_LEVELS, true));
    // 무역소 START_TRADE_LEVELS 레벨: 같은 지역(인구가 가장 많은 지역), 그 왕국 민간 상회 것. 금고는 레벨 × 기본 유보액 (새 돈이 아니라 시작 세계의 돈이다)
    const firm = companies.find((x) => !x.state && x.kingdomId === c.kingdomId);
    if (firm && START_TRADE_LEVELS > 0) {
      const post = newBuilding(w.nextId++, TRADING_POST, capital.id, firm.id, BUILDING_BY_ID[TRADING_POST].methods[0].id, START_TRADE_LEVELS, false);
      post.cash = START_TRADE_LEVELS * tradeReserveOf(post.methodId);
      w.buildings.push(post);
    }
  }
  // 티어에 따른 시작 민간 곡물 농장 (일꾼은 첫날부터 소작농에서 뽑는다)
  for (const r of regions) {
    const firm = companies.find((c) => !c.state && c.kingdomId === r.kingdomId);
    const levels = Math.min(starts.get(r.id)!.farms, r.land.arable);
    if (firm && levels > 0) w.buildings.push(newBuilding(w.nextId++, 'farm', r.id, firm.id, 'farm_basic', levels, false));
    // 시작 벌목장·섬유 농장: 인구 10만 명당 TUNE.startLumber·startFiber 레벨 (소작지는 목재·섬유를 조금만 낸다)
    const people = Object.values(starts.get(r.id)!.population).reduce((a, b) => a + b, 0) / 100_000;
    const lumber = Math.min(r.land.forest, Math.round(people * TUNE.startLumber));
    if (firm && lumber > 0) w.buildings.push(newBuilding(w.nextId++, 'lumber', r.id, firm.id, 'lumber_manual', lumber, false));
    const fiber = Math.round(people * TUNE.startFiber);
    if (firm && fiber > 0) { r.land.arable += fiber; w.buildings.push(newBuilding(w.nextId++, 'fiber_farm', r.id, firm.id, 'fiber_basic', fiber, false)); }
  }
  // 시작 목공구 공방: 왕국마다 TUNE.startWorkshop 레벨, 건축사무소가 있는 지역(공장 부지가 가장 넓은 곳)의 민간 상회. 소작지가 공구를 내지 않아 첫날 공구는 이것뿐이다
  for (const k of KINGDOMS) {
    const home = regions.filter((r) => r.kingdomId === k.id).sort((a, b) => b.land.plot - a.land.plot || a.id - b.id)[0];
    if (home && TUNE.startWorkshop > 0) w.buildings.push(newBuilding(w.nextId++, 'workshop', home.id, k.firm.id, 'tools_wood', TUNE.startWorkshop, false));
  }
  updateSubsistence(w);
  // 시작 민간 건물의 레벨은 그 지역 저택(땅 건물)이나 금융가(그 밖)의 것이다
  for (const b of w.buildings) {
    if (b.stateOwned || BUILDING_BY_ID[b.typeId].auto) continue;
    const land = BUILDING_BY_ID[b.typeId].land;
    const typeId = land === 'arable' || land === 'forest' || land === 'ore' ? 'manor' : 'finance';
    const o = w.buildings.find((x) => x.regionId === b.regionId && x.typeId === typeId)!;
    b.owners = { [o.id]: b.level };
  }
  // 시작 금고: 민간 시작 돈 중 상회 운영 자금을 뺀 나머지 (왕국마다 지역 인구 비례, 저택·금융가 반씩)
  for (const k of kingdoms) {
    const mine = regions.filter((r) => r.kingdomId === k.id);
    const people = (r: Region) => Object.values(starts.get(r.id)!.population).reduce((a, b) => a + b, 0);
    const total = mine.reduce((a, r) => a + people(r), 0);
    for (const r of mine) for (const typeId of ['manor', 'finance']) {
      const o = w.buildings.find((x) => x.regionId === r.id && x.typeId === typeId)!;
      o.cash = total > 0 ? ((START_CASH - START_FIRM_CASH) * people(r)) / total / 2 : 0;
    }
  }

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
      p.size = size; p.savings = savings * share; p.literacy = r.education;
      p.quals = { skilled: def.population.skilled * WORKFORCE_RATIO * share, expert: def.population.expert * WORKFORCE_RATIO * share };
    }
    for (const cls of ['gentry', 'capitalist', 'aristocrat'] as const) {
      const size = def.population[cls];
      if (size <= 0) continue;
      const p = getPop(w, r.id, cls, 0);
      p.size = size; p.savings = size * START_SAVINGS[cls]; p.literacy = UPPER_LITERACY;
    }
  }
  // 귀족은 저택, 자본가는 금융가에서 일하며 시작한다 (저택 상급 귀족 자리는 시작 귀족이 다 앉을 만큼에서 시작한다)
  for (const b of w.buildings) if (b.typeId === 'manor') delete b.nobleSeats;
  updateOwnership(w);
  for (const o of w.buildings.filter((x) => BUILDING_BY_ID[x.typeId].ownership)) {
    const free = getPop(w, o.regionId, BUILDING_BY_ID[o.typeId].ownership!, 0);
    if (free.size > 0) movePeople(w, free, getPop(w, o.regionId, free.prof, o.id), Math.min(workforce(free), slots(o, free.prof as Skill)));
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
      if (n - fromOwn > 0) movePeople(w, src, getPop(w, b.regionId, s, b.id), n - fromOwn, isLowerJob(s) ? undefined : s);
    }
    b.exp = 1;
  }
  // 시작 건물에 앉지 못한 하급 귀족은 저택에서 일하며 시작한다
  for (const o of w.buildings.filter((x) => x.typeId === 'manor')) {
    const free = findPop(w, o.regionId, 'gentry', 0);
    const room = slots(o, 'gentry');
    if (free && free.size > 0 && room > 0) movePeople(w, free, getPop(w, o.regionId, 'gentry', o.id), Math.min(room, workforce(free)));
  }
  syncEmployment(w);
  // 시작 징수율: 매일 징수(finance.ts collectIncomeTax)와 같은 규칙. 행정청은 아직 사람이 없어 한도가 0이라 0이다
  for (const k of kingdoms) {
    let people = 0;
    for (const p of w.pops) if (regions.find((r) => r.id === p.regionId)?.kingdomId === k.id) people += p.size;
    k.taxRatio = collectionRatio(taxCapacity(w, k.id), people);
  }
  // 시작 부: 하루 소득으로 감당할 수 있는 단계 (모든 pop 같은 규칙, 부 이동(updateWealth)과 같은 소득). 처음에는 아무도 현금 소득이 없다.
  // 소작농의 소득은 판매 대금에서 지대·토지세를 뺀 것 + 그날 쓰는 현물의 시장가다 (affordableTenantWealth)
  for (const r of regions) {
    const subs = w.buildings.find((x) => x.regionId === r.id && x.typeId === 'subsistence');
    const tenants = subs ? findPop(w, r.id, 'peasant', subs.id) : undefined;
    for (const p of w.pops.filter((x) => x.regionId === r.id)) {
      p.wealth = (p === tenants ? affordableTenantWealth(w, r, p.size, workforce(p)) : affordableWealth(r, p.size, p.incomeEma));
    }
  }
  // 국영 임금: 시작 민간 임금에서 임금 지수를 잡고 그 임금으로 시작한다. 그다음 그 임금으로 왕실 시작 국고를 정한다
  for (const k of kingdoms) {
    updateWageIndex(w, k);
    applyStateWages(w, k);
    const gov = companies.find((c) => c.id === k.governmentId)!;
    // 왕실 생산 건물의 시작 임금은 시작 국영 임금과 같다. 그다음은 민간처럼 시장을 보고 움직인다 (ai.ts adjustWages)
    gov.wages = { ...gov.stateWages! };
    gov.cash = gov.weekStartCash = gov.isPlayer && playerCash != null ? playerCash : startTreasury(w, gov);
  }
  // 금융가 시작 지분: 시작 금고를 지분 값 1로 나눠 그 지역 귀족(상급·하급)에게 인원대로 준다
  for (const f of w.buildings.filter((x) => x.typeId === 'finance')) {
    const nobles = w.pops.filter((p) => p.regionId === f.regionId && (p.prof === 'aristocrat' || p.prof === 'gentry') && p.size > 0);
    const n = nobles.reduce((a, p) => a + p.size, 0);
    f.nav = 1;
    if (n > 0) for (const p of nobles) addFund(p, f.id, ((f.cash ?? 0) * p.size) / n);
  }
  aggregateHouseholds(w);
  writePool(w);
  return w;
}

/**
 * 왕실 시작 국고 = 시작 정부 건물(행정청·건축사무소·학교)을 다 돌리는 주간 운영비 × TUNE.startTreasuryWeeks.
 * 운영비는 시작 국영 임금과 기본가 원료로 센다
 */
function startTreasury(w: World, gov: Company): number {
  let daily = 0;
  for (const b of w.buildings) {
    if (b.companyId !== gov.id || !isGovernment(b.typeId)) continue;
    const m = getMethod(b.typeId, b.methodId);
    let inputs = 0;
    for (const g of GOOD_IDS) inputs += (m.inputs[g] ?? 0) * GOODS[g].basePrice;
    daily += (wageCostOf(m, gov.stateWages ?? gov.wages, true) + inputs) * b.level;
  }
  return daily * TICKS_PER_WEEK * TUNE.startTreasuryWeeks;
}
