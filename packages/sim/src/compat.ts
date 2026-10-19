import { fallbackWages, hasOwnCash } from './economy';
import { updateCompanyWages } from './labor';
import { seedAmount } from './production';
import { floorCents } from './rng';
import type { Building, Company, Kingdom, Ledger, World } from './types';
import { LEDGER_KEYS, emptyKingdomWeek, emptyWeek } from './types';

// 화면 호환용 껍데기와 옛 저장 변환. sim 에서는 없앤 제도들이다. 화면이 UI_CHANGES 2-17 을 반영하면 껍데기는 지운다.

/** 부실 제도는 없앴다: 늘 false */
export function isDistressed(_w: World, _c: Company): boolean {
  return false;
}
export const SEIZURE_WEEKS = 1;
export const DISTRESS_DEBT_RATIO = 1;

/** 소작지 지주 자리는 없다 (지대는 저택 귀족이 현금으로 받는다): 늘 0 */
export function landlordJobs(_b: Building): number {
  return 0;
}

/** 연구비는 예산 편성으로 정한다. 화면의 예상 일수 계산용으로만 남긴 값 */
export const MAX_RESEARCH_BUDGET = 100_000;

/**
 * 저장 파일을 지금 형식으로 바꾼다 (불러오기 직후에 부른다). 지금 형식이면 그대로 돌려준다.
 * 4 → 5 (건물 현금·건물 임금·보조금):
 * - 건물 임금 = 그 건물 주인 회사의 임금표, 주간 장부 0
 * - 건물 현금 = 새 건물과 같은 시작 현금(만원 주간 임금 × seedWeeks)을 주인 회사 현금에서 옮긴다 (있는 만큼). 돈이 보존된다.
 *   0으로 시작하면 첫날 현금 건물이 모두 임금을 다 못 줘 일꾼이 한꺼번에 떠난다
 * - 민간 빚: 민간은 이제 빌리지 않는다. 현금으로 갚을 수 있는 만큼 은행에 갚고(돈 보존), 남은 빚은 없앤다 (빚은 돈이 아니다)
 * - 없앤 필드: 회사 wageOffset·weekStartCash·revenueEma·lastEmployed, 왕국 budget.wages·wageIndex
 * - 새 장부 줄: 회사 장부 subsidies, 왕국 lastBudget subsidies·dividends
 * 그보다 옛 형식은 바꿀 수 없다 (null)
 */
export function migrateWorld(input: unknown): World | null {
  const w = input as World & { version: number };
  if (!w || typeof w !== 'object') return null;
  if (w.version === 5) return w;
  if (w.version !== 4) return null;
  const byId = new Map(w.companies.map((c) => [c.id, c]));
  for (const b of w.buildings as (Building & Partial<Pick<Building, 'cash' | 'wages' | 'week' | 'lastWeek'>>)[]) {
    const owner = byId.get(b.companyId);
    b.cash = 0;
    b.wages = owner ? { ...fallbackWages(), ...owner.wages } : fallbackWages();
    b.week = emptyWeek();
    b.lastWeek = emptyWeek();
  }
  const fix = (l: Partial<Ledger> | undefined): Ledger => Object.fromEntries(LEDGER_KEYS.map((k) => [k, l?.[k] ?? 0])) as Ledger;
  for (const c of w.companies as (Company & Record<string, unknown>)[]) {
    if (!c.state && c.debt > 0) {
      const pay = Math.max(0, Math.min(c.debt, c.cash));
      c.cash -= pay;
      w.bank.cash += pay;
      c.debt = 0;
    }
    for (const k of ['wageOffset', 'weekStartCash', 'revenueEma', 'lastEmployed']) delete c[k];
    c.ledger = fix(c.ledger);
    c.lastLedger = fix(c.lastLedger);
  }
  // 4판의 회사 현금에는 건물 운영 돈이 들어 있다: 건물마다 새 건물과 같은 시작 현금을 주인 회사 현금에서 옮긴다 (민간 빚을 갚고 남은 만큼, 빌리지 않는다)
  for (const b of w.buildings) {
    const owner = byId.get(b.companyId);
    if (!owner || !hasOwnCash(b)) continue;
    const amt = Math.min(seedAmount(b), floorCents(owner.cash));
    if (amt <= 0) continue;
    owner.cash -= amt;
    b.cash = amt;
  }
  for (const k of w.kingdoms as (Kingdom & Record<string, unknown>)[]) {
    const old = k.budget as Record<string, number>;
    k.budget = { tax: old.tax ?? 3, research: old.research ?? 3 };
    delete k.wageIndex;
    k.spentWeek = { ...emptyKingdomWeek(), ...(k.spentWeek ?? {}) };
    if (k.lastBudget) k.lastBudget = { ...k.lastBudget, subsidies: k.lastBudget.subsidies ?? 0, dividends: k.lastBudget.dividends ?? 0 };
  }
  updateCompanyWages(w);
  w.version = 5;
  return w;
}
