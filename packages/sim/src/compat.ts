import { GOOD_IDS, TECH_BY_ID, TECH_COST } from './data';
import { newMarketGood } from './world';
import { writePool } from './round';
import type { Building, Company, World } from './types';

// 화면 호환용 껍데기와 저장 불러오기. 껍데기는 sim 에서 없앤 제도들이다. 화면이 UI_CHANGES 2-17 을 반영하면 껍데기는 지운다.

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

/** 13판까지의 단계별 연구비 (TECH_COST 와 같은 순서) */
const OLD_TECH_COST = [0, 12_000_000, 24_000_000, 40_000_000, 70_000_000];

/**
 * 저장 파일을 불러온다 (불러오기 직후에 부른다). 지금 형식(16판)과 10~15판(레벨 소유·저택·금융가 금고·세법 셋·투자법·금융가 지분·복지법)을 받고,
 * 그보다 옛 판은 받지 않는다 (null). 10판은 금융가 지분 모양을, 10·11판은 100배 값을, 13판까지는 돈 연구를, 14판까지는 옛 공사 수수료 기준값을 바꾼다. 화면 표시용 사본은 다시 쓴다
 */
export function migrateWorld(input: unknown): World | null {
  const w = input as Omit<World, 'version'> & { version: number };
  if (!w || typeof w !== 'object' || w.version < 10 || w.version > 16) return null;
  if (w.version === 10) {
    // 10판: 금융가 지분이 건물 id → 지분 수 객체였다 (정수 키는 오름차순으로 나온다)
    for (const p of w.pops) {
      const old = p.fund as unknown as Record<string, number> | undefined;
      if (!old) continue;
      const ids = Object.keys(old).map(Number).sort((a, b) => a - b);
      p.fund = { id: ids, u: ids.map((id) => old[id]) };
    }
    w.version = 11;
  }
  if (w.version === 11) {
    // 11판까지: 부·문해력·교육 접근도·숙련도·작업 인원을 100배 값으로 저장했다 (소수 둘째 자리 반올림에서 멈추지 않게). 12판은 규칙 단위 값이다
    type Old = { wealth100?: number; literacy100?: number; education100?: number; exp100?: number; crew100?: number };
    for (const p of w.pops) {
      const o = p as typeof p & Old;
      p.wealth = (o.wealth100 ?? p.wealth * 100) / 100; p.literacy = (o.literacy100 ?? p.literacy * 100) / 100;
      delete o.wealth100; delete o.literacy100;
    }
    for (const r of w.regions) { const o = r as typeof r & Old; r.education = (o.education100 ?? r.education * 100) / 100; delete o.education100; }
    for (const b of w.buildings) {
      const o = b as typeof b & Old;
      b.exp = (o.exp100 ?? 0) / 100;
      if (o.crew100 !== undefined) b.crew = o.crew100 / 100; else delete b.crew;
      delete o.exp100; delete o.crew100;
    }
    w.version = 12;
  }
  if (w.version === 12) {
    // 13판: 화면 전용 기록(Building.payout·firmEma, Kingdom.tariffWeekBy·budgetBase.tariffsBy·welfareNeedBy, lastBudget.firms)이 생겼다. 모두 없어도 되고 다음 날·주에 채워진다
    w.version = 13;
  }
  if (w.version === 13) {
    // 14판: 연구가 돈(연구비) 대신 문해력 포인트다. 연구비 수준·연구비 장부·지난주 연구비를 지우고, 쌓인 연구비는 기술 값에 비례해 포인트로 바꾼다
    type OldResearch = { budget?: number; points?: number };
    for (const c of w.companies) {
      const r = c.research as typeof c.research & OldResearch;
      delete r.budget;
      r.points = 0;
      for (const id of Object.keys(r.progress)) {
        const t = TECH_BY_ID[id];
        const oldCost = t ? OLD_TECH_COST[TECH_COST.indexOf(t.cost)] : undefined;
        if (oldCost) r.progress[id] = (r.progress[id] * t.cost) / oldCost; else delete r.progress[id];
      }
      for (const l of [c.ledger, c.lastLedger] as Record<string, number>[]) delete l.research;
    }
    for (const k of w.kingdoms) {
      delete (k.budget as Record<string, number>).research;
      if (k.lastBudget) delete (k.lastBudget as Record<string, number>).research;
    }
    w.version = 14;
  }
  if (w.version === 14) {
    // 15판: 건축사무소가 수수료를 매출로 받는다. 민간 수수료 미리보기 기준값(옛 fees 줄)을 지운다. 새 화면 기록은 다음 날·주에 채워진다
    for (const k of w.kingdoms) {
      delete (k as { feeWageWeek?: number }).feeWageWeek;
      const b = k.budgetBase as (typeof k.budgetBase & { feesWage?: number; feesOther?: number }) | undefined;
      if (b) { delete b.feesWage; delete b.feesOther; }
    }
    w.version = 15;
  }
  if (w.version === 15) {
    // 16판: 생산 건물의 굶은 주 수(Building.starvedWeeks, AI 판단)가 생겼다. 없으면 0이고 다음 주부터 센다
    w.version = 16;
  }
  // 나중에 더한 상품(술 등)은 옛 저장의 지역 시장에 기본가로 넣는다
  for (const r of w.regions ?? []) for (const g of GOOD_IDS) if (!r.market[g]) r.market[g] = newMarketGood(g);
  const world = w as World;
  writePool(world);
  return world;
}
