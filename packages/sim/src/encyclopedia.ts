// 백과사전: 게임 규칙 전부를 짧은 항목으로 정리한다. 화면(packages/encyclopedia, 나중에 client)이 이 데이터만 그린다.
//
// 지키는 것:
// - 숫자는 옮겨 적지 않는다. params 는 코드의 상수(TUNE, data.ts 상수, 각 파일의 export const)를 읽는 함수다.
//   규칙 문장(rule)과 공식(formula)의 {0}, {1} … 은 params 값으로 채운다.
// - 예시(example)는 실제 sim 함수를 불러 계산한다 (priceFormula, collectionRatio, switchShare …).
// - live 는 돌고 있는 World 에서 지금 값을 읽는다. 세계를 바꾸지 않는다.
// - test/core/encyclopedia.test.ts 가 모든 함수가 도는지, id·related 가 맞는지, DESIGN.md 의 모든 절이 이어져 있는지,
//   TUNE 의 모든 키가 어느 항목에 실렸는지 확인한다. 규칙을 바꾸면 여기 항목도 같이 고친다.

import {
  BUILDING_BY_ID, BUILDING_TYPES, CLASS_DEFS, CONSUMPTION_PER_CAPITA, DEPENDENT_CONSUMPTION, EDUCATION_FLOOR, EDUCATION_RANGE, GOODS, GOOD_IDS,
  HARVEST_KINDS, HARVEST_MAX_SEASONS, HARVEST_SEASON_DAYS, HARVEST_SPREAD, HARVEST_STEP, LAW_TECH, MAX_POINTS_PER_LEVEL_DAY, NEEDS, OWNERSHIP_SEATS,
  OWNER_SEATS_PER_LEVEL, POINT_VALUE, REGIONS, SKILL_DEFS, SUBSISTENCE, TAX_PEOPLE_PER_LEVEL, TECHS, TECH_BY_ID, TECH_COST, TICKS_PER_WEEK, TICKS_PER_YEAR,
  TIERS, TIER_JITTER, TUNE, WORKFORCE_RATIO, getMethod, needsAt, rawMax, regionPerk, scaleBonus,
} from './data';
import {
  BASE_CREDIT, CARTAGE_RATE, RAIL_RATE, STATE_CREDIT_GDP, collectionRatio, companyById, constructionEstimate, creditLimit, efficiencyParts,
  harvestCondition, harvestFactor, holdingsOf, kingdomGdp, levelOwnersOf, knownVeins, landFree, landUsed, moneyIdentity, netMinted, popSol,
  FLOW_ZERO, officeMargin, priceFormula, regionById, sellThrough, shareWage, shippingRate, staffing, totalMoney,
} from './economy';
import { borderCost, kingdomById, DEFAULT_TARIFF } from './kingdoms';
import {
  CARGO_DECAY, CARGO_MIN, FLOW_EMA, INVEST_RATE, PRICE_MAX, PRICE_MIN, PRICE_SPEED, SAVINGS_DRAW, SHIP_RATE, STALE_SIGNAL, SUBSTITUTION_EXP,
  basketCostAt, harvestShares, needSharesAt, splitHarvest, tenantIncomePerWorker,
} from './market';
import {
  LITERACY_DOWN, LITERACY_PER_WEALTH, LITERACY_UP, QUAL_DECAY, QUAL_FACTOR, QUAL_FROM, QUAL_RATE, SEVERE_STARVATION, STARVATION_LINE,
  birthRateAt, mortalityAt, workforce,
} from './pops';
import { HIRE_RATE, MIGRATE_FULL, MIGRATE_MAX, MIGRATE_START, RATIO_GATE, UNPAID_QUIT, subsistenceWage, switchShare } from './labor';
import { CREW_RATE, EXP_GAIN } from './production';
import {
  DAILY_INTEREST, KEEP_SHARE, MINT_BASE, MINT_RATE, RESEARCHER_WEIGHT, RESERVE_SHARE, adminCapacityOf, reserveCap, taxCapacity, taxRates,
  weeklyOutputValue,
} from './finance';
import { CHUNKS, LAW_COOLDOWN, LAW_SWITCH, WELFARE_COOLDOWN, WELFARE_SWITCH, OFFICE_BLOCK, OFFICE_GROWTH, STAFFING_HORIZON, SWITCH_COOLDOWN } from './ai';
import { budgetPreview } from './budget';
import { ownershipAssets } from './policy';
import { welfareIncome, welfareTarget, welfareWeekly } from './welfare';
import type { BudgetLineKey } from './budget';
import { MAX_CONCURRENT_CONSTRUCTIONS, MAX_LEVELS_PER_PROJECT } from './commands';
import { START_CASH, START_FIRM_CASH, START_OFFICE_LEVELS, START_TECHS, TRADER_CAPITAL, createWorld } from './world';
import { regionNameEn } from './i18n';
import { POP_CLASSES, SKILLS, educationOf, literacyOf, wealthOf } from './types';
import type { Building, Company, GoodId, Kingdom, PopClass, Region, Skill, World } from './types';

// ---------------------------------------------------------------- 타입

export interface L10n { ko: string; en: string }
/** 화면이 숫자를 쓰는 법: florin 플로린, pct 비율(×100 %), x 배율, day 일, week 주, people 명, pt 포인트, level 레벨, good 개 */
export type EncUnit = 'florin' | 'pct' | 'x' | 'day' | 'week' | 'people' | 'pt' | 'level' | 'good' | '';
export interface EncRow { label: L10n; value: number | string; unit?: EncUnit }
export interface EncParam { label: L10n; value: () => number | string; unit?: EncUnit }
export interface EncExample { inputs: EncRow[]; steps: EncRow[]; result: EncRow[] }
export interface EncBar { label: L10n; value: number; max?: number; unit?: EncUnit }
export interface EncLiveView { rows?: EncRow[]; bars?: EncBar[] }
/** live 가 독자에게 고르게 하는 것 */
export type EncPick = 'region' | 'good' | 'kingdom' | 'building';
export interface EncCtx { regionId: number; good: GoodId; kingdomId: number; building: string }
export interface EncLive { pick: EncPick[]; run: (w: World, ctx: EncCtx) => EncLiveView }

export interface EncEntry {
  id: string;
  category: string;
  title: L10n;
  /** 한 줄 규칙. {n} 은 params[n] 값 */
  rule: L10n;
  /** 짧은 공식 (같은 {n} 치환) */
  formula?: string;
  params: EncParam[];
  example?: () => EncExample;
  live?: EncLive;
  related: string[];
  /** 게임에서 이 규칙이 보이는 창 (SEEN_IN 키) */
  seenIn: string[];
  /** 규칙이 있는 sim 파일 (관리자용) */
  source: string[];
  /** docs/DESIGN.md 의 절 번호 (DESIGN_SECTIONS 키) */
  design: string[];
}

export interface EncCategory { id: string; title: L10n }

// ---------------------------------------------------------------- 도우미

const t = (ko: string, en: string): L10n => ({ ko, en });
const p = (ko: string, en: string, value: () => number | string, unit: EncUnit = ''): EncParam => ({ label: t(ko, en), value, unit });
const row = (ko: string, en: string, value: number | string, unit: EncUnit = ''): EncRow => ({ label: t(ko, en), value, unit });
/** 법을 여는 기술 이름 (LAW_TECH) */
const lawTech = (law: keyof typeof LAW_TECH): string => { const id = LAW_TECH[law]; return id ? TECH_BY_ID[id]?.name ?? id : '-'; };
const bar = (label: L10n, value: number, unit: EncUnit = '', max?: number): EncBar => ({ label, value, unit, max });
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;

type TuneKey = keyof typeof TUNE;
/** 항목에 실린 TUNE 키 (시험이 모든 키가 실렸는지 본다) */
export const TUNE_DOCUMENTED = new Set<TuneKey>();
/** 비교 실행용 손잡이: 기본값이 기능을 끄고 있어 규칙이 아니다 */
export const TUNE_EXPERIMENTAL: TuneKey[] = ['subReturn', 'sellThrough', 'laborNet', 'officeRichWeeks', 'officeSelfPay', 'laborPoach', 'officeSchoolFirst', 'needMul',
  // 저택 상급 귀족 자리 규칙의 다른 후보 (DECISIONS 7-17, 기본 'econ' = 지금 규칙, 그 값들은 owner-buildings 항목에 있다)
  'nobleSeats', 'nobleSeatsPerLevel', 'nobleSeatsPerCell', 'nobleIncome', 'nobleSeatsLand', 'noblePerMille',
  // AI 왕실 민영화 (비교용, 기본 'off': 민영화는 플레이어가 켠다)
  'crownPrivatize',
  // AI 수정 비교 (2026-10-22, 기본 0 = 지금 동작)
  'crownGdpReserve', 'financeIdle', 'laborStrict', 'welfareCutOff'];

function showTune(v: unknown): number | string {
  if (typeof v === 'number') return Number.isFinite(v) ? v : '∞';
  if (Array.isArray(v)) return v.join(' / ');
  if (v && typeof v === 'object') return Object.entries(v as Record<string, number>).map(([k, x]) => `${k} ${x}`).join(' / ');
  return String(v);
}
/** TUNE 값을 읽는 조정값 줄 */
function tune(key: TuneKey, ko: string, en: string, unit: EncUnit = ''): EncParam {
  TUNE_DOCUMENTED.add(key);
  return { label: t(`${ko} (${key})`, `${en} (${key})`), value: () => showTune(TUNE[key]), unit };
}

const regionOf = (w: World, ctx: EncCtx): Region => w.regions.find((r) => r.id === ctx.regionId) ?? w.regions[0];
const kingdomOfCtx = (w: World, ctx: EncCtx): Kingdom => w.kingdoms.find((k) => k.id === ctx.kingdomId) ?? w.kingdoms[0];
const govOf = (w: World, k: Kingdom): Company | undefined => companyById(w, k.governmentId);
const regionLabel = (r: Region): L10n => t(r.name, regionNameEn(r.id));
const goodLabel = (g: GoodId): L10n => t(GOODS[g].name, GOODS[g].nameEn ?? g);
const classLabel = (c: PopClass): L10n => t(CLASS_DEFS[c].name, CLASS_DEFS[c].nameEn ?? c);
const buildingLabel = (typeId: string): L10n => t(BUILDING_BY_ID[typeId].name, BUILDING_BY_ID[typeId].nameEn ?? typeId);
const regionPeople = (w: World, regionId: number) => w.pops.reduce((a, x) => a + (x.regionId === regionId ? x.size : 0), 0);
const kingdomPeople = (w: World, kid: number) => w.pops.reduce((a, x) => a + (regionById(w, x.regionId).kingdomId === kid ? x.size : 0), 0);
const buildingsIn = (w: World, regionId: number) => w.buildings.filter((b) => b.regionId === regionId);
const tenantBuilding = (w: World, regionId: number) => w.buildings.find((b) => b.regionId === regionId && b.typeId === 'subsistence');

/** 방식 1레벨, 기본가·기본 임금의 하루 매출·원료·임금·이익률 (methods_audit 와 같은 셈) */
export function methodMarginAtBase(typeId: string, methodId: string) {
  const m = getMethod(typeId, methodId);
  let wage = 0, input = 0, revenue = 0;
  for (const [s, n] of Object.entries(m.workers) as [Skill, number][]) wage += n * SKILL_DEFS[s].baseWage;
  for (const [g, q] of Object.entries(m.inputs) as [GoodId, number][]) input += q * GOODS[g].basePrice;
  for (const [g, q] of Object.entries(m.outputs) as [GoodId, number][]) revenue += q * GOODS[g].basePrice;
  return { wage, input, revenue, profit: revenue - wage - input, margin: revenue > 0 ? (revenue - wage - input) / revenue : 0 };
}

let exWorld: World | null = null;
/** 예시용 고정 세계 (시드 1, 첫날). 예시는 이 세계를 읽기만 한다 */
export function exampleWorld(): World {
  return (exWorld ??= createWorld(1));
}

/** 예산 미리보기 줄 이름 */
const BUDGET_LINE_LABELS: Record<BudgetLineKey, L10n> = {
  tax: t('세금', 'Taxes'), tariffs: t('관세', 'Tariffs'), mint: t('주조', 'Minting'), build: t('왕실 공사', 'Crown construction'),
  wages: t('정부 건물 임금', 'Government wages'), stateFirms: t('국영 사업 손익', 'State enterprises'), goods: t('정부 건물 원료', 'Government inputs'), research: t('연구비', 'Research'), interest: t('국채 이자', 'Bond interest'), welfare: t('복지', 'Welfare'),
};

// ---------------------------------------------------------------- 분류·창·DESIGN 절

export const ENC_CATEGORIES: EncCategory[] = [
  { id: 'basics', title: t('기본', 'Basics') },
  { id: 'market', title: t('시장과 교역', 'Markets and trade') },
  { id: 'production', title: t('생산과 건물', 'Production and buildings') },
  { id: 'construction', title: t('건설과 철거', 'Construction') },
  { id: 'labour', title: t('노동과 임금', 'Labour and wages') },
  { id: 'people', title: t('인구와 생활', 'Population and living') },
  { id: 'tenants', title: t('소작과 땅', 'Tenant farms') },
  { id: 'ownership', title: t('소유·배당·국채', 'Ownership and money') },
  { id: 'state', title: t('국가 재정', 'State finance') },
  { id: 'ai', title: t('AI 판단', 'AI decisions') },
];

/** 게임 창 (seenIn 키) */
export const SEEN_IN: Record<string, L10n> = {
  map: t('지도', 'Map'),
  region: t('지역', 'Region'),
  market: t('시장', 'Market'),
  resource: t('자원 상세', 'Resource inspector'),
  pops: t('인구', 'Population'),
  workforce: t('일자리', 'Workforce'),
  company: t('회사', 'Company'),
  finance: t('재정', 'Finance'),
  alerts: t('알림', 'Notifications'),
  charts: t('그래프', 'Charts'),
};

/** docs/DESIGN.md 의 번호 붙은 절 (번호 → 제목 앞부분). 시험이 DESIGN.md 와 맞춰 본다 */
export const DESIGN_SECTIONS: Record<string, string> = {
  '1': '한눈에 보기',
  '2': '하루·주 순서',
  '3': '인구',
  '3.1': 'pop과 노동 인구',
  '3.2': '직종 8개',
  '3.3': '교육·문해력·자격',
  '3.4': '인구 증감',
  '3.5': '이주',
  '4': '소작지와 지대·토지세',
  '5': '필요와 소비',
  '6': '시장과 가격',
  '7': '생산·고용·임금',
  '7.1': '생산',
  '7.2': '고용',
  '7.3': '임금',
  '7.4': '기상 조건',
  '7.5': '산림과 광맥',
  '8': '건설과 철거',
  '9': '재정',
  '9.1': '세법과 세금',
  '9.2': '예산',
  '9.3': '배당·소유 건물 금고',
  '9.4': '국채·주조',
  '9.5': '복지',
  '10': 'AI 판단 요약',
  '11': '주요 조정값',
};

// ---------------------------------------------------------------- 항목

export const ENCYCLOPEDIA: EncEntry[] = [
  // ================================================================ 기본
  {
    id: 'time-money', category: 'basics', title: t('시간과 화폐', 'Time and money'),
    rule: t('1틱은 하루, 1주는 {0}일, 1년은 {1}일이다. 화폐는 플로린(ƒ) 하나다.', 'One tick is a day, a week is {0} days, a year is {1} days. The only currency is the florin (ƒ).'),
    params: [p('1주', 'Week', () => TICKS_PER_WEEK, 'day'), p('1년', 'Year', () => TICKS_PER_YEAR, 'day')],
    live: { pick: [], run: (w) => ({ rows: [row('지금 날짜', 'Day', w.tick, 'day'), row('지금 해', 'Year', Math.floor(w.tick / TICKS_PER_YEAR) + 1), row('대륙 화폐', 'Money on the continent', r2(totalMoney(w)), 'florin')] }) },
    related: ['day-order', 'money-conservation'], seenIn: ['map'], source: ['data.ts', 'tick.ts'], design: ['1'],
  },
  {
    id: 'regions-kingdoms', category: 'basics', title: t('지역과 왕국', 'Regions and kingdoms'),
    rule: t('{0}개 지역을 {1}개 왕국이 나눠 갖는다. 지역마다 시장이 하나다. 왕국 분할은 시드로 정한다.', '{1} kingdoms share {0} regions. Each region has one market. The split depends on the seed.'),
    params: [p('지역 수', 'Regions', () => REGIONS.length), p('왕국 수', 'Kingdoms', () => exampleWorld().kingdoms.length)],
    live: {
      pick: [], run: (w) => ({
        bars: w.regions.map((r) => bar(t(`${r.name} · ${kingdomById(w, r.kingdomId).name}`, `${regionNameEn(r.id)} · ${kingdomById(w, r.kingdomId).nameEn}`), Math.round(regionPeople(w, r.id)), 'people')),
      }),
    },
    related: ['start-state', 'pops'], seenIn: ['map', 'region'], source: ['world.ts', 'data.ts'], design: ['1'],
  },
  {
    id: 'start-state', category: 'basics', title: t('시작 상태', 'Starting state'),
    rule: t('지역 티어가 인구·계층·교육·부지·농지를 정하고 ±{0} 흔든다. 민간 상회는 {1}, 상인 {2}으로 시작한다. 은행은 없다.', 'Region tiers set population, classes, education, plots and farmland, jittered by ±{0}. Private houses start with {1}, traders {2}. There is no bank.'),
    params: [
      p('티어 흔들림', 'Tier jitter', () => TIER_JITTER, 'pct'), p('민간 상회 시작 현금', 'Private start cash', () => START_CASH, 'florin'),
      p('상인 자본', 'Trader capital', () => TRADER_CAPITAL, 'florin'),
      tune('startTreasuryWeeks', '시작 국고 (정부 건물 운영비 주 수)', 'Start treasury (weeks of government upkeep)', 'week'),
      p('시작 건축사무소', 'Starting construction office', () => START_OFFICE_LEVELS, 'level'),
      p('시작 기술', 'Starting techs', () => START_TECHS.join(', ')),
      tune('startLumber', '시작 벌목장 (10만 명당)', 'Start lumber camps (per 100k)', 'level'), tune('startFiber', '시작 섬유 농장 (10만 명당)', 'Start fibre farms (per 100k)', 'level'),
    ],
    example: () => {
      const tier = TIERS[0];
      return {
        inputs: [row('티어 1 인구', 'Tier 1 population', `${tier.pop[0]}–${tier.pop[1]}`, 'people'), row('부지/10만 명', 'Plots per 100k', tier.plot)],
        steps: [row('인구 110만이면 부지', 'Plots at 1.1M people', 11 * tier.plot)],
        result: [row('부지 (흔들림 전)', 'Plots (before jitter)', 11 * tier.plot, 'level')],
      };
    },
    live: { pick: [], run: (w) => ({ rows: w.regions.map((r) => ({ label: regionLabel(r), value: `T${r.tier ?? '-'} · ${Math.round(regionPeople(w, r.id)).toLocaleString()}` })) }) },
    related: ['regions-kingdoms', 'tenant-farms', 'treasury'], seenIn: ['map', 'region'], source: ['world.ts', 'data.ts'], design: ['1'],
  },
  {
    id: 'day-order', category: 'basics', title: t('하루 순서', 'Order of a day'),
    rule: t('임금과 세금은 시장 전에 오간다. 그래서 그날 받은 임금으로 그날 산다. 오늘 만든 산출은 내일 팔린다. {0}일마다 주간 일(배당·AI·예산)을 한다.', 'Wages and taxes move before the market, so people spend today what they earned today. Today\'s output sells tomorrow. Every {0} days the weekly steps (dividends, AI, budget) run.'),
    formula: '명령 → 고용 → 임금 → 세금 → 수확 → 주문 → 체결 → 생산 → 완공 → 가격 → 자격 → 인구·이주 → 복지 → 교육·문해력 → (주간)',
    params: [p('주간 단계 간격', 'Weekly step interval', () => TICKS_PER_WEEK, 'day')],
    related: ['time-money', 'rounding', 'clearing'], seenIn: [], source: ['tick.ts'], design: ['2'],
  },
  {
    id: 'rounding', category: 'basics', title: t('보이는 소수 자리', 'Shown decimals'),
    rule: t('세계는 숫자를 반올림하지 않고 계산하고 저장한다. 화면과 기록(그래프·월간 지표·지난주 국정 수지)은 소수 둘째 자리까지 보인다. 임금은 센트 단위로 정한다.', 'The world computes and saves numbers without rounding. The screen and records (charts, monthly metrics, the state budget of last week) show two decimals. Wages are set in whole cents.'),
    params: [p('보이는 최소 단위', 'Smallest shown unit', () => 0.01)],
    related: ['money-conservation', 'idle-market'], seenIn: [], source: ['round.ts', 'economy.ts'], design: ['2'],
  },
  {
    id: 'money-conservation', category: 'basics', title: t('화폐 보존', 'Money conservation'),
    rule: t('대륙 총화폐 − (주조 + 국채 발행 − 상환 − 국채 이자)는 언제나 같다. 돈은 정해진 곳에서만 생기고 사라진다.', 'Total money − (minted + bonds issued − repaid − bond interest) never changes. Money is only created or destroyed in named places.'),
    formula: 'M_total − (mint + issued − retired − interest) = const',
    params: [],
    live: {
      pick: [], run: (w) => ({
        rows: [row('대륙 화폐', 'Money on the continent', r2(totalMoney(w)), 'florin'), row('국가가 만든 돈 (순)', 'Net created by states', r2(netMinted(w)), 'florin'),
          row('보존량', 'Conserved quantity', r2(moneyIdentity(w)), 'florin'), row('주인 없는 돈', 'Ownerless fund', r2(w.fund), 'florin')],
      }),
    },
    related: ['mint', 'banking', 'rounding'], seenIn: ['finance'], source: ['economy.ts moneyIdentity', 'round.ts'], design: ['9.4', '2'],
  },

  // ================================================================ 시장
  {
    id: 'goods', category: 'market', title: t('상품과 기본가', 'Goods and base prices'),
    rule: t('상품은 {0}가지다. 상품 1개는 자기 기본가만큼 필요를 채운다. 운송은 서비스라 저장·이동이 안 된다.', 'There are {0} goods. One unit fills need worth its base price. Transport is a service: it cannot be stored or shipped.'),
    params: [p('상품 수', 'Goods', () => GOOD_IDS.length), ...GOOD_IDS.map((g) => p(GOODS[g].name, GOODS[g].nameEn ?? g, () => GOODS[g].basePrice, 'florin'))],
    live: { pick: ['region'], run: (w, ctx) => { const r = regionOf(w, ctx); return { bars: GOOD_IDS.map((g) => bar(goodLabel(g), r2(r.market[g].price / GOODS[g].basePrice), 'x', PRICE_MAX)) }; } },
    related: ['price-formula', 'needs'], seenIn: ['market', 'resource'], source: ['data.ts GOODS'], design: ['6'],
  },
  {
    id: 'clearing', category: 'market', title: t('체결', 'Market clearing'),
    rule: t('지역 시장마다 그날 가격 하나로 체결한다. 체결량 = min(수요, 공급). 파는 쪽은 같은 비율로 팔고, 사는 쪽은 같은 비율로 받는다. 건물 산출은 그날 못 팔면 사라진다.', 'Each regional market clears at one daily price. Volume = min(demand, supply). Sellers sell, and buyers receive, the same fraction. Unsold building output is lost.'),
    formula: 'sold = min(D, S);  seller share = sold / S;  buyer share = sold / D',
    params: [],
    example: () => ({
      inputs: [row('수요', 'Demand', 120, 'good'), row('공급', 'Supply', 100, 'good')],
      steps: [row('체결량', 'Volume', 100, 'good'), row('파는 쪽 판매율', 'Seller fill', 1, 'pct'), row('사는 쪽 충족', 'Buyer fill', r4(100 / 120), 'pct')],
      result: [row('남은 수요', 'Unmet demand', 20, 'good')],
    }),
    live: {
      pick: ['region', 'good'], run: (w, ctx) => {
        const mg = regionOf(w, ctx).market[ctx.good];
        return { rows: [row('오늘 수요', 'Demand today', r2(mg.demand), 'good'), row('오늘 공급', 'Supply today', r2(mg.supply), 'good'), row('체결', 'Sold', r2(mg.sold), 'good'), row('가격', 'Price', mg.price, 'florin')] };
      },
    },
    related: ['price-formula', 'trade', 'day-order'], seenIn: ['market', 'resource'], source: ['market.ts clearMarkets'], design: ['6'],
  },
  {
    id: 'price-formula', category: 'market', title: t('가격 공식', 'Price formula'),
    rule: t('목표가 = 기본가 × (1 + {0} × 쏠림). 쏠림 = (수요 − 공급) ÷ 작은 쪽, ±1로 자른다. 가격은 하루에 차이의 {1}씩 다가가고 기본가의 {2}~{3} 안에 있다.', 'Target = base × (1 + {0} × tilt), tilt = (demand − supply) ÷ the smaller one, clamped to ±1. Price moves {1} of the gap a day and stays within {2}–{3}× base.'),
    formula: 'target = base × (1 + {0} × clamp((D − S) / min(D, S), −1, 1))',
    params: [
      p('쏠림 계수', 'Tilt factor', () => r2(priceFormula('grain', 2, 1) / GOODS.grain.basePrice - 1)),
      p('하루 접근', 'Daily approach', () => PRICE_SPEED, 'pct'), p('하한', 'Floor', () => PRICE_MIN, 'x'), p('상한', 'Ceiling', () => PRICE_MAX, 'x'),
      p('수요·공급 이동평균 (하루)', 'Demand/supply EMA (daily)', () => FLOW_EMA, 'pct'),
    ],
    example: () => {
      const D = 120, S = 100, base = GOODS.grain.basePrice, target = priceFormula('grain', D, S);
      return {
        inputs: [row('상품', 'Good', GOODS.grain.name), row('기본가', 'Base price', base, 'florin'), row('수요 이동평균', 'Demand EMA', D, 'good'), row('공급 이동평균', 'Supply EMA', S, 'good')],
        steps: [row('쏠림 (120 − 100) ÷ 100', 'Tilt (120 − 100) ÷ 100', 0.2), row('목표가', 'Target', r2(target), 'florin'), row('어제 가격이 기본가면 하루 움직임', 'One day\'s move from base', r2((target - base) * PRICE_SPEED), 'florin')],
        result: [row('priceFormula(grain, 120, 100)', 'priceFormula(grain, 120, 100)', r2(target), 'florin')],
      };
    },
    live: {
      pick: ['region', 'good'], run: (w, ctx) => {
        const mg = regionOf(w, ctx).market[ctx.good], base = GOODS[ctx.good].basePrice;
        const target = priceFormula(ctx.good, mg.demandEma, mg.supplyEma);
        return {
          rows: [row('수요 이동평균', 'Demand EMA', mg.demandEma, 'good'), row('공급 이동평균', 'Supply EMA', mg.supplyEma, 'good'), row('목표가', 'Target', r2(target), 'florin'), row('가격', 'Price', mg.price, 'florin')],
          bars: [bar(t('하한', 'Floor'), r2(base * PRICE_MIN), 'florin', base * PRICE_MAX), bar(t('기본가', 'Base'), base, 'florin', base * PRICE_MAX), bar(t('가격', 'Price'), mg.price, 'florin', base * PRICE_MAX), bar(t('목표가', 'Target'), r2(target), 'florin', base * PRICE_MAX)],
        };
      },
    },
    related: ['clearing', 'idle-market', 'ai-outlook'], seenIn: ['market', 'resource'], source: ['economy.ts priceFormula', 'market.ts updatePrices'], design: ['6'],
  },
  {
    id: 'idle-market', category: 'market', title: t('거래 없는 시장', 'Markets with no trade'),
    rule: t('사고파는 사람이 없어지면 수요·공급 이동평균이 둘 다 하루 {0}씩 같은 비율로 줄어, 가격은 마지막 수급 비율의 가격에 머문다. 작은 쪽이 {1} 아래로 줄면 쏠린 쪽 끝으로 간다: 수요가 더 컸으면 상한, 공급이 더 컸으면 하한. 처음부터 거래가 없던 시장은 기본가 그대로다.', 'When nobody trades, the demand and supply EMAs both shrink {0} a day at the same rate, so price stays at the last supply-demand ratio. Once the smaller one falls below {1}, price drifts to the end it leaned to: ceiling if demand was larger, floor if supply was larger. A market that never traded stays at base.'),
    params: [p('이동평균 하루 비율', 'EMA daily weight', () => FLOW_EMA, 'pct'), p('거의 0', 'Near zero', () => FLOW_ZERO.toExponential(), 'good')],
    related: ['price-formula', 'rounding'], seenIn: ['market'], source: ['market.ts updatePrices'], design: ['6', '2'],
  },
  {
    id: 'trade', category: 'market', title: t('상인 교역', 'Traders'),
    rule: t('이웃 가격 × (1 − 운임률)이 현지 가격보다 높으면 상인이 사서 다음 날 이웃에 판다. 남은 화물은 하루 {1} 상하고 {3} 아래로 줄면 없어지며, 가격 신호에는 {2}만 공급으로 센다.', 'If neighbour price × (1 − freight rate) beats the local price, traders buy and sell next door the next day. Unsold cargo spoils {1} a day and is gone below {3}; it counts only {2} as supply for prices.'),
    formula: 'q = min({0} × gap × flow, unmet × 1.2 + flow × 5%, local supply × 90%)',
    params: [p('가격차 1%당 유통량 배수', 'Flow multiple per 1% gap', () => SHIP_RATE), p('화물 부패 (하루)', 'Cargo spoilage (daily)', () => CARGO_DECAY, 'pct'), p('묵은 화물 신호', 'Stale cargo signal', () => STALE_SIGNAL, 'pct'), p('남는 화물 최소', 'Smallest kept cargo', () => CARGO_MIN, 'good')],
    live: {
      pick: ['good'], run: (w, ctx) => ({ bars: w.regions.map((r) => bar(regionLabel(r), r.market[ctx.good].price, 'florin', GOODS[ctx.good].basePrice * PRICE_MAX)), rows: w.regions.map((r) => row(r.name, regionNameEn(r.id), `+${r2(r.market[ctx.good].shippedIn)} / −${r2(r.market[ctx.good].shippedOut)}`)) }),
    },
    related: ['freight', 'tariff', 'clearing'], seenIn: ['market', 'resource'], source: ['market.ts addTraderOrders'], design: ['6'],
  },
  {
    id: 'freight', category: 'market', title: t('운송비', 'Freight cost'),
    rule: t('운송 서비스로 채운 몫은 화물가 {0} × (운송 가격 ÷ 기본가), 못 채운 몫은 짐꾼 운임 {1}이다. 짐꾼 운임은 그 지역 노동자 소득이 된다.', 'The share carried by transport service costs {0} × (transport price ÷ base) of cargo value; the rest goes by porters at {1}, paid to local labourers.'),
    formula: 'rate = rail × {0} × P_tr / base + (1 − rail) × {1}',
    params: [p('운송 조합 운임', 'Carters\' rate', () => RAIL_RATE, 'pct'), p('짐꾼 운임', 'Porter rate', () => CARTAGE_RATE, 'pct')],
    example: () => ({
      inputs: [row('운송 공급 ÷ 수요', 'Transport supply ÷ demand', 0.5, 'pct'), row('운송 가격 ÷ 기본가', 'Transport price ÷ base', 1, 'x')],
      steps: [row('운송 몫', 'Rail share', r2(0.5 * RAIL_RATE), 'pct'), row('짐꾼 몫', 'Porter share', r2(0.5 * CARTAGE_RATE), 'pct')],
      result: [row('운임률', 'Freight rate', r4(0.5 * RAIL_RATE + 0.5 * CARTAGE_RATE), 'pct')],
    }),
    live: { pick: [], run: (w) => ({ bars: w.regions.map((r) => bar(regionLabel(r), r4(shippingRate(w, r.id)), 'pct', CARTAGE_RATE)) }) },
    related: ['trade', 'tariff'], seenIn: ['market'], source: ['economy.ts shippingRate'], design: ['6'],
  },
  {
    id: 'tariff', category: 'market', title: t('관세', 'Tariffs'),
    rule: t('국경을 넘는 화물에는 도착 왕국의 관세(기본 {0})가 붙고, 도착 왕국 국고의 세입이 된다. 해외 무역은 없다.', 'Cargo crossing a border pays the destination kingdom\'s tariff (default {0}) to its treasury. There is no overseas trade.'),
    params: [p('기본 관세', 'Default tariff', () => DEFAULT_TARIFF, 'pct')],
    live: {
      pick: ['region', 'good'], run: (w, ctx) => {
        const r = regionOf(w, ctx);
        return { rows: r.neighbors.map((n) => row(`${r.name} → ${regionById(w, n).name}`, `${regionNameEn(r.id)} → ${regionNameEn(n)}`, borderCost(w, r.id, n, ctx.good), 'pct')) };
      },
    },
    related: ['trade', 'freight', 'tax-laws'], seenIn: ['finance', 'market'], source: ['kingdoms.ts borderCost'], design: ['6'],
  },

  // ================================================================ 생산
  {
    id: 'production', category: 'production', title: t('생산', 'Production'),
    rule: t('산출 = 방식 산출 × 레벨 × 가동률 × 작업 인원 × 투입 충족 × 효율 × 기상 배율. 작업 인원은 충원율을 하루 {0}씩 따라간다. 투입재는 2일분을 목표로 산다.', 'Output = method output × level × utilisation × crew × input fill × efficiency × weather. Crew follows staffing by {0} a day. Inputs are bought toward two days\' stock.'),
    formula: 'out = m.out × lvl × util × crew × fill × eff × harvest',
    params: [p('작업 인원 추종 (하루)', 'Crew catch-up (daily)', () => CREW_RATE, 'pct')],
    live: {
      pick: ['region'], run: (w, ctx) => ({
        bars: buildingsIn(w, regionOf(w, ctx).id).filter((b) => !BUILDING_BY_ID[b.typeId].auto).map((b) => bar(t(`${BUILDING_BY_ID[b.typeId].name} ${b.level}`, `${BUILDING_BY_ID[b.typeId].nameEn} ${b.level}`), r2(staffing(b)), 'pct', 1)),
      }),
    },
    related: ['input-fill', 'efficiency', 'methods-rule', 'harvest-conditions'], seenIn: ['region', 'company'], source: ['production.ts produce'], design: ['7', '7.1'],
  },
  {
    id: 'input-fill', category: 'production', title: t('투입 충족', 'Input fill'),
    rule: t('모든 건물의 산출과 역량은 가장 덜 채워진 원료 비율을 따른다: 생산품, 공사 포인트, 행정청 징세 한도, 학교 자리.', 'Every building\'s output and capacity follows its least-filled input: goods, construction points, tax capacity, school seats.'),
    formula: 'fill = min_g (bought_g ÷ needed_g)',
    params: [],
    example: () => ({
      inputs: [row('필요 목재', 'Timber needed', 3000, 'good'), row('산 목재', 'Timber bought', 2400, 'good'), row('필요 섬유', 'Fibre needed', 500, 'good'), row('산 섬유', 'Fibre bought', 500, 'good')],
      steps: [row('목재 비율', 'Timber ratio', 0.8, 'pct'), row('섬유 비율', 'Fibre ratio', 1, 'pct')],
      result: [row('투입 충족', 'Input fill', 0.8, 'pct')],
    }),
    live: {
      pick: ['region'], run: (w, ctx) => ({
        bars: buildingsIn(w, regionOf(w, ctx).id).filter((b) => Object.keys(getMethod(b.typeId, b.methodId).inputs).length > 0).map((b) => bar(buildingLabel(b.typeId), r2(b.last.inputFill), 'pct', 1)),
      }),
    },
    related: ['production', 'admin-capacity', 'schools', 'build-points'], seenIn: ['region', 'company'], source: ['production.ts produce'], design: ['7.1'],
  },
  {
    id: 'efficiency', category: 'production', title: t('효율', 'Efficiency'),
    rule: t('효율 = (0.4 + 0.6 × 숙련도) × 규모 × (1 + 지역 특산). 숙련도는 하루 {0}씩 오르고, 방식을 바꾸면 절반이 된다. 규모는 레벨당 +1%, 최대 {1}.', 'Efficiency = (0.4 + 0.6 × experience) × scale × (1 + regional perk). Experience rises {0} a day and halves on a method change. Scale is +1% per level, up to {1}.'),
    formula: 'eff = (0.4 + 0.6 × exp) × min(1.2, 1 + 0.01 × lvl) × (1 + perk)',
    params: [p('숙련도 하루 증가', 'Experience gain (daily)', () => EXP_GAIN, 'pct'), p('규모 최대', 'Scale cap', () => r2(scaleBonus(1000)), 'x')],
    example: () => {
      const exp = 0.5, lvl = 5, perk = regionPerk(2, 'farm');
      const e = (0.4 + 0.6 * exp) * scaleBonus(lvl) * (1 + perk);
      return {
        inputs: [row('숙련도', 'Experience', exp, 'pct'), row('레벨', 'Level', lvl, 'level'), row('강변 평야 농장 특산', 'River Plain farm perk', perk, 'pct')],
        steps: [row('숙련 부분', 'Experience part', r2(0.4 + 0.6 * exp), 'x'), row('규모 scaleBonus(5)', 'Scale scaleBonus(5)', scaleBonus(lvl), 'x')],
        result: [row('효율', 'Efficiency', r4(e), 'x')],
      };
    },
    live: {
      pick: ['region'], run: (w, ctx) => ({
        bars: buildingsIn(w, regionOf(w, ctx).id).filter((b) => !BUILDING_BY_ID[b.typeId].auto).map((b) => bar(buildingLabel(b.typeId), r2(efficiencyParts(b).total), 'x', 1.5)),
      }),
    },
    related: ['production', 'regions-kingdoms'], seenIn: ['company', 'region'], source: ['economy.ts efficiencyParts', 'data.ts scaleBonus'], design: ['7.1'],
  },
  {
    id: 'profit', category: 'production', title: t('건물 손익', 'Building profit'),
    rule: t('손익 = 매출 − 원료 − 임금. 하루 5% 이동평균(profitEma)이 배당과 AI 판단의 기준이다.', 'Profit = revenue − inputs − wages. Its 5%-a-day moving average (profitEma) drives dividends and AI decisions.'),
    formula: 'profitEma = 0.95 × profitEma + 0.05 × profit',
    params: [],
    live: {
      pick: ['region'], run: (w, ctx) => ({
        rows: buildingsIn(w, regionOf(w, ctx).id).filter((b) => !BUILDING_BY_ID[b.typeId].auto).map((b) => ({ label: buildingLabel(b.typeId), value: r2(b.profitEma), unit: 'florin' as EncUnit })),
      }),
    },
    related: ['reserves', 'dividends', 'ai-utilization'], seenIn: ['company'], source: ['production.ts produce'], design: ['7.1'],
  },
  {
    id: 'methods-rule', category: 'production', title: t('건물 숫자 규칙', 'Building numbers rule'),
    rule: t('1레벨은 1,000명(100 단위), 원료·산출은 500 단위. 기본가와 기본 임금에서 이익률이 기본 방식 약 20%, 기술 1단계 30%, 2단계 40%가 되게 정한다.', 'One level employs 1,000 (in 100s); inputs and outputs come in 500s. At base prices and wages the margin is about 20% for the basic method, 30% and 40% for the next tech steps.'),
    formula: 'margin = (Σ out × base − Σ in × base − Σ jobs × baseWage) ÷ revenue',
    params: [
      p('노동자 기본 임금', 'Labourer base wage', () => SKILL_DEFS.unskilled.baseWage, 'florin'), p('기술자 기본 임금', 'Skilled base wage', () => SKILL_DEFS.skilled.baseWage, 'florin'),
      p('전문가 기본 임금', 'Expert base wage', () => SKILL_DEFS.expert.baseWage, 'florin'),
    ],
    example: () => {
      const m = methodMarginAtBase('farm', 'farm_basic');
      return {
        inputs: [row('곡물 농장 · 곡물 재배', 'Grain farm · grain farming', getMethod('farm', 'farm_basic').workers.farmer + ' 농부 → 곡물 ' + getMethod('farm', 'farm_basic').outputs.grain)],
        steps: [row('매출', 'Revenue', m.revenue, 'florin'), row('임금', 'Wages', m.wage, 'florin'), row('원료', 'Inputs', m.input, 'florin')],
        result: [row('이익률', 'Margin', r4(m.margin), 'pct')],
      };
    },
    live: {
      pick: ['building'], run: (_w, ctx) => {
        const def = BUILDING_BY_ID[ctx.building];
        return { bars: def.methods.filter((m) => Object.keys(m.outputs).length > 0).map((m) => bar(t(m.name, m.nameEn ?? m.id), r4(methodMarginAtBase(def.id, m.id).margin), 'pct', 0.5)) };
      },
    },
    related: ['buildings', 'production', 'tech'], seenIn: ['company'], source: ['data.ts BUILDING_TYPES', 'cli/methods_audit.ts'], design: ['7.1'],
  },
  {
    id: 'buildings', category: 'production', title: t('건물과 방식', 'Buildings and methods'),
    rule: t('건물은 {0}종이다. 방식마다 레벨당 일자리·원료·산출이 있다. 기술이 새 방식을 연다.', 'There are {0} building types. Each method sets jobs, inputs and outputs per level. Technologies unlock methods.'),
    params: [p('건물 종류', 'Building types', () => BUILDING_TYPES.length), p('포인트 1점 장부가', 'Book value per point', () => POINT_VALUE, 'florin')],
    live: {
      pick: ['building'], run: (_w, ctx) => {
        const def = BUILDING_BY_ID[ctx.building];
        const fmt = (bag: Record<string, number | undefined>) => Object.entries(bag).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || '-';
        return {
          rows: [row('땅', 'Land', def.land ?? '-'), row('포인트', 'Points', def.buildPoints, 'pt'),
            ...def.methods.map((m) => ({ label: t(m.name, m.nameEn ?? m.id), value: `${fmt(m.workers)} | ${fmt(m.inputs)} → ${fmt(m.outputs)}${m.construction ? ` · ${m.construction}pt` : ''}${m.seats ? ` · ${m.seats} seats` : ''}${m.taxCapacity ? ` · ${m.taxCapacity}` : ''}${m.tech ? ` [${m.tech}]` : ''}` }))],
        };
      },
    },
    related: ['methods-rule', 'tech', 'land'], seenIn: ['company', 'region'], source: ['data.ts BUILDING_TYPES'], design: ['7.1'],
  },
  {
    id: 'tech', category: 'production', title: t('기술', 'Technology'),
    rule: t('기술은 {0}개, 4단계다. 단계별 비용 {1} / {2} / {3} / {4}. 기술은 왕국 단위이고 민간 상회는 왕실 기술을 그대로 쓴다. 기술은 생산 방식과 함께 세법·투자법 선택지도 연다.', '{0} technologies in 4 tiers costing {1} / {2} / {3} / {4}. Technology is per kingdom; private houses use the crown\'s. Technologies also unlock tax and investment law options.'),
    params: [p('기술 수', 'Techs', () => TECHS.length), p('1단계', 'Tier 1', () => TECH_COST[1], 'florin'), p('2단계', 'Tier 2', () => TECH_COST[2], 'florin'), p('3단계', 'Tier 3', () => TECH_COST[3], 'florin'), p('4단계', 'Tier 4', () => TECH_COST[4], 'florin')],
    live: {
      pick: ['kingdom'], run: (w, ctx) => {
        const gov = govOf(w, kingdomOfCtx(w, ctx));
        if (!gov) return {};
        const cur = gov.research.current;
        return {
          rows: [row('아는 기술', 'Known', gov.research.known.length), row('연구 중', 'Researching', cur ?? '-')],
          bars: cur ? [bar(t('진행', 'Progress'), r2((gov.research.progress[cur] ?? 0) / (TECHS.find((x) => x.id === cur)?.cost ?? 1)), 'pct', 1)] : [],
        };
      },
    },
    related: ['research', 'ai-research', 'buildings'], seenIn: ['finance'], source: ['data.ts TECHS', 'finance.ts doResearch'], design: ['7.1'],
  },
  {
    id: 'harvest-conditions', category: 'production', title: t('기상 조건', 'Harvest conditions'),
    rule: t('계절({0}일)마다 지역마다 {1} 확률로 가뭄·홍수·산불이 시작한다. 강도 1당 그 땅 산출 −{2}, 길이 1~{3}계절, 이웃에 {4} 확률로 번진다.', 'Each season ({0} days) each region has a {1} chance of drought, flood or wildfire. Each intensity point cuts that land\'s output by {2}; it lasts 1–{3} seasons and spreads to each neighbour with {4} chance.'),
    formula: 'factor = 1 − intensity × {2}',
    params: [
      p('계절', 'Season', () => HARVEST_SEASON_DAYS, 'day'), tune('harvestChance', '시작 확률', 'Start chance', 'pct'), p('강도 1당', 'Per intensity', () => HARVEST_STEP, 'pct'),
      p('최대 계절', 'Max seasons', () => HARVEST_MAX_SEASONS), p('번짐', 'Spread', () => HARVEST_SPREAD, 'pct'), tune('harvestIntensity', '강도 범위', 'Intensity range'),
      p('종류', 'Kinds', () => HARVEST_KINDS.map((k) => `${k.name}: ${k.lands.join('·')}`).join(' / ')),
    ],
    example: () => {
      const [lo, hi] = TUNE.harvestIntensity;
      return {
        inputs: [row('강도', 'Intensity', 4), row('강도 1당', 'Per intensity', HARVEST_STEP, 'pct')],
        steps: [row('범위', 'Range', `${lo}–${hi}`)],
        result: [row('산출 배율', 'Output factor', r2(1 - 4 * HARVEST_STEP), 'x')],
      };
    },
    live: {
      pick: [], run: (w) => ({
        rows: w.regions.map((r) => { const c = harvestCondition(w, r.id); return { label: regionLabel(r), value: c ? `${c.kind} −${Math.round(c.cut * 100)}% · ${c.end - w.tick}` : '-' }; }),
        bars: w.regions.map((r) => bar(regionLabel(r), r2(harvestFactor(w, r.id, 'arable')), 'x', 1)),
      }),
    },
    related: ['production', 'tenant-income', 'ai-construction'], seenIn: ['map', 'region', 'alerts'], source: ['economy.ts harvestCondition', 'data.ts HARVEST_*'], design: ['7.4'],
  },
  {
    id: 'forests-veins', category: 'production', title: t('산림·광맥과 탐광', 'Forests, veins and prospecting'),
    rule: t('산림과 광맥 잠재량은 지역 지형으로 고정이다. 시작에는 잠재량의 {0}만 안다. 계절마다 지역·자원마다 {1} 확률로 잠재량의 {2}를 더 찾는다. 광산은 찾은 광맥 안에서만 짓는다.', 'Forests and vein potential are fixed by terrain. At start {0} of the potential is known. Each season, each region and resource has a {1} chance to find {2} more. Mines are built only on found veins.'),
    params: [tune('prospectStart', '시작 탐광 비율', 'Known at start', 'pct'), tune('prospectChance', '탐광 확률', 'Prospect chance', 'pct'), tune('prospectFind', '한 번에 찾는 몫', 'Find size', 'pct')],
    example: () => {
      const def = REGIONS.find((r) => r.id === 6)!;
      return {
        inputs: [row('북부 광산지대 철 잠재량', 'Northern Mining iron potential', def.veins.iron, 'level')],
        steps: [row('시작 비율', 'Start share', TUNE.prospectStart, 'pct')],
        result: [row('시작 광맥 (10 단위)', 'Known at start (10s)', knownVeins(def.veins).iron, 'level')],
      };
    },
    live: {
      pick: ['region'], run: (w, ctx) => {
        const r = regionOf(w, ctx), def = REGIONS.find((d) => d.id === r.id)!;
        return { bars: [bar(t('철 찾음', 'Iron found'), r.deposits.iron, 'level', Math.max(1, def.veins.iron)), bar(t('석탄 찾음', 'Coal found'), r.deposits.coal, 'level', Math.max(1, def.veins.coal)), bar(t('산림', 'Forest'), r.land.forest, 'level')] };
      },
    },
    related: ['land', 'buildings'], seenIn: ['region', 'alerts'], source: ['economy.ts prospect', 'data.ts REGIONS'], design: ['7.5'],
  },

  // ================================================================ 건설
  {
    id: 'build-points', category: 'construction', title: t('건설 포인트', 'Construction points'),
    rule: t('모든 공사는 왕실 건축사무소의 포인트로 짓는다. 포인트의 절반은 왕실 공사, 절반은 민간 공사에 순서대로 준다. 한 공사는 레벨당 하루 {0}점까지 받는다. 사무소가 {1}일 넘게 쉬면 인부를 해산한다.', 'All construction uses the crown\'s construction-office points: half to crown projects, half to private ones, in queue order. A project takes at most {0} points per level per day. An office idle for more than {1} days disbands its crew.'),
    formula: 'points = method pts × level × util × crew × eff × fill',
    params: [p('레벨당 하루 최대', 'Max per level per day', () => MAX_POINTS_PER_LEVEL_DAY, 'pt'), tune('officeIdleDays', '쉬는 유예', 'Idle grace', 'day')],
    live: {
      pick: ['kingdom'], run: (w, ctx) => {
        const k = kingdomOfCtx(w, ctx), gov = govOf(w, k);
        if (!gov) return {};
        const est = constructionEstimate(w, gov, 'farm');
        return { rows: [row('하루 포인트', 'Points per day', r2(est.pointsPerDay), 'pt'), row('하루 사무소 비용', 'Office cost per day', r2(est.costPerDay), 'florin'), row('대기 공사', 'Queued projects', w.constructions.filter((c) => kingdomById(w, regionById(w, c.regionId).kingdomId) === k).length)] };
      },
    },
    related: ['build-cost', 'ai-office', 'input-fill'], seenIn: ['company', 'finance'], source: ['production.ts allocateConstruction', 'economy.ts builderOf'], design: ['8'],
  },
  {
    id: 'build-cost', category: 'construction', title: t('공사비', 'Construction cost'),
    rule: t('건축사무소는 모든 공사(왕실 것도)에 쓴 포인트 × 포인트당 비용 ÷ (1 − 이익률)을 수수료로 받는다. 이익률은 건물 숫자 규칙과 같이 방식 단계에 따라 {0} / {1} / {2}다 (목조 / 목재 비계 / 철골). 포인트당 비용 = 그날 사무소 (임금 + 자재) ÷ 포인트. 수수료는 사무소의 매출이고, 사무소는 다른 왕실 건물처럼 이익을 유보 자산에 쌓고 나머지를 국고에 남긴다. 민간은 낼 현금만큼만 포인트를 받는다. 왕실 공사는 국고가 자기 사무소에 내므로 국고의 실제 공사비는 사무소 운영비다.', 'The construction office charges every project (crown ones too) points used × cost per point ÷ (1 − margin). The margin follows the building numbers rule by method stage: {0} / {1} / {2} (timber / scaffolding / iron frames). Cost per point = the office\'s daily (wages + materials) ÷ points. The fee is the office\'s sales; like other crown buildings it puts part of its profit into a reserve and leaves the rest in the treasury. Private builders only get as many points as they can pay for. Crown projects pay the crown\'s own office, so the treasury\'s real cost is the office\'s upkeep.'),
    formula: 'fee per point = Σ office (wages + materials) ÷ (1 − margin) ÷ points; private cost = buildPoints × fee per point',
    params: BUILDING_BY_ID.builder.methods.map((m) => p(`${m.name} 이익률`, `${m.nameEn ?? m.id} margin`, () => officeMargin(m.id), 'pct')),
    example: () => {
      const w = exampleWorld(), k = w.kingdoms[0], gov = govOf(w, k)!;
      const firm = companyById(w, k.privateIds[0]) ?? gov;
      const est = constructionEstimate(w, gov, 'farm'), priv = constructionEstimate(w, firm, 'farm');
      return {
        inputs: [row('곡물 농장 포인트', 'Grain farm points', est.required, 'pt'), row('사무소 하루 포인트', 'Office points/day', r2(est.pointsPerDay), 'pt'), row('사무소 하루 비용', 'Office cost/day', r2(est.costPerDay), 'florin')],
        steps: [row('포인트당 비용', 'Cost per point', r2(est.costPerDay / est.pointsPerDay), 'florin'), row('포인트당 수수료', 'Fee per point', r2((est.costPerDay / est.pointsPerDay) * priv.feeMult), 'florin'), row('공사 일수', 'Days', r2(est.days), 'day')],
        result: [row('1레벨 수수료 (민간, 시드 1 첫날)', 'Fee for one level (private, seed 1, day 0)', Math.round(priv.cost), 'florin'), row('1레벨 사무소 운영비 (왕실 실제 비용)', 'Office upkeep for one level (crown\'s real cost)', Math.round(est.cost), 'florin')],
      };
    },
    related: ['build-points', 'privatize', 'reserves', 'treasury'], seenIn: ['company', 'finance', 'region'], source: ['economy.ts constructionEstimate', 'economy.ts officeFeeMult', 'production.ts allocateConstruction'], design: ['8'],
  },
  {
    id: 'land', category: 'construction', title: t('땅', 'Land'),
    rule: t('1레벨 = 1칸. 농지·산림·광맥·공장 부지가 있다. 공사 중인 칸도 쓰인 것으로 센다. 행정청·학교는 땅을 쓰지 않는다. 동시 공사 {0}건, 한 건 1~{1}레벨.', 'One level = one cell of farmland, forest, veins or building plots. Cells under construction count as used. Administration and schools use no land. Up to {0} concurrent projects of 1–{1} levels.'),
    params: [p('동시 공사', 'Concurrent projects', () => MAX_CONCURRENT_CONSTRUCTIONS), p('한 공사 최대 레벨', 'Max levels per project', () => MAX_LEVELS_PER_PROJECT, 'level')],
    live: {
      pick: ['region'], run: (w, ctx) => {
        const r = regionOf(w, ctx);
        return { bars: (['arable', 'forest', 'ore', 'plot'] as const).map((l) => bar(t(l, l), landUsed(w, r.id, l), 'level', Math.max(1, landUsed(w, r.id, l) + landFree(w, r.id, l)))) };
      },
    },
    related: ['forests-veins', 'tenant-farms', 'ai-swap'], seenIn: ['region'], source: ['economy.ts landFree'], design: ['8'],
  },
  {
    id: 'privatize', category: 'construction', title: t('레벨 주인과 민영화', 'Level owners and privatisation'),
    rule: t('레벨마다 주인이 하나다: 국가, 또는 공사비를 낸 저택·금융가. 왕실이 지은 레벨은 국가 것이다. 왕실 건물에 민영화를 켜 두면 저택·금융가가 매주 건물마다 1레벨까지 산다. 값 = max(공사비 × 0.5, 공사비 + 그 레벨의 1년 이익). 금고가 값의 {0}배 이상이고 값 ÷ 1년 이익이 {1}년 이하일 때 산다. 산 레벨은 같은 지역 민간 건물로 옮긴다.', 'Every level has one owner: the state, or the manor or financial district that paid for it. Crown-built levels belong to the state. With privatisation on, manors and districts buy up to one level per building a week at max(cost × 0.5, cost + one year of that level\'s profit), when their treasury is at least {0}× the price and the price is at most {1} years of profit. Bought levels move to the private building in the same region.'),
    formula: 'price = max(cost × 0.5, cost + profitEma × 360 ÷ level)',
    params: [tune('privatizeMargin', '금고 배수', 'Treasury margin'), tune('privatizePayback', '회수 연수', 'Payback years'), tune('ownerTilt', '좋아하지 않는 종류 배율', 'Unfavoured kind weight', 'pct')],
    live: {
      pick: ['region'], run: (w, ctx) => {
        const r = regionOf(w, ctx), rows: EncRow[] = [];
        for (const b of w.buildings) {
          if (b.regionId !== r.id) continue;
          for (const x of levelOwnersOf(w, b)) {
            const who = x.owner === 'state' ? t('국가', 'State') : t(`${regionById(w, x.regionId!).name} ${BUILDING_BY_ID[x.owner].name}`, `${regionNameEn(x.regionId!)} ${BUILDING_BY_ID[x.owner].nameEn}`);
            rows.push(row(`${BUILDING_BY_ID[b.typeId].name} ← ${who.ko}`, `${BUILDING_BY_ID[b.typeId].nameEn} ← ${who.en}`, x.levels, 'level'));
          }
        }
        return { rows };
      },
    },
    related: ['owner-buildings', 'owner-treasury', 'dividends'], seenIn: ['company'], source: ['economy.ts levelOwnersOf', 'ai.ts buyLevels', 'production.ts privatizeLevel'], design: ['8', '9.3'],
  },
  {
    id: 'demolition', category: 'construction', title: t('철거', 'Demolition'),
    rule: t('철거 대기 건물은 주마다 1레벨씩 헐린다 (민간 건물은 레벨을 가장 많이 가진 주인의 것부터). 자재의 {0}를 {1}일에 나눠 판다. 대금은 헐린 레벨의 주인이 받는다 (저택·금융가 금고 또는 국고).', 'Buildings marked for demolition lose one level a week (in private buildings, from the owner holding the most levels). {0} of their materials is sold over {1} days; proceeds go to the owner of that level (a manor or district treasury, or the crown).'),
    params: [tune('salvageShare', '회수 비율', 'Salvage share', 'pct'), tune('salvageDays', '파는 날 수', 'Sale days', 'day')],
    related: ['ai-demolition', 'ai-swap'], seenIn: ['company'], source: ['production.ts progressDemolition'], design: ['8'],
  },

  // ================================================================ 노동
  {
    id: 'best-seat', category: 'labour', title: t('가장 나은 자리로', 'Best-paying seat'),
    rule: t('사람은 자격이 되는 자리 중 1인당 소득이 가장 높은 곳으로 옮긴다. 자리마다 하루 max(3명, 자리의 {0})까지 뽑고, 좋은 자리부터 실업자 → 소득이 낮은 재직자 순으로 채운다.', 'People move to the best-paying seat they qualify for. Each seat hires up to max(3, {0} of seats) a day, best seats first, unemployed first, then the lowest-paid employed.'),
    params: [p('하루 채용', 'Daily hiring', () => HIRE_RATE, 'pct')],
    live: {
      pick: ['region'], run: (w, ctx) => {
        const r = regionOf(w, ctx), bars: EncBar[] = [];
        const sub = subsistenceWage(w, r);
        bars.push(bar(t('소작지', 'Tenant farm'), r2(sub), 'florin'));
        for (const b of buildingsIn(w, r.id)) {
          const def = BUILDING_BY_ID[b.typeId];
          if (def.auto && !def.ownership) continue;
          const c = companyById(w, b.companyId), m = getMethod(b.typeId, b.methodId);
          for (const s of SKILLS) if ((m.workers[s] ?? 0) > 0) {
            const wage = def.ownership ? shareWage(b, s) : c?.wages[s] ?? 0;
            bars.push(bar(t(`${def.name} · ${SKILL_DEFS[s].name}`, `${def.nameEn} · ${SKILL_DEFS[s].nameEn}`), r2(wage), 'florin'));
          }
        }
        bars.sort((a, b) => b.value - a.value);
        return { bars: bars.slice(0, 16) };
      },
    },
    related: ['switching', 'qualifications', 'tenant-income', 'shares'], seenIn: ['workforce', 'region'], source: ['labor.ts laborMarket'], design: ['7.2'],
  },
  {
    id: 'switching', category: 'labour', title: t('옮기는 마찰', 'Switching friction'),
    rule: t('실업자는 바로 옮긴다. 재직자는 새 소득이 지금의 {0}를 넘을 때만, 하루 {1} × (배율 − 1) ÷ 0.1, 최대 {2}씩 옮긴다.', 'The unemployed move at once. Employed people move only if the new income exceeds {0}× the current one, at {1} × (ratio − 1) ÷ 0.1 a day, up to {2}.'),
    formula: 'share = min({2}, {1} × (v/cur − 1) ÷ ({0} − 1))',
    params: [tune('switchPremium', '문턱', 'Threshold', 'x'), tune('switchRate', '기본 속도', 'Base rate', 'pct'), tune('switchMax', '최대 속도', 'Max rate', 'pct')],
    example: () => ({
      inputs: [row('지금 소득', 'Current income', 10, 'florin'), row('새 자리', 'New seat', 15, 'florin')],
      steps: [row('배율', 'Ratio', 1.5, 'x')],
      result: [row('switchShare(10, 15) 하루', 'switchShare(10, 15) per day', r4(switchShare(10, 15)), 'pct')],
    }),
    related: ['best-seat', 'migration'], seenIn: ['workforce'], source: ['labor.ts switchShare'], design: ['7.2'],
  },
  {
    id: 'layoffs', category: 'labour', title: t('해고와 이탈', 'Layoffs and quitting'),
    rule: t('건물이 없어지거나 자리가 줄면 넘치는 만큼 실업이 된다. 임금을 다 못 받은 건물은 하루 {0}가 떠난다. 노동자·농부 자리는 기술자·전문가 충원율 ÷ {1}까지만 채운다.', 'When a building or its seats disappear, the excess becomes unemployed. Unpaid buildings lose {0} of workers a day. Labourer and farmer seats fill only up to skilled/expert staffing ÷ {1}.'),
    params: [p('미지급 이탈', 'Unpaid quit', () => UNPAID_QUIT, 'pct'), p('충원 비율 문턱', 'Ratio gate', () => RATIO_GATE)],
    related: ['best-seat', 'production'], seenIn: ['workforce'], source: ['labor.ts laborMarket'], design: ['7.2'],
  },
  {
    id: 'ai-wages', category: 'labour', title: t('민간 임금', 'Private wages'),
    rule: t('AI 회사는 매주 직종별 임금을 움직인다. 바닥 = 옮겨 올 사람의 지금 소득 × {0}. 천장 = 부가가치 × {1}를 기본 임금 비율로 나눈 몫. 바닥이 천장보다 우선한다. 최저임금은 없다.', 'AI firms adjust wages weekly per job. Floor = current income of people who would move in × {0}. Ceiling = value added × {1}, split by base-wage weight. The floor wins. There is no minimum wage.'),
    formula: 'loss → ×0.98; vacancies > 5% & slow hiring → ×1.03; vacancies < 2% → ×0.99',
    params: [tune('wageOutside', '바닥 배율', 'Floor multiple', 'x'), tune('wageCeil', '천장 (부가가치 중)', 'Ceiling (share of value added)', 'pct'), tune('wageLossCut', '적자면 깎기', 'Cut on loss')],
    live: {
      pick: ['kingdom'], run: (w, ctx) => {
        const k = kingdomOfCtx(w, ctx), c = companyById(w, k.privateIds[0]);
        if (!c) return {};
        return { bars: SKILLS.filter((s) => !['capitalist', 'aristocrat'].includes(s)).map((s) => bar(t(SKILL_DEFS[s].name, SKILL_DEFS[s].nameEn ?? s), r2(c.wages[s]), 'florin', SKILL_DEFS[s].baseWage * 2)) };
      },
    },
    related: ['state-wages', 'tenant-income', 'best-seat'], seenIn: ['company', 'workforce'], source: ['ai.ts adjustWages'], design: ['7.3'],
  },
  {
    id: 'state-wages', category: 'labour', title: t('국영 임금과 임금 지수', 'State wages and the wage index'),
    rule: t('왕실의 모든 건물은 국영 임금을 준다: 기본 임금 × 임금 지수 × 국영 임금 단계 배율({0}). 임금 지수는 민간 노동자·농부 평균 임금 ÷ 기본 임금의 주간 이동평균이다.', 'Every crown building pays the state wage: base wage × wage index × state-wage step ({0}). The wage index is the weekly moving average of private labourer and farmer wages ÷ base wage.'),
    formula: 'wage_s = baseWage_s × index × level',
    params: [tune('govWageLevels', '국영 임금 단계', 'State wage steps', 'x')],
    live: {
      pick: ['kingdom'], run: (w, ctx) => {
        const k = kingdomOfCtx(w, ctx), gov = govOf(w, k);
        return { rows: [row('임금 지수', 'Wage index', k.wageIndex ?? 1, 'x'), row('국영 임금 단계', 'State wage step', k.budget.wages), row('국영 노동자 임금', 'State labourer wage', gov?.wages.unskilled ?? 0, 'florin'), row('국영 기술자 임금', 'State skilled wage', gov?.wages.skilled ?? 0, 'florin')] };
      },
    },
    related: ['budget-steps', 'ai-wages'], seenIn: ['finance'], source: ['finance.ts updateWageIndex', 'finance.ts applyStateWages'], design: ['9.2', '7.3'],
  },
  {
    id: 'migration', category: 'labour', title: t('이주', 'Migration'),
    rule: t('이웃 지역의 매력도(기대 하루 소득 × 식량 충족)가 {0}를 넘으면 옮기기 시작하고 {1}에서 하루 {2}로 가장 빠르다. 일하는 pop은 그 {3} 속도다. 옮긴 사람은 실업으로 시작한다.', 'If a neighbour\'s attractiveness (expected daily income × food) exceeds {0}×, people start moving, fastest at {1}× with {2} a day. Employed pops move at {3}× that speed and arrive unemployed.'),
    formula: 'expected income = Σ best vacancies ÷ job seekers (Harris–Todaro)',
    params: [p('시작 배율', 'Start ratio', () => MIGRATE_START, 'x'), p('최대 배율', 'Full ratio', () => MIGRATE_FULL, 'x'), p('하루 최대', 'Max daily', () => MIGRATE_MAX, 'pct'), tune('employedMigrate', '재직자 속도', 'Employed speed', 'x')],
    related: ['best-seat', 'food', 'tenant-income'], seenIn: ['pops', 'map'], source: ['labor.ts migrate'], design: ['3.5'],
  },

  // ================================================================ 인구
  {
    id: 'pops', category: 'people', title: t('pop과 노동 인구', 'Pops and workforce'),
    rule: t('pop은 (지역, 직종, 일터) 묶음이다. 노동 인구는 인구의 {0}이고, 부양가족은 노동 인구의 {1}만큼 소비한다. 그래서 1인당 소비 단위는 {2}다.', 'A pop is a (region, profession, workplace) group. The workforce is {0} of people; dependants consume {1}, so one person is {2} consumption units.'),
    params: [p('노동 인구 비율', 'Workforce share', () => WORKFORCE_RATIO, 'pct'), p('부양가족 소비', 'Dependant consumption', () => DEPENDENT_CONSUMPTION, 'x'), p('1인당 소비 단위', 'Units per person', () => CONSUMPTION_PER_CAPITA)],
    live: {
      pick: ['region'], run: (w, ctx) => {
        const r = regionOf(w, ctx);
        return { bars: POP_CLASSES.map((c) => bar(classLabel(c), Math.round(w.pops.reduce((a, x) => a + (x.regionId === r.id && x.prof === c ? x.size : 0), 0)), 'people')) };
      },
    },
    related: ['classes', 'needs'], seenIn: ['pops', 'region'], source: ['pops.ts', 'data.ts'], design: ['3', '3.1'],
  },
  {
    id: 'classes', category: 'people', title: t('직종 8개', 'Eight professions'),
    rule: t('하층: 소작농·노동자·농부. 중층: 기술자·전문가·하급 귀족. 상층: 자본가·상급 귀족. 민간 건물의 귀족·자본가 자리는 임금 대신 배당을 받는다.', 'Lower: tenant farmers, labourers, farmers. Middle: skilled, experts, gentry. Upper: capitalists, high nobility. Owner seats in private buildings earn dividends instead of wages.'),
    params: SKILLS.map((s) => p(`${SKILL_DEFS[s].name} 기본 임금`, `${SKILL_DEFS[s].nameEn} base wage`, () => SKILL_DEFS[s].baseWage, 'florin')),
    related: ['pops', 'qualifications', 'owner-buildings'], seenIn: ['pops', 'workforce'], source: ['data.ts SKILL_DEFS', 'economy.ts paysDividend'], design: ['3.2'],
  },
  {
    id: 'qualifications', category: 'people', title: t('자격', 'Qualifications'),
    rule: t('노동자·소작농 자리 위로는 그 직종 자격이 있어야 들어간다. 자격은 하루 노동 인구 × {0} × {1} × 계수 × 출신 배율만큼 쌓이고, 계수가 0이면 하루 {2}씩 준다. 기술자 자격은 문해력 {3}, 전문가는 {4}부터 쌓인다.', 'Above labourer and tenant seats, a qualification is needed. It grows by workforce × {0} × {1} × factor × origin multiple a day, and decays {2} a day when the factor is 0. Skilled starts at literacy {3}, expert at {4}.'),
    formula: 'skilled: 20 × max(0, L − {3});  expert: L > {4} ? 10(L − {4}) + W/20 : 0',
    params: [p('기본 속도', 'Base rate', () => QUAL_RATE), tune('qualRate', '속도 배율', 'Rate multiple', 'x'), p('감소', 'Decay', () => QUAL_DECAY, 'pct'), tune('qualSkilledL', '기술자 문해력 문턱', 'Skilled literacy threshold'), tune('qualExpertL', '전문가 문해력 문턱', 'Expert literacy threshold')],
    example: () => {
      const L = 0.5, W = 5, f = QUAL_FACTOR.skilled!(L, W), from = QUAL_FROM.skilled?.unskilled ?? 1, wf = 1000;
      return {
        inputs: [row('노동자 노동 인구', 'Labourer workforce', wf, 'people'), row('문해력', 'Literacy', L, 'pct'), row('부', 'Wealth', W)],
        steps: [row('기술자 계수', 'Skilled factor', r2(f)), row('출신 배율 (노동자)', 'Origin multiple (labourer)', from, 'x')],
        result: [row('하루 새 기술자 자격', 'New skilled qualifications per day', r4(wf * QUAL_RATE * TUNE.qualRate * f * from), 'people')],
      };
    },
    live: {
      pick: ['region'], run: (w, ctx) => {
        const r = regionOf(w, ctx), q: Partial<Record<PopClass, number>> = {};
        for (const x of w.pops) if (x.regionId === r.id) for (const [k, v] of Object.entries(x.quals)) q[k as PopClass] = (q[k as PopClass] ?? 0) + (v ?? 0);
        return { bars: (Object.keys(q) as PopClass[]).map((c) => bar(classLabel(c), Math.round(q[c] ?? 0), 'people')) };
      },
    },
    related: ['literacy', 'best-seat', 'schools'], seenIn: ['pops', 'workforce'], source: ['pops.ts updateQualifications'], design: ['3.3'],
  },
  {
    id: 'literacy', category: 'people', title: t('교육과 문해력', 'Education and literacy'),
    rule: t('교육 접근도 목표 = {0} + {1} × min(1, 학교 정원 ÷ 인구). 문해력 목표 = 교육 접근도 + {2} × 부. 둘 다 매일 오를 때 {3}, 내릴 때 {4}씩 다가간다.', 'Education target = {0} + {1} × min(1, school seats ÷ population). Literacy target = education + {2} × wealth. Both approach daily at {3} going up and {4} going down.'),
    formula: 'edu* = {0} + {1} × coverage;  lit* = edu + {2} × W',
    params: [p('교육 바닥', 'Education floor', () => EDUCATION_FLOOR), p('교육 폭', 'Education range', () => EDUCATION_RANGE), p('부 1단계당', 'Per wealth step', () => LITERACY_PER_WEALTH), p('오를 때', 'Rising', () => LITERACY_UP, 'pct'), p('내릴 때', 'Falling', () => LITERACY_DOWN, 'pct')],
    live: {
      pick: [], run: (w) => ({
        bars: w.regions.flatMap((r) => {
          const ps = w.pops.filter((x) => x.regionId === r.id), n = ps.reduce((a, x) => a + x.size, 0);
          const lit = n > 0 ? ps.reduce((a, x) => a + literacyOf(x) * x.size, 0) / n : 0;
          return [bar(t(`${r.name} 교육`, `${regionNameEn(r.id)} education`), r2(educationOf(r)), 'pct', 1), bar(t(`${r.name} 문해력`, `${regionNameEn(r.id)} literacy`), r2(lit), 'pct', 1)];
        }),
      }),
    },
    related: ['schools', 'qualifications', 'ai-schools'], seenIn: ['region', 'pops'], source: ['tick.ts updateEducation', 'pops.ts updateLiteracy'], design: ['3.3'],
  },
  {
    id: 'needs', category: 'people', title: t('필요 묶음', 'Needs basket'),
    rule: t('필요는 소비 단위 1의 하루 금액(기본가)이다. 부가 오를수록 묶음이 커진다. 식량은 1.5 + 0.1 × 부(30까지), 난방·의복·생활용품은 0.1 × 부(10까지), 표준 의복·가정용품은 부 5부터, 고기는 8부터, 사치품은 10부터 생긴다.', 'Needs are the daily value (at base prices) per consumption unit. They grow with wealth: food 1.5 + 0.1 × W (to 30), heating/clothing/crude items 0.1 × W (to 10); standard clothing and household items from W 5, meat from 8, luxuries from 10.'),
    params: [tune('luxuryLinear', '사치품 1차', 'Luxury linear'), tune('luxuryQuad', '사치품 2차', 'Luxury quadratic'), tune('meatLinear', '고기 1차', 'Meat linear'), tune('meatQuad', '고기 2차', 'Meat quadratic')],
    example: () => {
      const n = needsAt(5), units = 4 * CONSUMPTION_PER_CAPITA;
      const total = Object.values(n).reduce((a, x) => a + x, 0);
      return {
        inputs: [row('부', 'Wealth', 5), row('식구 4명 소비 단위', 'Units for 4 people', units)],
        steps: NEEDS.filter((d) => n[d.id] > 0).map((d) => row(d.name, d.nameEn ?? d.id, r2(n[d.id]), 'florin')),
        result: [row('needsAt(5) 합 × 소비 단위', 'Σ needsAt(5) × units', r2(total * units), 'florin')],
      };
    },
    live: {
      pick: ['region'], run: (w, ctx) => {
        const r = regionOf(w, ctx);
        return { bars: [1, 3, 5, 10, 15, 20].map((L) => bar(t(`부 ${L}`, `Wealth ${L}`), r2(basketCostAt(r, 1, L)), 'florin')) };
      },
    },
    related: ['substitution', 'wealth', 'orders'], seenIn: ['pops'], source: ['data.ts needsAt'], design: ['5'],
  },
  {
    id: 'substitution', category: 'people', title: t('대체와 원자재 상한', 'Substitution and raw caps'),
    rule: t('필요 하나를 여러 상품으로 채울 때 비중 ∝ (가장 싼 단위 비용 ÷ 그 상품 단위 비용)^{0}. 섬유·목재는 부 {1} 이하면 다 쓸 수 있고, 부 {2} 이상이면 절반까지만 쓴다.', 'When several goods fill a need, shares ∝ (cheapest unit cost ÷ this unit cost)^{0}. Fibre and timber can fill all of it up to wealth {1}, and only half from wealth {2}.'),
    formula: 'share_i ∝ (min c ÷ c_i)^{0}',
    params: [p('대체 지수', 'Substitution exponent', () => SUBSTITUTION_EXP), tune('rawFullWealth', '원자재로 다 채우는 부', 'Raw fills all up to'), tune('rawCapWealth', '상한이 max가 되는 부', 'Raw cap reached at')],
    example: () => {
      const s = needSharesAt('nourishment', [2.2, 4], 5);
      return {
        inputs: [row('곡물 가격', 'Grain price', 2.2, 'florin'), row('식료품 가격', 'Groceries price', 4, 'florin')],
        steps: [row('곡물 단위 비용', 'Grain unit cost', r2(2.2 / GOODS.grain.basePrice), 'x'), row('식료품 단위 비용', 'Groceries unit cost', r2(4 / GOODS.food.basePrice), 'x')],
        result: [row('곡물 몫', 'Grain share', r4(s[0]), 'pct'), row('식료품 몫', 'Groceries share', r4(s[1]), 'pct'), row('rawMax(0.5, 7.5)', 'rawMax(0.5, 7.5)', rawMax(0.5, 7.5), 'pct')],
      };
    },
    related: ['needs', 'ai-outlook'], seenIn: ['pops', 'resource'], source: ['market.ts needSplit', 'data.ts rawMax'], design: ['5'],
  },
  {
    id: 'orders', category: 'people', title: t('장보기', 'Household buying'),
    rule: t('현물을 먼저 쓰고 나머지를 산다. 예산 = min(저축, 소득 이동평균 + 저축 × {0}). 돈이 모자라면 식량부터 산다.', 'Households use in-kind goods first, then buy. Budget = min(savings, income EMA + savings × {0}). When short, food is bought first.'),
    params: [p('저축 인출', 'Savings draw', () => SAVINGS_DRAW, 'pct')],
    related: ['needs', 'cash-surplus', 'wealth'], seenIn: ['pops'], source: ['market.ts collectOrders'], design: ['5'],
  },
  {
    id: 'wealth', category: 'people', title: t('부와 생활수준', 'Wealth and standard of living'),
    rule: t('소득(현금 + 쓴 현물)이 다음 단계 묶음 비용의 102%를 넘으면 부가 하루 최대 +0.03, 지금 단계의 98%에 못 미치면 최대 −0.03 움직인다. 생활수준 = max(1, 부 × 충족률).', 'If income (cash + in-kind used) exceeds 102% of the next step\'s basket, wealth rises up to 0.03 a day; below 98% of the current basket it falls up to 0.03. SoL = max(1, wealth × fulfilment).'),
    formula: 'SoL = max(1, W × fulfilment)',
    params: [],
    live: {
      pick: ['region'], run: (w, ctx) => {
        const r = regionOf(w, ctx);
        return { bars: w.pops.filter((x) => x.regionId === r.id && x.size > 1000).sort((a, b) => b.size - a.size).slice(0, 12).map((x) => bar(t(`${CLASS_DEFS[x.prof].name}${x.work ? '' : ' (실업)'}`, `${CLASS_DEFS[x.prof].nameEn}${x.work ? '' : ' (unemployed)'}`), r2(popSol(x)), '', 20)) };
      },
    },
    related: ['needs', 'growth', 'orders'], seenIn: ['pops'], source: ['market.ts updateWealth', 'economy.ts popSol'], design: ['5', '3.4'],
  },
  {
    id: 'growth', category: 'people', title: t('인구 증감', 'Population growth'),
    rule: t('출생·사망은 생활수준 곡선(빅토리아3)이다. 출생 = 사망이 되는 생활수준이 계층마다 다르다 ({0}). 생활수준 × 5 ÷ 평형점을 곡선에 넣는다. 문해력 100%면 출생 −10%.', 'Births and deaths follow the Victoria 3 SoL curves. The SoL where births equal deaths differs by stratum ({0}); SoL × 5 ÷ equilibrium goes into the curve. Full literacy cuts births 10%.'),
    formula: 'daily growth = (birth(SoL′) − death(SoL′)) ÷ 30',
    params: [tune('growthEq', '평형 생활수준', 'Equilibrium SoL')],
    example: () => {
      const sol = 2, eq = TUNE.growthEq.lower, s = sol * 5 / eq;
      const b = birthRateAt(s, 0.2), d = mortalityAt(s);
      return {
        inputs: [row('소작농 생활수준', 'Tenant SoL', sol), row('하층 평형점', 'Lower-stratum equilibrium', eq), row('문해력', 'Literacy', 0.2, 'pct')],
        steps: [row('곡선 입력', 'Curve input', r2(s)), row('달 출생', 'Monthly births', r4(b), 'pct'), row('달 사망', 'Monthly deaths', r4(d), 'pct')],
        result: [row('연 증감', 'Yearly change', r4((1 + (b - d) / 30) ** 360 - 1), 'pct')],
      };
    },
    live: {
      pick: ['region'], run: (w, ctx) => {
        const r = regionOf(w, ctx);
        return { bars: w.pops.filter((x) => x.regionId === r.id && x.size > 1000).sort((a, b) => b.size - a.size).slice(0, 12).map((x) => bar(classLabel(x.prof), r2(x.growth / 100), 'pct')) };
      },
    },
    related: ['wealth', 'food'], seenIn: ['pops', 'charts'], source: ['pops.ts growthAt'], design: ['3.4'],
  },
  {
    id: 'food', category: 'people', title: t('굶주림', 'Starvation'),
    rule: t('식량 충족 {0} 아래부터 출생 최대 −35%, 사망 최대 +30%. {1} 아래로는 출생 최대 −90%, 사망 최대 +100%.', 'Below {0} food fulfilment births fall up to 35% and deaths rise up to 30%; below {1}, births fall up to 90% and deaths double.'),
    params: [p('기아선', 'Starvation line', () => STARVATION_LINE, 'pct'), p('심한 기아', 'Severe starvation', () => SEVERE_STARVATION, 'pct')],
    live: {
      pick: [], run: (w) => ({
        bars: w.regions.map((r) => {
          const ps = w.pops.filter((x) => x.regionId === r.id), n = ps.reduce((a, x) => a + x.size, 0);
          return bar(regionLabel(r), r2(n > 0 ? ps.reduce((a, x) => a + x.food * x.size, 0) / n : 0), 'pct', 1);
        }),
      }),
    },
    related: ['growth', 'migration'], seenIn: ['pops', 'alerts'], source: ['pops.ts growthWith'], design: ['3.4'],
  },
  {
    id: 'cash-surplus', category: 'people', title: t('남는 현금', 'Surplus cash'),
    rule: t('투자법이 허용한 계층은 (생활비 + 세금) × {0}일을 넘는 현금의 {1}로 매일 그 지역 금융가 지분을 산다. 소작농은 (생활비 + 세금) × {2}주를 넘는 저축이 그 지역 저택 금고로 간다 (지분도 대가도 없다). 그 밖의 계층은 저축을 들고 있는다.', 'Classes allowed by the investment law spend {1} of cash above {0} days of (living costs + taxes) each day on units of the regional financial district. Peasant savings above {2} weeks of (living costs + taxes) go to the regional manor treasury (no units, nothing in return). Other classes keep their savings.'),
    params: [tune('cashBufferDays', '쥐는 일수', 'Buffer days', 'day'), p('하루 투자 비율', 'Daily investment rate', () => INVEST_RATE, 'pct'), tune('peasantKeepWeeks', '소작농 저축 상한', 'Peasant savings cap', 'week')],
    related: ['owner-treasury', 'orders'], seenIn: ['finance'], source: ['market.ts investSurplus'], design: ['5', '9.3'],
  },

  // ================================================================ 소작
  {
    id: 'tenant-farms', category: 'tenants', title: t('소작지', 'Tenant farms'),
    rule: t('지역의 빈 농지는 전부 소작지다. 1칸 = 소작농 노동 인구 {0}명. 농지 공사를 시작하면 그 칸은 바로 빠지고, 넘치는 소작농은 실업이 된다.', 'All free farmland in a region is tenant farmland. One cell = {0} tenant workers. Starting a farm project removes the cell at once; excess tenants become unemployed.'),
    params: [p('1칸 소작농', 'Tenants per cell', () => SUBSISTENCE.workersPerCell, 'people')],
    live: {
      pick: ['region'], run: (w, ctx) => {
        const b = tenantBuilding(w, regionOf(w, ctx).id);
        return { rows: [row('소작지 칸', 'Tenant cells', b?.level ?? 0, 'level'), row('일하는 소작농 (노동 인구)', 'Tenant workers', Math.round(w.pops.filter((x) => b && x.work === b.id).reduce((a, x) => a + workforce(x), 0)), 'people')] };
      },
    },
    related: ['tenant-output', 'land', 'start-state'], seenIn: ['region'], source: ['production.ts updateSubsistence'], design: ['4', '1'],
  },
  {
    id: 'tenant-output', category: 'tenants', title: t('소작 산출', 'Tenant output'),
    rule: t('소작농 노동 인구 1명이 하루 곡물 {0}, 의복 {1}, 목재 {2}, 가구 {3}을 낸다. 섬유는 내지 않는다. 기상 조건 배율을 곱한다.', 'Each tenant worker produces {0} grain, {1} clothing, {2} timber and {3} furniture a day. No fibre. Harvest conditions multiply it.'),
    params: [p('곡물', 'Grain', () => SUBSISTENCE.output.grain ?? 0, 'good'), p('의복', 'Clothing', () => SUBSISTENCE.output.cloth ?? 0, 'good'), p('목재', 'Timber', () => SUBSISTENCE.output.timber ?? 0, 'good'), p('가구', 'Furniture', () => SUBSISTENCE.output.furniture ?? 0, 'good')],
    example: () => {
      const farm = getMethod('farm', 'farm_basic'), perWorker = (farm.outputs.grain ?? 0) / 1000;
      return {
        inputs: [row('소작농 1명 곡물', 'Grain per tenant', SUBSISTENCE.output.grain ?? 0, 'good'), row('농장 1명 곡물', 'Grain per farm worker', perWorker, 'good')],
        steps: [],
        result: [row('농장 ÷ 소작', 'Farm ÷ tenant', r2(perWorker / (SUBSISTENCE.output.grain ?? 1)), 'x')],
      };
    },
    related: ['keep-what-they-use', 'tenant-farms', 'harvest-conditions'], seenIn: ['region', 'resource'], source: ['data.ts SUBSISTENCE', 'market.ts harvest'], design: ['4'],
  },
  {
    id: 'keep-what-they-use', category: 'tenants', title: t('쓸 만큼 남기고 판다', 'Keep what they use'),
    rule: t('소작농은 산출에서 식구가 그날 쓸 만큼 남기고 나머지를 판다. 파는 양은 가격과 수요를 보지 않는다. 안 팔린 판매분은 사라진다.', 'Tenants keep what their household uses that day and sell the rest. The amount sold ignores price and demand; unsold produce is lost.'),
    params: [],
    example: () => {
      const out = GOOD_IDS.map((g) => (SUBSISTENCE.output[g] ?? 0) * 1);
      const size = 1 / WORKFORCE_RATIO, wealth = 3;
      const { own, sell } = splitHarvest(size, wealth, out);
      const gi = GOOD_IDS.indexOf('grain');
      return {
        inputs: [row('노동 인구 1명 = 식구', 'One worker = household', size, 'people'), row('부', 'Wealth', wealth), row('곡물 산출', 'Grain output', out[gi], 'good')],
        steps: [row('식구가 먹는 곡물', 'Grain eaten', r2(own[gi]), 'good')],
        result: [row('파는 곡물', 'Grain sold', r2(sell[gi]), 'good')],
      };
    },
    related: ['tenant-output', 'rent-landtax', 'tenant-income'], seenIn: ['resource', 'region'], source: ['market.ts splitHarvest'], design: ['4'],
  },
  {
    id: 'rent-landtax', category: 'tenants', title: t('지대와 토지세', 'Rent and land tax'),
    rule: t('지대: 수확의 {0}를 먼저 떼어 바로 시장에 팔고 대금은 그 지역 저택으로 간다. 소작농 부가 {1} 아래면 {2}만큼 덜 뗀다. 남은 수확에서 쓰고 남는 것을 팔면 토지세율 × 징수율은 국고로, 나머지는 소작농에게 간다.', 'Rent: {0} of the harvest is taken first and sold straight away; proceeds go to the regional manor. Below wealth {1}, {2} less is taken. Of what tenants sell from the rest, land-tax rate × collection goes to the treasury and the rest to tenants.'),
    formula: 'rent = harvest × {0}; tenant = sales of (harvest − rent − own use) × (1 − landTax × collection)',
    params: [tune('rentShare', '지대', 'Rent share', 'pct'), tune('patronWealth', '후원 부 문턱', 'Patronage wealth'), tune('patronShare', '돌려주는 지대', 'Returned rent', 'pct')],
    live: {
      pick: ['region'], run: (w, ctx) => {
        const sh = harvestShares(w, regionOf(w, ctx));
        return { bars: [bar(t('지대', 'Rent'), r4(sh.rent), 'pct', 1), bar(t('토지세', 'Land tax'), r4(sh.tax), 'pct', 1), bar(t('소작농 몫', 'Tenant share'), r4(Math.max(0, 1 - sh.rent - sh.tax)), 'pct', 1)] };
      },
    },
    related: ['keep-what-they-use', 'tax-laws', 'owner-buildings'], seenIn: ['region', 'finance'], source: ['market.ts harvestShares'], design: ['4'],
  },
  {
    id: 'tenant-income', category: 'tenants', title: t('소작 수확 가치', 'Tenant income value'),
    rule: t('소작농 1명의 하루 소득 = 판매분 × 현지 가격 × 팔리는 비율 × (1 − 지대 − 토지세) + 그날 쓴 현물의 시장가. 채용 순서, AI 노동자 임금 바닥, 이주에서 소작농 소득으로 쓴다.', 'A tenant worker\'s daily income = sold produce × local price × sell-through × (1 − rent − land tax) + market value of goods used. It is the tenant income for hiring, AI wage floors and migration.'),
    params: [],
    example: () => {
      const w = exampleWorld(), r = w.regions[0];
      return {
        inputs: [row('지역', 'Region', r.name), row('곡물 가격', 'Grain price', r.market.grain.price, 'florin'), row('팔리는 비율', 'Sell-through', r4(sellThrough(r.market.grain)), 'pct')],
        steps: [row('부 3', 'Wealth 3', r2(tenantIncomePerWorker(w, r, 3)), 'florin'), row('부 5', 'Wealth 5', r2(tenantIncomePerWorker(w, r, 5)), 'florin')],
        result: [row('subsistenceWage (시드 1 첫날)', 'subsistenceWage (seed 1, day 0)', r2(subsistenceWage(w, r)), 'florin')],
      };
    },
    live: { pick: [], run: (w) => ({ bars: w.regions.map((r) => bar(regionLabel(r), r2(subsistenceWage(w, r)), 'florin')) }) },
    related: ['best-seat', 'ai-wages', 'migration', 'start-wealth'], seenIn: ['workforce', 'region'], source: ['market.ts tenantIncomePerWorker', 'labor.ts subsistenceWage'], design: ['4'],
  },
  {
    id: 'start-wealth', category: 'tenants', title: t('소작농 시작 부', 'Tenants\' starting wealth'),
    rule: t('소작농은 그 부 단계의 소작 수확 가치로 묶음을 살 수 있는 가장 높은 단계에서 시작한다.', 'Tenants start at the highest wealth step whose basket their tenant income can buy.'),
    params: [],
    live: {
      pick: [], run: (w) => ({
        bars: w.regions.map((r) => {
          const ps = w.pops.filter((x) => x.regionId === r.id && x.prof === 'peasant'), n = ps.reduce((a, x) => a + x.size, 0);
          return bar(regionLabel(r), r2(n > 0 ? ps.reduce((a, x) => a + wealthOf(x) * x.size, 0) / n : 0), '', 10);
        }),
      }),
    },
    related: ['tenant-income', 'wealth'], seenIn: ['pops'], source: ['market.ts affordableTenantWealth'], design: ['4'],
  },

  // ================================================================ 소유·금융
  {
    id: 'owner-buildings', category: 'ownership', title: t('저택과 금융가', 'Manors and financial districts'),
    rule: t('지역마다 저택(귀족)과 금융가(지분을 파는 펀드)가 저절로 생긴다. 둘 다 금고를 갖고 어떤 민간 건물의 레벨이든 짓거나 사서 갖는다. 소작 지대는 그 지역 저택이 받는다. 상급 귀족 자리 = 저택의 주간 경제 규모(가진 레벨 산출 + 소작지 수확, 기본가) ÷ {2}, 하루 {3}씩 다가간다. 자리를 넘는 귀족은 하급 귀족이 된다. 저택은 1레벨 자리 {0}, 가진 레벨마다 {1}자리. 금융가는 가진 레벨마다 전문가 {4}명이 일한다. 시작 상급 귀족은 지역 티어 값 × {5}.', 'Each region has a manor (nobles) and a financial district (a fund that sells units). Both keep a treasury and can build or buy levels of any private building. Tenant rent goes to the regional manor. High-noble seats = the manor\'s weekly economy (owned levels\' output + tenant harvest, base prices) ÷ {2}, approached {3} a day; nobles beyond the seats become gentry. Manors have {0} seats per level and {1} seats per owned level. Financial districts employ {4} experts per owned level. Starting high nobles = regional tier value × {5}.'),
    params: [p('1레벨 자리', 'Seats per level', () => OWNERSHIP_SEATS, 'people'), p('소유 레벨당 자리', 'Seats per owned level', () => OWNER_SEATS_PER_LEVEL, 'people'), tune('nobleEconPer', '귀족 자리 1당 경제 규모', 'Economy per noble seat', 'florin'), tune('nobleAdjust', '하루 조정 비율', 'Daily adjustment', 'pct'), tune('financeStaff', '금융가 레벨당 전문가', 'Experts per finance level', 'people'), tune('aristStart', '시작 귀족 배율', 'Starting noble multiple', 'x')],
    live: {
      pick: ['region'], run: (w, ctx) => {
        const r = regionOf(w, ctx), out: EncRow[] = [];
        for (const typeId of ['manor', 'finance']) {
          const o = w.buildings.find((b) => b.regionId === r.id && b.typeId === typeId);
          if (!o) continue;
          for (const h of holdingsOf(w, o)) out.push({ label: t(`${BUILDING_BY_ID[typeId].name} ← ${BUILDING_BY_ID[h.building.typeId].name}`, `${BUILDING_BY_ID[typeId].nameEn} ← ${BUILDING_BY_ID[h.building.typeId].nameEn}`), value: `${h.kind} ${Math.round(h.share * 100)}%` });
        }
        return { rows: out };
      },
    },
    related: ['shares', 'dividends', 'privatize', 'owner-treasury', 'rent-landtax'], seenIn: ['region', 'company'], source: ['economy.ts holdingsOf', 'production.ts updateOwnership'], design: ['3.2', '9.3'],
  },
  {
    id: 'shares', category: 'ownership', title: t('몫 나누기', 'Shares'),
    rule: t('소유 건물이 받은 돈은 앉은 사람에게 몫대로 나눈다: 귀족 1명 1몫, 하급 귀족 1명 {0}몫. 노동시장은 한 사람 몫을 임금처럼 비교한다.', 'Money an owner building receives is split by shares: one per noble, {0} per gentry. The labour market compares one person\'s share like a wage.'),
    formula: 'share wage = profitEma × weight ÷ Σ seated weights',
    params: [tune('gentryShare', '하급 귀족 몫', 'Gentry share')],
    related: ['owner-buildings', 'best-seat'], seenIn: ['region'], source: ['economy.ts shareWage', 'finance.ts payOwners'], design: ['3.2'],
  },
  {
    id: 'reserves', category: 'ownership', title: t('유보 자산', 'Building reserves'),
    rule: t('파는 건물과 건축사무소는 주간 이익의 최대 {0}를 유보 자산에 쌓는다. 찰수록 덜 쌓는다 (비었으면 {0}, 가득 차면 0). 상한 = 레벨 × 레벨당 주간 산출 가치(기본가) × {1}주. 사무소의 산출 가치는 기본 임금·기본가 자재로 센 하루 운영비 ÷ (1 − 사무소 이익률). 적자는 유보 자산에서 먼저 빠진다.', 'Selling buildings and construction offices put up to {0} of weekly profit into a reserve, less as it fills ({0} when empty, 0 when full), capped at level × weekly output value (base prices) × {1} weeks. An office\'s output value is its daily upkeep at base wages and prices ÷ (1 − office margin). Losses come out of the reserve first.'),
    formula: 'keep = profit × {0} × (1 − reserve / cap); cap = level × Σ out × base × 7 × {1}',
    params: [p('유보 비율', 'Reserve share', () => RESERVE_SHARE, 'pct'), tune('reserveWeeks', '상한 주 수', 'Cap in weeks', 'week')],
    example: () => {
      const v = weeklyOutputValue('farm', 'farm_basic');
      return {
        inputs: [row('곡물 농장 1레벨 주간 산출 가치', 'Grain farm weekly output value', v, 'florin'), row('레벨', 'Levels', 3, 'level')],
        steps: [row('주 수', 'Weeks', TUNE.reserveWeeks, 'week')],
        result: [row('reserveCap', 'reserveCap', reserveCap({ level: 3, typeId: 'farm', methodId: 'farm_basic' } as Building), 'florin')],
      };
    },
    related: ['dividends', 'profit', 'ai-utilization'], seenIn: ['company'], source: ['finance.ts settleReserve', 'finance.ts reserveCap'], design: ['9.3'],
  },
  {
    id: 'dividends', category: 'ownership', title: t('배당', 'Dividends'),
    rule: t('민간 건물은 유보 자산을 채우고 남은 이익을 매주 레벨 주인(저택·금융가)에게 레벨 수대로 보낸다. 왕실 건물(건축사무소 포함)의 이익은 국고 몫으로 국고에 남는다. 받은 몫의 자본가 {0}, 귀족 {1}는 그 금고에 남긴다. 민간 상회는 먼저 임금·원료 {2}주치를 운영 자금으로 남긴다.', 'Private buildings send profit beyond their reserve to their level owners (manors and districts) by level count weekly; crown building profit (construction offices included) stays in the treasury as its share. Capitalists keep {0} and nobles {1} of what they receive in their treasury. The private house first keeps {2} weeks of wages and inputs as working cash.'),
    params: [p('금융가 금고 몫', 'District keeps', () => KEEP_SHARE.finance, 'pct'), p('저택 금고 몫', 'Manor keeps', () => KEEP_SHARE.manor, 'pct'), tune('firmBufferWeeks', '상회 운영 자금 (주)', 'House working cash (weeks)', 'week')],
    related: ['reserves', 'owner-treasury', 'owner-buildings'], seenIn: ['company', 'finance'], source: ['finance.ts payDividends', 'finance.ts payOwners'], design: ['9.3'],
  },
  {
    id: 'owner-treasury', category: 'ownership', title: t('저택·금융가 금고', 'Manor and district treasuries'),
    rule: t('저택·금융가 금고에는 배당·지대 중 남기는 몫과 철거 대금이 들어온다. 금융가 금고에는 지분 산 돈, 상인 초과분과 주인 없는 돈이, 저택 금고에는 소작농의 넘는 저축이 들어온다. 민간 공사비는 금고가 낸다: 같은 지역(마음 × (1 + {0}))과 좋아하는 종류(저택은 땅 건물, 금융가는 그 밖, 아니면 × {1})부터 레벨 단위로 맡고, 모자라면 함께 낸다. 완공 레벨은 낸 돈 비율로 나누고 나머지 레벨은 많이 낸 쪽이 가진 뒤 차액을 돌려준다.', 'Manor and district treasuries receive the kept part of dividends and rent and salvage proceeds. Districts also receive money paid for units, trader excess and ownerless money; manors receive peasant savings above the cap. Treasuries pay for private construction: same region first (weight × (1 + {0})) and favoured kinds (manors: land buildings, districts: the rest, otherwise × {1}), whole levels each, pooling if short. Finished levels are split by money paid; leftover levels go to the larger payer, who refunds the difference.'),
    params: [tune('localBias', '같은 지역 가산', 'Same-region bonus', 'pct'), tune('ownerTilt', '좋아하지 않는 종류', 'Unfavoured kind', 'pct'), p('민간 상회 시작 운영 자금', 'Private house start cash', () => START_FIRM_CASH, 'florin')],
    live: { pick: [], run: (w) => ({ bars: w.kingdoms.map((k) => bar(t(k.name, k.nameEn), r2(k.investmentPool), 'florin')), rows: w.buildings.filter((b) => b.cash !== undefined).map((b) => row(`${regionById(w, b.regionId).name} ${BUILDING_BY_ID[b.typeId].name}`, `${regionNameEn(b.regionId)} ${BUILDING_BY_ID[b.typeId].nameEn}`, r2(b.cash ?? 0), 'florin')) }) },
    related: ['cash-surplus', 'dividends', 'privatize', 'ai-construction'], seenIn: ['finance'], source: ['finance.ts chooseFunders', 'production.ts giveLevels', 'kingdoms.ts toFinance'], design: ['9.3'],
  },
  {
    id: 'banking', category: 'ownership', title: t('국채와 이자', 'Crown bonds and interest'),
    rule: t('왕실만 빌린다. 국고가 모자라면 자동으로 국채(새 돈)를 {1} + 연간 총생산 × {2}까지 찍어 빌리고, 매주 2주치 임금과 유보 자산을 넘는 현금의 20%로 갚는다. 이자는 하루 {0}. 민간 상회는 빌리지 않는다: 현금이 모자라면 원료를 덜 사고 임금을 비례로 준다.', 'Only the crown borrows. When the treasury runs short it prints bonds (new money) up to {1} + yearly GDP × {2}, and each week repays with 20% of cash above two weeks of wages and reserves. Interest is {0} a day. Private houses never borrow: short of cash, they buy fewer inputs and pay wages in proportion.'),
    params: [p('하루 이자', 'Daily interest', () => DAILY_INTEREST, 'pct'), p('기본 한도', 'Base credit', () => BASE_CREDIT, 'florin'), p('국채 한도 비율', 'Bond limit share of GDP', () => STATE_CREDIT_GDP, 'pct')],
    live: {
      pick: [], run: (w) => ({
        rows: w.companies.filter((c) => c.state).map((c) => ({ label: t(c.name, c.name), value: `${Math.round(c.cash).toLocaleString()} / −${Math.round(c.debt).toLocaleString()} / ${Math.round(creditLimit(w, c)).toLocaleString()}` })),
      }),
    },
    related: ['mint', 'money-conservation'], seenIn: ['finance', 'company'], source: ['economy.ts creditLimit', 'finance.ts chargeInterest'], design: ['9.4'],
  },
  {
    id: 'mint', category: 'ownership', title: t('주조', 'Minting'),
    rule: t('매주 {0} + 주간 총생산 × {1}가 국고에 새로 생기고 세입으로 센다. 총생산 = 왕국 pop 소득 이동평균의 합.', 'Each week {0} + weekly GDP × {1} is minted into the treasury as revenue. GDP = sum of the kingdom\'s pop income EMAs.'),
    formula: 'mint = {0} + GDP_week × {1}',
    params: [p('기본 주조', 'Base mint', () => MINT_BASE, 'florin'), p('총생산 비율', 'GDP share', () => MINT_RATE, 'pct')],
    live: {
      pick: ['kingdom'], run: (w, ctx) => {
        const k = kingdomOfCtx(w, ctx), gdp = kingdomGdp(w, k.id);
        return { rows: [row('연간 총생산', 'Yearly GDP', Math.round(gdp), 'florin'), row('이번 주 주조', 'This week\'s mint', Math.round(MINT_BASE + gdp * TICKS_PER_WEEK / 360 * MINT_RATE), 'florin')] };
      },
    },
    related: ['money-conservation', 'banking', 'budget-steps'], seenIn: ['finance'], source: ['finance.ts mintMoney'], design: ['9.4'],
  },

  // ================================================================ 국가 재정
  {
    id: 'tax-laws', category: 'state', title: t('세법', 'Tax laws'),
    rule: t('세법은 하나만 쓴다. 토지세: 소작농 1인당 하루 {0}. 인두세: 소작농을 뺀 1인당 하루 {1}. 소득세: 소작농을 뺀 소득(임금·배당)의 {2} (자급 소득 면제). 시작 세법은 {3}. 인두세는 {7}, 소득세는 {8} 기술로 열린다. 열린 법은 금융가 자산 비율이 인두세 {5}, 소득세 {6} 이상일 때 바꾸기를 시작하고, {4}일 뒤(그동안은 옛 법) 조건이 아직 맞으면 바뀐다. 안 맞으면 실패하고 지금 법이 남는다.', 'One tax law at a time. Land tax: {0} a day per tenant. Poll tax: {1} a day per non-tenant. Income tax: {2} of non-tenant income (wages and dividends; subsistence is exempt). The starting law is {3}. Poll tax is unlocked by {7}, income tax by {8}. An unlocked law can start changing when the financial share is at least {5} (poll) or {6} (income); after {4} days (the old law applies meanwhile) it takes effect only if the condition still holds, otherwise the change fails and the current law stays.'),
    params: [tune('landTax', '토지세', 'Land tax', 'florin'), tune('pollTax', '인두세', 'Poll tax', 'florin'), tune('incomeTax', '소득세', 'Income tax', 'pct'), tune('taxLaw', '시작 세법', 'Starting law'), tune('lawDays', '바꾸는 날 수', 'Change days', 'day'), tune('lawPoll', '인두세 조건', 'Poll tax threshold', 'pct'), tune('lawIncome', '소득세 조건', 'Income tax threshold', 'pct'), p('인두세 기술', 'Poll tax tech', () => lawTech('poll')), p('소득세 기술', 'Income tax tech', () => lawTech('income'))],
    live: {
      pick: ['kingdom'], run: (w, ctx) => {
        const k = kingdomOfCtx(w, ctx), r = taxRates(k);
        return { rows: [row('세법', 'Law', k.taxLaw), row('토지세', 'Land tax', r.land, 'pct'), row('인두세', 'Poll tax', r.poll, 'florin'), row('소득세', 'Income tax', r.income, 'pct')] };
      },
    },
    related: ['tax-levels', 'collection', 'ai-tax-law', 'invest-law'], seenIn: ['finance'], source: ['finance.ts taxRates', 'finance.ts collectIncomeTax', 'policy.ts startLawChange'], design: ['9.1'],
  },
  {
    id: 'invest-law', category: 'state', title: t('투자법과 금융가 지분', 'Investment law and fund units'),
    rule: t('금융가는 투자 펀드다. 투자법이 허용한 계층의 pop은 남는 현금으로 그 지역 금융가 지분을 지분 값(금고 + 가진 레벨 공사비, ÷ 지분 수)에 사고, 배당을 지분 수대로 받는다. 되팔지 않는다. 처음은 귀족만. 전문가 / 기술자 / 노동자·농부까지 넓히는 법은 {6} / {7} / {8} 기술로 열리고, 금융가 자산 비율이 {0} / {1} / {2} 이상일 때 바꾸기를 시작한다. 세법과 같은 날 수 뒤 조건이 아직 맞아야 바뀐다. 금융가에서는 전문가가 가진 레벨 1당 {3}명 일하고 보장 임금 {4}와 받은 배당의 {5}를 성과급으로 받는다.', 'The financial district is a fund. Pops of the classes the investment law allows buy units of their regional district with spare cash at the unit value (treasury + build cost of owned levels, ÷ units) and receive dividends by units; units are never sold. At first only nobles may buy. Widening to experts / skilled / labourers and farmers is unlocked by {6} / {7} / {8} and can start at a financial share of {0} / {1} / {2}; after the same time as a tax law change it takes effect only if the condition still holds. Districts employ {3} experts per owned level at a base wage of {4} plus {5} of dividends received as a bonus.'),
    params: [tune('investUpper', '전문가까지', 'Up to experts', 'pct'), tune('investMiddle', '기술자까지', 'Up to skilled', 'pct'), tune('investLower', '노동자·농부까지', 'Up to labourers', 'pct'), tune('financeStaff', '레벨당 전문가', 'Experts per level'), tune('financeWage', '보장 임금', 'Base wage', 'florin'), tune('financeBonus', '성과급', 'Bonus', 'pct'), p('전문가 기술', 'Experts tech', () => lawTech('upper')), p('기술자 기술', 'Skilled tech', () => lawTech('middle')), p('노동자·농부 기술', 'Labourers tech', () => lawTech('lower'))],
    live: { pick: [], run: (w) => ({ bars: ownershipAssets(w).kingdoms.map((x) => bar(t(String(x.kingdomId), String(x.kingdomId)), x.ratio, 'pct', 1)), rows: w.kingdoms.map((k) => row(k.name, k.nameEn, `${k.taxLaw} / ${k.investLaw}`)) }) },
    related: ['tax-laws', 'owner-treasury', 'dividends'], seenIn: ['finance'], source: ['policy.ts ownershipAssets', 'market.ts investSurplus', 'finance.ts payFinance', 'finance.ts updateFunds'], design: ['9.1', '9.3'],
  },
  {
    id: 'tax-levels', category: 'state', title: t('세금 수준', 'Tax level'),
    rule: t('세율은 모두 세금 수준 단계로 정한다: 세법의 3단계 세율 × {0}. 계층별 세율은 없다. 1인당 세금은 시장 전에 걷고 저축을 넘게는 못 걷는다.', 'All rates follow the tax-level step: the law\'s step-3 rate × {0}. No per-class rates. Per-capita taxes are taken before the market and never exceed savings.'),
    params: [tune('taxLevels', '단계 배율', 'Step multiples', 'x')],
    related: ['tax-laws', 'budget-steps'], seenIn: ['finance'], source: ['finance.ts taxRates'], design: ['9.1', '9.2'],
  },
  {
    id: 'collection', category: 'state', title: t('징수율', 'Collection rate'),
    rule: t('징수율 = x ÷ (1 + x), x = 행정청 한도 ÷ 왕국 인구. 한도가 인구와 같으면 50%다. 모두에게 같은 비율로 덜 걷는다.', 'Collection = x ÷ (1 + x), x = administrative capacity ÷ population. Capacity equal to population collects 50%. Everyone is under-taxed by the same ratio.'),
    formula: 'ratio = x / (1 + x)   (taxCurve = hyp)',
    params: [tune('taxCurve', '곡선', 'Curve')],
    example: () => ({
      inputs: [row('왕국 인구', 'Population', 2_000_000, 'people'), row('행정청 한도', 'Capacity', 3_000_000, 'people')],
      steps: [row('x', 'x', 1.5)],
      result: [row('collectionRatio(3M, 2M)', 'collectionRatio(3M, 2M)', r4(collectionRatio(3_000_000, 2_000_000)), 'pct')],
    }),
    live: {
      pick: [], run: (w) => ({
        bars: w.kingdoms.map((k) => bar(t(k.name, k.nameEn), r4(collectionRatio(taxCapacity(w, k.id), kingdomPeople(w, k.id))), 'pct', 1)),
      }),
    },
    related: ['admin-capacity', 'tax-laws'], seenIn: ['finance'], source: ['economy.ts collectionRatio'], design: ['9.1'],
  },
  {
    id: 'admin-capacity', category: 'state', title: t('행정청 한도와 종이', 'Administrative capacity and paper'),
    rule: t('행정청 한도 = Σ {0}명 × {1} × 레벨 × 가동률 × 작업 인원 × 효율 × 원료 충족. 세습 관료제는 하급 귀족만, 전문 관료제는 기술자만 쓰고, 전문 관료제는 한도가 3배이고 종이를 쓴다. 시작 행정청은 왕국 인구 × {2}를 감당한다. 걷힌 세금은 한도 기여 비율대로 행정청 매출로 잡힌다.', 'Capacity = Σ {0} × {1} × level × util × crew × efficiency × input fill. Hereditary bureaucrats employ only gentry, professional bureaucrats only skilled workers; professional bureaucrats give 3× and consume paper. The starting administration covers population × {2}. Taxes count as administration revenue by capacity share.'),
    params: [p('1레벨 기본 인구', 'People per level', () => TAX_PEOPLE_PER_LEVEL, 'people'), tune('adminScale', '배율', 'Scale'), tune('adminStart', '시작 한도 ÷ 인구', 'Start capacity ÷ population'),
      p('세습 관료제 하급 귀족 (레벨당)', 'Gentry per hereditary level', () => getMethod('admin', 'admin_hereditary').workers.gentry ?? 0, 'people'),
      p('전문 관료제 기술자 (레벨당)', 'Skilled per professional level', () => getMethod('admin', 'admin_professional').workers.skilled ?? 0, 'people'),
      p('전문 관료제 종이 (레벨당 하루)', 'Paper per professional level/day', () => getMethod('admin', 'admin_professional').inputs.paper ?? 0, 'good')],
    live: {
      pick: ['kingdom'], run: (w, ctx) => {
        const k = kingdomOfCtx(w, ctx);
        const admins = w.buildings.filter((b) => b.typeId === 'admin' && regionById(w, b.regionId).kingdomId === k.id);
        return {
          rows: [row('한도', 'Capacity', Math.round(taxCapacity(w, k.id)), 'people'), row('인구', 'Population', Math.round(kingdomPeople(w, k.id)), 'people')],
          bars: admins.map((b) => bar(t(`${regionById(w, b.regionId).name} ${b.level}`, `${regionNameEn(b.regionId)} ${b.level}`), Math.round(adminCapacityOf(b)), 'people')),
        };
      },
    },
    related: ['collection', 'input-fill', 'ai-gov-inputs', 'ai-methods'], seenIn: ['finance', 'region'], source: ['finance.ts adminCapacityOf', 'data.ts admin'], design: ['9.1'],
  },
  {
    id: 'budget-steps', category: 'state', title: t('정책 단계', 'Policy steps'),
    rule: t('금액 편성은 없다. 손잡이는 세금 수준·국영 임금·연구비·복지의 네 단계(1~5, 3이 보통)다. 정부 건물(행정청·건축사무소·학교)은 늘 다 돈다. 행정청·학교는 국고가 운영비를 내고, 건축사무소는 공사 수수료로 운영비를 낸다. 국고가 비면 국채로 낸다. 수지 표는 손잡이별로 묶는다: 세금 수준 → 세금, 국영 임금 → 정부 건물 임금·국영 사업 손익(건축사무소 포함)·왕실 공사, 연구비 → 연구비, 복지 → 복지, 나머지(관세·주조·정부 건물 원료·국채 이자)는 손잡이가 없다.', 'There is no line-item budget. The knobs are four steps (1–5, 3 is normal): tax level, state wages, research, welfare. Government buildings always run at full. The treasury pays administration and schools; construction offices pay their way from construction fees. When the treasury is empty it issues bonds. The budget table groups lines by knob: tax level → taxes; state wages → government wages, state enterprises (construction offices included) and crown construction; research → research; welfare → welfare; the rest (tariffs, minting, government inputs, bond interest) has no knob.'),
    params: [tune('taxLevels', '세금 수준', 'Tax level', 'x'), tune('govWageLevels', '국영 임금', 'State wages', 'x'), tune('researchLevels', '연구비', 'Research', 'x'), tune('welfareLevels', '복지 목표 생활수준', 'Welfare target SoL')],
    live: {
      pick: ['kingdom'], run: (w, ctx) => {
        const k = kingdomOfCtx(w, ctx), bp = budgetPreview(w, k.id);
        return {
          rows: [row('세금 · 임금 · 연구 · 복지', 'Tax · wages · research · welfare', `${k.budget.tax} · ${k.budget.wages} · ${k.budget.research} · ${k.budget.welfare}`), row('주간 순수지', 'Weekly net', bp.net, 'florin')],
          bars: bp.lines.map((l) => bar(BUDGET_LINE_LABELS[l.key], l.weekly, 'florin')),
        };
      },
    },
    related: ['tax-levels', 'state-wages', 'research', 'treasury', 'ai-budget'], seenIn: ['finance'], source: ['finance.ts spendBudget', 'budget.ts budgetPreview'], design: ['9.2'],
  },
  {
    id: 'research', category: 'state', title: t('연구비', 'Research spending'),
    rule: t('주간 연구비 = 주간 경제 규모 × {0} × 연구비 단계 배율. 현금이 있는 만큼만 내고, 그 왕국 기술자(가중 {1})·전문가({2}) 소득이 된다.', 'Weekly research = weekly economic output × {0} × research step. Paid only from cash on hand; it becomes income of the kingdom\'s skilled (weight {1}) and experts ({2}).'),
    params: [tune('researchShare', '경제 규모 비율', 'Share of output', 'pct'), p('기술자 가중', 'Skilled weight', () => RESEARCHER_WEIGHT.skilled ?? 0), p('전문가 가중', 'Expert weight', () => RESEARCHER_WEIGHT.expert ?? 0)],
    live: {
      pick: ['kingdom'], run: (w, ctx) => {
        const k = kingdomOfCtx(w, ctx);
        return { rows: [row('주간 경제 규모', 'Weekly output', Math.round(k.output ?? 0), 'florin'), row('지난주 연구비', 'Last week\'s research', Math.round(k.lastBudget?.research ?? 0), 'florin')] };
      },
    },
    related: ['tech', 'budget-steps', 'ai-research'], seenIn: ['finance'], source: ['finance.ts spendBudget', 'finance.ts fundResearch'], design: ['9.2'],
  },
  {
    id: 'treasury', category: 'state', title: t('국고와 수지', 'Treasury and balance'),
    rule: t('주간 세입 = 세금 + 토지세 + 관세 + 주조. 지출 = 행정청·학교 임금·원료 + 연구비 + 이자 + 복지 + 왕실 공사(자기 건축사무소에 낸 수수료). 국영 사업 손익 = 왕실 생산 건물과 건축사무소의 매출 − 원료 − 임금으로, 국고에 바로 들고 난다. 사무소 매출에는 왕실 공사 수수료도 들어 있어 왕실 공사 줄과 서로 지운다. AI는 국고 ÷ 주간 지출(몇 주치)로 판단한다 (지출에서 건축사무소 손익을 빼고, 왕실 생산 건물 손익은 넣지 않는다). 시작 국고는 운영비 {0}주치다.', 'Weekly revenue = taxes + land tax + tariffs + mint. Spending = administration and school wages and inputs + research + interest + welfare + crown construction (fees paid to its own construction office). State enterprises = sales − inputs − wages of crown production buildings and construction offices; it goes straight into or out of the treasury. Office sales include the crown\'s own construction fees, which cancel against the crown construction line. AI judges the treasury in weeks of spending (spending net of the office\'s profit; production buildings left out). The start treasury is {0} weeks of upkeep.'),
    params: [tune('startTreasuryWeeks', '시작 국고', 'Start treasury', 'week')],
    live: {
      pick: ['kingdom'], run: (w, ctx) => {
        const k = kingdomOfCtx(w, ctx), gov = govOf(w, k), exp = k.expenseEma ?? 0;
        return { rows: [row('국고', 'Treasury', Math.round(gov?.cash ?? 0), 'florin'), row('빚', 'Debt', Math.round(gov?.debt ?? 0), 'florin'), row('주간 지출 이동평균', 'Weekly spending EMA', Math.round(exp), 'florin'), row('몇 주치', 'Weeks covered', exp > 0 ? r2((gov?.cash ?? 0) / exp) : '-', 'week'), row('지난주 국영 사업 손익', 'Last week\'s state enterprises', Math.round(k.lastBudget?.firms ?? 0), 'florin'), row('그중 건축사무소', 'Of which construction office', Math.round(k.lastBudget?.office ?? 0), 'florin'), row('지난주 왕실 공사', 'Last week\'s crown construction', Math.round(k.lastBudget?.build ?? 0), 'florin'), row('지난주 민간 공사 수수료', 'Last week\'s private construction fees', Math.round(k.lastBudget?.fees ?? 0), 'florin')] };
      },
    },
    related: ['budget-steps', 'ai-budget', 'mint'], seenIn: ['finance'], source: ['finance.ts spendBudget', 'budget.ts budgetPreview', 'budget.ts budgetDrill'], design: ['9', '9.2'],
  },
  {
    id: 'welfare', category: 'state', title: t('복지 (최저 생활수준 보장)', 'Welfare (minimum living standard)'),
    rule: t('매일 왕실은 복지법이 덮는 pop 중 생활수준이 목표보다 낮은 pop 에게, 그날 소득이 목표 소득에 모자란 만큼을 준다. 목표 = 복지 단계의 생활수준. 목표 소득 = (목표 + 1) 부 단계 묶음의 하루 비용 (부는 소득이 다음 단계 묶음 비용을 넘어야 오른다). 복지법: 없음 / 구빈법(소작농·실업자) / 임금 보조(임금 일자리) / 보편 보장(귀족·자본가를 뺀 모두). 하나만, 바꾸는 데 {0}일. 국고 현금이 모자라면 가진 만큼 같은 비율로 준다 (복지로 빚을 지지 않는다).', 'Each day the crown pays every covered pop whose living standard is below the target the amount its day\'s income falls short of the target income. Target = the welfare step\'s living standard. Target income = daily cost of the (target + 1) wealth basket (wealth only rises when income beats the next step\'s basket). Laws: none / poor laws (tenants and jobless) / wage subsidies (wage jobs) / universal (everyone but nobles and capitalists). One at a time, {0} days to change. If cash is short it pays what it has pro rata (no borrowing for welfare).'),
    formula: '지급 = max(0, 인구 × 목표 소득(1인) − (그날 현금 소득 + 현물 시장가))   (생활수준 < 목표인 대상 pop)',
    params: [tune('welfareLevels', '목표 생활수준 (단계 1~5)', 'Target SoL (steps 1–5)'), tune('lawDays', '바꾸는 날 수', 'Change days', 'day')],
    live: {
      pick: ['kingdom', 'region'], run: (w, ctx) => {
        const k = kingdomOfCtx(w, ctx), reg = w.regions.find((x) => x.id === ctx.regionId) ?? w.regions.find((x) => x.kingdomId === k.id)!;
        const T = welfareTarget(k.budget.welfare);
        return {
          rows: [row('복지법', 'Welfare law', `${k.welfareLaw}${k.lawChange?.welfare ? ' → ' + k.lawChange.welfare.to : ''}`), row('목표 생활수준', 'Target SoL', T),
            row('목표 소득 (1인 하루, 이 지역)', 'Target income (per head, this region)', r2(welfareIncome(reg, T)), 'florin'),
            row('지난주 복지', 'Last week\'s welfare', Math.round(k.lastBudget?.welfare ?? 0), 'florin')],
          bars: (['poor', 'wage', 'universal'] as const).map((l) => bar(t(l, l), -Math.round(welfareWeekly(k, l, k.budget.welfare)), 'florin')),
        };
      },
    },
    related: ['budget-steps', 'wealth', 'ai-welfare', 'treasury'], seenIn: ['finance'], source: ['welfare.ts payWelfare', 'policy.ts startLawChange'], design: ['9.5'],
  },
  {
    id: 'schools', category: 'state', title: t('학교', 'Schools'),
    rule: t('학교는 왕실만 짓고 땅을 쓰지 않는다. 귀족 가정교사는 레벨당 {0}명, 공립 학교(인쇄술)는 {1}명을 가르친다. 정원은 교육 접근도를 올린다.', 'Only crowns build schools, which use no land. Noble tutors teach {0} per level, public schools (printing press) {1}. Seats raise education access.'),
    params: [p('가정교사 정원', 'Tutor seats', () => getMethod('school', 'school_tutor').seats ?? 0, 'people'), p('공립 정원', 'Public seats', () => getMethod('school', 'school_basic').seats ?? 0, 'people')],
    live: {
      pick: [], run: (w) => ({
        bars: w.regions.map((r) => {
          const seats = w.buildings.filter((b) => b.regionId === r.id && b.typeId === 'school').reduce((a, b) => a + b.level * b.utilization * b.last.staffing * b.last.inputFill * (getMethod(b.typeId, b.methodId).seats ?? 0), 0);
          const n = regionPeople(w, r.id);
          return bar(regionLabel(r), r4(n > 0 ? Math.min(1, seats / n) : 0), 'pct', 1);
        }),
      }),
    },
    related: ['literacy', 'ai-schools'], seenIn: ['region', 'finance'], source: ['tick.ts updateEducation', 'data.ts school'], design: ['3.3', '7.1'],
  },

  // ================================================================ AI
  {
    id: 'ai-overview', category: 'ai', title: t('AI 한 주', 'An AI week'),
    rule: t('AI는 매주 회사마다 돈다 (플레이어 제외). 국영과 민간이 같은 판단을 쓴다. 다른 점은 자금원(국고 / 저택·금융가 금고)과, 세법·정책 단계·연구·사무소 증설은 왕실만 한다는 것이다.', 'AI runs weekly for every company except the player\'s. State and private use the same logic; they differ in funding (treasury / manor and district treasuries), and only crowns choose tax law, policy steps, research and office growth.'),
    formula: 'tax law → policy → wages → methods & utilisation → research → construction → demolition',
    params: [],
    related: ['ai-tax-law', 'ai-budget', 'ai-methods', 'ai-construction'], seenIn: [], source: ['ai.ts runAi'], design: ['10'],
  },
  {
    id: 'ai-tax-law', category: 'ai', title: t('세법 고르기', 'Choosing a tax law'),
    rule: t('4주마다, 기술로 열리고 조건이 맞는 세법 중 예상 세입이 지금의 {0}배를 넘는 것으로 바꾸기 시작한다. 바꾼 뒤 {1}일은 안 바꾼다. 투자법은 열리고 조건이 맞으면 한 칸씩 넓힌다. 바꾸기가 끝날 때 실패하면 그 법은 {1}일 동안 다시 시작하지 않는다.', 'Every 4 weeks, start switching to an unlocked law whose condition holds and whose expected revenue exceeds {0}× the current one. No switch again for {1} days. The investment law widens one step when unlocked and its condition holds. After a failed change the AI waits {1} days before trying that law again.'),
    params: [p('바꾸는 배율', 'Switch ratio', () => LAW_SWITCH, 'x'), p('쿨다운', 'Cooldown', () => LAW_COOLDOWN, 'day')],
    related: ['tax-laws'], seenIn: ['finance'], source: ['ai.ts chooseTaxLaw', 'finance.ts lawRevenue'], design: ['10'],
  },
  {
    id: 'ai-budget', category: 'ai', title: t('정책 사다리', 'Policy ladder'),
    rule: t('4주마다 한 칸 움직인다. 빚이 있거나 국고가 지출 {0}주치 미만이고 줄었으면 긴축 쪽으로, {1}주치를 넘고 줄지 않았으면 세금을 내린다. 사다리: 국영 임금 4 → 연구비 5·4 → 세금 1~5 → 연구비 2·1 → 연구 멈춤 → 국영 임금 2·1. 기술을 다 열면 풀 때 임금 지수 1 이하에서 국영 임금을 {2}단계까지 올리고, 지수가 1을 넘으면 되돌린다.', 'Every 4 weeks one step: toward austerity if in debt or below {0} weeks of spending and falling; tax cuts above {1} weeks and not falling. Ladder: state wages 4 → research 5·4 → tax 1–5 → research 2·1 → stop research → state wages 2·1. With every tech researched, loosening raises state wages up to step {2} while the wage index is at most 1, and steps back when it exceeds 1.'),
    params: [tune('treasuryLowWeeks', '조이는 선', 'Tighten below', 'week'), tune('treasuryHighWeeks', '푸는 선', 'Loosen above', 'week'), tune('doneWageMax', '기술 완료 후 임금 상한', 'Wage cap after research')],
    related: ['budget-steps', 'treasury', 'ai-schools', 'ai-welfare'], seenIn: ['finance'], source: ['ai.ts adjustBudget'], design: ['10'],
  },
  {
    id: 'ai-welfare', category: 'ai', title: t('복지 고르기', 'Choosing welfare'),
    rule: t('조일 때는 복지를 가장 먼저 줄인다 (단계를 1까지, 빚이 있으면 그다음 복지법을 끈다). 감당 = 국고 ≥ (복지를 뺀 주간 지출 + 그 복지의 주간 예상액) × {0}주. 다른 손잡이를 움직이지 않은 점검에서, 법마다 감당할 수 있는 가장 높은 단계에서 목표 소득에 모자란 사람이 가장 많은 법을 켜고(단계 1부터) 한 칸씩 올린다. 다른 법이 {1}배 넘게 많이 도우면 바꾼다 (바꾼 뒤 {2}일은 안 바꾼다). 조이지 않아도 국고가 줄며 {0}주의 절반 아래면 한 칸 내린다.', 'When tight, welfare is cut first (step down to 1, then, if in debt, the law is switched off). Affordable = treasury ≥ (weekly spending without welfare + that welfare\'s weekly estimate) × {0} weeks. On a check where no other knob moved, the crown enables the law that helps the most people short of the target income at the highest step it can afford (starting at step 1) and raises one step at a time. It switches law when another helps more than {1}× as many (not again for {2} days). When not tight but falling below half of {0} weeks, it steps down.'),
    params: [tune('welfareWeeks', '복지 감당 주 수', 'Welfare cover weeks', 'week'), p('법 바꾸기 배수', 'Switch factor', () => WELFARE_SWITCH, 'x'), p('바꾼 뒤 쉬는 날', 'Cooldown', () => WELFARE_COOLDOWN, 'day')],
    related: ['welfare', 'ai-budget'], seenIn: ['finance'], source: ['ai.ts adjustBudget', 'ai.ts raiseWelfare', 'ai.ts cutWelfare'], design: ['10', '9.5'],
  },
  {
    id: 'ai-methods', category: 'ai', title: t('방식 바꾸기', 'Switching methods'),
    rule: t('생산 건물은 산출 1단위당 이윤이 5% + 0.01 넘게 나은 방식으로 바꾼다 ({0}일 쿨다운). 지금 재직자를 더해도 일손을 {2} 이상 모을 수 없는 방식은 고르지 않고, 지금 방식이 {2} 미만으로 채워지고 일손도 없으면 이윤이 낮아도 일손을 구할 수 있는 방식으로 바꾼다. 사무소는 자재를 구할 수 있는 방식 중 포인트 최대. 행정청은 한도 × 원료 충족이 10% 넘게 큰 방식으로, 원료 없는 방식이면 충족 기억을 매주 {1}씩 1로 되돌린다.', 'Producers switch when profit per unit beats the current method by 5% + 0.01 ({0}-day cooldown). Methods that cannot be staffed to {2} (counting current workers) are skipped; a building under {2} staffed with no labour for its method moves to a staffable one even at lower profit. Offices take the highest-point method with available materials. Administrations take the method with 10% more capacity × fill; on a no-input method the fill memory drifts back to 1 by {1} a week.'),
    params: [p('쿨다운', 'Cooldown', () => SWITCH_COOLDOWN, 'day'), tune('adminFillRetry', '행정청 재시도', 'Administration retry', 'pct'), tune('minStaffing', '일손 기준', 'Staffing threshold', 'pct')],
    related: ['input-fill', 'admin-capacity', 'methods-rule'], seenIn: ['company'], source: ['ai.ts manageBuildings'], design: ['10'],
  },
  {
    id: 'ai-utilization', category: 'ai', title: t('가동률', 'Utilisation'),
    rule: t('유보 자산이 남아 있으면 줄이지 않는다. 4주 연속 크게 적자(마진 < −20%)면 −10% (최소 10%), 마진 > 0이면 +10%. 기상 조건 적자는 세지 않는다. 왕실 정부 건물은 늘 100%다.', 'No cuts while a reserve remains. Four weeks of heavy losses (margin < −20%) cut 10% (min 10%); positive margin adds 10%. Weather losses do not count. Crown government buildings stay at 100%.'),
    params: [],
    related: ['reserves', 'profit', 'harvest-conditions'], seenIn: ['company'], source: ['ai.ts manageBuildings'], design: ['10'],
  },
  {
    id: 'ai-research', category: 'ai', title: t('연구 고르기', 'Choosing research'),
    rule: t('국고가 조이지 않을 때 (가치 + 1) ÷ 비용 × 무작위 0.85~1.15가 가장 큰 기술을 고른다. 가치 = 여는 방식의 손익 개선(학교 기술은 모자란 자리 가치). 후속 기술 가치의 절반을 물려받는다.', 'When the treasury is not tight, pick the tech with the highest (value + 1) ÷ cost × random 0.85–1.15. Value = profit gain from unlocked methods (school techs: missing seat value), plus half of successors\' value.'),
    params: [],
    related: ['tech', 'research'], seenIn: ['finance'], source: ['ai.ts planResearch', 'outlook.ts techValue'], design: ['10'],
  },
  {
    id: 'ai-office', category: 'ai', title: t('사무소 늘리고 줄이기', 'Growing and shrinking offices'),
    rule: t('쓰인 포인트가 능력의 {0} 이상이고 대기가 {1}일을 넘으면, 빚 없고 국고가 넉넉할 때 늘린다 (사무소는 쓰지 않는 포인트에도 임금·자재를 내므로 수수료로 메워지지 않는다) (최소 max({2}, 지금의 {3})). 빈 레벨이나 남는 포인트가 {4}주 이어지면 헌다.', 'Grow when used points reach {0} of capacity and the queue exceeds {1} days, with no debt and a full treasury (unused points still cost wages and materials, which fees do not cover) (at least max({2}, {3} of current)). Shrink after {4} weeks of empty levels or spare points.'),
    params: [tune('officeUseFull', '사용률', 'Use threshold', 'pct'), tune('officeTargetDays', '대기 목표', 'Queue target', 'day'), p('최소 증설', 'Min block', () => OFFICE_BLOCK, 'level'), p('증설 비율', 'Growth share', () => OFFICE_GROWTH, 'pct'), tune('officeShrinkWeeks', '철거 주 수', 'Shrink weeks', 'week')],
    related: ['build-points', 'ai-demolition'], seenIn: ['company'], source: ['ai.ts planConstruction', 'ai.ts reviewLevels'], design: ['10'],
  },
  {
    id: 'ai-construction', category: 'ai', title: t('착공', 'Starting construction'),
    rule: t('주에 최대 {0}건. 연 손익 ÷ 공사비 > {1}이고 일손을 {2} 이상 ({3}일 안에) 모을 수 있는 후보 중, 덩어리({4}레벨)를 골라 점수 = 수익률 × 무작위 × (1 + {5} × 지역 자금 비율)이 가장 큰 것을 짓는다. 기상 조건이 걸린 땅은 뺀다.', 'Up to {0} starts a week. Candidates need yearly profit ÷ cost > {1} and {2} of jobs fillable within {3} days; chunks of {4} levels; score = return × random × (1 + {5} × local fund share). Land under a harvest condition is skipped.'),
    params: [tune('startsPerWeek', '주간 착공', 'Starts per week'), tune('minRoi', '최소 수익률', 'Minimum return', 'pct'), tune('minStaffing', '일손 기준', 'Staffing threshold', 'pct'), p('일손 기간', 'Staffing horizon', () => STAFFING_HORIZON, 'day'), p('덩어리', 'Chunks', () => CHUNKS.join(' / ')), tune('localBias', '지역 가산', 'Local bias', 'pct'),
      tune('lossBuildsPerWeek', '손해 후보 짓기 (주간)', 'Loss builds per week'), tune('lossTolerance', '손해 허용', 'Loss tolerance'), tune('schoolTaxMax', '학교 짓는 세금 상한', 'Max tax step for schools')],
    related: ['ai-outlook', 'owner-treasury', 'land'], seenIn: ['company'], source: ['ai.ts planConstruction', 'ai.ts pickProject'], design: ['10'],
  },
  {
    id: 'ai-outlook', category: 'ai', title: t('장기 손익 전망', 'Long-run valuation'),
    rule: t('가동률 1/0.75/0.5/0.25 중 손익이 가장 큰 값을 쓴다. 가격 = (장기 가격 + 현지 가격) ÷ 2. 장기 가격은 대륙 수요(공사 중 투입·대체 수요 포함)와 공급(공사 중 산출 포함)을 가격 공식에 넣은 값이다. 민간 임금은 max(지금 임금, 기본 × {0}).', 'Use the best of utilisation 1/0.75/0.5/0.25. Price = (long-run + local) ÷ 2; long-run price feeds continental demand (incl. pending inputs, substitution) and supply (incl. pending output) into the price formula. Private wages = max(current, base × {0}).'),
    params: [tune('investWage', '임금 바닥', 'Wage floor', 'x')],
    related: ['price-formula', 'ai-construction', 'substitution'], seenIn: [], source: ['outlook.ts valueMethod', 'outlook.ts marketOutlook'], design: ['10'],
  },
  {
    id: 'ai-demolition', category: 'ai', title: t('철거 판단', 'Demolition review'),
    rule: t('유보 자산으로 메우는 건물은 세지 않는다. 마지막 1레벨의 장기 손익이 {0}주 연속 마이너스면 레벨의 1/4(최소 1)을 철거 대기에 올린다. 다시 이익이면 취소한다. 720일이 지나도 50% 미만인 공사는 취소한다.', 'Buildings covering losses from reserves are skipped. If the last level\'s long-run profit is negative for {0} weeks, a quarter of the levels (min 1) are queued for demolition; cancelled if profitable again. Projects under 50% after 720 days are cancelled.'),
    params: [tune('shrinkWeeks', '연속 주 수', 'Weeks', 'week')],
    related: ['demolition', 'ai-swap', 'reserves'], seenIn: ['company'], source: ['ai.ts reviewLevels'], design: ['10'],
  },
  {
    id: 'ai-swap', category: 'ai', title: t('땅 바꾸기', 'Swapping land'),
    rule: t('땅이 없어 못 짓는 최고 후보의 수익률이 같은 땅 건물 중 최저 수익률의 {0}를 넘으면 그 건물을 후보 덩어리만큼 헌다. 정부 건물은 헐지 않는다.', 'If the best blocked candidate\'s return exceeds {0}× the worst return on that land type, that building is demolished by the candidate\'s chunk. Government buildings are never swapped.'),
    params: [tune('swapMult', '배수', 'Multiple', 'x')],
    related: ['land', 'ai-demolition'], seenIn: ['company'], source: ['ai.ts swapLand'], design: ['10'],
  },
  {
    id: 'ai-schools', category: 'ai', title: t('학교 판단', 'School decisions'),
    rule: t('목표 자리 = 인구 × (문해력 목표 {0} − 교육 바닥 − 부 × 0.005) ÷ 0.8. 자리 가치 = {1} × (1 + 문해력 부족 + 숙련 일자리 부족). 공익 − 인건비로 짓고, 세금이 {2}단계를 넘으면 새로 짓지 않는다.', 'Target seats = population × (literacy target {0} − education floor − wealth × 0.005) ÷ 0.8. Seat value = {1} × (1 + literacy gap + skilled-job gap). Built on public value − wages; none when tax is above step {2}.'),
    params: [tune('schoolTarget', '문해력 목표', 'Literacy target', 'pct'), tune('schoolValue', '자리 가치', 'Seat value', 'florin'), tune('schoolTaxMax', '세금 상한', 'Tax step cap')],
    related: ['schools', 'literacy', 'ai-budget'], seenIn: ['finance'], source: ['ai.ts schoolValuation', 'ai.ts schoolWanted'], design: ['10'],
  },
  {
    id: 'ai-gov-inputs', category: 'ai', title: t('정부 원료 확보', 'Securing government inputs'),
    rule: t('왕실은 행정청이 쓸 원료(전문 관료제의 종이)를 왕국 안에서 댈 만큼 생산 건물을 직접 짓고 공사 맨 앞에 둔다. 국고가 조이지 않으면 남길 돈 선을 넘어서도 짓는다.', 'Crowns build enough producers inside the kingdom for administration inputs (paper for professional bureaucrats) and put them first in the queue, even beyond the cash reserve line unless the treasury is tight.'),
    params: [],
    related: ['admin-capacity', 'ai-construction'], seenIn: ['company'], source: ['ai.ts secureGovInputs'], design: ['10'],
  },
  {
    id: 'tuning', category: 'basics', title: t('조정값 목록', 'Tuning values'),
    rule: t('조정값(TUNE)은 여러 값을 20년 × 시드 1·2로 비교해 데이터로 고른다. 각 값은 그 규칙 항목에 실려 있다.', 'Tuning values (TUNE) are chosen by comparing several values over 20 years × seeds 1·2. Each value is listed under its rule.'),
    params: [p('조정값 수', 'Tuning values', () => Object.keys(TUNE).length - TUNE_EXPERIMENTAL.length)],
    related: ['price-formula', 'tax-laws'], seenIn: [], source: ['data.ts TUNE'], design: ['11'],
  },
];

/** id → 항목 */
export const ENCYCLOPEDIA_BY_ID: Record<string, EncEntry> = Object.fromEntries(ENCYCLOPEDIA.map((e) => [e.id, e]));

/** 규칙·공식의 {n} 을 params[n] 의 값으로 채운다 (format 은 화면이 숫자를 쓰는 법) */
export function fillText(text: string, e: EncEntry, format: (v: number | string, unit: EncUnit) => string): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => {
    const prm = e.params[Number(i)];
    return prm ? format(prm.value(), prm.unit ?? '') : `{${i}}`;
  });
}

/** live 의 기본 고르기 값 */
export function defaultCtx(w: World): EncCtx {
  const k = w.kingdoms[0];
  const r = w.regions.find((x) => x.kingdomId === k.id) ?? w.regions[0];
  return { regionId: r.id, good: 'grain', kingdomId: k.id, building: 'farm' };
}

/** 고를 수 있는 건물 (live 의 building 고르기용) */
export const ENC_BUILDINGS = BUILDING_TYPES.filter((b) => !b.auto).map((b) => b.id);
