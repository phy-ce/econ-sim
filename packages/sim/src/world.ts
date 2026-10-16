import { GOOD_IDS, GOODS, REGIONS, SKILL_DEFS, SUBSISTENCE, getMethod, POP_SCALE } from './data';
import { landFree, newBuilding } from './economy';
import { POP_CLASSES, SKILLS } from './types';
import type { Building, Company, GoodId, Household, MarketGood, PopClass, Region, Skill, World } from './types';

const INITIAL_SAVINGS_PER_CAPITA: Record<PopClass, number> = { unskilled: 3, skilled: 15, expert: 50, peasant: 1, capitalist: 400, aristocrat: 300 };
/** 1인당 하루 소득 이동평균의 초기값 */
const INITIAL_INCOME: Record<PopClass, number> = { unskilled: 0.6, skilled: 1.6, expert: 3.5, peasant: 0.05, capitalist: 8, aristocrat: 8 };
/** 시작 부 단계 */
const INITIAL_WEALTH: Record<PopClass, number> = { unskilled: 5, skilled: 10, expert: 12, peasant: 3, capitalist: 20, aristocrat: 20 };

/** [지역, 회사 인덱스, 건물 종류, 생산 방식, 레벨] — 기술이 없는 기본 방식만 쓴다 */
/** 시작 시 건물은 없다. 모든 상회(AI 포함)가 현금만 들고 시작하고, 하층은 전부 소작농이다 */
const INITIAL_BUILDINGS: [number, number, string, string, number][] = [];
/** 모든 상회의 시작 자금 */
export const START_CASH = 20000 * POP_SCALE;

const AI_COMPANIES = [
  { name: '북방 상회', color: '#3b82f6' },
  { name: '남부 상단', color: '#f59e0b' },
  { name: '왕립 무역회사', color: '#10b981' },
];

const BANK_CAPITAL = 150000 * POP_SCALE;
const TRADER_CAPITAL = 75000 * POP_SCALE;

export interface CreateWorldOptions {
  withPlayer?: boolean;
  playerName?: string;
  playerCash?: number;
  ai?: boolean;
}

const baseWages = (): Record<Skill, number> => ({
  unskilled: SKILL_DEFS.unskilled.baseWage,
  skilled: SKILL_DEFS.skilled.baseWage,
  expert: SKILL_DEFS.expert.baseWage,
});

/** 개척 초기 AI 회사의 임금: 노동력이 남아도니 기본 임금보다 훨씬 낮게 준다 */
const AI_START_WAGES: Record<Skill, number> = { unskilled: 0.6, skilled: 1.6, expert: 3.5 };

function newCompany(id: number, name: string, color: string, isPlayer: boolean, cash: number): Company {
  return {
    id, name, color, isPlayer, cash, wages: isPlayer ? baseWages() : { ...AI_START_WAGES },
    wageOffset: isPlayer ? { unskilled: 0, skilled: 0, expert: 0 } : null,
    weekProfit: 0, lastWeekProfit: 0, weekStartCash: cash, debt: 0, revenueEma: 0,
    lastRestructureTick: -1e9, distressWeeks: 0, buildPoints: 0, buildCost: 0,
    research: { budget: 0, current: null, progress: {}, known: [] },
  };
}

function newMarket(popShare: number): Record<GoodId, MarketGood> {
  const market = {} as Record<GoodId, MarketGood>;
  for (const g of GOOD_IDS) {
    const stock = GOODS[g].minStock * popShare * 2;
    market[g] = {
      price: GOODS[g].basePrice, inventory: stock, target: stock,
      demand: 0, supply: 0, demandEma: stock / 10, supplyEma: stock / 10,
      sellThrough: 1, consigned: [], sold: 0, volumeEma: stock / 10, shippedIn: 0, shippedOut: 0,
      demandBy: {}, supplyBy: {}, demandByEma: {}, supplyByEma: {},
    };
  }
  return market;
}

export function createWorld(seed = 1, opts: CreateWorldOptions = {}): World {
  const { withPlayer = true, playerName = '내 상회', playerCash = START_CASH, ai = true } = opts;

  const totalPop = REGIONS.reduce((a, r) => a + POP_CLASSES.reduce((b, s) => b + r.population[s], 0), 0);
  const regions: Region[] = REGIONS.map((def) => {
    const pop = POP_CLASSES.reduce((b, s) => b + def.population[s], 0);
    // 하층 인구 중 초기 건물 일자리(여유 10%)만큼만 노동자이고 나머지는 자급 농민이다
    const jobs = INITIAL_BUILDINGS
      .filter(([rid]) => rid === def.id)
      .reduce((a, [, , typeId, methodId, level]) => a + (getMethod(typeId, methodId).workers.unskilled ?? 0) * level, 0);
    const laborers = Math.min(def.population.unskilled, Math.round(jobs * 1.0));
    // 중층도 일자리보다 조금 많은 만큼만 있고, 나머지는 농민이다 (초기 실업이 너무 커지지 않게)
    const jobsOf = (s: Skill) => INITIAL_BUILDINGS.filter(([rid]) => rid === def.id)
      .reduce((a, [, , typeId, methodId, level]) => a + (getMethod(typeId, methodId).workers[s] ?? 0) * level, 0);
    // 중층은 지역 정의의 30%만 처음부터 있고(장인·서기), 나머지는 소작농으로 시작한다
    const skilled = Math.min(def.population.skilled, Math.max(4, Math.round(def.population.skilled * 0.3), Math.round(jobsOf('skilled') * 1.3)));
    const expert = Math.min(def.population.expert, Math.max(1, Math.round(def.population.expert * 0.3), Math.round(jobsOf('expert') * 1.3)));
    const split: Record<PopClass, number> = {
      ...def.population, unskilled: laborers, skilled, expert,
      peasant: def.population.peasant + (def.population.unskilled - laborers) + (def.population.skilled - skilled) + (def.population.expert - expert),
    };
    const households = {} as Record<PopClass, Household>;
    for (const s of POP_CLASSES) {
      const n = Math.max(1, split[s]);
      households[s] = {
        skill: s, population: n, savings: n * INITIAL_SAVINGS_PER_CAPITA[s],
        wealth: INITIAL_WEALTH[s], sol: INITIAL_WEALTH[s], fulfillment: 1, food: 1, inKind: {}, incomeEma: n * INITIAL_INCOME[s],
        lastIncome: 0, lastSpend: 0, consumed: {},
      };
    }
    return {
      id: def.id, name: def.name, description: def.description, spaceport: def.spaceport,
      neighbors: [...def.neighbors], land: { ...def.land }, education: def.education, subsistenceWorkers: 0, subsistenceIncome: 0.3, famineOut: 0, famineTo: {},
      households, market: newMarket(pop / totalPop),
    };
  });

  const companies: Company[] = AI_COMPANIES.map((c, i) => newCompany(i + 1, c.name, c.color, false, START_CASH));
  if (withPlayer) companies.push(newCompany(100, playerName, '#e11d48', true, playerCash));

  let nextId = 1;
  const buildings: Building[] = INITIAL_BUILDINGS.map(([regionId, ci, typeId, methodId, level]) =>
    newBuilding(nextId++, typeId, regionId, companies[ci].id, methodId, level));
  // 모든 상회는 개항장에 건축사무소 하나를 갖고 시작한다. 건설은 이 사무소의 건설 포인트로만 진행된다
  for (const c of companies) buildings.push(newBuilding(nextId++, 'builder', 1, c.id, 'build_manual', 1));

  // 초기 고용: 지역별로 인구를 일자리 비율대로 배분 (충원율 상한 95%)
  for (const r of regions) {
    const local = buildings.filter((b) => b.regionId === r.id);
    for (const s of SKILLS) {
      const total = local.reduce((a, b) => a + (getMethod(b.typeId, b.methodId).workers[s] ?? 0) * b.level, 0);
      const ratio = total > 0 ? Math.min(0.95, (r.households[s].population * 0.97) / total) : 0;
      for (const b of local) b.employed[s] = (getMethod(b.typeId, b.methodId).workers[s] ?? 0) * b.level * ratio;
    }
  }

  const w: World = {
    version: 2, config: { ai }, tick: 0, seed, rngState: seed | 0, nextId,
    regions, fund: 0, grantRatio: 1,
    bank: { cash: BANK_CAPITAL, capital: BANK_CAPITAL },
    traders: { cash: TRADER_CAPITAL, capital: TRADER_CAPITAL, shipments: [], inbound: [] },
    offworld: { balance: 0, imports: {}, exports: {} },
    companies, buildings, constructions: [],
    history: [], events: [{ tick: 0, companyId: null, text: '에스테라 왕국의 시장이 열렸습니다.', textEn: 'The markets of the Kingdom of Estera are open.', kind: 'info' }], alertState: {},
  };
  // 첫 화면에서도 자급 농민 수가 보이도록 미리 계산해 둔다
  for (const r of w.regions) {
    const cap = landFree(w, r.id, 'arable') * SUBSISTENCE.workersPerArable + landFree(w, r.id, 'forest') * SUBSISTENCE.workersPerForest;
    r.subsistenceWorkers = Math.min(r.households.peasant.population, cap);
  }
  return w;
}
