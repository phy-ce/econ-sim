// ---- 정적 데이터 정의 ----

/**
 * 상품 id. 화면의 아이콘이 이 id에 묶여 있어서 id는 예전 것을 그대로 쓰고 이름만 바꾼다.
 * fuel = 석탄, food = 식료품, metal = 철, electronics = 기계
 */
export type GoodId =
  | 'grain' | 'fiber' | 'timber' | 'ore' | 'fuel'
  | 'food' | 'cloth' | 'metal'
  | 'tools' | 'furniture' | 'electronics'
  | 'transport'
  | 'luxury_furniture' | 'luxury_cloth'
  | 'meat'
  | 'paper';

/** 소유 직종: 민간 건물에서는 배당을, 국영 건물에서는 임금을 받는 일자리 */
export type Owner = 'capitalist' | 'aristocrat';
export const OWNERS: Owner[] = ['capitalist', 'aristocrat'];

/** 일자리 직종 (빅토리아3: 소유주도 건물의 일자리다) */
export type Skill = 'unskilled' | 'farmer' | 'skilled' | 'expert' | 'gentry' | Owner;
export const SKILLS: Skill[] = ['unskilled', 'farmer', 'skilled', 'expert', 'gentry', 'capitalist', 'aristocrat'];
/** 하층 일자리 (노동자·농부): 자격 없이 귀족·자본가 말고 누구나 들어갈 수 있다 */
export const LOWER_JOBS: Skill[] = ['unskilled', 'farmer'];
export const isLowerJob = (s: PopClass): boolean => s === 'unskilled' || s === 'farmer';

/** 직종 = 일자리 직종 + 소작농 */
export type PopClass = Skill | 'peasant';
export const POP_CLASSES: PopClass[] = ['unskilled', 'farmer', 'skilled', 'expert', 'gentry', 'peasant', 'capitalist', 'aristocrat'];

export const WEALTH_MIN = 1;
export const WEALTH_MAX = 99;

export type Stratum = 'lower' | 'middle' | 'upper';

export interface ClassDef {
  id: PopClass;
  name: string;
  nameEn?: string;
  stratum: Stratum;
  description: string;
  descriptionEn?: string;
}

/** 땅 종류. ore 는 광맥(철·석탄 매장량의 합)이다 */
export type LandType = 'arable' | 'forest' | 'ore' | 'plot';
export const LAND_TYPES: LandType[] = ['arable', 'forest', 'ore', 'plot'];

/** 기상 조건 종류 (빅토리아3 harvest conditions 중 셋) */
export type HarvestKind = 'drought' | 'flood' | 'wildfire';
export interface HarvestDef {
  id: HarvestKind;
  name: string;
  nameEn: string;
  /** 산출이 깎이는 땅 (그 땅의 건물과 소작지) */
  lands: LandType[];
}
/** 한 지역에 지금 걸린 기상 조건 (economy.ts harvestCondition). 저장하지 않고 시드·지역·날짜로 다시 계산한다 */
export interface HarvestCondition {
  kind: HarvestKind;
  lands: LandType[];
  intensity: number;
  /** 산출 감소율 = 강도 × 5% */
  cut: number;
  /** 진원지 지역 (이웃에서 번져 왔으면 그 이웃) */
  origin: number;
  /** 진원지에서 시작한 틱, 끝나는 틱 (end 틱부터 평년) */
  start: number;
  end: number;
}

/** 매장량 자원 */
export type DepositId = 'iron' | 'coal';
export const DEPOSITS: DepositId[] = ['iron', 'coal'];

export type GoodBag = Partial<Record<GoodId, number>>;
export type SkillBag = Partial<Record<Skill, number>>;

export interface GoodDef {
  id: GoodId;
  name: string;
  nameEn?: string;
  basePrice: number;
  /** 서비스 상품: 쌓아 둘 수 없고 지역 밖으로 옮길 수 없다 */
  perishable?: boolean;
}

/** 산업 유형 (data.ts INDUSTRIES): 1차(노동 집약) · 가공(원료 집약) · 중공업 · 숙련(사치품). 기본 방식의 일꾼 수·숙련 비율·원료 비중을 정한다 */
export type Industry = 'primary' | 'processing' | 'heavy' | 'luxury';

export interface IndustryDef {
  id: Industry;
  name: string;
  nameEn: string;
  /** 기본 방식 레벨당 일꾼 합계 */
  workers: number;
  /** 기본 방식 기술자·전문가 비율 (농부만 쓰는 농장·목장은 0) */
  skillShare: number;
  /** 기본 방식 원료비 ÷ 매출 범위 (기본가) */
  inputShare: [number, number];
}

export interface MethodDef {
  id: string;
  name: string;
  nameEn?: string;
  /** 이 방식만 건물과 다른 산업 유형일 때 (방직·가구 공방의 사치품 방식) */
  industry?: Industry;
  /** 이 방식을 쓰려면 회사가 연구해야 하는 기술. 없으면 처음부터 쓸 수 있다 */
  tech?: string;
  /** 레벨 1당 일자리 (노동 인구 기준) */
  workers: SkillBag;
  /** 레벨 1당, 만원 가동 시 하루 투입 */
  inputs: GoodBag;
  /** 레벨 1당, 만원 가동 시 하루 산출 */
  outputs: GoodBag;
  /** 건축사무소: 레벨당 하루 건설 포인트 */
  construction?: number;
  /** 학교: 1레벨이 가르치는 인구 */
  seats?: number;
  /** 행정청: 레벨당 감당하는 인구 (× TUNE.adminScale, 징세 한도) */
  taxCapacity?: number;
}

export interface BuildingTypeDef {
  id: string;
  name: string;
  nameEn?: string;
  /** 쓰는 땅 (1레벨 = 1칸). 없으면 땅을 쓰지 않아 어느 지역에나 레벨 제한 없이 지을 수 있다 (행정청·학교, 빅토리아3 정부 건물) */
  land?: LandType;
  /** 광산: 이 매장량 안에서만 지을 수 있다 */
  deposit?: DepositId;
  methods: MethodDef[];
  /** 1레벨 완공에 필요한 건설 포인트 */
  buildPoints: number;
  /** 산업 유형 (생산 건물만. 소작지·소유 건물·학교·건축사무소·행정청은 없다) */
  industry?: Industry;
  /** 자동으로 생기는 건물(소작지, 저택, 금융가): 짓거나 헐 수 없다 */
  auto?: boolean;
  /** 소유 건물: 이 직종이 일하며 지역 민간 건물의 배당을 받는다 (저택 = 귀족, 금융가 = 자본가) */
  ownership?: Owner;
  /** 왕실만 지을 수 있다 (행정청, 학교) */
  stateOnly?: boolean;
}

export interface TechDef {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  cost: number;
  requires: string[];
}

export type NeedId = 'nourishment' | 'heating' | 'clothing' | 'standard_clothing' | 'crude_items' | 'household' | 'luxury' | 'meat';

export interface NeedDef {
  id: NeedId;
  name: string;
  nameEn?: string;
  /** 필요 1단위(기본가 1어치)를 채우는 상품 수량. max: 그 상품이 채울 수 있는 최대 비중. appeal > 1: 가공품 */
  options: { good: GoodId; units: number; max?: number; appeal?: number }[];
}

export interface SkillDef {
  id: Skill;
  name: string;
  nameEn?: string;
  baseWage: number;
}

export interface RegionDef {
  id: number;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  /** 해외 무역(수입·수출)이 가능한 개항장 */
  spaceport: boolean;
  neighbors: number[];
  /** 산림 칸 수와 자원별 광맥 잠재량 (지형, 고정. 아직 못 찾은 것 포함). 농지·부지·인구·교육은 티어로 정한다 (data.ts TIERS) */
  forest: number;
  veins: Record<DepositId, number>;
  perks: Partial<Record<string, number>>;
}

// ---- 월드 상태 (모두 직렬화 가능한 순수 객체) ----

/**
 * pop: 같은 지역, 같은 직종, 같은 일터의 사람 묶음 (빅토리아3 방식).
 * 소득은 자기 일터에서만 나온다. 일터 0 은 실업.
 */
export interface Pop {
  id: number;
  regionId: number;
  prof: PopClass;
  /** 일하는 건물 id (소작지 포함). 0 이면 실업 */
  work: number;
  /** 부양가족 포함 인구 */
  size: number;
  savings: number;
  /** 부 단계 1..99 (소수, 하루에 조금씩 움직인다) */
  wealth: number;
  /** 문해력 0..1 */
  literacy: number;
  /** 다른 직종의 자격을 갖춘 노동 인구 수 */
  quals: Partial<Record<PopClass, number>>;
  incomeEma: number;
  lastIncome: number;
  lastSpend: number;
  /** 직전 틱 소비 묶음 충족률, 식량 충족률 */
  fulfillment: number;
  food: number;
  /** 직전 틱 생활수준 */
  sol: number;
  /** 직전 틱 인구 증감률 (연 %) */
  growth: number;
  /** 소작으로 직접 얻어 먹는 현물 */
  inKind: GoodBag;
  /** 금융가 지분: 금융가 건물 id (오름차순) 와 그 지분 수 (사람을 따라 옮긴다, pops.ts fundOf·addFund). 11판부터 (10판은 id → 지분 수 객체) */
  fund?: FundUnits;
}

/** 금융가 지분 묶음: id[i] 건물의 지분 u[i]. id 는 오름차순 (객체 키 대신 배열: 사전형 객체보다 몇 배 빠르다) */
export interface FundUnits { id: number[]; u: number[] }

/** 부 단계 1..99, 문해력 0..1, 교육 접근도 0..1 */
export const wealthOf = (p: Pop) => p.wealth;
export const literacyOf = (p: Pop) => p.literacy;
export const educationOf = (r: { education: number }) => r.education;
/** 건물 숙련도 0..1, 작업 인원 0..1 (작업 인원이 아직 없으면 충원율) */
export const expOf = (b: { exp: number }) => b.exp;
export const crewOf = (b: { crew?: number; last: { staffing: number } }) => b.crew ?? b.last.staffing;

export interface Building {
  id: number;
  typeId: string;
  regionId: number;
  companyId: number;
  level: number;
  methodId: string;
  active: boolean;
  /** 가동률 0..1 */
  utilization: number;
  /** 국영 건물: 이익은 국고에 남고, 소유 직종 자리도 임금을 받는다. 레벨은 모두 국가 것이다 */
  stateOwned?: boolean;
  /**
   * 민간 건물의 레벨 주인: 소유 건물(저택·금융가) id → 그 건물이 가진 레벨 수 (합 = level). 주인은 공사비를 낸 곳이다.
   * 국영 건물과 자동 건물(소작지·저택·금융가)에는 없다 (economy.ts levelOwnersOf)
   */
  owners?: Record<number, number>;
  /**
   * 소유 건물(저택·금융가)의 금고: 레벨을 사고 민간 공사비를 낸다 (돈 계정).
   * 무역소의 금고: 그날 이 지역에서 살 수 있는 돈. 레벨 × 방식의 레벨당 유보액(data.ts tradeReserveOf)을 넘는 돈은 매일 회사로 넘어간다 (market.ts)
   */
  cash?: number;
  /** 왕실 건물의 민영화: 켜 두면 저택·금융가가 매주 1레벨씩 사 갈 수 있다 (ai.ts buyLevels) */
  privatize?: boolean;
  /** 금융가 지분 1개 값 = (금고 + 가진 레벨의 공사비) ÷ 지분 수 (매주, finance.ts updateFunds) */
  nav?: number;
  /** 금융가: 마지막으로 민간 공사비를 맡은 날 (TUNE.financeIdle 이 켜졌을 때만 쓴다, finance.ts financeIdle) */
  fundedTick?: number;
  /** 소작지: 일하는 소작농 (노동 인구) */
  tenants?: number;
  /** 저택: 상급 귀족 자리 (노동 인구). 저택이 가진 건물 레벨과 소작지 칸으로 정한다 (production.ts updateOwnership) */
  nobleSeats?: number;
  lastSwitchTick: number;
  /** 숙련도 0..1 (가동하는 날마다 EXP_GAIN 씩 오른다), expOf(b) */
  exp: number;
  /** 실제로 손이 맞는 작업 인원 0..1: 충원율을 하루 CREW_RATE 씩 따라간다. 없으면 충원율 (crewOf(b)) */
  crew?: number;
  /** 건축사무소가 할 일이 없어 인부를 해산한 상태 */
  idle: boolean;
  /** 건축사무소: 맡은 공사 없이 이어진 날 수 (TUNE.officeIdleDays 를 넘으면 인부를 해산한다) */
  idleDays?: number;
  /** 직종별 고용 (노동 인구 기준, pop 에서 합산) */
  employed: Record<Skill, number>;
  /** 투입재 보관분 */
  stock: GoodBag;
  /** 어제 만든 산출물. 오늘 시장에 내놓고, 못 판 것은 사라진다 (재고 없음) */
  outStock: GoodBag;
  unpaid: boolean;
  last: BuildingStats;
  profitEma: number;
  /** 원료 충족률 이동평균 (원료가 있는 방식으로 돌 때 하루 0.95/0.05). 원료가 없는 방식이면 AI 가 천천히 1로 되돌린다. AI 판단용 (행정청 방식). 없으면 1 */
  fillEma?: number;
  /** 유보 자산 (빅토리아3): 이익의 일부를 레벨 × 레벨당 주간 산출 가치(기본가) × TUNE.reserveWeeks 까지 쌓고, 적자는 여기서 먼저 뺀다. 돈은 회사 현금 안에 있다 (finance.ts settleReserve). 없으면 0 */
  reserve?: number;
  /**
   * 화면 표시용 (sim은 읽지 않는다): 지난 주간 정산 (finance.ts payDividends, 매주 덮어쓴다).
   * reserve = 그 주 유보 자산 증감 (적자를 메우면 음수), paid = 배당을 받은 소유 건물(저택·금융가) id → 금액.
   * 주인 없는 레벨의 몫은 그 지역 금융가 id 로 (금융가가 없으면 0). 국영 건물은 paid 가 비어 있고 crown 에 국고 몫(유보 자산을 뺀 이익, 국고에 남는다)을 적는다. 자동 건물에는 없다
   */
  payout?: { reserve: number; paid: Record<number, number>; crown?: number };
  /**
   * 화면 표시용 (sim은 읽지 않는다): 왕실 생산 건물과 건축사무소(국고가 운영비를 내지 않는 국영 건물)의 하루 매출·원료비 이동평균 (매일, 0.95/0.05, 처음 8주는 0.85/0.15).
   * 예산 미리보기의 국영 사업 손익 줄(budget.ts stateFirms)이 쓴다
   */
  firmEma?: { sales: number; inputs: number };
  lossWeeks: number;
  pausedWeeks: number;
  /** 철거 대기 레벨: 매주 1레벨씩 헐린다 */
  shrinking?: number;
  /** 땅 바꾸기나 국고 적자(학교)로 헐리는 중 (이익이 나도 철거를 취소하지 않는다) */
  swap?: boolean;
  /** 마지막 레벨의 손익이 마이너스였던 연속 주 수 (철거 판단) */
  negWeeks?: number;
  /** 생산 건물의 투입 충족이 0.5 미만이었던 연속 주 수 (AI, TUNE.starveWeeks). 없으면 0 (16판에서 생겼다) */
  starvedWeeks?: number;
  /** 건축사무소: 그 연속 주 동안 일하던 주의 가장 높은 충원율 (한 번도 사람이 차지 않은 레벨을 센다) */
  staffPeak?: number;
  /** 1레벨을 지을 때 들어간 자재 (철거하면 TUNE.salvageShare 만큼 돌려받는다) */
  materials?: GoodBag;
}

/** 철거로 회수한 자재: TUNE.salvageDays 동안 나눠 팔고, 대금은 헐린 레벨의 주인이 받는다 */
export interface SalvageLot {
  regionId: number;
  good: GoodId;
  q: number;
  days: number;
  companyId: number;
  /** 대금을 받을 소유 건물(저택·금융가) id. null 이면 건물 주인 회사(국영 레벨은 국고) */
  ownerId: number | null;
}

export interface BuildingStats {
  revenue: number;
  inputCost: number;
  wageCost: number;
  staffing: number;
  inputFill: number;
  output: GoodBag;
  points: number;
  /** 그날 매출 중 행정청 몫으로 잡힌 세금 (장부에서 판매와 나눠 적는다) */
  tax?: number;
  /** 그날 매출 중 공사 수수료 (건축사무소, 장부에서 판매와 나눠 적는다) */
  fee?: number;
}

export interface Construction {
  id: number;
  companyId: number;
  regionId: number;
  typeId: string;
  methodId: string;
  targetBuildingId: number | null;
  levels?: number;
  points: number;
  required: number;
  spent: number;
  ticksElapsed: number;
  /** 일시정지된 공사는 건설 포인트를 받지 않는다 */
  paused?: boolean;
  /** 민간 공사의 공사비를 내는 소유 건물(저택·금융가) id → 약정액. 날마다 공사비를 약정액 비율로 나눠 내고, 완공 레벨도 그 비율로 나눈다 */
  funders?: Record<number, number>;
  /**
   * 무역소 공사에 묶인 돈 (돈 계정): 착공할 때 레벨당 data.ts tradeEscrowPerLevel 을 낸다. 완공되면 무역소 금고로, 취소되면 낸 곳으로 돌아간다.
   * escrowFrom = 낸 소유 건물(저택·금융가) id → 금액. 없으면 공사 주인 회사가 낸 것이다
   */
  escrow?: number;
  escrowFrom?: Record<number, number>;
}

export interface Research {
  /** 지난주에 쌓은 연구 포인트 (주간, 화면용 기록). 왕국 문해력으로 정한다 (finance.ts researchPoints). 고른 기술이 없으면 0 */
  points: number;
  current: string | null;
  /** 기술별로 쌓은 연구 포인트 (기술을 바꿔도 남는다) */
  progress: Record<string, number>;
  known: string[];
}

export interface Company {
  id: number;
  name: string;
  isPlayer: boolean;
  color: string;
  /** 소속 왕국 */
  kingdomId: number;
  /** 국영(왕국 정부) 회사인가. 국영 회사의 현금이 그 왕국의 국고다 */
  state: boolean;
  cash: number;
  wages: Record<Skill, number>;
  /** 지난주 직종별 고용 인원 (AI가 실제로 사람이 찼는지 보고 임금을 정한다) */
  lastEmployed?: Partial<Record<Skill, number>>;
  weekProfit: number;
  lastWeekProfit: number;
  weekStartCash: number;
  wageOffset: Record<Skill, number> | null;
  debt: number;
  revenueEma: number;
  /** 화면 호환용 (부실 제도는 없앴다. 늘 0). UI_CHANGES 2-17 반영 뒤 지운다 */
  distressWeeks: number;
  buildPoints: number;
  buildCost: number;
  /** 건축사무소 포인트 중 공사에 실제로 쓰인 하루 양의 이동평균 (왕실, AI가 사무소 크기를 정한다) */
  buildUsed?: number;
  research: Research;
  /** 이번 주 수입·지출 내역과 지난주 내역 (재정 화면용) */
  ledger: Ledger;
  lastLedger: Ledger;
}

/**
 * 회사 장부 항목. 손익(weekProfit)에 들어가는 것: 판매, 세금, 주조, 공사 수수료(수입) / 임금, 원자재, 이자, 복지(왕실, 지출).
 * 손익 밖의 자본 흐름: 배당 지급, investment(왕실: 민영화로 판 레벨 대금), 낸 공사비(건물이라는 자산으로 바뀐다).
 * 단, 왕실 공사가 자기 건축사무소에 낸 수수료는 buildPaid 에 적고 손익에서도 빼서, buildFees(사무소 매출) 쪽의 같은 돈과 상쇄한다
 */
export const LEDGER_KEYS = ['sales', 'tax', 'mint', 'buildFees', 'wages', 'inputs', 'interest', 'welfare', 'dividends', 'investment', 'buildPaid'] as const;
export type LedgerKey = (typeof LEDGER_KEYS)[number];
export type Ledger = Record<LedgerKey, number>;
export const emptyLedger = (): Ledger => Object.fromEntries(LEDGER_KEYS.map((k) => [k, 0])) as Ledger;

/** 지역 계층별 합계 (pop 을 합산한 화면용 요약) */
export interface Household {
  skill: PopClass;
  population: number;
  savings: number;
  wealth: number;
  sol: number;
  fulfillment: number;
  food: number;
  inKind: GoodBag;
  incomeEma: number;
  lastIncome: number;
  lastSpend: number;
  consumed: GoodBag;
}

export interface MarketGood {
  price: number;
  /** 지역 생산자들의 팔리지 않은 재고 합 */
  inventory: number;
  /** 오늘 구매 주문량, 판매 제안량 */
  demand: number;
  supply: number;
  demandEma: number;
  supplyEma: number;
  sold: number;
  volumeEma: number;
  shippedIn: number;
  shippedOut: number;
  /** 출처별 수요·공급 (pop:<직종>, bld:<건물>, trader, export, import, subsistence) */
  demandBy?: Record<string, number>;
  supplyBy?: Record<string, number>;
  demandByEma?: Record<string, number>;
  supplyByEma?: Record<string, number>;
}

export interface Region {
  /** 발전 단계 1(대도시)~4(변경), 시작값을 정한 티어 */
  tier?: number;
  id: number;
  name: string;
  description: string;
  spaceport: boolean;
  neighbors: number[];
  kingdomId: number;
  /** ore 는 찾은 광맥(deposits)의 합이다 (화면용. 광산은 자원별 deposits 로 막힌다) */
  land: Record<LandType, number>;
  /** 찾은 광맥 레벨 수 (자원별). 잠재량(RegionDef.veins)까지 탐광으로 늘어난다 */
  deposits: Record<DepositId, number>;
  /** 교육 접근도 0..1 (학교 정원 비율을 따라간다). pop 의 문해력이 이것을 따라간다 */
  education: number;
  /** pop 합산 (화면용). 매 틱 다시 채운다 */
  households: Record<PopClass, Household>;
  market: Record<GoodId, MarketGood>;
  /**
   * 이 지역에서 내보내는 교역 (매일, 0.95/0.05 이동평균, market.ts addTraderOrders). AI 무역소 판단용.
   * buy = 무역소 금고로 산 하루 매입 주문액, cut = 금고가 모자라 잘린 주문액 (무역소가 없으면 내려던 주문 전부), margin = 주문의 기대 이익률 (값 차이 − 운임 − 관세, 매입액 대비).
   * 없으면 0 (16판에서 생겼다)
   */
  trade?: { buy: number; cut: number; margin: number };
}

export interface Kingdom {
  id: number;
  name: string;
  nameEn: string;
  color: string;
  /** 국영 회사 id (현금이 국고) */
  governmentId: number;
  /** 민간 상회 id 목록 */
  privateIds: number[];
  /** 수입 관세율 (상품별, 없으면 기본값) */
  tariff: Partial<Record<GoodId, number>>;
  /** 화면 표시용 사본 (소수 둘째 자리). sim은 읽지 않는다: 그 왕국 저택·금융가 금고의 합 (투자 풀은 없앴다, round.ts writePool) */
  investmentPool: number;
  /** 세법 (하나만): 'land' 토지세 = 소작농 1인당 정액, 'poll' 인두세 = 소작농을 뺀 1인당 정액, 'income' 소득세 = 소작농을 뺀 소득(임금·배당) × 세율. 세율은 taxRates */
  taxLaw: TaxLaw;
  /** 투자법: 금융가 지분을 살 수 있는 계층 (INVEST_CLASSES). 시작 'nobles' */
  investLaw: InvestLaw;
  /** 바뀌는 중인 법 (TUNE.lawDays 일 뒤에 바뀐다. 그동안은 지금 법) */
  lawChange?: { tax?: LawChange<TaxLaw>; invest?: LawChange<InvestLaw>; welfare?: LawChange<WelfareLaw> };
  /** 마지막으로 세법을 바꾼 틱 */
  lawTick?: number;
  /** 법 바꾸기가 끝날 때 조건이 안 맞아 실패한 마지막 틱 (AI는 LAW_COOLDOWN 동안 다시 시작하지 않는다) */
  lawFail?: { tax?: number; invest?: number };
  /** 복지법 (하나만, welfare.ts): 'none' 없음 / 'poor' 구빈법(소작농·실업자) / 'wage' 임금 보조(임금 일자리) / 'universal' 보편 보장(귀족을 뺀 모두). 목표 생활수준은 복지 단계(TUNE.welfareLevels) */
  welfareLaw: WelfareLaw;
  /** 마지막으로 복지법을 바꾼 틱 */
  welfareTick?: number;
  /**
   * 복지 필요액 (하루, 이동평균 0.9/0.1, welfare.ts): 무리(poor 소작농·실업자 / wage 임금 일자리)마다 복지 단계 1~5 각각에서
   * 목표 소득에 모자란 돈의 합(need, 지급 규칙대로 생활수준이 목표 아래인 pop 만)과 모자란 비율로 가중한 사람 수(short, 생활수준과 상관없이)
   */
  welfareNeed?: { poor: number[]; wage: number[]; poorShort: number[]; wageShort: number[] };
  /** 세금을 내야 할 인구와 행정청이 감당하는 인구 (징수율 = 한도 / 인구) */
  taxDue?: number;
  taxCapacity?: number;
  /** 하루에 걷어야 할 세금 전액 (이동평균, 행정청 손익 추정용) */
  taxOwed?: number;
  /** 징수율 0..1 (행정청 한도와 인구로 정한다, collectionRatio) */
  taxRatio?: number;
  /** 정책 단계 1~5 (3이 보통): 세금 수준, 국영 임금 수준, 복지 수준. 배율은 TUNE.taxLevels·govWageLevels, 복지는 목표 생활수준 TUNE.welfareLevels */
  budget: Record<BudgetItem, number>;
  /** 주간 경제 규모 (이동평균): 민간·국영 생산 건물 부가가치 + 소작 현물의 시장가 */
  output?: number;
  /** 임금 지수: 왕국 민간 건물이 실제로 주는 임금 ÷ 기본 임금 (일자리 가중, 주간 이동평균). 국영 임금의 기준 */
  wageIndex?: number;
  /** 이번 주에 들어온 세입 (세금 + 관세 + 주조) */
  revenueWeek: number;
  /**
   * 이번 주 정부 건물(행정청·학교)의 임금과 원료, 복지, firms = 왕실 생산 건물과 건축사무소의 매출 − 원료 − 임금 (그중 건축사무소 몫 office),
   * build = 왕실 공사가 자기 건축사무소에 낸 수수료
   */
  spentWeek?: { wages: number; goods: number; welfare?: number; firms?: number; office?: number; build?: number };
  /** 지난주 국정 수지: 세입 / 정부 건물(행정청·학교) 임금, 원료, 국채 이자, 복지, 왕실 공사(build) / 국영 사업 손익(firms, 그중 건축사무소 office) */
  /** revenue 는 세금·관세·주조를 모두 더한 값, tariffs 는 그중 관세. fees 는 건축사무소가 민간 공사에서 받은 수수료 (사무소 매출의 일부, firms 안에 들어 있다. 지표용) */
  /** 국고 순변화 ≈ revenue − wages − goods − interest − welfare − build + firms */
  lastBudget?: { revenue: number; tariffs?: number; fees: number; wages: number; goods: number; interest: number; welfare?: number; firms?: number; office?: number; build?: number };
  /** 주간 국정 지출(정부 건물 + 이자 + 복지 + 왕실 공사 − 건축사무소 손익)의 이동평균. 국고가 몇 주를 버티는지의 기준 (왕실 생산 건물 손익은 넣지 않는다) */
  expenseEma?: number;
  /** 이번 주에 들어온 관세 (주마다 비운다) */
  tariffWeek?: number;
  /** 이번 주 관세를 상품('g:곡물')과 출발 왕국('k:2')으로 나눈 것 (화면 전용, 주마다 비운다) */
  tariffWeekBy?: Record<string, number>;
  /** 이번 주 건축사무소가 민간 공사에서 받은 수수료 (주마다 비운다) */
  privateFeeWeek?: number;
  /**
   * 예산 미리보기(budgetPreview)의 기준값. 화면 전용이고 sim 은 읽지 않는다.
   * taxBy = 세금 수준 단계 1~5 각각의 하루 세입 (매일, 이동평균 0.9/0.1, 저축 한도·징수율·토지세 포함).
   * mint = 지난 주조액 (매주). tariffs·goods = 주간 관세·정부 건물 원료. build = 오늘 왕실 공사가 자기 사무소에 낸 수수료 (매일).
   * 처음 8주는 가중치를 세 배로 한다
   */
  budgetBase?: { taxBy?: number[]; mint?: number; tariffs?: number; build?: number; goods?: number; tariffsBy?: Record<string, number> };
  /** 복지 필요액을 지역·무리('3|poor')로 나눈 것 (welfareNeed 와 같은 이동평균, 화면 전용): need = 단계 1~5 하루 필요액, short = 모자란 사람(비율 가중) */
  welfareNeedBy?: Record<string, { need: number[]; short: number[] }>;
  /** AI: 지난 정책 점검 때 국고 순자산 (현금 − 빚) */
  netLast?: number;
  /** 이번 달 착공 레벨 (지표용): '건물|s'(왕실) '건물|p'(민간) '건물|loss'(AI 손해 짓기) '건물|d'(철거) '건물|v'(민영화로 판 레벨) */
  startsMonth?: Record<string, number>;
}

export type TaxLaw = 'land' | 'poll' | 'income';
export const TAX_LAWS: TaxLaw[] = ['land', 'poll', 'income'];
/** 투자법: 귀족만 → 전문가까지 → 기술자까지 → 노동자·농부까지 (소작농은 열지 않는다) */
export type InvestLaw = 'nobles' | 'upper' | 'middle' | 'lower';
export const INVEST_LAWS: InvestLaw[] = ['nobles', 'upper', 'middle', 'lower'];
/** 복지법: 없음 → 구빈법(소작농·실업자) → 임금 보조(임금 일자리) → 보편 보장(귀족을 뺀 모두) */
export type WelfareLaw = 'none' | 'poor' | 'wage' | 'universal';
export const WELFARE_LAWS: WelfareLaw[] = ['none', 'poor', 'wage', 'universal'];
export interface LawChange<L> { to: L; startTick: number; endTick: number }
/** 정책 손잡이: 세금 수준, 국영 임금 수준, 복지 수준 (각각 1~5단계). 연구는 돈이 들지 않는다 (문해력으로 정한다) */
export const BUDGET_ITEMS = ['tax', 'wages', 'welfare'] as const;
export const BUDGET_STEPS = 5;
export type BudgetItem = (typeof BUDGET_ITEMS)[number];

export interface Shipment {
  to: number;
  good: GoodId;
  q: number;
  /** 도착했지만 팔리지 않아 다시 내놓는 화물 */
  stale?: boolean;
  /** 화물을 산 무역소 id: 판매 대금이 그 금고로 간다. 없거나 무역소가 헐렸으면 주인 없는 돈(w.fund)으로 */
  post?: number;
}

/**
 * 교역 화물. 교역은 무역소(건물)가 한다 (2026-10-23). cash·capital 은 옛 상인 계정의 자리로 늘 0 이다 (저장 모양을 지키려고 남겼다.
 * 옛 저장의 상인 현금은 불러올 때 주인 없는 돈으로 옮긴다, compat.ts)
 */
export interface Traders {
  cash: number;
  capital: number;
  shipments: Shipment[];
}

import type { MetricPoint } from './metrics';

export interface HistoryPoint {
  tick: number;
  prices: Record<number, Record<GoodId, number>>;
  inventory: Record<number, Record<GoodId, number>>;
  sol: Record<PopClass, number>;
  unemployment: Record<Skill, number>;
  population: Record<PopClass, number>;
  regionSol: Record<number, number>;
  regionEducation: Record<number, number>;
  companyCash: Record<number, number>;
  companyDebt: Record<number, number>;
  totalMoney: number;
}

export type EventKind = 'info' | 'warn' | 'danger';

export interface GameEvent {
  tick: number;
  companyId: number | null;
  text: string;
  textEn?: string;
  kind: EventKind;
  regionId?: number;
  buildingId?: number;
  /** 소식 종류 표시: 'lawChanged' 법이 바뀜, 'lawFailed' 법 바꾸기 실패 (정책 창으로 잇는다) */
  topic?: EventTopic;
}
export type EventTopic = 'lawChanged' | 'lawFailed';

export interface WorldConfig {
  ai: boolean;
}

/** 돈이 생기는 길(주조, 국채 발행)과 없어지는 길(국채 상환, 국채 이자, 보유고 상한)의 누적 */
export interface MintLedger {
  minted: number;
  issued: number;
  retired: number;
  interest: number;
}

export interface World {
  /**
   * 저장 형식 버전: 저장되는 모양이 바뀌면 올린다. 옛 저장은 compat.ts migrateWorld
   * (8: 레벨 소유·소유 건물 금고. 11: 금융가 지분 Pop.fund 를 배열 묶음으로. 12: 반올림 없음, 100배 값(wealth100·literacy100·education100·exp100·crew100) 대신 규칙 단위 값.
   * 13: 화면 전용 기록(Building.payout·firmEma, Kingdom.tariffWeekBy·budgetBase.tariffsBy·welfareNeedBy, lastBudget.firms·spentWeek.firms)이 생겼다, 없어도 되므로 12판은 그대로 불러온다.
   * 14: 연구가 돈 대신 문해력 포인트다 (연구비 수준·연구비 장부·Research.budget 없음, Research.points, 진행은 포인트).
   * 15: 건축사무소가 공사 수수료를 매출로 받는 국영 사업이다 (BuildingStats.fee, Building.payout.crown, lastBudget.office·build, spentWeek.office·build, Kingdom.privateFeeWeek, budgetBase.build 가 생기고,
   *     Kingdom.feeWageWeek·budgetBase.feesWage·feesOther 가 없어졌다. 새 칸은 없어도 되므로 14판은 옛 칸만 지운다).
   * 16: 생산 건물의 굶은 주 수(Building.starvedWeeks, AI)가 생겼다. 없어도 되므로 15판은 그대로 받는다.
   * 10~15판은 불러올 때 바꾼다, 그보다 옛 저장은 불러오지 않는다)
   */
  version: 16;
  config: WorldConfig;
  tick: number;
  seed: number;
  rngState: number;
  nextId: number;
  regions: Region[];
  kingdoms: Kingdom[];
  pops: Pop[];
  /** 받을 사람이 없는 돈. 매주 지역 금융가 금고로 돌린다 (인구 비례) */
  fund: number;
  traders: Traders;
  /** 국가가 만들고 없앤 돈의 누적 장부 (화폐 보존 검증용) */
  mint: MintLedger;
  companies: Company[];
  buildings: Building[];
  constructions: Construction[];
  /** 철거로 회수해 파는 중인 자재 */
  salvage: SalvageLot[];
  history: HistoryPoint[];
  /** 주요 지표 (매달 기록, metrics.ts) */
  metrics: MetricPoint[];
  events: GameEvent[];
  alertState: Record<string, number>;
  mobility?: Record<string, number>;
}

// ---- 명령 ----

export type Command =
  | { type: 'build'; typeId: string; regionId: number; methodId?: string; levels?: number }
  | { type: 'expand'; buildingId: number; levels?: number }
  | { type: 'setMethod'; buildingId: number; methodId: string }
  | { type: 'setWage'; skill: Skill; wage: number }
  | { type: 'setWageOffset'; skill: Skill; offset: number }
  | { type: 'setActive'; buildingId: number; active: boolean }
  | { type: 'setUtilization'; buildingId: number; utilization: number }
  /** 철거 대기에 레벨을 올린다 (매주 1레벨씩 헐린다) */
  | { type: 'demolish'; buildingId: number; levels?: number }
  | { type: 'cancelDemolish'; buildingId: number }
  | { type: 'cancelConstruction'; constructionId: number }
  | { type: 'pauseConstruction'; constructionId: number; paused: boolean }
  /** 내 공사 목록 안에서 위치를 옮긴다 (0 = 맨 앞) */
  | { type: 'moveConstruction'; constructionId: number; index: number }
  | { type: 'setResearch'; techId: string | null }
  /** 세법·투자법을 바꾼다 (TUNE.lawDays 일에 걸쳐. 지금 법과 같은 값이면 바뀌는 중인 것을 취소) */
  | { type: 'setTaxLaw'; law: TaxLaw }
  | { type: 'setInvestLaw'; law: InvestLaw }
  | { type: 'setWelfareLaw'; law: WelfareLaw }
  /** 정책 단계: 세금 수준, 국영 임금 수준, 복지 수준 (1~5) */
  | { type: 'setBudget'; item: BudgetItem; value: number }
  /** 왕실 건물 민영화 켜기·끄기: 켜 두면 저택·금융가가 매주 1레벨씩 사 갈 수 있다 */
  | { type: 'setPrivatize'; buildingId: number; on: boolean };

export interface QueuedCommand {
  actor: number;
  cmd: Command;
}
