import type {
  BuildingTypeDef, ClassDef, DepositId, GoodDef, GoodId, LandType, MethodDef, NeedDef, NeedId, PopClass, RegionDef, Skill, SkillDef, TechDef,
} from './types';

// 세계관: 근세에서 산업화로 넘어가는 가상의 대륙. 세 왕국이 땅을 나눠 갖는다. 화폐 단위는 플로린(ƒ).
// 상품·건물·기술은 이 파일에 정의만 추가하면 늘어난다.

/** 노동 인구 비율: pop 인구 중 일하는 사람. 나머지는 부양가족이다 (빅토리아3 기본 25%) */
export const WORKFORCE_RATIO = 0.25;
/** 부양가족은 노동 인구의 이 비율만큼 소비한다 */
export const DEPENDENT_CONSUMPTION = 0.5;
/** pop 1명당 소비 단위 (노동 인구 1명 = 1) */
export const CONSUMPTION_PER_CAPITA = WORKFORCE_RATIO + (1 - WORKFORCE_RATIO) * DEPENDENT_CONSUMPTION;

/** 지역 칸 수의 단위: 지도 정의의 1칸 = 건물 1레벨 */
export const LEVELS_PER_BLOCK = 1;

// ---------------------------------------------------------------- 단위
// 하루 단위. 상품 1개 = 한 사람이 하루에 쓰는 양(곡물 1 = 소비 단위 1의 하루 식량). 돈은 플로린.
// 숫자는 소수 둘째 자리까지만 쓴다. 건물 1레벨 = 일꾼 1,000명.
/** 한 공사에 레벨당 하루 들어갈 수 있는 최대 포인트 */
export const MAX_POINTS_PER_LEVEL_DAY = 10;
const cells = (n: number) => Math.round(n * LEVELS_PER_BLOCK);

export const GOOD_IDS: GoodId[] = [
  'grain', 'fiber', 'timber', 'ore', 'fuel',
  'food', 'cloth', 'metal',
  'tools', 'furniture', 'electronics',
  'transport',
  'luxury_furniture', 'luxury_cloth',
  'meat',
];

export const GOODS: Record<GoodId, GoodDef> = {
  grain: { id: 'grain', name: '곡물', nameEn: 'Grain', basePrice: 2 },
  fiber: { id: 'fiber', name: '섬유', nameEn: 'Fibre', basePrice: 2 },
  timber: { id: 'timber', name: '목재', nameEn: 'Timber', basePrice: 2 },
  ore: { id: 'ore', name: '철광석', nameEn: 'Iron ore', basePrice: 4 },
  fuel: { id: 'fuel', name: '석탄', nameEn: 'Coal', basePrice: 3 },
  food: { id: 'food', name: '식료품', nameEn: 'Groceries', basePrice: 4 },
  cloth: { id: 'cloth', name: '의복', nameEn: 'Clothing', basePrice: 6 },
  metal: { id: 'metal', name: '철', nameEn: 'Iron', basePrice: 8 },
  tools: { id: 'tools', name: '공구', nameEn: 'Tools', basePrice: 10 },
  furniture: { id: 'furniture', name: '가구', nameEn: 'Furniture', basePrice: 8 },
  electronics: { id: 'electronics', name: '기계', nameEn: 'Machinery', basePrice: 20 },
  transport: { id: 'transport', name: '운송', nameEn: 'Transport', basePrice: 3, perishable: true },
  luxury_furniture: { id: 'luxury_furniture', name: '고급 가구', nameEn: 'Luxury furniture', basePrice: 40 },
  luxury_cloth: { id: 'luxury_cloth', name: '고급 의복', nameEn: 'Fine clothes', basePrice: 30 },
  meat: { id: 'meat', name: '고기', nameEn: 'Meat', basePrice: 16 },
};

/**
 * 일자리 직종. 소유 직종의 임금은 국영 건물과 행정청에서만 쓴다 (민간 건물에서는 배당을 받는다).
 * 기본 임금: 노동자 하루 10 (식구 넷이 부 5로 산다). 기술자 2배, 전문가·소유 직종 4배
 */
export const SKILL_DEFS: Record<Skill, SkillDef> = {
  unskilled: { id: 'unskilled', name: '노동자', nameEn: 'Labourers', baseWage: 10 },
  skilled: { id: 'skilled', name: '기술자', nameEn: 'Skilled workers', baseWage: 20 },
  expert: { id: 'expert', name: '전문가', nameEn: 'Experts', baseWage: 40 },
  gentry: { id: 'gentry', name: '하급 귀족', nameEn: 'Gentry', baseWage: 30 },
  capitalist: { id: 'capitalist', name: '자본가', nameEn: 'Capitalists', baseWage: 40 },
  aristocrat: { id: 'aristocrat', name: '상급 귀족', nameEn: 'High nobility', baseWage: 40 },
};

export const CLASS_DEFS: Record<PopClass, ClassDef> = {
  peasant: { id: 'peasant', name: '소작농', nameEn: 'Tenant farmers', stratum: 'lower', description: '' },
  unskilled: { id: 'unskilled', name: '노동자', nameEn: 'Labourers', stratum: 'lower', description: '' },
  skilled: { id: 'skilled', name: '기술자', nameEn: 'Skilled workers', stratum: 'middle', description: '' },
  expert: { id: 'expert', name: '전문가', nameEn: 'Experts', stratum: 'middle', description: '' },
  gentry: { id: 'gentry', name: '하급 귀족', nameEn: 'Gentry', stratum: 'middle', description: '' },
  capitalist: { id: 'capitalist', name: '자본가', nameEn: 'Capitalists', stratum: 'upper', description: '' },
  aristocrat: { id: 'aristocrat', name: '상급 귀족', nameEn: 'High nobility', stratum: 'upper', description: '' },
};


// ---------------------------------------------------------------- 기술 트리

const tech = (id: string, name: string, nameEn: string, tier: number, requires: string[], description: string, descriptionEn: string): TechDef =>
  ({ id, name, nameEn, cost: TECH_COST[tier], requires, description, descriptionEn });
/** 단계별 연구비. 1단계는 최대 연구비로 넉 달, 기술 전부는 최대 연구비로 약 18년 */
const TECH_COST = [0, 12_000_000, 24_000_000, 40_000_000, 70_000_000];

export const TECHS: TechDef[] = [
  // 1단계: 선행 없음. 가공 산업과 기반 시설을 연다
  tech('milling', '제분과 염장', 'Milling and curing', 1, [], '', ''),
  tech('spinning', '물레', 'Spinning wheel', 1, [], '', ''),
  tech('bloomery', '괴철로', 'Bloomery', 1, [], '', ''),
  tech('guilds', '수공업 길드', 'Craft guilds', 1, [], '', ''),
  tech('printing', '인쇄술', 'Printing press', 1, [], '', ''),
  tech('wagonway', '마찻길', 'Wagon roads', 1, [], '', ''),
  // 2단계
  tech('ironworking', '철 가공', 'Ironworking', 2, ['bloomery', 'guilds'], '', ''),
  tech('scaffolding', '목재 비계', 'Timber scaffolding', 2, ['guilds'], '', ''),
  tech('coking', '코크스 제련', 'Coke smelting', 2, ['bloomery'], '', ''),
  // 3단계
  tech('iron_tools', '개량 농기구', 'Improved implements', 3, ['ironworking'], '', ''),
  tech('steam_engine', '증기기관', 'Steam engine', 3, ['ironworking', 'coking'], '', ''),
  // 4단계: 증기기관이 있어야 한다
  tech('steam_pump', '증기 양수기', 'Steam pumps', 4, ['steam_engine'], '', ''),
  tech('power_loom', '증기 직기', 'Power loom', 4, ['steam_engine', 'spinning'], '', ''),
  tech('food_machinery', '기계식 식품 가공', 'Food machinery', 4, ['steam_engine', 'milling'], '', ''),
  tech('agri_mech', '농업 기계화', 'Farm machinery', 4, ['steam_engine', 'iron_tools'], '', ''),
  tech('steam_rail', '증기 철도', 'Steam railways', 4, ['steam_engine', 'wagonway'], '', ''),
  tech('steel_frame', '철골 건축', 'Iron frames', 4, ['steam_engine', 'scaffolding'], '', ''),
];

export const TECH_BY_ID: Record<string, TechDef> = Object.fromEntries(TECHS.map((t) => [t.id, t]));

// ---------------------------------------------------------------- 건물과 생산 방식

const m = (def: MethodDef): MethodDef => def;
/** 행정청 1레벨이 세금을 걷을 수 있는 인구 */
const TAX_PEOPLE_PER_LEVEL = 500_000;

/** 레벨당 일자리 (노동자, 기술자, 전문가). 합이 1,000명이 되게 쓴다 */
const jobs = (unskilled: number, skilled = 0, expert = 0) => ({ unskilled, skilled, expert });
/** 소유 건물(저택·금융가) 1레벨의 소유주 자리 */
export const OWNERSHIP_SEATS = 100;
/** 소유한 건물 1레벨마다 소유 건물에 생기는 소유주 자리 */
export const OWNER_SEATS_PER_LEVEL = 10;

// 레벨당 하루 값. 일꾼은 1,000명을 100명 단위로 나누고, 산출·원료는 500 단위(소량 사치품은 50 단위)로 맞춘다.
// 기본가·기본 임금에서 이익률(매출 대비)은 기본 방식 약 20%, 기술 개선 1단계 약 30%, 2단계 약 40%다 (cli/methods_audit.ts 로 확인).
// 공사비(포인트)는 목조 건설로 포인트당 약 1만이라 농장 1레벨이 약 600만, 기본 이익으로 2~3년에 회수한다.
export const BUILDING_TYPES: BuildingTypeDef[] = [
  {
    // 빈 농지에 자동으로 생긴다. 소작농이 일하고, 산출은 소작농과 지주의 현물이 된다 (SUBSISTENCE 참고)
    id: 'subsistence', name: '소작지', nameEn: 'Tenant farms', land: 'arable', buildPoints: 0, auto: true,
    methods: [m({ id: 'subsistence', name: '자급 농사', nameEn: 'Subsistence farming', workers: {}, inputs: {}, outputs: {} })],
  },
  {
    // 소유 건물 (빅토리아3 Manor House / Financial District). 지역마다 자동으로 생긴다.
    // 농지·산림·광산 건물은 저택이, 공장 부지 건물은 금융가가 소유하고, 배당은 거기서 일하는 귀족·자본가의 소득이 된다.
    // 소작지 지대도 저택이 받는다. 크기는 지역의 그 직종 인원과 소유한 건물 레벨에 맞춰 저절로 바뀐다
    id: 'manor', name: '저택', nameEn: 'Manor houses', land: 'plot', buildPoints: 0, auto: true, ownership: 'aristocrat',
    methods: [m({ id: 'manor', name: '영지 관리', nameEn: 'Estate management', workers: { aristocrat: OWNERSHIP_SEATS }, inputs: {}, outputs: {} })],
  },
  {
    id: 'finance', name: '금융가', nameEn: 'Financial district', land: 'plot', buildPoints: 0, auto: true, ownership: 'capitalist',
    methods: [m({ id: 'finance', name: '투자 관리', nameEn: 'Investment management', workers: { capitalist: OWNERSHIP_SEATS }, inputs: {}, outputs: {} })],
  },
  {
    id: 'farm', name: '곡물 농장', nameEn: 'Grain farm', land: 'arable', buildPoints: 600,
    methods: [
      m({ id: 'farm_basic', name: '곡물 재배', nameEn: 'Grain farming', workers: jobs(800, 200), inputs: {}, outputs: { grain: 7500 } }),
      m({ id: 'farm_tools', name: '쇠 농기구', nameEn: 'Iron implements', tech: 'iron_tools', workers: jobs(600, 200), inputs: { tools: 100 }, outputs: { grain: 8000 } }),
      m({ id: 'farm_mech', name: '농업 기계', nameEn: 'Farm machinery', tech: 'agri_mech', workers: jobs(400, 100), inputs: { fuel: 300, electronics: 100 }, outputs: { grain: 8000 } }),
    ],
  },
  {
    id: 'fiber_farm', name: '섬유 농장', nameEn: 'Fibre farm', land: 'arable', buildPoints: 600,
    methods: [
      m({ id: 'fiber_basic', name: '섬유 재배', nameEn: 'Fibre farming', workers: jobs(800, 200), inputs: {}, outputs: { fiber: 7500 } }),
      m({ id: 'fiber_tools', name: '쇠 농기구', nameEn: 'Iron implements', tech: 'iron_tools', workers: jobs(600, 200), inputs: { tools: 100 }, outputs: { fiber: 8000 } }),
      m({ id: 'fiber_mech', name: '농업 기계', nameEn: 'Farm machinery', tech: 'agri_mech', workers: jobs(400, 100), inputs: { fuel: 300, electronics: 100 }, outputs: { fiber: 8000 } }),
    ],
  },
  {
    // 곡물을 사료로 먹여 고기를 낸다. 곡물이 쌀수록 남는다
    id: 'ranch', name: '목장', nameEn: 'Livestock ranch', land: 'arable', buildPoints: 600,
    methods: [
      m({ id: 'ranch_basic', name: '가축 사육', nameEn: 'Livestock raising', workers: jobs(800, 200), inputs: { grain: 3000 }, outputs: { meat: 1400 } }),
    ],
  },
  {
    id: 'lumber', name: '벌목장', nameEn: 'Lumber camp', land: 'forest', buildPoints: 600,
    methods: [
      m({ id: 'lumber_manual', name: '수작업 벌목', nameEn: 'Hand felling', workers: jobs(800, 200), inputs: {}, outputs: { timber: 7500 } }),
      m({ id: 'lumber_axe', name: '쇠도끼와 톱', nameEn: 'Iron axes and saws', tech: 'iron_tools', workers: jobs(700, 300), inputs: { tools: 100 }, outputs: { timber: 10000 } }),
    ],
  },
  {
    id: 'mine', name: '철광산', nameEn: 'Iron mine', land: 'ore', deposit: 'iron', buildPoints: 800,
    methods: [
      m({ id: 'iron_shaft', name: '갱도 채굴', nameEn: 'Shaft mining', workers: jobs(900, 100), inputs: {}, outputs: { ore: 3500 } }),
      m({ id: 'iron_pick', name: '쇠곡괭이', nameEn: 'Iron picks', tech: 'iron_tools', workers: jobs(800, 200), inputs: { tools: 100 }, outputs: { ore: 4500 } }),
      m({ id: 'iron_pump', name: '증기 양수기', nameEn: 'Steam pumps', tech: 'steam_pump', workers: jobs(600, 300, 100), inputs: { tools: 200, fuel: 300 }, outputs: { ore: 8000 } }),
    ],
  },
  {
    id: 'coal_mine', name: '석탄광산', nameEn: 'Coal mine', land: 'ore', deposit: 'coal', buildPoints: 800,
    methods: [
      m({ id: 'coal_shaft', name: '갱도 채굴', nameEn: 'Shaft mining', workers: jobs(800, 200), inputs: {}, outputs: { fuel: 5000 } }),
      m({ id: 'coal_pick', name: '쇠곡괭이', nameEn: 'Iron picks', tech: 'iron_tools', workers: jobs(800, 200), inputs: { tools: 100 }, outputs: { fuel: 6000 } }),
      m({ id: 'coal_pump', name: '증기 양수기', nameEn: 'Steam pumps', tech: 'steam_pump', workers: jobs(600, 300, 100), inputs: { tools: 200 }, outputs: { fuel: 10000 } }),
    ],
  },
  {
    id: 'foodplant', name: '식료품 공장', nameEn: 'Grocery plant', land: 'plot', buildPoints: 1000,
    methods: [
      m({ id: 'food_manual', name: '수작업 가공', nameEn: 'Manual processing', tech: 'milling', workers: jobs(800, 200), inputs: { grain: 3500 }, outputs: { food: 6000 } }),
      m({ id: 'food_machine', name: '기계 가공', nameEn: 'Machine processing', tech: 'food_machinery', workers: jobs(500, 200), inputs: { grain: 3500, tools: 100 }, outputs: { food: 6000 } }),
    ],
  },
  {
    id: 'textile', name: '방직 공장', nameEn: 'Textile mill', land: 'plot', buildPoints: 1000,
    methods: [
      m({ id: 'textile_hand', name: '손베틀', nameEn: 'Handlooms', tech: 'spinning', workers: jobs(800, 200), inputs: { fiber: 3500 }, outputs: { cloth: 4000 } }),
      m({ id: 'textile_tailor', name: '맞춤 재단', nameEn: 'Bespoke tailoring', tech: 'spinning', workers: jobs(400, 600), inputs: { fiber: 1500 }, outputs: { luxury_cloth: 800 } }),
      m({ id: 'textile_steam', name: '증기 직기', nameEn: 'Power looms', tech: 'power_loom', workers: jobs(500, 200), inputs: { fiber: 3500, tools: 100 }, outputs: { cloth: 4000 } }),
      m({ id: 'textile_tailor_steam', name: '증기 재단', nameEn: 'Steam tailoring', tech: 'power_loom', workers: jobs(300, 600, 100), inputs: { fiber: 1500, tools: 100 }, outputs: { luxury_cloth: 1100 } }),
    ],
  },
  {
    id: 'smelter', name: '제철소', nameEn: 'Ironworks', land: 'plot', buildPoints: 1200,
    methods: [
      m({ id: 'smelt_charcoal', name: '목탄 제련', nameEn: 'Charcoal smelting', tech: 'bloomery', workers: jobs(700, 300), inputs: { ore: 2000, timber: 2000 }, outputs: { metal: 4000 } }),
      m({ id: 'smelt_coke', name: '코크스 제련', nameEn: 'Coke smelting', tech: 'coking', workers: jobs(700, 300), inputs: { ore: 2000, fuel: 1000 }, outputs: { metal: 4500 } }),
    ],
  },
  {
    id: 'workshop', name: '공방', nameEn: 'Tool workshop', land: 'plot', buildPoints: 1000,
    methods: [
      m({ id: 'tools_wood', name: '목공구', nameEn: 'Wooden tools', tech: 'guilds', workers: jobs(800, 200), inputs: { timber: 2000 }, outputs: { tools: 2000 } }),
      m({ id: 'tools_iron', name: '쇠공구', nameEn: 'Iron tools', tech: 'ironworking', workers: jobs(700, 300), inputs: { timber: 1000, ore: 1000 }, outputs: { tools: 2700 } }),
    ],
  },
  {
    id: 'furniture', name: '가구 공방', nameEn: 'Furniture workshop', land: 'plot', buildPoints: 1000,
    methods: [
      m({ id: 'furniture_hand', name: '손가구', nameEn: 'Hand-made furniture', tech: 'guilds', workers: jobs(800, 200), inputs: { timber: 2000, fiber: 500 }, outputs: { furniture: 2700 } }),
      m({ id: 'furniture_luxury', name: '장인 가구', nameEn: 'Master cabinetmakers', tech: 'guilds', workers: jobs(400, 600), inputs: { timber: 1000, cloth: 200 }, outputs: { luxury_furniture: 600 } }),
      m({ id: 'furniture_tools', name: '공구 가구', nameEn: 'Furniture with tools', tech: 'ironworking', workers: jobs(600, 300, 100), inputs: { timber: 2000, fiber: 500, tools: 100 }, outputs: { furniture: 3900 } }),
      m({ id: 'furniture_luxury_tools', name: '공구 장인 가구', nameEn: 'Cabinetmakers with tools', tech: 'ironworking', workers: jobs(300, 600, 100), inputs: { timber: 1000, cloth: 200, tools: 100 }, outputs: { luxury_furniture: 850 } }),
    ],
  },
  {
    id: 'fab', name: '기계 공장', nameEn: 'Machine works', land: 'plot', buildPoints: 1200,
    methods: [
      m({ id: 'machine_steam', name: '증기 기계 제작', nameEn: 'Steam engineering', tech: 'steam_engine', workers: jobs(600, 300, 100), inputs: { metal: 2000, fuel: 500 }, outputs: { electronics: 2100 } }),
    ],
  },
  {
    id: 'railway', name: '운송 조합', nameEn: 'Carters\' guild', land: 'plot', buildPoints: 600,
    methods: [
      m({ id: 'rail_wagon', name: '짐마차', nameEn: 'Freight wagons', tech: 'wagonway', workers: jobs(900, 100), inputs: { grain: 1000, timber: 500 }, outputs: { transport: 6000 } }),
      m({ id: 'rail_steam', name: '증기 철도', nameEn: 'Steam railway', tech: 'steam_rail', workers: jobs(500, 400, 100), inputs: { electronics: 100, fuel: 1000 }, outputs: { transport: 10500 } }),
    ],
  },
  {
    // 정부 건물: 왕실만 짓고 국고가 임금을 낸다. 땅을 쓰지 않는다 (행정청도 같다). 1인당 하루 인건비: 가정교사 3,000 ÷ 2만 = 0.15, 공립 15,000 ÷ 10만 = 0.15
    id: 'school', name: '학교', nameEn: 'School', buildPoints: 800, stateOnly: true,
    methods: [
      m({ id: 'school_tutor', name: '귀족 가정교사', nameEn: 'Noble tutors', workers: { gentry: 100 }, inputs: {}, outputs: {}, seats: 20_000 }),
      m({ id: 'school_basic', name: '공립 학교', nameEn: 'Public school', tech: 'printing', workers: jobs(500, 500), inputs: {}, outputs: {}, seats: 100_000 }),
    ],
  },
  {
    // 목조: 임금 12,000 + 목재·섬유 7,000 → 4포인트 (포인트당 약 4,750). 정부 건물 중 이것만 공장 부지를 쓴다 (빅토리아3 건설 부문만 주마다 레벨 상한이 있다)
    id: 'builder', name: '건축사무소', nameEn: 'Construction office', land: 'plot', buildPoints: 400,
    methods: [
      m({ id: 'build_manual', name: '목조 건설', nameEn: 'Timber building', workers: jobs(800, 200), inputs: { timber: 3000, fiber: 500 }, outputs: {}, construction: 4 }),
      m({ id: 'build_scaffold', name: '목재 비계', nameEn: 'Timber scaffolding', tech: 'scaffolding', workers: jobs(700, 300), inputs: { timber: 2000, ore: 500, tools: 200 }, outputs: {}, construction: 10 }),
      m({ id: 'build_steel', name: '철골 건축', nameEn: 'Iron frames', tech: 'steel_frame', workers: jobs(600, 400), inputs: { metal: 1500, tools: 300 }, outputs: {}, construction: 20 }),
    ],
  },
  {
    // 세금은 행정청이 감당하는 인구만큼만 걷힌다 (1레벨 50만 명, 전문 관료제는 3배)
    id: 'admin', name: '행정청', nameEn: 'Government administration', buildPoints: 400, stateOnly: true,
    methods: [
      m({ id: 'admin_hereditary', name: '세습 관료제', nameEn: 'Hereditary bureaucrats', workers: { skilled: 400, gentry: 100 }, inputs: {}, outputs: {}, taxCapacity: TAX_PEOPLE_PER_LEVEL }),
      m({ id: 'admin_professional', name: '전문 관료제', nameEn: 'Professional bureaucrats', tech: 'printing', workers: { skilled: 500 }, inputs: { furniture: 100 }, outputs: {}, taxCapacity: TAX_PEOPLE_PER_LEVEL * 3 }),
    ],
  },
];

export const BUILDING_BY_ID: Record<string, BuildingTypeDef> = Object.fromEntries(BUILDING_TYPES.map((b) => [b.id, b]));

export function getMethod(typeId: string, methodId: string): MethodDef {
  const method = BUILDING_BY_ID[typeId]?.methods.find((x) => x.id === methodId);
  if (!method) throw new Error(`unknown method ${typeId}/${methodId}`);
  return method;
}

/** 건설 포인트 1점의 장부 가치 (신용 한도·경매가 계산용): 목조 건설 포인트당 비용 */
export const POINT_VALUE = 10_000;

/** 규모의 경제: 같은 지역 같은 건물 레벨당 +1%, 최대 +20% */
export function scaleBonus(level: number): number {
  return 1 + Math.min(0.2, level * 0.01);
}


/**
 * 조정값 (테스트로 여러 값을 비교하는 손잡이). 시작 전에 바꾸면 그 판 전체에 적용된다.
 * - rentShare: 소작지 수확 중 현금 지대로 저택 귀족에게 가는 비율 (그만큼 더 팔아 낸다)
 * - patronWealth, patronShare: 소작농 부가 patronWealth 아래면 귀족이 지대의 patronShare 를 돌려준다
 * - growthEq: 신분별로 출생과 사망이 같아지는 생활수준 (이보다 높으면 인구가 는다)
 * - wageRaise, wageCut, wageDrift: 건물 임금의 주간 변화율. 적자(보조금·정부 자금 건물 제외)면 −wageCut, 빈자리가 5% 넘고
 *   사람이 안 차는데 그 지역 실업 자격자가 빈자리보다 적으면 +wageRaise, 빈자리가 2% 미만이고 실업 자격자가 남으면 −wageDrift.
 *   20년 × 시드 1·2 (갈리는 값은 시드 3~8 추가) 비교, 0.03/0.05/0.01 기준:
 *   wageCut 0.01·0.02·0.03·0.1은 0.05보다 10년차 소작농 비율이 높고 건물 레벨·기술이 적다 (0.02: 레벨 −167, 기술 −1.75, 시드 1~4).
 *   wageRaise 0.01·0.02·0.05는 뚜렷한 차이가 없다 (0.02, 시드 1~8: 모든 지표 2 표준오차 안).
 *   wageDrift 0(규칙 없앰)은 노동자 생활수준이 10·20년차 +0.47/+0.36 높지만 20년차 소작농 비율이 +0.018 높다 (시드 1~8, 둘 다 2 표준오차 밖).
 *   소작농 비율(#3)과 실업을 앞에 두어 0.01을 남긴다. 0.02·0.03은 0.01과 뚜렷한 차이가 없다
 * - wageOutside: 임금 바닥 = 그 자리로 옮겨 올 사람의 지금 소득 × 이 배율 (바깥 선택지, 최저임금이 아니다).
 *   0·1·1.2·1.5 비교 (20년 × 시드 1·2): 0이면 적자 → 임금 삭감 → 수요 감소의 고리로 노동자 임금이 20년차 1.1(기본의 0.11배),
 *   노동자 생활수준이 10년차 1.03까지 떨어진다. 1.5는 10년차 노동자 생활수준이 가장 높고 건물 레벨이 가장 적다. 1.2는 main 값 그대로
 * - (없앰) wageCeil 임금 천장: 0.85를 켜도 20년차 노동자 생활수준·건물 레벨 차이가 없다 (적자 삭감이 같은 일을 한다)
 * - (없앰) reserveWeeks: 건물 준비금 상한의 주 수. 2·4·8을 시드 1~8로 비교해 차이가 없어 조정값에서 빼고 규칙 상수로 둔다 (finance.ts RESERVE_WEEKS = 4)
 * - seedWeeks: 새 건물이 완공될 때 주인(민간 투자 자금 / 국고)이 넣는 시작 현금 = 만원 주간 임금 × 이 주 수.
 *   1은 2와 뚜렷한 차이가 없고(시드 1~8, 10년차 사무소 충원율만 0.70 → 0.51), 4는 10년차 건물 레벨이 적고 기술이 늦다 (시드 1~4)
 * - aiSubsidy: AI 왕실이 보조금 규칙(적자이고 산출물이 귀한 건물을 국고가 넉넉할 때 보조)을 쓰는가. 켜도 시드 1~8에서 뚜렷한 차이가 없다
 *   (20년차 인구 +0.05백만, 노동자 생활수준 +0.16, 보조금은 국고 수입의 0.9%, 모두 2 표준오차 안). 더 간단한 쪽(끔)을 고른다.
 *   쓰지 못한 투자 자금 문제(DECISIONS 8-1)가 풀린 뒤 다시 비교한다
 * - lossBuildsPerWeek: 이익이 나는 후보가 없을 때 AI가 가장 덜 손해 보는 후보를 짓는 주간 횟수
 * - lossTolerance: 그 후보의 예상 손실이 인건비의 이 비율 이하일 때만 짓는다 (Infinity = 제한 없음)
 * - adminScale: 행정청 1레벨이 감당하는 인구 배율 (기본 50만 명 × 이 값)
 * - adminStart: 시작 행정청이 감당하는 인구 / 왕국 인구
 * - investWage: AI가 새로 지을지 판단할 때 쓰는 임금의 바닥 = 기본 임금 × 이 값 (0이면 지금 임금만 본다)
 * - localBias: 민간 상회가 그 지역 사람들 돈으로 그 지역에 지을 때 수익률에 곱하는 가산점 (1 + localBias)
 * - taxCurve: 징수율 곡선. 'exp' = 1 − e^(−x), 'hyp' = x / (1 + x) (x = 행정청 한도 / 인구)
 * - switchRate, switchPremium: 일하는 사람이 하루에 옮기는 상한 비율, 옮기는 데 필요한 소득(또는 생활수준) 배율
 * - cashBufferDays: 팝이 투자 풀로 보내지 않고 들고 있는 돈 (생활비 + 세금의 며칠분)
 * - landTax, pollTax, incomeTax: 세금 수준 3단계(보통)의 토지세율(소작지 수확 중 국고 몫), 인두세(1인당 하루), 소득세율.
 *   세 세율을 같은 배율로 비교했다 (빅토리아3 보통 단계 기준 ×1·×1.5·×2·×2.5, 20년 × 시드 1~4). ×2는 ×1보다 건물 레벨이
 *   10년차 약 50%, 20년차 약 13% 많고 실업이 낮다 (×1은 세금 단계를 1~5 모두 쓰지만 건물이 가장 적다). ×2.5는 노동자 생활수준이 가장 낮다
 * - taxLevels: 세금 수준 1~5단계가 세법의 모든 세율에 곱하는 배율
 * - officeTargetDays: 건축사무소를 늘려 공사 대기를 이 일수 안으로 맞춘다
 * - officeUseFull: 사무소 포인트 중 이 비율 이상을 공사에 실제로 쓰고 있어야 사무소를 늘린다
 * - officeBacklogDays: 공사 대기가 이 일수를 넘으면 왕실은 국고가 지출 treasuryLowWeeks 주치 이상(빚 없음)이기만 해도 사무소를 늘린다 (보통은 treasuryHighWeeks 주치 초과). Infinity = 끔.
 *   끔·60·90·180을 20년 × 시드 1~4로 비교했다 (main ca68b75 합친 뒤). 끄면 8~20년차 대기가 이 일수를 넘는 점검의 88~90%를 국고 52주 기준이 막는다.
 *   180은 끈 것보다 5년차 건물 레벨 +60, 노동자 생활수준 +0.50 (둘 다 2 표준오차 밖)이고 20년차는 차이가 없다. 60은 5년차 기술이 1.75개 늦고, 90은 20년차 노동자 생활수준이 1.59로 가장 낮다
 * - startsPerWeek: AI 회사 하나가 한 주에 새로 넣는 공사 수 상한
 * - luxuryLinear, luxuryQuad: 사치품 필요 = linear × (부 − 10) + quad × (부 − 10)²
 * - meatLinear, meatQuad: 고기 필요 = linear × (부 − 8) + quad × (부 − 8)²
 * - privateShare: 왕실이 짓는 건물(행정청·건축사무소 제외) 공사비 중 민간 상회가 내는 비율 (그만큼 지분)
 * - shrinkWeeks: 마지막 레벨의 손익이 이 주 수 동안 계속 마이너스면 AI가 철거를 시작한다
 * - officeShrinkWeeks: 건축사무소에 빈 레벨이나 남는 포인트가 이 주 수 동안 이어지면 AI가 그만큼 헌다 (빈 레벨은 그동안 한 번도 사람이 차지 않은 것만)
 * - officeIdleDays: 맡은 공사가 없는 날이 이 일수를 넘으면 사무소가 인부를 해산한다 (그동안은 임금을 주며 붙잡아 둔다)
 *   두 값은 20년 × 시드 1·2로 비교했다 (하나씩 바꿈, DECISIONS.md 7-4의 표). 철거 26주는 10~20년차 하루 사용 포인트가 69로 52주(98)보다 크게 적고,
 *   78주는 3~10년차 정부 건물 부지 몫이 26.5%(52주 24%)이고 한 지역 40% 이상 표본이 76(52주 51)이다.
 *   유예 3·7·10·14·21·28일 중 10일이 레벨을 지키면서(10~20년차 평균 858, 시드 1~4) 40% 이상 표본이 거의 없고(2) 헐린 사무소 레벨이 가장 적다
 * - salvageShare, salvageDays: 철거한 레벨 자재 중 회수하는 비율, 회수 자재를 나눠 파는 날 수
 * - swapMult: 땅이 꽉 찼을 때 새 후보 수익률이 자기 건물 마지막 레벨 수익률의 이 배수를 넘으면 그 레벨을 헌다
 * - employedMigrate: 일하는 pop 의 이주 속도 (실업 pop 대비 비율)
 * - qualSkilledL, qualExpertL: 기술자·전문가 자격이 쌓이기 시작하는 문해력
 * - qualRate: 자격이 쌓이는 속도 배율
 * - schoolValue: 왕실이 학교를 지을 때 학교가 새로 감당하는 1인당 하루 가치 (학교 1레벨 인건비 15,000 ÷ 10만 명 = 0.15)
 * - researchShare, researchLevels: 주간 연구비 = 주간 경제 규모 × researchShare × 연구비 수준 배율
 * - treasuryLowWeeks, treasuryHighWeeks: AI 왕실은 국고가 주간 국정 지출의 low 주치보다 적으면 조이고 high 주치를 넘으면 푼다.
 *   왕실 공사(사무소 증설 포함)도 high 주치를 넘는 돈으로만 한다. high 39·52·78·104 비교 (세율 ×2, 20년 × 시드 1~4): 52는 78보다
 *   건물 레벨이 약 20~30% 많고 소작농 비율이 낮다. 39는 10년차 실업 13%, 20년 인구가 가장 적다. 104는 건물이 가장 적다
 * - startTreasuryWeeks: 왕실 시작 국고 = 시작 정부 건물을 다 돌리는 주간 운영비(시작 임금, 기본가) × 이 주 수
 * - taxLaw: 시작 세법 ('land' 토지 기반 / 'capita' 1인당)
 * - peasantPoll: 1인당 과세에서 소작농이 내는 인두세 배율
 * - rawFullWealth, rawCapWealth: 원자재로 의복·생활용품을 다 채울 수 있는 부 상한, 원래 상한(max)이 되는 부 (rawMax)
 */
export const TUNE = {
  rentShare: 0.15,
  patronWealth: 2,
  patronShare: 0.5,
  growthEq: { lower: 2.5, middle: 5, upper: 5 },
  // 건물 임금 (주간, labor.ts adjustWages): 적자면 −wageCut, 사람이 모자라면 +wageRaise, 남으면 −wageDrift
  wageRaise: 0.03, // 0.01·0.02·0.05와 뚜렷한 차이 없음 (20년, 0.02는 시드 1~8, 나머지 1~4)
  wageCut: 0.05, // 0.01·0.02·0.03·0.1보다 10년차 소작농 비율이 낮고 건물·기술이 많다
  wageDrift: 0.01, // 0이면 노동자 생활수준이 높지만 소작농 비율·실업이 높다. 0.02·0.03과는 차이 없음
  // 임금 바닥 (바깥 선택지, 0 = 끔) = 옮겨 올 사람의 지금 소득 × wageOutside
  wageOutside: 1.2,
  // 새 건물 시작 현금 = 만원 주간 임금 × seedWeeks (준비금 상한은 finance.ts RESERVE_WEEKS, 조정값 아님)
  seedWeeks: 2, // 1과 차이 없음, 4는 10년차 건물이 적다
  // AI 왕실 보조금: 적자이고 산출물이 귀한(지역 가격 > 기본가) 건물을 국고가 넉넉할 때(빚 없고 지출 treasuryLowWeeks 주치 이상) 보조한다
  aiSubsidy: false, // 켜도 시드 1~8에서 뚜렷한 차이 없음: 더 간단한 쪽
  switchRate: 0.005,
  switchPremium: 1.1,
  adminScale: 0.3,
  lossBuildsPerWeek: 0,
  lossTolerance: Infinity,
  adminStart: 1,
  investWage: 0.75,
  localBias: 0.5,
  taxCurve: 'hyp' as 'exp' | 'hyp',
  cashBufferDays: 10,
  pollTax: 0.4, // 인두세: 소작농은 peasantPoll 배 (세금 수준 3단계 기준)
  incomeTax: 0.2,
  officeTargetDays: 30,
  officeUseFull: 0.9,
  officeBacklogDays: 180,
  startsPerWeek: 3,
  luxuryLinear: 0.3,
  luxuryQuad: 0.02,
  meatLinear: 0.3,
  meatQuad: 0.01,
  privateShare: 0.5,
  qualSkilledL: 0.4,
  qualExpertL: 0.6,
  qualRate: 0.25,
  schoolValue: 0.3,
  taxLaw: 'land' as 'land' | 'capita',
  landTax: 0.2, // 토지세: 소작지 수확의 20% (지대 rentShare 와 따로)
  peasantPoll: 0.25,
  rawFullWealth: 5,
  rawCapWealth: 10,
  taxLevels: [0.6, 0.8, 1, 1.2, 1.4],
  researchShare: 0.045,
  researchLevels: [0.5, 0.75, 1, 1.5, 2],
  treasuryLowWeeks: 26,
  treasuryHighWeeks: 52, // 1년치
  startTreasuryWeeks: 26,
  shrinkWeeks: 26,
  officeShrinkWeeks: 52, // 26주는 공사가 크게 줄고(10~20년차 하루 사용 포인트 69), 78주는 부지 몫과 40% 이상 지역이 늘어난다
  officeIdleDays: 10, // 사무소 새 규칙에서 3·7·10·14·21·28일 비교 (DECISIONS.md 7-4). 10일이 레벨을 지키며 한 지역 40% 이상이 거의 없고 철거가 가장 적다
  salvageShare: 0.5,
  salvageDays: 28,
  swapMult: 3,
  employedMigrate: 0.25,
};

/**
 * 소작: 소작지 1칸(레벨)에서 일할 수 있는 소작농(노동 인구)과 1인당 하루 산출.
 * 소작농은 지대·토지세를 내고 그날 쓸 만큼 남긴 뒤 나머지를 판다 (market.ts harvest).
 *   고정 판매 10%, 세금 모자라면 더 파는 규칙과 비교해 골랐다 (수치는 docs/DECISIONS.md 7-2). 조정값은 없다.
 * 곡물은 식구(소비 단위 2.5)가 부 5로 먹을 만큼이다. 의복·가구는 만들지 않는다 (공장에서만 나온다)
 */
export const SUBSISTENCE = {
  /** 소작지 1칸 = 소작농 1,000명. 다른 건물 1레벨(일꾼 1,000명)과 같아서 경작지 1칸을 농장으로 바꿔도 일자리 수는 그대로다 */
  workersPerCell: 1000,
  grainPerWorker: 2.85,
  fiberPerWorker: 0.6,
  timberPerWorker: 1.3,
};


export const LAND_NAMES: Record<LandType, string> = { arable: '농지', forest: '산림', ore: '광맥', plot: '공장 부지' };
export const LAND_NAMES_EN: Record<LandType, string> = { arable: 'Farmland', forest: 'Forest', ore: 'Ore veins', plot: 'Building plots' };
export const DEPOSIT_NAMES: Record<DepositId, string> = { iron: '철', coal: '석탄' };
export const DEPOSIT_NAMES_EN: Record<DepositId, string> = { iron: 'Iron', coal: 'Coal' };

export function regionPerk(regionId: number, typeId: string): number {
  return REGIONS.find((r) => r.id === regionId)?.perks[typeId] ?? 0;
}

// ---------------------------------------------------------------- 지역

/**
 * 지역 티어 (발전 단계). 시작 인구·계층 구성·교육·부지·경작지·시작 농장은 티어와 시드로 정한다 (world.ts regionStart).
 * 산림과 매장량은 지역마다 고정(지형)이다. 비율은 총인구 대비, 땅은 인구 10만 명당 칸 수다.
 * - pop: 인구 범위 / aristocrat·gentry·skilled·expert: 계층 비율 (나머지는 소작농) / education: 교육 접근도
 * - plot: 부지 칸 / arableSlack: 소작농 노동 인구를 다 앉힐 칸 × 이 배율이 경작지 / farms: 시작 민간 곡물 농장 레벨
 */
export interface TierDef { pop: [number, number]; aristocrat: number; gentry: number; skilled: number; expert: number; education: number; plot: number; arableSlack: number; farms: number }
export const TIERS: TierDef[] = [
  { pop: [1_000_000, 1_300_000], aristocrat: 0.007, gentry: 0.01, skilled: 0.12, expert: 0.01, education: 0.35, plot: 15, arableSlack: 1, farms: 0.3 },
  { pop: [700_000, 1_000_000], aristocrat: 0.015, gentry: 0.015, skilled: 0.06, expert: 0.004, education: 0.25, plot: 8, arableSlack: 1.1, farms: 0.2 },
  { pop: [400_000, 700_000], aristocrat: 0.02, gentry: 0.02, skilled: 0.03, expert: 0.001, education: 0.15, plot: 5, arableSlack: 1.2, farms: 0.1 },
  { pop: [200_000, 400_000], aristocrat: 0.015, gentry: 0.015, skilled: 0.02, expert: 0, education: 0.1, plot: 4, arableSlack: 1.2, farms: 0 },
];
/** 티어별 지역 수 (합 = 지역 수). 각 왕국은 티어 2 이상 지역을 하나 이상 갖는다 */
export const TIER_COUNTS = [1, 2, 3, 1];
/** 티어 수치에 시드로 주는 흔들림 (±) */
export const TIER_JITTER = 0.15;

export const REGIONS: RegionDef[] = [
  {
    id: 1, name: '벨마르 항', nameEn: 'Port Belmar', spaceport: true, neighbors: [2, 3], perks: { foodplant: 0.1, textile: 0.1, workshop: 0.1 },
    description: '',
    forest: cells(20), deposits: { iron: 0, coal: 0 },
  },
  {
    id: 2, name: '강변 평야', nameEn: 'River Plain', spaceport: false, neighbors: [1, 3, 4], perks: { farm: 0.1, fiber_farm: 0.1 },
    description: '',
    forest: cells(20), deposits: { iron: 0, coal: 0 },
  },
  {
    id: 3, name: '중앙 고원', nameEn: 'Central Highlands', spaceport: false, neighbors: [1, 2, 5, 6], perks: { farm: 0.05, railway: 0.1 },
    description: '',
    forest: cells(40), deposits: { iron: cells(20), coal: cells(10) },
  },
  {
    id: 4, name: '남부 습지', nameEn: 'Southern Marshes', spaceport: false, neighbors: [2, 5], perks: { fiber_farm: 0.15 },
    description: '',
    forest: cells(70), deposits: { iron: 0, coal: 0 },
  },
  {
    id: 5, name: '동부 삼림', nameEn: 'Eastern Forest', spaceport: false, neighbors: [3, 4, 7], perks: { lumber: 0.1, furniture: 0.1 },
    description: '',
    forest: cells(160), deposits: { iron: 0, coal: cells(20) },
  },
  {
    id: 6, name: '북부 광산지대', nameEn: 'Northern Mining District', spaceport: false, neighbors: [3, 7], perks: { mine: 0.1, coal_mine: 0.1, smelter: 0.1 },
    description: '',
    forest: cells(20), deposits: { iron: cells(60), coal: cells(40) },
  },
  {
    id: 7, name: '회색 협곡', nameEn: 'Grey Gorge', spaceport: false, neighbors: [5, 6], perks: { mine: 0.1 },
    description: '',
    forest: cells(30), deposits: { iron: cells(40), coal: cells(30) },
  },
];

// ---------------------------------------------------------------- 필요

/**
 * 필요. 필요량은 소비 단위 1의 하루 금액(기본가)이고, 상품 1개는 기본가만큼 채운다.
 * max: 그 상품이 채울 수 있는 최대 비중. appeal > 1 은 가공품(값이 내려가면 원자재 대신 돌아오는 수요)
 */
const opt = (good: GoodId, extra: { max?: number; appeal?: number } = {}) => ({ good, units: 1 / GOODS[good].basePrice, ...extra });
export const NEEDS: NeedDef[] = [
  { id: 'nourishment', name: '식량', nameEn: 'Basic food', options: [opt('grain'), opt('food', { appeal: 2 })] },
  { id: 'heating', name: '난방', nameEn: 'Heating', options: [opt('timber'), opt('fuel', { appeal: 2 })] },
  { id: 'clothing', name: '의복', nameEn: 'Simple clothing', options: [opt('fiber', { max: 0.5 }), opt('cloth', { appeal: 2 })] },
  { id: 'standard_clothing', name: '표준 의복', nameEn: 'Standard clothing', options: [opt('cloth')] },
  { id: 'crude_items', name: '생활용품', nameEn: 'Crude items', options: [opt('timber', { max: 0.5 }), opt('furniture', { appeal: 2 })] },
  { id: 'household', name: '가정용품', nameEn: 'Household items', options: [opt('furniture')] },
  { id: 'luxury', name: '사치품', nameEn: 'Luxury goods', options: [opt('luxury_furniture'), opt('luxury_cloth')] },
  { id: 'meat', name: '고기', nameEn: 'Meat', options: [opt('meat')] },
];

/**
 * 원자재로 채울 수 있는 필요의 최대 비율 (옵션의 max): 부 TUNE.rawFullWealth 이하면 100%, TUNE.rawCapWealth 이상이면 max,
 * 그 사이는 고르게 줄어든다. 가난할 때는 섬유·목재로 다 채우고, 잘살수록 의복·가구를 사야 한다. 0.1 단위로 끊는다
 */
export function rawMax(max: number | undefined, wealth: number): number {
  if (max == null) return 1;
  const t = Math.min(1, Math.max(0, (TUNE.rawCapWealth - wealth) / Math.max(1e-9, TUNE.rawCapWealth - TUNE.rawFullWealth)));
  return max + (1 - max) * Math.round(t * 10) / 10;
}

/**
 * 부 단계별 필요 묶음 (소비 단위 1의 하루 금액). 묶음 값은 대략 부 × 0.75.
 * 식량은 부 1에서 1.6, 부 5에서 2(곡물 1), 부 30까지 늘고 멈춘다. 난방·의복·생활용품은 부 10까지 늘고 멈춘다.
 * 표준 의복과 가정용품은 부 5부터 생기고, 가정용품은 부가 오를수록 더 빨리 는다. 고기는 부 8부터, 사치품(고급 가구·고급 의복)은 부 10부터 생긴다
 */
export function needsAt(wealth: number): Record<NeedId, number> {
  const L = wealth, up = Math.max(0, L - 5), rich = Math.max(0, L - 10), fed = Math.max(0, L - 8);
  return {
    nourishment: 1.5 + 0.1 * Math.min(L, 30),
    heating: 0.1 * Math.min(L, 10),
    clothing: 0.1 * Math.min(L, 10),
    standard_clothing: 0.2 * up,
    crude_items: 0.1 * Math.min(L, 10),
    household: 0.2 * up + 0.01 * up * up,
    luxury: TUNE.luxuryLinear * rich + TUNE.luxuryQuad * rich * rich,
    meat: TUNE.meatLinear * fed + TUNE.meatQuad * fed * fed,
  };
}

/** 신분별 기대 생활수준 (정치 시스템용) */

export const TICKS_PER_YEAR = 360;
export const TICKS_PER_WEEK = 7;
