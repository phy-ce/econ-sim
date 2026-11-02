// 마이크로 세계 (2026-11-01 사용자 지시: "작은 모델, 예를 들어 100명에 건물 규모 같은 것도 축소해서, 모든 사람을 추적하면서 체크하고, 그다음에 전체 게임에서 테스트").
// 왕국 1개·지역 1~2개·인구 약 400명(일하는 사람 약 100명). 세계 규칙(상품·가격·임금·고용·AI)은 본 게임 코드 그대로이고,
// 바꾸는 것은 (1) 시작 상태와 (2) 건물 표의 '레벨당 양'(일꾼·원료·산출·학교 정원·징세 인구)을 축소 배율로 줄이는 것뿐이다.
// lab 은 sim 의 무엇이든 import 해도 되지만 sim 코어는 lab 을 import 하지 않는다 (test/core/layers.test.ts).
//
// 축소는 표(data.ts)를 제자리에서 고친다 (cli/worldtune.ts 와 같은 방식): createMicroWorld 가 켜고 restoreMicroScale 이 되돌린다.
// 켜진 동안 같은 프로세스의 본 게임 세계는 축소된 표로 돈다. 한 번에 한 축소만 쓴다 (다른 배율의 마이크로 세계를 섞어 돌리지 않는다).
//
// 축소 배율 s (기본 1/50): 레벨당 일꾼·원료·산출 × s. 값(가격·임금·이익률)은 그대로라 1인당 경제는 본 게임과 같다.
// - 공사 포인트(buildPoints)와 건축사무소 포인트(construction)는 그대로 둔다: 사무소 일꾼·자재가 s 배라 포인트 1의 값이 s 배가 되고,
//   그래서 1레벨 공사비도 s 배다 (공사 기간은 같다). buildPointsOf 가 10 단위로 반올림하고 최소 10이라 포인트를 줄이면 깨진다.
// - 건물 종류별 배율 typeScale 은 공사 포인트에도 곱한다 (data.ts MICRO_BUILD_SCALE, 반올림 없이). 그 종류의 레벨당 일꾼·산출이 typeScale 배인데
//   공사 포인트가 그대로면 산출에 비해 공사비가 1/typeScale 배가 된다 (2026-11-01 microB 가 찾은 도구 버그: labor 프리셋 공방 0.15·방직 0.25 에서 약 4~7배).
// - 사람·양의 고정 문턱(ABS_LIMITS hireMin·shareMin·seekMin·unsuppliedQty)은 × s, 돈 문턱(baseCredit·mintBase·reserveBase)은 × 인구 비율
//   (마이크로 인구 ÷ 본 게임 같은 왕국 시작 인구). 소작지 1칸 인원(SUBSISTENCE.workersPerCell)·무역소 유보액(TUNE.tradeReserve)도 × s.
// - 저택·금융가 크기 규칙(OWNERSHIP_SEATS·OWNER_SEATS_PER_LEVEL·financeStaff)은 레벨 단위의 비율이라 표 축소만으로 맞는다.
import { ABS_LIMITS, BUILDING_BY_ID, BUILDING_TYPES, GOOD_IDS, MICRO_BUILD_SCALE, SUBSISTENCE, TAX_PEOPLE_PER_LEVEL, TICKS_PER_YEAR, TIERS, TRADING_POST, TUNE, WORKFORCE_RATIO, tradeReserveOf } from '../data';
import { SCRIPTED_QUAKES, collectionRatio, newBuilding, paysDividend, slots } from '../economy';
import { applyStateWages, taxCapacity, updateWageIndex } from '../finance';
import { createWorld } from '../index';
import { initMarketWages, syncEmployment } from '../labor';
import { affordableTenantWealth, affordableWealth } from '../market';
import { addFund, aggregateHouseholds, findPop, getPop, movePeople, workforce } from '../pops';
import { updateOwnership, updateSubsistence } from '../production';
import { writePool } from '../round';
import { START_CASH, START_FIRM_CASH, START_SAVINGS, UPPER_LITERACY, startTreasury } from '../world';
import { newMarketGood } from '../world';
import type { Building, GoodId, MethodDef, NeedId, PopClass, Region, Skill, World } from '../types';
import { SKILLS, isLowerJob } from '../types';

/** 시작 건물 하나 (지역은 opts.people 순번, 주인은 민간 상회 또는 왕실) */
export interface MicroBuilding { type: string; method?: string; levels: number; region?: number; owner?: 'firm' | 'crown' }

export interface MicroOptions {
  seed?: number;
  aiSalt?: number;
  /** AI 회사 판단을 돌린다 (기본 true) */
  ai?: boolean;
  /** 레벨당 일꾼·원료·산출 배율 (기본 1/50: 농장 1레벨 = 농부 10명) */
  scale?: number;
  /** 지역마다 인구 (식구 포함). 기본 [400] = 일하는 사람 100명 (WORKFORCE_RATIO 0.25). 길이 2면 지역 2개 (이웃) */
  people?: number[];
  /** 계층 비율·교육을 가져올 티어 1~4 (기본 1, data.ts TIERS) */
  tier?: number;
  /** 시작 건물 (기본 MICRO_DEFAULT_BUILDINGS). 일꾼은 그 지역 소작농에서 채워 시작한다 (본 게임 시작 건물과 같다) */
  buildings?: MicroBuilding[];
  /** 소작농 노동 인구를 다 앉힐 칸 × 이 배율이 소작지 칸 (기본 1, 티어 1과 같다) */
  arableSlack?: number;
  /** 지역마다 산림·공장 부지 칸 (기본: 시작 건물 레벨 + 2 / + 5) */
  forest?: number;
  plot?: number;
  /** 행정청 1레벨이 왕국 인구 × TUNE.adminStart 를 감당하게 맞춘다 (기본 true: 본 게임 시작과 같은 징수율. 끄면 1레벨이 인구의 몇 배를 감당해 징수율이 높다) */
  adminFit?: boolean;
  /** 계층 인원을 이 단위의 정수배로 반올림한다 (기본 1명). 축소 대조 실행(배율 1, 인구 × 50)은 50 을 줘서 축소 세계와 같은 계층 비율로 시작한다 */
  personUnit?: number;
  /**
   * 돈 문턱(baseCredit·mintBase·reserveBase)의 인구 비율에 쓰는 인구 (기본: 지역 인구 합). 시작 인구만 줄이는 비교(본 게임 TUNE.startPopScale 과 같은 질문)는
   * 원래 인구를 줘서 돈 문턱을 그대로 둔다 (본 게임에서 startPopScale 은 돈 문턱을 바꾸지 않는다)
   */
  moneyPeople?: number;
  /** 고정 문턱(ABS_LIMITS)도 축소한다 (기본 true). false 는 축소가 무엇을 깨는지 보는 비교용 */
  floors?: boolean;
  /**
   * 건물 종류별 추가 축소 배율 (기본 없음 = 1): 그 종류의 레벨당 일꾼·원료·산출에 scale 다음으로 더 곱한다. 값(이익률)은 그대로다.
   * 작은 세계에서는 1레벨이 지역 수요보다 훨씬 큰 건물(예: 공방 1레벨 공구 산출 = 마이크로 공구 수요의 약 6배)이 늘 넘쳐 값이 바닥에 붙고 헐린다.
   * 그런 건물을 더 작게 만들어 시장이 두꺼워지게 한다 (노동시장 검증용, 2026-11-01)
   */
  typeScale?: Record<string, number>;
}

/** 기본 시작 건물 (배율 1/50에서 일자리 약 63: 농장 2 = 농부 20, 섬유 농장 10, 벌목 10, 방직 6, 공방 6, 건축사무소 10, 행정청 하급 귀족 1) */
export const MICRO_DEFAULT_BUILDINGS: MicroBuilding[] = [
  { type: 'farm', levels: 2 },
  { type: 'fiber_farm', levels: 1 },
  { type: 'lumber', levels: 1 },
  { type: 'textile', method: 'textile_hand', levels: 1 },
  { type: 'workshop', levels: 1 },
  { type: 'builder', levels: 1, owner: 'crown' },
  { type: 'admin', levels: 1, owner: 'crown' },
];

/** 마이크로 세계의 축소 정보 (세계마다) */
export interface MicroInfo {
  scale: number;
  /** 마이크로 인구 ÷ 본 게임 같은 왕국의 시작 인구 (돈 문턱 배율) */
  popRatio: number;
  /** 마이크로 시작 민간 일자리 ÷ 본 게임 같은 왕국의 시작 민간 일자리 (시작 민간 돈 배율) */
  jobRatio: number;
  /** 행정청 징세 인구에 더 곱한 배율 (adminFit) */
  adminK: number;
  regionIds: number[];
  floors: boolean;
}
const INFO = new WeakMap<World, MicroInfo>();
export const microInfo = (w: World): MicroInfo | undefined => INFO.get(w);

// ---------------------------------------------------------------- 표 축소

interface MethodSnap { type: string; m: MethodDef; workers: Record<string, number>; inputs: Record<string, number>; outputs: Record<string, number>; seats?: number; taxCapacity?: number }
interface Snapshot { methods: MethodSnap[]; workersPerCell: number; tradeReserve: number; abs: typeof ABS_LIMITS; needMul: Record<string, number> }
let snapshot: Snapshot | null = null;
let active: { scale: number; popRatio: number; adminK: number; floors: boolean; typeScale: Record<string, number> } | null = null;

function takeSnapshot(): Snapshot {
  return {
    methods: BUILDING_TYPES.flatMap((t) => t.methods.map((m) => ({ t, m }))).map(({ t, m }) => ({
      type: t.id, m, workers: { ...m.workers } as Record<string, number>, inputs: { ...m.inputs } as Record<string, number>, outputs: { ...m.outputs } as Record<string, number>,
      seats: m.seats, taxCapacity: m.taxCapacity,
    })),
    workersPerCell: SUBSISTENCE.workersPerCell, tradeReserve: TUNE.tradeReserve, abs: { ...ABS_LIMITS }, needMul: { ...TUNE.needMul } as Record<string, number>,
  };
}

/** 표를 본 게임 값으로 되돌린다 (축소가 꺼져 있으면 아무것도 안 한다). 충격으로 바꾼 TUNE.needMul 도 되돌린다 */
export function restoreMicroScale(): void {
  SCRIPTED_QUAKES.length = 0;
  if (!snapshot || !active) return;
  for (const s of snapshot.methods) {
    Object.assign(s.m.workers, s.workers);
    Object.assign(s.m.inputs, s.inputs);
    Object.assign(s.m.outputs, s.outputs);
    if (s.seats !== undefined) s.m.seats = s.seats;
    if (s.taxCapacity !== undefined) s.m.taxCapacity = s.taxCapacity;
  }
  SUBSISTENCE.workersPerCell = snapshot.workersPerCell;
  TUNE.tradeReserve = snapshot.tradeReserve;
  Object.assign(ABS_LIMITS, snapshot.abs);
  for (const k of Object.keys(TUNE.needMul)) delete TUNE.needMul[k as NeedId];
  Object.assign(TUNE.needMul, snapshot.needMul);
  for (const k of Object.keys(MICRO_BUILD_SCALE)) delete MICRO_BUILD_SCALE[k];
  active = null;
}

/** 축소를 켠다 (켜져 있으면 먼저 되돌린 뒤 다시 켠다) */
function applyMicroScale(scale: number, popRatio: number, adminK: number, floors: boolean, typeScale: Record<string, number> = {}): void {
  restoreMicroScale();
  snapshot ??= takeSnapshot();
  const mul = (o: Record<string, number | undefined>, k: number) => { for (const key of Object.keys(o)) if (o[key] !== undefined) o[key] = o[key]! * k; };
  for (const s of snapshot.methods) {
    const k = scale * (typeScale[s.type] ?? 1);
    mul(s.m.workers as Record<string, number>, k);
    mul(s.m.inputs as Record<string, number>, k);
    mul(s.m.outputs as Record<string, number>, k);
    if (s.seats !== undefined) s.m.seats = s.seats * k;
    if (s.taxCapacity !== undefined) s.m.taxCapacity = s.taxCapacity * k * adminK;
  }
  SUBSISTENCE.workersPerCell = snapshot.workersPerCell * scale;
  TUNE.tradeReserve = snapshot.tradeReserve * scale;
  if (floors) {
    ABS_LIMITS.popMin = snapshot.abs.popMin * scale;
    ABS_LIMITS.hireRoom = snapshot.abs.hireRoom * scale;
    ABS_LIMITS.hireMin = snapshot.abs.hireMin * scale;
    ABS_LIMITS.shareMin = snapshot.abs.shareMin * scale;
    ABS_LIMITS.seekMin = snapshot.abs.seekMin * scale;
    ABS_LIMITS.unsuppliedQty = snapshot.abs.unsuppliedQty * scale;
    ABS_LIMITS.baseCredit = snapshot.abs.baseCredit * popRatio;
    ABS_LIMITS.mintBase = snapshot.abs.mintBase * popRatio;
    ABS_LIMITS.reserveBase = snapshot.abs.reserveBase * popRatio;
  }
  Object.assign(MICRO_BUILD_SCALE, typeScale);
  active = { scale, popRatio, adminK, floors, typeScale };
}

/** 지금 켜진 축소 (없으면 null) */
export const microScaleActive = () => active;

// ---------------------------------------------------------------- 시작 상태

const peopleOf = (w: World, regionIds: number[]) => w.pops.reduce((a, p) => a + (regionIds.includes(p.regionId) ? p.size : 0), 0);
/** 건물 목록의 레벨당 일자리 합 × 레벨 (지금 표 기준) */
const jobsOf = (bs: Building[]) => bs.reduce((a, b) => a + SKILLS.reduce((x, s) => x + (BUILDING_BY_ID[b.typeId].methods.find((m) => m.id === b.methodId)!.workers[s] ?? 0) * b.level, 0), 0);

/**
 * 마이크로 세계를 만든다. 본 게임 세계(createWorld, 플레이어 없음)에서 왕국 1(에스테라)의 회사·지역 정의를 빌려 오고,
 * 시작 인구·건물·땅·돈만 새로 정한다. 만든 뒤에도 축소가 켜져 있다 (끝나면 restoreMicroScale).
 * 시작 순서는 world.ts createWorld 를 그대로 따른다 (소작지 → 소유 건물 → 시작 건물에 소작농에서 일꾼 → 징수율 → 부 → 국영 임금 → 국고 → 금융가 지분)
 */
export function createMicroWorld(opts: MicroOptions = {}): World {
  const seed = opts.seed ?? 1, scale = opts.scale ?? 1 / 50, tier = opts.tier ?? 1, floors = opts.floors ?? true;
  const people = opts.people ?? [400];
  if (people.length < 1 || people.length > 2) throw new Error('micro: 지역은 1~2개');
  const specs = opts.buildings ?? [...MICRO_DEFAULT_BUILDINGS, ...(people.length > 1 ? [{ type: TRADING_POST, levels: 1 } as MicroBuilding] : [])];

  // 1) 본 게임 값으로 빌려 올 세계 (축소를 끈 표로)
  restoreMicroScale();
  const base = createWorld(seed, { withPlayer: false, ai: opts.ai ?? true, aiSalt: opts.aiSalt ?? 0 });
  const k0 = base.kingdoms[0];
  const mine = base.regions.filter((r) => r.kingdomId === k0.id);
  const fullPeople = peopleOf(base, mine.map((r) => r.id));
  const fullJobs = jobsOf(base.buildings.filter((b) => b.companyId === k0.privateIds[0] && !BUILDING_BY_ID[b.typeId].auto));
  const popOf = (r: Region) => peopleOf(base, [r.id]);
  const first = [...mine].sort((a, b) => popOf(b) - popOf(a) || a.id - b.id)[0];
  const chosen = [first];
  if (people.length > 1) {
    const nb = mine.filter((r) => first.neighbors.includes(r.id)).sort((a, b) => popOf(b) - popOf(a) || a.id - b.id)[0];
    if (!nb) throw new Error('micro: 이웃 지역이 없다');
    chosen.push(nb);
  }
  const ids = chosen.map((r) => r.id);
  const total = people.reduce((a, b) => a + b, 0);
  const popRatio = (opts.moneyPeople ?? total) / fullPeople;
  const adminK = (opts.adminFit ?? true) ? (total * TUNE.adminStart / TUNE.adminScale) / (TAX_PEOPLE_PER_LEVEL * scale) : 1;

  // 2) 축소를 켠다
  applyMicroScale(scale, popRatio, adminK, floors, opts.typeScale ?? {});

  // 3) 지역·왕국·회사
  const td = TIERS[Math.max(1, Math.min(TIERS.length, tier)) - 1];
  const levelsOn = (i: number, land: string) => specs.filter((b) => (b.region ?? 0) === i && BUILDING_BY_ID[b.type]?.land === land).reduce((a, b) => a + b.levels, 0);
  const unit = opts.personUnit ?? 1;
  const whole = (x: number) => Math.round(x / unit) * unit;
  const starts = people.map((size) => {
    const aristocrat = whole(size * td.aristocrat * TUNE.aristStart), gentry = whole(size * td.gentry);
    const skilled = whole(size * td.skilled), expert = whole(size * td.expert);
    return { peasant: size - aristocrat - gentry - skilled - expert, skilled, expert, gentry, aristocrat };
  });
  const regions: Region[] = chosen.map((src, i) => {
    const st = starts[i];
    const market = {} as Region['market'];
    for (const g of GOOD_IDS) market[g as GoodId] = newMarketGood(g as GoodId);
    const arable = Math.ceil(((st.peasant + st.skilled + st.expert) * WORKFORCE_RATIO / SUBSISTENCE.workersPerCell) * (opts.arableSlack ?? 1)) + levelsOn(i, 'arable');
    return {
      ...structuredClone(src), neighbors: src.neighbors.filter((n) => ids.includes(n)), kingdomId: k0.id, tier,
      land: { arable, forest: opts.forest ?? levelsOn(i, 'forest') + 2, plot: opts.plot ?? levelsOn(i, 'plot') + 5, ore: 0 }, deposits: { iron: 0, coal: 0 },
      education: td.education, households: {} as Region['households'], market,
    };
  });
  const gov = structuredClone(base.companies.find((c) => c.id === k0.governmentId)!);
  const firm = structuredClone(base.companies.find((c) => c.id === k0.privateIds[0])!);
  const kingdom = { ...structuredClone(k0), privateIds: [firm.id], tariff: {}, investmentPool: 0, revenueWeek: 0 };

  const w: World = {
    ...base, config: { ...base.config }, tick: 0, seed, rngState: seed | 0, nextId: 1000,
    regions, kingdoms: [kingdom], pops: [], fund: 0, metrics: [],
    traders: { cash: 0, capital: 0, shipments: [] }, mint: { minted: 0, issued: 0, retired: 0, interest: 0 },
    companies: [gov, firm], buildings: [], constructions: [], salvage: [], history: [],
    events: [{ tick: 0, companyId: null, text: '마이크로 세계', textEn: 'Micro world', kind: 'info' }], alertState: {},
  };
  delete w.mobility;

  // 4) 시작 건물
  for (const b of specs) {
    const def = BUILDING_BY_ID[b.type];
    if (!def) throw new Error(`micro: 건물 ${b.type} 없음`);
    const crown = b.owner === 'crown';
    const nb = newBuilding(w.nextId++, b.type, regions[b.region ?? 0].id, crown ? gov.id : firm.id, b.method ?? def.methods[0].id, b.levels, crown);
    if (b.type === TRADING_POST) nb.cash = b.levels * tradeReserveOf(nb.methodId);
    w.buildings.push(nb);
  }
  updateSubsistence(w);
  for (const b of w.buildings) {
    if (b.stateOwned || BUILDING_BY_ID[b.typeId].auto) continue;
    const land = BUILDING_BY_ID[b.typeId].land;
    const typeId = land === 'arable' || land === 'forest' || land === 'ore' ? 'manor' : 'finance';
    b.owners = { [w.buildings.find((x) => x.regionId === b.regionId && x.typeId === typeId)!.id]: b.level };
  }
  // 시작 민간 돈: 본 게임 왕국 하나의 시작 돈(상회 운영 자금 + 저택·금융가 금고) × 시작 민간 일자리 비율. 금고는 지역 인구 비례, 저택·금융가 반씩
  const jobRatio = jobsOf(w.buildings.filter((b) => b.companyId === firm.id && !BUILDING_BY_ID[b.typeId].auto)) / Math.max(1, fullJobs);
  firm.cash = firm.weekStartCash = START_FIRM_CASH * jobRatio;
  regions.forEach((r, i) => {
    for (const typeId of ['manor', 'finance']) {
      const o = w.buildings.find((x) => x.regionId === r.id && x.typeId === typeId)!;
      o.cash = ((START_CASH - START_FIRM_CASH) * jobRatio * people[i]) / total / 2;
    }
  });

  // 5) 시작 pop: 하층은 전부 소작농 (숙련 인력은 소작지에 있으면서 자격만 갖고 있다). 상층은 자리 없이
  regions.forEach((r, i) => {
    const st = starts[i];
    const subs = w.buildings.find((b) => b.regionId === r.id && b.typeId === 'subsistence')!;
    const peasants = st.peasant + st.skilled + st.expert;
    const room = (subs.level * SUBSISTENCE.workersPerCell) / WORKFORCE_RATIO;
    const savings = st.peasant * START_SAVINGS.peasant + st.skilled * START_SAVINGS.skilled + st.expert * START_SAVINGS.expert;
    const placed = Math.min(peasants, room);
    for (const [work, size] of [[subs.id, placed], [0, peasants - placed]] as [number, number][]) {
      if (size <= 0) continue;
      const p = getPop(w, r.id, 'peasant', work);
      const share = size / peasants;
      p.size = size; p.savings = savings * share; p.literacy = r.education;
      p.quals = { skilled: st.skilled * WORKFORCE_RATIO * share, expert: st.expert * WORKFORCE_RATIO * share };
    }
    for (const cls of ['gentry', 'aristocrat'] as const) {
      const size = st[cls];
      if (size <= 0) continue;
      const p = getPop(w, r.id, cls, 0);
      p.size = size; p.savings = size * START_SAVINGS[cls]; p.literacy = UPPER_LITERACY;
    }
  });
  for (const b of w.buildings) if (b.typeId === 'manor') delete b.nobleSeats;
  updateOwnership(w);
  for (const o of w.buildings.filter((x) => BUILDING_BY_ID[x.typeId].ownership)) {
    const free = getPop(w, o.regionId, BUILDING_BY_ID[o.typeId].ownership!, 0);
    if (free.size > 0) movePeople(w, free, getPop(w, o.regionId, free.prof, o.id), Math.min(workforce(free), slots(o, free.prof as Skill)));
  }
  for (const b of w.buildings.filter((x) => !BUILDING_BY_ID[x.typeId].auto)) {
    const subs = w.buildings.find((x) => x.regionId === b.regionId && x.typeId === 'subsistence');
    const src = subs && findPop(w, b.regionId, 'peasant', subs.id);
    if (!src) continue;
    for (const s of SKILLS) {
      const n = slots(b, s);
      if (n <= 0 || paysDividend(b.stateOwned, s)) continue;
      const own = findPop(w, b.regionId, s, 0);
      const fromOwn = own ? Math.min(n, workforce(own)) : 0;
      if (own && fromOwn > 0) movePeople(w, own, getPop(w, b.regionId, s, b.id), fromOwn);
      if (n - fromOwn > 0) movePeople(w, src, getPop(w, b.regionId, s, b.id), n - fromOwn, isLowerJob(s) ? undefined : s);
    }
    b.exp = 1;
  }
  for (const o of w.buildings.filter((x) => x.typeId === 'manor')) {
    const free = findPop(w, o.regionId, 'gentry', 0);
    const room = slots(o, 'gentry');
    if (free && free.size > 0 && room > 0) movePeople(w, free, getPop(w, o.regionId, 'gentry', o.id), Math.min(room, workforce(free)));
  }
  syncEmployment(w);
  kingdom.taxRatio = collectionRatio(taxCapacity(w, kingdom.id), peopleOf(w, ids));
  for (const r of regions) {
    const subs = w.buildings.find((x) => x.regionId === r.id && x.typeId === 'subsistence');
    const tenants = subs ? findPop(w, r.id, 'peasant', subs.id) : undefined;
    for (const p of w.pops.filter((x) => x.regionId === r.id)) p.wealth = p === tenants ? affordableTenantWealth(w, r, p.size, workforce(p)) : affordableWealth(r, p.size, p.incomeEma);
  }
  if (TUNE.wageMarket) initMarketWages(w);
  updateWageIndex(w, kingdom);
  applyStateWages(w, kingdom);
  if (!TUNE.wageMarket) gov.wages = { ...gov.stateWages! };
  gov.cash = gov.weekStartCash = startTreasury(w, gov);
  gov.debt = 0;
  for (const f of w.buildings.filter((x) => x.typeId === 'finance')) {
    const nobles = w.pops.filter((p) => p.regionId === f.regionId && (p.prof === 'aristocrat' || p.prof === 'gentry') && p.size > 0);
    const n = nobles.reduce((a, p) => a + p.size, 0);
    f.nav = 1;
    if (n > 0) for (const p of nobles) addFund(p, f.id, ((f.cash ?? 0) * p.size) / n);
  }
  aggregateHouseholds(w);
  writePool(w);
  INFO.set(w, { scale, popRatio, jobRatio, adminK, regionIds: ids, floors });
  return w;
}

// ---------------------------------------------------------------- 충격 (관측용 개입. 돈을 만들거나 없애지 않는다)

export type MicroShock =
  /** 건물 levels 레벨을 공사 없이 더한다 (같은 주인·종류·방식 건물이 있으면 증설). land 가 참이면(기본) 그만큼 땅도 더한다 (소작지가 줄지 않게) */
  | { t: number; kind: 'build'; type: string; method?: string; levels: number; region?: number; owner?: 'firm' | 'crown'; land?: boolean }
  /** 필요량 배율 (TUNE.needMul, restoreMicroScale 이 되돌린다) */
  | { t: number; kind: 'need'; mul: Partial<Record<NeedId, number>> }
  /** 소작농 n 명(식구 포함, 저축 0)을 더한다 */
  | { t: number; kind: 'people'; n: number; region?: number }
  /** 건물 하나를 없앤다 (종류·지역의 첫 건물). 일꾼은 다음 날 실업자가 된다 */
  | { t: number; kind: 'remove'; type: string; region?: number }
  /** 소작지 재해: t 일부터 years 년 동안 소작지 칸의 loss 를 못 쓴다 (economy.ts SCRIPTED_QUAKES, restoreMicroScale 이 지운다) */
  | { t: number; kind: 'quake'; loss: number; years: number; region?: number }
  /** 민간 상회 현금을 0 으로: 그 돈을 상회 건물의 레벨 주인(저택·금융가) 금고로 가진 레벨 수대로 옮긴다 (돈은 옮길 뿐). 유보 자산 표시는 다음 정산에서 현금에 맞춰 준다 */
  | { t: number; kind: 'drain' };

export function applyMicroShock(w: World, s: MicroShock): void {
  if (s.kind === 'need') { Object.assign(TUNE.needMul, s.mul); return; }
  if (s.kind === 'drain') {
    const firm = w.companies.find((c) => c.id === w.kingdoms[0].privateIds[0])!;
    const levels = new Map<number, number>();
    let total = 0;
    for (const b of w.buildings) if (b.companyId === firm.id) for (const [id, n] of Object.entries(b.owners ?? {})) { levels.set(Number(id), (levels.get(Number(id)) ?? 0) + n); total += n; }
    const ids = [...levels.keys()].sort((a, b) => a - b);
    const cash = Math.max(0, firm.cash);
    if (total <= 0 || cash <= 0) return;
    let left = cash;
    ids.forEach((id, i) => {
      const o = w.buildings.find((x) => x.id === id)!;
      const amt = i === ids.length - 1 ? left : (cash * levels.get(id)!) / total;
      left -= amt;
      o.cash = (o.cash ?? 0) + amt;
    });
    firm.cash -= cash;
    return;
  }
  const r = w.regions[s.region ?? 0];
  if (!r) throw new Error('micro: 충격 지역 없음');
  const k = w.kingdoms[0];
  if (s.kind === 'people') {
    const subs = w.buildings.find((b) => b.regionId === r.id && b.typeId === 'subsistence')!;
    const p = getPop(w, r.id, 'peasant', subs.id);
    p.size += s.n;
    return;
  }
  if (s.kind === 'quake') {
    SCRIPTED_QUAKES.push({ kind: 'quake', regionId: r.id, loss: s.loss, start: s.t, end: s.t + Math.round(s.years * TICKS_PER_YEAR) });
    return;
  }
  if (s.kind === 'remove') {
    const i = w.buildings.findIndex((b) => b.regionId === r.id && b.typeId === s.type);
    if (i >= 0) w.buildings.splice(i, 1);
    return;
  }
  const def = BUILDING_BY_ID[s.type];
  const crown = s.owner === 'crown';
  const companyId = crown ? k.governmentId : k.privateIds[0];
  const methodId = s.method ?? def.methods[0].id;
  if ((s.land ?? true) && def.land) {
    if (def.land === 'ore') r.deposits[def.deposit ?? 'iron'] += s.levels;
    r.land[def.land] += s.levels;
  }
  let b = w.buildings.find((x) => x.regionId === r.id && x.typeId === s.type && x.companyId === companyId && x.methodId === methodId);
  if (!b) {
    b = newBuilding(w.nextId++, s.type, r.id, companyId, methodId, 0, crown);
    b.exp = 1;
    b.builtTick = w.tick;
    w.buildings.push(b);
  }
  b.level += s.levels;
  if (!crown) {
    const land = def.land;
    const typeId = land === 'arable' || land === 'forest' || land === 'ore' ? 'manor' : 'finance';
    const o = w.buildings.find((x) => x.regionId === r.id && x.typeId === typeId)!;
    b.owners = { ...(b.owners ?? {}), [o.id]: (b.owners?.[o.id] ?? 0) + s.levels };
  }
  updateSubsistence(w);
}
