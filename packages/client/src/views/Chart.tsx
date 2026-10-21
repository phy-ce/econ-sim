import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { shortDate } from '../format';
import { t } from '../i18n';

export interface Series { key: string; name: string; color: string }

interface Props {
  data: Record<string, number>[];
  series: Series[];
  format?: (v: number) => string;
  reference?: { y: number; label: string; color?: string };
  height?: number;
}

/** 왕국력 축 눈금: "2년 3월" / "Y2 M3" */
const tickLabel = (tick: number) => t().chartTick(Math.floor(tick / 360) + 1, Math.floor((tick % 360) / 30) + 1);

/** 한 축짜리 시계열 차트. 범례는 차트 밖(공통 범례)에서 그린다 */
export function TimeChart({ data, series, format = (v) => v.toFixed(1), reference, height = 200 }: Props) {
  if (data.length < 2) return <p className="empty chart-empty" style={{ height }}>—</p>;
  return (
    <><ResponsiveContainer width="100%" height={height} initialDimension={{ width: 520, height }}>
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -6 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="tick" tickFormatter={tickLabel} stroke="var(--ink2)"
          tick={{ fill: 'var(--ink2)', fontSize: 11 }} minTickGap={48} tickLine={false} axisLine={{ stroke: 'var(--rule)' }} />
        <YAxis tickFormatter={format} stroke="var(--ink2)" tick={{ fill: 'var(--ink2)', fontSize: 11 }} width={34}
          tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--sheet)', border: '1px solid var(--rule)', borderRadius: 6, color: 'var(--ink)', boxShadow: 'var(--pop-shadow)', fontSize: 12 }}
          labelStyle={{ fontFamily: 'var(--serif)', fontWeight: 700, marginBottom: 2 }}
          labelFormatter={(tick: number) => `${t().datePrefix}${shortDate(tick)}`}
          formatter={(v: number, name: string) => [format(v), name]}
          cursor={{ stroke: 'var(--ink2)', strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        {reference && <ReferenceLine y={reference.y} stroke={reference.color ?? 'var(--ink2)'} strokeDasharray="5 4" strokeWidth={1.2}
           />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.4}
            dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--sheet)' }} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>{reference&&<div className="chart-reference"><i style={{borderColor:reference.color??'var(--ink2)'}}/>{reference.label} {format(reference.y)}</div>}</>
  );
}

