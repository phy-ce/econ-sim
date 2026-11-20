import type { Kingdom } from '@econ/sim';
import { useLang } from '../i18n';

// Charges remain distinguishable without colour, including kingdoms beyond the initial three.
const charges = [
  <circle cx="12" cy="11" r="4" />,
  <path d="M12 5 18 11 12 17 6 11Z" />,
  <path d="m12 5 6 11H6Z" />,
  <path d="M8 7h8v8H8Z" />,
  <path d="M10 5h4v4h4v4h-4v5h-4v-5H6V9h4Z" />,
  <path d="m12 4 2.5 5 5.5.8-4 3.8 1 5.4-5-2.6L7 19l1-5.4-4-3.8L9.5 9Z" />,
  <path d="M15 5a6 6 0 1 0 0 12A7 7 0 0 1 15 5Z" />,
  <path d="m6 9 6-4 6 4v4l-6 4-6-4Z" />,
];

export function KingdomMark({ kingdom, index, size = 18 }: { kingdom?: Kingdom; index: number; size?: number }) {
  const ko = useLang() === 'ko';
  const name = kingdom ? (ko ? kingdom.name : kingdom.nameEn) : undefined;
  const variant = Math.max(0, index) % charges.length;
  return (
    <svg
      className="kingdom-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={name ? 'img' : undefined}
      aria-label={name}
      aria-hidden={!name || undefined}
      data-help={name}
      data-variant={variant}
      focusable="false"
    >
      <path className="kingdom-mark-rim" d="M3 3h18v8c0 5-4 8-9 11-5-3-9-6-9-11Z" />
      <path
        className="kingdom-mark-field"
        fill={kingdom?.color ?? 'var(--ink2)'}
        d="M4.5 4.5h15V11c0 4-3.2 6.7-7.5 9.3C7.7 17.7 4.5 15 4.5 11Z"
      />
      <g className="kingdom-mark-charge">{charges[variant]}</g>
    </svg>
  );
}
