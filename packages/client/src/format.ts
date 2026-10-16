import { getLang } from './lang';

const nf0 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export const money = (v: number) => `ƒ${nf0.format(Math.round(v))}`;
export const signedMoney = (v: number) => `${v >= 0 ? '+' : '−'}ƒ${nf0.format(Math.abs(Math.round(v)))}`;
export const int = (v: number) => nf0.format(Math.round(v));
export const one = (v: number) => nf1.format(v);
export const two = (v: number) => nf2.format(v);
export const pct = (v: number) => `${Math.round(v * 100)}%`;

/** 한글 조사 선택: 받침이 있으면 with, 없으면 without (예: particle('농장', '을', '를') → '농장을') */
export function particle(word: string, withBatchim: string, without: string): string {
  const code = word.charCodeAt(word.length - 1);
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  return word + (hangul && (code - 0xac00) % 28 !== 0 ? withBatchim : hangul ? without : withBatchim);
}

/** 좁은 곳에 쓰는 짧은 수: 한국어 13.5만, 1.2억 / 영어 135K, 1.2M, 3.4B */
export function compact(v: number): string {
  const a = Math.abs(v), sign = v < 0 ? '−' : '';
  if (getLang() === 'en') {
    if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)}B`;
    if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
    if (a >= 1e4) return `${sign}${(a / 1e3).toFixed(0)}K`;
    return `${sign}${nf0.format(Math.round(a))}`;
  }
  if (a >= 1e8) return `${sign}${(a / 1e8).toFixed(a >= 1e9 ? 0 : 1)}억`;
  if (a >= 1e4) return `${sign}${(a / 1e4).toFixed(a >= 1e5 ? 0 : 1)}만`;
  return `${sign}${nf0.format(Math.round(a))}`;
}
export const compactMoney = (v: number) => (v < 0 ? `−ƒ${compact(-v)}` : `ƒ${compact(v)}`);
export const signedCompactMoney = (v: number) => `${v >= 0 ? '+' : '−'}ƒ${compact(Math.abs(v))}`;

/**
 * 왕국력 날짜를 [날짜, 시각] 으로. 360틱 = 1년, 30틱 = 1개월.
 * 한국어 ['3년 2월 5일', '08시'], 영어 ['Year 3, Month 2, Day 5', '08:00']. 시각이 없으면 ''.
 */
export function dateParts(tick: number, hour?: number): [string, string] {
  const y = Math.floor(tick / 360) + 1;
  const mo = Math.floor((tick % 360) / 30) + 1;
  const d = (tick % 30) + 1;
  const hh = hour === undefined ? '' : String(Math.floor(hour)).padStart(2, '0');
  if (getLang() === 'en') return [`Year ${y}, Month ${mo}, Day ${d}`, hh && `${hh}:00`];
  return [`${y}년 ${mo}월 ${d}일`, hh && `${hh}시`];
}

/** 접두어 없는 날짜 (소식·차트 툴팁) */
export const shortDate = (tick: number) => dateParts(tick)[0];
