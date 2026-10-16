// ---- 정적 데이터 정의 ----

export type GoodId =
  | 'grain' | 'fiber' | 'timber' | 'ore'
  | 'food' | 'fuel' | 'cloth' | 'metal' | 'tools'
  | 'furniture' | 'electronics'
  | 'transport';

export type Skill = 'unskilled' | 'skilled' | 'expert';
export const SKILLS: Skill[] = ['unskilled', 'skilled', 'expert'];

/** 일하지 않고 소유로 먹고사는 상층 계급 */
export type Owner = 'capitalist' | 'aristocrat';
export const OWNERS: Owner[] = ['capitalist', 'aristocrat'];

/** 인구 계층 = 고용 직종 + 자급 농민 + 소유 계층 */
export type PopClass = Skill | 'peasant' | Owner;
export const POP_CLASSES: PopClass[] = [...SKILLS, 'peasant', ...OWNERS];

/** 부(wealth) 단계 범위. 생활수준의 기준값이다 */
export const WEALTH_MIN = 1;
export const WEALTH_MAX = 99;

export type Stratum = 'lower' | 'middle' | 'upper';

export interface ClassDef {
  id: PopClass;
  name: string;
  /** English name (UI language option) */
  nameEn?: string;
  stratum: Stratum;
  description: string;
  descriptionEn?: string;
}

/** 건물이 차지하는 땅의 종류. 지역마다 수량이 정해져 있다 */
export type LandType = 'arable' | 'forest' | 'ore' | 'plot';
export const LAND_TYPES: LandType[] = ['arable', 'forest', 'ore', 'plot'];

export type GoodBag = Partial<Record<GoodId, number>>;
export type SkillBag = Partial<Record<Skill, number>>;

export interface GoodDef {
  id: GoodId;
  name: string;
  nameEn?: string;
  basePrice: number;
  /** 왕국 전체 기준 창고 목표 재고의 하한 (지역별로 인구 비율만큼 나눠 쓴다) */
  minStock: number;
  /** 서비스 상품: 쌓아 둘 수 없어 그날 안 팔린 것은 사라진다 */
  perishable?: boolean;
}

export interface MethodDef {
  id: string;
  name: string;
  nameEn?: string;
  /** 이 방식을 쓰려면 회사가 연구해야 하는 기술. 없으면 처음부터 쓸 수 있다 */
  tech?: string;
  /** 레벨 1당 일자리 */
  workers: SkillBag;
  /** 레벨 1당, 만원 가동 시 틱당 투입 */
  inputs: GoodBag;
  /** 레벨 1당, 만원 가동 시 틱당 산출 */
  outputs: GoodBag;
  /** 건축사무소: 레벨당 하루 건설 포인트 */
  construction?: number;
  /** 왕국 기금이 인건비에 이 배율을 곱해 운영 보조금으로 준다 (학교) */
  grant?: number;
}

export interface BuildingTypeDef {
  id: string;
  name: string;
  nameEn?: string;
  land: LandType;
  methods: MethodDef[];
  /** 1레벨 완공에 필요한 건설 포인트. 건축사무소가 하루에 만드는 포인트로 나누면 공기가 된다 */
  buildPoints: number;
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

export type NeedId = 'nourishment' | 'heating' | 'clothing' | 'furnishing' | 'gadgets';

export interface NeedDef {
  id: NeedId;
  name: string;
  nameEn?: string;
  /** 1 수요 단위를 채우는 상품과 필요량. 가격에 따라 비중을 나눈다 */
  /** appeal: 같은 값이면 더 선호하는 정도 (가공품 > 원자재). 고를 때 가격을 appeal 로 나눠 비교한다 */
  options: { good: GoodId; units: number; appeal?: number }[];
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
  land: Record<LandType, number>;
  population: Record<PopClass, number>;
  education: number;
  /** 지역 특성: 건물 종류별 생산 보너스 (0.1 = +10%) */
  perks: Partial<Record<string, number>>;
}

// ---- 월드 상태 (모두 직렬화 가능한 순수 객체) ----

export interface Building {
  id: number;
  typeId: string;
  regionId: number;
  companyId: number;
  level: number;
  methodId: string;
  active: boolean;
  /** 가동률 0..1. 일자리와 생산량에 곱해진다 */
  utilization: number;
  /** 지금 이 건물에 앉아 있는 소유주 수 (공장부지 건물은 자본가, 땅 건물은 지주 귀족). ownerJobs 참고 */
  owners: number;
  lastSwitchTick: number;
  /** 숙련도 0..1. 고용 뒤 서서히 올라 효율이 최대에 이른다. 방식을 바꾸거나 크게 늘리면 떨어진다 */
  exp: number;
  /** 건축사무소가 할 일이 없어 인부를 해산한 상태. 임금이 나가지 않고 공사가 잡히면 다시 모은다 */
  idle: boolean;
  employed: Record<Skill, number>;
  /** 투입재 보관분 */
  stock: GoodBag;
  /** 직전 틱 임금을 다 못 받았는가 */
  unpaid: boolean;
  last: BuildingStats;
  /** 틱당 이윤의 지수이동평균 */
  profitEma: number;
  /** 연속 적자 주 수 (AI 판단용) */
  lossWeeks: number;
  pausedWeeks: number;
}

export interface BuildingStats {
  revenue: number;
  inputCost: number;
  wageCost: number;
  staffing: number;
  inputFill: number;
  output: GoodBag;
  /** 건축사무소가 오늘 만든 건설 포인트 */
  points: number;
}

export interface Construction {
  id: number;
  companyId: number;
  regionId: number;
  typeId: string;
  methodId: string;
  /** 증설 대상. 없으면 신규 건물 */
  targetBuildingId: number | null;
  /** 지금까지 받은 건설 포인트 / 필요 포인트 */
  points: number;
  required: number;
  /** 이 공사에 배정된 건축사무소 운영비 누계 */
  spent: number;
  ticksElapsed: number;
}

export interface Research {
  /** 하루 연구비 상한 */
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
  cash: number;
  wages: Record<Skill, number>;
  /** 이번 주 누적 이윤 */
  weekProfit: number;
  lastWeekProfit: number;
  /** 이번 주 시작 시점 현금 */
  weekStartCash: number;
  /** 시장임금 대비 비율로 임금을 정하는 정책. null이면 wages를 직접 쓴다 (AI) */
  wageOffset: Record<Skill, number> | null;
  /** 은행 대출 잔액 */
  debt: number;
  /** 틱당 매출 지수이동평균 */
  revenueEma: number;
  lastRestructureTick: number;
  /** 연속 부실 주 수. 길어지면 파산 처리 */
  distressWeeks: number;
  /** 오늘 건축사무소가 만든 건설 포인트와 그 비용 (공사에 배분한 뒤 0으로) */
  buildPoints: number;
  buildCost: number;
  research: Research;
}

export interface Household {
  skill: PopClass;
  population: number;
  savings: number;
  /** 부 단계 1..30. 소득이 다음 단계 소비 묶음 비용을 넘으면 오르고, 지금 단계 비용에 못 미치면 내린다 */
  wealth: number;
  /** 생활수준 = 부 단계 (표시용 별칭) */
  sol: number;
  /** 직전 틱 소비 묶음 충족률 0..1 */
  fulfillment: number;
  /** 직전 틱 식량 충족률 0..1 (현물 포함). 낮으면 굶어 죽는다 */
  food: number;
  /** 이번 틱 시장을 거치지 않고 직접 소비한 현물 (농민) */
  inKind: GoodBag;
  incomeEma: number;
  lastIncome: number;
  lastSpend: number;
  consumed: GoodBag;
}

export interface MarketGood {
  price: number;
  /** 지역 공동 창고 재고 */
  inventory: number;
  target: number;
  /** 이번 틱 요청된 구매량 */
  demand: number;
  /** 이번 틱 판매 제안량 */
  supply: number;
  demandEma: number;
  supplyEma: number;
  /** 위탁 물량 중 실제로 팔린 비율 (지수이동평균) */
  sellThrough: number;
  /** 전날 생산되어 위탁 판매 중인 물량 (b: 건물, c: 판매자, q: 수량) */
  consigned: { b: number; c: number; q: number }[];
  /** 실제 거래량 */
  sold: number;
  volumeEma: number;
  /** 직전 틱 지역 간 운송으로 들어온/나간 양 */
  shippedIn: number;
  shippedOut: number;
  /**
   * 이번 틱 수요·공급의 출처별 내역 (합 = demand / supply).
   * 수요 키: pop:<계층>, bld:<건물 종류>, trader(상인 매입), export(해외 수출), import(수입 하역 운송)
   * 공급 키: bld:<건물 종류>, subsistence(소작농 판매), import(해외 수입), trader(상인 화물)
   * 옛 저장 파일에는 없을 수 있다.
   */
  demandBy?: Record<string, number>;
  supplyBy?: Record<string, number>;
  /** 위 내역의 이동평균 (화면 표시용) */
  demandByEma?: Record<string, number>;
  supplyByEma?: Record<string, number>;
}

export interface Region {
  id: number;
  name: string;
  description: string;
  spaceport: boolean;
  neighbors: number[];
  land: Record<LandType, number>;
  /** 교육 수준 0..1. 승급 속도와 상위 직종 비율의 상한을 정한다 */
  education: number;
  /** 직전 틱 땅이 있어 실제로 경작한 농민 수 */
  subsistenceWorkers: number;
  /** 농민 1인당 하루 현물 소득 가치의 이동평균. 노동자가 공장에서 받아들이는 최저 임금의 기준이 된다 */
  subsistenceIncome: number;
  households: Record<PopClass, Household>;
  market: Record<GoodId, MarketGood>;
  /** 이번 주 기근으로 떠난 사람 수와 지역별 행선지 (주간 알림용) */
  famineOut: number;
  famineTo: Record<number, number>;
}

/** 운송 중인 화물: 출발 지역에서 산 물건이 다음 틱에 도착 지역에 위탁된다 */
export interface Shipment {
  to: number;
  good: GoodId;
  q: number;
}

/** 지역 간 차익 운송을 맡는 상인 조합 */
export interface Traders {
  cash: number;
  capital: number;
  shipments: Shipment[];
  /** 건물이 이웃 지역에서 직접 산 투입재. 다음 날 건물 창고에 들어간다 */
  inbound: { buildingId: number; good: GoodId; q: number }[];
}

/** 해외 무역. balance는 해외 계정 잔액(우리가 낸 수입 대금 − 받은 수출 대금) */
export interface Offworld {
  balance: number;
  /** 직전 틱 수입·수출량 */
  imports: GoodBag;
  exports: GoodBag;
}

export interface Bank {
  cash: number;
  /** 초기 자본. 이를 크게 넘는 이자 수익은 기금으로 넘긴다 */
  capital: number;
}

export interface HistoryPoint {
  tick: number;
  /** 지역별 가격·재고 */
  prices: Record<number, Record<GoodId, number>>;
  inventory: Record<number, Record<GoodId, number>>;
  /** 왕국 전체 계층별 지표 */
  sol: Record<PopClass, number>;
  unemployment: Record<Skill, number>;
  population: Record<PopClass, number>;
  /** 지역별 노동자 생활수준과 교육 수준 */
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
  /** English text with the same numbers (UI language option). Older saves lack it */
  textEn?: string;
  kind: EventKind;
  regionId?: number;
  buildingId?: number;
}

export interface WorldConfig {
  /** AI 회사의 의사결정 (끄면 구조가 고정됨: 밸런스 검증용) */
  ai: boolean;
}

export interface World {
  version: 2;
  config: WorldConfig;
  tick: number;
  seed: number;
  rngState: number;
  nextId: number;
  regions: Region[];
  fund: number;
  /** 직전 틱 학교 보조금 지급 비율 (기금이 모자라면 1보다 작다) */
  grantRatio: number;
  bank: Bank;
  traders: Traders;
  offworld: Offworld;
  companies: Company[];
  buildings: Building[];
  constructions: Construction[];
  history: HistoryPoint[];
  events: GameEvent[];
  /** 반복 알림 억제용: 알림 키 → 마지막으로 띄운 틱 */
  alertState: Record<string, number>;
}

// ---- 명령 ----

export type Command =
  /** 생산 방식을 생략하면 회사가 쓸 수 있는 첫 번째 방식으로 완공된다 */
  | { type: 'build'; typeId: string; regionId: number; methodId?: string }
  | { type: 'expand'; buildingId: number }
  | { type: 'setMethod'; buildingId: number; methodId: string }
  | { type: 'setWage'; skill: Skill; wage: number }
  /** 시장임금 대비 비율 (-0.5 ~ +1.0). 임금이 매일 시장을 따라간다 */
  | { type: 'setWageOffset'; skill: Skill; offset: number }
  | { type: 'setActive'; buildingId: number; active: boolean }
  | { type: 'setUtilization'; buildingId: number; utilization: number }
  | { type: 'demolish'; buildingId: number }
  | { type: 'cancelConstruction'; constructionId: number }
  | { type: 'setResearch'; techId: string | null }
  | { type: 'setResearchBudget'; budget: number };

export interface QueuedCommand {
  actor: number;
  cmd: Command;
}
