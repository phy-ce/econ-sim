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

/** 연구비는 예산 편성으로 정한다. 화면의 예상 일수 계산용으로만 남긴 값 */
export const MAX_RESEARCH_BUDGET = 100_000;

/**
 * 저장 파일을 불러온다 (불러오기 직후에 부른다). 지금 형식(13판)과 10~12판(레벨 소유·저택·금융가 금고·세법 셋·투자법·금융가 지분·복지법)을 받고,
 * 그보다 옛 판은 받지 않는다 (null). 10판은 금융가 지분 모양을, 10·11판은 100배 값을 바꾼다. 화면 표시용 사본은 다시 쓴다
 */
export function migrateWorld(input: unknown): World | null {
  const w = input as Omit<World, 'version'> & { version: number };
  if (!w || typeof w !== 'object' || w.version < 10 || w.version > 13) return null;
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
  const world = w as World;
  writePool(world);
  return world;
}
