import type { EncUnit } from '@econ/sim';
import type { Lang } from './strings';

const locale = (lang: Lang) => (lang === 'ko' ? 'ko-KR' : 'en-GB');

/** 숫자 하나 (큰 수는 자릿수 묶음, 작은 수는 소수 몇 자리) */
export function fmtNumber(v: number, lang: Lang, digits = 4): string {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : v < 0 ? '−∞' : '–';
  const abs = Math.abs(v);
  const max = abs >= 1000 ? 0 : abs >= 100 ? 1 : abs >= 1 ? 2 : digits;
  return v.toLocaleString(locale(lang), { maximumFractionDigits: max }).replace('-', '−');
}

/** 값 하나를 단위에 맞춰 쓴다. 비율(pct)은 ×100 % */
export function fmtValue(v: number | string, unit: EncUnit | undefined, lang: Lang): string {
  if (typeof v === 'string') return v;
  switch (unit) {
    case 'pct': return `${fmtNumber(v * 100, lang, 3)}%`;
    case 'florin': return `ƒ${fmtNumber(v, lang)}`;
    case 'x': return `${fmtNumber(v, lang)}×`;
    case 'day': return lang === 'ko' ? `${fmtNumber(v, lang)}일` : `${fmtNumber(v, lang)} d`;
    case 'week': return lang === 'ko' ? `${fmtNumber(v, lang)}주` : `${fmtNumber(v, lang)} wk`;
    case 'people': return lang === 'ko' ? `${fmtNumber(v, lang)}명` : fmtNumber(v, lang);
    case 'pt': return lang === 'ko' ? `${fmtNumber(v, lang)}점` : `${fmtNumber(v, lang)} pt`;
    case 'level': return lang === 'ko' ? `${fmtNumber(v, lang)}레벨` : `${fmtNumber(v, lang)} lvl`;
    default: return fmtNumber(v, lang);
  }
}
