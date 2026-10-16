// 시세표에서 고른 상품의 수요·공급이 어디서 오는지 (MarketGood.demandByEma / supplyByEma)
import { BUILDING_BY_ID, CLASS_DEFS, GOODS } from '@econ/sim';
import type { GoodId, MarketGood, PopClass } from '@econ/sim';
import type { ReactNode } from 'react';
import { BuildingSprite, ClassSprite, GoodSprite, Sprite } from '../sprites';
import { compact, pct } from '../format';

const SWATCH = ['var(--accent)', 'var(--gold)', 'var(--good)', 'var(--sea-line)', 'var(--c-expert)', 'var(--c-capitalist)'];
const OTHER = 'var(--ink2)';
const MAX_ROWS = 6;

function describe(key: string, side: 'demand' | 'supply'): { label: string; icon: ReactNode } {
  if (key.startsWith('pop:')) {
    const c = key.slice(4) as PopClass;
    return { label: `${CLASS_DEFS[c]?.name ?? c} 소비`, icon: <ClassSprite c={c} /> };
  }
  if (key.startsWith('bld:')) {
    const t = key.slice(4);
    return { label: `${BUILDING_BY_ID[t]?.name ?? t} ${side === 'demand' ? '원료' : '생산'}`, icon: <BuildingSprite typeId={t} size={16} /> };
  }
  switch (key) {
    case 'trader': return side === 'demand'
      ? { label: '상인 운송 (이웃으로)', icon: <GoodSprite g="transport" /> }
      : { label: '상인 화물 (이웃에서)', icon: <GoodSprite g="transport" /> };
    case 'export': return { label: '해외 수출', icon: <Sprite name="m-ship" /> };
    case 'import': return side === 'demand'
      ? { label: '수입 하역', icon: <Sprite name="m-ship" /> }
      : { label: '해외 수입', icon: <Sprite name="m-ship" /> };
    case 'subsistence': return { label: '소작농 판매', icon: <Sprite name="m-wheat" /> };
    default: return { label: '기타', icon: <Sprite name="coin" /> };
  }
}

function Side({ title, by, side, extra }: { title: string; by: Record<string, number>; side: 'demand' | 'supply'; extra?: ReactNode }) {
  const parts = Object.entries(by).filter(([, v]) => v > 1e-3).sort((a, b) => b[1] - a[1]);
  const total = parts.reduce((a, [, v]) => a + v, 0);
  const shown = parts.slice(0, parts.length > MAX_ROWS ? MAX_ROWS - 1 : MAX_ROWS);
  const rest = parts.slice(shown.length);
  const rows = shown.map(([k, v], i) => ({ key: k, v, color: SWATCH[i % SWATCH.length], ...describe(k, side) }));
  if (rest.length) rows.push({ key: '_rest', v: rest.reduce((a, [, v]) => a + v, 0), color: OTHER, label: `그 밖 ${rest.length}곳`, icon: <Sprite name="coin" /> });
  return (
    <div className="src-side">
      <div className="src-head">
        <span className="strong">{title}</span>
        <span className="lbl">하루 <span className="pxnum">{compact(total)}</span></span>
      </div>
      {total <= 0 ? <p className="empty">없음</p> : (
        <>
          <div className="src-bar" role="img" aria-label={`${title} 출처 비율`}>
            {rows.map((r) => <i key={r.key} style={{ flexGrow: r.v, background: r.color }} />)}
          </div>
          <ul className="src-list">
            {rows.map((r) => (
              <li key={r.key}>
                <i className="src-sw" style={{ background: r.color }} aria-hidden="true" />
                {r.icon}
                <span className="src-name" title={r.label}>{r.label}</span>
                <span className="pxnum num">{compact(r.v)}</span>
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
  const demand = m.demandByEma ?? m.demandBy ?? {};
  const supply = m.supplyByEma ?? m.supplyBy ?? {};
  return (
    <div className="src-break">
      <div className="card-head">
        <span className="good-name strong"><GoodSprite g={good} /> {GOODS[good].name} 수요·공급 출처</span>
        <span className="lbl">최근 평균</span>
      </div>
      <div className="src-cols">
        <Side title="수요" by={demand} side="demand" />
        <Side title="공급" by={supply} side="supply" extra={
          m.inventory > 0.5 ? <p className="lbl src-note">창고 재고 <span className="pxnum">{compact(m.inventory)}</span>: 위 공급이 모자랄 때 풀립니다</p> : null
        } />
      </div>
    </div>
  );
}
