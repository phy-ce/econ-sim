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
  | 'meat';

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

export interface MethodDef {
  id: string;
  name: string;
  nameEn?: string;
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
  /** 부 단계 × 100 (100..9900). 소수 둘째 자리로 저장해도 하루 0.0001 단계씩 움직일 수 있게 100배로 둔다. 규칙 단위(1..99)는 wealthOf(p) */
  wealth100: number;
  /** 문해력 % (0..100, 100배 값). 규칙 단위(0..1)는 literacyOf(p) */
  literacy100: number;
  /** 화면 표시용 사본 (소수 둘째 자리). sim은 읽지 않는다 — wealthOf(p)를 쓴다. 부 단계 (wealth100 / 100), 하루 끝 반올림(round.ts)에서 다시 쓴다 */
  wealth: number;
  /** 화면 표시용 사본 (소수 둘째 자리). sim은 읽지 않는다 — literacyOf(p)를 쓴다. 문해력 0..1 (literacy100 / 100) */
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
  /** 직전 틱 인구 증감률 (연 %, 소수 2자리) */
  growth: number;
  /** 소작으로 직접 얻어 먹는 현물 */
  inKind: GoodBag;
}

/** 100배로 저장한 값을 규칙 단위로 읽는다: 부 단계 1..99, 문해력 0..1, 교육 접근도 0..1 */
export const wealthOf = (p: Pop) => p.wealth100 / 100;
export const literacyOf = (p: Pop) => p.literacy100 / 100;
export const educationOf = (r: { education100: number }) => r.education100 / 100;
/** 건물 숙련도 0..1, 작업 인원 0..1 (작업 인원이 아직 없으면 충원율) */
export const expOf = (b: { exp100: number }) => b.exp100 / 100;
export const crewOf = (b: { crew100?: number; last: { staffing: number } }) => (b.crew100 !== undefined ? b.crew100 / 100 : b.last.staffing);

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
  /** 국영 건물: 이익은 국고에 남고, 소유 직종 자리도 임금을 받는다 */
  stateOwned?: boolean;
  /** 국영 건물 중 민간(그 왕국 민간 상회)이 가진 지분 0..1. 이익의 이 몫은 소유 건물을 거쳐 귀족·자본가에게 배당된다 */
  privateShare?: number;
  /** 소작지: 일하는 소작농 (노동 인구) */
  tenants?: number;
  lastSwitchTick: number;
  /** 숙련도 % (0..100, 100배 값. 하루 3.5씩 오른다). 규칙 단위(0..1)는 expOf(b) */
  exp100: number;
  /** 실제로 손이 맞는 작업 인원 % (0..100, 100배 값): 충원율을 하루 8%씩 따라간다. 규칙 단위(0..1)는 crewOf(b) */
  crew100?: number;
  /** 화면 표시용 사본 (소수 둘째 자리). sim은 읽지 않는다 — crewOf(b)를 쓴다. 작업 인원 0..1 (crew100 / 100, crew100 이 없으면 없다) */
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
  /** 유보 자산 (빅토리아3): 이익의 일부를 레벨 × 레벨당 주간 산출 가치(기본가) × TUNE.reserveWeeks 까지 쌓고, 적자는 여기서 먼저 뺀다. 돈은 회사 현금 안에 있다 (finance.ts settleReserve). 없으면 0 */
  reserve?: number;
  lossWeeks: number;
  pausedWeeks: number;
  /** 철거 대기 레벨: 매주 1레벨씩 헐린다 */
  shrinking?: number;
  /** 땅 바꾸기나 국고 적자(학교)로 헐리는 중 (이익이 나도 철거를 취소하지 않는다) */
  swap?: boolean;
  /** 마지막 레벨의 손익이 마이너스였던 연속 주 수 (철거 판단) */
  negWeeks?: number;
  /** 건축사무소: 그 연속 주 동안 일하던 주의 가장 높은 충원율 (한 번도 사람이 차지 않은 레벨을 센다) */
  staffPeak?: number;
  /** 1레벨을 지을 때 들어간 자재 (철거하면 TUNE.salvageShare 만큼 돌려받는다) */
  materials?: GoodBag;
}

/** 철거로 회수한 자재: TUNE.salvageDays 동안 나눠 팔고, 대금은 지분대로 나눈다 */
export interface SalvageLot {
  regionId: number;
  good: GoodId;
  q: number;
  days: number;
  companyId: number;
  /** 대금을 받을 소유 건물(저택·금융가) id 와 그 몫 (민간 건물 1, 국영 건물은 민간 지분) */
  ownerId: number | null;
  ownerShare: number;
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
  /** 왕실 공사에 민간 상회가 낸 돈과 그 돈이 사는 지분 (완공 때 건물 지분이 된다) */
  privatePaid?: number;
  privateShare?: number;
}

export interface Research {
  budget: number;
  current: string | null;
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
  /** 투자 풀에서 받은 돈 중 아직 그 지역에 쓰지 않은 몫 (민간 상회, 지역 우선 투자) */
  regionFunds?: Record<number, number>;
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
 * 회사 장부 항목. 손익(weekProfit)에 들어가는 것: 판매, 세금, 주조, 공사 수수료(수입) / 임금, 원자재, 연구, 이자(지출).
 * 손익 밖의 자본 흐름: 배당 지급, 투자 풀 유입, 민간이 낸 공사비(건물이라는 자산으로 바뀐다)
 */
export const LEDGER_KEYS = ['sales', 'tax', 'mint', 'buildFees', 'wages', 'inputs', 'research', 'interest', 'dividends', 'investment', 'buildPaid'] as const;
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
  /** 교육 접근도 % (0..100, 100배 값, 학교 정원 비율). pop 의 문해력이 이것을 따라간다. 규칙 단위(0..1)는 educationOf(r) */
  education100: number;
  /** 화면 표시용 사본 (소수 둘째 자리). sim은 읽지 않는다 — educationOf(r)를 쓴다. 교육 접근도 0..1 (education100 / 100) */
  education: number;
  /** pop 합산 (화면용). 매 틱 다시 채운다 */
  households: Record<PopClass, Household>;
  market: Record<GoodId, MarketGood>;
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
  /** 투자 풀: 소유 직종 배당의 일부가 모여 민간 건설 자금이 된다 */
  investmentPool: number;
  /** 투자 풀 중 지역별로 들어온 몫 (그 지역 pop 의 재투자와 남는 현금) */
  poolByRegion?: Record<number, number>;
  /** 세법: 'land' = 토지 기반 과세 (소작지 수확의 토지세율만큼 걷는다, 인두세·소득세 없음), 'capita' = 1인당 과세 (인두세 + 소득세). 세율은 taxRates */
  taxLaw: TaxLaw;
  /** 어제 걷은 토지세와 걷어야 했던 토지세 (행정청 손익용, 하루마다 비운다) */
  landGot?: number;
  landOwed?: number;
  /** 마지막으로 세법을 바꾼 틱 */
  lawTick?: number;
  /** 세금을 내야 할 인구와 행정청이 감당하는 인구 (징수율 = 한도 / 인구) */
  taxDue?: number;
  taxCapacity?: number;
  /** 하루에 걷어야 할 세금 전액 (이동평균, 행정청 손익 추정용) */
  taxOwed?: number;
  /** 징수율 0..1 (행정청 한도와 인구로 정한다, collectionRatio) */
  taxRatio?: number;
  /** 정책 단계 1~5 (3이 보통): 세금 수준, 국영 임금 수준, 연구비 수준. 배율은 TUNE.taxLevels·govWageLevels·researchLevels */
  budget: Record<BudgetItem, number>;
  /** 주간 경제 규모 (이동평균): 민간·국영 생산 건물 부가가치 + 소작 현물의 시장가. 연구비의 기준 */
  output?: number;
  /** 임금 지수: 왕국 민간 건물이 실제로 주는 임금 ÷ 기본 임금 (일자리 가중, 주간 이동평균). 국영 임금의 기준 */
  wageIndex?: number;
  /** 이번 주에 들어온 세입 (세금 + 관세 + 주조) */
  revenueWeek: number;
  /** 이번 주 정부 건물(행정청·건축사무소·학교)의 임금과 원료 */
  spentWeek?: { wages: number; goods: number };
  /** 지난주 국정 수지: 세입, 민간 공사 수수료 / 정부 건물 임금, 원료, 연구비, 국채 이자 */
  lastBudget?: { revenue: number; fees: number; wages: number; goods: number; research: number; interest: number };
  /** 주간 국정 지출(정부 건물 + 연구 + 이자 − 민간 공사 수수료)의 이동평균. 국고가 몇 주를 버티는지의 기준 */
  expenseEma?: number;
  /** 이번 주에 들어온 관세 (주마다 비운다) */
  tariffWeek?: number;
  /** 이번 주 민간 공사 수수료 중 건축사무소 임금 몫, 국영 임금 수준 배율 1로 환산 (주마다 비운다) */
  feeWageWeek?: number;
  /**
   * 예산 미리보기(budgetPreview)의 기준값. 화면 전용이고 sim 은 읽지 않는다.
   * taxBy = 세금 수준 단계 1~5 각각의 하루 세입 (매일, 이동평균 0.9/0.1, 저축 한도·징수율·토지세 포함).
   * mint = 지난 주조액 (매주). tariffs·goods = 주간 관세·정부 건물 원료. feesWage = 민간 공사 수수료의 건축사무소 임금 몫(국영 임금 배율 1), feesOther = 나머지 (매주, 0.75/0.25).
   * 처음 8주는 가중치를 세 배로 한다
   */
  budgetBase?: { taxBy?: number[]; mint?: number; tariffs?: number; feesWage?: number; feesOther?: number; goods?: number };
  /** AI: 지난 정책 점검 때 국고 순자산 (현금 − 빚) */
  netLast?: number;
  /** 이번 달 착공 레벨 (지표용): '건물|s'(왕실) '건물|p'(민간) '건물|loss'(AI 손해 짓기) '건물|d'(철거) */
  startsMonth?: Record<string, number>;
}

export type TaxLaw = 'land' | 'capita';
/** 정책 손잡이: 세금 수준, 국영 임금 수준, 연구비 수준 (각각 1~5단계) */
export const BUDGET_ITEMS = ['tax', 'wages', 'research'] as const;
export const BUDGET_STEPS = 5;
export type BudgetItem = (typeof BUDGET_ITEMS)[number];

export interface Shipment {
  to: number;
  good: GoodId;
  q: number;
  /** 도착했지만 팔리지 않아 다시 내놓는 화물 */
  stale?: boolean;
}

export interface Traders {
  cash: number;
  capital: number;
  shipments: Shipment[];
}

export interface Bank {
  cash: number;
  capital: number;
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
}

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
   * (6: 부·문해력·교육 접근도·숙련도·작업 인원을 100배 값으로, 모든 숫자 소수 둘째 자리. 5는 그 작업 중간 판이었다)
   */
  version: 7;
  config: WorldConfig;
  tick: number;
  seed: number;
  rngState: number;
  nextId: number;
  regions: Region[];
  kingdoms: Kingdom[];
  pops: Pop[];
  /** 받을 사람이 없는 돈. 매주 은행 자본과 투자 풀로 돌린다 */
  fund: number;
  bank: Bank;
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
  | { type: 'setResearchBudget'; budget: number }
  | { type: 'setTaxLaw'; law: TaxLaw }
  /** 정책 단계: 세금 수준, 국영 임금 수준, 연구비 수준 (1~5) */
  | { type: 'setBudget'; item: BudgetItem; value: number };

export interface QueuedCommand {
  actor: number;
  cmd: Command;
}
