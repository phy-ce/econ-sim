import { BUILDING_BY_ID, SKILL_DEFS, TECH_BY_ID, TICKS_PER_WEEK, TUNE, getMethod } from './data';
import { companyById, isBudgetFunded, kingdomGdp, regionById, slots } from './economy';
import { DAILY_INTEREST, MINT_BASE, MINT_RATE } from './finance';
import { kingdomById, kingdomOf } from './kingdoms';
import { BUDGET_ITEMS, BUDGET_STEPS, SKILLS, TAX_LAWS } from './types';
import type { BudgetItem, Building, GoodId, Kingdom, Pop, PopClass, Skill, TaxLaw, WelfareLaw, World } from './types';
import { welfareCovers, welfareIncome, welfareTarget, welfareWeekly } from './welfare';
import type { WelfareGroup } from './welfare';

// ---------------------------------------------------------------- 예산 미리보기 (화면 전용)
//
// 정책 단계를 바꾸면 그 자리에서 바뀌는 주간 예상 국정 수지. 지난주 장부(lastBudget)는 단계를 바꾼 뒤 한 주가 지나야 바뀌고
// 매주 출렁이므로, 여기서는 천천히 움직이는 기준값(이동평균, 지금 고용)에 단계 배율만 곱한다.
// 세계를 바꾸지 않는다 (난수·쓰기 없음). sim 은 이 값을 읽지 않는다.

/**
 * 미리보기 줄: 수입(세금·관세·주조)은 +, 지출(정부 건물(행정청·학교) 임금·원료·왕실 공사·연구비·국채 이자·복지)은 −.
 * stateFirms(국영 사업 손익) = 왕실 생산 건물과 건축사무소의 매출 − 원료 − 임금. 흑자면 +, 적자면 −. 건축사무소 매출은 모든 공사(왕실 것 포함)의 수수료다.
 * build(왕실 공사) = 왕실 공사가 자기 건축사무소에 낸 수수료 (국영 사업 손익의 사무소 매출에 같은 돈이 들어 있다)
 */
export type BudgetLineKey = 'tax' | 'tariffs' | 'mint' | 'wages' | 'stateFirms' | 'build' | 'goods' | 'research' | 'interest' | 'welfare';

/** 줄 묶음: 그 줄들을 움직이는 손잡이 (fixed = 손잡이 없음) */
export type BudgetGroupKey = BudgetItem | 'fixed';

/** 손잡이별 줄 묶음 (화면 순서). 국영 임금은 정부 건물 임금·국영 사업 손익(임금, 사무소 수수료)·왕실 공사(수수료의 사무소 임금 몫)를 함께 움직인다 */
export const BUDGET_GROUPS: { knob: BudgetGroupKey; lines: BudgetLineKey[] }[] = [
  { knob: 'tax', lines: ['tax'] },
  { knob: 'wages', lines: ['wages', 'stateFirms', 'build'] },
  { knob: 'research', lines: ['research'] },
  { knob: 'welfare', lines: ['welfare'] },
  { knob: 'fixed', lines: ['tariffs', 'mint', 'goods', 'interest'] },
];

export interface BudgetGroup {
  knob: BudgetGroupKey;
  lines: BudgetLineKey[];
  /** 묶음 줄 합 (지금 단계) */
  weekly: number;
  /** 손잡이 단계 1~5 각각의 묶음 합 (fixed 는 없다) */
  byLevel?: number[];
}

export interface BudgetLine {
  key: BudgetLineKey;
  /** 지금(또는 넘긴) 단계의 주간 예상액 */
  weekly: number;
  /** 이 줄을 움직이는 정책 손잡이 (없으면 고정 줄) */
  knob?: BudgetItem;
  /** 손잡이 단계 1~5 각각의 주간 예상액 (다른 손잡이는 그대로) */
  byLevel?: number[];
}

export interface BudgetPreview {
  steps: Record<BudgetItem, number>;
  lines: BudgetLine[];
  /** 수입 합 (+), 지출 합 (−), 순수지 = 수입 + 지출 */
  income: number;
  expense: number;
  net: number;
  /** 손잡이마다 단계 1~5 의 순수지 (다른 손잡이는 그대로) */
  netByLevel: Record<BudgetItem, number[]>;
  /** 손잡이별 줄 묶음 (BUDGET_GROUPS 순서). 묶음 합을 모두 더하면 net */
  groups: BudgetGroup[];
  /** 왕실 생산 건물과 건축사무소의 주간 임금. 국영 사업 손익 줄(stateFirms)에 들어 있다. 옛 화면용 사본 */
  firmWages: { weekly: number; byLevel: number[] };
}

/** 화면에 보일 둥근 값: 1,000 이상은 100 단위, 그 아래는 10 단위 */
export function roundBudget(x: number): number {
  const unit = Math.abs(x) >= 1000 ? 100 : 10;
  return Math.round(x / unit) * unit + 0;
}

/** 왕국 왕실의 건물 (자동 건물 제외) */
function govBuildings(w: World, k: Kingdom): Building[] {
  const gov = companyById(w, k.governmentId);
  return gov ? w.buildings.filter((b) => b.companyId === gov.id && !BUILDING_BY_ID[b.typeId].auto) : [];
}

/** 건물의 하루 임금 (지금 고용 × 기본 임금 × 임금 지수, 국영 임금 수준 배율 1) */
function wageDayAt1(k: Kingdom, b: Building): number {
  let day = 0;
  for (const s of SKILLS) day += b.employed[s] * SKILL_DEFS[s].baseWage * (k.wageIndex ?? 1);
  return day;
}

/**
 * 왕실 생산 건물·건축사무소의 주간 매출·원료비 (이동평균, 기록이 없으면 어제 값). 단계 배율 m 에서 매출 = fixed + wage × m.
 * 생산 건물은 매출이 단계와 상관없다 (wage = 0). 사무소 매출(수수료)은 쓰인 포인트만큼의 운영비 × 수수료 배율이라 오늘 값을 쓴다 (공사가 끝나고 시작하는 데 따라 크게 출렁인다):
 * 매출 = (오늘 수수료 ÷ 오늘 운영비) × (오늘 원료비 + 지금 고용 × 기본 임금 × 임금 지수 × m). 쉬는 사무소는 매출·원료 0 (임금만 낸다)
 */
function firmWeek(k: Kingdom, b: Building): { fixed: number; wage: number; inputs: number } {
  if (!getMethod(b.typeId, b.methodId).construction) {
    const e = b.firmEma ?? { sales: b.last.revenue, inputs: b.last.inputCost };
    return { fixed: e.sales * TICKS_PER_WEEK, wage: 0, inputs: e.inputs * TICKS_PER_WEEK };
  }
  const L = b.last, cost = L.wageCost + L.inputCost;
  if (b.idle || !(cost > 0)) return { fixed: 0, wage: 0, inputs: b.idle ? 0 : L.inputCost * TICKS_PER_WEEK };
  const r = (L.fee ?? 0) / cost, inputs = L.inputCost * TICKS_PER_WEEK;
  return { fixed: r * inputs, wage: r * wageDayAt1(k, b) * TICKS_PER_WEEK, inputs };
}

const levelOf = (item: BudgetItem, step: number) =>
  (item === 'tax' ? TUNE.taxLevels : item === 'wages' ? TUNE.govWageLevels : item === 'research' ? TUNE.researchLevels : TUNE.welfareLevels)[step - 1];

/**
 * 왕국의 주간 예상 국정 수지 (steps 를 넘기면 그 단계로, 빠진 손잡이는 지금 단계).
 * - 세금 = 그 단계였다면 걷혔을 하루 세입의 이동평균 × 7 (pop 마다 저축 한도를 단계별로 다시 건다. 징수율·토지세 포함)
 * - 주조·관세·정부 건물 원료 = 주간 이동평균
 * - 왕실 공사 = −(오늘 사무소 매출 중 왕실 공사 몫) × 그 단계의 사무소 매출. 그래서 국영 임금 손잡이가 이 줄도 움직이고, 국영 사업 손익의 같은 몫과 서로 지운다
 * - 정부 건물(행정청·학교) 임금 = 지금 고용 × 기본 임금 × 임금 지수 × 국영 임금 수준 배율 × 7
 * - 연구비 = min(주간 경제 규모(이동평균) × 연구비 비율 × 연구비 수준 배율, 남은 기술 비용, 국고 현금). 연구 중인 기술이 없으면 0
 * - 국영 사업 손익 = 왕실 생산 건물·건축사무소마다 (하루 매출 − 원료비 이동평균(firmEma)) × 7 − 지금 고용 × 기본 임금 × 임금 지수 × 국영 임금 수준 배율 × 7.
 *   사무소 매출(수수료)은 (매출 ÷ 운영비 이동평균) × (원료비 이동평균 + 그 단계 임금)으로 다시 센다
 * - 국채 이자 = 지금 빚 × 일 이자율 × 7
 * - 복지 = 지금 복지법이 덮는 무리의 그 단계 하루 필요액(이동평균) × 7 (welfare.ts welfareWeekly). 복지법이 'none' 이면 0
 * 기준값이 아직 없으면(새 게임 첫 주, 옛 저장) 지난주 장부, 그것도 없으면 이번 주 지금까지를 7일로 늘린 값을 쓴다.
 */
export function budgetPreview(w: World, kingdomId: number, steps: Partial<Record<BudgetItem, number>> = {}): BudgetPreview {
  const k = kingdomById(w, kingdomId);
  const cur = {} as Record<BudgetItem, number>;
  for (const item of BUDGET_ITEMS) cur[item] = steps[item] ?? k.budget[item];
  const { value, firmBase } = budgetModel(w, k);
  const knobOf: Partial<Record<BudgetLineKey, BudgetItem>> = {};
  for (const g of BUDGET_GROUPS) if (g.knob !== 'fixed') for (const l of g.lines) knobOf[l] = g.knob;
  const levels = Array.from({ length: BUDGET_STEPS }, (_, i) => i + 1);
  const at = (item: BudgetItem, s: number) => ({ ...cur, [item]: s });

  const keys: BudgetLineKey[] = BUDGET_GROUPS.flatMap((g) => g.lines);
  const lines: BudgetLine[] = keys.map((key) => {
    const knob = knobOf[key];
    return knob
      ? { key, knob, weekly: roundBudget(value(key, cur)), byLevel: levels.map((s) => roundBudget(value(key, at(knob, s)))) }
      : { key, weekly: roundBudget(value(key, cur)) };
  });
  let income = 0, expense = 0;
  for (const l of lines) if (l.weekly >= 0) income += l.weekly; else expense += l.weekly;
  const net = income + expense;
  const netByLevel = {} as Record<BudgetItem, number[]>;
  for (const item of BUDGET_ITEMS) {
    netByLevel[item] = levels.map((s) => lines.reduce((sum, l) => sum + (l.knob === item ? l.byLevel![s - 1] : l.weekly), 0));
  }
  const groups: BudgetGroup[] = BUDGET_GROUPS.map((g) => {
    const ls = g.lines.map((key) => lines.find((l) => l.key === key)!);
    const weekly = ls.reduce((a, l) => a + l.weekly, 0);
    return g.knob === 'fixed' ? { knob: g.knob, lines: g.lines, weekly }
      : { knob: g.knob, lines: g.lines, weekly, byLevel: levels.map((s) => ls.reduce((a, l) => a + l.byLevel![s - 1], 0)) };
  });
  return {
    steps: cur, lines, income, expense, net, netByLevel, groups,
    firmWages: { weekly: roundBudget(-firmBase * levelOf('wages', cur.wages)), byLevel: levels.map((s) => roundBudget(-firmBase * levelOf('wages', s))) },
  };
}

/** 줄 하나의 주간 값 (budgetPreview 와 같은 계산, 반올림 전). 자세히 보기 창의 행 합이 이것과 맞는다 */
export function budgetLineRaw(w: World, kingdomId: number, key: BudgetLineKey, steps: Partial<Record<BudgetItem, number>> = {}): number {
  const k = kingdomById(w, kingdomId);
  const cur = {} as Record<BudgetItem, number>;
  for (const item of BUDGET_ITEMS) cur[item] = steps[item] ?? k.budget[item];
  return budgetModel(w, k).value(key, cur);
}

/** 미리보기 계산: 단계 배율 1 일 때의 주간 기준값을 모아 두고, 단계마다 줄 값을 낸다 */
function budgetModel(w: World, k: Kingdom) {
  const gov = companyById(w, k.governmentId);

  const base = k.budgetBase ?? {};
  const last = k.lastBudget;
  const days = w.tick % TICKS_PER_WEEK;
  const soFar = (x: number | undefined) => (days > 0 ? ((x ?? 0) * TICKS_PER_WEEK) / days : 0);
  let wageBase = 0, firmBase = 0, firmGross = 0, firmSalesWage = 0, officeFixed = 0, officeWage = 0, officeSales = 0;
  for (const b of govBuildings(w, k)) {
    const day = wageDayAt1(k, b);
    if (isBudgetFunded(b.typeId)) wageBase += day * TICKS_PER_WEEK;
    else {
      const f = firmWeek(k, b);
      firmBase += day * TICKS_PER_WEEK; firmGross += f.fixed - f.inputs; firmSalesWage += f.wage;
      if (getMethod(b.typeId, b.methodId).construction) { officeFixed += f.fixed; officeWage += f.wage; officeSales += b.last.fee ?? 0; }
    }
  }
  const t = gov?.research.current ? TECH_BY_ID[gov.research.current] : undefined;
  const researchLeft = gov && t && !gov.research.known.includes(t.id)
    ? Math.min(Math.max(0, t.cost - (gov.research.progress[t.id] ?? 0)), Math.max(0, gov.cash)) : 0;
  const researchBase = (k.output ?? 0) * TUNE.researchShare;
  const taxPerDay = base.taxBy ?? TUNE.taxLevels.map((m) => ((last?.revenue ?? 0) / TICKS_PER_WEEK / levelOf('tax', k.budget.tax)) * m);
  // 사무소 매출 중 왕실 공사 몫 (오늘). 기록이 없으면 지난주 장부
  const crownShare = base.build != null ? (officeSales > 0 ? Math.min(1, base.build / officeSales) : 0) : null;
  const buildLast = last?.build ?? soFar(k.spentWeek?.build);
  const fixed = {
    tariffs: base.tariffs ?? soFar(k.tariffWeek),
    mint: base.mint ?? (gov ? MINT_BASE + (kingdomGdp(w, k.id) * TICKS_PER_WEEK / 360) * MINT_RATE : 0),
    goods: -(base.goods ?? last?.goods ?? soFar(k.spentWeek?.goods)),
    interest: -Math.max(0, gov?.debt ?? 0) * DAILY_INTEREST * TICKS_PER_WEEK,
  };
  const value = (key: BudgetLineKey, st: Record<BudgetItem, number>): number => {
    switch (key) {
      case 'tax': return (taxPerDay[st.tax - 1] ?? 0) * TICKS_PER_WEEK;
      case 'build': return crownShare == null ? -buildLast : -crownShare * (officeFixed + officeWage * levelOf('wages', st.wages));
      case 'wages': return -wageBase * levelOf('wages', st.wages);
      case 'stateFirms': return firmGross + (firmSalesWage - firmBase) * levelOf('wages', st.wages);
      case 'research': return -Math.min(researchBase * levelOf('research', st.research), researchLeft);
      case 'welfare': return -welfareWeekly(k, k.welfareLaw, st.welfare);
      default: return fixed[key as keyof typeof fixed];
    }
  };
  return { value, firmBase, office: { share: crownShare, fixed: officeFixed, wage: officeWage } };
}

// ---------------------------------------------------------------- 줄 자세히 보기 (화면 전용, 작은 창)
//
// 줄마다 하나씩: 그 줄의 주간 값(budgetPreview 와 같은 단계, 반올림 전)을 무엇이 만드는지 행으로 나눈다.
// 금액(weekly·need·sales·inputs·wages)은 모두 국고에 주는 효과다 (+ 들어옴, − 나감). 단가·비율·사람 수는 양수.
// 행 weekly 합 + smoothing = weekly. smoothing 은 줄이 쓰는 이동평균과 지금 값으로 나눈 행의 차이다 (임금·국영 사업·연구·이자·왕실 공사는 0).

export interface BudgetDrillBase {
  key: BudgetLineKey;
  /** 줄의 주간 값 (budgetPreview 줄과 같은 단계, 반올림 전) */
  weekly: number;
  /** 줄 값 − 행 합 (이동평균과 지금 값의 차이) */
  smoothing: number;
}

/** 정부 건물 한 곳의 직종별 임금. perHead = baseWage × wageIndex × stepMult (1인 하루) */
export interface WageDrillJob { skill: Skill; employed: number; jobs: number; baseWage: number; wageIndex: number; stepMult: number; perHead: number; weekly: number }
export interface WageDrillRow { buildingId: number; typeId: string; regionId: number; level: number; employed: number; jobs: number; weekly: number; jobsBy: WageDrillJob[] }
export interface WageDrill extends BudgetDrillBase { key: 'wages'; wageIndex: number; stepMult: number; rows: WageDrillRow[] }

/** 왕실 생산 건물·건축사무소 한 곳: 매출(+, 사무소는 공사 수수료이고 그 단계로 다시 센다)·원료(−)·임금(−, 그 단계)·손익(weekly) */
export interface FirmDrillRow { buildingId: number; typeId: string; regionId: number; level: number; employed: number; sales: number; inputs: number; wages: number; weekly: number }
export interface FirmDrill extends BudgetDrillBase { key: 'stateFirms'; stepMult: number; rows: FirmDrillRow[] }

/** 정부 건물 원료: 건물별(어제 원료비 × 7)과 상품별(건물 원료비를 방식 투입량 × 지역 가격 비율로 나눈 것) */
export interface GoodsDrillRow { buildingId: number; typeId: string; regionId: number; level: number; weekly: number }
export interface GoodsDrillGood { good: GoodId; qty: number; price: number; weekly: number }
export interface GoodsDrill extends BudgetDrillBase { key: 'goods'; rows: GoodsDrillRow[]; byGood: GoodsDrillGood[] }

/** 세금: 지역 × 직종 행 (지금 세법, 그 단계 세율, 오늘 저축 한도·징수율). base = 'land' 소작농 1인당, 'poll' 1인당, 'income' 소득 비율 */
export interface TaxDrillRow { regionId: number; prof: PopClass; payers: number; base: TaxLaw; rate: number; income: number; weekly: number }
export interface TaxDrill extends BudgetDrillBase {
  key: 'tax'; law: TaxLaw; stepMult: number; collection: number;
  rates: { land: number; poll: number; income: number };
  /** 세법마다 그 단계로 지금 걷힐 주간 세입 (비교용) */
  laws: { law: TaxLaw; weekly: number }[];
  rows: TaxDrillRow[];
}

/** 복지: 지역 × 무리 행. need = 덮으면 낼 주간 필요액(−), weekly = 지금 법이 덮으면 need, 아니면 0. short = 모자란 사람 (비율 가중) */
export interface WelfareDrillRow { regionId: number; group: WelfareGroup; covered: boolean; short: number; targetIncome: number; need: number; weekly: number }
export interface WelfareDrill extends BudgetDrillBase { key: 'welfare'; law: WelfareLaw; target: number; rows: WelfareDrillRow[] }

/** 연구비: 원하는 액 = 주간 경제 규모 × 비율 × 단계 배율, 낸 액 = min(원하는 액, 남은 기술 비용, 국고 현금) */
export interface ResearchDrill extends BudgetDrillBase {
  key: 'research'; tech: string | null; output: number; share: number; stepMult: number; wanted: number; left: number; cash: number;
  rows: { part: 'research'; weekly: number }[];
}

/** 국채 이자 = 빚 × 일 이자율 × 7 */
export interface InterestDrill extends BudgetDrillBase { key: 'interest'; debt: number; dailyRate: number; rows: { part: 'interest'; weekly: number }[] }

/** 관세: 상품별(rows)·출발 왕국별(byPartner) 주간 이동평균. 둘 다 합이 같다 */
export interface TariffDrill extends BudgetDrillBase { key: 'tariffs'; rows: { good: GoodId; weekly: number }[]; byPartner: { kingdomId: number; weekly: number }[] }

/** 주조 = 기본액 + 주간 총생산 × 비율 (주간 총생산 = 연 GDP × 7 / 360, 지금 값) */
export interface MintDrill extends BudgetDrillBase { key: 'mint'; base: number; gdpWeek: number; rate: number; rows: { part: 'base' | 'gdp'; weekly: number }[] }

/**
 * 왕실 공사: 자기 건축사무소에 낸 수수료 = 사무소 매출 중 왕실 공사 몫(share) × 그 단계의 사무소 주간 매출(officeSales).
 * 행은 사무소 매출의 임금 몫(wage, 국영 임금 단계를 따른다)과 나머지(other: 원료·이익 몫). weekly 는 −. 기록이 없으면 share = null, 지난주 장부 한 행
 */
export interface BuildDrill extends BudgetDrillBase { key: 'build'; stepMult: number; share: number | null; officeSales: number; rows: { part: 'wage' | 'other'; weekly: number }[] }

export type BudgetDrill = WageDrill | FirmDrill | GoodsDrill | TaxDrill | WelfareDrill | ResearchDrill | InterestDrill | TariffDrill | MintDrill | BuildDrill;

type Steps = Partial<Record<BudgetItem, number>>;
const stepsOf = (k: Kingdom, steps: Steps) => {
  const cur = {} as Record<BudgetItem, number>;
  for (const item of BUDGET_ITEMS) cur[item] = steps[item] ?? k.budget[item];
  return cur;
};
const sumW = (rows: { weekly: number }[]) => rows.reduce((a, r) => a + r.weekly, 0);
const byWeekly = <T extends { weekly: number }>(rows: T[]) => rows.sort((a, b) => Math.abs(b.weekly) - Math.abs(a.weekly));

/** 정부 건물(행정청·학교) 임금 (지금 고용, 그 단계) */
export function drillWages(w: World, kid: number, steps: Steps = {}): WageDrill {
  const k = kingdomById(w, kid), st = stepsOf(k, steps), mult = levelOf('wages', st.wages), idx = k.wageIndex ?? 1;
  const rows: WageDrillRow[] = [];
  for (const b of govBuildings(w, k)) {
    if (!isBudgetFunded(b.typeId)) continue;
    const jobsBy: WageDrillJob[] = [];
    let employed = 0, jobs = 0, weekly = 0;
    for (const s of SKILLS) {
      const n = b.employed[s], j = slots(b, s);
      if (n <= 0 && j <= 0) continue;
      const perHead = SKILL_DEFS[s].baseWage * idx * mult;
      const wk = -n * perHead * TICKS_PER_WEEK;
      jobsBy.push({ skill: s, employed: n, jobs: j, baseWage: SKILL_DEFS[s].baseWage, wageIndex: idx, stepMult: mult, perHead, weekly: wk });
      employed += n; jobs += j; weekly += wk;
    }
    rows.push({ buildingId: b.id, typeId: b.typeId, regionId: b.regionId, level: b.level, employed, jobs, weekly, jobsBy });
  }
  const total = budgetLineRaw(w, kid, 'wages', st);
  return { key: 'wages', weekly: total, smoothing: total - sumW(rows), wageIndex: idx, stepMult: mult, rows: byWeekly(rows) };
}

/** 국영 사업 손익 (왕실 생산 건물·건축사무소마다, 그 국영 임금 단계) */
export function drillStateFirms(w: World, kid: number, steps: Steps = {}): FirmDrill {
  const k = kingdomById(w, kid), st = stepsOf(k, steps), mult = levelOf('wages', st.wages);
  const rows: FirmDrillRow[] = [];
  for (const b of govBuildings(w, k)) {
    if (isBudgetFunded(b.typeId)) continue;
    const f = firmWeek(k, b);
    const sales = f.fixed + f.wage * mult, inputs = -f.inputs, wages = -wageDayAt1(k, b) * mult * TICKS_PER_WEEK;
    let employed = 0;
    for (const s of SKILLS) employed += b.employed[s];
    rows.push({ buildingId: b.id, typeId: b.typeId, regionId: b.regionId, level: b.level, employed, sales, inputs, wages, weekly: sales + inputs + wages });
  }
  const total = budgetLineRaw(w, kid, 'stateFirms', st);
  return { key: 'stateFirms', weekly: total, smoothing: total - sumW(rows), stepMult: mult, rows: byWeekly(rows) };
}

/** 정부 건물(행정청·학교) 원료 (어제 원료비 × 7, 건물별·상품별) */
export function drillGoods(w: World, kid: number): GoodsDrill {
  const k = kingdomById(w, kid);
  const rows: GoodsDrillRow[] = [];
  const goods = new Map<GoodId, { qty: number; weekly: number }>();
  for (const b of govBuildings(w, k)) {
    if (!isBudgetFunded(b.typeId) || b.last.inputCost <= 0) continue;
    const weekly = -b.last.inputCost * TICKS_PER_WEEK;
    rows.push({ buildingId: b.id, typeId: b.typeId, regionId: b.regionId, level: b.level, weekly });
    const r = regionById(w, b.regionId), m = getMethod(b.typeId, b.methodId);
    const parts = (Object.entries(m.inputs) as [GoodId, number][]).map(([g, q]) => [g, q * r.market[g].price] as const);
    const all = parts.reduce((a, [, v]) => a + v, 0);
    if (all <= 0) continue;
    for (const [g, v] of parts) {
      const x = goods.get(g) ?? { qty: 0, weekly: 0 };
      const wk = (weekly * v) / all;
      x.weekly += wk;
      x.qty += -wk / r.market[g].price;
      goods.set(g, x);
    }
  }
  const total = budgetLineRaw(w, kid, 'goods', {});
  const byGood = [...goods].map(([good, x]) => ({ good, qty: x.qty, price: x.qty > 0 ? -x.weekly / x.qty : 0, weekly: x.weekly }));
  return { key: 'goods', weekly: total, smoothing: total - sumW(rows), rows: byWeekly(rows), byGood: byWeekly(byGood) };
}

/** 세금 (지금 세법, 그 단계 세율): 지역 × 직종. 오늘 저축 한도와 징수율로 센다 */
export function drillTax(w: World, kid: number, steps: Steps = {}): TaxDrill {
  const k = kingdomById(w, kid), st = stepsOf(k, steps), mult = levelOf('tax', st.tax), ratio = k.taxRatio ?? 1;
  const ratesOf = (law: TaxLaw) => ({ land: law === 'land' ? TUNE.landTax * mult : 0, poll: law === 'poll' ? TUNE.pollTax * mult : 0, income: law === 'income' ? TUNE.incomeTax * mult : 0 });
  const due = (p: Pop, t: { land: number; poll: number; income: number }) => (p.prof === 'peasant' ? p.size * t.land : p.size * t.poll + Math.max(0, p.incomeEma) * t.income);
  const mine = w.pops.filter((p) => kingdomOf(w, p.regionId) === k.id);
  const laws = TAX_LAWS.map((law) => {
    const t = ratesOf(law);
    return { law, weekly: mine.reduce((a, p) => a + Math.min(Math.max(0, p.savings), due(p, t)), 0) * ratio * TICKS_PER_WEEK };
  });
  const t = ratesOf(k.taxLaw);
  const rows = new Map<string, TaxDrillRow>();
  for (const p of mine) {
    const d = due(p, t);
    if (d <= 0) continue;
    const key = `${p.regionId}|${p.prof}`;
    const base: TaxLaw = p.prof === 'peasant' ? 'land' : k.taxLaw === 'income' ? 'income' : 'poll';
    const r = rows.get(key) ?? { regionId: p.regionId, prof: p.prof, payers: 0, base, rate: t[base], income: 0, weekly: 0 };
    r.payers += p.size;
    r.income += Math.max(0, p.incomeEma) * TICKS_PER_WEEK;
    r.weekly += Math.min(Math.max(0, p.savings), d) * ratio * TICKS_PER_WEEK;
    rows.set(key, r);
  }
  const list = [...rows.values()];
  const total = budgetLineRaw(w, kid, 'tax', st);
  return { key: 'tax', weekly: total, smoothing: total - sumW(list), law: k.taxLaw, stepMult: mult, collection: ratio, rates: t, laws, rows: byWeekly(list) };
}

/** 복지 (지금 법, 그 단계): 지역 × 무리 필요액 이동평균 */
export function drillWelfare(w: World, kid: number, steps: Steps = {}): WelfareDrill {
  const k = kingdomById(w, kid), st = stepsOf(k, steps), i = st.welfare - 1, target = welfareTarget(st.welfare);
  const rows: WelfareDrillRow[] = [];
  for (const [key, v] of Object.entries(k.welfareNeedBy ?? {})) {
    const [rid, g] = key.split('|');
    const group = g as WelfareGroup, covered = k.welfareLaw !== 'none' && welfareCovers(k.welfareLaw, group);
    const need = -(v.need[i] ?? 0) * TICKS_PER_WEEK;
    rows.push({ regionId: Number(rid), group, covered, short: v.short[i] ?? 0, targetIncome: welfareIncome(regionById(w, Number(rid)), target), need, weekly: covered ? need : 0 });
  }
  const total = budgetLineRaw(w, kid, 'welfare', st);
  rows.sort((a, b) => a.need - b.need || a.regionId - b.regionId);
  return { key: 'welfare', weekly: total, smoothing: total - sumW(rows), law: k.welfareLaw, target, rows };
}

/** 연구비 (그 단계) */
export function drillResearch(w: World, kid: number, steps: Steps = {}): ResearchDrill {
  const k = kingdomById(w, kid), st = stepsOf(k, steps), gov = companyById(w, k.governmentId), mult = levelOf('research', st.research);
  const t = gov?.research.current ? TECH_BY_ID[gov.research.current] : undefined;
  const active = !!(gov && t && !gov.research.known.includes(t.id));
  const left = active ? Math.max(0, t!.cost - (gov!.research.progress[t!.id] ?? 0)) : 0;
  const wanted = (k.output ?? 0) * TUNE.researchShare * mult;
  const total = budgetLineRaw(w, kid, 'research', st);
  return { key: 'research', weekly: total, smoothing: 0, tech: active ? t!.id : null, output: k.output ?? 0, share: TUNE.researchShare, stepMult: mult, wanted, left, cash: Math.max(0, gov?.cash ?? 0), rows: [{ part: 'research', weekly: total }] };
}

/** 국채 이자 */
export function drillInterest(w: World, kid: number): InterestDrill {
  const k = kingdomById(w, kid), debt = Math.max(0, companyById(w, k.governmentId)?.debt ?? 0);
  const weekly = budgetLineRaw(w, kid, 'interest', {});
  return { key: 'interest', weekly, smoothing: 0, debt, dailyRate: DAILY_INTEREST, rows: [{ part: 'interest', weekly }] };
}

/** 관세 (상품별·출발 왕국별 이동평균) */
export function drillTariffs(w: World, kid: number): TariffDrill {
  const k = kingdomById(w, kid), by = k.budgetBase?.tariffsBy ?? {};
  const rows: { good: GoodId; weekly: number }[] = [], byPartner: { kingdomId: number; weekly: number }[] = [];
  for (const [key, v] of Object.entries(by)) {
    if (key.startsWith('g:')) rows.push({ good: key.slice(2) as GoodId, weekly: v });
    else if (key.startsWith('k:')) byPartner.push({ kingdomId: Number(key.slice(2)), weekly: v });
  }
  const total = budgetLineRaw(w, kid, 'tariffs', {});
  return { key: 'tariffs', weekly: total, smoothing: total - sumW(rows), rows: byWeekly(rows), byPartner: byWeekly(byPartner) };
}

/** 주조 (공식, 지금 GDP) */
export function drillMint(w: World, kid: number): MintDrill {
  const k = kingdomById(w, kid), gdpWeek = (kingdomGdp(w, k.id) * TICKS_PER_WEEK) / 360;
  const rows: { part: 'base' | 'gdp'; weekly: number }[] = companyById(w, k.governmentId) ? [{ part: 'base', weekly: MINT_BASE }, { part: 'gdp', weekly: gdpWeek * MINT_RATE }] : [];
  const total = budgetLineRaw(w, kid, 'mint', {});
  return { key: 'mint', weekly: total, smoothing: total - sumW(rows), base: MINT_BASE, gdpWeek, rate: MINT_RATE, rows };
}

/** 왕실 공사 (그 국영 임금 단계) */
export function drillBuild(w: World, kid: number, steps: Steps = {}): BuildDrill {
  const k = kingdomById(w, kid), st = stepsOf(k, steps), mult = levelOf('wages', st.wages);
  const { value, office } = budgetModel(w, k);
  const total = value('build', st), sh = office.share;
  const officeSales = office.fixed + office.wage * mult;
  const rows = sh == null ? [{ part: 'other' as const, weekly: total }] : [{ part: 'wage' as const, weekly: -sh * office.wage * mult }, { part: 'other' as const, weekly: -sh * office.fixed }];
  return { key: 'build', weekly: total, smoothing: total - sumW(rows), stepMult: mult, share: sh, officeSales, rows };
}

/** 줄 이름으로 자세히 보기 (steps 는 budgetPreview 와 같다) */
export function budgetDrill(w: World, kid: number, key: BudgetLineKey, steps: Steps = {}): BudgetDrill {
  switch (key) {
    case 'wages': return drillWages(w, kid, steps);
    case 'stateFirms': return drillStateFirms(w, kid, steps);
    case 'goods': return drillGoods(w, kid);
    case 'tax': return drillTax(w, kid, steps);
    case 'welfare': return drillWelfare(w, kid, steps);
    case 'research': return drillResearch(w, kid, steps);
    case 'interest': return drillInterest(w, kid);
    case 'tariffs': return drillTariffs(w, kid);
    case 'mint': return drillMint(w, kid);
    case 'build': return drillBuild(w, kid, steps);
  }
}
