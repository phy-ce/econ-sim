import type {
  BuildingTypeDef, ClassDef, DepositId, GoodDef, GoodId, HarvestDef, LandType, MethodDef, NeedDef, NeedId, PopClass, RegionDef, Skill, SkillDef, TaxLaw, InvestLaw, TechDef,
} from './types';

// 세계관: 근세에서 산업화로 넘어가는 가상의 대륙. 세 왕국이 땅을 나눠 갖는다. 화폐 단위는 플로린(ƒ).
// 상품·건물·기술은 이 파일에 정의만 추가하면 늘어난다.

/** 노동 인구 비율: pop 인구 중 일하는 사람. 나머지는 부양가족이다 (빅토리아3 기본 25%) */
export const WORKFORCE_RATIO = 0.25;
/** 부양가족은 노동 인구의 이 비율만큼 소비한다 */
export const DEPENDENT_CONSUMPTION = 0.5;
/** pop 1명당 소비 단위 (노동 인구 1명 = 1) */
export const CONSUMPTION_PER_CAPITA = WORKFORCE_RATIO + (1 - WORKFORCE_RATIO) * DEPENDENT_CONSUMPTION;

/** 지역 칸 수의 단위: 지도 정의(산림·광맥)의 1칸 = 건물 2레벨 (기본 방식 1레벨이 일꾼 500명이라 1,000명 시절의 두 배) */
export const LEVELS_PER_BLOCK = 2;

// ---------------------------------------------------------------- 단위
// 하루 단위. 상품 1개 = 한 사람이 하루에 쓰는 양(곡물 1 = 소비 단위 1의 하루 식량). 돈은 플로린.
// 건물 1레벨 = 기본 방식 일꾼 약 500명 (단계가 오를수록 준다). 정해 두는 숫자(이 파일의 값)는 둥글게 둔다.
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
  'paper',
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
  paper: { id: 'paper', name: '종이', nameEn: 'Paper', basePrice: 4 },
};

/**
 * 일자리 직종. 소유 직종의 임금은 국영 건물과 행정청에서만 쓴다 (민간 건물에서는 배당을 받는다).
 * 기본 임금: 노동자 하루 10 (식구 넷이 부 5로 산다). 기술자 2배, 전문가·소유 직종 4배
 */
export const SKILL_DEFS: Record<Skill, SkillDef> = {
  unskilled: { id: 'unskilled', name: '노동자', nameEn: 'Labourers', baseWage: 10 },
  farmer: { id: 'farmer', name: '농부', nameEn: 'Farmers', baseWage: 10 },
  skilled: { id: 'skilled', name: '기술자', nameEn: 'Skilled workers', baseWage: 15 },
  expert: { id: 'expert', name: '전문가', nameEn: 'Experts', baseWage: 40 },
  gentry: { id: 'gentry', name: '하급 귀족', nameEn: 'Gentry', baseWage: 30 },
  capitalist: { id: 'capitalist', name: '자본가', nameEn: 'Capitalists', baseWage: 40 },
  aristocrat: { id: 'aristocrat', name: '상급 귀족', nameEn: 'High nobility', baseWage: 40 },
};

export const CLASS_DEFS: Record<PopClass, ClassDef> = {
  peasant: { id: 'peasant', name: '소작농', nameEn: 'Tenant farmers', stratum: 'lower', description: '' },
  unskilled: { id: 'unskilled', name: '노동자', nameEn: 'Labourers', stratum: 'lower', description: '' },
  farmer: { id: 'farmer', name: '농부', nameEn: 'Farmers', stratum: 'lower', description: '' },
  skilled: { id: 'skilled', name: '기술자', nameEn: 'Skilled workers', stratum: 'middle', description: '' },
  expert: { id: 'expert', name: '전문가', nameEn: 'Experts', stratum: 'middle', description: '' },
  gentry: { id: 'gentry', name: '하급 귀족', nameEn: 'Gentry', stratum: 'middle', description: '' },
  capitalist: { id: 'capitalist', name: '자본가', nameEn: 'Capitalists', stratum: 'upper', description: '' },
  aristocrat: { id: 'aristocrat', name: '상급 귀족', nameEn: 'High nobility', stratum: 'upper', description: '' },
};


// ---------------------------------------------------------------- 기술 트리

const tech = (id: string, name: string, nameEn: string, tier: number, requires: string[], description: string, descriptionEn: string): TechDef =>
  ({ id, name, nameEn, cost: TECH_COST[tier], requires, description, descriptionEn });
/**
 * 단계별 연구 포인트 (예전 연구비 12:24:40:70 비율 그대로). 연구 포인트는 왕국 문해력으로 정한다 (finance.ts researchPoints).
 * 값 배율 ×1·×1.5 × 문해력 1%당 1·2·3 비교 (20년 × 시드 1·2, 2026-10-22-research): ×1.5와 3이 기술 전부를 23~30년(가운데 27년)에 열어 지금 속도(19~33년, 27년)와 같다
 */
export const TECH_COST = [0, 4_500, 9_000, 15_000, 26_250];

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

/**
 * 법(세법·투자법 선택지)마다 그 법을 여는 기술 (null = 처음부터 열림). 열린 법도 금융가 자산 비율 조건이 맞아야 바꾸기를 시작하고,
 * 바꾸는 기간(TUNE.lawDays)이 끝날 때 조건이 아직 맞아야 바뀐다 (policy.ts)
 */
export const LAW_TECH: Record<TaxLaw | InvestLaw, string | null> = {
  land: null, poll: 'ironworking', income: 'steam_rail',
  nobles: null, upper: 'printing', middle: 'bloomery', lower: 'steam_engine',
};

// ---------------------------------------------------------------- 건물과 생산 방식

const m = (def: MethodDef): MethodDef => def;
/** 행정청 1레벨이 세금을 걷을 수 있는 인구 */
export const TAX_PEOPLE_PER_LEVEL = 500_000;

/** 레벨당 일자리 (노동자, 기술자, 전문가). 10명 단위, 합은 50명 단위로 쓴다 */
const jobs = (unskilled: number, skilled = 0, expert = 0) => ({ unskilled, skilled, expert });
/** 농장·목장의 일자리: 노동자 자리 대신 농부 자리 (임금·자격은 노동자와 같다) */
const farmJobs = (farmer: number, skilled = 0, expert = 0) => ({ farmer, skilled, expert });
/** 소유 건물(저택·금융가) 1레벨의 소유주 자리 */
export const OWNERSHIP_SEATS = 100;
/** 소유한 건물 1레벨마다 소유 건물에 생기는 소유주 자리 (기본 방식 1레벨이 일꾼 500명이라 1,000명 시절 10의 절반) */
export const OWNER_SEATS_PER_LEVEL = 5;

// 레벨당 하루 값 (2026-10-22 사용자 결정, cli/methods_audit.ts 로 확인). 1레벨은 땅 1칸이자 공사 단위다.
// - 기본 방식(1단계)은 일꾼 약 500명이고 기본가·기본 임금에서 이익률 20% (±1.5%p).
// - 한 단계 오를 때마다 레벨당 이익이 2배 (2단계 = 1단계 × 2, 3단계 × 4, ±10%).
// - 단계가 오를수록 일꾼 합계는 줄고, 기술자·전문가 비율과 공구·철·석탄·기계 같은 상위 원료는 는다. 산출(레벨당)도 는다.
// - 2단계 방식은 전문가를 쓰지 않고, 3단계는 레벨당 전문가 20명까지 (대륙 전문가 약 1천 명, 거의 다 금융가에 있다).
// - 기본 방식도 공구를 10~20 쓴다 (목공구 공방만 0: 공구로 공구를 만들면 시작이 막힌다). 소작지가 공구를 조금 내서 첫날부터 공구가 있다 (SUBSISTENCE).
// - 숫자는 둥글게: 일자리 10 단위(합 50 단위), 1,000 이상인 양은 50 단위, 그 아래는 10 단위.
// - 3단계 산출이 승인 예시(농장 3,500, 철광 2,550, 방직 매출 13,200)보다 큰 것은 임금·원료를 지키고 이익 4배를 맞추려면 산술상 피할 수 없어서다.
// 공사 포인트 = 기본 방식 하루 이익 × 0.15 (50 단위). 목조 건설 포인트당 약 4,400이라 기본 방식은 약 1.8년에 회수한다 (0.1·0.2와 비교할 것).
export const BUILDING_TYPES: BuildingTypeDef[] = [
  {
    // 빈 농지에 자동으로 생긴다. 소작농이 일하고, 산출은 소작농과 지주의 현물이 된다 (SUBSISTENCE 참고)
    id: 'subsistence', name: '소작지', nameEn: 'Tenant farms', land: 'arable', buildPoints: 0, auto: true,
    methods: [m({ id: 'subsistence', name: '자급 농사', nameEn: 'Subsistence farming', workers: {}, inputs: {}, outputs: {} })],
  },
  {
    // 소유 건물 (빅토리아3 Manor House / Financial District). 지역마다 자동으로 생긴다.
    // 농지·산림·광산 건물은 저택이, 공장 부지 건물은 금융가가 소유하고, 배당은 거기서 일하는 귀족·자본가의 소득이 된다.
    // 소작지 지대도 저택이 받는다. 크기는 지역의 그 직종 인원과 소유한 건물 레벨에 맞춰 저절로 바뀐다.
    // 저택에는 하급 귀족 자리도 같은 수만큼 있다. 저택 수입은 몫으로 나눈다: 귀족 1명 1몫, 하급 귀족 1명 TUNE.gentryShare 몫
    // (빅토리아3 저택의 귀족 10몫·성직자 1몫과 같은 방식)
    id: 'manor', name: '저택', nameEn: 'Manor houses', land: 'plot', buildPoints: 0, auto: true, ownership: 'aristocrat',
    methods: [m({ id: 'manor', name: '영지 관리', nameEn: 'Estate management', workers: { aristocrat: OWNERSHIP_SEATS, gentry: OWNERSHIP_SEATS }, inputs: {}, outputs: {} })],
  },
  {
    id: 'finance', name: '금융가', nameEn: 'Financial district', land: 'plot', buildPoints: 0, auto: true, ownership: 'capitalist',
    // 금융가 = 투자 펀드: 지분을 산 pop 이 배당을 받는다. 일하는 사람은 전문가 (보장 임금 + 성과급, finance.ts payFinance). 자본가 계층은 없다
    methods: [m({ id: 'finance', name: '투자 관리', nameEn: 'Investment management', workers: { expert: OWNERSHIP_SEATS }, inputs: {}, outputs: {} })],
  },
  {
    id: 'farm', name: '곡물 농장', nameEn: 'Grain farm', land: 'arable', buildPoints: 200,
    methods: [
      m({ id: 'farm_basic', name: '곡물 재배', nameEn: 'Grain farming', workers: farmJobs(500), inputs: { tools: 10 }, outputs: { grain: 3200 } }),
      m({ id: 'farm_tools', name: '쇠 농기구', nameEn: 'Iron implements', tech: 'iron_tools', workers: farmJobs(350, 50), inputs: { tools: 50 }, outputs: { grain: 3650 } }),
      m({ id: 'farm_mech', name: '농업 기계', nameEn: 'Farm machinery', tech: 'agri_mech', workers: farmJobs(200, 40, 10), inputs: { tools: 30, fuel: 100, electronics: 30 }, outputs: { grain: 4700 } }),
    ],
  },
  {
    id: 'fiber_farm', name: '섬유 농장', nameEn: 'Fibre farm', land: 'arable', buildPoints: 200,
    methods: [
      m({ id: 'fiber_basic', name: '섬유 재배', nameEn: 'Fibre farming', workers: farmJobs(500), inputs: { tools: 10 }, outputs: { fiber: 3200 } }),
      m({ id: 'fiber_tools', name: '쇠 농기구', nameEn: 'Iron implements', tech: 'iron_tools', workers: farmJobs(350, 50), inputs: { tools: 50 }, outputs: { fiber: 3650 } }),
      m({ id: 'fiber_mech', name: '농업 기계', nameEn: 'Farm machinery', tech: 'agri_mech', workers: farmJobs(200, 40, 10), inputs: { tools: 30, fuel: 100, electronics: 30 }, outputs: { fiber: 4700 } }),
    ],
  },
  {
    // 곡물을 사료로 먹여 고기를 낸다. 곡물이 쌀수록 남는다
    id: 'ranch', name: '목장', nameEn: 'Livestock ranch', land: 'arable', buildPoints: 300,
    methods: [
      m({ id: 'ranch_basic', name: '가축 사육', nameEn: 'Livestock raising', workers: farmJobs(500), inputs: { tools: 10, grain: 1550 }, outputs: { meat: 640 } }),
    ],
  },
  {
    id: 'lumber', name: '벌목장', nameEn: 'Lumber camp', land: 'forest', buildPoints: 200,
    methods: [
      m({ id: 'lumber_manual', name: '수작업 벌목', nameEn: 'Hand felling', workers: jobs(500), inputs: { tools: 10 }, outputs: { timber: 3200 } }),
      m({ id: 'lumber_axe', name: '쇠도끼와 톱', nameEn: 'Iron axes and saws', tech: 'iron_tools', workers: jobs(300, 100), inputs: { tools: 50 }, outputs: { timber: 3800 } }),
    ],
  },
  {
    // 빅토리아3 광산: 곡괭이와 삽(공구) → 발파(폭약, 여기서는 석탄) → 증기 양수기
    id: 'mine', name: '철광산', nameEn: 'Iron mine', land: 'ore', deposit: 'iron', buildPoints: 200,
    methods: [
      m({ id: 'iron_shaft', name: '곡괭이와 삽', nameEn: 'Picks and shovels', workers: jobs(450, 50), inputs: { tools: 20 }, outputs: { ore: 1700 } }),
      m({ id: 'iron_pick', name: '발파', nameEn: 'Blasting', tech: 'iron_tools', workers: jobs(300, 100), inputs: { tools: 50, fuel: 100 }, outputs: { ore: 2000 } }),
      m({ id: 'iron_pump', name: '증기 양수기', nameEn: 'Steam pumps', tech: 'steam_pump', workers: jobs(150, 130, 20), inputs: { tools: 50, fuel: 300, electronics: 10 }, outputs: { ore: 2800 } }),
    ],
  },
  {
    id: 'coal_mine', name: '석탄광산', nameEn: 'Coal mine', land: 'ore', deposit: 'coal', buildPoints: 200,
    methods: [
      m({ id: 'coal_shaft', name: '곡괭이와 삽', nameEn: 'Picks and shovels', workers: jobs(450, 50), inputs: { tools: 20 }, outputs: { fuel: 2250 } }),
      m({ id: 'coal_pick', name: '발파', nameEn: 'Blasting', tech: 'iron_tools', workers: jobs(300, 100), inputs: { tools: 50 }, outputs: { fuel: 2550 } }),
      m({ id: 'coal_pump', name: '증기 양수기', nameEn: 'Steam pumps', tech: 'steam_pump', workers: jobs(150, 130, 20), inputs: { tools: 50, electronics: 10 }, outputs: { fuel: 3400 } }),
    ],
  },
  {
    id: 'foodplant', name: '식료품 공장', nameEn: 'Grocery plant', land: 'plot', buildPoints: 250,
    methods: [
      m({ id: 'food_manual', name: '수작업 가공', nameEn: 'Manual processing', tech: 'milling', workers: jobs(360, 40), inputs: { tools: 10, grain: 1300 }, outputs: { food: 2150 } }),
      m({ id: 'food_machine', name: '기계 가공', nameEn: 'Machine processing', tech: 'food_machinery', workers: jobs(100, 80, 20), inputs: { tools: 60, fuel: 100, grain: 1550 }, outputs: { food: 2600 } }),
    ],
  },
  {
    // 의복: 손베틀 → 방적기 → 증기 직기. 고급 의복: 맞춤 재단 → 증기 재단
    id: 'textile', name: '방직 공장', nameEn: 'Textile mill', land: 'plot', buildPoints: 300,
    methods: [
      m({ id: 'textile_hand', name: '손베틀', nameEn: 'Handlooms', tech: 'spinning', workers: jobs(360, 40), inputs: { tools: 10, fiber: 1550 }, outputs: { cloth: 1550 } }),
      m({ id: 'textile_spin', name: '방적기', nameEn: 'Spinning jennies', tech: 'ironworking', workers: jobs(210, 90), inputs: { tools: 40, fiber: 1900 }, outputs: { cloth: 1900 } }),
      m({ id: 'textile_steam', name: '증기 직기', nameEn: 'Power looms', tech: 'power_loom', workers: jobs(100, 80, 20), inputs: { tools: 60, fuel: 100, fiber: 2850 }, outputs: { cloth: 2850 } }),
      m({ id: 'textile_tailor', name: '맞춤 재단', nameEn: 'Bespoke tailoring', tech: 'spinning', workers: jobs(180, 120), inputs: { tools: 10, fiber: 440 }, outputs: { luxury_cloth: 190 } }),
      m({ id: 'textile_tailor_steam', name: '증기 재단', nameEn: 'Steam tailoring', tech: 'power_loom', workers: jobs(80, 100, 20), inputs: { tools: 60, fuel: 100, fiber: 600 }, outputs: { luxury_cloth: 250 } }),
    ],
  },
  {
    id: 'smelter', name: '제철소', nameEn: 'Ironworks', land: 'plot', buildPoints: 300,
    methods: [
      m({ id: 'smelt_charcoal', name: '목탄 제련', nameEn: 'Charcoal smelting', tech: 'bloomery', workers: jobs(360, 40), inputs: { tools: 10, ore: 600, timber: 600 }, outputs: { metal: 1250 } }),
      m({ id: 'smelt_coke', name: '코크스 제련', nameEn: 'Coke smelting', tech: 'coking', workers: jobs(210, 90), inputs: { tools: 40, ore: 780, fuel: 390 }, outputs: { metal: 1550 } }),
    ],
  },
  {
    // 목공구는 공구를 쓰지 않는다 (공구로 공구를 만들면 공구가 없을 때 시작이 막힌다). 쇠공구는 공구 대신 석탄을 쓴다
    id: 'workshop', name: '공방', nameEn: 'Tool workshop', land: 'plot', buildPoints: 200,
    methods: [
      m({ id: 'tools_wood', name: '목공구', nameEn: 'Wooden tools', tech: 'guilds', workers: jobs(360, 40), inputs: { timber: 700 }, outputs: { tools: 700 } }),
      m({ id: 'tools_iron', name: '쇠공구', nameEn: 'Iron tools', tech: 'ironworking', workers: jobs(210, 90), inputs: { fuel: 100, timber: 340, metal: 170 }, outputs: { tools: 860 } }),
    ],
  },
  {
    // 가구: 손가구 → 공구 가구. 고급 가구: 장인 가구 → 공구 장인 가구
    id: 'furniture', name: '가구 공방', nameEn: 'Furniture workshop', land: 'plot', buildPoints: 250,
    methods: [
      m({ id: 'furniture_hand', name: '손가구', nameEn: 'Hand-made furniture', tech: 'guilds', workers: jobs(360, 40), inputs: { tools: 10, timber: 800, fiber: 200 }, outputs: { furniture: 980 } }),
      m({ id: 'furniture_tools', name: '공구 가구', nameEn: 'Furniture with tools', tech: 'ironworking', workers: jobs(210, 90), inputs: { tools: 40, timber: 920, fiber: 230 }, outputs: { furniture: 1150 } }),
      m({ id: 'furniture_luxury', name: '장인 가구', nameEn: 'Master cabinetmakers', tech: 'guilds', workers: jobs(180, 120), inputs: { tools: 10, timber: 350, cloth: 70 }, outputs: { luxury_furniture: 150 } }),
      m({ id: 'furniture_luxury_tools', name: '공구 장인 가구', nameEn: 'Cabinetmakers with tools', tech: 'ironworking', workers: jobs(80, 100, 20), inputs: { tools: 60, timber: 440, cloth: 90 }, outputs: { luxury_furniture: 190 } }),
    ],
  },
  {
    // 목재를 눌러 종이를 낸다 (빅토리아3 Paper Mills, Pulp Pressing: 목재 30 → 종이 40). 전문 관료제 행정청이 쓴다. 기술 없이 지을 수 있다
    id: 'paper_mill', name: '종이 공장', nameEn: 'Paper mill', land: 'plot', buildPoints: 250,
    methods: [
      m({ id: 'pulp_press', name: '펄프 압착', nameEn: 'Pulp pressing', workers: jobs(360, 40), inputs: { tools: 10, timber: 1000 }, outputs: { paper: 1950 } }),
    ],
  },
  {
    id: 'fab', name: '기계 공장', nameEn: 'Machine works', land: 'plot', buildPoints: 300,
    methods: [
      m({ id: 'machine_steam', name: '증기 기계 제작', nameEn: 'Steam engineering', tech: 'steam_engine', workers: jobs(210, 80, 10), inputs: { tools: 20, metal: 550, fuel: 140 }, outputs: { electronics: 540 } }),
    ],
  },
  {
    // 증기 철도는 공구 대신 기계와 석탄을 쓴다
    id: 'railway', name: '운송 조합', nameEn: 'Carters\' guild', land: 'plot', buildPoints: 200,
    methods: [
      m({ id: 'rail_wagon', name: '짐마차', nameEn: 'Freight wagons', tech: 'wagonway', workers: jobs(360, 40), inputs: { tools: 10, grain: 340, timber: 220 }, outputs: { transport: 2250 } }),
      m({ id: 'rail_steam', name: '증기 철도', nameEn: 'Steam railway', tech: 'steam_rail', workers: jobs(150, 130, 20), inputs: { electronics: 30, fuel: 280 }, outputs: { transport: 2800 } }),
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
    // 이익 규칙 밖 (포인트당 비용 = (임금 + 원료) ÷ 포인트): 목조 8,850 → 2점 (포인트당 4,425), 비계 7,700 → 4점 (1,925), 철골 8,750 → 6점 (약 1,460).
    // 일꾼 1명당 포인트는 1,000명 시절과 같다 (500명 2점, 400명 4점, 300명 6점). 정부 건물 중 이것만 공장 부지를 쓴다 (빅토리아3 건설 부문만 주마다 레벨 상한이 있다)
    id: 'builder', name: '건축사무소', nameEn: 'Construction office', land: 'plot', buildPoints: 200,
    methods: [
      m({ id: 'build_manual', name: '목조 건설', nameEn: 'Timber building', workers: jobs(450, 50), inputs: { tools: 10, timber: 1500, fiber: 250 }, outputs: {}, construction: 2 }),
      m({ id: 'build_scaffold', name: '목재 비계', nameEn: 'Timber scaffolding', tech: 'scaffolding', workers: jobs(300, 100), inputs: { tools: 80, timber: 800, ore: 200 }, outputs: {}, construction: 4 }),
      m({ id: 'build_steel', name: '철골 건축', nameEn: 'Iron frames', tech: 'steel_frame', workers: jobs(150, 130, 20), inputs: { tools: 90, metal: 450 }, outputs: {}, construction: 6 }),
    ],
  },
  {
    // 세금은 행정청이 감당하는 인구만큼만 걷힌다 (1레벨 50만 명, 전문 관료제는 3배).
    // 1레벨 임금(기본): 세습 하급 귀족 50 × 30 = 1,500, 전문 기술자 100 × 15 = 1,500 + 종이 200 × 4 = 800 (한도당 비용은 전문이 약 절반).
    // 종이 200은 종이 공장 1레벨(5,000)을 몇 레벨이 나눠 쓰는 크기라 줄이지 않는다 (줄이면 종이 공급이 끊겨 방식이 오간다, 2026-10-21 비교)
    id: 'admin', name: '행정청', nameEn: 'Government administration', buildPoints: 400, stateOnly: true,
    methods: [
      m({ id: 'admin_hereditary', name: '세습 관료제', nameEn: 'Hereditary bureaucrats', workers: { gentry: 50 }, inputs: {}, outputs: {}, taxCapacity: TAX_PEOPLE_PER_LEVEL }),
      m({ id: 'admin_professional', name: '전문 관료제', nameEn: 'Professional bureaucrats', tech: 'printing', workers: { skilled: 100 }, inputs: { paper: 200 }, outputs: {}, taxCapacity: TAX_PEOPLE_PER_LEVEL * 3 }),
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
 * - rentShare: 지대 = 소작지 수확 중 먼저 떼어 바로 파는 비율. 대금은 그 지역 저택으로 (3단계, DECISIONS 7-18)
 * - nobleEconPer: 저택 상급 귀족 자리 1 (노동 인구)당 저택이 가진 주간 경제 규모 (기본가: 가진 레벨 산출 가치 + 소작지 수확, nobleSeats 'econ')
 * - patronWealth, patronShare: 소작농 부가 patronWealth 아래면 귀족이 지대의 patronShare 를 돌려준다
 * - growthEq: 신분별로 출생과 사망이 같아지는 생활수준 (이보다 높으면 인구가 는다)
 * - wageOutside: AI 임금 바닥 = 그 자리로 옮겨 올 사람들의 지금 소득 × 이 배율
 * - wageCeil: AI 임금 천장 = 회사 부가가치 중 임금으로 줄 수 있는 비율
 * - lossBuildsPerWeek: 이익이 나는 후보가 없을 때 AI가 가장 덜 손해 보는 후보를 짓는 주간 횟수
 * - lossTolerance: 그 후보의 예상 손실이 인건비의 이 비율 이하일 때만 짓는다 (Infinity = 제한 없음)
 * - adminScale: 행정청 1레벨이 감당하는 인구 배율 (기본 50만 명 × 이 값)
 * - adminStart: 시작 행정청이 감당하는 인구 / 왕국 인구
 * - investWage: AI가 새로 지을지 판단할 때 쓰는 임금의 바닥 = 기본 임금 × 이 값 (0이면 지금 임금만 본다)
 * - localBias: 저택·금융가가 자기 지역 공사에 돈을 낼 마음과, 민간 상회가 그 돈으로 그 지역에 지을 때 수익률에 곱하는 가산점 (1 + localBias)
 * - ownerTilt: 저택은 땅 건물(농지·산림·광맥), 금융가는 그 밖의 건물을 좋아한다 (AI 성향). 좋아하지 않는 종류에 낼 마음의 배율
 * - privatizeMargin, privatizePayback: 민영화 레벨을 사는 조건 (AI): 금고 ≥ 레벨 값 × privatizeMargin, 레벨 값 ÷ 그 레벨의 1년 이익 ≤ privatizePayback 년
 * - firmBufferWeeks: 민간 상회가 배당 전에 남기는 운영 자금 = 주간 (임금 + 원료) × 이 주 수 (임금·원료가 판매 대금보다 먼저 나간다)
 * - crownPrivatize: 비교용. 'all' 이면 AI 왕실이 생산 건물 모두에 민영화를 켠다 (기본 'off': 민영화는 플레이어가 켠다)
 * - taxCurve: 징수율 곡선. 'exp' = 1 − e^(−x), 'hyp' = x / (1 + x) (x = 행정청 한도 / 인구)
 * - switchRate, switchPremium, switchMax: 일하는 사람은 소득이 switchPremium 배 넘게 나은 자리로 옮긴다. 하루에 옮기는 비율은
 *   switchPremium 배일 때 switchRate 이고 소득 배율의 차이에 비례해 늘어 switchMax 에서 멈춘다 (labor.ts switchShare)
 * - cashBufferDays: 팝이 금고(저택·금융가)로 보내지 않고 들고 있는 돈 (생활비 + 세금의 며칠분)
 * - peasantKeepWeeks: 소작농이 들고 있는 저축 상한 (생활비 + 세금의 주 수). 넘는 돈은 그 지역 저택 금고로 간다
 * - landTax, pollTax, incomeTax: 세금 수준 3단계(보통)의 토지세(소작농 1인당 하루), 인두세(소작농을 뺀 1인당 하루), 소득세율(소작농을 뺀 소득).
 *   세 세율을 같은 배율로 비교했다 (빅토리아3 보통 단계 기준 ×1·×1.5·×2·×2.5, 20년 × 시드 1~4). ×2는 ×1보다 건물 레벨이
 *   10년차 약 50%, 20년차 약 13% 많고 실업이 낮다 (×1은 세금 단계를 1~5 모두 쓰지만 건물이 가장 적다). ×2.5는 노동자 생활수준이 가장 낮다
 * - taxLevels: 세금 수준 1~5단계가 세법의 모든 세율에 곱하는 배율
 * - officeTargetDays: 건축사무소를 늘려 공사 대기를 이 일수 안으로 맞춘다
 * - officeUseFull: 사무소 포인트 중 이 비율 이상을 공사에 실제로 쓰고 있어야 사무소를 늘린다
 * - startsPerWeek: AI 회사 하나가 한 주에 새로 넣는 공사 수 상한
 * - luxuryLinear, luxuryQuad: 사치품 필요 = linear × (부 − 10) + quad × (부 − 10)²
 * - meatLinear, meatQuad: 고기 필요 = linear × (부 − 8) + quad × (부 − 8)²
 * - shrinkWeeks: 마지막 레벨의 손익이 이 주 수 동안 계속 마이너스면 AI가 철거를 시작한다
 * - reserveWeeks: 건물 유보 자산 상한 = 레벨 × 지금 방식의 레벨당 주간 산출 가치(기본가) × 이 주 수. 이익의 35%를 여기까지 쌓고, 적자는 여기서 먼저 뺀다 (finance.ts settleReserve).
 *   레벨당 고정 50,000(농지 0.5주, 공장 0.2~0.3주치)과 0.25·0.5·1·2·4주 비교 (10년 거름, 20년 × 시드 1·2·3): 0.5주가 산출 비례 중 20년차 연 총생산(2,580 / 1주 2,423 / 고정 2,745)·
 *   건물 레벨(2,636 / 2,370 / 2,491)·노동자 생활수준(3.75 / 3.63 / 3.92)이 가장 낫고 철거(15~20년차 210 / 231 / 201)가 가장 적다. 4주는 10년차 총생산이 크게 준다(888 / 1,140)
 * - officeShrinkWeeks: 건축사무소에 빈 레벨이나 남는 포인트가 이 주 수 동안 이어지면 AI가 그만큼 헌다 (빈 레벨은 그동안 한 번도 사람이 차지 않은 것만)
 * - adminFillRetry: (AI) 원료 없는 방식으로 도는 행정청이 원료 충족률 기억(fillEma)을 매주 1 쪽으로 되돌리는 비율
 * - officeIdleDays: 맡은 공사가 없는 날이 이 일수를 넘으면 사무소가 인부를 해산한다 (그동안은 임금을 주며 붙잡아 둔다)
 *   두 값은 20년 × 시드 1·2로 비교했다 (하나씩 바꿈, DECISIONS.md 7-4의 표). 철거 26주는 10~20년차 하루 사용 포인트가 69로 52주(98)보다 크게 적고,
 *   78주는 3~10년차 정부 건물 부지 몫이 26.5%(52주 24%)이고 한 지역 40% 이상 표본이 76(52주 51)이다.
 *   유예 3·7·10·14·21·28일 중 10일이 레벨을 지키면서(10~20년차 평균 858, 시드 1~4) 40% 이상 표본이 거의 없고(2) 헐린 사무소 레벨이 가장 적다
 * - salvageShare, salvageDays: 철거한 레벨 자재 중 회수하는 비율, 회수 자재를 나눠 파는 날 수
 * - swapMult: 땅이 꽉 찼을 때 새 후보 수익률이 자기 건물 마지막 레벨 수익률의 이 배수를 넘으면 그 레벨을 헌다
 * - employedMigrate: 일하는 pop 의 이주 속도 (실업 pop 대비 비율)
 * - wageLossCut: 회사가 지난주 적자면 임금을 2% 깎는다
 * - qualSkilledL, qualExpertL: 기술자·전문가 자격이 쌓이기 시작하는 문해력
 * - qualRate: 자격이 쌓이는 속도 배율
 * - schoolValue: AI 왕실이 보는 학교 자리 1개의 기본 하루 가치 (학교 1레벨 인건비 15,000 ÷ 10만 명 = 0.15).
 *   실제 가치는 × (1 + 지역 문해력 부족 + 왕국 숙련 일자리 부족)이고, 목표(schoolTarget)까지의 자리만 센다 (ai.ts seatValue)
 * - schoolTarget: AI 왕실의 지역 문해력 목표. 학교 자리를 이 문해력에 닿을 만큼까지 짓는다 (기술자 자격 문턱 qualSkilledL 위여야 자격자가 나온다)
 * - schoolTaxMax: AI 왕실은 세금 수준이 이 단계 이하일 때만 새 학교를 짓는다 (운영비를 낼 세금 칸을 남긴다)
 * - govWageLevels: 국영 임금 수준 1~5단계의 배율. 국영 임금 = 기본 임금 × 왕국 임금 지수 × 이 배율
 * - researchBase, researchPerLiteracy: 주간 연구 포인트 = researchBase + researchPerLiteracy × 왕국 문해력(%, 인구 가중 평균). 돈은 들지 않는다 (finance.ts researchPoints)
 * - welfareLevels: 복지 수준 1~5단계의 목표 생활수준. 복지법이 덮는 pop 중 생활수준이 이보다 낮은 pop 의 소득을 목표 소득까지 채운다 (welfare.ts)
 * - welfareWeeks: (AI) 복지를 올리거나 켜는 조건: 국고 ≥ (복지를 뺀 주간 국정 지출 + 그 복지의 주간 예상액) × 이 주 수. 이 주 수의 절반 아래로 줄면서 국고가 줄면 내린다
 * - doneWageMax: 기술을 다 연 AI 왕국이 풂 조건에서 국영 임금을 올리는 상한 단계 (임금 지수 1 이하일 때만)
 * - treasuryLowWeeks, treasuryHighWeeks: AI 왕실은 국고가 주간 국정 지출의 low 주치보다 적으면 조이고 high 주치를 넘으면 푼다.
 *   왕실 공사(사무소 증설 포함)도 high 주치를 넘는 돈으로만 한다. high 39·52·78·104 비교 (세율 ×2, 20년 × 시드 1~4): 52는 78보다
 *   건물 레벨이 약 20~30% 많고 소작농 비율이 낮다. 39는 10년차 실업 13%, 20년 인구가 가장 적다. 104는 건물이 가장 적다
 * - startTreasuryWeeks: 왕실 시작 국고 = 시작 정부 건물을 다 돌리는 주간 운영비(시작 임금, 기본가) × 이 주 수
 * - taxLaw: 시작 세법 ('land' 토지세 / 'poll' 인두세 / 'income' 소득세, 하나만)
 * - lawDays: 세법·투자법을 바꾸는 데 걸리는 날 수
 * - lawPoll, lawIncome: 인두세·소득세로 바꿀 수 있는 금융가 자산 비율 (금융가 ÷ (저택 + 금융가), economy.ts ownershipAssets)
 * - investUpper, investMiddle, investLower: 투자법을 전문가까지·기술자까지·노동자·농부까지 넓힐 수 있는 금융가 자산 비율
 * - financeWage, financeBonus, financeStaff: 금융가 전문가의 보장 임금(하루), 성과급(금융가가 받은 배당의 비율, 인원대로), 가진 레벨 1당 전문가 자리
 * - startLumber, startFiber: 시작 민간 벌목장·섬유 농장 레벨 (지역 인구 10만 명당). 소작지가 목재·섬유를 조금만 내서 건축사무소가 첫날부터 쓸 목재가 있어야 한다
 * - rawFullWealth, rawCapWealth: 원자재로 의복·생활용품을 다 채울 수 있는 부 상한, 원래 상한(max)이 되는 부 (rawMax)
 * - harvestChance: 기상 조건이 한 지역에서 한 계절(90일)에 새로 시작할 확률 (0이면 기상 조건이 없다)
 * - harvestIntensity: 강도 범위 [최소, 최대]. 강도 1당 산출 −5% (HARVEST_STEP)
 *   확률 0.03·0.05·0.1 × 강도 [2,6]·[4,8] 비교 (20년 × 시드 1·2): 0.03이 장기 생활수준 손실이 가장 작았고, 둥근 값 0.05를 쓴다.
 *   강도 [4,8]은 지역 최저 식량이 기아선 0.4 근처까지 간다. 숫자는 DECISIONS 7-6
 * - prospectStart: 시작할 때 알려진 광맥 = 잠재량(REGIONS veins) × 이 비율 (10 단위로 반올림)
 * - prospectChance: 탐광. 계절(90일)마다 지역·자원마다 남은 잠재량이 있으면 이 확률로 광맥을 찾는다
 * - prospectFind: 한 번 찾을 때 늘어나는 광맥 = 잠재량 × 이 비율 (10 단위로 반올림, 최소 10, 남은 잠재량까지)
 */
export const TUNE = {
  /** 저택의 하급 귀족 1명 몫 (귀족 1명 = 1). 0.1·0.25·0.5 비교 (10년, 20년 × 시드 1·2, 두 번): 0.1은 하급 귀족 생활수준이 가장 낮고, 0.25와 0.5는 총생산·레벨 순서가 실행마다 바뀐다. 상급 귀족 생활수준을 덜 깎는 0.25 */
  gentryShare: 0.25,
  rentShare: 0.05,
  patronWealth: 2,
  patronShare: 0.5,
  growthEq: { lower: 2.5, middle: 5, upper: 5 },
  wageOutside: 1.2,
  wageCeil: 0.85,
  switchRate: 0.005,
  switchPremium: 1.1,
  switchMax: 0.05,
  adminScale: 0.3,
  lossBuildsPerWeek: 0,
  lossTolerance: Infinity,
  adminStart: 1,
  investWage: 0.75,
  localBias: 0.5,
  ownerTilt: 0.5,
  firmBufferWeeks: 2,
  privatizeMargin: 2,
  privatizePayback: 10,
  crownPrivatize: 'off' as 'off' | 'all',
  taxCurve: 'hyp' as 'exp' | 'hyp',
  cashBufferDays: 10,
  peasantKeepWeeks: 8,
  pollTax: 0.6, // 인두세: 소작농을 뺀 1인당 하루 (세금 수준 3단계 기준)
  incomeTax: 0.3,
  officeTargetDays: 30,
  officeUseFull: 0.9,
  startsPerWeek: 3,
  luxuryLinear: 0.3,
  luxuryQuad: 0.02,
  meatLinear: 0.3,
  meatQuad: 0.01,
  qualSkilledL: 0.4,
  qualExpertL: 0.6,
  qualRate: 0.25,
  // 저택 상급 귀족 자리 규칙 (DECISIONS 7-17. production.ts nobleSeatsOf, pops.ts matchNobles). 'econ' 이 지금 규칙(nobleEconPer, nobleAdjust), 나머지 값과 키는 비교용. aristStart 는 시작 귀족 배율
  nobleSeats: 'econ' as 'fit' | 'owned' | 'income' | 'land' | 'pop' | 'econ',
  nobleEconPer: 16000,
  nobleSeatsPerLevel: 10,
  nobleSeatsPerCell: 2,
  nobleIncome: 100,
  nobleSeatsLand: 2,
  noblePerMille: 2,
  nobleAdjust: 0.01,
  aristStart: 0.2,
  schoolValue: 0.3,
  schoolTarget: 0.6, // 0.45·0.5·0.6 비교 (DECISIONS.md 7-4): 0.6이 20년차 소작농·건물 레벨·자격자가 가장 낫다
  schoolTaxMax: 4,
  taxLaw: 'land' as TaxLaw,
  landTax: 0.02, // 토지세: 소작농 1인당 하루 (세금 수준 3단계)
  lawDays: 180,
  lawPoll: 0.1,
  lawIncome: 0.3,
  investUpper: 0.05,
  investMiddle: 0.1,
  investLower: 0.15,
  financeWage: 20,
  financeBonus: 0.1,
  financeStaff: 1, // 가진 레벨 1당 전문가. 1레벨이 일꾼 1,000명에서 약 500명으로 줄어 2의 절반
  rawFullWealth: 5,
  rawCapWealth: 10,
  taxLevels: [0.6, 0.8, 1, 1.2, 1.4],
  govWageLevels: [0.7, 0.85, 1, 1.15, 1.3],
  researchBase: 50,
  researchPerLiteracy: 3, // 1·2·3 × 기술 값 ×1·×1.5 비교 (TECH_COST 주석, DESIGN 11)
  welfareLevels: [2, 2.5, 3, 3.5, 4],
  welfareWeeks: 40, // 26·39·52·78 (시드 1·2), 30·40·50 (시드 1~3) 비교: 40이 11~20년차 총생산·노동자 생활수준이 가장 높다. 30은 10년차 총생산이 1/3 줄고, 50은 40과 비슷하다
  treasuryLowWeeks: 26,
  treasuryHighWeeks: 52, // 1년치
  // 기술을 다 연 AI 왕국의 국영 임금 상한 단계. 3(끔)·4·5 비교 (20년 × 시드 1·2): 4가 20년차 총생산 2190→2761, 지역 격차 1.87→1.34, 기술자 생활수준 5.45→5.88. 5는 격차가 다시 커진다.
  // 연구가 돈이 들지 않게 된 뒤 다시 3·4 비교 (40년 × 시드 1·2): 25~40년 총생산이 4에서 약 13% 높다 (DESIGN 11)
  doneWageMax: 4,
  startTreasuryWeeks: 26,
  shrinkWeeks: 26,
  reserveWeeks: 0.5,
  officeShrinkWeeks: 52, // 26주는 공사가 크게 줄고(10~20년차 하루 사용 포인트 69), 78주는 부지 몫과 40% 이상 지역이 늘어난다
  adminFillRetry: 0.02,
  officeIdleDays: 10, // 사무소 새 규칙에서 3·7·10·14·21·28일 비교 (DECISIONS.md 7-4). 10일이 레벨을 지키며 한 지역 40% 이상이 거의 없고 철거가 가장 적다
  salvageShare: 0.5,
  salvageDays: 28,
  swapMult: 3,
  employedMigrate: 0.25,
  wageLossCut: true,
  harvestChance: 0.05, // 계절마다 지역마다 5% (측정에서 가장 나았던 0.03에 가장 가까운 둥근 값, DECISIONS 7-6)
  harvestIntensity: [2, 6] as [number, number], // 빅토리아3 가뭄과 같은 범위 (−10~−30%)
  prospectStart: 0.3,
  prospectChance: 0.1, // 0.05·0.1·0.2 비교 (20년 × 시드 1~4, DECISIONS 7-8): 0.1과 0.2는 결과가 거의 같고 0.2는 10년차에 광맥이 거의 다 찾아진다
  prospectFind: 0.1,
  subReturn: 0,
  sellThrough: 0,
  laborNet: 0,
  minRoi: 0.2,
  minStaffing: 0.5,
  // AI 방식 바꾸기와 잠재 수요 (2026-10-22, 새 방식 사다리): 1 = 새 규칙, 0 = 옛 규칙. 40년 × 시드 1~4 비교로 둘 다 0 (DESIGN 11):
  // 둘 다 끄면 네 시드 모두 버티고(40년 평균 총생산 970), 하나라도 켜면 시드 3이 28~33년차에 민간 현금 0으로 무너진다 (평균 811~1,008)
  latentFeasible: 0, // 잠재 수요에 실제로 바꿀 수 있는 몫만 센다 (지역 일손 × 다른 투입재)
  aiSwitchV2: 0, // 방식 비교 = 건물 전체 하루 손익 × 기대 충원율 × 투입 충족 (옛: 산출 1단위당 이윤, 일손 50% 기준, 공급 50% 기준)
  aiMixedMethods: 0, // 1 = 건물 전체를 바꿀 수 없을 때 같은 지역에 더 나은 방식 1~2레벨을 따로 짓는다 (세계 규칙이 바뀌어 사용자 결정 필요, DECISIONS)
  officeRichWeeks: 52,
  officeSelfPay: 0,
  laborPoach: 0,
  officeSchoolFirst: 0,
  needMul: {} as Partial<Record<NeedId, number>>,
  startLumber: 1.2, // 1레벨이 일꾼 500명이 되어 1,000명 시절 0.6·0.2의 두 배
  startFiber: 0.4,
  // AI 수정 비교 (2026-10-22, 기본값 = 지금 동작). crownGdpReserve: 왕실이 남길 국고 = 연간 총생산 × 이 비율 (0 = 지출 treasuryHighWeeks 주치)
  crownGdpReserve: 0,
  // 금융가가 이 주 동안 공사비를 맡지 않으면 새 지분을 팔지 않고 남는 금고를 배당한다 (0 = 끔)
  financeIdle: 0,
  // AI 일손 판단을 엄격하게 (1): 다른 임금 자리에서 일하는 사람을 세지 않고, 그 지역 빈자리·공사 중 자리를 빼고, 일손이 다 차야 짓는다 (0 = 끔)
  laborStrict: 0,
  // 국고가 조이면 복지를 끝까지 줄이고 복지법을 끈다 (빚이 없어도, 세금보다 먼저). 끈 뒤 2년은 다시 켜지 않는다 (1 = 켬, 0 = 지금 동작: 빚이 있을 때만 끈다)
  welfareCutOff: 0,
  // 공사 포인트 배율 (회수 기간 손잡이, 2026-10-22). 모든 건물의 공사 포인트 = buildPoints × 이 값 (10 단위로 둥글게). 비용과 공사 일수가 같이 준다. 1·0.75·0.5 비교 (40년 × 시드 1~4): 0.75·0.5는 네 시드 중 둘이 무너져 1
  buildCostMult: 1,
};

/** 이 건물 1레벨의 공사 포인트: 표의 buildPoints × TUNE.buildCostMult, 10 단위 (공사·견적·자재·화면이 모두 이것을 쓴다) */
export function buildPointsOf(typeId: string): number {
  const base = BUILDING_BY_ID[typeId].buildPoints;
  if (!base) return 0;
  return Math.max(10, Math.round((base * TUNE.buildCostMult) / 10) * 10);
}

// ---------------------------------------------------------------- 기상 조건

/** 기상 조건을 정하는 단위 기간 (빅토리아3는 3개월마다 검사한다) */
export const HARVEST_SEASON_DAYS = 90;
/** 강도 1당 산출 감소 (빅토리아3와 같은 −5%) */
export const HARVEST_STEP = 0.05;
/** 조건 길이는 1~이 값 계절 중 고르게. 2·4 비교: 걸린 지역-시간이 같으면 결과가 같아 조정값으로 두지 않는다 (확률이 같은 일을 한다) */
export const HARVEST_MAX_SEASONS = 2;
/** 진원지의 이웃 지역마다 같은 조건이 번질 확률. 0·0.5 비교: 걸린 지역-시간이 같으면 결과가 같아 조정값으로 두지 않는다 */
export const HARVEST_SPREAD = 0.5;
/** 기상 조건 종류와 산출이 깎이는 땅. 셋 다 농지(소작지·농장·목장)를 친다 */
export const HARVEST_KINDS: HarvestDef[] = [
  { id: 'drought', name: '가뭄', nameEn: 'Drought', lands: ['arable'] },
  { id: 'flood', name: '홍수', nameEn: 'Flood', lands: ['arable', 'ore'] },
  { id: 'wildfire', name: '산불', nameEn: 'Wildfire', lands: ['arable', 'forest'] },
];

/**
 * 소작: 소작지 1칸(레벨)에서 일할 수 있는 소작농(노동 인구)과 노동 인구 1명당 하루 산출.
 * 한 줄 규칙: 소작농은 산출에서 식구가 그날 쓸 만큼 남기고 나머지를 판다 (market.ts splitHarvest). 판 돈의 절반은 지대, 토지세율만큼은 세금.
 * 산출 규칙 (식구 = 소비 단위 2.5, 부 5 기준, DESIGN 4장): 곡물 = 식량 필요 2.5 × 1.2 = 3,
 * 의복·목재·가구 = 의복·난방·생활용품 필요(각 하루 1.25플로린)의 절반을 기본가로 나눈 양 (의복 0.1, 목재 0.3, 가구 0.08).
 *   1/4(0.05·0.15·0.04)은 소작농 생활수준이 1.6~2로 떨어져 인구가 준다 (DECISIONS 7-15).
 * 공구 0.002: 기본 방식이 모두 공구를 조금 써서(레벨당 10~20) 공방이 없는 첫날에도 공구가 있어야 한다 (공구가 떨어지면 목조 건설도 멈춰 공방을 못 짓는다).
 *   첫날 수요 약 1,560에 공급 약 2,200. 0.005는 약 5,600이라 공구값을 눌러 공방이 몇 년 서지 못한다 (0.001·0.002·0.005 비교할 것).
 * 기본 방식 건물 일꾼 1명 산출은 소작농의 곡물 2.1배, 의복 39배, 목재 21배, 가구 31배다
 */
export const SUBSISTENCE = {
  /** 소작지 1칸 = 소작농 500명. 농장 기본 방식 1레벨(농부 500명)과 같아서 경작지 1칸을 농장으로 바꿔도 일자리 수는 그대로다 */
  workersPerCell: 500,
  output: { grain: 3, cloth: 0.1, timber: 0.3, furniture: 0.08, tools: 0.002 } as Partial<Record<GoodId, number>>,
};


export const LAND_NAMES: Record<LandType, string> = { arable: '농지', forest: '산림', ore: '광맥', plot: '공장 부지' };
export const LAND_NAMES_EN: Record<LandType, string> = { arable: 'Farmland', forest: 'Forest', ore: 'Ore veins', plot: 'Building plots' };
export const DEPOSIT_NAMES: Record<DepositId, string> = { iron: '철', coal: '석탄' };
export const DEPOSIT_NAMES_EN: Record<DepositId, string> = { iron: 'Iron', coal: 'Coal' };
/** 탐광 알림에 쓰는 광맥 이름 */
export const VEIN_NAMES: Record<DepositId, string> = { iron: '철광맥', coal: '탄맥' };
export const VEIN_NAMES_EN: Record<DepositId, string> = { iron: 'iron veins', coal: 'coal seams' };

export function regionPerk(regionId: number, typeId: string): number {
  return REGIONS.find((r) => r.id === regionId)?.perks[typeId] ?? 0;
}

// ---------------------------------------------------------------- 지역

/**
 * 지역 티어 (발전 단계). 시작 인구·계층 구성·교육·부지·경작지·시작 농장은 티어와 시드로 정한다 (world.ts regionStart).
 * 산림과 광맥 잠재량(veins)은 지역마다 고정(지형)이다. 광맥은 처음에 잠재량 × TUNE.prospectStart 만 알려져 있고 나머지는 탐광으로 찾는다 (economy.ts prospect). 비율은 총인구 대비, 땅은 인구 10만 명당 칸 수다.
 * - pop: 인구 범위 / aristocrat·gentry·skilled·expert: 계층 비율 (나머지는 소작농) / education: 교육 접근도
 * - plot: 부지 칸 / arableSlack: 소작농 노동 인구를 다 앉힐 칸 × 이 배율이 경작지 / farms: 시작 민간 곡물 농장 레벨
 * plot·farms 는 1레벨이 일꾼 1,000명에서 약 500명이 될 때(2026-10-22) 두 배로 했다 (같은 땅에 같은 일자리)
 */
export interface TierDef { pop: [number, number]; aristocrat: number; gentry: number; skilled: number; expert: number; education: number; plot: number; arableSlack: number; farms: number }
export const TIERS: TierDef[] = [
  { pop: [1_000_000, 1_300_000], aristocrat: 0.007, gentry: 0.01, skilled: 0.12, expert: 0.01, education: 0.35, plot: 300, arableSlack: 1, farms: 0.6 },
  { pop: [700_000, 1_000_000], aristocrat: 0.015, gentry: 0.015, skilled: 0.06, expert: 0.004, education: 0.25, plot: 160, arableSlack: 1.1, farms: 0.4 },
  { pop: [400_000, 700_000], aristocrat: 0.02, gentry: 0.02, skilled: 0.03, expert: 0.001, education: 0.15, plot: 100, arableSlack: 1.2, farms: 0.2 },
  { pop: [200_000, 400_000], aristocrat: 0.015, gentry: 0.015, skilled: 0.02, expert: 0, education: 0.1, plot: 80, arableSlack: 1.2, farms: 0 },
];
/** 티어별 지역 수 (합 = 지역 수). 각 왕국은 티어 2 이상 지역을 하나 이상 갖는다 */
export const TIER_COUNTS = [1, 2, 3, 1];
/** 티어 수치에 시드로 주는 흔들림 (±) */
export const TIER_JITTER = 0.15;

export const REGIONS: RegionDef[] = [
  {
    id: 1, name: '벨마르 항', nameEn: 'Port Belmar', spaceport: true, neighbors: [2, 3], perks: { foodplant: 0.1, textile: 0.1, workshop: 0.1 },
    description: '',
    forest: cells(30), veins: { iron: 0, coal: 0 },
  },
  {
    id: 2, name: '강변 평야', nameEn: 'River Plain', spaceport: false, neighbors: [1, 3, 4], perks: { farm: 0.1, fiber_farm: 0.1 },
    description: '',
    forest: cells(30), veins: { iron: 0, coal: 0 },
  },
  {
    id: 3, name: '중앙 고원', nameEn: 'Central Highlands', spaceport: false, neighbors: [1, 2, 5, 6], perks: { farm: 0.05, railway: 0.1 },
    description: '',
    forest: cells(60), veins: { iron: cells(60), coal: cells(30) },
  },
  {
    id: 4, name: '남부 습지', nameEn: 'Southern Marshes', spaceport: false, neighbors: [2, 5], perks: { fiber_farm: 0.15 },
    description: '',
    forest: cells(100), veins: { iron: 0, coal: 0 },
  },
  {
    id: 5, name: '동부 삼림', nameEn: 'Eastern Forest', spaceport: false, neighbors: [3, 4, 7], perks: { lumber: 0.1, furniture: 0.1 },
    description: '',
    forest: cells(200), veins: { iron: 0, coal: cells(60) },
  },
  {
    id: 6, name: '북부 광산지대', nameEn: 'Northern Mining District', spaceport: false, neighbors: [3, 7], perks: { mine: 0.1, coal_mine: 0.1, smelter: 0.1 },
    description: '',
    forest: cells(30), veins: { iron: cells(200), coal: cells(150) },
  },
  {
    id: 7, name: '회색 협곡', nameEn: 'Grey Gorge', spaceport: false, neighbors: [5, 6], perks: { mine: 0.1 },
    description: '',
    forest: cells(50), veins: { iron: cells(150), coal: cells(100) },
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
  const out: Record<NeedId, number> = {
    nourishment: 1.5 + 0.1 * Math.min(L, 30),
    heating: 0.1 * Math.min(L, 10),
    clothing: 0.1 * Math.min(L, 10),
    standard_clothing: 0.2 * up,
    crude_items: 0.1 * Math.min(L, 10),
    household: 0.2 * up + 0.01 * up * up,
    luxury: TUNE.luxuryLinear * rich + TUNE.luxuryQuad * rich * rich,
    meat: TUNE.meatLinear * fed + TUNE.meatQuad * fed * fed,
  };
  // 비교 실행용 필요량 배율 (기본은 비어 있다)
  for (const k in TUNE.needMul) out[k as NeedId] *= TUNE.needMul[k as NeedId]!;
  return out;
}

/** 신분별 기대 생활수준 (정치 시스템용) */

export const TICKS_PER_YEAR = 360;
export const TICKS_PER_WEEK = 7;

/** 교육 접근도의 바닥값과 학교가 모든 인구를 감당할 때의 최대 상승폭 (tick.ts updateEducation, AI 학교 목표 ai.ts schoolWanted) */
export const EDUCATION_FLOOR = 0.1;
export const EDUCATION_RANGE = 0.8;
