import type { Building, Company, World } from './types';

// 화면 호환용 껍데기. sim 에서는 없앤 제도들이다. 화면이 UI_CHANGES 2-17 을 반영하면 이 파일을 지운다.

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
