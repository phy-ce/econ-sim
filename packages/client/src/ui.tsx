// 여러 화면이 함께 쓰는 작은 UI 조각: 계층 색, 설명 툴팁, 막대, 숫자 카드
import { Info as InfoIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PopClass } from '@econ/sim';
import { t } from './i18n';

/** 계층 색: 차트·범례·표·지도 어디서나 같은 색 (styles.css 의 --c-* 토큰) */
export const CLASS_COLOR: Record<PopClass, string> = {
  peasant: 'var(--c-peasant)', unskilled: 'var(--c-unskilled)', skilled: 'var(--c-skilled)',
  expert: 'var(--c-expert)', capitalist: 'var(--c-capitalist)', aristocrat: 'var(--c-aristocrat)',
};

/** (i) 아이콘: 마우스를 올리거나 초점을 주면 설명이 뜬다. 긴 안내문을 본문에서 빼기 위한 것 */
export function Info({ text, label = t().info }: { text: ReactNode; label?: string }) {
  return (
    <span className="info" tabIndex={0} aria-label={label}>
      <InfoIcon size={13} strokeWidth={2} aria-hidden="true" />
      <span className="info-tip" role="tooltip">{text}</span>
    </span>
  );
}

/** 도트 블록 막대: 칸 단위로 채운다 (기본 10칸). tone 으로 색을 고른다 */
export function Meter({ value, tone = 'gold', label, cells = 10 }: { value: number; tone?: 'gold' | 'accent' | 'pos' | 'neg' | 'warn' | 'muted'; label?: string; cells?: number }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const filled = v > 0 && v < 1 / cells ? 1 : Math.round(v * cells);
  return (
    <span className={`blocks meter ${tone}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      {Array.from({ length: cells }, (_, i) => <i key={i} className={i < filled ? 'on' : ''} />)}
    </span>
  );
}

/** 큰 숫자 + 작은 이름표 */
export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'pos' | 'neg' | 'warn' }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone ?? ''}`}>{value}</span>
      {sub != null && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
