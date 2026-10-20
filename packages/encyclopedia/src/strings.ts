// 화면 문구 (라벨만). 규칙 설명은 sim 의 encyclopedia.ts 에 있다
export type Lang = 'ko' | 'en';

const S = {
  title: { ko: '규칙 사전', en: 'Rules' },
  search: { ko: '검색', en: 'Search' },
  noResults: { ko: '결과 없음', en: 'No results' },
  formula: { ko: '공식', en: 'Formula' },
  params: { ko: '값', en: 'Values' },
  example: { ko: '예시', en: 'Example' },
  inputs: { ko: '입력', en: 'Inputs' },
  steps: { ko: '계산', en: 'Steps' },
  result: { ko: '결과', en: 'Result' },
  live: { ko: '지금 게임', en: 'Live game' },
  related: { ko: '관련', en: 'Related' },
  seenIn: { ko: '보이는 곳', en: 'Seen in' },
  source: { ko: '코드', en: 'Source' },
  design: { ko: 'DESIGN.md', en: 'DESIGN.md' },
  region: { ko: '지역', en: 'Region' },
  good: { ko: '상품', en: 'Good' },
  kingdom: { ko: '왕국', en: 'Kingdom' },
  building: { ko: '건물', en: 'Building' },
  seed: { ko: '시드', en: 'Seed' },
  day: { ko: '날', en: 'Day' },
  year: { ko: '년', en: 'Year' },
  plus30: { ko: '+30일', en: '+30 d' },
  plusYear: { ko: '+1년', en: '+1 y' },
  restart: { ko: '처음부터', en: 'Restart' },
  running: { ko: '계산 중', en: 'Running' },
  empty: { ko: '없음', en: 'None' },
  theme: { ko: '테마', en: 'Theme' },
  language: { ko: 'English', en: '한국어' },
  menu: { ko: '목록', en: 'Index' },
} as const;

export type StringKey = keyof typeof S;
export const tr = (k: StringKey, lang: Lang): string => S[k][lang];
