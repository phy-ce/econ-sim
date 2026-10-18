// 지역 계층 도넛: 원 전체를 인구 / 부(인구×부 단계) / 하루 소득(현물 포함) 중 하나로 나눈다.
// 디자인 기준: .tmp/classdesign/project/Main.dc.html
import { useState } from 'react';
import { GOOD_IDS, POP_CLASSES } from '@econ/sim';
import type { PopClass, Region } from '@econ/sim';
import { ClassSprite, SvgSprite64 } from '../sprites';
import { Bar, CLASS_COLOR } from '../ui';
import { compact, compactMoney, pct, exactNumber } from '../format';
import { className, regionName, useT } from '../i18n';
import type { Dict } from '../i18n';

type Metric = 'pop' | 'wealth' | 'income';
type TextKey = keyof Dict & `m${string}`;
/** 문구는 사전 키 (mPop, mPopCol, mPopCenter …) */
const METRICS: { id: Metric; key: 'mPop' | 'mWealth' | 'mIncome'; icon: string }[] = [
  { id: 'pop', key: 'mPop', icon: 'M2 1h2v2h-2zM6 1h2v2h-2zM1 4h4v4h-4zM5 4h4v4h-4z' },
  { id: 'wealth', key: 'mWealth', icon: 'M3 1h4v1h-4zM2 2h1v1h-1zM7 2h1v1h-1zM1 3h8v2h-8zM2 5h6v1h-6zM1 6h8v2h-8zM2 8h6v1h-6z' },
  { id: 'income', key: 'mIncome', icon: 'M3 2h4v1h-4zM2 3h1v4h-1zM7 3h1v4h-1zM3 7h4v1h-4zM4 4h2v2h-2zM8 0h2v1h-2zM9 1h1v1h-1z' },
];
const MIN = 0.03, GAP = 0.012, C = 200;

function arc(r0: number, r1: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(r1, a0)}A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
}

export function ClassDonut({ region: r, onViewPops }: { region: Region; onViewPops?:(prof:PopClass)=>void }) {
  const [metric, setMetric] = useState<Metric>('pop');
  const [sel, setSel] = useState<PopClass | null>(null);
  const T = useT();
  const txt = (m: (typeof METRICS)[number], part: '' | 'Col' | 'Center') => T[`${m.key}${part}` as TextKey] as string;
  const curM = METRICS.find((m) => m.id === metric)!;
  const cur = { label: txt(curM, ''), col: txt(curM, 'Col'), center: txt(curM, 'Center') };

  const rows = POP_CLASSES.filter((c) => r.households[c].population >= 0.5).map((c) => {
    const h = r.households[c];
    const inKind = GOOD_IDS.reduce((a, g) => a + (h.inKind[g] ?? 0) * r.market[g].price, 0);
    const income = Math.max(0, h.incomeEma + inKind);
    const v = metric === 'pop' ? h.population : metric === 'wealth' ? h.population * h.wealth : income;
    return { c, h, v, food: h.food ?? h.fulfillment };
  }).sort((p, q) => q.v - p.v); // 비율이 큰 계층부터 (12시에서 시계 방향, 목록 위에서 아래)
  const total = rows.reduce((a, x) => a + x.v, 0) || 1;
  const show = (v: number) => (metric === 'income' ? compactMoney(v) : metric === 'pop' ? T.people(compact(v)) : compact(v));

  // 아주 작은 조각도 보이게 최소 각도를 주고 나머지를 비례 축소
  const raw = rows.map((x) => (x.v / total) * Math.PI * 2);
  const smallN = raw.filter((x) => x < MIN).length;
  const bigSum = raw.filter((x) => x >= MIN).reduce((a, x) => a + x, 0) || 1;
  const k = (Math.PI * 2 - smallN * MIN) / bigSum;
  let a = -Math.PI / 2;
  const segs = rows.map((x, i) => {
    const sweep = raw[i] < MIN ? MIN : raw[i] * k;
    const on = x.c === sel;
    const d = arc(on ? 96 : 104, on ? 168 : 158, a + GAP / 2, a + sweep - GAP / 2);
    a += sweep;
    return { c: x.c, d, on };
  });

  // 100칸 와플: 1칸 = 1%
  const counts = rows.map((x) => Math.floor((x.v / total) * 100));
  let left = 100 - counts.reduce((s, x) => s + x, 0);
  rows.map((x, i) => ({ i, rem: (x.v / total) * 100 - counts[i] })).sort((p, q) => q.rem - p.rem)
    .forEach((o) => { if (left > 0 && rows[o.i].v / total >= 0.01) { counts[o.i] += 1; left -= 1; } });
  const cells: string[] = [];
  rows.forEach((x, i) => { for (let j = 0; j < counts[i]; j++) cells.push(CLASS_COLOR[x.c]); });
  while (cells.length < 100) cells.push('var(--sheet)');

  const selRow = rows.find((x) => x.c === sel);
  const label = T.donutAria(regionName(r), cur.label, rows.map((x) => `${className(x.c)} ${pct(x.v / total)}`).join(', '));

  return (
    <div className="donut-block">
      <div className="donut-top">
        <div className="pxseg" role="group" aria-label={T.donutPick}>
          {METRICS.map((m) => (
            <button key={m.id} aria-pressed={metric === m.id} onClick={() => setMetric(m.id)}>
              <svg width="16" height="16" viewBox="0 0 10 10" aria-hidden="true" shapeRendering="crispEdges"><path d={m.icon} fill="currentColor" /></svg>
              {txt(m, '')}
            </button>
          ))}
        </div>
      </div>
      <div className="donut-grid">
        <div className="donut">
          <svg viewBox="0 0 400 400" role="img" aria-label={label}>
            <circle cx={C} cy={C} r={170} fill="none" stroke="var(--ink)" strokeWidth={2} strokeDasharray="4 4" />
            {segs.map((s) => (
              <path key={s.c} d={s.d} fill={CLASS_COLOR[s.c]} stroke="var(--ink)" strokeWidth={s.on ? 3 : 1.5}
                className="donut-seg" onClick={() => setSel(s.on ? null : s.c)} />
            ))}
            {selRow
              ? <>
                <SvgSprite64 id={selRow.c} x={164} y={112} size={72} />
                <text x={C} y={222} className="donut-name">{className(selRow.c)}</text>
                <text x={C} y={254} className="donut-val">{show(selRow.v)}</text>
                <text x={C} y={282} className="donut-sub">{pct(selRow.v / total)}</text>
              </>
              : <>
                <text x={C} y={188} className="donut-sub">{cur.center}</text>
                <text x={C} y={232} className="donut-total">{show(total)}</text>
              </>}
          </svg>
        </div>
        <div className="donut-legend">
          <div className="dl-head lbl"><span /><span>{T.classWealth}</span><span className="num">{cur.col}</span><span className="num">{T.share}</span></div>
          {rows.map((x) => {
            const on = x.c === sel;
            const share = x.v / total;
            return (
              <button key={x.c} className={`dl-row ${on ? 'on' : ''}`} aria-pressed={on} title={exactNumber(x.v)} onClick={() => {setSel(on ? null : x.c);onViewPops?.(x.c);}}>
                <span className="dl-tile" style={{ color: CLASS_COLOR[x.c] }}><ClassSprite c={x.c} size={32} /></span>
                <span className="dl-main">
                  <span className="dl-name">
                    <span className="dl-sw" style={{ background: CLASS_COLOR[x.c] }} />
                    <b>{className(x.c)}</b>
                    <span className={`dl-food ${x.food < 0.9 ? 'neg' : ''}`}>{T.food(pct(x.food))}</span>
                  </span>
                  <span className="dl-wealth" title={T.wealthLevel}>
                    <Bar value={x.h.wealth / 30} color={CLASS_COLOR[x.c]} size="sm" />
                    <span className="pxnum small">{T.wealthLevel} {x.h.wealth.toFixed(1)}</span></span><span className="dl-wealth" title={T.standardOfLiving}><Bar value={x.h.sol / 30} color={CLASS_COLOR[x.c]} size="sm"/><span className="pxnum small">{T.standardOfLiving} {x.h.sol.toFixed(1)}</span>
                  </span>
                </span>
                <span className="pxnum num">{show(x.v)}</span>
                <span className="pxnum num strong">{share < 0.001 ? '<0.1%' : `${(share * 100).toFixed(1)}%`}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="waffle" role="img" aria-label={label}>
        {cells.map((bg, i) => <span key={i} style={{ background: bg }} />)}
      </div>
    </div>
  );
}
