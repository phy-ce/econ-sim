// 여러 화면이 함께 쓰는 작은 UI 조각: 계층 색, 막대(Bar·SegBar·Seats), 수지 막대(Waterfall)
import type { CSSProperties } from 'react';
import type { PopClass, Skill } from '@econ/sim';
import { money, signedMoney } from './format';

/** 계층 색: 차트·범례·표·지도 어디서나 같은 색 (styles.css 의 --c-* 토큰) */
export const CLASS_COLOR: Record<PopClass, string> = {
  peasant: 'var(--c-peasant)', unskilled: 'var(--c-unskilled)', farmer: 'var(--c-farmer, #8a9a3c)', skilled: 'var(--c-skilled)',
  expert: 'var(--c-expert)', gentry: 'var(--c-gentry, #7c6fd6)', capitalist: 'var(--c-capitalist)', aristocrat: 'var(--c-aristocrat)',
};
export const SKILL_COLOR: Record<Skill, string> = { unskilled: CLASS_COLOR.unskilled, farmer: CLASS_COLOR.farmer, skilled: CLASS_COLOR.skilled, expert: CLASS_COLOR.expert, gentry: CLASS_COLOR.gentry, capitalist: CLASS_COLOR.capitalist, aristocrat: CLASS_COLOR.aristocrat };

export type Tone = 'gold' | 'accent' | 'pos' | 'neg' | 'muted' | 'in' | 'out';
const TONE: Record<Tone, string> = {
  gold: 'var(--gold)', accent: 'var(--accent)', pos: 'var(--good)', neg: 'var(--bad)', muted: 'var(--ink2)',
  in: 'var(--c-unskilled)', out: 'var(--good)',
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const w = (v: number) => `${(clamp01(v) * 100).toFixed(1)}%`;

/**
 * 막대 하나: 먹 테두리 안을 value 만큼 채운다.
 * vac 이면 채우지 못한 부분을 빗금(빈자리·모자란 양)으로 칠한다. none 이면 점선 빈 칸.
 */
export function Bar({ value, tone = 'gold', color, vac = false, none = false, size = 'md', label, className = '', style }: {
  value: number; tone?: Tone; color?: string; vac?: boolean; none?: boolean; size?: 'sm' | 'md' | 'lg'; label?: string; className?: string; style?: CSSProperties;
}) {
  const v = clamp01(value);
  return (
    <span className={`bar ${size} ${vac && v < 0.999 ? 'vac' : ''} ${none ? 'none' : ''} ${className}`} style={style}
      role={label ? 'meter' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      aria-valuemin={label ? 0 : undefined} aria-valuemax={label ? 100 : undefined} aria-valuenow={label ? Math.round(v * 100) : undefined}>
      {!none && <i style={{ width: w(v), background: color ?? TONE[tone] }} />}
    </span>
  );
}

/** 이어 붙인 막대: 칸 너비는 grow(자리 수)에 비례, 칸마다 value 만큼 채우고 나머지는 빗금 */
export function SegBar({ segs, label }: { segs: { key: string; grow: number; value: number; color: string }[]; label?: string }) {
  return (
    <span className="segbar" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {segs.map((s) => <Bar key={s.key} value={s.value} color={s.color} vac style={{ flexGrow: s.grow }} />)}
    </span>
  );
}

/** 소유주 자리: 12석까지는 네모 칸, 그보다 많으면 막대 */
export function Seats({ filled, total, big = false }: { filled: number; total: number; big?: boolean }) {
  const n = Math.round(total), f = Math.min(n, Math.round(filled));
  if (n <= 0) return null;
  if (n > 12) return <Bar value={f / n} color="var(--ink2)" vac size="sm" className="seats-bar" />;
  return (
    <span className={`seats ${big ? 'big' : ''}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <i key={i} className={i < f ? 'on' : ''} />)}
    </span>
  );
}

/** 수지 막대: 매출 − 원료비 − 임금 = 이익. 0 선을 기준으로 구간을 그린다 */
export function Waterfall({ rev, raw, wage, labels }: { rev: number; raw: number; wage: number; labels: [string, string, string, string] }) {
  const profit = rev - raw - wage;
  const pts = [0, rev, rev - raw, profit];
  const lo = Math.min(...pts), hi = Math.max(...pts, 1);
  const S = hi - lo || 1;
  const pos = (x: number) => ((x - lo) / S) * 100;
  const zero = `${pos(0).toFixed(2)}%`;
  const seg = (a: number, b: number) => ({ left: `${pos(Math.min(a, b)).toFixed(2)}%`, width: `${Math.max(0.8, (Math.abs(b - a) / S) * 100).toFixed(2)}%` });
  const good = profit >= 0;
  const rows = [
    { k: 'rev', label: labels[0], s: seg(0, rev), bg: 'var(--wf-rev)', text: signedMoney(rev), cls: '' },
    { k: 'raw', label: labels[1], s: seg(rev, rev - raw), bg: 'var(--wf-raw)', text: `−${money(raw)}`, cls: '' },
    { k: 'wage', label: labels[2], s: seg(rev - raw, profit), bg: 'var(--wf-wage)', text: `−${money(wage)}`, cls: '' },
    { k: 'pl', label: labels[3], s: seg(0, profit), bg: good ? 'var(--good)' : 'var(--bad)', text: signedMoney(profit), cls: `total ${good ? 'pos' : 'neg'}` },
  ];
  return (
    <div className="wf">
      {rows.map((r) => (
        <div key={r.k} className={`wf-row ${r.cls}`}>
          <span className="wf-label">{r.label}</span>
          <span className="wf-track" aria-hidden="true"><span className="wf-zero" style={{ left: zero }} /><span className="wf-bar" style={{ ...r.s, background: r.bg }} /></span>
          <span className="wf-val pxnum">{r.text}</span>
        </div>
      ))}
    </div>
  );
}
