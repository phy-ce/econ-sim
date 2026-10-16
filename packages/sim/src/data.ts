import type { BuildingTypeDef, ClassDef, GoodDef, GoodId, MethodDef, NeedDef, NeedId, PopClass, RegionDef, SkillDef, TechDef } from './types';

// 세계관: 가상의 근세 국가 "에스테라 왕국". 화폐 단위는 플로린(ƒ).
// 기본 생산 방식은 일손이 많이 들고 생산성이 낮다. 기술을 연구하면 적은 인원과 숙련 인력으로 더 많이 만든다.

/**
 * 인구 규모 배율. 인구, 창고 재고, 시작 자본과 은행·상인 자본, 신용 한도 기본값, 연구비, 기술 비용이 이 배율로 커진다.
 * 1인당 필요량, 1인당 임금, 가격은 그대로라서 경제의 움직임은 같고 숫자만 커진다.
 */
export const POP_SCALE = 100;

/**
 * 건물 1레벨의 크기 배율. 건물 1레벨당 인원·투입·산출·건설 포인트, 공사에 드는 포인트, 소유주 자리, 학교 정원이 이 배율을 받는다.
 * 레벨 하나는 시장에 비해 작고(산출 하루 100단위 미만), 지역 경제는 수십~수백 레벨로 이뤄진다 (빅토리아3 방식).
 */
export const BUILDING_SCALE = 3;
/** 인구 규모 대비 건물 레벨 수: 예전(인구 배율 크기의) 건물 하나 = 레벨 LEVELS_PER_BLOCK 개 */
export const LEVELS_PER_BLOCK = POP_SCALE / BUILDING_SCALE;
/** 땅 칸 수: 레벨 하나가 한 칸을 쓰므로 땅도 같은 비율로 잘게 나눈다 */
const cells = (n: number) => Math.round(n * LEVELS_PER_BLOCK);

export const GOOD_IDS: GoodId[] = [
  'grain', 'fiber', 'timber', 'ore',
  'food', 'fuel', 'cloth', 'metal', 'tools',
  'furniture', 'electronics', 'transport',
];

export const GOODS: Record<GoodId, GoodDef> = {
  grain: { id: 'grain', name: '곡물', nameEn: 'Grain', basePrice: 5, minStock: 4000 * POP_SCALE },
  fiber: { id: 'fiber', name: '섬유작물', nameEn: 'Fibre', basePrice: 5, minStock: 1500 * POP_SCALE },
  timber: { id: 'timber', name: '목재', nameEn: 'Timber', basePrice: 5, minStock: 2500 * POP_SCALE },
  ore: { id: 'ore', name: '광석', nameEn: 'Ore', basePrice: 6, minStock: 750 * POP_SCALE },
  food: { id: 'food', name: '가공식품', nameEn: 'Food', basePrice: 20, minStock: 2000 * POP_SCALE },
  fuel: { id: 'fuel', name: '연료', nameEn: 'Fuel', basePrice: 15, minStock: 1250 * POP_SCALE },
  cloth: { id: 'cloth', name: '의복', nameEn: 'Clothing', basePrice: 30, minStock: 750 * POP_SCALE },
  metal: { id: 'metal', name: '금속', nameEn: 'Metal', basePrice: 35, minStock: 300 * POP_SCALE },
  tools: { id: 'tools', name: '공구', nameEn: 'Tools', basePrice: 40, minStock: 250 * POP_SCALE },
  furniture: { id: 'furniture', name: '가구', nameEn: 'Furniture', basePrice: 80, minStock: 150 * POP_SCALE },
  electronics: { id: 'electronics', name: '정밀기계', nameEn: 'Instruments', basePrice: 300, minStock: 40 * POP_SCALE },
  transport: { id: 'transport', name: '운송', nameEn: 'Transport', basePrice: 10, minStock: 0 * POP_SCALE, perishable: true },
};

export const SKILL_DEFS: Record<'unskilled' | 'skilled' | 'expert', SkillDef> = {
  unskilled: { id: 'unskilled', name: '노동자', nameEn: 'Labourers', baseWage: 1 },
  skilled: { id: 'skilled', name: '기술자', nameEn: 'Skilled workers', baseWage: 2 },
  expert: { id: 'expert', name: '전문가', nameEn: 'Experts', baseWage: 4 },
};

export const CLASS_DEFS: Record<PopClass, ClassDef> = {
  unskilled: { id: 'unskilled', name: '노동자', nameEn: 'Labourers', stratum: 'lower', description: '농장과 공장에서 임금을 받고 일한다. 일자리를 오래 잃으면 소작농으로 돌아간다.', descriptionEn: 'Work for wages on farms and in factories. After a long time without work they go back to the land as tenant farmers.' },
  peasant: { id: 'peasant', name: '소작농', nameEn: 'Tenant farmers', stratum: 'lower', description: '지주의 빈 농지를 빌려 농사를 짓는다. 먹고 입을 현물만 남기고 판 것은 전부 지대로 지주에게 간다. 공장 일자리가 생기면 노동자가 된다.', descriptionEn: 'Rent a landlord\'s empty land and farm it. They keep only the food and clothing they need in kind; everything they sell goes to the landlord as rent. They become labourers when factory jobs open up.' },
  skilled: { id: 'skilled', name: '기술자', nameEn: 'Skilled workers', stratum: 'middle', description: '교육을 받은 숙련 인력. 학교와 교육 수준이 공급을 정한다.', descriptionEn: 'Trained workers. Schools and the education level set their supply.' },
  expert: { id: 'expert', name: '전문가', nameEn: 'Experts', stratum: 'middle', description: '고급 기술에 필요한 인력. 연구비의 대부분이 이들의 소득이 된다.', descriptionEn: 'Staff needed by advanced technology. Most research spending becomes their income.' },
  capitalist: { id: 'capitalist', name: '자본가', nameEn: 'Capitalists', stratum: 'upper', description: '공장 부지에 세운 회사 지분을 가진 계층. 공장 이윤의 배당을 받는다.', descriptionEn: 'Hold the shares of companies built on factory plots and receive dividends from factory profits.' },
  aristocrat: { id: 'aristocrat', name: '지주 귀족', nameEn: 'Landed aristocrats', stratum: 'upper', description: '땅을 가진 계층. 농장·벌목장·광산 배당과 소작농의 지대를 받는다.', descriptionEn: 'The landowning class. Receive dividends from farms, lumber camps and mines, and rent from tenant farmers.' },
};

export const STRATUM_NAMES = { lower: '하층', middle: '중층', upper: '상층' } as const;
export const STRATUM_NAMES_EN = { lower: 'Lower', middle: 'Middle', upper: 'Upper' } as const;

export const TECHS: TechDef[] = [
  // 1단계: 가공 산업을 여는 기술 (선행 없음). 최대 연구비로 약 한 달
  { id: 'milling', name: '제분과 가공', nameEn: 'Milling and curing', cost: 15000 * POP_SCALE, requires: [], description: '물레방아 방앗간과 염장 기술. 식품 공장을 지을 수 있다.', descriptionEn: 'Water mills and salting. Unlocks food plants.' },
  { id: 'charcoal', name: '숯가마', nameEn: 'Charcoal kilns', cost: 15000 * POP_SCALE, requires: [], description: '나무를 구워 숯을 만든다. 연료 공장을 지을 수 있다.', descriptionEn: 'Burn wood into charcoal. Unlocks fuel works.' },
  { id: 'spinning', name: '물레와 베틀', nameEn: 'Spinning wheel and loom', cost: 15000 * POP_SCALE, requires: [], description: '실을 잣고 천을 짠다. 방직 공장을 지을 수 있다.', descriptionEn: 'Spin yarn and weave cloth. Unlocks textile mills.' },
  { id: 'bloomery', name: '괴철로', nameEn: 'Bloomery', cost: 16000 * POP_SCALE, requires: [], description: '광석을 녹여 쇠를 얻는다. 제련소를 지을 수 있다.', descriptionEn: 'Smelt ore into iron. Unlocks smelters.' },
  { id: 'printing', name: '인쇄술', nameEn: 'Printing press', cost: 15000 * POP_SCALE, requires: [], description: '값싼 책과 교본. 학교를 지을 수 있다.', descriptionEn: 'Cheap books and primers. Unlocks schools.' },
  { id: 'wagonway', name: '마차 궤도', nameEn: 'Wagonways', cost: 16000 * POP_SCALE, requires: [], description: '말이 끄는 나무 궤도. 철도를 지어 지역 간 운송비를 줄일 수 있다.', descriptionEn: 'Horse-drawn timber tracks. Unlocks railways, which cut transport costs between regions.' },
  // 2단계
  { id: 'guilds', name: '장인 길드', nameEn: 'Craft guilds', cost: 20000 * POP_SCALE, requires: ['bloomery'], description: '대장장이와 목수의 조합. 공방(공구·가구)과 목재 비계 건설을 연다.', descriptionEn: 'Guilds of smiths and carpenters. Unlocks workshops (tools and furniture) and timber scaffolding for construction.' },
  { id: 'agri_mech', name: '농업 개량', nameEn: 'Improved farming', cost: 25000 * POP_SCALE, requires: ['guilds'], description: '개량 농기구와 윤작. 농장 일손이 절반으로 줄고 수확은 늘어난다.', descriptionEn: 'Better implements and crop rotation. Farms need half the hands and harvest more.' },
  { id: 'power_saw', name: '수력 제재소', nameEn: 'Water-powered sawmill', cost: 22000 * POP_SCALE, requires: ['guilds'], description: '물레방아로 돌리는 톱. 벌목장 생산성이 크게 오른다.', descriptionEn: 'Saws driven by water wheels. Lumber camp output rises sharply.' },
  { id: 'mineral_fuel', name: '석탄 연료', nameEn: 'Coal fuel', cost: 25000 * POP_SCALE, requires: ['charcoal'], description: '광석과 함께 캐낸 석탄을 연료로 쓴다. 목재 없이도 연료를 만든다.', descriptionEn: 'Burn the coal dug up with ore. Makes fuel without timber.' },
  // 3단계
  { id: 'mech_mining', name: '양수기 채굴', nameEn: 'Pumped mining', cost: 35000 * POP_SCALE, requires: ['power_saw', 'mineral_fuel'], description: '갱도의 물을 퍼내는 양수기. 깊이 팔 수 있어 채굴량이 늘지만 전문가가 필요하다.', descriptionEn: 'Pumps drain the shafts so mines can go deeper. More ore, but experts are needed.' },
  { id: 'power_loom', name: '수력 직기', nameEn: 'Water-powered loom', cost: 35000 * POP_SCALE, requires: ['spinning', 'power_saw'], description: '물레방아로 돌리는 직기. 의복을 적은 인원으로 더 많이 만든다.', descriptionEn: 'Looms driven by water wheels. More clothing from fewer workers.' },
  { id: 'refrigeration', name: '식품 보존법', nameEn: 'Food preservation', cost: 30000 * POP_SCALE, requires: ['milling', 'mineral_fuel'], description: '염장과 밀봉 보존. 식품 공장에서 곡물 손실을 줄인다.', descriptionEn: 'Salting and sealed preserving. Food plants lose less grain.' },
  // 4단계
  { id: 'steel_frame', name: '철골 공법', nameEn: 'Steel frames', cost: 40000 * POP_SCALE, requires: ['mech_mining'], description: '쇠로 뼈대를 세운다. 건축사무소가 훨씬 빨리 짓는다.', descriptionEn: 'Build on an iron skeleton. Construction offices build much faster.' },
  { id: 'steam_rail', name: '증기 철도', nameEn: 'Steam railways', cost: 45000 * POP_SCALE, requires: ['wagonway', 'mech_mining'], description: '증기 기관차가 달리는 철도. 같은 인원으로 운송량이 세 배가 된다.', descriptionEn: 'Railways run by steam locomotives. Three times the transport from the same staff.' },
  // 5단계
  { id: 'electronics', name: '정밀 기계공학', nameEn: 'Precision engineering', cost: 60000 * POP_SCALE, requires: ['mech_mining', 'power_loom'], description: '시계·계측기 같은 정밀기계를 만드는 정밀 공방을 지을 수 있다. 전문가가 많이 필요하다.', descriptionEn: 'Unlocks precision workshops that make clocks, gauges and other instruments. Needs many experts.' },
];

export const TECH_BY_ID: Record<string, TechDef> = Object.fromEntries(TECHS.map((t) => [t.id, t]));

const scaleBag = <T extends Record<string, number | undefined>>(bag: T): T =>
  Object.fromEntries(Object.entries(bag).map(([k, v]) => [k, (v ?? 0) * BUILDING_SCALE])) as T;
/** 생산 방식 정의: 건물 1레벨당 인원·투입·산출·건설 포인트는 건물 크기 배율만큼 커진다 */
const m = (def: MethodDef): MethodDef => ({
  ...def,
  workers: scaleBag(def.workers),
  inputs: scaleBag(def.inputs),
  outputs: scaleBag(def.outputs),
  ...(def.construction ? { construction: def.construction * BUILDING_SCALE } : {}),
});

export const BUILDING_TYPES: BuildingTypeDef[] = [
  {
    id: 'farm', name: '농장', nameEn: 'Farm', land: 'arable', buildPoints: 450 * BUILDING_SCALE,
    methods: [
      m({ id: 'farm_grain', name: '곡물 재배', nameEn: 'Grain farming', workers: { unskilled: 100, skilled: 4 }, inputs: {}, outputs: { grain: 24 } }),
      m({ id: 'farm_fiber', name: '섬유작물 재배', nameEn: 'Fibre farming', workers: { unskilled: 100, skilled: 4 }, inputs: {}, outputs: { fiber: 24 } }),
      // 기술 없이도 쓸 수 있는 공구 방식: 쇠 농기구를 쓰면 같은 일손으로 더 거둔다 (공구는 처음엔 수입품)
      m({ id: 'farm_grain_tools', name: '쇠 농기구 곡물', nameEn: 'Grain with iron tools', workers: { unskilled: 90, skilled: 4 }, inputs: { tools: 0.25 }, outputs: { grain: 31 } }),
      m({ id: 'farm_fiber_tools', name: '쇠 농기구 섬유', nameEn: 'Fibre with iron tools', workers: { unskilled: 90, skilled: 4 }, inputs: { tools: 0.25 }, outputs: { fiber: 31 } }),
      m({ id: 'farm_grain_mech', name: '개량 곡물 농법', nameEn: 'Improved grain farming', tech: 'agri_mech', workers: { unskilled: 45, skilled: 8 }, inputs: { tools: 0.6 }, outputs: { grain: 32 } }),
      m({ id: 'farm_fiber_mech', name: '개량 섬유 농법', nameEn: 'Improved fibre farming', tech: 'agri_mech', workers: { unskilled: 45, skilled: 8 }, inputs: { tools: 0.6 }, outputs: { fiber: 32 } }),
    ],
  },
  {
    id: 'lumber', name: '벌목장', nameEn: 'Lumber camp', land: 'forest', buildPoints: 400 * BUILDING_SCALE,
    methods: [
      m({ id: 'lumber_manual', name: '수작업 벌목', nameEn: 'Hand felling', workers: { unskilled: 80, skilled: 4 }, inputs: {}, outputs: { timber: 20 } }),
      m({ id: 'lumber_axe', name: '쇠도끼와 톱', nameEn: 'Iron axes and saws', workers: { unskilled: 72, skilled: 4 }, inputs: { tools: 0.25 }, outputs: { timber: 27 } }),
      m({ id: 'lumber_saw', name: '수력 제재', nameEn: 'Water-powered sawing', tech: 'power_saw', workers: { unskilled: 40, skilled: 8 }, inputs: { fuel: 1.5, tools: 0.3 }, outputs: { timber: 30 } }),
    ],
  },
  {
    id: 'mine', name: '광산', nameEn: 'Mine', land: 'ore', buildPoints: 600 * BUILDING_SCALE,
    methods: [
      m({ id: 'mine_manual', name: '갱도 채굴', nameEn: 'Shaft mining', workers: { unskilled: 90, skilled: 8 }, inputs: {}, outputs: { ore: 20 } }),
      m({ id: 'mine_pick', name: '쇠곡괭이 채굴', nameEn: 'Iron pick mining', workers: { unskilled: 82, skilled: 8 }, inputs: { tools: 0.3 }, outputs: { ore: 27 } }),
      m({ id: 'mine_mech', name: '양수 채굴', nameEn: 'Pumped mining', tech: 'mech_mining', workers: { unskilled: 40, skilled: 14, expert: 2 }, inputs: { fuel: 1.8, tools: 0.5 }, outputs: { ore: 33 } }),
    ],
  },
  {
    id: 'foodplant', name: '식품 공장', nameEn: 'Food plant', land: 'plot', buildPoints: 166.667 * BUILDING_SCALE,
    methods: [
      m({ id: 'food_basic', name: '기본 가공', nameEn: 'Basic processing', tech: 'milling', workers: { unskilled: 24, skilled: 3.5 }, inputs: { grain: 9.3333 }, outputs: { food: 5 } }),
      m({ id: 'food_frozen', name: '보존 가공', nameEn: 'Preserving', tech: 'refrigeration', workers: { unskilled: 12, skilled: 6, expert: 0.7 }, inputs: { grain: 10, fuel: 0.6667 }, outputs: { food: 6.3333 } }),
    ],
  },
  {
    id: 'fuelworks', name: '연료 공장', nameEn: 'Fuel works', land: 'plot', buildPoints: 450 * BUILDING_SCALE,
    methods: [
      m({ id: 'fuel_wood', name: '목탄 연료', nameEn: 'Charcoal fuel', tech: 'charcoal', workers: { unskilled: 40, skilled: 5 }, inputs: { timber: 20 }, outputs: { fuel: 13 } }),
      m({ id: 'fuel_ore', name: '석탄 연료', nameEn: 'Coal fuel', tech: 'mineral_fuel', workers: { unskilled: 35, skilled: 10 }, inputs: { ore: 15 }, outputs: { fuel: 15 } }),
    ],
  },
  {
    id: 'textile', name: '방직 공장', nameEn: 'Textile mill', land: 'plot', buildPoints: 500 * BUILDING_SCALE,
    methods: [
      m({ id: 'textile_hand', name: '수직기', nameEn: 'Handloom', tech: 'spinning', workers: { unskilled: 65, skilled: 8 }, inputs: { fiber: 25 }, outputs: { cloth: 8.5 } }),
      m({ id: 'textile_power', name: '수력 직기', nameEn: 'Power loom', tech: 'power_loom', workers: { unskilled: 30, skilled: 16, expert: 2 }, inputs: { fiber: 25, fuel: 3 }, outputs: { cloth: 11.5 } }),
    ],
  },
  {
    id: 'smelter', name: '제련소', nameEn: 'Smelter', land: 'plot', buildPoints: 200 * BUILDING_SCALE,
    methods: [
      m({ id: 'smelt_basic', name: '용광로', nameEn: 'Furnace', tech: 'bloomery', workers: { unskilled: 16.6667, skilled: 4 }, inputs: { ore: 6.6667, fuel: 1.3333 }, outputs: { metal: 3 } }),
    ],
  },
  {
    id: 'workshop', name: '공방', nameEn: 'Workshop', land: 'plot', buildPoints: 225 * BUILDING_SCALE,
    methods: [
      m({ id: 'ws_tools', name: '공구 제작', nameEn: 'Toolmaking', tech: 'guilds', workers: { unskilled: 22.5, skilled: 7.5 }, inputs: { metal: 2, timber: 3 }, outputs: { tools: 4 } }),
      m({ id: 'ws_furniture', name: '가구 제작', nameEn: 'Furniture making', tech: 'guilds', workers: { unskilled: 22.5, skilled: 5 }, inputs: { timber: 5, cloth: 1 }, outputs: { furniture: 1.6 } }),
    ],
  },
  {
    id: 'fab', name: '정밀 공방', nameEn: 'Precision workshop', land: 'plot', buildPoints: 800 * BUILDING_SCALE,
    methods: [
      m({ id: 'fab_basic', name: '정밀 조립', nameEn: 'Precision assembly', tech: 'electronics', workers: { unskilled: 30, skilled: 44, expert: 14 }, inputs: { metal: 5, tools: 1, fuel: 3 }, outputs: { electronics: 2 } }),
    ],
  },
  {
    // 지역 간 교역·개항장 수출입에 필요한 운송을 만든다. 모자라면 짐꾼과 마차로 옮겨 비용이 크게 든다
    id: 'railway', name: '철도', nameEn: 'Railway', land: 'plot', buildPoints: 125 * BUILDING_SCALE,
    methods: [
      m({ id: 'rail_horse', name: '마차 철도', nameEn: 'Horse railway', tech: 'wagonway', workers: { unskilled: 10, skilled: 1 }, inputs: { grain: 0.75, timber: 0.25 }, outputs: { transport: 2 } }),
      m({ id: 'rail_steam', name: '증기 철도', nameEn: 'Steam railway', tech: 'steam_rail', workers: { unskilled: 5, skilled: 2, expert: 0.25 }, inputs: { fuel: 0.75, metal: 0.125, tools: 0.125 }, outputs: { transport: 6 } }),
    ],
  },
  {
    id: 'school', name: '학교', nameEn: 'School', land: 'plot', buildPoints: 500 * BUILDING_SCALE,
    methods: [
      m({ id: 'school_basic', name: '공립 학교', nameEn: 'Public school', tech: 'printing', workers: { unskilled: 15, skilled: 5 }, inputs: {}, outputs: {}, grant: 1.25 }),
    ],
  },
];

// 건축사무소: 건설 포인트를 만든다. 모든 공사는 이 포인트로 진행되고, 방식이 좋을수록 하루 포인트가 많다
BUILDING_TYPES.push({
  id: 'builder', name: '건축사무소', nameEn: 'Construction office', land: 'plot', buildPoints: 400 * BUILDING_SCALE,
  methods: [
    m({ id: 'build_manual', name: '인력 건설', nameEn: 'Manual building', workers: { unskilled: 30, skilled: 3 }, inputs: { timber: 4 }, outputs: {}, construction: 12 }),
    m({ id: 'build_scaffold', name: '목재 비계', nameEn: 'Timber scaffolding', tech: 'guilds', workers: { unskilled: 15, skilled: 6 }, inputs: { timber: 6, tools: 0.6 }, outputs: {}, construction: 22 }),
    m({ id: 'build_steel', name: '철골 공법', nameEn: 'Steel frames', tech: 'steel_frame', workers: { unskilled: 14, skilled: 6, expert: 1 }, inputs: { timber: 5, metal: 2, tools: 1.2 }, outputs: {}, construction: 40 }),
  ],
});

/** 건설 포인트 1점의 장부 가치 (신용 한도·경매가 계산용) */
export const POINT_VALUE = 3;

/** 규모의 경제: 같은 건물이 10블록(레벨 10 × LEVELS_PER_BLOCK) 늘 때마다 생산성 +10%, 최대 +50% */
export function scaleBonus(level: number): number {
  return 1 + Math.min(0.5, Math.floor(level / (10 * LEVELS_PER_BLOCK) + 1e-9) * 0.1);
}

export const BUILDING_BY_ID: Record<string, BuildingTypeDef> =
  Object.fromEntries(BUILDING_TYPES.map((b) => [b.id, b]));

export function getMethod(typeId: string, methodId: string): MethodDef {
  const t = BUILDING_BY_ID[typeId];
  const method = t?.methods.find((x) => x.id === methodId);
  if (!method) throw new Error(`unknown method ${typeId}/${methodId}`);
  return method;
}

/**
 * 소작: 소작농은 지주의 빈 농지·산림을 빌려 낮은 생산성으로 농사를 짓는다.
 * 땅 1칸이 감당하는 인원과 1인당 하루 생산량.
 */
export const SUBSISTENCE = {
  workersPerArable: 100 * BUILDING_SCALE,
  workersPerForest: 80 * BUILDING_SCALE,
  /** 농지 소작농 1인당 하루 산출 */
  grainPerWorker: 0.075,
  fiberPerWorker: 0.045,
  firewoodPerWorker: 0.045,
  /** 산림 소작농 1인당 하루 산출 */
  timberPerWorker: 0.05,
  forestGrainPerWorker: 0.03,
  /** 소작농이 자기 소비용으로 남기는 현물 비율. 나머지는 지역 시장에 팔린다 */
  inKindShare: 0.65,
  /** 판매 대금 중 지주 귀족이 지대로 가져가는 비율. 나머지가 소작농의 유일한 현금 소득이다 */
  rentShare: 0.5,
};

/** 학교 1레벨이 (만원 가동 시) 감당하는 학생 수 */
export const SCHOOL_CAPACITY = 300 * BUILDING_SCALE;

export const LAND_NAMES = { arable: '농지', forest: '산림', ore: '광맥', plot: '공장 부지' } as const;
export const LAND_NAMES_EN = { arable: 'Farmland', forest: 'Forest', ore: 'Ore veins', plot: 'Building plots' } as const;

/** 지역 id → 건물 종류 → 생산 보너스 */
export function regionPerk(regionId: number, typeId: string): number {
  return REGIONS.find((r) => r.id === regionId)?.perks[typeId] ?? 0;
}

export const REGIONS: RegionDef[] = [
  {
    id: 1, name: '벨마르 항', nameEn: 'Port Belmar', spaceport: true, neighbors: [2, 3], education: 0.35, perks: { foodplant: 0.1, textile: 0.1, workshop: 0.1 },
    description: '왕국의 관문인 항구 도시. 해외 무역은 이곳 개항장에서만 이뤄진다. 땅은 좁지만 공장 부지가 많다.', descriptionEn: 'The kingdom\'s gateway port city. Foreign trade happens only at this port. Little land, but many building plots.',
    land: { arable: cells(60), forest: cells(20), ore: cells(0), plot: cells(180) },
    population: { unskilled: 6500 * POP_SCALE, skilled: 850 * POP_SCALE, expert: 75 * POP_SCALE, peasant: 0 * POP_SCALE, capitalist: 125 * POP_SCALE, aristocrat: 50 * POP_SCALE },
  },
  {
    id: 2, name: '강변 평야', nameEn: 'River Plain', spaceport: false, neighbors: [1, 3, 4], education: 0.2, perks: { farm: 0.1 },
    description: '넓은 충적 평야. 왕국의 곡창이다.', descriptionEn: 'Broad alluvial plains. The kingdom\'s granary.',
    land: { arable: cells(180), forest: cells(20), ore: cells(0), plot: cells(60) },
    population: { unskilled: 5500 * POP_SCALE, skilled: 300 * POP_SCALE, expert: 15 * POP_SCALE, peasant: 0 * POP_SCALE, capitalist: 10 * POP_SCALE, aristocrat: 125 * POP_SCALE },
  },
  {
    id: 3, name: '중앙 고원', nameEn: 'Central Highlands', spaceport: false, neighbors: [1, 2, 5, 6], education: 0.25, perks: { farm: 0.05, railway: 0.1 },
    description: '여러 길이 만나는 고원. 무엇이든 조금씩 있다.', descriptionEn: 'Highlands where many roads meet. A little of everything.',
    land: { arable: cells(70), forest: cells(40), ore: cells(30), plot: cells(100) },
    population: { unskilled: 4500 * POP_SCALE, skilled: 350 * POP_SCALE, expert: 25 * POP_SCALE, peasant: 0 * POP_SCALE, capitalist: 40 * POP_SCALE, aristocrat: 75 * POP_SCALE },
  },
  {
    id: 4, name: '남부 습지', nameEn: 'Southern Marshes', spaceport: false, neighbors: [2, 5], education: 0.12, perks: { farm: 0.1 },
    description: '섬유작물이 잘 자라는 습지대.', descriptionEn: 'Wetlands where fibre crops grow well.',
    land: { arable: cells(120), forest: cells(70), ore: cells(0), plot: cells(30) },
    population: { unskilled: 3250 * POP_SCALE, skilled: 125 * POP_SCALE, expert: 5 * POP_SCALE, peasant: 0 * POP_SCALE, capitalist: 5 * POP_SCALE, aristocrat: 50 * POP_SCALE },
  },
  {
    id: 5, name: '동부 삼림', nameEn: 'Eastern Forest', spaceport: false, neighbors: [3, 4, 7], education: 0.15, perks: { lumber: 0.1, fuelworks: 0.1 },
    description: '울창한 원시림. 목재와 연료의 공급지.', descriptionEn: 'Dense old-growth forest. The source of timber and fuel.',
    land: { arable: cells(30), forest: cells(160), ore: cells(20), plot: cells(40) },
    population: { unskilled: 3000 * POP_SCALE, skilled: 175 * POP_SCALE, expert: 5 * POP_SCALE, peasant: 0 * POP_SCALE, capitalist: 10 * POP_SCALE, aristocrat: 40 * POP_SCALE },
  },
  {
    id: 6, name: '북부 광산지대', nameEn: 'Northern Mining District', spaceport: false, neighbors: [3, 7], education: 0.18, perks: { mine: 0.1, smelter: 0.1 },
    description: '광맥이 풍부한 산악 지대.', descriptionEn: 'Mountains rich in ore veins.',
    land: { arable: cells(10), forest: cells(20), ore: cells(100), plot: cells(70) },
    population: { unskilled: 1900 * POP_SCALE, skilled: 175 * POP_SCALE, expert: 10 * POP_SCALE, peasant: 0 * POP_SCALE, capitalist: 20 * POP_SCALE, aristocrat: 25 * POP_SCALE },
  },
  {
    id: 7, name: '회색 협곡', nameEn: 'Grey Gorge', spaceport: false, neighbors: [5, 6], education: 0.1, perks: { mine: 0.1 },
    description: '외딴 협곡. 광맥은 좋지만 사람이 적다.', descriptionEn: 'A remote gorge. Good ore veins, but few people.',
    land: { arable: cells(20), forest: cells(30), ore: cells(70), plot: cells(30) },
    population: { unskilled: 1300 * POP_SCALE, skilled: 75 * POP_SCALE, expert: 0 * POP_SCALE, peasant: 0 * POP_SCALE, capitalist: 5 * POP_SCALE, aristocrat: 15 * POP_SCALE },
  },
];

export const NEEDS: NeedDef[] = [
  { id: 'nourishment', name: '식량', nameEn: 'Food', options: [{ good: 'food', units: 1, appeal: 2.5 }, { good: 'grain', units: 5 }] },
  { id: 'heating', name: '난방', nameEn: 'Heating', options: [{ good: 'fuel', units: 1, appeal: 2.5 }, { good: 'timber', units: 4 }] },
  { id: 'clothing', name: '의복', nameEn: 'Clothing', options: [{ good: 'cloth', units: 1, appeal: 2.5 }, { good: 'fiber', units: 6 }] },
  { id: 'furnishing', name: '주거', nameEn: 'Housing', options: [{ good: 'furniture', units: 1 }] },
  { id: 'gadgets', name: '문화', nameEn: 'Culture', options: [{ good: 'electronics', units: 1 }] },
];

/**
 * 부 단계별 1인당 하루 수요 단위. 단계가 오를수록 양이 늘고 새 품목(주거, 문화)이 생긴다.
 * 소수 단계도 그대로 보간된다.
 */
export function needsAt(wealth: number): Record<NeedId, number> {
  const L = wealth;
  const f = Math.max(0, L - 5), g = Math.max(0, L - 11);
  return {
    nourishment: 0.008 + 0.001 * L,
    // 식량을 뺀 필요는 공장 생산 규모에 맞춰 3배 (식량은 그대로: 기아 판정에 직결)
    heating: 3 * (0.003 + 0.0004 * L),
    clothing: 3 * (0.001 + 0.0004 * L + 0.00004 * L * L),
    furnishing: 3 * (0.0004 * f + 0.00003 * f * f),
    gadgets: 3 * (0.00015 * g + 0.00003 * g * g),
  };
}

/** 신분별 기대 생활수준(부 단계). 아래에 오래 머물면 불만이 쌓인다 (정치 시스템용) */
export const EXPECTED_WEALTH = { lower: 5, middle: 10, upper: 15 } as const;

/** 1년 = 360틱(일) */
export const TICKS_PER_YEAR = 360;
export const TICKS_PER_WEEK = 7;
