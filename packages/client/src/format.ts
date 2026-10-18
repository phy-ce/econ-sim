import { getLang } from './lang';

const nf0 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export const money = (v: number) => `${v < 0 ? "−" : ""}ƒ${moneyAmount(Math.abs(v))}`;
export const signedMoney = (v: number) => `${v >= 0 ? '+' : '−'}ƒ${moneyAmount(Math.abs(v))}`;
export const int = (v: number) => compact(v);
export const one = (v: number) => Math.abs(v)>=1000?compact(v):nf1.format(v);
export const two = (v: number) => Math.abs(v)>=1000?compact(v):nf2.format(v);
export const pct = (v: number) => `${Math.round(v * 100)}%`;

/** 한글 조사 선택: 받침이 있으면 with, 없으면 without (예: particle('농장', '을', '를') → '농장을') */
export function particle(word: string, withBatchim: string, without: string): string {
  const code = word.charCodeAt(word.length - 1);
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  return word + (hangul && (code - 0xac00) % 28 !== 0 ? withBatchim : hangul ? without : withBatchim);
}

/** Shared compact notation for both languages; round across unit boundaries. */
export function compact(v:number):string {
  if(!Number.isFinite(v)) return '—';
  const sign=v<0?'−':'';
  const absolute=Math.abs(v);
  if(absolute<1000) return sign+nf0.format(Math.round(absolute));
  const units=['k','M','B','T'];
  let unit=Math.min(3,Math.floor(Math.log10(absolute)/3)-1);
  let scaled=absolute/1000**(unit+1);
  let rounded=Number(scaled.toFixed(1));
  if(rounded>=1000&&unit<3){unit++;rounded=1;}
  return `${sign}${rounded}${units[unit]}`;
}
export const exactNumber=(v:number)=>Number.isFinite(v)?new Intl.NumberFormat('en-US',{maximumFractionDigits:6}).format(v):'—';
export const compactMoney = money;
export const signedCompactMoney = (v: number) => `${v >= 0 ? '+' : '−'}ƒ${moneyAmount(Math.abs(v))}`;

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

function moneyAmount(v:number):string { return Number.isFinite(v) && v < 100 ? v.toFixed(2) : compact(v); }
