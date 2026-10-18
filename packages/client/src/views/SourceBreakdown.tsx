import { NumericValue } from '../NumericValue';
// 시세표에서 고른 상품의 수요·공급이 어디서 오는지 (MarketGood.demandByEma / supplyByEma)
import type { GoodId, MarketGood, PopClass } from '@econ/sim';
import type { ReactNode } from 'react';
import { BuildingSprite, ClassSprite, GoodSprite, Sprite } from '../sprites';
import { compact, pct } from '../format';
import { buildingName, className, goodName, t, useT } from '../i18n';

const SWATCH = ['var(--accent)', 'var(--gold)', 'var(--good)', 'var(--sea-line)', 'var(--c-expert)', 'var(--c-capitalist)'];
const OTHER = 'var(--ink2)';
const MAX_ROWS = 6;

function describe(key: string, side: 'demand' | 'supply'): { label: string; icon: ReactNode } {
  const T = t();
  if (key.startsWith('pop:')) {
    const c = key.slice(4) as PopClass;
    return { label: T.srcConsumption(className(c)), icon: <ClassSprite c={c} /> };
  }
  if (key.startsWith('bld:')) {
    const t = key.slice(4);
    return { label: side === 'demand' ? T.srcInputs(buildingName(t)) : T.srcOutput(buildingName(t)), icon: <BuildingSprite typeId={t} size={16} /> };
  }
  switch (key) {
    case 'salvage': return {label:T.salvage,icon:<GoodSprite g="timber"/>};
    case 'trader': return side === 'demand'
      ? { label: T.srcTraderOut, icon: <GoodSprite g="transport" /> }
      : { label: T.srcTraderIn, icon: <GoodSprite g="transport" /> };
    case 'export': return { label: T.srcExport, icon: <Sprite name="m-ship" /> };
    case 'import': return side === 'demand'
      ? { label: T.srcImportUnload, icon: <Sprite name="m-ship" /> }
      : { label: T.srcImport, icon: <Sprite name="m-ship" /> };
    case 'subsistence': return { label: T.srcSubsistence, icon: <Sprite name="m-wheat" /> };
    default: return { label: T.srcOther, icon: <Sprite name="coin" /> };
  }
}

function Side({ title, by, side, extra }: { title: string; by: Record<string, number>; side: 'demand' | 'supply'; extra?: ReactNode }) {
  const T = useT();
  const parts = Object.entries(by).filter(([, v]) => v > 1e-3).sort((a, b) => b[1] - a[1]);
  const total = parts.reduce((a, [, v]) => a + v, 0);
  const shown = parts.slice(0, parts.length > MAX_ROWS ? MAX_ROWS - 1 : MAX_ROWS);
  const rest = parts.slice(shown.length);
  const rows = shown.map(([k, v], i) => ({ key: k, v, color: SWATCH[i % SWATCH.length], ...describe(k, side) }));
  if (rest.length) rows.push({ key: '_rest', v: rest.reduce((a, [, v]) => a + v, 0), color: OTHER, label: T.srcRest(rest.length), icon: <Sprite name="coin" /> });
  return (
    <div className="src-side">
      <div className="src-head">
        <span className="strong">{title}</span>
        <span className="lbl">{T.daily} <span className="pxnum"><NumericValue value={total} format="compact"/></span></span>
      </div>
      {total <= 0 ? <p className="empty">—</p> : (
        <>
          <div className="src-bar" role="img" aria-label={T.srcAria(title)}>
            {rows.map((r) => <i key={r.key} style={{ flexGrow: r.v, background: r.color }} />)}
          </div>
          <ul className="src-list">
            {rows.map((r) => (
              <li key={r.key}>
                <i className="src-sw" style={{ background: r.color }} aria-hidden="true" />
                {r.icon}
                <span className="src-name" title={r.label}>{r.label}</span>
                <span className="pxnum num"><NumericValue value={r.v} format="compact"/></span>
                <span className="pxnum num src-pct">{pct(r.v / total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {extra}
    </div>
  );
}

export function SourceBreakdown({ good, m }: { good: GoodId; m: MarketGood }) {
  const T = useT();
  const demand = m.demandByEma ?? m.demandBy ?? {};
  const supply = m.supplyByEma ?? m.supplyBy ?? {};
  return (
    <div className="src-break">
      <div className="card-head">
        <span className="good-name strong"><GoodSprite g={good} /> {T.srcTitle(goodName(good))}</span>
        <span className="lbl">{T.recentAvg}</span>
      </div>
      <div className="src-cols">
        <Side title={T.demand} by={demand} side="demand" />
        <Side title={T.supply} by={supply} side="supply" extra={
          m.inventory > 0.5 ? <p className="lbl src-note">{T.warehouse} <span className="pxnum"><NumericValue value={m.inventory} format="compact"/></span></p> : null
        } />
      </div>
    </div>
  );
}
