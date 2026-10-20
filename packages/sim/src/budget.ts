import { BUILDING_BY_ID, SKILL_DEFS, TICKS_PER_WEEK, TUNE } from './data';
import { companyById, isGovernment, kingdomGdp } from './economy';
import { DAILY_INTEREST, MINT_BASE, MINT_RATE } from './finance';
import { kingdomById } from './kingdoms';
import { BUDGET_ITEMS, BUDGET_STEPS, SKILLS } from './types';
import type { BudgetItem, World } from './types';

// ---------------------------------------------------------------- 예산 미리보기 (화면 전용)
//
// 정책 단계를 바꾸면 그 자리에서 바뀌는 주간 예상 국정 수지. 지난주 장부(lastBudget)는 단계를 바꾼 뒤 한 주가 지나야 바뀌고
// 매주 출렁이므로, 여기서는 천천히 움직이는 기준값(이동평균, 지금 고용)에 단계 배율만 곱한다.
// 세계를 바꾸지 않는다 (난수·쓰기 없음). sim 은 이 값을 읽지 않는다.

/** 미리보기 줄: 수입(세금·관세·주조·민간 공사 수수료)은 +, 지출(정부 건물 임금·원료·연구비·국채 이자)은 − */
export type BudgetLineKey = 'tax' | 'tariffs' | 'mint' | 'fees' | 'wages' | 'goods' | 'research' | 'interest';

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
  /** 왕실 생산 건물(정부 건물이 아닌 것)의 주간 임금. 국영 임금 수준이 이것도 올린다. 그 건물의 매출로 내므로 순수지에는 넣지 않는다 */
  firmWages: { weekly: number; byLevel: number[] };
}

/** 화면에 보일 둥근 값: 1,000 이상은 100 단위, 그 아래는 10 단위 */
export function roundBudget(x: number): number {
  const unit = Math.abs(x) >= 1000 ? 100 : 10;
  return Math.round(x / unit) * unit + 0;
}

const levelOf = (item: BudgetItem, step: number) =>
  (item === 'tax' ? TUNE.taxLevels : item === 'wages' ? TUNE.govWageLevels : TUNE.researchLevels)[step - 1];

/**
 * 왕국의 주간 예상 국정 수지 (steps 를 넘기면 그 단계로, 빠진 손잡이는 지금 단계).
 * - 세금 = 배율 1 하루 세입 이동평균 × 7 × 세금 수준 배율 (징수율·저축 한도·토지세 포함)
 * - 관세·민간 공사 수수료·정부 건물 원료 = 주간 이동평균
 * - 주조 = mintMoney 와 같은 식 (pop 소득 이동평균)
 * - 정부 건물 임금 = 지금 고용 × 기본 임금 × 임금 지수 × 국영 임금 수준 배율 × 7
 * - 연구비 = 주간 경제 규모(이동평균) × 연구비 비율 × 연구비 수준 배율 (연구 중인 기술이 없으면 0)
 * - 국채 이자 = 지금 빚 × 일 이자율 × 7
 */
export function budgetPreview(w: World, kingdomId: number, steps: Partial<Record<BudgetItem, number>> = {}): BudgetPreview {
  const k = kingdomById(w, kingdomId);
  const gov = companyById(w, k.governmentId);
  const cur = {} as Record<BudgetItem, number>;
  for (const item of BUDGET_ITEMS) cur[item] = steps[item] ?? k.budget[item];

  // 단계 배율 1 일 때의 주간 기준값
  const base = k.budgetBase ?? {};
  let wageBase = 0, firmBase = 0;
  if (gov) {
    for (const b of w.buildings) {
      if (b.companyId !== gov.id || BUILDING_BY_ID[b.typeId].auto) continue;
      let day = 0;
      for (const s of SKILLS) day += b.employed[s] * SKILL_DEFS[s].baseWage * (k.wageIndex ?? 1);
      if (isGovernment(b.typeId)) wageBase += day * TICKS_PER_WEEK; else firmBase += day * TICKS_PER_WEEK;
    }
  }
  const t = gov?.research.current;
  const researching = !!t && !gov!.research.known.includes(t);
  const researchBase = researching ? (k.output ?? 0) * TUNE.researchShare : 0;
  const fixed = {
    tariffs: base.tariffs ?? 0,
    mint: gov ? MINT_BASE + (kingdomGdp(w, k.id) * TICKS_PER_WEEK / 360) * MINT_RATE : 0,
    fees: base.fees ?? 0,
    goods: -(base.goods ?? 0),
    interest: -Math.max(0, gov?.debt ?? 0) * DAILY_INTEREST * TICKS_PER_WEEK,
  };
  const knobbed = (item: BudgetItem, step: number): number =>
    item === 'tax' ? (base.tax ?? 0) * TICKS_PER_WEEK * levelOf('tax', step)
      : item === 'wages' ? -wageBase * levelOf('wages', step)
        : -researchBase * levelOf('research', step);
  const levels = Array.from({ length: BUDGET_STEPS }, (_, i) => i + 1);

  const line = (key: BudgetLineKey, knob?: BudgetItem): BudgetLine => knob
    ? { key, knob, weekly: roundBudget(knobbed(knob, cur[knob])), byLevel: levels.map((s) => roundBudget(knobbed(knob, s))) }
    : { key, weekly: roundBudget(fixed[key as keyof typeof fixed]) };
  const lines = [
    line('tax', 'tax'), line('tariffs'), line('mint'), line('fees'),
    line('wages', 'wages'), line('goods'), line('research', 'research'), line('interest'),
  ];
  let income = 0, expense = 0;
  for (const l of lines) if (l.weekly >= 0) income += l.weekly; else expense += l.weekly;
  const net = income + expense;
  const netByLevel = {} as Record<BudgetItem, number[]>;
  for (const item of BUDGET_ITEMS) {
    const l = lines.find((x) => x.knob === item)!;
    netByLevel[item] = l.byLevel!.map((v) => net - l.weekly + v);
  }
  return {
    steps: cur, lines, income, expense, net, netByLevel,
    firmWages: { weekly: roundBudget(-firmBase * levelOf('wages', cur.wages)), byLevel: levels.map((s) => roundBudget(-firmBase * levelOf('wages', s))) },
  };
}
