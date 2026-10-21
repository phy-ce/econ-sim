import { writeMirrors } from './round';
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
 * 저장 파일을 불러온다 (불러오기 직후에 부른다). 지금 형식(9판: 레벨 소유·저택·금융가 금고·세법 셋·투자법·금융가 지분)만 받고, 옛 판은 바꾸지 않는다 (null).
 * 화면 표시용 사본은 다시 쓴다
 */
export function migrateWorld(input: unknown): World | null {
  const w = input as World & { version: number };
  if (!w || typeof w !== 'object' || w.version !== 9) return null;
  writeMirrors(w);
  return w;
}
